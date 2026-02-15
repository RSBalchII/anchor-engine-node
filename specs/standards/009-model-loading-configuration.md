# Standard 009: Model Loading Configuration - Bridge vs Direct Online

## What Happened?
The Anchor Console (`chat.html`) and other UI components were experiencing inconsistent model loading behavior. The system has two different model loading pathways:

1. **Bridge-based loading**: Uses `/models/{model_name}` endpoint which should redirect to local files or online sources
2. **Direct online loading**: Uses full HuggingFace URLs directly in the browser

The inconsistency occurred because:
- Some components (like `anchor-mic.html`) work with direct online URLs
- Other components (like `chat.html`) were configured for local file resolution
- The bridge redirect endpoint `/models/{model}/resolve/main/{file}` exists but may not be properly redirecting when local files don't exist

## The Cost
- Confusion about which model loading approach to use
- Inconsistent behavior across different UI components
- Models working in some components but not others
- Debugging time spent on understanding different loading mechanisms
- Users experiencing different model availability depending on which UI they use

## The Rule
1. **Consistent Model Configuration**: All UI components should use the same model loading approach:
   ```javascript
   // Recommended configuration pattern
   const modelConfig = {
       model: window.location.origin + `/models/${modelId}`,  // Will use bridge redirect
       model_id: `mlc-ai/${modelId}`,                        // Full HuggingFace ID
       model_lib: modelLib,                                  // WASM library URL
   };
   ```

2. **Bridge Redirect Logic**: The `/models/{model}/resolve/main/{file}` endpoint must:
   - First check for local files in the models directory
   - If local file doesn't exist, redirect to the corresponding HuggingFace URL:
     `https://huggingface.co/mlc-ai/{modelId}/resolve/main/{file}`

3. **Fallback Handling**: Implement proper fallback when local files are not available:
   ```javascript