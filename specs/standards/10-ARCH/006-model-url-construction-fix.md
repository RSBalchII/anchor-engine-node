# Standard 006: Model URL Construction for MLC-LLM Compatibility

## What Happened?
The Anchor Console (`chat.html`) failed to load models with the error "TypeError: Failed to construct 'URL': Invalid URL", while the Anchor Mic (`anchor-mic.html`) loaded models successfully. The issue was that MLC-LLM library expects to access local models using the HuggingFace URL pattern (`/models/{model}/resolve/main/{file}`) but the actual model files are stored in local directories with different structure.

## The Cost
- 4+ hours debugging model loading failures
- Confusion between working and failing components
- Inconsistent model loading across different UI components
- User frustration with non-functional chat interface
- Multiple failed attempts with different URL construction approaches

## The Rule
1. **URL Redirect Endpoint**: Implement `/models/{model_name}/resolve/main/{file_path}` endpoint to redirect MLC-LLM requests to local model files:
   ```python
   @app.get("/models/{model_name}/resolve/main/{file_path:path}")
   async def model_resolve_redirect(model_name: str, file_path: str):
       import os
       from fastapi.responses import FileResponse, JSONResponse

       models_base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
       actual_path = os.path.join(models_base, model_name, file_path)

       if os.path.exists(actual_path) and os.path.isfile(actual_path):
           return FileResponse(actual_path)
       else:
           return JSONResponse(status_code=404, content={
               "error": f"File {file_path} not found for model {model_name}"
           })
   ```

2. **Path Parameter Safety**: Avoid using problematic syntax like `:path` in route definitions that can cause server hangs; use `{param_name:path}` instead.

3. **Model File Recognition**: Recognize that MLC-LLM models use sharded parameter files (`params_shard_*.bin`) instead of single `params.json` files.

4. **Server Startup Verification**: Always verify server starts properly after adding new endpoints by testing import and basic functionality.

5. **Endpoint Precedence**: Place specific redirect endpoints before general static file mounts to ensure they're processed correctly.