# TASK-022: Setup PyTorch with CUDA
#!/usr/bin/env python3
"""
GPU Setup and Verification Script
Ensures CUDA is properly configured for the ECE Memory Management System
"""

import sys
import os
from typing import Dict, Any

def check_gpu_setup() -> Dict[str, Any]:
    """Verify GPU setup and CUDA availability"""
    results = {
        "cuda_available": False,
        "gpu_count": 0,
        "gpu_name": None,
        "cuda_version": None,
        "cudnn_version": None,
        "memory_available": 0,
        "errors": []
    }
    
    try:
        import torch
        
        # Check CUDA availability
        results["cuda_available"] = torch.cuda.is_available()
        
        if results["cuda_available"]:
            results["gpu_count"] = torch.cuda.device_count()
            results["gpu_name"] = torch.cuda.get_device_name(0)
            results["cuda_version"] = torch.version.cuda
            results["cudnn_version"] = torch.backends.cudnn.version()
            results["memory_available"] = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # GB
            
            # Set optimal settings for RTX 4090
            torch.backends.cudnn.benchmark = True
            torch.backends.cuda.matmul.allow_tf32 = True
            
            print("✅ GPU Setup Verification Results:")
            print(f"   CUDA Available: {results['cuda_available']}")
            print(f"   GPU Count: {results['gpu_count']}")
            print(f"   GPU Name: {results['gpu_name']}")
            print(f"   CUDA Version: {results['cuda_version']}")
            print(f"   cuDNN Version: {results['cudnn_version']}")
            print(f"   Memory Available: {results['memory_available']:.2f} GB")
            
            # Test basic GPU operation
            test_tensor = torch.randn(1000, 1000).cuda()
            result = torch.matmul(test_tensor, test_tensor)
            print("✅ GPU computation test: PASSED")
            
        else:
            results["errors"].append("CUDA is not available. Please install CUDA toolkit 12.1")
            print("❌ CUDA is not available")
            print("   Please install CUDA toolkit 12.1 from:")
            print("   https://developer.nvidia.com/cuda-12-1-0-download-archive")
            
    except ImportError as e:
        results["errors"].append(f"PyTorch not installed: {str(e)}")
        print("❌ PyTorch is not installed")
        print("   Install with: pip install torch==2.1.2+cu121 -f https://download.pytorch.org/whl/torch_stable.html")
    except Exception as e:
        results["errors"].append(f"Unexpected error: {str(e)}")
        print(f"❌ Error during GPU setup: {str(e)}")
    
    return results


def setup_environment_variables():
    """Set environment variables for optimal GPU performance"""
    env_vars = {
        "CUDA_VISIBLE_DEVICES": "0",
        "TF_ENABLE_ONEDNN_OPTS": "0",
        "PYTORCH_CUDA_ALLOC_CONF": "max_split_size_mb:512",
        "CUBLAS_WORKSPACE_CONFIG": ":4096:8"
    }
    
    print("\n📝 Setting environment variables for GPU optimization:")
    for key, value in env_vars.items():
        os.environ[key] = value
        print(f"   {key}={value}")
    
    return env_vars


def main():
    """Main execution function"""
    print("=" * 60)
    print("ECE Memory Management System - GPU Setup Verification")
    print("=" * 60)
    
    # Set environment variables
    env_vars = setup_environment_variables()
    
    # Check GPU setup
    results = check_gpu_setup()
    
    # Return status
    if results["cuda_available"] and results["gpu_count"] > 0:
        print("\n✅ GPU setup is complete and ready for ECE Memory Management System")
        return 0
    else:
        print("\n❌ GPU setup incomplete. Please address the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
