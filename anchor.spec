# -*- mode: python ; coding: utf-8 -*-

"""
PyInstaller spec file for Anchor CLI
Creates a standalone executable for Anchor without environment dependencies
"""

from PyInstaller.utils.hooks import collect_data_files, collect_submodules
import os

# Get the main.py path - __file__ is not available in all contexts, so use absolute path
import sys
from pathlib import Path

# Get the directory containing this spec file
spec_dir = Path(__file__).parent if '__file__' in locals() else Path.cwd()
main_path = spec_dir / 'main.py'

block_cipher = None

a = Analysis(
    [main_path],
    pathex=[os.path.dirname(main_path)],
    binaries=[],
    datas=[
        # Include any data files if needed
        # (source_path, destination_path)
    ],
    hiddenimports=[
        # Add any hidden imports that PyInstaller might miss
        'prompt_toolkit',
        'prompt_toolkit.output',
        'prompt_toolkit.output.dummy',
        'prompt_toolkit.eventloop',
        'prompt_toolkit.styles',
        'dotenv',
        'httpx',
        'httpx._config',
        'asyncio',
        'logging',
        're',
        'shlex',
        'subprocess',
        'json',
        'os',
        'sys',
        'pathlib',
        'typing',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='anchor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Use console=True for CLI application
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon path if desired
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='anchor',
)