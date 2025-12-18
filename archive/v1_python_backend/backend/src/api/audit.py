from fastapi import APIRouter, Depends, HTTPException, Request
from src.bootstrap import get_components
from src.security import verify_api_key
from pathlib import Path
from src.config import settings

router = APIRouter()


@router.get('/audit/logs')
async def get_audit_logs(request_obj: Request, limit: int = 50, authenticated: bool = Depends(verify_api_key)):
    try:
        path = Path(settings.audit_log_path)
        if not path.exists():
            return {"logs": [], "message": "No audit log found"}
        with path.open('r', encoding='utf-8', errors='ignore') as f:
            lines = f.read().splitlines()
        tail = lines[-int(limit):] if limit and len(lines) > 0 else lines
        return {"logs": tail, "count": len(tail)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/audit/server-logs')
async def get_server_logs(request_obj: Request, limit: int = 100, authenticated: bool = Depends(verify_api_key)):
    """
    Expose the main server logs (stdout/stderr captured to file).
    """
    try:
        # Assuming logs/server.log is in the workspace root, and we run from root or backend
        # Try to find the logs folder relative to CWD
        log_file = Path("logs/server.log")
        if not log_file.exists():
            # Try one level up if running from backend/
            log_file = Path("../logs/server.log")
        
        if not log_file.exists():
             return {"logs": [f"Log file not found at {log_file.absolute()}"], "count": 0}

        with log_file.open('r', encoding='utf-8', errors='ignore') as f:
            lines = f.read().splitlines()
        
        tail = lines[-int(limit):] if limit and len(lines) > 0 else lines
        return {"logs": tail, "count": len(tail)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/audit/context/{session_id}')
async def get_context_window(session_id: str, request: Request, authenticated: bool = Depends(verify_api_key)):
    """
    Get the active context window from Redis for a specific session.
    """
    try:
        memory = getattr(request.app.state, "memory", None)
        if not memory:
            return {"error": "Memory system not initialized"}
        
        if not memory.redis:
             return {"error": "Redis not connected"}

        context = await memory.redis.get_active_context(session_id)
        return {"session_id": session_id, "context": context}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
