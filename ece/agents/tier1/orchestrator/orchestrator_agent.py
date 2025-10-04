"""
Orchestrator Agent for the External Context Engine (ECE) v2.0 (Async).

This module implements the core logic for the Orchestrator agent using a fully
asynchronous model to align with the FastAPI server and enable non-blocking I/O.
"""

import os
import httpx
import asyncio
import yaml
import traceback
import logging
import typing
import uuid
from typing import Optional, Dict, Any, List
from xml.etree import ElementTree as ET
from urllib.parse import urlparse

from ece.agents.tier2.conversational_agent import ConversationalAgent
from ece.agents.tier2.explorer_agent import ExplorerAgent
from ece.agents.tier2.critique_agent import CritiqueAgent
from ece.agents.tier2.web_search_agent import WebSearchAgent
from ece.common.sandbox import run_code_in_sandbox
from ece.components.context_cache.cache_manager import CacheManager
from ece.agents.tier1.orchestrator.archivist_client import ArchivistClient

# Import UTCP client for tool registration
from utcp_client.client import UTCPClient
from utcp_registry.models.tool import ToolDefinition
import asyncio


class BaseThinker:
    def __init__(self, name="Default", model=None, semaphore: asyncio.Semaphore = None, api_base: str = None):
        self.name = name
        self.model = model
        self.semaphore = semaphore
        self.api_base = api_base
        self.system_prompt = f"You are a helpful AI assistant acting as the '{self.name}' Thinker. Provide a concise analysis from this specific perspective."


    async def think(self, prompt: str) -> str:
        if not self.semaphore:
            raise ValueError("Semaphore not provided to BaseThinker")

        async with self.semaphore:
            print(f"  -> {self.name} Thinker processing with model {self.model}...")
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "num_gpu": 37
                }
            }
            
            if "ollama" in self.api_base:
                url = f"{self.api_base}/api/chat"
            else:
                url = f"{self.api_base}/chat/completions"

            try:
                async with httpx.AsyncClient(timeout=1800.0) as client:
                    response = await client.post(url, json=payload)
                    response.raise_for_status()

                    data = response.json()
                    content = data.get('message', {}).get('content', '')

                    # Wrap the response in POML format
                    return f"<poml><perspective thinker='{self.name}'><analysis>{content}</analysis></perspective>"

            except httpx.HTTPStatusError as e:
                error_message = f"HTTP error occurred: {e.response.status_code} for URL {e.request.url}"
                logging.error(f"Error in {self.name} Thinker: {error_message}")
                return f"<poml><perspective thinker='{self.name}'><analysis>Error: {error_message}</analysis></perspective>"
            except httpx.RequestError as e:
                error_message = f"Request error occurred: {e.__class__.__name__} for URL {e.request.url}"
                logging.error(f"Error in {self.name} Thinker: {error_message}")
                return f"<poml><perspective thinker='{self.name}'><analysis>Error: {error_message}</analysis></perspective>"
            except Exception as e:
                error_message = f"An unexpected error occurred: {e}"
                logging.error(f"Error in {self.name} Thinker: {error_message}", exc_info=True)
                return f"<poml><perspective thinker='{self.name}'><analysis>Error: {error_message}</analysis></perspective>"


