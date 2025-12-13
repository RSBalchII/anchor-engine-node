# How to Find & Create WebGPU Models

Since WebGPU (WebLLM) requires a specific compiled format, you cannot just use any Hugging Face model. Here is how to find ones that work, or create your own.

## 1. Finding Existing Models
The "For Sure" way to find models is to look for the **MLC Format**.

### A. Trusted Sources
*   **[mlc-ai](https://huggingface.co/mlc-ai):** The official creators. All models here are guaranteed to work.
*   **[vulcan-llm](https://huggingface.co/vulcan-llm):** (Example) Community members often upload converted models.

### B. Search Strategy
When searching Hugging Face, look for these keywords in the model name:
*   `MLC`
*   `q4f16_1` (The standard 4-bit quantization for WebGPU)
*   `q4f32_1`

**The "Golden Rule" Check:**
Before trying a model, go to the **"Files and versions"** tab on Hugging Face.
It **MUST** contain:
1.  `ndarray-cache.json` (The manifest)
2.  `mlc-chat-config.json` (The config)
3.  `params_shard_*.bin` (The weights)

If these files are missing (like in the Vicuna model you tried), it will **not** work.

## 2. The Sovereign Way: Convert Your Own
You are absolutely right—converting them yourself is the best way to get exactly the model you want (uncensored, specific fine-tunes, etc.) and help the community.

### Why Convert?
*   **Speed:** You don't have to wait for someone else to upload the latest model.
*   **Privacy:** You control the exact weights being served.
*   **Community:** Uploading your converted models (e.g., `rsbiiw/Ministral-3-14B-MLC`) helps everyone else!

### Quick Conversion Guide
(See `WEBGPU_MODEL_CONVERSION.md` for full details)

1.  **Install:** `pip install mlc-llm`
2.  **Convert:**
    ```powershell
    mlc_llm convert_weight ./My-Model --quantization q4f16_1 -o ./dist/My-Model-MLC
    ```
3.  **Gen Config:**
    ```powershell
    mlc_llm gen_config ./My-Model --quantization q4f16_1 --convention llama3 -o ./dist/My-Model-MLC
    ```
4.  **Upload:** Upload the `./dist` folder to a new Hugging Face repo.

## 3. Recommended "Uncensored" Models (Ready to Use)
If you just want to chat right now, try these IDs in your Glass Box:

*   **Llama 3 8B Instruct (Official):** `mlc-ai/Llama-3-8B-Instruct-q4f16_1-MLC`
*   **Hermes 2 Pro (Mistral 7B):** `mlc-ai/Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC` (Note: Check if `mlc-ai` has hosted this, otherwise search for `Hermes` with `MLC` tag)
