#!/usr/bin/env python3
"""
Test script to verify Qwen3 chat template functionality.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from src.chat_templates import Qwen3ChatTemplate, OpenAIChatTemplate, chat_template_manager


def test_qwen3_template():
    print("Testing Qwen3 chat template...")
    
    template = Qwen3ChatTemplate()
    
    # Test without tools
    messages = [
        {"role": "user", "content": "Hello, how are you?"}
    ]
    system_prompt = "You are a helpful assistant."
    
    result = template.format_messages(messages, system_prompt=system_prompt, tools=None)
    print("Without tools:")
    print(result)
    print("\n" + "="*50 + "\n")
    
    # Test with tools
    tools = [
        {
            "name": "search",
            "description": "Search for information",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"]
            }
        }
    ]
    
    result_with_tools = template.format_messages(messages, system_prompt=system_prompt, tools=tools)
    print("With tools:")
    print(result_with_tools)
    print("\n" + "="*50 + "\n")
    
    # Test with assistant message containing tool calls
    messages_with_assistant = [
        {"role": "user", "content": "What's the weather like today?"},
        {
            "role": "assistant", 
            "content": "Let me check the weather for you.",
            "tool_calls": [
                {
                    "function": {
                        "name": "search",
                        "arguments": '{"query": "current weather"}'
                    }
                }
            ]
        }
    ]
    
    result_assistant = template.format_messages(messages_with_assistant, system_prompt=system_prompt, tools=tools)
    print("With assistant tool calls:")
    print(result_assistant)
    print("\n" + "="*50 + "\n")


def test_openai_template():
    print("Testing OpenAI chat template for comparison...")
    
    template = OpenAIChatTemplate()
    
    # Test with same messages
    messages = [
        {"role": "user", "content": "Hello, how are you?"}
    ]
    system_prompt = "You are a helpful assistant."
    
    result = template.format_messages(messages, system_prompt=system_prompt, tools=None)
    print("OpenAI format:")
    print(result)
    print("\n" + "="*50 + "\n")


def test_template_manager():
    print("Testing template manager...")
    
    # Test getting different templates
    openai_tmpl = chat_template_manager.get_template("openai")
    qwen3_tmpl = chat_template_manager.get_template("qwen3")
    
    print(f"OpenAI template type: {type(openai_tmpl)}")
    print(f"Qwen3 template type: {type(qwen3_tmpl)}")
    
    # Test with unknown template (should default to openai)
    unknown_tmpl = chat_template_manager.get_template("unknown")
    print(f"Unknown template type (should default to OpenAI): {type(unknown_tmpl)}")


if __name__ == "__main__":
    print("Testing Qwen3 chat template implementation...\n")
    
    test_qwen3_template()
    test_openai_template()
    test_template_manager()
    
    print("All tests completed!")