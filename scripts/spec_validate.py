
import os
import hashlib
import yaml
import re
import argparse
import glob

# Assuming spec_index.py functions are available or re-implemented here
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

def validate_spec_manifest(spec_dir):
    """Validates the spec manifest against the actual files."""
    manifest_path = os.path.join(spec_dir, 'spec-manifest.yml')
    if not os.path.exists(manifest_path):
        print(f"Error: {manifest_path} not found.")
        return False, []

    with open(manifest_path, 'r') as f:
        manifest = yaml.safe_load(f)

    discrepancies = []
    for doc in manifest.get('documents', []):
        doc_path = os.path.join(spec_dir, doc['path'])
        if not os.path.exists(doc_path):
            discrepancies.append(f"Missing file: {doc['path']}")
            continue

        current_sha256 = get_file_sha256(doc_path)
        if current_sha256 != doc['sha256']:
            discrepancies.append(f"Checksum mismatch for {doc['path']}: Expected {doc['sha256']}, Got {current_sha256}")

    return len(discrepancies) == 0, discrepancies

def check_task_traceability(spec_dir, project_root='.'):
    """Checks if task IDs are traceable in code and test files."""
    task_map_path = os.path.join(spec_dir, 'memory-management-system', 'task_map.yml')
    if not os.path.exists(task_map_path):
        print(f"Error: {task_map_path} not found. Run spec-index first.")
        return False, []

    with open(task_map_path, 'r') as f:
        task_map = yaml.safe_load(f)

    traceability_issues = []
    for task in task_map.get('tasks', []):
        task_id = task['task_id']
        found_in_code = False
        found_in_test = False

        # Check code globs
        for glob_pattern in task.get('code_globs', []):
            for file_path in glob.glob(os.path.join(project_root, glob_pattern), recursive=True):
                if os.path.isfile(file_path):
                    with open(file_path, 'r', errors='ignore') as f_code:
                        if task_id in f_code.read():
                            found_in_code = True
                            break
            if found_in_code: break

        # Check test globs
        for glob_pattern in task.get('test_globs', []):
            for file_path in glob.glob(os.path.join(project_root, glob_pattern), recursive=True):
                if os.path.isfile(file_path):
                    with open(file_path, 'r', errors='ignore') as f_test:
                        if task_id in f_test.read():
                            found_in_test = True
                            break
            if found_in_test: break

        if not found_in_code:
            traceability_issues.append(f"Task {task_id} not found in any specified code file.")
        if not found_in_test:
            traceability_issues.append(f"Task {task_id} not found in any specified test file.")

    return len(traceability_issues) == 0, traceability_issues

def main():
    parser = argparse.ArgumentParser(description="Spec Validation Tool.")
    parser.add_argument('--report', action='store_true', help="Generate a full validation report.")
    parser.add_argument('--gap', action='store_true', help="Identify gaps in task traceability.")
    args = parser.parse_args()

    SPEC_DIR = 'specs'
    PROJECT_ROOT = '.' # Current working directory

    manifest_ok, manifest_discrepancies = validate_spec_manifest(SPEC_DIR)
    traceability_ok, traceability_issues = check_task_traceability(SPEC_DIR, PROJECT_ROOT)

    if args.report:
        print("\n--- Spec Validation Report ---")
        if manifest_ok:
            print("Manifest Validation: OK")
        else:
            print("Manifest Validation: FAILED")
            for issue in manifest_discrepancies:
                print(f"  - {issue}")

        if traceability_ok:
            print("Task Traceability: OK")
        else:
            print("Task Traceability: FAILED")
            for issue in traceability_issues:
                print(f"  - {issue}")
        print("----------------------------")

    if args.gap:
        print("\n--- Task Traceability Gaps ---")
        if not traceability_ok:
            for issue in traceability_issues:
                print(f"  - {issue}")
        else:
            print("No traceability gaps found.")
        print("----------------------------")

    if not manifest_ok or not traceability_ok:
        exit(1)

if __name__ == '__main__':
    main()
