import yaml
import os
import sys

# Enable UTF-8 for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# YAML Snapshot Path
YAML_PATH = r"c:\Users\rsbiiw\Projects\notebook\inbox\ECE_Core_1_19_2026.yaml"
TARGET_ROOT = r"c:\Users\rsbiiw\Projects\ECE_Core"

def restore_from_yaml():
    print(f"Reading snapshot: {YAML_PATH}")
    
    try:
        with open(YAML_PATH, 'r', encoding='utf-8') as f:
            # Load all documents from the stream
            documents = list(yaml.safe_load_all(f))
            
        print(f"Found {len(documents)} documents in YAML stream.")
        
        file_count = 0
        
        for doc in documents:
            print(f"Document type: {type(doc)}")
            if isinstance(doc, list):
                print(f"Document is a list with length: {len(doc)}")
                if len(doc) > 0:
                   print(f"First item type: {type(doc[0])}")
                   print(f"First item keys: {doc[0].keys() if isinstance(doc[0], dict) else 'Not a dict'}")
                
                for item in doc:
                    if isinstance(item, dict) and 'path' in item and 'content' in item:
                        process_item(item)
                        file_count += 1
                    else:
                        print(f"Skipping item: {type(item)} keys: {item.keys() if isinstance(item, dict) else 'N/A'}")
            elif isinstance(doc, dict):
                 print(f"Document is a dict with keys: {doc.keys()}")
                 if 'path' in doc and 'content' in doc:
                     process_item(doc)
                     file_count += 1
                 # Check if it has a 'files' key or similar
                 elif 'files' in doc and isinstance(doc['files'], list):
                     for item in doc['files']:
                         process_item(item)
                         file_count += 1
        
        print(f"Restoration complete. Restored {file_count} files.")

    except Exception as e:
        print(f"Error reading YAML: {e}")

def process_item(item):
    rel_path = item['path']
    content = item['content']
    
    # Construct full path
    full_path = os.path.join(TARGET_ROOT, rel_path)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    # Write content
    try:
        with open(full_path, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        print(f"Restored: {rel_path}")
    except Exception as e:
        print(f"Failed to write {rel_path}: {e}")

if __name__ == "__main__":
    restore_from_yaml()
