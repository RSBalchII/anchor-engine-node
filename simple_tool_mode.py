"""
Simple Tool Mode for Small Models

Problem: Small models (<14B) struggle with complex tool calling formats and prompts.
Solution: Pattern-based direct execution - bypass LLM for obvious tool calls.

Design:
1. User says "list files" → We IMMEDIATELY call filesystem_read(".")
2. User says "weather in Paris" → We IMMEDIATELY call web_search("weather Paris")
3. NO complex prompting, NO asking model to format tool calls
4. Model only sees the RESULT and formats it nicely

This is like having a smart shell that understands natural language.
"""
import re
import os
import logging
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from tool_safety import get_safety_manager
import json

logger = logging.getLogger(__name__)


@dataclass
class SimpleToolIntent:
    """Simplified tool intent (no complex formatting needed)"""
    intent_type: str
    target: Any  # Path/query/command or dict for complex intents
    confidence: float
    raw_query: str


class SimpleToolMode:
    """
    Pattern-based tool execution for small models.
    
    Instead of asking the model to output TOOL_CALL: format(params),
    we detect patterns and execute directly, then give results to model.
    """
    
    def __init__(self):
        # HIGH-CONFIDENCE patterns (auto-execute without asking model)
        self.patterns = {
            "list_files": [
                (r'^(list|show|display|ls|dir)\s*(files?|directory|folder|contents?)?\s*(in\s+)?(.*)$', 4),
                (r'^what\s*(files?|is)\s*(are\s*)?(in|here|there)\s*(.*)$', 4),
                (r'^show\s+me\s+(the\s+)?files?\s*(in\s+)?(.*)$', 3),
                # More flexible patterns that allow extra words
                (r'.*\b(list|show|display)\s+(?:the\s+)?files?\s+(?:and\s+folders?\s+)?(?:in\s+(?:the\s+)?)?(.*)$', 2),
                (r'.*\b(list|show|display)\s+(?:all\s+)?(?:the\s+)?(?:files?\s+and\s+)?folders?\s+(?:in\s+(?:the\s+)?)?(.*)$', 2),
            ],
            "current_directory": [
                # Queries about current directory
                (r'.*what\s+(?:directory|folder|dir)\s+(?:are\s+we\s+in|am\s+i\s+in).*', 0),
                (r'.*(?:where|which)\s+(?:directory|folder|dir).*', 0),
                (r'.*current\s+(?:directory|folder|dir|path|location).*', 0),
                (r'.*pwd.*', 0),  # Unix command
            ],
            "read_file": [
                (r'^(read|cat|show|display|open)\s+(file\s+)?["\']?([^"\']+)["\']?$', 3),
                (r'^what\s*(is|\'s)\s*in\s+["\']?([^"\']+)["\']?\??$', 2),
            ],
            "search_web": [
                (r'^(search|google|find|lookup)\s+(for\s+)?(.+)$', 3),
                (r'^what\s*(is|\'s|are)\s+(.+)\??$', 2),
                (r'^(weather|temperature)\s+(in|for)\s+(.+)$', 3),
                (r'^(how|why|when|where)\s+(.+)\??$', 2),
                # More flexible patterns for conversational queries
                (r'.*\b(find\s+out|search\s+for|look\s+up|tell\s+me|show\s+me)\s+(?:about\s+)?(?:the\s+)?(.+)', 2),
                (r'.*\b(?:what\s+(?:is|\'s|are)|how\s+(?:do|does|is)|where\s+(?:is|are|can))\s+(.+)', 1),
                (r'.*\b(weather|temperature|forecast)\s+(?:in|for|at)\s+(.+)', 2),
            ],
            "run_command": [
                (r'^run\s+(command\s+)?["\']?(.+)["\']?$', 2),
                (r'^execute\s+["\']?(.+)["\']?$', 1),
            ],
            "write_file": [
                (r'^(create|make|write|save)\s+(file\s+)?["\']?([^"\']+)["\']?\s*(with|containing|that\s+has)\s+(.+)$', 0),
                (r'^(append)\s+(to\s+)?["\']?([^"\']+)["\']?\s*(with|:)?\s+(.+)$', 0),
            ],
            "code_search": [
                (r'^(search\s+code|find)\s+(for\s+)?(.+?)\s+(in|under)\s+(.+)$', 0),
                (r'^search\s+code\s+for\s+(.+)$', 1),
                (r'^(search\s+code|find)\s+(?:for\s+)?(.+?)\s+(?:in|under)\s+(.+?)\s+with\s+glob\s+(.+?)\s+and\s+context\s+(\d+)$', 0),
            ],
            "code_grep": [
                (r'^grep\s+(?:for\s+)?(.+?)\s+(?:in|under)\s+(.+?)(.*)$', 0),
            ],
        }
    
    def detect_intent(self, query: str) -> Optional[SimpleToolIntent]:
        """
        Detect tool intent from natural language query.
        
        Args:
            query: User's query
            
        Returns:
            SimpleToolIntent or None if no pattern matches
        """
        query_clean = query.strip()
        
        priority = [
            "write_file",
            "code_grep",
            "code_search",
            "list_files",
            "current_directory",
            "read_file",
            "run_command",
            "search_web",
        ]
        for intent_type in priority:
            pattern_list = self.patterns.get(intent_type, [])
            for pattern, target_group in pattern_list:
                match = re.match(pattern, query_clean, re.IGNORECASE)
                if match:
                    # Special handling for complex intents
                    if intent_type in ["write_file", "code_search", "code_grep"]:
                        groups = match.groups()
                        target = self._extract_complex_target(intent_type, groups)
                    else:
                        target = match.group(target_group).strip() if target_group <= len(match.groups()) else ""
                    
                    # Post-process target based on intent
                    target = self._clean_target(intent_type, target)
                    groups = match.groups()
                    logger.info(
                        {
                            "event": "simple_intent_match",
                            "intent": intent_type,
                            "target": target,
                            "raw_query": query,
                            "groups": len(groups),
                        }
                    )
                    
                    return SimpleToolIntent(
                        intent_type=intent_type,
                        target=target,
                        confidence=0.9,
                        raw_query=query
                    )
        
        return None

    def _extract_complex_target(self, intent_type: str, groups: tuple) -> Any:
        if intent_type == "write_file":
            # Patterns produce groups with filename and content
            if len(groups) >= 5:
                # create|write … file <name> … with <content>
                filename = groups[2]
                content = groups[4]
                return {"path": filename.strip().strip('"\''), "content": content.strip(), "append": False}
            if len(groups) >= 5 and groups[0] == "append":
                filename = groups[2]
                content = groups[4]
                return {"path": filename.strip().strip('"\''), "content": content.strip(), "append": True}
        elif intent_type == "code_search":
            # grep/search code/find for <query> in <root>
            if len(groups) == 5:
                return {"query": groups[2].strip(), "root": groups[4].strip(), "regex": False}
            if len(groups) == 4:
                return {"query": groups[1].strip(), "root": groups[2].strip(), "glob": groups[3].strip(), "context": 2, "regex": False}
            if len(groups) == 5:
                return {"query": groups[1].strip(), "root": groups[2].strip(), "glob": groups[3].strip(), "context": int(groups[4]), "regex": False}
            if len(groups) >= 2:
                return {"query": groups[1].strip(), "root": ".", "regex": False}
        elif intent_type == "code_grep":
            q = {"query": groups[0].strip(), "root": groups[1].strip(), "regex": False}
            tail = groups[2] if len(groups) >= 3 else ""
            if tail:
                m_glob = re.search(r'with\s+glob\s+([^\s]+)', tail, re.IGNORECASE)
                if m_glob:
                    q["glob"] = m_glob.group(1).strip()
                m_ctx = re.search(r'context\s+(\d+)', tail, re.IGNORECASE)
                if m_ctx:
                    try:
                        q["context"] = int(m_ctx.group(1))
                    except:
                        q["context"] = 2
                m_ex = re.search(r'exclude\s+([^\s]+)', tail, re.IGNORECASE)
                if m_ex:
                    q["exclude_globs"] = [s.strip() for s in m_ex.group(1).split(',')]
            return q
        return {}
    
    def _clean_target(self, intent_type: str, target: Any) -> Any:
        """Clean and normalize target based on intent type"""
        if isinstance(target, dict):
            return target
        target = target.strip()
        
        if intent_type == "list_files":
            # Default to current directory if empty
            if not target or target in ["here", "there", "this"]:
                return "."
            
            # Remove common filler words
            target = re.sub(r'^(the|in|this|that|all|any)\s+', '', target, flags=re.IGNORECASE)
            
            # Extract path from "current directory" or similar phrases
            if "current" in target.lower() or "currenty" in target.lower():
                return "."
            
            # Extract actual path from "files and folders in <path>"
            path_match = re.search(r'(?:in|from)\s+(.+)$', target, re.IGNORECASE)
            if path_match:
                path = path_match.group(1).strip()
                # Clean up the path
                path = re.sub(r'^(the|this|that)\s+', '', path, flags=re.IGNORECASE)
                if path.lower() in ["current directory", "here", "there", "."]:
                    return "."
                return path or "."
            
            # If it looks like garbage from regex capture, default to current dir
            if any(word in target.lower() for word in ["files", "folders", "directory", "folder", "file"]):
                return "."
            
            return target or "."
        
        elif intent_type == "read_file":
            # Remove quotes
            target = target.strip('"\'')
            return target
        
        elif intent_type == "search_web":
            # Remove question words at start
            target = re.sub(r'^(what|how|why|when|where)\s+(is|are|was|were|\'s|about|the)\s+', '', target, flags=re.IGNORECASE)
            
            # Extract core query from conversational patterns
            # "could you find out what the weather in Bernalillo will be tomorrow" → "weather in Bernalillo tomorrow"
            target = re.sub(r'\b(will|would|could|should|can|may|might)\s+be\b', '', target, flags=re.IGNORECASE)
            target = re.sub(r'\b(is|are|was|were)\s+going\s+to\s+be\b', '', target, flags=re.IGNORECASE)
            target = re.sub(r'^(the|a|an)\s+', '', target, flags=re.IGNORECASE)
            
            # Remove trailing question mark
            target = target.rstrip('?')
            return target.strip()
        
        elif intent_type == "run_command":
            # Remove quotes
            target = target.strip('"\'')
            return target
        elif intent_type == "write_file":
            return target
        elif intent_type == "code_search":
            return target
        
        return target
    
    def map_to_tool_call(self, intent: SimpleToolIntent) -> Tuple[str, Dict[str, Any]]:
        """
        Map simple intent to actual MCP tool call.
        
        Args:
            intent: SimpleToolIntent
            
        Returns:
            (tool_name, parameters) tuple
        """
        if intent.intent_type == "list_files":
            return ("filesystem_read", {"path": intent.target})
        
        elif intent.intent_type == "current_directory":
            # Use shell command to get current directory
            return ("shell_execute", {"command": "pwd" if os.name != 'nt' else "cd"})
        
        elif intent.intent_type == "read_file":
            return ("filesystem_read", {"path": intent.target})
        
        elif intent.intent_type == "search_web":
            return ("web_search", {"query": intent.target, "max_results": 5})
        
        elif intent.intent_type == "run_command":
            return ("shell_execute", {"command": intent.target})
        elif intent.intent_type == "write_file":
            params = intent.target if isinstance(intent.target, dict) else {"path": str(intent.target), "content": ""}
            return ("filesystem_write", params)
        elif intent.intent_type == "code_search":
            params = intent.target if isinstance(intent.target, dict) else {"query": str(intent.target), "root": "."}
            if "max_results" not in params:
                params["max_results"] = 20
            return ("code_search", params)
        elif intent.intent_type == "code_grep":
            params = intent.target if isinstance(intent.target, dict) else {"query": str(intent.target), "root": "."}
            if "max_results" not in params:
                params["max_results"] = 50
            if "context" not in params:
                params["context"] = 2
            return ("code_grep", params)
        
        raise ValueError(f"Unknown intent type: {intent.intent_type}")


