#!/usr/bin/env python3
"""
Clean-up Script for ECE Implementation

This script removes any temporary or backup files created during the implementation process.
"""

import os
import sys
from pathlib import Path
import shutil

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def clean_backup_files():
    """Remove backup files created during implementation."""
    print("🗑️ Cleaning up backup files...")
    
    # Find and remove all backup files
    backup_files = list(project_root.glob("**/*.backup"))
    for backup_file in backup_files:
        try:
            backup_file.unlink()
            print(f"✅ Removed backup file: {backup_file}")
        except Exception as e:
            print(f"❌ Failed to remove backup file {backup_file}: {e}")
            
    print(f"✅ Cleaned up {len(backup_files)} backup files")

def clean_temporary_files():
    """Remove temporary files created during implementation."""
    print("🗑️ Cleaning up temporary files...")
    
    # Define temporary file patterns to remove
    temp_patterns = [
        "*.tmp",
        "*.temp",
        "*~",
        ".DS_Store",
        "Thumbs.db"
    ]
    
    removed_count = 0
    for pattern in temp_patterns:
        temp_files = list(project_root.glob(f"**/{pattern}"))
        for temp_file in temp_files:
            try:
                if temp_file.is_file():
                    temp_file.unlink()
                    print(f"✅ Removed temporary file: {temp_file}")
                    removed_count += 1
                elif temp_file.is_dir():
                    shutil.rmtree(temp_file)
                    print(f"✅ Removed temporary directory: {temp_file}")
                    removed_count += 1
            except Exception as e:
                print(f"❌ Failed to remove temporary file {temp_file}: {e}")
                
    print(f"✅ Cleaned up {removed_count} temporary files")

def clean_log_files():
    """Clean up old log files."""
    print("🗑️ Cleaning up old log files...")
    
    # Define log files to clean
    log_files = [
        "archivist.log",
        "injector.log",
        "build_log.txt"
    ]
    
    removed_count = 0
    for log_file in log_files:
        log_path = project_root / log_file
        if log_path.exists():
            try:
                # Only remove if file is older than 1 day
                import time
                if time.time() - log_path.stat().st_mtime > 86400:
                    log_path.unlink()
                    print(f"✅ Removed old log file: {log_file}")
                    removed_count += 1
            except Exception as e:
                print(f"❌ Failed to remove log file {log_file}: {e}")
                
    print(f"✅ Cleaned up {removed_count} old log files")

def clean_pycache_directories():
    """Remove __pycache__ directories."""
    print("🗑️ Cleaning up __pycache__ directories...")
    
    pycache_dirs = list(project_root.glob("**/__pycache__"))
    removed_count = 0
    for pycache_dir in pycache_dirs:
        try:
            shutil.rmtree(pycache_dir)
            print(f"✅ Removed __pycache__ directory: {pycache_dir}")
            removed_count += 1
        except Exception as e:
            print(f"❌ Failed to remove __pycache__ directory {pycache_dir}: {e}")
            
    print(f"✅ Cleaned up {removed_count} __pycache__ directories")

def clean_test_cache_directories():
    """Remove test cache directories."""
    print("🗑️ Cleaning up test cache directories...")
    
    test_cache_dirs = [
        ".pytest_cache",
        ".mypy_cache",
        ".coverage"
    ]
    
    removed_count = 0
    for cache_dir_name in test_cache_dirs:
        cache_dir = project_root / cache_dir_name
        if cache_dir.exists():
            try:
                shutil.rmtree(cache_dir)
                print(f"✅ Removed test cache directory: {cache_dir_name}")
                removed_count += 1
            except Exception as e:
                print(f"❌ Failed to remove test cache directory {cache_dir_name}: {e}")
                
    print(f"✅ Cleaned up {removed_count} test cache directories")

def main():
    """Main function to run all clean-up tasks."""
    print("🧹 Running ECE Implementation Clean-up...")
    print("=" * 50)
    
    # Run all clean-up tasks
    clean_backup_files()
    clean_temporary_files()
    clean_log_files()
    clean_pycache_directories()
    clean_test_cache_directories()
    
    print("n🎉 ECE Implementation Clean-up Complete!")
    print("=" * 50)
    print("n✅ All temporary and backup files have been removed.")
    print("✅ Project directory is now clean and ready for production.")

if __name__ == "__main__":
    main()