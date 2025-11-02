import json
import os
import chardet


def create_full_corpus_recursive():
    """
    Aggregates all readable text content from a directory and its subdirectories
    into a single text corpus, correctly preserving special characters and emojis
    by auto-detecting file encodings and using robust pathing.
    """
    try:
        # Determine the absolute path of the script itself to make pathing reliable.
        script_path = os.path.abspath(__file__)
        # Assume the project root is two levels up from a script located in '.../Notebook/scripts/'.
        # Adjust if your script is in a different location.
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(script_path)))
    except NameError:
        project_root = os.getcwd()
        print(
            "Warning: Could not determine script path automatically. Assuming current directory is the project root."
        )

    root_dir_to_scan = os.path.join(
        project_root, "./Projects/External-Context-Engine-ECE"
    )
    output_file = os.path.join(project_root, "combined_text.txt")

    print(f"Project Root Detected: {project_root}")
    print(f"Scanning Target Directory: {root_dir_to_scan}")

    text_extensions = (
        ".json",
        ".md",
        ".poml",
        ".yaml",
        ".txt",
        ".py",
        ".js",
        ".html",
        ".css",
        ".sh",
        ".ps1",
    )
    exclude_dirs = {
        ".venv",
        ".git",
        ".vscode",
        "__pycache__",
        "node_modules",
        ".obsidian",
        "llama.cpp",
    }

    files_to_process = []
    for dirpath, dirnames, filenames in os.walk(root_dir_to_scan, topdown=True):
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]

        for f in filenames:
            if f.endswith(text_extensions):
                files_to_process.append(os.path.join(dirpath, f))

    files_to_process.sort()

    if not files_to_process:
        print(f"No processable files found in '{root_dir_to_scan}'.")
        return

    print(f"Found {len(files_to_process)} files to process.")

    with open(output_file, "w", encoding="utf-8") as outfile:
        for file_path in files_to_process:
            if os.path.abspath(file_path) == os.path.abspath(output_file):
                continue

            print(f"Processing '{file_path}'...")
            try:
                with open(file_path, "rb") as raw_file:
                    raw_data = raw_file.read()
                    if not raw_data:
                        continue
                    # Use chardet to guess the encoding, but default to utf-8
                    encoding = chardet.detect(raw_data)["encoding"] or "utf-8"

                # Decode using the detected encoding, replacing any errors
                decoded_content = raw_data.decode(encoding, errors="replace")

                outfile.write(f"--- START OF FILE: {file_path} ---\n\n")
                outfile.write(decoded_content + "\n\n")
                outfile.write(f"--- END OF FILE: {file_path} ---\n\n")

            except Exception as e:
                print(f"An unexpected error occurred with file '{file_path}': {e}")

    print(f"\nCorpus aggregation complete. All content saved to '{output_file}'.")


if __name__ == "__main__":
    create_full_corpus_recursive()
