"""
Integration tests for the InjectorAgent.
"""
import pytest
import requests
import time
from typing import Dict, Any

# Base URL for the API
BASE_URL = "http://localhost:8000"

class TestInjectorAgentIntegration:
    """Test suite for InjectorAgent integration tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup method to ensure the service is running before tests"""
        # Wait a bit for the service to start
        time.sleep(2)
        
        # Check if service is running
        try:
            response = requests.get(f"{BASE_URL}/health")
            assert response.status_code == 200
            assert response.json()["status"] == "healthy"
        except requests.exceptions.ConnectionError:
            pytest.fail("Could not connect to the ECE service. Make sure it's running.")
    
    def test_successful_context_injection(self):
        """Test successful context injection into a knowledge base"""
        # First, we need to extract and distill some content
        # In a real scenario, this would come from other agents
        distilled_content = {
            "entities": [
                {"name": "Machine Learning", "type": "Concept"},
                {"name": "Neural Network", "type": "Technology"}
            ],
            "relationships": [
                {"source": "Machine Learning", "target": "Neural Network", "type": "uses"}
            ],
            "key_points": [
                "Machine Learning is a subset of AI",
                "Neural Networks are used in Machine Learning"
            ]
        }
        
        payload = {
            "message": f"Inject this context into the knowledge base: {distilled_content}",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "InjectorAgent"
        
        # Verify successful injection
        response_text = data["response"]
        assert "successfully injected" in response_text.lower() or "injection successful" in response_text.lower()
    
    def test_injection_error_handling(self):
        """Test handling of injection errors"""
        # Send malformed data to trigger an error
        payload = {
            "message": "Inject this malformed context: {invalid_json: }",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200  # Service should handle errors gracefully
        
        data = response.json()
        assert "response" in data
        # Should either use InjectorAgent and report error, or fall back to default
        assert data["agent_used"] in ["InjectorAgent", "WebSearchAgent"]
        
        # If InjectorAgent was used, check for error handling
        if data["agent_used"] == "InjectorAgent":
            response_text = data["response"]
            assert "error" in response_text.lower() or "failed" in response_text.lower()
    
    def test_data_consistency_verification(self):
        """Test data consistency verification during injection"""
        # Prepare test data
        test_data = {
            "entities": [
                {"name": "Python", "type": "Programming Language"},
                {"name": "FastAPI", "type": "Web Framework"}
            ],
            "relationships": [
                {"source": "Python", "target": "FastAPI", "type": "used_by"}
            ]
        }
        
        payload = {
            "message": f"Inject and verify consistency of: {test_data}",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "InjectorAgent"
        
        # Verify consistency check in response
        response_text = data["response"]
        assert "verified" in response_text.lower() or "consistent" in response_text.lower()
    
    def test_agent_interaction(self):
        """Test interaction with other agents (ArchivistAgent)"""
        # This test simulates interaction with ArchivistAgent
        # by requesting archival after injection
        payload = {
            "message": "Inject this context and archive the transaction: {"topic": "Test Injection"}",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        # Should use InjectorAgent primarily, but might involve ArchivistAgent
        assert data["agent_used"] in ["InjectorAgent", "ArchivistAgent", "WebSearchAgent"]
        
        # Verify interaction in response
        response_text = data["response"]
        assert "injected" in response_text.lower() and ("archived" in response_text.lower() or "archiv" in response_text.lower())

if __name__ == "__main__":
    pytest.main([__file__])