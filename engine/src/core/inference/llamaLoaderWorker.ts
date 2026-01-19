
import { parentPort } from 'worker_threads';
import { getLlama, LlamaChatSession, LlamaContext, LlamaModel, LlamaEmbeddingContext } from 'node-llama-cpp';

// Worker state
let llama: any = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;
let embeddingContext: LlamaEmbeddingContext | null = null; // Dedicated for embeddings

async function init() {
    try {
        llama = await getLlama();
        parentPort?.postMessage({ type: 'ready' });
    } catch (error: any) {
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
        parentPort?.postMessage({ type: 'error', error: error.message });
    }
});

// ... (handleLoadModel, handleChat existing code)
async function handleLoadModel(data: { modelPath: string, options: any }) {
    if (!llama) await init();

    if (model) {
        try { await model.dispose(); } catch (e) { }
    }
    if (context) {
        try { await context.dispose(); } catch (e) { }
    }
    if (embeddingContext) {
        try { await embeddingContext.dispose(); } catch (e) { }
    }

    try {
        model = await llama.loadModel({
            modelPath: data.modelPath,
            gpuLayers: data.options.gpuLayers || 0
        });

        context = await model!.createContext({
            contextSize: data.options.contextSize || 4096,
            batchSize: data.options.contextSize || 4096
        });

        // Initialize dedicated embedding context
        // Critical: If this fails, we must fail the model load so the provider knows.
        embeddingContext = await model!.createEmbeddingContext({
            contextSize: data.options.contextSize || 2048,
            batchSize: data.options.contextSize || 2048
        });

        session = new LlamaChatSession({
            contextSequence: context!.getSequence(),
            systemPrompt: data.options.systemPrompt || "You are a helpful assistant."
        });

        parentPort?.postMessage({ type: 'modelLoaded', data: { modelPath: data.modelPath } });
    } catch (error: any) {
        throw new Error(`Failed to load model: ${error.message}`);
    }
}

async function handleChat(data: { prompt: string, options: any }) {
    if (!session) throw new Error("Session not initialized");

    const response = await session.prompt(data.prompt, {
        temperature: data.options.temperature || 0.7,
        maxTokens: data.options.maxTokens || 1024
    });

    parentPort?.postMessage({ type: 'chatResponse', data: response });
}

// Handler for Single Embedding
async function handleGetEmbedding(data: { text: string }) {
    if (!embeddingContext) throw new Error("Embedding Context not initialized");

    try {
        const embedding = await embeddingContext.getEmbeddingFor(data.text);
        parentPort?.postMessage({ type: 'embeddingResponse', data: Array.from(embedding.vector) });
    } catch (e: any) {
        throw new Error(`Embedding Generation Failed: ${e.message}`);
    }
}

// Handler for Batch Embeddings
async function handleGetEmbeddings(data: { texts: string[] }) {
    if (!embeddingContext) throw new Error("Embedding Context not initialized");

    try {
        // console.log(`[Worker] Processing batch of ${data.texts?.length} texts`);
        if (!data.texts || !Array.isArray(data.texts)) {
            throw new Error("Invalid data.texts: expected array");
        }

        const embeddings: number[][] = [];
        for (let i = 0; i < data.texts.length; i++) {
            const text = data.texts[i];
            try {
                if (typeof text !== 'string') {
                    console.error(`[Worker] Invalid text at index ${i}:`, text);
                    embeddings.push([]); // Push empty embedding for invalid input
                    continue;
                }
                const embedding = await embeddingContext.getEmbeddingFor(text);
                embeddings.push(Array.from(embedding.vector));
            } catch (innerErr: any) {
                console.error(`[Worker] Failed to embed text at index ${i} ("${text?.substring(0, 20)}..."): ${innerErr.message}`);
                // Fallback: push zero vector or empty (handled by refiner)
                // Based on refiner logic: if (batchEmbeddings && batchEmbeddings[j] && batchEmbeddings[j].length > 0)
                embeddings.push([]);
            }
        }
        parentPort?.postMessage({ type: 'embeddingsGenerated', data: embeddings });
    } catch (e: any) {
        throw new Error(`Batch Embedding Generation Failed: ${e.message}`);
    }
}

async function handleDispose() {
    if (session) session.dispose();
    if (context) await context.dispose();
    if (embeddingContext) await embeddingContext.dispose();
    if (model) await model.dispose();
    parentPort?.postMessage({ type: 'disposed' });
}

// Start init
init();
