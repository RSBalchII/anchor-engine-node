#!/usr/bin/env python3
"""
Implementation Fix for ECE Context Flow

This script modifies the ECE implementation to properly coordinate the 
context retrieval flow between Orchestrator, Archivist, and QLearning Agent.
"""

import os
import sys
from pathlib import Path
import shutil

# Use the correct project root path
project_root = Path("/home/rsbiiw/Gemini/ECE/External-Context-Engine-ECE")
sys.path.insert(0, str(project_root))

def backup_file(file_path):
    """Create a backup of a file before modifying it."""
    backup_path = f"{file_path}.backup"
    if os.path.exists(file_path):
        shutil.copy2(file_path, backup_path)
        print(f"✅ Backed up {file_path} to {backup_path}")
    return backup_path

def fix_orchestrator_agent():
    """Fix the Orchestrator agent to properly coordinate context flow."""
    orchestrator_path = project_root / "ece" / "agents" / "tier1" / "orchestrator" / "orchestrator_agent.py"
    
    if not orchestrator_path.exists():
        print(f"❌ Orchestrator agent not found at {orchestrator_path}")
        return False
        
    # Backup the original file
    backup_file(str(orchestrator_path))
    
    # Read the current file
    with open(orchestrator_path, 'r') as f:
        content = f.read()
        
    # Add the enhanced context methods to the OrchestratorAgent class
    # Find a good place to insert our new methods - after the class definition
    if "class OrchestratorAgent:" in content:
        # Define our new methods
        new_methods = '''
    async def _get_enhanced_context(self, prompt: str) -> str:
        """
        Enhanced context retrieval that coordinates with Archivist and QLearning Agent.
        """
        print("🔍 Fetching enhanced context from Archivist (coordinating with QLearning Agent)...")
        keywords = self._extract_keywords(prompt)
        
        # Create a more detailed request that includes the full prompt for better context
        context_request = {
            "query": prompt,
            "keywords": keywords,
            "max_tokens": 1000000,  # Allow up to 1M tokens as requested
            "session_id": self.session_id
        }
        
        try:
            # Request enhanced context from Archivist (which will coordinate with QLearning Agent)
            context_response = await self.archivist_client.get_enhanced_context(context_request)
            
            if context_response and isinstance(context_response, dict):
                # Extract the enhanced context from the response
                enhanced_context = context_response.get("enhanced_context", "")
                related_memories = context_response.get("related_memories", [])
                
                if enhanced_context:
                    # Store the enhanced context in the cache for other agents to access
                    context_key = f"{self.session_id}:enhanced_context"
                    self.cache_manager.store(context_key, enhanced_context)
                    print(f"✅ Enhanced context stored in cache with key: {context_key}")
                    
                    # Also store related memories if any
                    if related_memories:
                        memories_key = f"{self.session_id}:related_memories"
                        memories_str = "\n".join([mem.get("content", "") for mem in related_memories])
                        self.cache_manager.store(memories_key, memories_str)
                        print(f"✅ Related memories stored in cache with key: {memories_key}")
                    
                    return enhanced_context
                else:
                    print("⚠️ No enhanced context returned from Archivist")
            elif context_response:
                # Handle legacy string response
                context = str(context_response)
                context_key = f"{self.session_id}:legacy_context"
                self.cache_manager.store(context_key, context)
                print(f"✅ Legacy context stored in cache with key: {context_key}")
                return context
            else:
                print("❌ No context returned from Archivist")
                
        except Exception as e:
            print(f"❌ Error fetching enhanced context: {str(e)}")
            
        return ""

    async def _prepare_context_aware_prompt(self, original_prompt: str, enhanced_context: str = "") -> str:
        """
        Prepare a context-aware prompt by combining the enhanced context with the original prompt.
        """
        # Get the enhanced context from cache if not provided
        if not enhanced_context:
            context_key = f"{self.session_id}:enhanced_context"
            cached_context = self.cache_manager.retrieve(context_key)
            if cached_context:
                enhanced_context = cached_context.value
        
        if enhanced_context and enhanced_context.strip():
            # Create a context-aware prompt
            context_aware_prompt = f"""[ENHANCED CONTEXT FROM KNOWLEDGE GRAPH]
{enhanced_context}

[USER PROMPT]
{original_prompt}

Please consider the above context when responding to the user's prompt. The context contains relevant information 
that should inform your response. Read the context carefully before formulating your answer."""

            print("✅ Created context-aware prompt with enhanced context")
            return context_aware_prompt
        else:
            # Fallback to original prompt if no context available
            print("⚠️ No enhanced context found, using original prompt")
            return original_prompt

    async def process_prompt_with_context(self, prompt: str) -> str:
        """
        Processes the prompt with enhanced context awareness.
        """
        print(f"🧠 Orchestrator processing prompt with context: '{prompt[:100]}...'")
        
        try:
            # Step 1: Get enhanced context from Archivist (which coordinates with QLearning Agent)
            enhanced_context = await self._get_enhanced_context(prompt)
            
            # Step 2: Prepare context-aware prompt
            context_aware_prompt = await self._prepare_context_aware_prompt(prompt, enhanced_context)
            
            # Step 3: Route to appropriate agent
            target_agent_name = self._route_prompt(prompt)
            print(f"🔄 Routing to: {target_agent_name}")

            # Step 4: Process with the selected agent using context-aware prompt
            if target_agent_name == "ConversationalAgent":
                response = await self.conversational_agent.respond(context_aware_prompt)
                self.cache_manager.store(f"{self.session_id}:last_prompt", prompt)
                self.cache_manager.store(f"{self.session_id}:last_response", response)
                return response

            elif target_agent_name == "Complex Reasoning":
                analysis_id = str(uuid.uuid4())
                asyncio.create_task(self._run_complex_reasoning(prompt, context_aware_prompt, analysis_id))
                return f"I've started analyzing your request. This may take a moment. Your analysis ID is {analysis_id}."

            elif target_agent_name == "DistillerAgent":
                return await self.distiller_agent.respond(context_aware_prompt)

            elif target_agent_name == "WebSearchAgent":
                return await self.web_search_agent.search(context_aware_prompt)

            elif target_agent_name == "CacheManager":
                return await self._handle_cache_query(prompt)

            else:
                # For any other agent, ensure they have access to the full context
                context_info = ""
                if enhanced_context:
                    context_info = f"Context: {enhanced_context}\n\n"
                    
                agent_specific_prompt = f"{context_info}User prompt: {prompt}"
                return f"Query received. Routed to {target_agent_name}. This agent should read the full context before responding."

        except Exception as e:
            print(f"\n--- [!!!] ECE INTERNAL ERROR ---")
            print(f"Error occurred while processing prompt: '{prompt[:100]}...' ")
            import traceback
            traceback.print_exc()
            print(f"--- [!!!] END OF ERROR ---")
            raise e
'''
        
        # Insert the new methods into the class
        # Find the end of the OrchestratorAgent class and insert our methods before it
        lines = content.split('\n')
        new_lines = []
        
        # Look for the end of the OrchestratorAgent class
        i = 0
        while i < len(lines):
            line = lines[i]
            new_lines.append(line)
            
            # Look for the end of the OrchestratorAgent class
            if line.strip() == 'class OrchestratorAgent:' and i + 1 < len(lines):
                # Skip to the end of the class definition
                class_indent = None
                j = i + 1
                while j < len(lines):
                    next_line = lines[j]
                    # Check if this line starts a new class or function at class level
                    if next_line.startswith('class ') or (next_line.startswith('    def ') and not next_line.startswith('        ')):
                        # Insert our new methods before this line
                        # But only if we haven't already inserted them
                        if 'async def _get_enhanced_context' not in '\n'.join(new_lines):
                            # Add some indentation to our methods
                            indented_methods = '\n'.join(['    ' + line if line.strip() else line for line in new_methods.strip().split('\n')])
                            new_lines.append(indented_methods)
                        break
                    j += 1
                i = j
                continue
            i += 1
            
        # If we didn't find a place to insert, add at the end
        if 'async def _get_enhanced_context' not in '\n'.join(new_lines):
            # Add our methods at the end with proper indentation
            indented_methods = '\n'.join(['    ' + line if line.strip() else line for line in new_methods.strip().split('\n')])
            new_lines.append('')
            new_lines.append(indented_methods)
            
        # Write the updated content back to the file
        with open(orchestrator_path, 'w') as f:
            f.write('\n'.join(new_lines))
            
        print(f"✅ Updated Orchestrator agent at {orchestrator_path}")
        return True

