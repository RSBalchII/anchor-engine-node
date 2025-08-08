"""
This module provides file I/O operations with a standardized dictionary response.
"""
import os

def read_file(filepath: str) -> dict:
    """
    Reads the entire content of a file at the given path.

    Args:
        filepath: The path to the file.

    Returns:
        A dictionary with 'status' and 'result' keys.
    """
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        return {'status': 'success', 'result': content}
    except FileNotFoundError:
        return {'status': 'error', 'result': f"File not found: {filepath}"}
    except UnicodeDecodeError as e:
        return {'status': 'error', 'result': f"Decoding error: {e}. This might be a binary file."}
    except Exception as e:
        return {'status': 'error', 'result': str(e)}

def write_to_file(filepath: str, content: str) -> dict:
    """
    Writes the given content to the specified file, overwriting it if it exists.

    Args:
        filepath: The path to the file.
        content: The content to write to the file.

    Returns:
        A dictionary with 'status' and 'result' keys.
    """
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w') as f:
            f.write(content)
        return {'status': 'success', 'result': f"Successfully wrote to {filepath}"}
    except Exception as e:
        return {'status': 'error', 'result': str(e)}

def append_to_file(filepath: str, content: str) -> dict:
    """
    Appends the given content to the specified file.

    Args:
        filepath: The path to the file.
        content: The content to append to the file.

    Returns:
        A dictionary with 'status' and 'result' keys.
    """
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'a') as f:
            f.write(content)
        return {'status': 'success', 'result': f"Successfully appended to {filepath}"}
    except Exception as e:
        return {'status': 'error', 'result': str(e)}

def list_project_files(base_path: str = os.getcwd()) -> dict:
    """
    Lists all files in the project directory, excluding common hidden directories and files.

    Args:
        base_path: The base directory to start listing files from. Defaults to current working directory.

    Returns:
        A dictionary with 'status' and 'result' keys. 'result' is a list of file paths.
    """
    file_list = []
    exclude_dirs = ['.git', '__pycache__', 'chroma_data', 'venv', 'node_modules', '.vscode', '.idea']
    exclude_files = ['.DS_Store', 'Thumbs.db']

    try:
        for root, dirs, files in os.walk(base_path):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                if file not in exclude_files:
                    full_path = os.path.join(root, file)
                    # Make paths relative to the base_path for cleaner output
                    relative_path = os.path.relpath(full_path, base_path)
                    file_list.append(relative_path)
        return {'status': 'success', 'result': file_list}
    except Exception as e:
        return {'status': 'error', 'result': str(e)}

def read_multiple_files(filepaths: list) -> dict:
    """
    Reads the content of multiple files at the given paths.

    Args:
        filepaths: A list of paths to the files.

    Returns:
<<<<<<< HEAD
        A dictionary with 'status' and 'result' keys. 'result' is a dictionary mapping file paths to their content.
    """
    results = {}
    for filepath in filepaths:
        read_result = read_file(filepath)
        results[filepath] = read_result
    
    # Check if all files were read successfully
    if all(res.get('status') == 'success' for res in results.values()):
        return {'status': 'success', 'result': results}
    else:
        # If any file failed to read, return an error status with all results
        return {'status': 'error', 'result': results, 'message': 'One or more files could not be read.'}
=======
        A dictionary with status and a dictionary of file contents.
    """
    logging.info(f"Reading {len(filepaths)} files.")
    content_map = {}
    try:
        for filepath in filepaths:
            with open(filepath, 'r', encoding='utf-8') as f:
                content_map[filepath] = f.read()
        return {"status": "success", "result": content_map}
    except FileNotFoundError as e:
        logging.error(f"File not found during multi-read: {e.filename}")
        return {"status": "error", "result": f"File not found: {e.filename}"}
    except Exception as e:
        logging.error(f"An error occurred while reading files: {e}")
        return {"status": "error", "result": str(e)}
>>>>>>> cb87af8d6bedd60419d7f147df2f2480bd118359
