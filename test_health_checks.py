"""
Test script to verify health check endpoints for ECE agents.
"""
import asyncio
import httpx
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath('.'))

async def test_health_endpoint(url: str, agent_name: str):
    """Test the health endpoint of an agent."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                status = data.get('status', 'unknown')
                print(f"✓ {agent_name} health check: {status}")
                return True
            else:
                print(f"✗ {agent_name} health check failed with status code: {response.status_code}")
                return False
    except Exception as e:
        print(f"✗ {agent_name} health check failed with error: {str(e)}")
        return False

async def test_root_endpoint(url: str, agent_name: str):
    """Test the root endpoint of an agent."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                message = data.get('message', 'no message')
                print(f"✓ {agent_name} root endpoint: {message}")
                return True
            else:
                print(f"✗ {agent_name} root endpoint failed with status code: {response.status_code}")
                return False
    except Exception as e:
        print(f"✗ {agent_name} root endpoint failed with error: {str(e)}")
        return False

async def test_all_agents():
    """Test health check endpoints for all agents."""
    print("Testing health check endpoints for ECE agents...")
    print("="*50)
    
    # Define the agents and their endpoints
    agents = [
        {"name": "Orchestrator", "base_url": "http://localhost:8000"},
        {"name": "Distiller", "base_url": "http://localhost:8001"},
        {"name": "QLearning", "base_url": "http://localhost:8002"},
        {"name": "Archivist", "base_url": "http://localhost:8003"},
        {"name": "Injector", "base_url": "http://localhost:8004"},
        {"name": "Filesystem", "base_url": "http://localhost:8006"},
        {"name": "Web Search", "base_url": "http://localhost:8007"}
    ]
    
    all_passed = True
    
    for agent in agents:
        print(f"\nTesting {agent['name']} agent...")
        
        # Test health endpoint
        health_url = f"{agent['base_url']}/health"
        health_ok = await test_health_endpoint(health_url, agent['name'])
        
        # Test root endpoint
        root_url = f"{agent['base_url']}/"
        root_ok = await test_root_endpoint(root_url, agent['name'])
        
        if not (health_ok and root_ok):
            all_passed = False
    
    print("\n" + "="*50)
    if all_passed:
        print("✓ All health check endpoints are responding correctly!")
        return True
    else:
        print("✗ Some health check endpoints are not responding correctly!")
        return False

if __name__ == "__main__":
    # Check if we should run the tests
    if len(sys.argv) > 1 and sys.argv[1] == "--skip":
        print("Skipping health check tests as agents may not be running.")
        print("To run tests, ensure all agents are running and call without --skip flag.")
        sys.exit(0)
    
    print("Running health check tests...")
    print("Note: This test requires all agents to be running on their respective ports.")
    print("If agents are not running, the tests will fail as expected.")
    
    # Run the tests
    success = asyncio.run(test_all_agents())
    
    if not success:
        print("\nHealth check tests failed. This may be because agents are not running.")
        print("Please start the agents before running this test.")
    
    sys.exit(0 if success else 1)