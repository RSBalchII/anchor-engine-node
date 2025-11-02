# Simplified ECE Startup Guide

This guide explains how to use the simplified approach to start the External Context Engine (ECE) with direct model serving through llama.cpp.

## Quick Start

To start the simplified ECE system:

```bash
python simple_model_server.py --model ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf --port 8080
```

Or use the platform-specific scripts:
```bash
# Windows Batch
start_model_server.bat ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf 8080

# Windows PowerShell
./start_model_server.ps1 -ModelPath "./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf" -Port 8080
```

## Prerequisites

1. Python 3.11+ installed
2. Required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Build llama.cpp (if not already built):
   - On Windows: Use Visual Studio Developer Command Prompt and run `cmake` and `--build` commands
   - On Linux/Mac: Use `make` command in the llama.cpp directory

## Usage

### Start the Model Server

To start the server with the default model:
```bash
python simple_model_server.py
```

To specify a model and port:
```bash
python simple_model_server.py --model ./models/your-model.gguf --port 8080
```

To list all available models:
```bash
python simple_model_server.py --list-models
```

### Alternative startup scripts

Windows Batch:
```bash
start_model_server.bat ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf 8080
```

Windows PowerShell:
```powershell
./start_model_server.ps1 -ModelPath "./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf" -Port 8080
```

## Model Directory

All models should be placed in the `./models/` directory. The server will automatically detect any `.gguf` files in this directory.

## Configuration

The main configuration is in `config.yaml` where the API base points directly to the llama.cpp server:
```yaml
llm:
  active_provider: llama_cpp
  providers:
    llama_cpp:
      model_path: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
      api_base: http://localhost:8080/v1
      model: ./models/gemma-3-4b-it-qat-abliterated.q8_0.gguf
```

## Benefits of Simplified Architecture

- Reduced complexity with fewer moving parts
- More straightforward debugging
- Direct model serving without routing layers
- Easier to deploy and maintain
- Faster startup times
- Clearer connection between application and model backend

## Connecting to the Server

Once the server is running, you can connect to it using the standard OpenAI-compatible API:

- Endpoint: `http://localhost:8080/v1`
- No API key required for local server

Example curl command:
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma-3-4b-it-qat-abliterated.q8_0.gguf",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7
  }'
```

## Troubleshooting

### Common Issues

1. **Model Server Not Starting**:
   - Ensure llama.cpp is built properly
   - Check that the model file exists in the models/ directory
   - Verify port 8080 is not already in use

2. **Connection Issues**:
   - Confirm the server is running on port 8080
   - Check firewall settings if accessing from another machine
   - Verify the model file is compatible with your llama.cpp build

3. **Performance Issues**:
   - Ensure you have sufficient VRAM for the model
   - Check that CUDA is properly configured if using GPU acceleration
   - Consider using a smaller quantized model if VRAM is limited

### Diagnostic Commands

```bash
# Check if server is running
curl http://localhost:8080/health

# List available models
python simple_model_server.py --list-models

# Check port usage
netstat -an | findstr :8080
```

## When to Use the Simplified Approach

The simplified approach is ideal for:
- Single-model deployments
- Development and testing environments
- Users who prefer a more straightforward architecture
- Cases where proxy functionality is not needed
- Situations requiring faster startup times

## When to Use the Full ECE Ecosystem

Consider using the full ECE ecosystem if you need:
- Persistent memory and context management
- Multi-agent coordination
- Advanced reasoning capabilities
- Knowledge graph integration
- Complex tool usage
- UTCP (Universal Tool Calling Protocol) integration

For simple model serving and inference, the simplified approach is recommended.

## Migration from Complex Setup

If you're migrating from the complex ecosystem setup:

1. **Backup your configuration**:
   - Copy your `config.yaml` and `.env` files
   - Note any custom model paths or settings

2. **Update your configuration**:
   - Ensure the API base points to `http://localhost:8080/v1`
   - Verify the model path is correct in the `models/` directory

3. **Test the simplified approach**:
   - Start with a simple model server test
   - Verify your applications can connect to the new endpoint

4. **Remove old scripts (optional)**:
   - Use `cleanup_simplified_setup.py` to identify files that are part of the old complex setup
   - Only remove files after confirming the simplified setup works for your use case

## Cleanup Utility

To identify and remove old complex scripts that are no longer needed with the simplified approach:

```bash
python cleanup_simplified_setup.py --list-only
```

To remove old complex scripts after confirming the simplified setup works:
```bash
python cleanup_simplified_setup.py
```

## Verification

To verify that the simplified setup is working correctly:
```bash
python verify_simplified_setup.py
```

## Conclusion

The simplified approach provides a more straightforward way to run the ECE with direct model serving through llama.cpp. It eliminates the complexity of the unified proxy routing system while maintaining all essential functionality. This approach is ideal for development, testing, and single-model deployments where the full ECE ecosystem is not required.