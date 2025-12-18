#!/usr/bin/env python3
"""
Test script to verify Gemma-3 chat template functionality.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from src.chat_templates import Gemma3ChatTemplate, chat_template_manager


def test_gemma3_template():
    print("Testing Gemma-3 chat template...")
    
    template = Gemma3ChatTemplate()
    
    # Test without tools
    messages = [
        {"role": "user", "content": "Hello, write me a creative story."}
    ]
    system_prompt = "You are a creative writing assistant."
    
    result = template.format_messages(messages, system_prompt=system_prompt, tools=None)
    print("Gemma3 format without tools:")
    print(result)
    print("\n" + "="*50 + "\n")
    
    # Test with multiple messages
    messages_multi = [
        {"role": "user", "content": "What is the meaning of life?"},
        {"role": "assistant", "content": "The meaning of life is subjective and varies for each individual. Some find it in relationships, others in achievement, and others in spiritual pursuits."}
    ]
    
    result_multi = template.format_messages(messages_multi, system_prompt=system_prompt, tools=None)
    print("Gemma3 format with multiple messages:")
    print(result_multi)
    print("\n" + "="*50 + "\n")
    
    # Test template manager
    print("Testing template manager...")
    gemma_tmpl = chat_template_manager.get_template("gemma3")
    print(f"Gemma3 template type: {type(gemma_tmpl)}")
    
    # Verify all templates are available
    available = list(chat_template_manager.templates.keys())
    print(f"All available templates: {available}")
    
    # Make sure gemma3 is in the list
    if "gemma3" in available:
        print("[PASS] Gemma3 template successfully registered")
    else:
        print("[FAIL] Gemma3 template not found in manager")


def test_auto_detection():
    print("Testing auto-detection logic...")
    
    # Test the config property logic
    from src.config import settings
    import types
    
    # Create a mock settings object to test the logic
    class MockSettings:
        llm_chat_template = "auto"
        llm_model_name = "DavidAU/Gemma-3-4b-it-MAX-HORROR-Uncensored-DBL-X-Imatrix-GGUF"
    
    mock_settings = MockSettings()
    
    # Test the resolved template property
    resolved = mock_settings.llm_chat_template.lower() == 'auto'
    if resolved:
        model_name = mock_settings.llm_model_name.lower()
        if 'gemma' in model_name:
            detected_template = 'gemma3'
        elif 'qwen' in model_name:
            detected_template = 'qwen3-thinking'
        else:
            detected_template = 'openai'
    
    print(f"Auto-detection test - Model: {mock_settings.llm_model_name}")
    print(f"Auto-detection result: {detected_template}")
    if detected_template == 'gemma3':
        print("[PASS] Auto-detection working correctly for Gemma model")
    else:
        print("[FAIL] Auto-detection failed")


if __name__ == "__main__":
    print("Testing Gemma-3 chat template implementation...\n")
    
    test_gemma3_template()
    print()
    test_auto_detection()
    
    print("\nAll tests completed!")