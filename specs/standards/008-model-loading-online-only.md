# Standard 008: Model Loading - Online-Only Approach for Browser Implementation

## What Happened?
The Anchor Console (`chat.html`) was experiencing failures when attempting to load models using a complex local file resolution approach that tried to check for local model files using the `/models/{model}/resolve/main/` pattern, download models through the bridge if not found locally, and use complex multi-model configurations. Meanwhile, `anchor-mic.html` worked perfectly with the same models using a direct online URL approach.

The issue was in the complex model loading approach in `chat.html` that attempted to use local model files with bridge downloads, creating a problematic flow that caused the loading process to fail for most models.

## The Cost
- All models showing as unavailable in API tests
- Confusion between working and failing components
- Inconsistent model loading across different UI components
- User frustration with limited model availability
- Time wasted on attempting to fix complex local model resolution logic
- Delayed development due to complex debugging of the local file + bridge download approach

## The Rule
1. **Online-Only Model Loading**: For reliable model loading in browser implementations, use direct online URLs instead of complex local file resolution:
   ```javascript
   // Use direct HuggingFace URLs like anchor-mic.html
   const appConfig = {
       model_list: [{
           model: window.location.origin + "/models/" + selectedModelId, // This will redirect to online source
           model_id: selectedModelId,
           model_lib: modelLib,  // WASM library URL
           // ... other config
       }],
       useIndexedDBCache: false, // Disable caching to prevent issues
   };
   ```

2. **Simplified Configuration**: Use the same straightforward approach as `anchor-mic.html` instead of complex multi-model configurations with local file resolution.

3. **URL Format Consistency**: Ensure all models use the same URL format pattern to avoid configuration mismatches.

4. **Fallback to Working Patterns**: When debugging model loading issues, compare with known working implementations (like `anchor-mic.html`) and adopt their patterns.

5. **Bridge Redirect Endpoint**: Ensure the `/models/{model_name}/resolve/main/{file_path}` endpoint properly redirects to online sources when local files don't exist.