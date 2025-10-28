import json
import os
import chardet
from pathlib import Path

# Extraction paths configuration for JSON content extraction
EXTRACTION_PATHS = [
    'response_content',
    'content',
    'text',
    'data.content'
]

def extract_content(data, paths):
    """Extract content from nested structures based on provided paths"""
    for path in paths:
        current = data
        for part in path.split('.'):
            if isinstance(current, dict) and part in current:
                current = current[part]
            elif isinstance(current, list) and part.isdigit():
                idx = int(part)
                if idx < len(current):
                    current = current[idx]
                else:
                    break
            else:
                break
        else:
            if current is not None:
                return current
    return None

def create_full_corpus_recursive():
    """
    Aggregates all readable text content from a directory and its subdirectories
    into a single text corpus, correctly preserving special characters and emojis
    by auto-detecting file encodings.
    """
    # Use the project root detection module for consistent path handling
    from ece.common.project_root import get_project_root
    root_dir = str(get_project_root())
    output_file = str(Path(root_dir) / 'combined_text.txt')
    
    # Define file extensions to process
    text_extensions = ('.json', '.md', '.poml', '.yaml', '.txt', '.py', '.js', '.html', '.css', '.sh', '.ps1')
    
    # Define directories to ignore
    ignore_dirs = ['llama.cpp', '.git', '.venv', '__pycache__', 'node_modules', 'vendor', 'build', 'dist']

    files_to_process = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip ignored directories
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs and not d.startswith('.')]
        
        for f in filenames:
            if f.endswith(text_extensions):
                files_to_process.append(os.path.join(dirpath, f))

    files_to_process.sort()
    
    if not files_to_process:
        print(f"No processable files found in '{root_dir}' or its subdirectories.")
        return
        
    print(f"Found {len(files_to_process)} text-based files to process.")
    
    # Use 'w' to create a new file, ensuring it's encoded in UTF-8
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for file_path in files_to_process:
            print(f"Processing '{file_path}'...")
            try:
                with open(file_path, 'rb') as raw_file:
                    raw_data = raw_file.read()
                
                decoded_content = None
                try:
                    # Try decoding with UTF-8 first
                    decoded_content = raw_data.decode('utf-8')
                except UnicodeDecodeError:
                    # If UTF-8 fails, use chardet to detect encoding
                    detection = chardet.detect(raw_data)
                    encoding = detection['encoding'] if detection['confidence'] > 0.5 else 'latin-1'
                    decoded_content = raw_data.decode(encoding, errors='replace')

                outfile.write(f"--- START OF FILE: {file_path} ---\n\n")
                
                # If it's a JSON file, attempt to extract content using configured paths
                if file_path.endswith('.json'):
                    try:
                        data = json.loads(decoded_content)
                        
                        # Try to extract content using the configured paths
                        extracted_content = extract_content(data, EXTRACTION_PATHS)
                        
                        if extracted_content is not None:
                            if isinstance(extracted_content, (list, dict)):
                                # If it's structured data, convert back to JSON string
                                content_to_write = json.dumps(extracted_content, ensure_ascii=False, indent=2)
                            else:
                                content_to_write = str(extracted_content)
                            outfile.write(content_to_write + '\n\n')
                        else:
                            # If no extractable content found, write the whole file
                            outfile.write(decoded_content + '\n\n')
                    except json.JSONDecodeError:
                        # If JSON is invalid, write the raw decoded content
                        outfile.write(decoded_content + '\n\n')
                else:
                    # For all other text files, write the entire content
                    outfile.write(decoded_content + '\n\n')

                outfile.write(f"--- END OF FILE: {file_path} ---\n\n")

            except Exception as e:
                print(f"An unexpected error occurred with file '{file_path}': {e}")
                
    print(f"\nCorpus aggregation complete. All content has been saved to '{output_file}'.")

if __name__ == '__main__':
    create_full_corpus_recursive()