class SynthesisThinker(BaseThinker):
    def __init__(self, name="Synthesis", model=None, semaphore: asyncio.Semaphore = None, api_base: str = None):
        super().__init__(name, model, semaphore, api_base)
        self.system_prompt = "You are a master synthesizer. Your job is to take multiple, diverse perspectives on a topic and combine them into a single, coherent, and easy-to-read final analysis."

    async def think(self, prompt: str) -> str:
        if not self.semaphore:
            raise ValueError("Semaphore not provided to SynthesisThinker")

        async with self.semaphore:
            print(f"  -> {self.name} Thinker processing with model {self.model}...")
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "num_gpu": 37
                }
            }
            
            if "ollama" in self.api_base:
                url = f"{self.api_base}/api/chat"
            else:
                url = f"{self.api_base}/chat/completions"

            try:
                async with httpx.AsyncClient(timeout=1800.0) as client:
                    response = await client.post(url, json=payload)
                    response.raise_for_status()

                    data = response.json()
                    # The final synthesis does not need to be wrapped in POML
                    return data.get('message', {}).get('content', '')

            except httpx.HTTPStatusError as e:
                error_message = f"HTTP error occurred: {e.response.status_code} for URL {e.request.url}"
                logging.error(f"Error in {self.name} Thinker: {error_message}")
                return f"Error during synthesis: {error_message}"
            except httpx.RequestError as e:
                error_message = f"Request error occurred: {e.__class__.__name__} for URL {e.request.url}"
                logging.error(f"Error in {self.name} Thinker: {error_message}")
                return f"Error during synthesis: {error_message}"
            except Exception as e:
                error_message = f"An unexpected error occurred: {e}"
                logging.error(f"Error in {self.name} Thinker: {error_message}", exc_info=True)
                return f"An unexpected error occurred during synthesis: {e}"


def get_all_thinkers(config, semaphore, api_base):
    thinker_model = config.get('ThinkerAgent', {}).get('model')
    thinker_personas = config.get('ThinkerAgent', {}).get('personas', [])
    return [BaseThinker(name, model=thinker_model, semaphore=semaphore, api_base=api_base) for name in thinker_personas]


