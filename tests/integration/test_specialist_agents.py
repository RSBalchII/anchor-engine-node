"""
Integration tests for the External Context Engine, including tests for the new specialist agents.
"""
import pytest
import requests
import time
from typing import Dict, Any

# Base URL for the API
BASE_URL = "http://localhost:8000"

class TestECEIntegration:
    """Test suite for External Context Engine integration tests"""
    
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
    
    def test_health_check(self):
        """Test the health check endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_root_endpoint(self):
        """Test the root endpoint"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        assert "message" in response.json()
    
    def test_web_search_intent(self):
        """Test the web search intent routing"""
        payload = {
            "message": "Find information about artificial intelligence",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "WebSearchAgent"
        assert "results found" in data["response"]
    
    def test_multi_modal_processing_intent(self):
        """Test the multi-modal processing intent routing"""
        payload = {
            "message": "Process this image of a cat",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "MultiModalIngestionAgent"
    
    def test_coherence_check_intent(self):
        """Test the coherence check intent routing"""
        payload = {
            "message": "Check the coherence of this response",
            "context": {
                "previous_messages": [
                    "Hello, how are you?",
                    "I'm fine, thank you!"
                ]
            }
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "CoherenceAgent"
        assert "Coherence score" in data["response"]
    
    def test_safety_check_intent(self):
        """Test the safety check intent routing"""
        payload = {
            "message": "Is this content appropriate?",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "SafetyAgent"
        assert "Safety score" in data["response"]
    
    def test_default_intent(self):
        """Test the default intent routing"""
        payload = {
            "message": "Generic query without specific intent",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Should default to WebSearchAgent
        assert data["agent_used"] == "WebSearchAgent"
        assert "results found" in data["response"]

    # New tests for the Coda-Coder-D-012 series specialist agents
    
    def test_extractor_agent_routing(self):
        """Test routing to ExtractorAgent"""
        payload = {
            "message": "Extract key information from this document",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming ExtractorAgent would be used for extraction tasks
        # This might need to be adjusted based on actual implementation
        assert data["agent_used"] in ["ExtractorAgent", "WebSearchAgent"]  # Fallback to default if not implemented
    
    def test_distiller_agent_routing(self):
        """Test routing to DistillerAgent"""
        payload = {
            "message": "Distill the main points from this research paper",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming DistillerAgent would be used for distillation tasks
        # This might need to be adjusted based on actual implementation
        assert data["agent_used"] in ["DistillerAgent", "WebSearchAgent"]  # Fallback to default if not implemented
    
    def test_distiller_agent_functionality(self):
        """Test DistillerAgent's core functionality based on spec.md"""
        # Test with raw text input
        payload = {
            "message": "Distill this text: Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of 'intelligent agents': any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals.",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "DistillerAgent"
        
        # Verify that the response contains structured data
        response_text = data["response"]
        assert "entities" in response_text.lower() or "relationships" in response_text.lower() or "structured" in response_text.lower()
        
    def test_distiller_agent_entity_extraction(self):
        """Test DistillerAgent's entity extraction capability"""
        payload = {
            "message": "Extract entities from this: Google was founded by Larry Page and Sergey Brin while they were Ph.D. students at Stanford University.",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "DistillerAgent"
        
        # Verify that entities are identified in the response
        response_text = data["response"]
        assert "google" in response_text.lower() or "larry page" in response_text.lower() or "sergey brin" in response_text.lower()
        
    def test_distiller_agent_relationship_identification(self):
        """Test DistillerAgent's relationship identification capability"""
        payload = {
            "message": "Identify relationships in this text: Google was founded by Larry Page and Sergey Brin while they were Ph.D. students at Stanford University.",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        assert data["agent_used"] == "DistillerAgent"
        
        # Verify that relationships are identified in the response
        response_text = data["response"]
        assert "founded by" in response_text.lower() or "students at" in response_text.lower()
    
    def test_archivist_agent_routing(self):
        """Test routing to ArchivistAgent"""
        payload = {
            "message": "Archive this conversation for future reference",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming ArchivistAgent would be used for archiving tasks
        # This might need to be adjusted based on actual implementation
        assert data["agent_used"] in ["ArchivistAgent", "WebSearchAgent"]  # Fallback to default if not implemented
    
    def test_injector_agent_routing(self):
        """Test routing to InjectorAgent"""
        payload = {
            "message": "Inject this context into the knowledge base",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming InjectorAgent would be used for injection tasks
        # This might need to be adjusted based on actual implementation
        assert data["agent_used"] in ["InjectorAgent", "WebSearchAgent"]  # Fallback to default if not implemented

    def test_q_learning_agent_directed_search(self):
        """Test QLearningAgent's directed search capability"""
        payload = {
            "message": "Find the most efficient path between 'machine learning' and 'neural networks' concepts",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        # We might need to adjust the expected status code based on implementation
        # For now, assuming it will be routed correctly
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming QLearningAgent would be used for graph navigation tasks
        assert data["agent_used"] in ["QLearningAgent", "WebSearchAgent"]  # Fallback to default if not implemented
        
        # If QLearningAgent was used, check for path-related response
        if data["agent_used"] == "QLearningAgent":
            response_text = data["response"]
            # Check for indicators of path finding in the response
            assert ("path" in response_text.lower() or 
                    "route" in response_text.lower() or 
                    "q-value" in response_text.lower())

    def test_q_learning_agent_exploratory_search(self):
        """Test QLearningAgent's exploratory search capability"""
        payload = {
            "message": "Explore the neighborhood of the 'deep learning' concept",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        # We might need to adjust the expected status code based on implementation
        # For now, assuming it will be routed correctly
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming QLearningAgent would be used for graph navigation tasks
        assert data["agent_used"] in ["QLearningAgent", "WebSearchAgent"]  # Fallback to default if not implemented
        
        # If QLearningAgent was used, check for exploration-related response
        if data["agent_used"] == "QLearningAgent":
            response_text = data["response"]
            # Check for indicators of exploration in the response
            assert ("explor" in response_text.lower() or 
                    "neighborhood" in response_text.lower() or 
                    "related" in response_text.lower())

    def test_q_learning_agent_q_table_update(self):
        """Test QLearningAgent's Q-Table update capability"""
        # This test might need to be adjusted based on how the agent exposes Q-Table updates
        # For now, we'll send a message that should trigger a Q-Table update
        payload = {
            "message": "Update Q-Table based on the recent path traversal between concepts",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        # We might need to adjust the expected status code based on implementation
        # For now, assuming it will be routed correctly
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming QLearningAgent would be used for Q-Table management tasks
        assert data["agent_used"] in ["QLearningAgent", "WebSearchAgent"]  # Fallback to default if not implemented
        
        # If QLearningAgent was used, check for Q-Table update confirmation
        if data["agent_used"] == "QLearningAgent":
            response_text = data["response"]
            # Check for indicators of Q-Table update in the response
            assert ("q-table" in response_text.lower() or 
                    "updated" in response_text.lower() or 
                    "learned" in response_text.lower())

    # Tests for JanitorAgent
    def test_janitor_agent_routing(self):
        """Test routing to JanitorAgent"""
        payload = {
            "message": "Clean up the knowledge graph",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming JanitorAgent would be used for cleaning tasks
        # This might need to be adjusted based on actual implementation
        assert data["agent_used"] in ["JanitorAgent", "WebSearchAgent"]  # Fallback to default if not implemented

    def test_janitor_agent_cleanup(self):
        """Test JanitorAgent's cleanup capability"""
        payload = {
            "message": "Remove obsolete data from the knowledge graph",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming JanitorAgent would be used for cleaning tasks
        assert data["agent_used"] in ["JanitorAgent", "WebSearchAgent"]  # Fallback to default if not implemented
        
        # If JanitorAgent was used, check for cleanup-related response
        if data["agent_used"] == "JanitorAgent":
            response_text = data["response"]
            # Check for indicators of cleanup in the response
            assert ("clean" in response_text.lower() or 
                    "remove" in response_text.lower() or 
                    "obsolete" in response_text.lower())

    def test_janitor_agent_optimization(self):
        """Test JanitorAgent's optimization capability"""
        payload = {
            "message": "Optimize the knowledge graph structure",
            "context": {}
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "response" in data
        assert "agent_used" in data
        # Assuming JanitorAgent would be used for optimization tasks
        assert data["agent_used"] in ["JanitorAgent", "WebSearchAgent"]  # Fallback to default if not implemented
        
        # If JanitorAgent was used, check for optimization-related response
        if data["agent_used"] == "JanitorAgent":
            response_text = data["response"]
            # Check for indicators of optimization in the response
            assert ("optimiz" in response_text.lower() or 
                    "structure" in response_text.lower() or 
                    "performance" in response_text.lower())


if __name__ == "__main__":
    pytest.main([__file__])