# Standard 007: Model Loading Transition - Online-Only Implementation

## What Happened?
The Anchor Console (`chat.html`) was experiencing hangs during model loading after GPU configuration, while the Anchor Mic (`anchor-mic.html`) worked perfectly with the same models. The issue was in the complex model loading approach in `chat.html` that attempted to use local model files with bridge downloads, creating a problematic flow that caused the loading process to stall after GPU initialization.

The old implementation in `chat.html` was trying to:
1. Check for local model files using the `/models/{model}/resolve/main/` pattern
2. Download models through the bridge if not found locally
3. Use a complex configuration with multiple model entries and local file resolution

This approach was causing the loading process to hang after the GPU configuration step, preventing models from loading properly.

## The Cost
- Hours spent debugging model loading failures in `chat.html`
- Confusion between working and failing components (anchor-mic.html vs chat.html)
- Inconsistent model loading across different UI components
- User frustration with non-functional chat interface
- Time wasted on attempting to fix complex local model resolution logic
- Delayed development due to complex debugging of the local file + bridge download approach

## The Rule
1. **Online-Only Model Loading**: For reliable model loading, use direct online URLs instead of complex local file resolution:
   ```javascript
   // Use direct HuggingFace URLs like anchor-mic.html
   const appConfig = {
       model_list: [{
           model: "https://huggingface.co/" + selectedModelId + "/resolve/main/",
           model_id: selectedModelId,
           model_lib: modelLib,  // WASM library URL
           // ... other config
       }],
       useIndexedDBCache: false, // Disable caching to prevent issues
   };
   ```

2. **Simplified Configuration**: Use the same straightforward approach as `anchor-mic.html` instead of complex multi-model configurations with local file resolution.

3. **Archive Complex Logic**: When a complex model loading approach fails, archive it for future reference while implementing a working solution: