
import { parentPort, workerData } from 'worker_threads';
import { getLlama, LlamaChatSession, LlamaContext, LlamaModel } from 'node-llama-cpp';

// Worker state
let llama: any = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;

async function init() {
    try {
        // Priority: workerData.forceCpu -> workerData.gpuLayers === 0 -> env.LLM_GPU_LAYERS === '0'
        const forceCpu = workerData?.forceCpu === true ||
            workerData?.gpuLayers === 0 ||
            process.env['LLM_GPU_LAYERS'] === '0';

        if (forceCpu) {
            console.log("[Worker] Force CPU/GPU_LAYERS=0 detected. Disabling CUDA for this worker.");
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
            case 'chat':
                await handleChat(message.data);
                break;
            case 'dispose':
                await handleDispose();
                break;
        }
    } catch (error: any) {
        parentPort?.postMessage({ type: 'error', error: error.message });
    }
});

async function handleLoadModel(data: { modelPath: string, options: any }) {
    if (!llama) await init();

    // Cleanup existing
    if (session) { session.dispose(); session = null; }
    if (context) { await context.dispose(); context = null; }
    if (model) { await model.dispose(); model = null; }

    try {
        model = await llama.loadModel({
            modelPath: data.modelPath,
            gpuLayers: data.options.gpuLayers || 0
        });

        // Chat Context
        context = await model!.createContext({
            contextSize: data.options.contextSize || 4096,
            batchSize: data.options.contextSize || 4096
        });

        session = new LlamaChatSession({
            contextSequence: context!.getSequence(),
            systemPrompt: data.options.systemPrompt || "You are a helpful assistant."
        });

        parentPort?.postMessage({ type: 'modelLoaded', data: { modelPath: data.modelPath } });
    } catch (error: any) {
        throw new Error(`Failed to load Chat Model: ${error.message}`);
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

async function handleDispose() {
    if (session) session.dispose();
    if (context) await context.dispose();
    if (model) await model.dispose();
    parentPort?.postMessage({ type: 'disposed' });
}

init();