def fix_archivist_client():
    """Fix the Archivist client to support enhanced context requests."""
    client_path = project_root / "ece" / "agents" / "tier1" / "orchestrator" / "archivist_client.py"
    
    if not client_path.exists():
        print(f"❌ Archivist client not found at {client_path}")
        return False
        
    # Backup the original file
    backup_file(str(client_path))
    
    # Read the current file
    with open(client_path, 'r') as f:
        content = f.read()
        
    # Add new method for enhanced context requests
    enhanced_method = '''
    async def get_enhanced_context(self, context_request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get enhanced context from the Archivist agent, which coordinates with the QLearning Agent.
        """
        try:
            response = await self.client.post(
                f"{self.base_url}/enhanced_context",
                json=context_request,
                timeout=60.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Archivist returned status {response.status_code}")
                return {}
        except Exception as e:
            print(f"Error calling Archivist for enhanced context: {str(e)}")
            return {}
'''
    
    # Add the new method to the class
    if 'class ArchivistClient:' in content:
        # Insert the new method before the last line (})
        lines = content.split('\n')
        # Find the line with the closing brace of the class
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == '}':
                # Insert the new method before the closing brace
                indented_method = '\n'.join(['    ' + line if line.strip() else line for line in enhanced_method.strip().split('\n')])
                lines.insert(i, '')
                lines.insert(i, '    ' + indented_method)
                lines.insert(i, '')
                break
        
        # Write the updated content back to the file
        with open(client_path, 'w') as f:
            f.write('\n'.join(lines))
            
        print(f"✅ Updated Archivist client at {client_path}")
        return True
        
    return False

