#!/usr/bin/env python3
"""
Demonstration script showing how to properly start the ECE system 
and connect qwen-code-ece/forge-cli applications.
"""

import subprocess
import sys
import time
import os
import requests

def check_prerequisites():
    """Check if all prerequisites are met."""
    print("Checking prerequisites...")
    
    # Check if Docker is installed and running
    try:
        result = subprocess.run(["docker", "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✓ Docker is installed")
        else:
            print("⚠ Docker is not installed or not in PATH")
    except Exception as e:
        print("⚠ Docker is not installed or not in PATH")
    
    # Check if Python is installed
    try:
        result = subprocess.run([sys.executable, "--version"], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✓ Python is installed")
        else:
            print("✗ Python is not installed properly")
            return False
    except Exception as e:
        print("✗ Python is not installed properly")
        return False
    
    # Check if required directories exist
    required_dirs = ["ece", "models", "logs"]
    for dir_name in required_dirs:
        if os.path.exists(dir_name):
            print(f"✓ {dir_name} directory exists")
        else:
            print(f"✗ {dir_name} directory is missing")
    
    return True

def start_ece_system():
    """Start the ECE system."""
    print("\nStarting ECE system...")
    
    try:
        # Start the simplified ecosystem
        process = subprocess.Popen([
            sys.executable, "start_simplified_ecosystem.py"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        print(f"✓ ECE system started with PID {process.pid}")
        print("⏳ Waiting for services to initialize...")
        
        # Wait for services to start
        time.sleep(15)
        
        return process
    except Exception as e:
        print(f"✗ Failed to start ECE system: {e}")
        return None

def test_service_connectivity():
    """Test connectivity to all ECE services."""
    print("\nTesting service connectivity...")
    
    services = [
        ("ECE Orchestrator", "http://localhost:8000/health"),
        ("ECE Distiller", "http://localhost:8001/health"),
        ("ECE QLearning", "http://localhost:8002/health"),
        ("ECE Archivist", "http://localhost:8003/health"),
        ("ECE Injector", "http://localhost:8004/health"),
        ("ECE FileSystem", "http://localhost:8006/health"),
        ("ECE WebSearch", "http://localhost:8007/health"),
        ("ECE Git", "http://localhost:8009/health"),
    ]
    
    all_connected = True
    
    for service_name, url in services:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✓ {service_name} is responding")
            else:
                print(f"⚠ {service_name} responded with status {response.status_code}")
        except Exception as e:
            print(f"✗ {service_name} is not responding: {e}")
            all_connected = False
    
    return all_connected

def show_connection_instructions():
    """Show instructions for connecting qwen-code-ece/forge-cli."""
    print("\n" + "=" * 60)
    print("CONNECTION INSTRUCTIONS FOR qwen-code-ece/forge-cli")
    print("=" * 60)
    
    print("\n🔧 Environment Variables:")
    print("   export UTCP_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009")
    print("   # or for forge-cli:")
    print("   export UTCP_SERVICE_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009")
    
    print("\n📁 .env File Configuration:")
    print("   Create a .env file in your qwen-code-ece/forge-cli directory:")
    print("   UTCP_ENDPOINTS=http://localhost:8007,http://localhost:8006,http://localhost:8009")
    
    print("\n⚡ Service Endpoints:")
    print("   - WebSearch Agent:  http://localhost:8007")
    print("   - FileSystem Agent: http://localhost:8006") 
    print("   - Git Agent:        http://localhost:8009")
    
    print("\n🧪 Testing Connection:")
    print("   Run: python test_ece_services.py")
    
    print("\n📚 Documentation:")
    print("   See docs/ece_service_configuration.md for complete guide")
    print("=" * 60)

def main():
    """Main demonstration function."""
    print("ECE System Connection Demonstration")
    print("====================================")
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites not met. Please fix issues and try again.")
        return 1
    
    # Start ECE system
    ece_process = start_ece_system()
    if not ece_process:
        print("\n❌ Failed to start ECE system.")
        return 1
    
    try:
        # Test service connectivity
        if test_service_connectivity():
            print("\n🎉 All ECE services are running and accessible!")
            show_connection_instructions()
        else:
            print("\n⚠ Some services may not be responding. Check logs for details.")
            show_connection_instructions()
        
        print("\nPress Enter to stop the ECE system...")
        input()
        
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down...")
    finally:
        # Stop the ECE system
        if ece_process:
            ece_process.terminate()
            try:
                ece_process.wait(timeout=10)
                print("✅ ECE system stopped successfully")
            except subprocess.TimeoutExpired:
                ece_process.kill()
                print("✅ ECE system force stopped")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())