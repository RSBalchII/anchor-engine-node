from src.app_factory import create_app_with_routers
from src.config import settings
import logging
import os
from logging.handlers import RotatingFileHandler

# Ensure logs directory exists
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# Configure logging
log_file = os.path.join(log_dir, "server.log")
logging.basicConfig(
    level=getattr(logging, settings.ece_log_level),
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        RotatingFileHandler(log_file, maxBytes=1*1024*1024, backupCount=5, encoding='utf-8')
    ]
)

# Ensure Uvicorn logs also go to the file
# uvicorn_logger = logging.getLogger("uvicorn")
# uvicorn_logger.handlers = logging.getLogger().handlers
# uvicorn_access_logger = logging.getLogger("uvicorn.access")
# uvicorn_access_logger.handlers = logging.getLogger().handlers

# --- Start WebGPU Bridge (Sovereign Tools) ---
import subprocess
import sys
from pathlib import Path

bridge_script = Path(__file__).parent.parent / "tools" / "webgpu_bridge.py"
if bridge_script.exists():
    print(f"🚀 Starting WebGPU Bridge from {bridge_script}...")
    # Run in background, detached
    subprocess.Popen([sys.executable, str(bridge_script)], cwd=str(bridge_script.parent.parent))
else:
    print(f"⚠️ WebGPU Bridge script not found at {bridge_script}")
# ---------------------------------------------

app = create_app_with_routers()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=settings.ece_host, port=settings.ece_port, log_config=None)
