#!/usr/bin/env python3
"""
Configuration for Anchor Core optimized for low-resource devices (phones, small laptops)
"""

import os
import json

class LowResourceConfig:
    """Configuration optimized for low-resource devices"""
    
    def __init__(self):
        # Conservative GPU settings for low VRAM devices
        self.gpu_config = {
            "max_buffer_size": 64 * 1024 * 1024,  # 64MB instead of 256MB
            "max_concurrent_operations": 1,
            "use_compressed_weights": True,
            "power_preference": "low-power",
            "force_fallback_adapter": False,
            "max_active_webgl_contexts": 1,
            "max_webgl_contexts_per_group": 1
        }
        
        # Conservative model settings
        self.model_config = {
            "default_model": "Phi-3.5-mini-instruct-q4f16_1-MLC",  # Smallest recommended
            "max_model_size_gb": 0.5,  # Maximum model size for low-resource devices
            "use_cpu_fallback": True,  # Allow CPU fallback if GPU fails
            "context_window": 2048,  # Reduced context window
            "batch_size": 1,  # Minimal batch size
            "quantization": "q4f16_1"  # Most compressed format
        }
        
        # Memory management settings
        self.memory_config = {
            "max_cache_size_mb": 128,  # Reduced cache size
            "enable_disk_cache": False,  # Disable disk cache to save space
            "gc_frequency": 10,  # More frequent garbage collection
            "preload_models": False  # Don't preload models
        }
        
        # Network and performance settings
        self.performance_config = {
            "timeout_seconds": 120,  # Longer timeouts for slower devices
            "max_retries": 3,
            "concurrent_requests": 1,  # Single-threaded for low-resource
            "enable_compression": True
        }

    def get_config(self):
        """Return the complete low-resource configuration"""
        return {
            "gpu": self.gpu_config,
            "model": self.model_config,
            "memory": self.memory_config,
            "performance": self.performance_config
        }

# Singleton instance
config = LowResourceConfig()

def get_low_resource_config():
    """Get the low-resource configuration"""
    return config.get_config()

if __name__ == "__main__":
    # Print configuration for debugging
    print(json.dumps(get_low_resource_config(), indent=2))