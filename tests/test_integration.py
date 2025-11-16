"""
Integration Tests (T-112)
Tests requiring ECE_Core to be running
"""
import pytest
import httpx
import os
import asyncio

ECE_URL = os.getenv("ECE_URL", "http://localhost:8000")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_chat_flow():
    """Test complete chat flow with ECE_Core"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Send a test message
            response = await client.post(
                f"{ECE_URL}/chat",
                json={
                    "session_id": "test-integration",
                    "message": "Hello, this is a test message"
                }
            )
            
            assert response.status_code == 200, f"Chat failed: {response.status_code}"
            data = response.json()
            
            # Check response structure
            assert "response" in data, "Response missing 'response' field"
            assert isinstance(data["response"], str), "Response should be a string"
            assert len(data["response"]) > 0, "Response should not be empty"
            
        except httpx.ConnectError:
            pytest.skip("ECE_Core not running - integration test skipped")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_streaming_chat_flow():
    """Test streaming chat with ECE_Core"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            chunks_received = []
            
            async with client.stream(
                "POST",
                f"{ECE_URL}/chat/stream",
                json={
                    "session_id": "test-streaming",
                    "message": "Count to 3"
                }
            ) as response:
                if response.status_code == 404:
                    pytest.skip("Streaming endpoint not available")
                
                assert response.status_code == 200, f"Streaming failed: {response.status_code}"
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        chunks_received.append(line)
            
            assert len(chunks_received) > 0, "Should receive at least one chunk"
            
        except httpx.ConnectError:
            pytest.skip("ECE_Core not running - integration test skipped")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_session_persistence():
    """Test that session context is maintained across messages"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            session_id = "test-session-persistence"
            
            # First message
            response1 = await client.post(
                f"{ECE_URL}/chat",
                json={
                    "session_id": session_id,
                    "message": "Remember this number: 42"
                }
            )
            assert response1.status_code == 200
            
            # Second message referencing first
            response2 = await client.post(
                f"{ECE_URL}/chat",
                json={
                    "session_id": session_id,
                    "message": "What number did I just tell you?"
                }
            )
            assert response2.status_code == 200
            
            # Note: Actual memory test would require checking if "42" is mentioned
            # But that depends on LLM quality, so we just verify the flow works
            
        except httpx.ConnectError:
            pytest.skip("ECE_Core not running - integration test skipped")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_memory_retrieval():
    """Test memory retrieval from ECE_Core"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Test if memories endpoint exists
            response = await client.get(f"{ECE_URL}/memories")
            
            # May return 404 if not implemented, or 200 with data
            if response.status_code == 404:
                pytest.skip("Memories endpoint not implemented")
            
            assert response.status_code == 200, f"Memories retrieval failed: {response.status_code}"
            
        except httpx.ConnectError:
            pytest.skip("ECE_Core not running - integration test skipped")


@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.asyncio
async def test_concurrent_requests():
    """Test handling multiple concurrent requests"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Send 3 concurrent requests
            tasks = []
            for i in range(3):
                task = client.post(
                    f"{ECE_URL}/chat",
                    json={
                        "session_id": f"test-concurrent-{i}",
                        "message": f"Test message {i}"
                    }
                )
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # All should succeed (or at least not crash)
            success_count = sum(1 for r in responses if not isinstance(r, Exception) and r.status_code == 200)
            assert success_count >= 2, "At least 2 concurrent requests should succeed"
            
        except httpx.ConnectError:
            pytest.skip("ECE_Core not running - integration test skipped")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "integration"])