def create_archivist_enhancement_plan():
    """Create a plan for enhancing the Archivist agent."""
    enhancement_plan = f"""
# Archivist Agent Enhancement Plan

## Current Issues Identified

1. The Archivist agent doesn't have an `/enhanced_context` endpoint to coordinate with the QLearning Agent
2. The QLearning Agent's context retrieval functionality is not being properly utilized
3. Context is not being properly appended to the Redis cache before passing to other agents
4. Agents are not reading the full context cache before responding

## Required Enhancements

### 1. Add `/enhanced_context` Endpoint to Archivist Agent

Add a new POST endpoint `/enhanced_context` that:
- Accepts a request with query, keywords, max_tokens, and session_id
- Coordinates with the QLearning Agent to find optimal paths
- Builds enhanced context from the paths
- Stores the context in Redis for other agents
- Returns the enhanced context and related memories

### 2. Enhance QLearning Agent Integration

Modify the QLearning Agent to:
- Properly retrieve and summarize context (up to 1M token limit)
- Improve path finding algorithms
- Add better reward mechanisms for context relevance

### 3. Update Context Cache Management

Enhance the CacheManager to:
- Better handle large context storage
- Implement token-aware context management
- Add context retrieval optimization

## Implementation Steps

1. Add the `/enhanced_context` endpoint to the Archivist agent
2. Implement coordination logic with QLearning Agent
3. Enhance context building and summarization
4. Update Redis storage for enhanced contexts
5. Test the end-to-end flow

## Files to Modify

- `/ece/agents/tier3/archivist/archivist_agent.py` - Add new endpoint
- `/ece/agents/tier3/qlearning/qlearning_agent.py` - Enhance context retrieval
- `/ece/components/context_cache/cache_manager.py` - Enhance context management
"""
    
    plan_file = project_root / "ARCHIVIST_ENHANCEMENT_PLAN.md"
    with open(plan_file, 'w') as f:
        f.write(enhancement_plan.strip())
        
    print(f"✅ Created Archivist enhancement plan at {plan_file}")
    return True

def main():
    """Main function to apply all fixes."""
    print("🔧 Applying ECE Context Flow Fixes...")
    print("=" * 50)
    
    # Apply fixes in order
    success = True
    
    print("\n1. Fixing Orchestrator Agent...")
    if not fix_orchestrator_agent():
        success = False
        
    print("\n2. Fixing Archivist Client...")
    if not fix_archivist_client():
        success = False
        
    print("\n3. Creating Archivist Enhancement Plan...")
    if not create_archivist_enhancement_plan():
        success = False
        
    if success:
        print("\n🎉 All fixes applied successfully!")
        print("\n📝 Next steps:")
        print("1. Review the backup files to ensure changes are correct")
        print("2. Review the ARCHIVIST_ENHANCEMENT_PLAN.md for detailed implementation steps")
        print("3. Implement the `/enhanced_context` endpoint in the Archivist agent")
        print("4. Enhance the QLearning Agent's context retrieval functionality")
        print("5. Test the end-to-end context flow")
    else:
        print("\n❌ Some fixes failed to apply. Please check the logs above.")
        
    return success

if __name__ == "__main__":
    main()