#!/usr/bin/env python3
"""
Test script to verify the new sidecar and vision endpoints are working
"""

import requests
import time

def test_endpoints():
    base_url = "http://localhost:8000"
    
    print("Testing new Anchor Core endpoints...")
    print(f"Base URL: {base_url}")
    print("-" * 50)
    
    # Test sidecar endpoint
    try:
        response = requests.get(f"{base_url}/sidecar", timeout=10)
        print(f"GET /sidecar -> Status: {response.status_code} {'✅' if response.status_code == 200 else '❌'}")
    except Exception as e:
        print(f"GET /sidecar -> Error: {e} ❌")
    
    # Test context endpoint
    try:
        response = requests.get(f"{base_url}/context", timeout=10)
        print(f"GET /context -> Status: {response.status_code} {'✅' if response.status_code == 200 else '❌'}")
    except Exception as e:
        print(f"GET /context -> Error: {e} ❌")
    
    # Test memory search endpoint (with a sample query)
    try:
        response = requests.post(
            f"{base_url}/v1/memory/search",
            json={"query": "test"},
            timeout=10
        )
        print(f"POST /v1/memory/search -> Status: {response.status_code} {'✅' if response.status_code == 200 else '❌'}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Response keys: {list(data.keys())}")
    except Exception as e:
        print(f"POST /v1/memory/search -> Error: {e} ❌")
    
    # Test vision ingest endpoint (this will fail without a proper image, but should return 400 not 404)
    try:
        response = requests.post(f"{base_url}/v1/vision/ingest", timeout=10)
        # Should return 400 (bad request) not 404 (not found)
        is_ok = response.status_code in [400, 405]  # 400 = bad request (no image), 405 = method not allowed
        print(f"POST /v1/vision/ingest -> Status: {response.status_code} {'✅' if is_ok else '❌'} (should be 400 or 405 for valid endpoint)")
    except Exception as e:
        print(f"POST /v1/vision/ingest -> Error: {e} ❌")
    
    print("-" * 50)
    print("Endpoint testing complete!")

if __name__ == "__main__":
    test_endpoints()