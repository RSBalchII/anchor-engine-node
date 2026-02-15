
import { parentPort } from 'worker_threads';
import { getLlama, LlamaChatSession, LlamaContext, LlamaModel, LlamaEmbeddingContext } from 'node-llama-cpp';

// Worker state
let llama: any = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;
let embeddingContext: LlamaEmbeddingContext | null = null;
let currentSequence: any = null;

async function init() {
    if (llama) return;
    try {
        const systemForceCpu = process.env['LLM_GPU_LAYERS'] === '0';

        if (systemForceCpu) {
            console.log("[Worker] Global CPU-only mode detected. Disabling GPU backends.");
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

// Handle messages from main thread
parentPort?.on('message', async (message) => {
    try {
        switch (message.type) {
            case 'loadModel':
                await handleLoadModel(message.data);
                break;
            case 'chat':
                await handleChat(message.data);
                break;
            case 'getEmbedding':
                await handleGetEmbedding(message.data);
                break;
            case 'getEmbeddings':
                await handleGetEmbeddings(message.data);
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

    // Cleanup existing
    if (session) { session.dispose(); session = null; }
    if (currentSequence) { currentSequence.dispose(); currentSequence = null; }
    if (context) { await context.dispose(); context = null; }
    if (embeddingContext) { await embeddingContext.dispose(); embeddingContext = null; }
    if (model) { await model.dispose(); model = null; }

    try {
        console.log(`[Worker] Loading model: ${data.modelPath} (gpuLayers: ${data.options.gpuLayers || 0})`);
        model = await llama.loadModel({
            modelPath: data.modelPath,
            gpuLayers: data.options.gpuLayers || 0
        });

        const ctxSize = data.options.ctxSize || 4096;
        console.log(`[Worker] Creating context: ${ctxSize} tokens`);
        context = await model!.createContext({
            contextSize: ctxSize,
            batchSize: Math.min(ctxSize, 512),
            sequences: 4
        });

        // Initialize dedicated embedding context
        embeddingContext = await model!.createEmbeddingContext({
            contextSize: 2048,
            batchSize: 512
        });

        currentSequence = context.getSequence();
        session = new LlamaChatSession({
            contextSequence: currentSequence,
            systemPrompt: data.options.systemPrompt || "You are a helpful assistant."
        });

        parentPort?.postMessage({ type: 'modelLoaded', data: { modelPath: data.modelPath } });
    } catch (error: any) {
        throw new Error(`Failed to load model: ${error.message}`);
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

    console.log(`[Worker] Chat Request: ${data.prompt.length} chars. Generating response...`);
    let tokensReceived = 0;

    const response = await session.prompt(data.prompt, {
        temperature: data.options.temperature || 0.7,
        maxTokens: data.options.maxTokens || 1024,
        onToken: () => {
            tokensReceived++;
            if (tokensReceived % 20 === 0) {
                console.log(`[Worker] Activity Heartbeat: Generated ${tokensReceived} tokens...`);
            }
        }
    });

    console.log(`[Worker] Chat Completed. Response: ${response.length} chars.`);
    parentPort?.postMessage({ type: 'chatResponse', data: response });
}

async function handleGetEmbedding(data: { text: string }) {
    if (!embeddingContext) throw new Error("Embedding Context not initialized");
    try {
        const embedding = await embeddingContext.getEmbeddingFor(data.text);
        parentPort?.postMessage({ type: 'embeddingResponse', data: Array.from(embedding.vector) });
    } catch (e: any) {
        throw new Error(`Embedding Generation Failed: ${e.message}`);
    }
}

async function handleGetEmbeddings(data: { texts: string[] }) {
    if (!embeddingContext) throw new Error("Embedding Context not initialized");
    try {
        const embeddings: number[][] = [];
        for (const text of data.texts) {
            if (typeof text !== 'string') {
                embeddings.push([]);
                continue;
            }
            const embedding = await embeddingContext.getEmbeddingFor(text);
            embeddings.push(Array.from(embedding.vector));
        }
        parentPort?.postMessage({ type: 'embeddingsGenerated', data: embeddings });
    } catch (e: any) {
        throw new Error(`Batch Embedding Generation Failed: ${e.message}`);
    }
}

async function handleDispose() {
    if (session) { session.dispose(); session = null; }
    if (currentSequence) { currentSequence.dispose(); currentSequence = null; }
    if (context) { await context.dispose(); context = null; }
    if (embeddingContext) { await embeddingContext.dispose(); embeddingContext = null; }
    if (model) await model.dispose();
    parentPort?.postMessage({ type: 'disposed' });
}

init();
