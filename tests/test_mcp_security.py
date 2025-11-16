"""
Test suite for Anchor MCP security features.
Tests shell command whitelisting and path traversal protection.
"""
import pytest
import os
from pathlib import Path
import tempfile
from mcp.security import ShellSecurity, FilesystemSecurity

# ============================================================================
# SHELL SECURITY TESTS
# ============================================================================

@pytest.fixture
def shell_sec():
    """Create shell security instance."""
    original_env = {}
    # Save original env
    for key in ["SHELL_WHITELIST_ENABLED", "SHELL_ALLOWED_COMMANDS"]:
        original_env[key] = os.getenv(key)
    
    # Set test config
    os.environ["SHELL_WHITELIST_ENABLED"] = "true"
    os.environ["SHELL_ALLOWED_COMMANDS"] = "ls,echo,pwd"
    
    security = ShellSecurity()
    
    yield security
    
    # Restore env
    for key, value in original_env.items():
        if value:
            os.environ[key] = value
        elif key in os.environ:
            del os.environ[key]

def test_shell_validate_allowed_command(shell_sec):
    """Test that whitelisted commands are allowed."""
    is_valid, error = shell_sec.validate_command("ls -la")
    assert is_valid is True
    assert error is None

def test_shell_validate_blocked_command(shell_sec):
    """Test that non-whitelisted commands are blocked."""
    is_valid, error = shell_sec.validate_command("rm -rf /")
    assert is_valid is False
    assert "not in whitelist" in error.lower()

def test_shell_validate_dangerous_pattern(shell_sec):
    """Test that dangerous patterns are blocked."""
    is_valid, error = shell_sec.validate_command(":(){ :|:& };:")
    assert is_valid is False
    assert "dangerous" in error.lower()

def test_shell_execute_safe_allowed():
    """Test executing allowed command."""
    # Disable whitelist for this test to allow 'echo'
    os.environ["SHELL_WHITELIST_ENABLED"] = "false"
    security = ShellSecurity()
    
    result = security.execute_safe("echo hello")
    
    assert "error" not in result or result.get("success") is True
    assert result.get("returncode") == 0
    assert "hello" in result.get("stdout", "").lower()

def test_shell_execute_safe_blocked(shell_sec):
    """Test that blocked commands don't execute."""
    result = shell_sec.execute_safe("dangerous_command")
    
    assert "error" in result or result.get("blocked") is True

def test_shell_execute_timeout():
    """Test command timeout."""
    os.environ["SHELL_EXECUTION_TIMEOUT"] = "1"
    security = ShellSecurity()
    
    # This command should timeout (sleep longer than timeout)
    # Only test on systems where sleep is available
    import platform
    if platform.system() != "Windows":
        result = security.execute_safe("sleep 5", timeout=1)
        assert "timeout" in result.get("error", "").lower()

def test_shell_output_truncation():
    """Test that large output is truncated."""
    os.environ["SHELL_MAX_OUTPUT_SIZE"] = "100"
    os.environ["SHELL_WHITELIST_ENABLED"] = "false"
    security = ShellSecurity()
    
    # Generate large output
    result = security.execute_safe("echo " + "a" * 1000)
    
    if "stdout" in result:
        assert len(result["stdout"]) <= 200  # Some margin for truncation message

# ============================================================================
# FILESYSTEM SECURITY TESTS
# ============================================================================

@pytest.fixture
def fs_sec():
    """Create filesystem security instance."""
    with tempfile.TemporaryDirectory() as tmpdir:
        original_env = {}
        for key in ["FILESYSTEM_ALLOWED_PATHS", "FILESYSTEM_DENY_PATHS", "FILESYSTEM_ALLOW_TRAVERSAL"]:
            original_env[key] = os.getenv(key)
        
        # Set test config
        os.environ["FILESYSTEM_ALLOWED_PATHS"] = tmpdir
        os.environ["FILESYSTEM_DENY_PATHS"] = ""
        os.environ["FILESYSTEM_ALLOW_TRAVERSAL"] = "false"
        
        security = FilesystemSecurity()
        
        yield security, tmpdir
        
        # Restore env
        for key, value in original_env.items():
            if value:
                os.environ[key] = value
            elif key in os.environ:
                del os.environ[key]

