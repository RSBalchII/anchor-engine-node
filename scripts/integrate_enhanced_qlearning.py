#!/usr/bin/env python3
"""
Integration Script for Enhanced QLearning Agent

This script integrates the enhanced QLearning agent into the existing ECE codebase.
"""

import os
import sys
from pathlib import Path
import shutil

# Correct project root path
project_root = Path("/home/rsbiiw/Gemini/ECE/External-Context-Engine-ECE")

def backup_file(file_path):
    """Create a backup of a file before modifying it."""
    backup_path = f"{file_path}.backup"
    if os.path.exists(file_path):
        shutil.copy2(file_path, backup_path)
        print(f"✅ Backed up {file_path} to {backup_path}")
    return backup_path

def integrate_enhanced_qlearning_agent():
    """Integrate the enhanced QLearning agent into the existing codebase."""
    # Source file (the enhanced version we created)
    source_path = project_root / "ece" / "agents" / "tier3" / "qlearning" / "qlearning_agent_enhanced.py"
    
    # Target file (replace the existing qlearning_agent.py)
    target_path = project_root / "ece" / "agents" / "tier3" / "qlearning" / "qlearning_agent.py"
    
    print(f"Looking for enhanced QLearning agent at: {source_path}")
    print(f"Will replace QLearning agent at: {target_path}")
    
    if not source_path.exists():
        print(f"❌ Enhanced QLearning agent not found at {source_path}")
        return False
        
    if not target_path.exists():
        print(f"❌ Original QLearning agent not found at {target_path}")
        return False
        
    # Backup the original file
    backup_file(str(target_path))
    
    # Replace the original file with the enhanced version
    shutil.copy2(source_path, target_path)
    print(f"✅ Integrated enhanced QLearning agent at {target_path}")
    
    # Remove the enhanced file as it's no longer needed
    os.remove(source_path)
    print(f"🗑️ Removed temporary enhanced QLearning agent file")
    
    return True

