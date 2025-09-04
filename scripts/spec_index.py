
import os
import hashlib
import yaml
import re
from datetime import datetime, timezone

def get_file_sha256(path):
    """Computes the SHA256 hash of a file."""
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while True:
            data = f.read(65536)
            if not data:
                break
            h.update(data)
    return h.hexdigest()

def get_line_count(path):
    """Counts the number of lines in a file."""
    with open(path, 'r', encoding='utf-8') as f:
        return sum(1 for _ in f)

def get_md_title(path):
    """Extracts the title from the first line of a Markdown file."""
    with open(path, 'r', encoding='utf-8') as f:
        first_line = f.readline().strip()
        if first_line.startswith('#'):
            return first_line.lstrip('# ').strip()
    return os.path.basename(path)

def index_spec_documents(spec_dir):
    """Indexes all Markdown files in the spec directory."""
    manifest = {
        'version': 1,
        'generated_by': 'spec_index.py',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'documents': []
    }
    for root, _, files in os.walk(spec_dir):
        for file in sorted(files):
            if file.endswith('.md'):
                path = os.path.join(root, file)
                rel_path = os.path.relpath(path, spec_dir)
                
                # Read existing manifest to preserve 'approved' status
                approved_status = False
                try:
                    with open(os.path.join(spec_dir, 'spec-manifest.yml'), 'r') as f:
                        existing_manifest = yaml.safe_load(f)
                        for doc in existing_manifest.get('documents', []):
                            if doc.get('path') == rel_path:
                                approved_status = doc.get('approved', False)
                                break
                except FileNotFoundError:
                    pass # No existing manifest

                manifest['documents'].append({
                    'path': rel_path,
                    'title': get_md_title(path),
                    'sha256': get_file_sha256(path),
                    'lines': get_line_count(path),
                    'approved': approved_status,
                })

    with open(os.path.join(spec_dir, 'spec-manifest.yml'), 'w') as f:
        yaml.dump(manifest, f, default_flow_style=False, sort_keys=False)
    print("Generated spec-manifest.yml")

def generate_task_map(spec_dir):
    """Parses tasks.md and generates task_map.yml."""
    tasks_md_path = os.path.join(spec_dir, 'memory-management-system', 'tasks.md')
    task_map_path = os.path.join(spec_dir, 'memory-management-system', 'task_map.yml')
    
    if not os.path.exists(tasks_md_path):
        print(f"Warning: {tasks_md_path} not found. Skipping task map generation.")
        return

    task_map = {
        'generated_by': 'spec_index.py',
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'tasks': [],
        'notes': 'code_globs and test_globs can be refined manually if needed.'
    }
    
    task_pattern = re.compile(r'-\s*\[\s*\]\s*\*\*?(TASK-\d+)\*\*?')

    with open(tasks_md_path, 'r', encoding='utf-8') as f:
        for line in f:
            match = task_pattern.search(line)
            if match:
                task_id = match.group(1)
                task_map['tasks'].append({
                    'task_id': task_id,
                    'spec_ref': os.path.relpath(tasks_md_path, os.path.dirname(task_map_path)),
                    'code_globs': [],
                    'test_globs': [],
                })

    with open(task_map_path, 'w') as f:
        yaml.dump(task_map, f, default_flow_style=False, sort_keys=False)
    print("Generated task_map.yml")


if __name__ == '__main__':
    SPEC_DIR = 'specs'
    index_spec_documents(SPEC_DIR)
    generate_task_map(SPEC_DIR)
