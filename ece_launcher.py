#!/usr/bin/env python3
"""
Entry point for the External Context Engine executable.
This script serves as the main entry point to maintain backward compatibility
while organizing the code in a package structure that works better with PyInstaller.
"""

import sys
import os

# Add the project root to the Python path to ensure imports work correctly
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Import and run the main launcher from the ece_main package
from ece_main.ece_launcher import main

if __name__ == "__main__":
    sys.exit(main())