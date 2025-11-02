# Simplified ECE Approach

## Overview

This document provides comprehensive documentation for the simplified approach to running the External Context Engine (ECE), which directly runs llama.cpp for model serving without the complex ecosystem.

## Key Changes

The simplified approach provides a more straightforward way to run the ECE with direct model serving through llama.cpp:

- **Direct Model Serving**: Uses llama.cpp server directly without complex routing
- **Single Port Operation**: Runs on port 8080 for standard OpenAI compatibility
- **Easy Management**: Simple Python script to start any model from the models/ directory
- **Reduced Complexity**: Fewer moving parts for simpler debugging and maintenance
- **Faster Startup Times**: No more complex routing layers to initialize
- **Clearer Connection**: Direct relationship between application and model backend

## Prerequisites

1. Make sure you have the required dependencies installed:
   ```bash
   pip install -r requirements.txt
   ```

2. Build llama.cpp (if not already built):
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

Example structure:
```
models/
├── gemma-3-4b-it-qat-abliterated.q8_0.gguf
├── deepseek-r1-distill-qwen-14b-q4km.gguf
└── your-custom-model.q8_0.gguf
```

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

- **Reduced Complexity**: Fewer moving parts for simpler debugging and maintenance
- **More Straightforward Debugging**: Direct model serving without routing layers
- **Easier Deployment**: Simpler to deploy and maintain
- **Faster Startup Times**: No complex routing layers to initialize
- **Clearer Connection**: Direct relationship between application and model backend
- **All Logs Properly Directed**: All logs go to the `logs/` directory for easy monitoring

## When to Use the Simplified Approach

### Recommended For:
- Development and testing environments
- Single-model deployments
- Users who prefer a more straightforward architecture
- Cases where proxy functionality is not needed
- Situations requiring faster startup times

### When to Stick with Full ECE:
- Production environments requiring full agent functionality
- Complex multi-agent coordination scenarios
- Advanced memory management features
- Full context-aware processing with persona loading
- Cases requiring the complete ECE ecosystem

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