# Standard 029: Consolidated Data Aggregation with YAML Support

## What Happened?
The system had multiple scripts performing similar functions for data aggregation and migration:
- `migrate_history.py` - Legacy session migration to YAML
- `read_all.py` in context directory - Data aggregation to JSON
- Multiple overlapping data processing scripts

This created redundancy and confusion about which script to use for data aggregation. The functionality has been consolidated into a single authoritative script: `context/Coding-Notes/Notebook/read_all.py` which now supports all three output formats (text, JSON, YAML).

## The Cost
- Multiple scripts with overlapping functionality
- Confusion about which script to use for data aggregation
- Maintenance burden of multiple similar scripts
- Inconsistent output formats across scripts
- Redundant code that needed to be updated in multiple places

## The Rule
1. **Single Authority**: Use `context/Coding-Notes/Notebook/read_all.py` as the single authoritative script for data aggregation from the context directory.

2. **Multi-Format Output**: The script must generate three output formats:
   - `combined_text.txt` - Human-readable text corpus
   - `combined_memory.json` - Structured JSON for database ingestion
   - `combined_memory.yaml` - Structured YAML for easier processing and migration

3. **YAML Formatting**: YAML output must use proper multiline string formatting (literal style with `|`) for content with line breaks to ensure readability.

4. **Encoding Handling**: The script must handle various file encodings using chardet for reliable processing.

5. **Recursive Processing**: The script must process all subdirectories while respecting exclusion rules.

6. **Metadata Preservation**: File metadata (path, timestamp) must be preserved in structured outputs.

## Implementation
- Consolidated migrate_history.py functionality into read_all.py
- Moved migrate_history.py to archive/tools/
- Updated read_all.py to generate YAML output with proper multiline formatting
- Used yaml.dump() with custom representer for multiline strings
- Maintained all existing functionality while adding YAML support
- Preserved the same exclusion rules and file type filtering