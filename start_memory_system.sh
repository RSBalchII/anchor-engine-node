#!/bin/bash

# ECE Memory Management System Startup Script
# This script starts all required services and the FastAPI application

set -e  # Exit on error

echo "========================================="
echo "ECE Memory Management System Startup"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service
# Uses Python socket instead of netcat for better portability
wait_for_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service on port $port...${NC}"
    while ! python3 -c "import socket; s = socket.socket(); result = s.connect_ex(('localhost', $port)); s.close(); exit(0 if result == 0 else 1)" 2>/dev/null; do
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${RED}$service failed to start on port $port${NC}"
            return 1
        fi
        sleep 1
        ((attempt++))
    done
    echo -e "${GREEN}$service is ready on port $port${NC}"
    return 0
}

# Step 1: Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists docker && ! docker compose version >/dev/null 2>&1; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.11+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"

# Step 2: Create necessary directories
echo -e "\n${YELLOW}Step 2: Creating directories...${NC}"
mkdir -p data
mkdir -p logs
echo -e "${GREEN}✓ Directories created${NC}"

# Step 3: Start Docker services
echo -e "\n${YELLOW}Step 3: Starting Docker services (Neo4j and Redis)...${NC}"

# Check if services are already running
if docker compose ps | grep -q "neo4j.*Up"; then
    echo -e "${YELLOW}Neo4j is already running${NC}"
else
    docker compose up -d neo4j
fi

if docker compose ps | grep -q "redis.*Up"; then
    echo -e "${YELLOW}Redis is already running${NC}"
else
    docker compose up -d redis
fi

# Wait for services to be ready
wait_for_service "Neo4j" 7687
wait_for_service "Neo4j Browser" 7474
wait_for_service "Redis" 6379

echo -e "${GREEN}✓ Docker services started${NC}"
echo -e "  Neo4j Browser: http://localhost:7474 (user: neo4j, password: your_neo4j_password)"
echo -e "  Redis: localhost:6379"

# Step 4: Setup Python environment
echo -e "\n${YELLOW}Step 4: Setting up Python environment...${NC}"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate
else
    echo -e "${RED}Error: Could not find virtual environment activation script.${NC}"
    exit 1
fi

# Upgrade pip
pip install --quiet --upgrade pip

# Install requirements
echo "Installing Python dependencies..."
if [ -f "requirements_memory.txt" ]; then
    pip install --quiet -r requirements_memory.txt
else
    # Install core dependencies if requirements file doesn't exist
    pip install --quiet fastapi uvicorn[standard] redis neo4j pydantic python-dotenv pyyaml
fi

# Install PyTorch with CUDA support if NVIDIA GPU is available
if command_exists nvidia-smi; then
    echo -e "${YELLOW}NVIDIA GPU detected. Installing PyTorch with CUDA support...${NC}"
    pip install --quiet torch==2.1.2+cu121 -f https://download.pytorch.org/whl/torch_stable.html
    pip install --quiet sentence-transformers
else
    echo -e "${YELLOW}No NVIDIA GPU detected. Installing CPU-only PyTorch...${NC}"
    pip install --quiet torch sentence-transformers
fi

echo -e "${GREEN}✓ Python environment ready${NC}"

# Step 5: Verify GPU setup (optional)
if [ -f "scripts/setup_gpu.py" ]; then
    echo -e "\n${YELLOW}Step 5: Verifying GPU setup...${NC}"
    python scripts/setup_gpu.py || echo -e "${YELLOW}GPU verification completed with warnings${NC}"
else
    echo -e "\n${YELLOW}Step 5: Skipping GPU verification (script not found)${NC}"
fi

# Step 6: Check Ollama (optional but recommended)
echo -e "\n${YELLOW}Step 6: Checking Ollama for LLM support...${NC}"
if command_exists ollama; then
    if pgrep -x "ollama" > /dev/null; then
        echo -e "${GREEN}✓ Ollama is running${NC}"
        echo "  Available models:"
        ollama list 2>/dev/null | head -5 || echo "  (Could not list models)"
    else
        echo -e "${YELLOW}Starting Ollama service...${NC}"
        ollama serve > logs/ollama.log 2>&1 &
        sleep 2
        echo -e "${GREEN}✓ Ollama started${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Ollama not installed. LLM features will be limited.${NC}"
    echo "  Install from: https://ollama.ai/download"
fi

# Step 7: Start the FastAPI application
echo -e "\n${YELLOW}Step 7: Starting ECE Memory Management System...${NC}"

# Export environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
export ENV=${ENV:-development}

# Create a simple test script to verify imports
cat > test_imports.py << 'EOF'
import sys
sys.path.insert(0, 'src')

try:
    from external_context_engine.memory_management import *
    print("✓ Memory management modules imported successfully")
except ImportError as e:
    print(f"⚠ Warning: Some modules couldn't be imported: {e}")
    print("  The system will still run with basic functionality")
EOF

python test_imports.py
rm test_imports.py

# Start the application
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}Starting ECE Memory Management System${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "API Documentation will be available at:"
echo -e "  ${GREEN}http://localhost:8000/docs${NC} (Swagger UI)"
echo -e "  ${GREEN}http://localhost:8000/redoc${NC} (ReDoc)"
echo ""
echo "Memory Management Endpoints:"
echo -e "  POST   ${GREEN}http://localhost:8000/memory/query${NC} - Query memories"
echo -e "  POST   ${GREEN}http://localhost:8000/memory/store${NC} - Store new memory"
echo -e "  GET    ${GREEN}http://localhost:8000/memory/stats${NC} - Get statistics"
echo -e "  GET    ${GREEN}http://localhost:8000/memory/health${NC} - Health check"
echo -e "  WS     ${GREEN}ws://localhost:8000/memory/stream${NC} - WebSocket stream"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Run the FastAPI application
cd src
uvicorn external_context_engine.main:app --reload --host 0.0.0.0 --port 8000 --log-level info
