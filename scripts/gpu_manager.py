#!/usr/bin/env python3
"""
GPU Resource Manager for ECE_Core
Provides utilities to monitor and manage GPU locks in the WebGPU bridge
"""

import requests
import json
import time
import argparse
from typing import Dict, Any

class GPUResourceManager:
    def __init__(self, bridge_url: str = "http://localhost:8080"):
        self.bridge_url = bridge_url
        self.headers = {"Authorization": "Bearer sovereign-secret"}
    
    def get_status(self) -> Dict[str, Any]:
        """Get current GPU status"""
        try:
            response = requests.get(f"{self.bridge_url}/v1/gpu/status", headers=self.headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error getting status: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            print(f"Error connecting to bridge: {e}")
            return {}
    
    def reset_lock(self) -> bool:
        """Reset the current GPU lock"""
        try:
            response = requests.post(f"{self.bridge_url}/v1/gpu/reset", headers=self.headers)
            if response.status_code == 200:
                print("✅ GPU lock reset successfully")
                return True
            else:
                print(f"❌ Failed to reset GPU lock: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error resetting GPU lock: {e}")
            return False
    
    def force_release_all(self) -> bool:
        """Force release all GPU locks (emergency)"""
        try:
            response = requests.post(f"{self.bridge_url}/v1/gpu/force-release-all", headers=self.headers)
            if response.status_code == 200:
                print("✅ All GPU locks force released successfully")
                return True
            else:
                print(f"❌ Failed to force release GPU locks: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error force releasing GPU locks: {e}")
            return False
    
    def monitor(self, interval: int = 5):
        """Monitor GPU status continuously"""
        print(f"📊 Monitoring GPU status every {interval}s (Ctrl+C to stop)")
        try:
            while True:
                status = self.get_status()
                if status:
                    locked = status.get('locked', False)
                    owner = status.get('owner', 'None')
                    queue_depth = status.get('queue_depth', 0)
                    queued = status.get('queued', [])
                    
                    status_str = f"GPU: {'LOCKED' if locked else 'FREE'}"
                    if locked:
                        status_str += f" by {owner}"
                    if queue_depth > 0:
                        status_str += f" | Queue: {queue_depth} | Queued: {', '.join(queued) if queued else 'None'}"
                    
                    print(f"[{time.strftime('%H:%M:%S')}] {status_str}")
                else:
                    print(f"[{time.strftime('%H:%M:%S')}] ❌ Unable to get GPU status")
                
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n⏹️  Monitoring stopped")

def main():
    parser = argparse.ArgumentParser(description="GPU Resource Manager for ECE_Core")
    parser.add_argument("--bridge-url", default="http://localhost:8080", 
                       help="WebGPU bridge URL (default: http://localhost:8080)")
    parser.add_argument("--status", action="store_true", help="Get current GPU status")
    parser.add_argument("--reset", action="store_true", help="Reset GPU lock")
    parser.add_argument("--force-release", action="store_true", help="Force release all GPU locks")
    parser.add_argument("--monitor", action="store_true", help="Monitor GPU status continuously")
    parser.add_argument("--interval", type=int, default=5, help="Monitor interval in seconds (default: 5)")
    
    args = parser.parse_args()
    
    manager = GPUResourceManager(args.bridge_url)
    
    if args.status:
        status = manager.get_status()
        if status:
            print(json.dumps(status, indent=2))
        else:
            print("❌ Failed to get status")
    
    elif args.reset:
        manager.reset_lock()
    
    elif args.force_release:
        manager.force_release_all()
    
    elif args.monitor:
        manager.monitor(args.interval)
    
    else:
        # Default: show status
        status = manager.get_status()
        if status:
            locked = status.get('locked', False)
            owner = status.get('owner', 'None')
            queue_depth = status.get('queue_depth', 0)
            queued = status.get('queued', [])
            
            print(f"GPU Status: {'LOCKED' if locked else 'FREE'}", end="")
            if locked:
                print(f" by {owner}", end="")
            print(f" | Queue: {queue_depth} items")
            
            if queued:
                print(f"Queued: {', '.join(queued)}")
        else:
            print("❌ Failed to get status")

if __name__ == "__main__":
    main()