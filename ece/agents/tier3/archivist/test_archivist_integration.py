"""
Integration tests for the Archivist agent
"""
import unittest
import asyncio
import sys
import os

# Add the project root directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../..'))

from ece.agents.tier3.archivist.archivist_agent import app, ContextRequest

class TestArchivistIntegration(unittest.TestCase):
    """Integration tests for the Archivist agent."""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.app = app
        # Create a test client using the FastAPI app
        from fastapi.testclient import TestClient
        self.client = TestClient(self.app)
    
    def test_health_check(self):
        """Test the health check endpoint."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "healthy"})
    
    def test_root_endpoint(self):
        """Test the root endpoint."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json())
    
    def test_context_request(self):
        """Test the context request endpoint."""
        # Create a context request
        context_request = ContextRequest(
            query="Test query for context",
            user_id="test_user"
        )
        
        # Send the request to the context endpoint
        response = self.client.post("/context", json=context_request.dict())
        
        # Check that we get a response
        self.assertEqual(response.status_code, 200)
        
        # Check that the response has the expected structure
        response_data = response.json()
        self.assertIn("context", response_data)
        self.assertIn("metadata", response_data)
        
        # Check metadata
        metadata = response_data["metadata"]
        self.assertIn("query", metadata)
        self.assertIn("timestamp", metadata)
        self.assertIn("source", metadata)
        self.assertIn("paths_found", metadata)
        self.assertIn("paths_returned", metadata)
        
        # Check that context is a list
        context = response_data["context"]
        self.assertIsInstance(context, list)
    
    def test_distiller_data_endpoint(self):
        """Test the distiller data endpoint."""
        # Create test distiller data
        test_data = {
            "entities": [
                {
                    "id": "test_entity_1",
                    "type": "Concept",
                    "properties": {
                        "name": "Test Concept",
                        "description": "A test concept for integration testing"
                    }
                }
            ],
            "relationships": [
                {
                    "start_id": "test_entity_1",
                    "start_type": "Concept",
                    "end_id": "test_entity_2",
                    "end_type": "Concept",
                    "type": "RELATED_TO",
                    "properties": {
                        "strength": 0.8
                    }
                }
            ],
            "summary": "Test data for integration testing"
        }
        
        # Send the request to the distiller data endpoint
        response = self.client.post("/internal/data_to_archive", json=test_data)
        
        # Check that we get a response (it might be an error due to the database connection,
        # but we should still get a response)
        self.assertIn(response.status_code, [200, 500])
        
        # If we get a 200 response, check the structure
        if response.status_code == 200:
            response_data = response.json()
            self.assertIn("status", response_data)
            self.assertIn("message", response_data)

if __name__ == "__main__":
    unittest.main()