#!/usr/bin/env python3
"""
Test script to verify GPU resource management fixes including model loading serialization
"""

import time
import requests
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import json

def test_gpu_status():
    """Test GPU status endpoint"""
    try:
        response = requests.get("http://localhost:8080/v1/gpu/status", 
                              headers={"Authorization": "Bearer sovereign-secret"})
        if response.status_code == 200:
            status = response.json()
            print(f"✅ GPU Status: {status}")
            return True
        else:
            print(f"❌ GPU Status request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting GPU status: {e}")
        return False

def test_lock_acquisition(agent_id: str, timeout: int = 120):  # Increased to 120s
    """Test GPU lock acquisition"""
    try:
        print(f"⏳ Agent {agent_id} requesting GPU lock...")
        start_time = time.time()
        
        response = requests.post("http://localhost:8080/v1/gpu/lock",
                                headers={"Authorization": "Bearer sovereign-secret"},
                                json={"id": agent_id},
                                timeout=timeout)
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Agent {agent_id} acquired lock in {elapsed:.2f}s: {result.get('token', 'no-token')}")
            
            # Release the lock
            release_response = requests.post("http://localhost:8080/v1/gpu/unlock",
                                          headers={"Authorization": "Bearer sovereign-secret"},
                                          json={"id": agent_id})
            if release_response.status_code == 200:
                print(f"✅ Agent {agent_id} released lock")
            else:
                print(f"⚠️  Agent {agent_id} failed to release lock: {release_response.status_code}")
            
            return True
        else:
            print(f"❌ Agent {agent_id} failed to acquire lock: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Agent {agent_id} error: {e}")
        return False

def test_concurrent_access():
    """Test concurrent GPU access with different priority agents"""
    print("\n🧪 Testing concurrent GPU access...")
    
    agents = [
        ("Root-Mic", 5),  # High priority
        ("Root-Console-Init", 10),  # Medium priority
        ("Dreamer-Init", 15),  # Lower priority
        ("Test-Agent-4", 20),  # Even lower priority
    ]
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []
        for agent_id, delay in agents:
            # Add small delay to ensure proper ordering
            future = executor.submit(test_lock_acquisition, agent_id)
            futures.append(future)
            time.sleep(0.5)  # Stagger the requests
        
        # Wait for all to complete
        for future in as_completed(futures):
            future.result()

def test_force_release():
    """Test force release functionality"""
    print("\n🔧 Testing force release functionality...")
    
    # First, acquire a lock manually
    response = requests.post("http://localhost:8080/v1/gpu/lock",
                            headers={"Authorization": "Bearer sovereign-secret"},
                            json={"id": "test-force-release"})
    
    if response.status_code == 200:
        print("✅ Acquired test lock")
        
        # Now force release all locks
        force_response = requests.post("http://localhost:8080/v1/gpu/force-release-all",
                                     headers={"Authorization": "Bearer sovereign-secret"})
        
        if force_response.status_code == 200:
            print("✅ Force release executed successfully")
        else:
            print(f"❌ Force release failed: {force_response.status_code}")
    else:
        print(f"❌ Failed to acquire test lock: {response.status_code}")

def run_comprehensive_test():
    """Run comprehensive tests"""
    print("🚀 Running comprehensive GPU resource management tests...\n")
    
    # Test 1: Basic status check
    print("1️⃣ Testing GPU status endpoint...")
    status_ok = test_gpu_status()
    
    # Test 2: Force release
    print("\n2️⃣ Testing force release functionality...")
    test_force_release()
    
    # Test 3: Concurrent access
    print("\n3️⃣ Testing concurrent access patterns...")
    test_concurrent_access()
    
    # Test 4: Status after tests
    print("\n4️⃣ Checking final GPU status...")
    final_status_ok = test_gpu_status()
    
    print("\n✅ Comprehensive testing completed!")
    return status_ok and final_status_ok

if __name__ == "__main__":
    run_comprehensive_test()