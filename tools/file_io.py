# /tools/file_io.py

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
                    relative_path = os.path.relpath(full_path, base_path)
                    file_list.append(relative_path)
        return {'status': 'success', 'result': file_list}
    except Exception as e:
        return {'status': 'error', 'description': str(e)}

def read_multiple_files(filepaths: list) -> dict:
    """
    Reads the content of multiple files at the given paths.

    Args:
        filepaths: A list of paths to the files.

    Returns:
        A dictionary with 'status' and 'result' keys. 
        If successful, 'result' is a flat string containing all results.
        If error(s) occur, 'result' contains detailed error message.
    """
    try:
        if not filepaths or Ellipsis in filepaths:
            return {'status': 'error', 'description': 'Invalid or empty filepaths'}
            
        results = []
        for filepath in filepaths:
            if isinstance(filepath, str):
                read_result = read_file(filepath)
                if read_result['status'] == 'success':
                    results.append(f"File {filepath}:\n{read_result['result']}\n")
                else:
                    return {'status': 'error', 'description': f"Failed to read file {filepath}: {read_result.get('result', 'Unknown error')}"}
        final_result = "\n".join(results)
        return {'status': 'success', 'result': final_result}

    except ValueError as ve:
        return {'status': 'error', 'description': str(ve)}
    except Exception as e:
        return {'status': 'error', 'description': f"Unexpected error while reading files: {str(e)}"}

def read_last_n_chars(filepath: str, n: int) -> str:
    """
    Reads and returns the last n characters of a file.
    Handles files smaller than n characters gracefully.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            f.seek(0, os.SEEK_END)
            file_size = f.tell()
            f.seek(max(0, file_size - n))
            return f.read()
    except FileNotFoundError:
        return "" # Return empty string if file doesn't exist, as per robust design

def write_and_truncate(filepath: str, content: str, max_size: int):
    """
    Appends content to a file and then truncates the oldest content 
    to stay within the max_size limit.
    """
    try:
        # First, ensure the directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Read existing content
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing_content = f.read()
        else:
            existing_content = ""
        
        # Combine and truncate
        combined_content = existing_content + content
        if len(combined_content) > max_size:
            truncated_content = combined_content[-max_size:]
        else:
            truncated_content = combined_content
            
        # Write back the result
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(truncated_content)
            
    except Exception as e:
        # In a real application, you'd want more specific error handling
        # and possibly logging. For this example, we'll just print.
        print(f"Error in write_and_truncate: {e}")


