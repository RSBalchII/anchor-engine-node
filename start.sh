#!/bin/bash

echo "========================================================"
echo "  Sovereign Context Engine (Anchor) - Electron Launcher"
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

# 4. Native Module Build (C++ KeyAssassin) - SKIPPED (now using npm packages)
# if [ ! -f "engine/build/Release/anchor_native.node" ]; then
    echo "[INFO] Native Module - Using npm packages instead of local build..."
#    cd engine
#    npx node-gyp rebuild
#    if [ $? -ne 0 ]; then
#        echo "[WARN] Native module build failed. Falling back to pure JS."
#    else
#        echo "[OK] Native module built successfully."
#    fi
#    cd ..
#fi

# 5. Build
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
echo -e "${BLUE}[INFO] Launching Anchor Desktop Environment...${NC}"
echo -e "${BLUE}[INFO] The Dashboard will open automatically when the Engine is ready.${NC}"

# Standard 078: Kill existing engine on port 3000
echo -e "${YELLOW}[INFO] Harmonizing Process Lifecycle (Port 3000)...${NC}"
PID=$(lsof -ti:3000)
if [ ! -z "$PID" ]; then
    echo -e "${RED}[WARN] Terminating background engine (PID: $PID)...${NC}"
    kill -9 $PID > /dev/null 2>&1
fi

cd desktop-overlay
npm start
cd ..