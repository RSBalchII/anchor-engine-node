#!/usr/bin/env python3
"""
Unit tests for the Distiller Agent.
"""

import unittest
import json
from unittest.mock import patch, MagicMock
import sys
import os

# Add the distiller agent directory to the path
distiller_path = os.path.join(os.path.dirname(__file__), '..', 'ece', 'agents', 'tier3', 'distiller')
sys.path.insert(0, distiller_path)

# Try importing from the distiller directory
try:
    # When running from the root directory
    from ece.agents.tier3.distiller.distiller_agent import DistillerAgent
except ImportError:
    # When running from the distiller directory
    from distiller_agent import DistillerAgent


class TestDistillerAgent(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures before each test method."""
        with patch('distiller_agent.yaml') as mock_yaml, \
             patch('distiller_agent.redis') as mock_redis, \
             patch('distiller_agent.spacy') as mock_spacy:
            
            # Mock configuration
            mock_yaml.safe_load.return_value = {
                'cache': {'redis_url': 'redis://localhost:6379'},
                'agents': {
                    'DistillerAgent': {'interval_minutes': 5},
                    'ArchivistAgent': {'api_url': 'http://archivist:8000/api/distilled_data'}
                }
            }
            
            # Mock Redis client
            mock_redis_client = MagicMock()
            mock_redis.from_url.return_value = mock_redis_client
            
            # Mock spaCy model
            mock_nlp = MagicMock()
            mock_spacy.load.return_value = mock_nlp
            
            # Create DistillerAgent instance
            self.agent = DistillerAgent()
            self.agent.redis_client = mock_redis_client
            self.agent.nlp = mock_nlp

    def test_init(self):
        """Test DistillerAgent initialization."""
        self.assertEqual(self.agent.name, "Distiller")
        self.assertEqual(self.agent.version, "1.0.0")
        self.assertIsNotNone(self.agent.config)
        self.assertIsNotNone(self.agent.redis_client)
        self.assertIsNotNone(self.agent.nlp)

    def test_extract_entities(self):
        """Test entity extraction functionality."""
        # Mock spaCy doc and entities
        mock_doc = MagicMock()
        mock_ent1 = MagicMock()
        mock_ent1.text = "John Doe"
        mock_ent1.label_ = "PERSON"
        mock_ent2 = MagicMock()
        mock_ent2.text = "New York"
        mock_ent2.label_ = "GPE"
        
        mock_doc.ents = [mock_ent1, mock_ent2]
        self.agent.nlp.return_value = mock_doc
        
        # Mock spacy.explain
        with patch('distiller_agent.spacy.explain') as mock_explain:
            mock_explain.side_effect = ["Person", "Geo-political entity"]
            
            # Test entity extraction
            text = "John Doe lives in New York."
            entities = self.agent.extract_entities(text)
            
            # Verify results
            self.assertEqual(len(entities), 2)
            self.assertEqual(entities[0]["text"], "John Doe")
            self.assertEqual(entities[0]["label"], "PERSON")
            self.assertEqual(entities[0]["description"], "Person")
            self.assertEqual(entities[1]["text"], "New York")
            self.assertEqual(entities[1]["label"], "GPE")
            self.assertEqual(entities[1]["description"], "Geo-political entity")

    def test_identify_relationships(self):
        """Test relationship identification functionality."""
        # Mock spaCy doc, sentences, and entities
        mock_doc = MagicMock()
        mock_sent = MagicMock()
        mock_token = MagicMock()
        
        # Mock entities
        mock_ent1 = MagicMock()
        mock_ent1.text = "John Doe"
        mock_ent1.label_ = "PERSON"
        mock_ent1.start = 0
        mock_ent1.end = 2
        
        mock_ent2 = MagicMock()
        mock_ent2.text = "New York"
        mock_ent2.label_ = "GPE"
        mock_ent2.start = 5
        mock_ent2.end = 7
        
        # Mock sentence
        mock_sent.ents = [mock_ent1, mock_ent2]
        mock_doc.sents = [mock_sent]
        
        # Mock token for relationship
        mock_token.pos_ = "VERB"
        mock_token.lemma_ = "live"
        mock_token.i = 3
        
        mock_sent.__iter__ = MagicMock(return_value=iter([mock_token]))
        self.agent.nlp.return_value = mock_doc
        
        # Test relationship identification
        text = "John Doe lives in New York."
        entities = [
            {"text": "John Doe", "label": "PERSON", "description": "Person"},
            {"text": "New York", "label": "GPE", "description": "Geo-political entity"}
        ]
        relationships = self.agent.identify_relationships(text, entities)
        
        # Verify results
        self.assertEqual(len(relationships), 1)
        self.assertEqual(relationships[0]["subject"], "John Doe")
        self.assertEqual(relationships[0]["relation"], "live")
        self.assertEqual(relationships[0]["object"], "New York")

    def test_structure_data(self):
        """Test data structuring functionality."""
        # Test data
        entities = [
            {"text": "John Doe", "label": "PERSON", "description": "Person"},
            {"text": "New York", "label": "GPE", "description": "Geo-political entity"}
        ]
        relationships = [
            {"subject": "John Doe", "relation": "live", "object": "New York"}
        ]
        
        # Test structuring
        structured_data = self.agent.structure_data(entities, relationships)
        
        # Verify results
        self.assertIn("timestamp", structured_data)
        self.assertIn("entities", structured_data)
        self.assertIn("relationships", structured_data)
        self.assertIn("summary", structured_data)
        self.assertEqual(len(structured_data["entities"]), 2)
        self.assertEqual(len(structured_data["relationships"]), 1)
        self.assertEqual(structured_data["summary"]["total_entities"], 2)
        self.assertEqual(structured_data["summary"]["total_relationships"], 1)

    def test_read_context_cache(self):
        """Test reading from context cache."""
        # Mock Redis responses
        self.agent.redis_client.keys.return_value = [b'key1', b'key2']
        self.agent.redis_client.smembers.return_value = set()
        self.agent.redis_client.get.side_effect = [b'value1', b'value2']
        
        # Test reading cache
        cache_data = self.agent.read_context_cache()
        
        # Verify results
        self.assertEqual(len(cache_data), 2)
        self.assertEqual(cache_data['key1'], 'value1')
        self.assertEqual(cache_data['key2'], 'value2')

    def test_mark_entry_as_processed(self):
        """Test marking entry as processed."""
        # Test marking entry
        self.agent.mark_entry_as_processed('test_key')
        
        # Verify Redis call
        self.agent.redis_client.sadd.assert_called_once_with('distiller:processed_entries', 'test_key')


if __name__ == '__main__':
    unittest.main()