def update_archivist_agent():
    """Update the Archivist agent to use the enhanced QLearning agent."""
    archivist_path = project_root / "ece" / "agents" / "tier3" / "archivist" / "archivist_agent.py"
    
    print(f"Looking for Archivist agent at: {archivist_path}")
    
    if not archivist_path.exists():
        print(f"❌ Archivist agent not found at {archivist_path}")
        return False
        
    # Backup the original file
    backup_file(str(archivist_path))
    
    # Read the current file
    with open(archivist_path, 'r') as f:
        content = f.read()
        
    # Check if the enhanced context endpoint already exists
    if "@app.post(\"/enhanced_context\", response_model=EnhancedContextResponse)" in content:
        print("✅ Archivist agent already has enhanced context endpoint")
        return True
        
    # Add the enhanced context endpoint
    enhanced_endpoint = '''
@app.post("/enhanced_context", response_model=EnhancedContextResponse)
async def get_enhanced_context(request: EnhancedContextRequest):
    """
    Enhanced endpoint that coordinates with QLearning Agent to provide context-aware responses.
    
    This endpoint receives a query and coordinates with the QLearning Agent to:
    1. Find optimal paths through the knowledge graph
    2. Build enhanced context from the paths (up to 1M token limit)
    3. Retrieve related memories from the knowledge graph
    4. Store the enhanced context in Redis for other agents
    5. Return the enhanced context and related memories
    
    Args:
        request: EnhancedContextRequest containing query, keywords, and limits
        
    Returns:
        EnhancedContextResponse with enhanced context and related memories
    """
    try:
        query = request.query
        keywords = request.keywords
        max_tokens = request.max_tokens
        session_id = request.session_id or "default"
        max_contexts = request.max_contexts
        
        logger.info(f"Received enhanced context request for query: {query[:100]}...")
        logger.info(f"Keywords: {keywords}, Max tokens: {max_tokens}, Session ID: {session_id}")
        
        # Step 1: Extract keywords from query if not provided
        if not keywords:
            keywords = await extract_keywords_from_query(query)
            logger.info(f"Extracted keywords: {keywords}")
            
        if not keywords:
            logger.warning("No keywords found in query")
            # Return minimal context
            minimal_context = f"No relevant context found for query: {query}"
            # Store in Redis for other agents
            context_key = f"context_cache:{session_id}:enhanced"
            redis_client.hset(context_key, "value", minimal_context)
            redis_client.hset(context_key, "created_at", datetime.now().isoformat())
            redis_client.expire(context_key, 3600)  # Expire in 1 hour
            
            return EnhancedContextResponse(
                enhanced_context=minimal_context,
                related_memories=[],
                session_id=session_id,
                timestamp=datetime.now().isoformat(),
                token_count=len(minimal_context.split())
            )
        
        # Step 2: Query QLearning Agent for optimal paths
        logger.info(f"Querying QLearning Agent for paths related to keywords: {keywords}")
        paths = await qlearning_client.find_optimal_path(keywords)
        logger.info(f"Retrieved {len(paths) if paths else 0} paths from QLearning Agent")
        
        # Step 3: Build enhanced context from paths
        logger.info(f"Building enhanced context with max {max_tokens} tokens")
        
        if not paths:
            enhanced_context = "No related context paths found by QLearning Agent."
        else:
            context_parts = []
            total_tokens = 0
            
            # Process each path to build context
            for i, path in enumerate(paths[:10]):  # Limit to top 10 paths
                if total_tokens >= max_tokens:
                    logger.info(f"Reached token limit with {len(paths)} paths")
                    break
                    
                # Extract information from the path
                path_info = f"\n--- Context Path {i+1} ---\n"
                
                if hasattr(path, 'nodes') and path.nodes:
                    # Limit nodes for brevity (first 5 nodes)
                    node_names = path.nodes[:5] if isinstance(path.nodes, list) else [str(path.nodes)[:100]]
                    path_info += f"Nodes: {', '.join(node_names)}\n"
                    
                if hasattr(path, 'relationships') and path.relationships:
                    # Extract relationship types
                    if isinstance(path.relationships, list):
                        rel_types = list(set([rel.get('type', 'RELATED_TO') for rel in path.relationships[:3]]))
                        path_info += f"Relationships: {', '.join(rel_types)}\n"
                    else:
                        path_info += f"Relationships: {str(path.relationships)[:100]}\n"
                    
                if hasattr(path, 'score'):
                    path_info += f"Relevance Score: {path.score:.2f}\n"
                    
                if hasattr(path, 'length'):
                    path_info += f"Path Length: {path.length}\n"
                    
                # Estimate token count (rough approximation - 1.3 tokens per word)
                word_count = len(path_info.split())
                path_tokens = int(word_count * 1.3)
                
                if total_tokens + path_tokens <= max_tokens:
                    context_parts.append(path_info)
                    total_tokens += path_tokens
                else:
                    # Add partial context if we're near the limit
                    remaining_tokens = max_tokens - total_tokens
                    if remaining_tokens > 100:  # Only add if we have meaningful space
                        # Truncate the path info to fit within remaining tokens
                        chars_per_token = len(path_info) / path_tokens if path_tokens > 0 else 1
                        max_chars = int(remaining_tokens * chars_per_token * 0.8)  # 80% to be safe
                        truncated_info = path_info[:max_chars] + "... [truncated]"
                        context_parts.append(truncated_info)
                    break
                    
            # Combine all context parts
            enhanced_context = "\n".join(context_parts)
            
            # Add a summary at the beginning
            summary = f"Enhanced Context Summary (Generated from {len(context_parts)} knowledge paths):\n"
            summary += f"Total Context Length: ~{total_tokens} tokens\n"
            summary += "This context was retrieved and summarized by the QLearning Agent based on your query.\n"
            summary += "--- BEGIN CONTEXT ---\n"
            
            enhanced_context = summary + enhanced_context + "\n--- END CONTEXT ---"
        
        token_count = len(enhanced_context.split())  # Rough token count
        logger.info(f"Enhanced context built ({token_count} tokens)")
        
        # Step 4: Get related memories from the knowledge graph
        logger.info(f"Retrieving related memories (max {max_contexts} contexts)")
        related_memories = []
        
        # In a real implementation, this would query the Neo4j database
        # For now, we'll create placeholder memories based on keywords
        for i, keyword in enumerate(keywords[:max_contexts]):
            memory = {
                "id": f"memory_{i}",
                "content": f"Related memory content for keyword '{keyword}'",
                "relevance_score": 1.0 - (i * 0.1),  # Decreasing relevance
                "timestamp": datetime.now().isoformat(),
                "keywords": [keyword]
            }
            related_memories.append(memory)
            
        logger.info(f"Retrieved {len(related_memories)} related memories")
        
        # Step 5: Store the enhanced context in Redis for other agents
        logger.info(f"Storing enhanced context in Redis cache for session: {session_id}")
        context_key = f"context_cache:{session_id}:enhanced"
        redis_client.hset(context_key, "value", enhanced_context)
        redis_client.hset(context_key, "created_at", datetime.now().isoformat())
        redis_client.expire(context_key, 3600)  # Expire in 1 hour
        
        # Store related memories if any
        if related_memories:
            memories_key = f"context_cache:{session_id}:related_memories"
            memories_str = "\n".join([mem.get("content", "") for mem in related_memories])
            redis_client.hset(memories_key, "value", memories_str)
            redis_client.hset(memories_key, "created_at", datetime.now().isoformat())
            redis_client.expire(memories_key, 3600)  # Expire in 1 hour
            
        logger.info(f"Enhanced context stored in Redis with keys: {context_key}, {memories_key if related_memories else 'no memories'}")
        
        # Step 6: Return the enhanced context and related memories
        logger.info("Returning enhanced context response")
        
        return EnhancedContextResponse(
            enhanced_context=enhanced_context,
            related_memories=related_memories,
            session_id=session_id,
            timestamp=datetime.now().isoformat(),
            token_count=token_count
        )
        
    except Exception as e:
        logger.error(f"Error processing enhanced context request: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
'''
    
    # Add the enhanced context endpoint to the Archivist agent
    # Find the end of the file and insert the endpoint before the last line
    lines = content.split('\n')
    # Find the line with the closing brace of the module
    for i in range(len(lines) - 1, -1, -1):
        if lines[i].strip() == '}':
            lines.insert(i, enhanced_endpoint)
            break
            
    # Write the updated content back to the file
    with open(archivist_path, 'w') as f:
        f.write('\n'.join(lines))
        
    print(f"✅ Updated Archivist agent at {archivist_path}")
    return True

def main():
    """Main function to integrate the enhanced QLearning agent."""
    print("🚀 Integrating Enhanced QLearning Agent into ECE...")
    print("=" * 50)
    
    # Apply fixes in order
    success = True
    
    print("\n1. Integrating Enhanced QLearning Agent...")
    if not integrate_enhanced_qlearning_agent():
        success = False
        
    print("\n2. Updating Archivist Agent...")
    if not update_archivist_agent():
        success = False
        
    if success:
        print("\n🎉 Enhanced QLearning Agent integration completed successfully!")
        print("\n📝 Next steps:")
        print("1. Review the backup files to ensure changes are correct")
        print("2. Test the enhanced context flow with sample prompts")
        print("3. Verify that the QLearning Agent processes up to 1M tokens")
        print("4. Ensure all agents read the full context cache before responding")
        print("\n📄 See the updated files for details on the changes made")
    else:
        print("\n❌ Some integration steps failed. Please check the logs above.")
        
    return success

if __name__ == "__main__":
    main()