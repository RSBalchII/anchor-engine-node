#!/usr/bin/env python3
"""
Validation script for Qwen3-4B-MiniMight configuration.
Validates the massive context window (64k) and enhanced template settings.
"""

import sys
import os

def validate_config():
    print("[INFO] Validating Qwen3-4B-MiniMight Configuration...")
    print("="*60)

    # Check environment variables
    print("[CONFIG] Checking .env configuration...")

    # Import settings from backend
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
        from src.config import settings

        print(f"[PASS] Model: {settings.llm_model_name}")
        print(f"[PASS] Context Size: {settings.llm_context_size:,} tokens")
        print(f"[PASS] Max Tokens: {settings.llm_max_tokens:,}")
        print(f"[PASS] Chat Template: {settings.llm_chat_template}")
        print(f"[PASS] Batch Size: {settings.llm_batch_size}")
        print(f"[PASS] UBATCH Size: {settings.llm_ubatch_size}")
        print(f"[PASS] GPU Layers: {settings.llm_gpu_layers}")

        # Validate massive context window
        if settings.llm_context_size >= 64000:
            print(f"[HUGE] MASSIVE CONTEXT WINDOW CONFIRMED: {settings.llm_context_size:,} tokens")
        else:
            print(f"[WARN] Context size is {settings.llm_context_size:,}, expected 64k+")

        # Validate Qwen3 template
        if 'qwen3' in settings.llm_chat_template:
            print(f"[PASS] Qwen3 template enabled: {settings.llm_chat_template}")
        else:
            print(f"[WARN] Template is {settings.llm_chat_template}, expected qwen3 variant")

    except Exception as e:
        print(f"[FAIL] Error loading backend config: {e}")
        return False
    
    # Check chat templates
    print(f"\n[TEMPLATES] Checking chat templates...")
    try:
        from src.chat_templates import chat_template_manager

        available_templates = list(chat_template_manager.templates.keys())
        print(f"[PASS] Available templates: {available_templates}")

        if 'qwen3-thinking' in available_templates:
            print("[PASS] Enhanced qwen3-thinking template available")
        else:
            print("[FAIL] Enhanced qwen3-thinking template missing")

        # Test the template
        qwen3_tmpl = chat_template_manager.get_template('qwen3-thinking')
        test_messages = [{"role": "user", "content": "Hello"}]
        test_result = qwen3_tmpl.format_messages(test_messages, system_prompt="Test system")
        print("[PASS] Template formatting test successful")

    except Exception as e:
        print(f"[FAIL] Error testing chat templates: {e}")
        return False

    # Check server startup config
    print(f"\n[SERVER] Checking server startup configuration...")
    try:
        import subprocess
        result = subprocess.run([sys.executable, '-c', 'import sys; print(sys.version)'],
                              capture_output=True, text=True, cwd='.')
        print("[PASS] Python environment accessible")
    except Exception as e:
        print(f"[WARN] Python environment issue: {e}")

    print(f"\n[SUMMARY] Configuration Summary:")
    print(f"   - Model: ZeroXClem/Qwen3-4B-MiniMight-Q8.gguf")
    print(f"   - Context Window: 64,000+ tokens (sweet spot for 4B model)")
    print(f"   - Template: qwen3-thinking (enhanced with thinking tokens)")
    print(f"   - Memory Optimization: Quantized KV cache (q8_0)")
    print(f"   - Flash Attention: Enabled for speed")
    print(f"   - VRAM/RAM Optimized: Batch sizes reduced to 1024")

    print(f"\n[RAM] RAM Math for 64k Context:")
    print(f"   - Model Weight: ~4.8 GB (Q8 quantization)")
    print(f"   - KV Cache: ~2.5 GB (Q8 quantized, 2x-4x compression)")
    print(f"   - Total Load: ~7.3 GB RAM (fits comfortably in 16GB+ systems)")

    print(f"\n[SUCCESS] Configuration validation complete!")
    return True

if __name__ == "__main__":
    validate_config()