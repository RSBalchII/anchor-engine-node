# src/tools/ece_tools.py
# This file contains the implementation of the core tools for the ECE.

import json
from pydantic import BaseModel, Field
# Corrected relative import for src-layout
from .utils.db_manager import db_manager

# === Placeholder for Tool Base Class ===
class Tool(object):
    def __init__(self):
        self.name = "BaseTool"
        self.description = "This is a base tool."
        self.input_model = None

    def _run(self, tool_input):
        raise NotImplementedError


# === Input Schemas for Tools ===
# Using Pydantic models to define clear, validated input schemas for each tool.

class DistillInput(BaseModel):
    """Input schema for the DistillerAgent tool."""
    raw_text: str = Field(description="The raw, unstructured text from a session log or document to be distilled.")

class ArchiveInput(BaseModel):
    """Input schema for the ArchivistAgent tool."""
    structured_summary: str = Field(description="A structured summary (ideally in JSON format) containing insights and relationships to be saved to the knowledge graph.")

class ExtractInput(BaseModel):
    """Input schema for the ExtractorAgent tool."""
    question: str = Field(description="A natural language question about a topic that may be in the knowledge graph.")

class InjectInput(BaseModel):
    """Input schema for the InjectorAgent tool."""
    analysis_depth: str = Field(description="The level of effort for the analysis, e.g., 'shallow' or 'deep'.", default="shallow")


# === Tool Implementations ===

class DistillerAgent(Tool):
    """
    A tool that embodies the DistillerAgent. It takes a large block of raw text
    and uses an LLM to distill it into a structured summary of high-coherency
    insights and key conceptual relationships.
    """
    def __init__(self, llm):
        super().__init__()
        self.llm = llm
        self.name = "DistillerAgent"
        self.description = (
            "Analyzes raw text (e.g., session logs) to identify and summarize key insights, "
            "decisions, and conceptual relationships. Use this to process unstructured data."
        )
        self.input_model = DistillInput

    def _run(self, tool_input: DistillInput) -> str:
        """The core logic for the DistillerAgent tool."""
        print(f"🕵️  DistillerAgent activated. Analyzing text...")
        # Enhanced prompt for structured graph-based JSON output
        prompt = f"""
        You are a senior knowledge architect. Your task is to analyze the provided text and deconstruct it into a knowledge graph format.
        Identify the core entities (people, places, projects, concepts, technologies) and the relationships that connect them.
        
        Output a single, clean JSON object with two keys: "entities" and "relationships".
        - "entities": A list of strings representing the unique concepts.
        - "relationships": A list of triplets, where each triplet is `[<source_entity>, <relationship_type>, <target_entity>]`.
        
        The relationship type should be a concise, descriptive verb phrase in uppercase (e.g., "IMPLEMENTED", "DISCUSSED", "USES", "MANAGES").

        Example Input Text: "Rob is the architect for the ECE project, which uses Elysia and Neo4j. Coda is an agent that helps implement the system."
        Example Output JSON:
        {{
            "entities": ["Rob", "ECE Project", "Elysia", "Neo4j", "Coda"],
            "relationships": [
                ["Rob", "IS_ARCHITECT_FOR", "ECE Project"],
                ["ECE Project", "USES", "Elysia"],
                ["ECE Project", "USES", "Neo4j"],
                ["Coda", "IMPLEMENTS", "ECE Project"]
            ]
        }}

        Now, analyze the following text and generate the JSON output.

        Raw Text:
        ---
        {tool_input.raw_text}
        ---

        Respond with only the JSON object.
        Distilled JSON:
        """
        try:
            response = self.llm.invoke(prompt)
            # Ensure the response is a clean JSON string
            cleaned_response = response.strip().replace("`json", "").replace("`", "")
            print("✅ Distillation complete.")
            return cleaned_response
        except Exception as e:
            print(f"❌ ERROR in DistillerAgent: {e}")
            return f'{{"error": "An error occurred during distillation: {e}"}}'

