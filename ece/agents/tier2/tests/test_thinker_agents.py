"""
Tests for the Thinker agents.

This module tests the diverse Thinker personas used in the Parallel Thinking workflow.
"""

import sys
import os
import unittest

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from ece.agents.tier2.thinker_agents import (
    OptimistThinker, 
    PessimistThinker, 
    CreativeThinker, 
    AnalyticalThinker, 
    PragmaticThinker,
    get_all_thinkers
)


class TestThinkerAgents(unittest.TestCase):
    """Test cases for the Thinker agents."""

    def test_optimist_thinker(self):
        """Test the OptimistThinker."""
        thinker = OptimistThinker()
        problem_poml = "<poml><problem>Should we invest in this new technology?</problem></poml>"
        
        perspective = thinker.think(problem_poml)
        
        # Verify that we got a response
        self.assertIsInstance(perspective, str)
        self.assertGreater(len(perspective), 0)
        
        # Verify that the response contains expected elements
        self.assertIn("<poml>", perspective)
        self.assertIn('thinker="Optimist"', perspective)
        self.assertIn("<analysis>", perspective)
    
    def test_pessimist_thinker(self):
        """Test the PessimistThinker."""
        thinker = PessimistThinker()
        problem_poml = "<poml><problem>Should we invest in this new technology?</problem></poml>"
        
        perspective = thinker.think(problem_poml)
        
        # Verify that we got a response
        self.assertIsInstance(perspective, str)
        self.assertGreater(len(perspective), 0)
        
        # Verify that the response contains expected elements
        self.assertIn("<poml>", perspective)
        self.assertIn('thinker="Pessimist"', perspective)
        self.assertIn("<analysis>", perspective)
    
    def test_creative_thinker(self):
        """Test the CreativeThinker."""
        thinker = CreativeThinker()
        problem_poml = "<poml><problem>How can we reduce energy consumption?</problem></poml>"
        
        perspective = thinker.think(problem_poml)
        
        # Verify that we got a response
        self.assertIsInstance(perspective, str)
        self.assertGreater(len(perspective), 0)
        
        # Verify that the response contains expected elements
        self.assertIn("<poml>", perspective)
        self.assertIn('thinker="Creative"', perspective)
        self.assertIn("<analysis>", perspective)
    
    def test_analytical_thinker(self):
        """Test the AnalyticalThinker."""
        thinker = AnalyticalThinker()
        problem_poml = "<poml><problem>What factors affect our customer retention?</problem></poml>"
        
        perspective = thinker.think(problem_poml)
        
        # Verify that we got a response
        self.assertIsInstance(perspective, str)
        self.assertGreater(len(perspective), 0)
        
        # Verify that the response contains expected elements
        self.assertIn("<poml>", perspective)
        self.assertIn('thinker="Analytical"', perspective)
        self.assertIn("<analysis>", perspective)
    
    def test_pragmatic_thinker(self):
        """Test the PragmaticThinker."""
        thinker = PragmaticThinker()
        problem_poml = "<poml><problem>How should we implement this feature?</problem></poml>"
        
        perspective = thinker.think(problem_poml)
        
        # Verify that we got a response
        self.assertIsInstance(perspective, str)
        self.assertGreater(len(perspective), 0)
        
        # Verify that the response contains expected elements
        self.assertIn("<poml>", perspective)
        self.assertIn('thinker="Pragmatic"', perspective)
        self.assertIn("<analysis>", perspective)
    
    def test_get_all_thinkers(self):
        """Test that get_all_thinkers returns all expected thinkers."""
        thinkers = get_all_thinkers()
        
        # Verify we have the expected number of thinkers
        self.assertEqual(len(thinkers), 5)
        
        # Verify each thinker has the expected type and name
        thinker_names = [thinker.name for thinker in thinkers]
        expected_names = ["Optimist", "Pessimist", "Creative", "Analytical", "Pragmatic"]
        
        for name in expected_names:
            self.assertIn(name, thinker_names)


if __name__ == '__main__':
    unittest.main()