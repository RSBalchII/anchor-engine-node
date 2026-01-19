
import { parentPort } from 'worker_threads';
import { getLlama, LlamaModel, LlamaEmbeddingContext } from 'node-llama-cpp';

// Worker state
let llama: any = null;
let model: LlamaModel | null = null;
let embeddingContext: LlamaEmbeddingContext | null = null;

async function init() {
    try {
        // Force CPU if EMBEDDING_GPU_LAYERS is explicitly 0
        // Access process.env properly
        const forceCpu = process.env['EMBEDDING_GPU_LAYERS'] === '0';

        if (forceCpu) {
            console.log("[Worker] EMBEDDING_GPU_LAYERS=0 detected. Disabling CUDA for this worker.");
            llama = await getLlama({
                gpu: { type: 'auto', exclude: ['cuda'] }
            });
        } else {
            llama = await getLlama();
        }

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

// Store context size for truncation
let contextSize = 2048; // Default

async function handleLoadModel(data: { modelPath: string, options: any }) {
    if (!llama) await init();

    if (embeddingContext) { await embeddingContext.dispose(); embeddingContext = null; }
    if (model) { await model.dispose(); model = null; }

    try {
        // Update context size from options
        if (data.options?.contextSize) {
            contextSize = data.options.contextSize;
            console.log(`[Worker] Setting embedding context size to: ${contextSize}`);
        }

        model = await llama.loadModel({
            modelPath: data.modelPath
        });

        if (!model) throw new Error("Model failed to load");

        embeddingContext = await model.createEmbeddingContext({
            contextSize: contextSize,
            batchSize: data.options?.batchSize
        });

        parentPort?.postMessage({ type: 'modelLoaded', modelPath: data.modelPath });
    } catch (error: any) {
        parentPort?.postMessage({ type: 'error', error: error.message });
    }
}

// Handler for Single Embedding
async function handleGetEmbedding(data: { text: string }) {
    if (!embeddingContext) throw new Error("Embedding Context not initialized");

    try {
        // Truncate to safe limit (approx 1.2 chars per token to be safe for dense code/base64)
        // e.g. 2048 tokens -> 2457 chars.
        const safeLimit = Math.floor(contextSize * 1.2);

        if (data.text.length > safeLimit) {
            // Only log if it's significantly over
            console.warn(`[Worker] Truncating single input: ${data.text.length} -> ${safeLimit}`);
        }

        const safeText = data.text.length > safeLimit ? data.text.substring(0, safeLimit) : data.text;

        const embedding = await embeddingContext.getEmbeddingFor(safeText);
        parentPort?.postMessage({ type: 'embeddingResponse', data: Array.from(embedding.vector) });
    } catch (e: any) {
        throw new Error(`Embedding Generation Failed: ${e.message}`);
    }
}

// Handler for Batch Embeddings
async function handleGetEmbeddings(data: { texts: string[] }) {
    if (!embeddingContext) throw new Error("Embedding Context not initialized");

    try {
        if (!data.texts || !Array.isArray(data.texts)) {
            throw new Error("Invalid data.texts: expected array");
        }

        const embeddings: number[][] = [];
        const safeLimit = Math.floor(contextSize * 1.2);

        for (let i = 0; i < data.texts.length; i++) {
            const text = data.texts[i];
            try {
                if (typeof text !== 'string') {
                    console.error(`[Worker] Invalid text at index ${i}:`, text);
                    embeddings.push([]);
                    continue;
                }

                // Truncate
                let safeText = text;
                if (text.length > safeLimit) {
                    // console.warn(`[Worker] Truncating batch input ${i}: ${text.length} -> ${safeLimit}`);
                    safeText = text.substring(0, safeLimit);
                }

                const embedding = await embeddingContext.getEmbeddingFor(safeText);
                embeddings.push(Array.from(embedding.vector));
            } catch (innerErr: any) {
                console.error(`[Worker] Failed to embed text at index ${i} ("${text?.substring(0, 20)}..."): ${innerErr.message}`);
                // Fallback: push empty vector (handled by refiner)
                embeddings.push([]);
            }
        }
        parentPort?.postMessage({ type: 'embeddingsGenerated', data: embeddings });
    } catch (e: any) {
        throw new Error(`Batch Embedding Generation Failed: ${e.message}`);
    }
}

async function handleDispose() {
    if (embeddingContext) await embeddingContext.dispose();
    if (model) await model.dispose();
    parentPort?.postMessage({ type: 'disposed' });
}

init();