class ArchivistAgent(Tool):
    """
    A tool that embodies the ArchivistAgent. It takes a structured summary and
    persists it into the Neo4j knowledge graph by generating and executing
    Cypher queries.
    """
    def __init__(self, llm=None): # llm is optional as this agent is deterministic
        super().__init__()
        self.llm = llm
        self.name = "ArchivistAgent"
        self.description = (
            "Takes a structured JSON summary of entities and relationships and saves it to the "
            "long-term Neo4j knowledge graph. Use this to persist important information."
        )
        self.input_model = ArchiveInput

    def _run(self, tool_input: ArchiveInput) -> str:
        """The core logic for the ArchivistAgent tool."""
        print(f"🗄️  ArchivistAgent activated. Writing to knowledge graph...")

        try:
            data = json.loads(tool_input.structured_summary)
            entities = data.get("entities", [])
            relationships = data.get("relationships", [])
            
            if not entities:
                return "⚠️ ArchivistAgent: No entities found in the summary. Nothing to archive."

            # Create all entities first using MERGE
            for entity_name in entities:
                db_manager.execute_query(
                    "MERGE (c:Concept {name: $name})",
                    parameters={"name": entity_name}
                )
            
            # Create all relationships
            for rel in relationships:
                if len(rel) == 3:
                    source, rel_type, target = rel
                    # Sanitize relationship type to be valid for Cypher
                    sanitized_rel_type = "".join(filter(str.isalnum, rel_type.upper()))
                    if not sanitized_rel_type:
                        print(f"⚠️ Skipping invalid relationship type: {rel_type}")
                        continue
                    
                    query = (
                        "MATCH (a:Concept {name: $source}) "
                        "MATCH (b:Concept {name: $target}) "
                        f"MERGE (a)-[r:{sanitized_rel_type}]->(b)"
                    )
                    db_manager.execute_query(query, parameters={"source": source, "target": target})

            success_message = f"✅ Archive complete. Merged {len(entities)} entities and {len(relationships)} relationships into the graph."
            print(success_message)
            return success_message
            
        except json.JSONDecodeError:
            error_message = "❌ ERROR in ArchivistAgent: Input was not valid JSON."
            print(error_message)
            return error_message
        except Exception as e:
            error_message = f"❌ ERROR in ArchivistAgent during DB operation: {e}"
            print(error_message)
            return error_message

class ExtractorAgent(Tool):
    """
    A tool that embodies the ExtractorAgent. It takes a natural language question,
    translates it into a Cypher query, executes it against the Neo4j knowledge
    graph, and returns the result as a context string.
    """
    def __init__(self, llm):
        super().__init__()
        self.llm = llm
        self.name = "ExtractorAgent"
        self.description = (
            "Answers a user's question by searching for relevant information in the "
            "long-term Neo4j knowledge graph. Use this to retrieve persisted memories."
        )
        self.input_model = ExtractInput

    def _run(self, tool_input: ExtractInput) -> str:
        """The core logic for the ExtractorAgent tool."""
        print(f"🔎 ExtractorAgent activated. Querying graph for: '{tool_input.question}'")

        try:
            # 1. Get the database schema to provide context to the LLM
            schema = db_manager.get_schema()
            schema_str = json.dumps(schema, indent=2)

            # 2. Construct a prompt to translate the natural language question to Cypher
            prompt = f"""
            You are an expert Neo4j Cypher query writer. Your task is to translate a natural language question into an optimized Cypher query based on the provided database schema.

            Database Schema:
            ---
            {schema_str}
            ---

            Guidelines:
            - Only use the node labels and relationship types present in the schema.
            - The primary node label is `Concept`.
            - All concepts have a `name` property.
            - Return ONLY the single, complete Cypher query. Do not include any explanations, markdown, or other text.

            Natural Language Question: "{tool_input.question}"

            Cypher Query:
            """

            # 3. Use the LLM to generate the Cypher query
            print("🤖 Translating question to Cypher query...")
            generated_query = self.llm.invoke(prompt).strip()
            # Clean up potential markdown fences
            if generated_query.startswith('`') and generated_query.endswith('`'):
                generated_query = generated_query.strip('`').strip()
            if generated_query.startswith('cypher'):
                generated_query = generated_query[6:].strip()

            print(f"Generated Cypher: {generated_query}")

            # 4. Execute the generated query
            print("Executing query against the knowledge graph...")
            results = db_manager.execute_query(generated_query)

            if not results:
                return "No information found in the knowledge graph for that question."

            # 5. Format and return the results
            response = json.dumps(results, indent=2)
            print(f"✅ Extraction complete. Found {len(results)} results.")
            return response

        except Exception as e:
            error_message = f"❌ ERROR in ExtractorAgent during operation: {e}"
            print(error_message)
            return error_message

class InjectorAgent(Tool):
    """
    A tool that embodies the InjectorAgent. It uses reinforcement learning to
    analyze and optimize the knowledge graph, inferring new connections and
    refining existing relationships.
    """
    def __init__(self, llm):
        super().__init__()
        self.llm = llm
        self.name = "InjectorAgent"
        self.description = (
            "Triggers a deep analysis of the knowledge graph to optimize it and infer "
            "new relationships. This is a long-running, asynchronous task."
        )
        self.input_model = InjectInput

    def _run(self, tool_input: InjectInput) -> str:
        """The core logic for the InjectorAgent tool."""
        print(f"🧠 InjectorAgent activated. Beginning graph optimization (Depth: {tool_input.analysis_depth})...")
        # Placeholder for the complex Q-learning logic.
        result = f"✅ (Simulated) Asynchronous graph optimization process initiated with depth '{tool_input.analysis_depth}'. The graph will be improved over time."
        print(result)
        return result