class SimpleToolHandler:
    """
    Handler for simple tool mode execution.
    
    This is the magic: instead of asking the model to call tools,
    we detect patterns and execute tools FIRST, then give results
    to the model for natural language formatting.
    
    Usage:
        handler = SimpleToolHandler(mcp_client, llm_client)
        
        # Check if we should intercept
        if handler.can_handle_directly(user_query):
            response = await handler.handle_query(user_query)
            # Done! No complex prompting needed.
        else:
            # Fall back to normal LLM flow
    """
    
    def __init__(self, mcp_client, llm_client):
        self.mcp_client = mcp_client
        self.llm_client = llm_client
        self.mode = SimpleToolMode()
        self._fs_cache = []  # list[(key, value)] LRU
        self._web_cache = []
        self._fs_cache_size = 64
        self._web_cache_size = 64
        self._approval_cache = set()
    
    def can_handle_directly(self, query: str) -> bool:
        """Check if we can handle this query with direct tool execution"""
        intent = self.mode.detect_intent(query) or self._heuristic_intent(query)
        return intent is not None
    
    async def handle_query(self, query: str, session_id: str = None) -> str:
        """
        Handle query with direct tool execution.
        
        Flow:
        1. Detect intent
        2. Execute tool IMMEDIATELY (no LLM prompt)
        3. Give result to LLM with SIMPLE formatting prompt
        4. Return formatted response
        
        Args:
            query: User's natural language query
            session_id: Optional session ID for context
            
        Returns:
            Formatted response
        """
        # Step 1: Detect intent
        intent = self.mode.detect_intent(query) or self._heuristic_intent(query)
        
        if not intent:
            return None  # Fall back to normal flow
        
        logger.info(f"🚀 Simple mode: {intent.intent_type} → {intent.target}")
        
        # Step 2: Execute tool IMMEDIATELY
        try:
            tool_name, params = self.mode.map_to_tool_call(intent)
            
            logger.info(f"🔧 Direct execution: {tool_name}({params})")
            # LRU caches for common tools
            result = None
            if tool_name == "filesystem_read":
                key = f"fs::{params.get('path','')}"
                cached = self._lru_get(self._fs_cache, key)
                if cached is not None:
                    result = {"tool": tool_name, "status": "success", "result": cached}
            elif tool_name == "web_search":
                key = f"web::{params.get('query','')}::{params.get('max_results',5)}"
                cached = self._lru_get(self._web_cache, key)
                if cached is not None:
                    result = {"tool": tool_name, "status": "success", "result": cached}
            
            if result is None:
                safety = get_safety_manager()
                auto = safety.should_auto_execute(tool_name, params)
                cache_key = f"{tool_name}:{json.dumps(params, sort_keys=True)}"
                if not auto and cache_key not in self._approval_cache:
                    prompt = safety.get_confirmation_prompt(tool_name, params)
                    resp = input(prompt).strip().lower()
                    if resp not in ["y", "yes"]:
                        return "Tool execution denied"
                    self._approval_cache.add(cache_key)
                result = await self.mcp_client.call_tool(tool_name, **params)
                # Cache successful results
                if isinstance(result, dict) and result.get("status") == "success":
                    payload = result.get("result", result)
                    if tool_name == "filesystem_read":
                        self._lru_put(self._fs_cache, key, payload, self._fs_cache_size)
                    elif tool_name == "web_search":
                        self._lru_put(self._web_cache, key, payload, self._web_cache_size)
            
            # Step 3: Give result to LLM with MINIMAL prompt
            formatted = await self._format_with_llm(intent, result, query)
            
            logger.info(
                {
                    "event": "simple_intent_result",
                    "intent": intent.intent_type,
                    "tool": tool_name,
                    "params": params,
                    "result_keys": list(result.keys()) if isinstance(result, dict) else None,
                }
            )
            return formatted
            
        except Exception as e:
            logger.error(f"Simple mode execution failed: {e}")
            # Return error formatted nicely
            return await self._format_error(intent, str(e))

    def _heuristic_intent(self, query: str) -> Optional[SimpleToolIntent]:
        q = query.strip()
        lower = q.lower()
        # Obvious file reads from extension
        for ext in [".py", ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg"]:
            if ext in lower and ("read" in lower or "show" in lower or "open" in lower or lower.endswith(ext)):
                return SimpleToolIntent("read_file", q, 0.7, query)
        # Code search
        if any(k in lower for k in ["grep", "search code", "find in code", "where is"]):
            return SimpleToolIntent("code_search", {"query": q, "root": ".", "regex": False}, 0.6, query)
        # Run command heuristics
        shell_starters = ["git ", "npm ", "node ", "python ", "pip ", "ls ", "dir ", "echo ", "type "]
        if any(lower.startswith(s) for s in shell_starters):
            return SimpleToolIntent("run_command", q, 0.6, query)
        # Write file hints
        if any(k in lower for k in ["create file", "write file", "save file", "append to"]):
            # attempt to extract: filename after keyword
            m = re.search(r'(?:create|write|save)\s+file\s+["\']?([^"\']+)["\']?', lower)
            if m:
                return SimpleToolIntent("write_file", {"path": m.group(1), "content": "", "append": False}, 0.5, query)
        # Web search fallback
        if lower.endswith("?") or any(k in lower for k in ["what is", "how do", "weather", "news"]):
            return SimpleToolIntent("search_web", q, 0.5, query)
        return None

    def _lru_get(self, cache, key):
        for i, (k, v) in enumerate(cache):
            if k == key:
                cache.insert(0, cache.pop(i))
                return v
        return None

    def _lru_put(self, cache, key, value, max_size):
        cache.insert(0, (key, value))
        i = 1
        while i < len(cache):
            if cache[i][0] == key:
                cache.pop(i)
            else:
                i += 1
        while len(cache) > max_size:
            cache.pop()
    
    async def _format_with_llm(self, intent: SimpleToolIntent, result: Any, original_query: str) -> str:
        """
        Use LLM to format the tool result nicely.
        
        This is a MUCH simpler task than "decide what tool to call and format it correctly".
        Even a 4B model can format results well.
        """
        # Build simple formatting prompt
        if intent.intent_type in ["list_files", "read_file"]:
            if isinstance(result, dict) and "entries" in result:
                # Directory listing
                files = result["entries"]
                files_list = "\n".join([f"  {f}" for f in files[:30]])
                
                prompt = f"""The user asked: "{original_query}"

I checked and found these files:
{files_list}

Please format this as a natural, helpful response. Be concise."""
            
            elif isinstance(result, dict) and "content" in result:
                lines = result["content"].splitlines()
                preview_lines = "\n".join(lines[:30])
                prompt = f"""The user asked: "{original_query}"

Here are the first lines:
{preview_lines}

Please format this as a natural, helpful response. If it's code, mention what it is."""
            
            else:
                prompt = f"""The user asked: "{original_query}"

Result: {result}

Please format this as a natural response."""
        
        elif intent.intent_type == "search_web":
            if isinstance(result, dict) and "results" in result:
                results = result["results"][:3]
                results_text = "\n\n".join([
                    f"{i+1}. {r.get('title', 'Result')}\n   {r.get('snippet', 'No description')}"
                    for i, r in enumerate(results)
                ])
                
                prompt = f"""The user asked: "{original_query}"

I found these search results:
{results_text}

Please summarize this information naturally and helpfully. Be concise."""
            else:
                prompt = f"""The user asked: "{original_query}"

Search result: {result}

Please format this as a natural response."""
        
        elif intent.intent_type == "run_command":
            if isinstance(result, dict) and "output" in result:
                output = result["output"][:500]
                
                prompt = f"""The user asked to run: "{intent.target}"

Command output:
{output}

Please format this as a natural response, explaining what the command did."""
            else:
                prompt = f"""The user asked: "{original_query}"

Command result: {result}

Please format this as a natural response."""
        
        else:
            prompt = f"""The user asked: "{original_query}"

Result: {result}

Please format this as a natural, helpful response."""
        
        # Generate with simple prompt
        try:
            formatted = await self.llm_client.generate(
                prompt=prompt,
                system_prompt="You are a helpful assistant. Format the provided information in a clear, natural way. Be concise and direct."
            )
            return formatted.strip()
        except Exception as e:
            logger.error(f"LLM formatting failed: {e}")
            # Fallback to direct formatting
            return self._format_directly(intent, result)
    
    def _format_directly(self, intent: SimpleToolIntent, result: Any) -> str:
        """Fallback: format result without LLM"""
        if intent.intent_type in ["list_files", "read_file"]:
            # Check for MCP server response wrapper
            if isinstance(result, dict):
                if "result" in result and isinstance(result["result"], dict):
                    # Unwrap MCP response
                    result = result["result"]
                
                if "entries" in result:
                    # Directory listing
                    files = result["entries"]
                    formatted = "\n".join([f"  • {f}" for f in files[:20]])
                    return f"Files in {intent.target}:\n{formatted}"
                elif "content" in result:
                    lines = result["content"].splitlines()
                    preview = "\n".join(lines[:20])
                    return f"Content preview of {intent.target}:\n\n{preview}"
        
        elif intent.intent_type == "search_web":
            # Check for MCP wrapper
            if isinstance(result, dict):
                if "result" in result and isinstance(result["result"], dict):
                    result = result["result"]
                
                if "results" in result:
                    results = result["results"][:3]
                    formatted = "\n\n".join([
                        f"**{r.get('title', 'Result')}**\n{r.get('snippet', 'No description')}"
                        for r in results
                    ])
                    return f"Search results for '{intent.target}':\n\n{formatted}"
                else:
                    # DuckDuckGo stub response
                    return f"Web search for '{intent.target}' completed.\n{result.get('message', str(result))}"
        
        elif intent.intent_type == "run_command":
            if isinstance(result, dict):
                if "result" in result and isinstance(result["result"], dict):
                    result = result["result"]
                
                if "output" in result:
                    output = result["output"][:500]
                    return f"Command output:\n{output}"
        
        elif intent.intent_type == "current_directory":
            # Current directory query
            if isinstance(result, dict):
                if "result" in result and isinstance(result["result"], dict):
                    result = result["result"]
                
                if "output" in result:
                    return f"Current directory: {result['output'].strip()}"
        
        # Default: Just stringify
        return str(result)
    
    async def _format_error(self, intent: SimpleToolIntent, error: str) -> str:
        """Format error message"""
        return f"I tried to {intent.intent_type.replace('_', ' ')} but encountered an error: {error}"


# Test suite
if __name__ == "__main__":
    import asyncio
    
    # Test pattern matching
    mode = SimpleToolMode()
    
    test_queries = [
        "list files",
        "list files in current directory",
        "show me the files here",
        "what files are in .",
        "ls -la",
        "dir",
        "read file test.txt",
        "show me config.yaml",
        "what's in README.md?",
        "search for python async tutorial",
        "what is the weather in Paris?",
        "how do I use async in Python?",
        "run command ls -la",
        "execute pwd",
    ]
    
    print("=" * 60)
    print("Simple Tool Mode - Pattern Test")
    print("=" * 60)
    
    for query in test_queries:
        intent = mode.detect_intent(query)
        
        print(f"\nQuery: {query}")
        if intent:
            print(f"  ✓ Intent: {intent.intent_type}")
            print(f"  ✓ Target: '{intent.target}'")
            tool_name, params = mode.map_to_tool_call(intent)
            print(f"  ✓ Tool: {tool_name}({params})")
        else:
            print(f"  ✗ No pattern matched")
