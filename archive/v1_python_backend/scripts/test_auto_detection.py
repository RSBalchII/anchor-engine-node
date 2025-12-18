#!/usr/bin/env python3
"""
Test script to verify the auto-detection functionality.
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_auto_detection():
    print("Testing auto-detection functionality...")
    
    # Set environment variables for testing
    os.environ['LLM_CHAT_TEMPLATE'] = 'auto'
    os.environ['LLM_MODEL_NAME'] = 'DavidAU/Gemma-3-4b-it-MAX-HORROR-Uncensored-DBL-X-Imatrix-GGUF'
    
    # Import settings after setting environment variables
    from src.config import settings
    
    print(f"Template setting: {settings.llm_chat_template}")
    print(f"Model name: {settings.llm_model_name}")
    print(f"Resolved template: {settings.resolved_chat_template}")
    print(f"Auto-detection working: {settings.resolved_chat_template == 'gemma3'}")
    
    # Test with a Qwen model
    os.environ['LLM_CHAT_TEMPLATE'] = 'auto'
    os.environ['LLM_MODEL_NAME'] = 'ZeroXClem/Qwen3-4B-MiniMight-Q8_0-GGUF'
    
    # We need to create a new settings instance to test the property logic
    from src.config import Settings
    qwen_settings = Settings()
    
    print(f"\nQwen Model test:")
    print(f"Template setting: {qwen_settings.llm_chat_template}")
    print(f"Model name: {qwen_settings.llm_model_name}")
    print(f"Resolved template: {qwen_settings.resolved_chat_template}")
    print(f"Auto-detection working: {qwen_settings.resolved_chat_template == 'qwen3-thinking'}")

if __name__ == "__main__":
    test_auto_detection()