class OrchestratorAgent:
    def __init__(self, session_id: str, config_path: str = 'config.yaml'):
        print(f"DEBUG: TAVILY_API_KEY from os.getenv: {os.getenv('TAVILY_API_KEY')}")
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)

        self.session_id = session_id
        self.client = httpx.AsyncClient(timeout=60.0)
        self.llm_semaphore = asyncio.Semaphore(1)

        # --- REFACTORED: Initialize agents based on the new config.yaml structure ---
        llm_config = self.config.get('llm', {})
        active_provider = llm_config.get('active_provider', 'ollama')
        provider_config = llm_config.get('providers', {}).get(active_provider, {})
        
        llm_model = provider_config.get('model')
        api_base = provider_config.get('api_base')

        synthesis_model = self.config.get('ThinkerAgent', {}).get('synthesis_model', llm_model)

        self.thinkers = get_all_thinkers(self.config, self.llm_semaphore, api_base)
        self.synthesis_thinker = SynthesisThinker(model=synthesis_model, semaphore=self.llm_semaphore, api_base=api_base)

        self.conversational_agent = ConversationalAgent(model=llm_model, api_base=api_base)
        self.explorer_agent = ExplorerAgent(model=llm_model, api_base=api_base)
        self.critique_agent = CritiqueAgent(model=llm_model, success_threshold=0.8, api_base=api_base) # Using a default threshold
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.web_search_agent = WebSearchAgent(model=llm_model, tavily_api_key=tavily_api_key, api_base=api_base) # Updated initialization
        self.distiller_agent = ConversationalAgent(model=llm_model, api_base=api_base) # Placeholder

        # --- FIX: Initialize CacheManager with Redis connection details from config.yaml ---
        redis_url = self.config.get('cache', {}).get('redis_url', 'redis://localhost:6379')
        parsed_url = urlparse(redis_url)

        redis_host = parsed_url.hostname
        redis_port = parsed_url.port

        self.cache_manager = CacheManager(host=redis_host, port=redis_port)

        # --- FIX: Initialize ArchivistClient with the URL from config.yaml ---
        archivist_url = self.config.get('archivist', {}).get('url', 'http://archivist:8003')
        self.archivist_client = ArchivistClient(base_url=archivist_url)

        # Initialize UTCP Client for tool registration
        utcp_registry_url = os.getenv("UTCP_REGISTRY_URL", "http://utcp-registry:8005")
        self.utcp_client = UTCPClient(utcp_registry_url)
        
        # Start the cohesion loop
        self.cohesion_loop_task = None
        
        # Load POML persona at initialization
        self._load_poml_persona()
        
        # Register Orchestrator tools with UTCP Registry
        asyncio.create_task(self._register_orchestrator_tools())


    def start_cohesion_loop(self):
        """Start the periodic cohesion loop that analyzes context every 5 seconds"""
        if self.cohesion_loop_task is None:
            self.cohesion_loop_task = asyncio.create_task(self._run_cohesion_loop())
            print("Cohesion loop started")


    def stop_cohesion_loop(self):
        """Stop the periodic cohesion loop"""
        if self.cohesion_loop_task:
            self.cohesion_loop_task.cancel()
            self.cohesion_loop_task = None
            print("Cohesion loop stopped")


    async def _run_cohesion_loop(self):
        """Run the periodic cohesion loop that analyzes context every 5 seconds"""
        while True:
            try:
                # Wait for 5 seconds between each analysis
                await asyncio.sleep(5)
                
                # Get current context cache
                context_cache = self.cache_manager.get_all_entries()
                
                # If there's context to analyze
                if context_cache:
                    print("Cohesion loop: Analyzing context cache...")
                    
                    # Create an empty prompt to trigger analysis
                    empty_prompt = ""
                    
                    # Analyze the context (this will route to the Archivist)
                    analysis = await self._analyze_context_cache(context_cache)
                    
                    # Store the analysis results
                    analysis_id = str(uuid.uuid4())
                    self.cache_manager.store(f"cohesion_analysis:{analysis_id}", analysis)
                    
                    print(f"Cohesion loop: Analysis completed and stored with ID {analysis_id}")
                else:
                    print("Cohesion loop: No context to analyze")
                    
            except asyncio.CancelledError:
                print("Cohesion loop cancelled")
                break
            except Exception as e:
                print(f"Cohesion loop error: {e}")
                # Continue running even if there's an error
                continue


    async def _analyze_context_cache(self, context_cache):
        """Analyze the context cache and create a timeline-style explanation"""
        print("Analyzing context cache for timeline synthesis...")
        
        # Convert context cache to a string for analysis
        context_str = ""
        for key, value in context_cache.items():
            context_str += f"{key}: {value}\n"
        
        # Create a prompt for timeline synthesis
        synthesis_prompt = f"""Analyze the following context cache and create a timeline-style explanation of events.
        Identify key events, compare current state to previous context states, and create a coherent narrative.
        
        Context Cache:
        {context_str}
        
        Please provide:
        1. A timeline of key events
        2. Comparison of current state to previous states
        3. Any patterns or insights you notice
        """
        
        # Route to Archivist for analysis (this would typically involve calling the Archivist agent)
        # For now, we'll use the synthesis thinker to generate the analysis
        analysis = await self.synthesis_thinker.think(synthesis_prompt)
        
        # Query the Archivist for related memories using the memory query endpoint
        # Generate a unique context ID for this analysis
        context_id = str(uuid.uuid4())
        
        # Create memory query request
        memory_query_data = {
            "context_id": context_id,
            "max_contexts": 5  # Resource limit to prevent memory bloat
        }
        
        try:
            # Call the Archivist's memory query endpoint
            archivist_response = await self.archivist_client.client.post(
                f"{self.archivist_client.base_url}/memory_query",
                json=memory_query_data,
                timeout=30.0
            )
            
            if archivist_response.status_code == 200:
                related_memories = archivist_response.json()
                print(f"Retrieved {len(related_memories)} related memories from Archivist")
                
                # Add the related memories to the analysis
                analysis += f"n\nRelated Memories:\n"
                for memory in related_memories:
                    analysis += f"- {memory.get('content', '')} (Relevance: {memory.get('relevance_score', 0):.2f})\n"
            else:
                print(f"Failed to retrieve memories from Archivist: {archivist_response.status_code}")
                
        except Exception as e:
            print(f"Error querying Archivist for memories: {e}")
        
        return analysis


    async def _route_prompt(self, prompt: str) -> str:
        """
        Routes a prompt based on the decision tree in the config.
        """
        prompt_lower = prompt.lower().strip()
        decision_tree = self.config.get('OrchestraAgent', {}).get('decision_tree', [])

        # Check for intents based on keywords
        for intent_data in decision_tree:
            if intent_data['intent'] == 'Default': # Skip default for now
                continue
            for keyword in intent_data.get('keywords', []):
                # Be more specific about web search vs. memory search
                if keyword.lower() in prompt_lower:
                    # Special handling for "search" and "find" keywords to distinguish between web search and memory search
                    if intent_data['intent'] == 'Memory Retrieval' and ('search' in keyword.lower() or 'find' in keyword.lower()):
                        # Check if this is actually a web search request
                        if any(web_keyword in prompt_lower for web_keyword in ['web', 'online', 'internet', 'tavily', 'google']):
                            # Skip memory retrieval and continue to find web search
                            continue
                        else:
                            # This is a memory search request
                            print(f"Routing based on keyword: '{keyword}' -> {intent_data['intent']}")
                            return intent_data['intent']
                    else:
                        # The new config has a list of tools, not a single agent per intent
                        # For now, we'll just return the intent name
                        print(f"Routing based on keyword: '{keyword}' -> {intent_data['intent']}")
                        return intent_data['intent']

        # If nothing matches, use the default agent.
        print(f"No specific intent found. Routing to default agent: ConversationalAgent")
        return "ConversationalAgent"


    def _extract_keywords(self, prompt: str) -> List[str]:
        """
        Extracts keywords from a prompt.
        """
        stop_words = set(["a", "an", "the", "in", "on", "at", "for", "to", "of", "with", "by", 
                         "is", "was", "were", "are", "be", "been", "have", "has", "had", "do", 
                         "does", "did", "will", "would", "could", "should", "may", "might", "must", 
                         "can", "this", "that", "these", "those", "i", "you", "he", "she", "it", 
                         "we", "they", "what", "who", "when", "where", "why", "how"])
        words = prompt.lower().split()
        keywords = [word for word in words if word not in stop_words]
        return keywords


    async def _get_context(self, prompt: str) -> str:
        """
        Fetches context from the Archivist and stores it in the cache.
        """
        print("Fetching context from Archivist...")
        keywords = self._extract_keywords(prompt)
        context_response = await self.archivist_client.get_context(prompt, keywords)
        if context_response:
            # For simplicity, we'll just use the first context item.
            # A more advanced implementation could synthesize multiple contexts.
            context = context_response[0].get('context', '')
            self.cache_manager.store(f"{self.session_id}:last_context", context)
            return context
        return ""


    async def _handle_cache_query(self, prompt: str) -> str:
        """
        Handles queries related to the cache manager.
        """
        print("Handling cache query...")
        stats = self.cache_manager.get_statistics()
        # A more sophisticated implementation would use an LLM to generate a natural language response.
        # For now, we'll return a formatted string.
        response = f"Cache Statistics:\n- Hits: {stats.get('hits')}\n- Misses: {stats.get('misses')}\n- Total Requests: {stats.get('total_requests')}\n- Hit Rate: {stats.get('hit_rate'):.2%}"

        # You could also add logic to retrieve and show recent cache entries.
        return response


    async def _handle_filesystem_request(self, prompt: str) -> str:
        """
        Handle filesystem requests by discovering and calling appropriate UTCP tools.
        """
        try:
            print(f"Handling filesystem request: {prompt}")
            
            # Try to discover filesystem tools
            fs_tools = await self.utcp_client.discover_tools_by_category('filesystem')
            
            if not fs_tools:
                # If no filesystem category tools found, try to find tools with filesystem-related names
                all_tools = await self.utcp_client.list_all_tools()
                fs_tools = [tool for tool in all_tools if 
                           'file' in tool.id.lower() or 'dir' in tool.id.lower() or 
                           'ls' in tool.id.lower() or 'system' in tool.id.lower()]
            
            if fs_tools:
                # For directory listing specifically
                if any(keyword in prompt.lower() for keyword in ['list', 'directory', 'dir', 'ls', 'contents']):
                    for tool in fs_tools:
                        # Look for a tool that might list directories
                        if 'list' in tool.name.lower() or 'dir' in tool.id.lower() or 'ls' in tool.id.lower():
                            try:
                                result = await self.utcp_client.call_tool(tool.id, path=".")
                                return f"Directory contents: {result}"
                            except Exception as e:
                                print(f"Failed to call {tool.id}: {e}")
                    
                    # If no specific listing tool was found/called, return available tools
                    tool_names = [f"{tool.name} ({tool.id})" for tool in fs_tools]
                    return f"Available filesystem tools: {', '.join(tool_names)}"
                # For reading files specifically
                elif any(keyword in prompt.lower() for keyword in ['read', 'show the contents of', 'what is in']):
                    for tool in fs_tools:
                        # Look for a tool that might read files
                        if 'read' in tool.name.lower() or 'file' in tool.id.lower():
                            # Try to extract the filename from the prompt
                            import re
                            # Simple regex to find filenames with common extensions
                            filename_match = re.search(r'(\w+\.(?:txt|md|py|js|html|css|json|yaml|yml|xml|csv))', prompt.lower())
                            if filename_match:
                                filename = filename_match.group(1)
                                try:
                                    result = await self.utcp_client.call_tool(tool.id, file_path=filename)
                                    if isinstance(result, dict) and result.get('success'):
                                        return f"Contents of {filename}: {result.get('content', 'No content found')}"
                                    else:
                                        return f"Error reading {filename}: {result.get('error', 'Unknown error')}"
                                except Exception as e:
                                    print(f"Failed to call {tool.id}: {e}")
                                    return f"Failed to read {filename}: {str(e)}"
                    
                    # If no specific file reading tool was found/called, return available tools
                    tool_names = [f"{tool.name} ({tool.id})" for tool in fs_tools]
                    return f"Available filesystem tools: {', '.join(tool_names)}"
                else:
                    # For other filesystem operations, return available tools
                    tool_names = [f"{tool.name} ({tool.id})" for tool in fs_tools]
                    return f"Available filesystem tools: {', '.join(tool_names)}"
            else:
                return "No filesystem tools are currently available."
        except Exception as e:
            print(f"Error handling filesystem request: {e}")
            return f"Error handling filesystem request: {str(e)}"


    async def _handle_web_search_request(self, prompt: str) -> str:
        """
        Handle web search requests by discovering and calling appropriate UTCP tools.
        """
        try:
            print(f"Handling web search request: {prompt}")
            
            # Try to discover web search tools
            web_tools = await self.utcp_client.discover_tools_by_category('web')
            
            if not web_tools:
                # If no web category tools found, try to find tools with web-related names
                all_tools = await self.utcp_client.list_all_tools()
                web_tools = [tool for tool in all_tools if 
                           'web' in tool.id.lower() or 'search' in tool.id.lower() or 
                           'tavily' in tool.id.lower()]
            
            if web_tools:
                # For search queries
                if any(keyword in prompt.lower() for keyword in ['search', 'find', 'web', 'online']):
                    for tool in web_tools:
                        # Look for a tool that might perform web searches
                        if 'search' in tool.name.lower() or 'web' in tool.id.lower() or 'tavily' in tool.id.lower():
                            try:
                                # Extract the search query from the prompt
                                # Simple approach: use the whole prompt as the query
                                query = prompt
                                result = await self.utcp_client.call_tool(tool.id, query=query)
                                if isinstance(result, dict) and result.get('success'):
                                    return f"Search results: {result.get('result', 'No results found')}"
                                else:
                                    return f"Error performing search: {result.get('error', 'Unknown error')}"
                            except Exception as e:
                                print(f"Failed to call {tool.id}: {e}")
                                return f"Failed to perform search: {str(e)}"
                    
                    # If no specific search tool was found/called, return available tools
                    tool_names = [f"{tool.name} ({tool.id})" for tool in web_tools]
                    return f"Available web search tools: {', '.join(tool_names)}"
                else:
                    # For other web operations, return available tools
                    tool_names = [f"{tool.name} ({tool.id})" for tool in web_tools]
                    return f"Available web search tools: {', '.join(tool_names)}"
            else:
                return "No web search tools are currently available."
        except Exception as e:
            print(f"Error handling web search request: {e}")
            return f"Error handling web search request: {str(e)}"


    async def process_prompt(self, prompt: str) -> str:
        """
        Processes the prompt with comprehensive error logging and restored thinking logic.
        """
        print(f"Orchestrator processing prompt: '{prompt[:100]}...'")

        try:
            context = await self._get_context(prompt)
            if context:
                prompt_with_context = f"Context: {context}\n\nUser prompt: {prompt}"
            else:
                prompt_with_context = prompt

            target_agent_name = await self._route_prompt(prompt)
            print(f"Routing to: {target_agent_name}")

            if target_agent_name == "ConversationalAgent":
                response = await self.conversational_agent.respond(prompt_with_context)
                self.cache_manager.store(f"{self.session_id}:last_prompt", prompt)
                self.cache_manager.store(f"{self.session_id}:last_response", response)
                return response

            elif target_agent_name == "Complex Reasoning":
                analysis_id = str(uuid.uuid4())
                asyncio.create_task(self._run_complex_reasoning(prompt, prompt_with_context, analysis_id))
                return f"I've started analyzing your request. This may take a moment. Your analysis ID is {analysis_id}."

            elif target_agent_name == "DistillerAgent":
                return await self.distiller_agent.respond(prompt)

            elif target_agent_name == "WebSearchAgent":
                return await self.web_search_agent.search(prompt)

            elif target_agent_name == "CacheManager":
                return await self._handle_cache_query(prompt)

            # New handlers for UTCP-based agents
            elif target_agent_name == "File/Directory Access":
                return await self._handle_filesystem_request(prompt)

            elif target_agent_name == "Web Search":
                return await self._handle_web_search_request(prompt)

            else:
                return f"Query received. Routed to {target_agent_name}. This agent is not yet fully integrated."

        except Exception as e:
            print(f"n--- [!!!] ECE INTERNAL ERROR ---")
            print(f"Error occurred while processing prompt: '{prompt[:100]}...' ")
            traceback.print_exc()
            print(f"--- [!!!] END OF ERROR ---")
            raise e


    async def _run_complex_reasoning(self, original_prompt: str, prompt_with_context: str, analysis_id: str):
        perspectives_iterator = self._execute_parallel_thinking(prompt_with_context)
        final_response = await self._synthesize_parallel_response(original_prompt, perspectives_iterator)
        self.cache_manager.store(f"analysis:{analysis_id}", final_response)


    async def get_analysis_result(self, analysis_id: str) -> Optional[str]:
        return self.cache_manager.retrieve(f"analysis:{analysis_id}")


    async def _execute_parallel_thinking(self, prompt: str):
        print("Executing parallel thinking...")
        tasks = [asyncio.create_task(thinker.think(prompt)) for thinker in self.thinkers]
        
        for future in asyncio.as_completed(tasks):
            try:
                perspective = await future
                logging.info(f"Received perspective: {perspective}")
                yield perspective
            except Exception as e:
                # Find the thinker that caused the exception
                for i, task in enumerate(tasks):
                    if task == future:
                        thinker_name = self.thinkers[i].name
                        print(f"Error getting perspective from {thinker_name} Thinker: {e}")
                        yield f"<poml><perspective thinker='{thinker_name}'><analysis>Error: Could not generate perspective.</analysis></perspective></poml>"
                        break


    async def _synthesize_parallel_response(self, prompt: str, parallel_results: typing.AsyncIterator[str]) -> str:
        """
        This now constructs a final prompt and calls the SynthesisThinker.
        """
        print("Synthesizing parallel responses with a final LLM call...")

        synthesis_prompt = f"""Synthesize the following diverse perspectives into a single, final analysis. The original user query was: '{prompt}'.

--- Perspectives ---
"""
        async for perspective_poml in parallel_results:
            try:
                root = ET.fromstring(perspective_poml)
                thinker_name = root.find('.//perspective').get('thinker', 'Unknown')
                analysis = root.find('.//analysis')
                if analysis is not None and analysis.text:
                    synthesis_prompt += f"n* {thinker_name}'s View: {analysis.text.strip()}"
            except ET.ParseError:
                continue # Skip unparseable perspectives

        logging.info(f"Synthesis prompt: {synthesis_prompt}")
        final_answer = await self.synthesis_thinker.think(synthesis_prompt)
        logging.info(f"Final answer: {final_answer}")
        return final_answer


    async def _register_orchestrator_tools(self):
        """Register Orchestrator tools with the UTCP Registry."""
        try:
            # Register orchestrator.process_prompt tool
            process_prompt_tool = ToolDefinition(
                id="orchestrator.process_prompt",
                name="Process Prompt",
                description="Process a user prompt using the Orchestrator",
                category="processing",
                parameters={
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "The user prompt to process"
                        }
                    },
                    "required": ["prompt"]
                },
                returns={
                    "type": "object",
                    "properties": {
                        "response": {
                            "type": "string",
                            "description": "The processed response"
                        }
                    }
                },
                endpoint=f"http://orchestrator:8000/process_prompt",
                version="1.0.0",
                agent="Orchestrator"
            )
            
            success = await self.utcp_client.register_tool(process_prompt_tool)
            if success:
                print("✅ Registered orchestrator.process_prompt tool with UTCP Registry")
            else:
                print("❌ Failed to register orchestrator.process_prompt tool with UTCP Registry")
                
            # Register orchestrator.get_analysis_result tool
            get_analysis_result_tool = ToolDefinition(
                id="orchestrator.get_analysis_result",
                name="Get Analysis Result",
                description="Retrieve the result of a complex reasoning analysis",
                category="retrieval",
                parameters={
                    "type": "object",
                    "properties": {
                        "analysis_id": {
                            "type": "string",
                            "description": "The ID of the analysis to retrieve"
                        }
                    },
                    "required": ["analysis_id"]
                },
                returns={
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "description": "Status of the analysis (pending or complete)"
                        },
                        "response": {
                            "type": "string",
                            "description": "The analysis response if complete"
                        }
                    }
                },
                endpoint=f"http://orchestrator:8000/get_analysis_result",
                version="1.0.0",
                agent="Orchestrator"
            )
            
            success = await self.utcp_client.register_tool(get_analysis_result_tool)
            if success:
                print("✅ Registered orchestrator.get_analysis_result tool with UTCP Registry")
            else:
                print("❌ Failed to register orchestrator.get_analysis_result tool with UTCP Registry")
                
        except Exception as e:
            print(f"❌ Error registering Orchestrator tools with UTCP Registry: {e}")


    def _load_poml_persona(self):
        """Load the POML persona file and integrate it into the agent's context."""
        try:
            poml_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'poml', 'orchestrator.poml')
            with open(poml_path, 'r') as f:
                self.poml_content = f.read()
            print("POML persona loaded successfully.")
        except FileNotFoundError:
            print("POML file not found. Using default persona.")
            self.poml_content = "<poml><identity><name>Default Orchestrator</name></identity></poml>"
        except Exception as e:
            print(f"Error loading POML persona: {e}")
            self.poml_content = "<poml><identity><name>Default Orchestrator</name></identity></poml>"


    async def _load_and_integrate_poml_persona(self):
        """
        Integrate the POML persona into the current processing context.
        This method should be called before processing each user prompt.
        """
        # For now, we'll just print the POML content to show it's being loaded
        # In a real implementation, this would be used to influence the agent's behavior
        print(f"Loading POML persona: {self.poml_content[:200]}...")