# WebGPU Issues on Snapdragon/XPS13 Devices

This document explains how to handle WebGPU adapter issues on Snapdragon-based devices like the XPS13.

## The Issue

On Snapdragon/XPS13 devices, you may encounter this error:
```
Load Failed: No WebGPU Adapter found. This often happens after a GPU crash. Please RESTART YOUR BROWSER or check for driver updates.
```

This occurs because:
- The Adreno GPU in Snapdragon processors has limited WebGPU support
- The WebGPU implementation may not be available in all browser contexts
- Power management settings may disable GPU acceleration

## Solutions

### 1. Use CPU-Only Mode
Set the environment variable before starting:
```cmd
set CPU_ONLY_MODE=true
start-anchor.bat
```

### 2. Browser Launch Parameters
The system now includes conservative GPU parameters for Snapdragon devices:
- `--force-low-power-gpu` - Forces low-power GPU mode
- `--disable-gpu-driver-workarounds` - Bypasses problematic driver workarounds
- `--max-active-webgl-contexts=1` - Limits GPU context usage

### 3. Alternative Models
Consider using models that are more CPU-friendly:
- Use smaller models (0.5B or 1.5B parameters)
- Use quantized models (q4f16_1 format)

### 4. Manual Browser Settings
If launching manually:
1. Open Edge/Chrome with `--enable-unsafe-webgpu --force-low-power-gpu`
2. Navigate to `edge://flags` or `chrome://flags`
3. Enable "Unsafe WebGPU" experiment
4. Restart browser

## Error Handling

The system now handles WebGPU errors gracefully by:
- Providing informative error messages
- Suggesting alternative solutions
- Continuing to operate where possible

## Future Improvements

We're working on:
- CPU-based fallback models for unsupported GPUs
- Better hardware detection and automatic configuration
- Optimized parameters for ARM-based processors