def test_fs_validate_allowed_path(fs_sec):
    """Test that paths in allowed directories are accepted."""
    security, tmpdir = fs_sec
    
    test_path = os.path.join(tmpdir, "test.txt")
    is_valid, error = security.validate_path(test_path)
    
    assert is_valid is True
    assert error is None

def test_fs_validate_denied_path(fs_sec):
    """Test that denied paths are blocked."""
    security, tmpdir = fs_sec
    
    # Set denied path
    os.environ["FILESYSTEM_DENY_PATHS"] = tmpdir
    security = FilesystemSecurity()
    
    test_path = os.path.join(tmpdir, "test.txt")
    is_valid, error = security.validate_path(test_path)
    
    assert is_valid is False
    assert "denied" in error.lower()

def test_fs_validate_traversal_blocked(fs_sec):
    """Test that path traversal is blocked when disabled."""
    security, tmpdir = fs_sec
    
    # Try path with ../
    test_path = os.path.join(tmpdir, "../etc/passwd")
    is_valid, error = security.validate_path(test_path)
    
    assert is_valid is False
    assert "traversal" in error.lower()

def test_fs_validate_traversal_allowed():
    """Test that path traversal works when enabled."""
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["FILESYSTEM_ALLOWED_PATHS"] = tmpdir
        os.environ["FILESYSTEM_ALLOW_TRAVERSAL"] = "true"
        security = FilesystemSecurity()
        
        test_path = os.path.join(tmpdir, "subdir", "..", "test.txt")
        is_valid, error = security.validate_path(test_path)
        
        # Should still validate the resolved path
        assert is_valid is True or "traversal" not in (error or "").lower()

def test_fs_read_safe_file(fs_sec):
    """Test reading an allowed file."""
    security, tmpdir = fs_sec
    
    # Create test file
    test_file = os.path.join(tmpdir, "test.txt")
    with open(test_file, 'w') as f:
        f.write("Test content")
    
    result = security.read_safe(test_file)
    
    assert "error" not in result or "blocked" not in result
    assert result.get("type") == "file"
    assert "Test content" in result.get("content", "")

def test_fs_read_safe_directory(fs_sec):
    """Test listing an allowed directory."""
    security, tmpdir = fs_sec
    
    # Create test file in directory
    test_file = os.path.join(tmpdir, "test.txt")
    Path(test_file).touch()
    
    result = security.read_safe(tmpdir)
    
    assert "error" not in result or "blocked" not in result
    assert result.get("type") == "directory"
    assert len(result.get("items", [])) > 0

def test_fs_read_safe_blocked_path(fs_sec):
    """Test that reading blocked path fails."""
    security, tmpdir = fs_sec
    
    # Try to read outside allowed path
    blocked_path = "/etc/passwd"
    result = security.read_safe(blocked_path)
    
    assert "error" in result or result.get("blocked") is True

def test_fs_read_safe_size_limit(fs_sec):
    """Test that large files are truncated."""
    security, tmpdir = fs_sec
    
    # Create large test file
    test_file = os.path.join(tmpdir, "large.txt")
    with open(test_file, 'w') as f:
        f.write("x" * 20000)
    
    result = security.read_safe(test_file, max_size=1000)
    
    assert result.get("truncated") is True
    assert len(result.get("content", "")) <= 1000

def test_fs_read_safe_nonexistent(fs_sec):
    """Test reading nonexistent file."""
    security, tmpdir = fs_sec
    
    result = security.read_safe(os.path.join(tmpdir, "nonexistent.txt"))
    
    assert "error" in result
    assert "does not exist" in result["error"].lower()

# ============================================================================
# INTEGRATION TESTS
# ============================================================================

def test_shell_and_fs_security_together():
    """Test that both security systems work together."""
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["SHELL_WHITELIST_ENABLED"] = "false"
        os.environ["FILESYSTEM_ALLOWED_PATHS"] = tmpdir
        
        shell_sec = ShellSecurity()
        fs_sec = FilesystemSecurity()
        
        # Execute shell command to create file
        test_file = os.path.join(tmpdir, "test.txt")
        result = shell_sec.execute_safe(f"echo test > {test_file}")
        
        # Read the file
        if result.get("success"):
            read_result = fs_sec.read_safe(test_file)
            # File should be readable if command succeeded
            assert "type" in read_result or "error" in read_result
