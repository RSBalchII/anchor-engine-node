# How to Convert Custom Models for WebGPU (WebLLM)

Your `webgpu-chat.html` uses **WebLLM** (by MLC AI), which requires models to be in a specific **MLC Format** (compiled for TVM runtime). It **cannot** load raw `.safetensors`, `.bin`, or `.onnx` files directly.

## 1. Can I use Ministral-3-14B?
**Yes, but with caveats:**
1.  **Conversion Required:** You must convert the Hugging Face weights to MLC format.
2.  **Architecture Risk:** Ministral 3 is a very new architecture (`Mistral3ForConditionalGeneration`). If `mlc_llm` does not yet support this specific architecture class, conversion might fail or require a "hack" (treating it as standard Mistral).
3.  **VRAM:** A 14B model in 4-bit quantization (`q4f16_1`) will take ~8-9GB of VRAM. Your RTX 4090 (24GB) handles this easily, but browser limits might apply.

## 2. Prerequisites
You need a Python environment with `mlc_llm` installed.

```powershell
# Create a new conda env or venv recommended
pip install --pre --force-reinstall mlc-llm-nightly-cu122 mlc-ai-nightly-cu122 -f https://mlc.ai/wheels
# OR standard install (might lag behind on new architectures)
pip install mlc-llm
```

## 3. Conversion Steps

### Step A: Download the Model
Download `mistralai/Ministral-3-14B-Instruct-2512` to a local folder (e.g., `models/Ministral-3-14B`).

### Step B: Convert Weights
Run the conversion command. We recommend `q4f16_1` (4-bit quantization) for the best balance of speed/memory in the browser.

```powershell
mlc_llm convert_weight ./models/Ministral-3-14B ^
    --quantization q4f16_1 ^
    -o ./dist/Ministral-3-14B-MLC
```

### Step C: Generate Config
```powershell
mlc_llm gen_config ./models/Ministral-3-14B ^
    --quantization q4f16_1 ^
    --convention mistral ^
    -o ./dist/Ministral-3-14B-MLC
```
*Note: If `mlc_llm` complains about the architecture, you might need to edit the model's `config.json` to change `architectures` from `["Mistral3ForConditionalGeneration"]` to `["MistralForCausalLM"]` temporarily, assuming the text backbone is compatible.*

### Step D: Serve the Model
WebLLM needs to fetch the model files via HTTP.
1.  Host the `./dist/Ministral-3-14B-MLC` folder on a local web server (CORS enabled) or upload to Hugging Face.
2.  If hosting locally:
    ```powershell
    python -m http.server 8000 --directory ./dist
    ```

## 4. Loading in WebGPU Chat
1.  Open `webgpu-chat.html`.
2.  Select **"Custom"** in the dropdown.
3.  Enter the Model ID.
    *   If uploaded to HF: `username/Ministral-3-14B-MLC-q4f16_1`
    *   If local: You'll need to modify `webgpu-chat.html` to point to your local server URL instead of the default MLC CDN, or add a full entry to the `appConfig`.

## 5. Troubleshooting "Ministral 3"
Since this model has a **Vision Encoder**, standard LLM conversion might strip the vision capabilities or fail.
*   **Text-Only:** If you just want the text capabilities, the "hack" of renaming the architecture to `MistralForCausalLM` often works if the tensor shapes match standard Mistral.
*   **Vision:** WebLLM supports vision (e.g., Llava), but Ministral's specific vision encoder might need a custom implementation in MLC.

## 6. Important: Version Matching
We have pinned `webgpu-chat.html` to use **WebLLM v0.2.48** to ensure compatibility with existing older models (like Llama 3).

**If you convert a NEW model using the latest `mlc_llm`:**
1.  It will likely require the **latest** WebLLM JS library.
2.  You will need to edit `webgpu-chat.html` and change:
    ```javascript
    import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm@0.2.48";
    ```
    to:
    ```javascript
    import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm"; // Latest
    ```

## Alternative: Bridge Mode
Since you have a 4090, you can run the model in **Python** (using vLLM or Transformers) and use the **WebGPU Bridge** to talk to it.
1.  Run `start_llm_server.py` (configured for Ministral).
2.  In `webgpu-chat.html`, uncheck "Use WebGPU" (if implemented) or use the "Bridge" mode to offload inference to your Python server.
