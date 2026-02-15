
import { parentPort, workerData } from 'worker_threads';
import { getLlama, LlamaChatSession, LlamaContext, LlamaModel, LlamaGrammar } from 'node-llama-cpp';
import os from 'os';

// Worker state
let llama: any = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;
let currentSequence: any = null;

async function init() {
    if (llama) return;
    try {
        // Use workerData to force CPU, or fallback to global env
        const forceCpu = workerData?.forceCpu || process.env['LLM_GPU_LAYERS'] === '0';

        if (forceCpu) {
            console.log("[Worker] Force CPU mode detected. Disabling GPU backends.");
            llama = await getLlama({
                gpu: { type: 'auto', exclude: ['cuda', 'vulkan', 'metal'] }
            });
        } else {
            console.log("[Worker] Initializing Llama with hardware acceleration support.");
            llama = await getLlama();
        }
        parentPort?.postMessage({ type: 'ready' });
    } catch (error: any) {
        console.error("[Worker] Initialization Error:", error);
        parentPort?.postMessage({ type: 'error', error: error.message });
    }
}

parentPort?.on('message', async (message) => {
    try {
        switch (message.type) {
            case 'loadModel':
                await handleLoadModel(message.data);
                break;
            case 'chat':
                await handleChat(message.data);
                break;
            case 'dispose':
                await handleDispose();
                break;
        }
    } catch (error: any) {
        console.error("[Worker] Message Handling Error:", error);
        parentPort?.postMessage({ type: 'error', error: error.message });
    }
});

async function handleLoadModel(data: { modelPath: string, options: any }) {
    if (!llama) await init();

    if (session) { session.dispose(); session = null; }
    if (currentSequence) { currentSequence.dispose(); currentSequence = null; }
    if (context) { await context.dispose(); context = null; }
    if (model) { await model.dispose(); model = null; }

    try {
        console.log(`[Worker] Loading model: ${data.modelPath} (gpuLayers: ${data.options.gpuLayers || 0})`);
        model = await llama.loadModel({
            modelPath: data.modelPath,
            gpuLayers: data.options.gpuLayers || 0
        });

        const ctxSize = data.options.ctxSize || 4096;
        const threads = Math.max(1, Math.floor(os.cpus().length / 2));
        console.log(`[Worker] Creating context: ${ctxSize} tokens, ${threads} threads`);

        context = await model!.createContext({
            contextSize: ctxSize,
            batchSize: 128, // Smaller batch for smoother CPU pre-fill
            sequences: 4,   // Bump to 4 to handle high concurrency (e.g. Discovery + Infection + Search)
            threads
        });

        // Pre-allocate minimal sequences to avoid runtime allocation lag
        currentSequence = context.getSequence();
        session = new LlamaChatSession({
            contextSequence: currentSequence,
            systemPrompt: data.options.systemPrompt || "You are a helpful assistant."
        });

        parentPort?.postMessage({ type: 'modelLoaded', data: { modelPath: data.modelPath } });
    } catch (error: any) {
        throw new Error(`Failed to load Chat Model: ${error.message}`);
    }
}

async function handleChat(data: { prompt: string, options: any }) {
    if (!context) throw new Error("Context not initialized");

    if (data.options.systemPrompt || !session) {
        if (session) session.dispose();
        if (currentSequence) currentSequence.dispose();

        currentSequence = context.getSequence();
        session = new LlamaChatSession({
            contextSequence: currentSequence,
            systemPrompt: data.options.systemPrompt || "You are a helpful assistant."
        });
    }

    console.log(`[Worker] Chat Request Received. Pre-filling prompt (${data.prompt.length} chars)...`);

    // Compile Grammar if provided
    let grammar: LlamaGrammar | undefined;
    if (data.options.grammar) {
        try {
            console.log("[Worker] Compiling GBNF Grammar...");
            grammar = new LlamaGrammar(llama, {
                grammar: data.options.grammar
            });
        } catch (e: any) {
            console.error("[Worker] Grammar Compilation Failed:", e);
        }
    }

    let tokensReceived = 0;

    try {
        const response = await session.prompt(data.prompt, {
            temperature: data.options.temperature ?? 0.7,
            maxTokens: data.options.maxTokens || 2048,
            grammar, // Pass the grammar
            onTextChunk: (chunk: string) => {
                if (tokensReceived === 0) {
                    console.log(`[Worker] First token generated! Pre-fill took ${(Date.now() - startTime) / 1000}s`);
                }
                tokensReceived += chunk.length; // Approximate, as chunk is text
                parentPort?.postMessage({ type: 'token', token: chunk });
            }
        });

        console.log(`[Worker] Chat Completed. Response: ${response.length} chars.`);
        parentPort?.postMessage({ type: 'chatResponse', data: response });
    } catch (error: any) {
        console.error(`[Worker] Inference Error:`, error);
        throw error;
    }
}

const startTime = Date.now(); // Used for pre-fill timing

async function handleDispose() {
    if (session) { session.dispose(); session = null; }
    if (currentSequence) { currentSequence.dispose(); currentSequence = null; }
    if (context) { await context.dispose(); context = null; }
    if (model) await model.dispose();
    parentPort?.postMessage({ type: 'disposed' });
}

init();
