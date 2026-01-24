#!/bin/bash

echo "========================================================"
echo "  Sovereign Context Engine (ECE) - Electron Launcher"
echo "========================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install v18+."
    exit 1
fi

# 2. Check PNPM
if ! command -v pnpm &> /dev/null; then
    echo "[WARN] PNPM not found. Installing via npm..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install PNPM."
        exit 1
    fi
fi

# 3. Dependency Hygiene
if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup (Root): Installing dependencies..."
    pnpm install
else
    echo "[INFO] Root dependencies found."
fi

if [ ! -d "desktop-overlay/node_modules" ]; then
    echo "[INFO] First time setup (Overlay): Installing dependencies..."
    cd desktop-overlay
    npm install
    cd ..
fi

# 4. Build
echo ""
echo "[INFO] Building Frontend & Engine..."
pnpm build
if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed."
    exit 1
fi

echo "[INFO] Building Desktop Overlay..."
cd desktop-overlay
npm run build
cd ..

# 5. Launch Electron
echo ""
echo "[INFO] Launching ECE Desktop Environment..."
echo "[INFO] The Dashboard will open automatically when the Engine is ready."
echo ""

cd desktop-overlay
npm start
