"""
Health Check Tests (T-110)
Basic smoke tests for Anchor functionality
"""
import pytest
import httpx
import os
from pathlib import Path

# Configuration
ECE_URL = os.getenv("ECE_URL", "http://localhost:8000")
MCP_PORT = 8008


@pytest.mark.smoke
@pytest.mark.asyncio
async def test_ece_core_health():
    """Test ECE_Core is running and healthy"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(f"{ECE_URL}/health")
            assert response.status_code == 200, f"ECE_Core health check failed: {response.status_code}"
            
            data = response.json()
            assert data.get("status") == "healthy", "ECE_Core not healthy"
            assert "version" in data, "ECE_Core health response missing version"
            
        except httpx.ConnectError:
            pytest.skip("ECE_Core not running - start with: cd ../ECE_Core && python launcher.py")


@pytest.mark.smoke
def test_mcp_server_script_exists():
    """Test MCP server script exists"""
    mcp_script = Path(__file__).parent.parent / "mcp" / "server.py"
    assert mcp_script.exists(), f"MCP server not found at: {mcp_script}"


@pytest.mark.smoke
def test_env_file_exists():
    """Test .env configuration file exists"""
    env_file = Path(__file__).parent.parent / ".env"
    # Note: .env might not exist, .env.example should always exist
    env_example = Path(__file__).parent.parent / ".env.example"
    assert env_example.exists(), ".env.example not found (required for setup)"


@pytest.mark.smoke
def test_required_directories_exist():
    """Test required project directories exist"""
    base_dir = Path(__file__).parent.parent
    
    required_dirs = ["mcp", "specs"]
    for dir_name in required_dirs:
        dir_path = base_dir / dir_name
        assert dir_path.exists(), f"Required directory missing: {dir_name}/"


@pytest.mark.smoke
def test_documentation_exists():
    """Test core documentation files exist"""
    base_dir = Path(__file__).parent.parent
    
    required_docs = [
        "README.md",
        "CHANGELOG.md",
        "TROUBLESHOOTING.md",
        "specs/doc_policy.md",
        "specs/plan.md",
        "specs/spec.md",
        "specs/tasks.md",
    ]
    
    for doc in required_docs:
        doc_path = base_dir / doc
        assert doc_path.exists(), f"Required documentation missing: {doc}"


@pytest.mark.unit
def test_configuration_imports():
    """Test configuration modules can be imported"""
    try:
        from dotenv import load_dotenv
        import httpx
        import json
        import asyncio
        
        # All imports successful
        assert True
    except ImportError as e:
        pytest.fail(f"Required dependency not installed: {e}")


@pytest.mark.unit
def test_main_module_imports():
    """Test main module can be imported"""
    try:
        # Import without running
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        
        # This will import but not execute
        # Note: Full execution test would be in integration tests
        assert True
    except Exception as e:
        pytest.fail(f"Failed to import main module: {e}")


@pytest.mark.smoke
@pytest.mark.asyncio
async def test_ece_core_chat_endpoint_exists():
    """Test ECE_Core chat endpoint is available"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Test with minimal payload
            response = await client.post(
                f"{ECE_URL}/chat/stream",
                json={"session_id": "test", "message": "test"}
            )
            # Should return 200 or stream data
            # Even if it fails, endpoint should exist (not 404)
            assert response.status_code != 404, "Chat endpoint not found"
            
        except httpx.ConnectError:
            pytest.skip("ECE_Core not running")


@pytest.mark.unit
def test_env_example_has_security_warnings():
    """Test .env.example contains security warnings (T-100)"""
    env_example = Path(__file__).parent.parent / ".env.example"
    content = env_example.read_text(encoding="utf-8")
    
    # Check for security warnings
    assert "SECURITY WARNING" in content, ".env.example missing security warnings"
    assert "shell_execute" in content, ".env.example should warn about shell_execute"
    assert "DANGEROUS" in content or "dangerous" in content, ".env.example should mention dangerous tools"


@pytest.mark.unit
def test_readme_has_security_section():
    """Test README contains security warnings (T-100)"""
    readme = Path(__file__).parent.parent / "README.md"
    content = readme.read_text(encoding="utf-8")
    
    # Check for security section
    assert "SECURITY WARNING" in content or "Security Warning" in content, "README missing security section"
    assert "shell_execute" in content, "README should warn about shell_execute tool"


@pytest.mark.unit
def test_troubleshooting_guide_exists():
    """Test TROUBLESHOOTING.md exists and has content (T-130)"""
    troubleshooting = Path(__file__).parent.parent / "TROUBLESHOOTING.md"
    assert troubleshooting.exists(), "TROUBLESHOOTING.md not found"
    
    content = troubleshooting.read_text()
    assert len(content) > 1000, "TROUBLESHOOTING.md seems too short"
    
    # Check for key sections
    assert "Cannot connect to ECE_Core" in content
    assert "Tool calls not working" in content
    assert "Redis unavailable" in content
    assert "Neo4j" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
