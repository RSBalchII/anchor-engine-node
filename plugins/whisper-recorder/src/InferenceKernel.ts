import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

/**
 * InferenceKernel (WebGPU/WASM Edition)
 * Uses @mlc-ai/web-llm (MLC) to run LLM inference.
 * 
 * Note: Running this in Node.js requires a WebGPU implementation.
 * In a standard Node environment without a browser, this might fallback or fail 
 * unless 'tvmjs' / 'navigator.gpu' polyfills are active.
 * 
 * If running in Electron (Renderer), this works natively.
 * If running in pure Node, it assumes environment compatibility.
 */
export class InferenceKernel {
    private engine: MLCEngine | null = null;

    constructor(private modelId: string = "Llama-3.1-8B-Instruct-q4f32_1-MLC") { }

    async init() {
        console.log(`[Kernel] Initializing WebLLM for: ${this.modelId}`);
        try {
            // CreateEngine automatically selects the best available backend (WebGPU if available, or WASM fallback)
            this.engine = await CreateMLCEngine(this.modelId, {
                initProgressCallback: (report) => {
                    console.log(`[Kernel] Loading: ${report.text}`);
                }
            });
            console.log(`[Kernel] WebLLM Engine Ready.`);
        } catch (e) {
            console.error(`[Kernel] Initialization Failed (WebGPU missing?):`, e);
            throw e;
        }
    }

    async chat(message: string): Promise<string> {
        if (!this.engine) throw new Error("Kernel not initialized");

        const messages = [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: message }
        ];

        const reply = await this.engine.chat.completions.create({
            messages: messages as any
        });

        return reply.choices[0].message.content || "";
    }

    /**
     * Transcribe via Kernel?
     * Current Architecture separates Transcriber (Whisper/Transformers.js) from Kernel (LLM/WebLLM).
     * This method delegates or throws.
     */
    async transcribe(audioPath: string): Promise<string> {
        throw new Error("Transcribe is handled by the sibling Transcriber class (Transformers.js).");
    }
}
