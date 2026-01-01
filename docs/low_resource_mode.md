# Low-Resource Mode for Anchor Core

This guide explains how to optimize the Anchor Core for phones, small laptops, and other low-resource devices.

## Environment Variables

The system supports two environment variables for optimization:

### `LOW_RESOURCE_MODE`
- Set to `true` to enable conservative settings for low-resource devices
- Reduces GPU buffer size to 64MB
- Limits concurrent operations to 1
- Uses smaller models and reduced context windows

### `CPU_ONLY_MODE`
- Set to `true` to force CPU-only processing (no GPU)
- Useful when GPU is unavailable or causing crashes
- Slower but more stable on constrained hardware

## Setting Environment Variables

### Windows Command Prompt:
```cmd
set LOW_RESOURCE_MODE=true
start-anchor.bat
```

### Windows PowerShell:
```powershell
$env:LOW_RESOURCE_MODE="true"
.\start-anchor.bat
```

### Linux/Mac:
```bash
export LOW_RESOURCE_MODE=true
./start-anchor.sh
```

## Conservative Settings Applied

When `LOW_RESOURCE_MODE` is enabled, the system applies:

- **GPU Buffer**: 64MB (vs 256MB default)
- **Model**: Phi-3.5-mini (smallest recommended)
- **Context Window**: 2048 tokens (vs 4096+ default)
- **Batch Size**: 1 (vs 4+ default)
- **WebGL Contexts**: 1 max (vs 16+ default)
- **Cache Size**: 128MB (vs 1GB+ default)
- **Timeouts**: 120 seconds (vs 30s default)

## For Phones and Tablets

For mobile devices, use both settings:
```cmd
set LOW_RESOURCE_MODE=true
set CPU_ONLY_MODE=true
start-anchor.bat
```

## Model Recommendations for Low-Resource Devices

- `Phi-3.5-mini-instruct-q4f16_1-MLC` - Smallest recommended model
- `Qwen2-0.5B-Instruct-q4f16_1-MLC` - If available, even smaller
- Avoid models > 1.5B parameters on devices with < 1GB VRAM

## Troubleshooting

### GPU Crashes
- Enable `LOW_RESOURCE_MODE=true`
- Consider `CPU_ONLY_MODE=true` for stability

### Slow Performance
- Use the smallest available models
- Reduce context window size
- Close other GPU-intensive applications

### Memory Issues
- Enable conservative memory settings
- Clear browser cache regularly
- Use single-threaded mode