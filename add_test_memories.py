"""Add test memories to ECE_Core for testing memory retrieval."""
import httpx
import sys

def add_memory(category: str, content: str, tags: list = None, importance: int = 7):
    """Add a memory via the ECE API."""
    url = "http://localhost:8000/memories"
    payload = {
        "category": category,
        "content": content,
        "tags": tags or [],
        "importance": importance
    }
    
    try:
        response = httpx.post(url, json=payload, timeout=10.0)
        response.raise_for_status()
        print(f"✓ Added {category} memory: {content[:50]}...")
        return True
    except Exception as e:
        print(f"✗ Failed to add memory: {e}")
        return False

def main():
    print("Adding test memories to ECE_Core...\n")
    
    # Add some July memories
    memories = [
        {
            "category": "event",
            "content": "In July 2024, we discussed the new ECE_Core architecture and how to integrate Markovian reasoning with memory retrieval.",
            "tags": ["july", "ece", "architecture", "markovian"],
            "importance": 8
        },
        {
            "category": "idea",
            "content": "July brainstorming: Implement tiered memory system with Redis for hot cache and SQLite for long-term storage.",
            "tags": ["july", "memory", "redis", "sqlite", "idea"],
            "importance": 7
        },
        {
            "category": "event",
            "content": "July 15th: Completed initial implementation of Graph-R1 reasoning with memory graph traversal.",
            "tags": ["july", "graph-r1", "reasoning", "milestone"],
            "importance": 9
        },
        {
            "category": "person",
            "content": "In July, worked closely on the sovereign CLI project to create a memory-enhanced terminal AI.",
            "tags": ["july", "sovereign", "cli", "terminal"],
            "importance": 6
        },
        {
            "category": "task",
            "content": "July goal: Integrate semantic memory retrieval into context building so the AI can recall past conversations.",
            "tags": ["july", "memory", "retrieval", "context", "goal"],
            "importance": 8
        }
    ]
    
    success_count = 0
    for mem in memories:
        if add_memory(**mem):
            success_count += 1
    
    print(f"\n{'='*50}")
    print(f"Added {success_count}/{len(memories)} memories successfully!")
    print(f"{'='*50}")
    
    if success_count == 0:
        print("\n⚠️  Make sure ECE_Core is running at http://localhost:8000")
        sys.exit(1)

if __name__ == "__main__":
    main()
