import json
import re
from typing import Dict, List, Any, Optional

class DistillerAgent:
    def __init__(self):
        self.name = "DistillerAgent"
        self.type = "Data Condensing & Structuring Agent"
        self.goal = "Transform raw, unstructured text into structured, high-coherency summaries."
        self.rules = [
            "Receive raw text from the `ExtractorAgent` or other designated sources.",
            "Analyze the text to identify key concepts, decisions, and relationships.",
            "Condense the analysis into a structured JSON object.",
            "Pass the final JSON object to the `ArchivistAgent`.",
            "Forbidden: Do not interact with any database, cache, or file system for writing or storage. Your sole function is to transform and pass data."
        ]

    def process_text(self, raw_text: str) -> Dict[str, Any]:
        """
        Process raw text and extract structured information including entities and relationships.
        
        Args:
            raw_text (str): The raw, unstructured text to be processed
            
        Returns:
            Dict[str, Any]: A structured representation of the text with entities and relationships
            
        Raises:
            ValueError: If raw_text is empty or None
            TypeError: If raw_text is not a string
        """
        # Validate input
        if raw_text is None:
            raise ValueError("raw_text cannot be None")
        
        if not isinstance(raw_text, str):
            raise TypeError("raw_text must be a string")
        
        if not raw_text.strip():
            raise ValueError("raw_text cannot be empty")
        
        try:
            # Extract entities and relationships using NLP techniques
            entities = self._extract_entities(raw_text)
            relationships = self._extract_relationships(raw_text, entities)
            
            # Generate a summary
            summary = self._generate_summary(raw_text, entities, relationships)
            
            # Identify key concepts
            key_concepts = self._identify_key_concepts(raw_text, entities)
            
            # Identify decisions
            decisions = self._identify_decisions(raw_text)
            
            structured_data = {
                "summary": summary,
                "key_concepts": key_concepts,
                "decisions": decisions,
                "entities": entities,
                "relationships": relationships
            }
            
            return structured_data
            
        except Exception as e:
            print(f"Error processing text: {e}")
            # Return a basic structured data object even in case of errors
            return {
                "summary": "Error occurred during processing",
                "key_concepts": [],
                "decisions": [],
                "entities": [],
                "relationships": [],
                "error": str(e)
            }

    def _extract_entities(self, text: str) -> List[str]:
        """
        Extract named entities from text using basic NLP techniques.
        
        Args:
            text (str): The text to analyze
            
        Returns:
            List[str]: A list of identified entities
        """
        # Validate input
        if not text:
            return []
        
        try:
            # Simple entity extraction based on capitalized words and phrases
            # In a real implementation, this would use a proper NLP library like spaCy
            words = text.split()
            entities = set()
            
            # Look for capitalized words that might be entities
            for i, word in enumerate(words):
                # Remove punctuation for checking
                clean_word = re.sub(r'[^\w]', '', word)
                if (len(clean_word) > 2 and 
                    clean_word[0].isupper() and 
                    clean_word.lower() not in ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can']):
                    entities.add(clean_word)
            
            # Also look for quoted phrases that might be entities
            quoted_phrases = re.findall(r'"([^"]*)"', text)
            entities.update(quoted_phrases)
            
            return list(entities)
        except Exception as e:
            print(f"Error extracting entities: {e}")
            return []

    def _extract_relationships(self, text: str, entities: List[str]) -> List[List[str]]:
        """
        Extract relationships between entities from text.
        
        Args:
            text (str): The text to analyze
            entities (List[str]): List of identified entities
            
        Returns:
            List[List[str]]: A list of relationships in the format [source, relationship_type, target]
        """
        # Validate input
        if not text or not entities:
            return []
        
        try:
            relationships = []
            
            # Define common relationship patterns
            relationship_patterns = [
                (r'(\w+)\s+(is|was|are|were)\s+(a|an|the)\s+(\w+)', 1, 4),  # Entity is a Role
                (r'(\w+)\s+(uses|used|utilizes|utilized)\s+(\w+)', 1, 3),   # Entity uses Entity
                (r'(\w+)\s+(implements|implemented)\s+(\w+)', 1, 3),        # Entity implements Entity
                (r'(\w+)\s+(works on|worked on)\s+(\w+)', 1, 3),           # Entity works on Entity
                (r'(\w+)\s+(part of|partof)\s+(\w+)', 1, 3),               # Entity part of Entity
            ]
            
            # Look for relationships in the text
            for pattern, source_group, target_group in relationship_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    source = match.group(source_group)
                    target = match.group(target_group)
                    relationship_type = match.group(2).upper().replace(" ", "_")
                    
                    # Only add relationship if both source and target are identified entities
                    if source in entities and target in entities:
                        relationships.append([source, relationship_type, target])
            
            return relationships
        except Exception as e:
            print(f"Error extracting relationships: {e}")
            return []

    def _generate_summary(self, text: str, entities: List[str], relationships: List[List[str]]) -> str:
        """
        Generate a summary of the text based on extracted entities and relationships.
        
        Args:
            text (str): The original text
            entities (List[str]): List of identified entities
            relationships (List[List[str]]): List of identified relationships
            
        Returns:
            str: A summary of the text
        """
        # Validate input
        if not text:
            return "No summary available."
        
        try:
            # Simple summary generation based on sentence extraction
            sentences = re.split(r'[.!?]+', text)
            
            # Find sentences that contain entities
            relevant_sentences = []
            for sentence in sentences:
                if any(entity in sentence for entity in entities):
                    relevant_sentences.append(sentence.strip())
            
            # Take the first few relevant sentences as summary
            summary = ". ".join(relevant_sentences[:3])
            if not summary:
                # Fallback to first few sentences if no entities found
                summary = ". ".join(sentences[:2])
            
            return summary + "." if summary else "No summary available."
        except Exception as e:
            print(f"Error generating summary: {e}")
            return "Error occurred during summary generation."

    def _identify_key_concepts(self, text: str, entities: List[str]) -> List[str]:
        """
        Identify key concepts from the text.
        
        Args:
            text (str): The text to analyze
            entities (List[str]): List of identified entities
            
        Returns:
            List[str]: A list of key concepts
        """
        try:
            # For now, use entities as key concepts
            # In a real implementation, this would use more sophisticated NLP techniques
            return entities[:10]  # Limit to top 10 concepts
        except Exception as e:
            print(f"Error identifying key concepts: {e}")
            return []

    def _identify_decisions(self, text: str) -> List[str]:
        """
        Identify decisions mentioned in the text.
        
        Args:
            text (str): The text to analyze
            
        Returns:
            List[str]: A list of identified decisions
        """
        # Validate input
        if not text:
            return []
        
        try:
            decisions = []
            
            # Look for decision patterns
            decision_patterns = [
                r'(decided|decides|decision).*?(to\s+\w+)',
                r'(chosen|chose|selected|selected).*?(as\s+\w+)',
                r'(will|should|must|need to)\s+(\w+\s+\w+)',
            ]
            
            for pattern in decision_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    decisions.append(match.group(0))
            
            return decisions[:5]  # Limit to top 5 decisions
        except Exception as e:
            print(f"Error identifying decisions: {e}")
            return []

    def pass_to_archivist(self, structured_data: Dict[str, Any]) -> None:
        """
        Pass the structured data to the ArchivistAgent.
        
        Args:
            structured_data (Dict[str, Any]): The structured data to pass
            
        Raises:
            ValueError: If structured_data is empty or None
            TypeError: If structured_data is not a dictionary
        """
        # Validate input
        if structured_data is None:
            raise ValueError("structured_data cannot be None")
        
        if not isinstance(structured_data, dict):
            raise TypeError("structured_data must be a dictionary")
        
        if not structured_data:
            raise ValueError("structured_data cannot be empty")
        
        try:
            # Import the ArchivistAgent tool
            from .tools.ece_tools import ArchivistAgent, ArchiveInput
            
            # Create an instance of the ArchivistAgent
            # Note: In a real implementation, the llm parameter would be provided
            archivist = ArchivistAgent()
            
            # Convert structured_data to JSON string as expected by ArchiveInput
            structured_summary = json.dumps(structured_data)
            
            # Create the input for the ArchivistAgent
            archive_input = ArchiveInput(structured_summary=structured_summary)
            
            # Call the ArchivistAgent's _run method
            result = archivist._run(archive_input)
            
            print(f"ArchivistAgent response: {result}")
            
        except Exception as e:
            print(f"Error passing data to ArchivistAgent: {e}")
            # Fallback to printing the data
            print("Passing structured data to ArchivistAgent:")
            print(json.dumps(structured_data, indent=2))

# Example usage
if __name__ == "__main__":
    agent = DistillerAgent()
    raw_text = "Rob is the architect for the ECE project, which uses Elysia and Neo4j. Coda is an agent that helps implement the system. The team decided to use Python for implementation."
    structured_data = agent.process_text(raw_text)
    agent.pass_to_archivist(structured_data)