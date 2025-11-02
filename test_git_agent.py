#!/usr/bin/env python3
"""
Simple test script to verify the Git agent is working correctly.
"""

import requests
import time
import os

def test_git_agent():
    """Test the Git agent endpoints."""
    base_url = "http://localhost:8009"
    
    print("Testing Git Agent...")
    print("=" * 40)
    
    # Test 1: Health check
    print("1. Testing health check endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print(f"   ✓ Health check successful: {response.json()}")
        else:
            print(f"   ✗ Health check failed with status {response.status_code}")
    except Exception as e:
        print(f"   ✗ Health check failed: {e}")
    
    # Test 2: Root endpoint
    print("2. Testing root endpoint...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print(f"   ✓ Root endpoint successful: {response.json()}")
        else:
            print(f"   ✗ Root endpoint failed with status {response.status_code}")
    except Exception as e:
        print(f"   ✗ Root endpoint failed: {e}")
    
    # Test 3: UTCP manual endpoint
    print("3. Testing UTCP manual endpoint...")
    try:
        response = requests.get(f"{base_url}/utcp", timeout=5)
        if response.status_code == 200:
            manual = response.json()
            print(f"   ✓ UTCP manual successful")
            print(f"     Manual version: {manual.get('manual_version', 'N/A')}")
            print(f"     UTCP version: {manual.get('utcp_version', 'N/A')}")
            tools = manual.get('tools', [])
            print(f"     Available tools: {len(tools)}")
            for tool in tools:
                print(f"       - {tool.get('name', 'N/A')}: {tool.get('description', 'N/A')}")
        else:
            print(f"   ✗ UTCP manual failed with status {response.status_code}")
    except Exception as e:
        print(f"   ✗ UTCP manual failed: {e}")
    
    print("\nGit Agent test completed.")

if __name__ == "__main__":
    test_git_agent()