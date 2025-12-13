import os
import re
import asyncio
import argparse
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import sys

# Add backend to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Remove the scripts directory from sys.path to avoid shadowing the neo4j library
scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir in sys.path:
    sys.path.remove(scripts_dir)

from src.memory.neo4j_store import Neo4jStore
from src.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ChronosIngestor:
    def __init__(self, source_path: str, dry_run: bool = False):
        self.source_path = source_path
        self.dry_run = dry_run
        self.neo4j = Neo4jStore()
        
        # Regex patterns for date extraction
        self.date_patterns = [
            # YYYY-MM-DD (e.g., 2025-05-01)
            (re.compile(r'(\d{4})-(\d{1,2})-(\d{1,2})'), '%Y-%m-%d'),
            # MM-DD (e.g., 6-30) - assumes current year or infers based on month
            (re.compile(r'(?:^|[^0-9])(\d{1,2})-(\d{1,2})(?:$|[^0-9])'), '%m-%d'),
            # Month Name DD (e.g., June-30)
            (re.compile(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-_\s](\d{1,2})', re.IGNORECASE), '%b-%d'),
        ]
        
        # Content timestamp patterns (e.g. "Current Date: ...")
        self.content_date_patterns = [
            (re.compile(r'Current Date:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})', re.IGNORECASE), '%B %d, %Y'),
            (re.compile(r'Date:\s*(\d{4}-\d{2}-\d{2})', re.IGNORECASE), '%Y-%m-%d'),
        ]

    async def initialize(self):
        if not self.dry_run:
            await self.neo4j.initialize()

    async def close(self):
        if not self.dry_run:
            await self.neo4j.close()

    def extract_date_from_filename(self, filename: str) -> Optional[datetime]:
        """Extracts date from filename."""
        current_year = datetime.now().year
        for pattern, fmt in self.date_patterns:
            match = pattern.search(filename)
            if match:
                try:
                    if fmt == '%Y-%m-%d':
                        return datetime.strptime(match.group(0), fmt).replace(tzinfo=timezone.utc)
                    elif fmt == '%m-%d':
                        month, day = map(int, match.groups())
                        return datetime(current_year, month, day, tzinfo=timezone.utc)
                    elif fmt == '%b-%d':
                        month_str, day_str = match.groups()
                        dt_temp = datetime.strptime(f"{month_str}-{day_str}", "%b-%d")
                        return dt_temp.replace(year=current_year, tzinfo=timezone.utc)
                except ValueError:
                    continue
        return None

    def extract_date_from_content(self, content: str) -> Optional[datetime]:
        """Extracts date from content text."""
        for pattern, fmt in self.content_date_patterns:
            match = pattern.search(content)
            if match:
                try:
                    return datetime.strptime(match.group(1), fmt).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
        return None

    def interpolate_dates(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Interpolates missing dates based on anchors.
        Anchors:
        - Explicit dates found in filename or content
        - Start: July 1, 2025 (Session 1)
        - End: Dec 9, 2025 (Session 45 / 2 days ago)
        """
        # 1. Set hard anchors if not present
        # Sort entries by filename/index to ensure chronological order
        # Assuming filenames like 'sessions_part_1', 'sessions_part_2' sort correctly
        
        # Helper to get session number
        def get_session_num(filename):
            m = re.search(r'sessions?_part_(\d+)', filename, re.IGNORECASE)
            return int(m.group(1)) if m else 999999

        entries.sort(key=lambda x: get_session_num(x['filename']))

        # Default Anchors
        start_date = datetime(2025, 7, 1, tzinfo=timezone.utc)
        end_date = datetime(2025, 12, 9, tzinfo=timezone.utc)

        # Assign known dates
        for entry in entries:
            d = self.extract_date_from_filename(entry['filename'])
            if not d:
                d = self.extract_date_from_content(entry['content'])
            
            if d:
                entry['date'] = d
                entry['is_estimated'] = False
            else:
                entry['date'] = None
                entry['is_estimated'] = True

        # Force anchors for specific sessions if they exist and have no date
        for entry in entries:
            s_num = get_session_num(entry['filename'])
            if s_num == 1 and not entry['date']:
                entry['date'] = start_date
                entry['is_estimated'] = True # It's an estimate based on user input
            # If we find the last one, anchor it? 
            # Actually, let's just use the list indices for interpolation
        
        # Linear Interpolation
        # Ensure start and end have dates to cover the full range
        if entries and entries[0]['date'] is None:
             entries[0]['date'] = start_date
             entries[0]['is_estimated'] = True
        
        if entries and entries[-1]['date'] is None:
             entries[-1]['date'] = end_date
             entries[-1]['is_estimated'] = True

        # We need a list of (index, date) for all known dates
        known_indices = [i for i, e in enumerate(entries) if e['date'] is not None]
        
        # If no known dates at all (should be covered by above, but safety check)
        if not known_indices and entries:
            entries[0]['date'] = start_date
            entries[-1]['date'] = end_date
            known_indices = [0, len(entries)-1]
        
        # If only one known date (e.g. only start was set above because end was already set? No, if start set, it's in known_indices)
        # The above logic ensures at least index 0 and index -1 are set if the list is not empty.
        # So known_indices should have at least 2 elements unless len(entries) == 1.
        
        if len(entries) == 1 and entries[0]['date'] is None:
             entries[0]['date'] = start_date

        # Now fill gaps
        for k in range(len(known_indices) - 1):
            idx_start = known_indices[k]
            idx_end = known_indices[k+1]
            
            date_start = entries[idx_start]['date']
            date_end = entries[idx_end]['date']
            
            total_steps = idx_end - idx_start
            time_diff = date_end - date_start
            step_delta = time_diff / total_steps if total_steps > 0 else timedelta(0)
            
            for i in range(idx_start + 1, idx_end):
                entries[i]['date'] = date_start + (step_delta * (i - idx_start))

        # Fill tails if any (before first anchor or after last anchor)
        # (Logic above handles strict start/end anchors so tails shouldn't exist unless list is empty)
        
        return entries

    async def process_combined_file(self):
        logger.info(f"Reading combined file: {self.source_path}")
        try:
            with open(self.source_path, 'r', encoding='utf-8', errors='replace') as f:
                full_text = f.read()
        except Exception as e:
            logger.error(f"Failed to read file: {e}")
            return

        # Split by "--- START OF FILE: ... ---"
        # Regex to capture filename and content
        pattern = re.compile(r"--- START OF FILE: (.*?) ---\n(.*?)\n--- END OF FILE: .*? ---", re.DOTALL)
        matches = pattern.findall(full_text)
        
        if not matches:
            logger.warning("No file sections found in combined text. Is the format correct?")
            return

        entries = []
        for filename, content in matches:
            # Clean filename path
            filename = os.path.basename(filename.strip())
            entries.append({
                "filename": filename,
                "content": content.strip(),
                "date": None
            })

        logger.info(f"Found {len(entries)} entries. Interpolating dates...")
        entries = self.interpolate_dates(entries)

        for entry in entries:
            await self.ingest_entry(entry)

    async def ingest_entry(self, entry: Dict[str, Any]):
        filename = entry['filename']
        content = entry['content']
        created_at = entry['date'].isoformat()
        
        logger.info(f"Ingesting {filename} -> Date: {created_at} ({'Est' if entry.get('is_estimated') else 'Exact'})")

        if self.dry_run:
            return

        try:
            await self.neo4j.add_memory(
                session_id="chronos-import",
                content=content,
                category="historical_import",
                tags=["#chronos_import", "#historical", f"#source:{filename}"],
                importance=3,
                metadata={
                    "source": filename,
                    "ingested_at": datetime.now(timezone.utc).isoformat(),
                    "is_date_estimated": entry.get('is_estimated', False)
                },
                created_at=created_at
            )
        except Exception as e:
            logger.error(f"Failed to ingest {filename}: {e}")

    async def run(self):
        await self.initialize()
        
        if os.path.isfile(self.source_path):
            await self.process_combined_file()
        elif os.path.isdir(self.source_path):
            # Legacy directory mode
            logger.info("Directory mode not fully implemented for interpolation. Use combined file.")
        else:
            logger.error(f"Source not found: {self.source_path}")

        await self.close()

async def main():
    parser = argparse.ArgumentParser(description="Project Chronos: Ingest historical files with time travel.")
    parser.add_argument("--source", default="../corpus/chronos_source/combined_text.txt", help="Path to combined text file")
    parser.add_argument("--dry-run", action="store_true", help="Simulate ingestion without writing to DB")
    
    args = parser.parse_args()
    
    source_path = os.path.abspath(args.source)
    ingestor = ChronosIngestor(source_path, dry_run=args.dry_run)
    await ingestor.run()

if __name__ == "__main__":
    asyncio.run(main())
