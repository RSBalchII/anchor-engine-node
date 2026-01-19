import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODELS_DIR } from '../../config/paths.js';
import config from '../../config/index.js';

// Global State
let clientWorker: Worker | null = null;
let embeddingWorker: Worker | null = null;
let orchestratorWorker: Worker | null = null;
let currentChatModelName = "";
let currentEmbeddingModelName = "";
let currentOrchestratorModelName = "";

// Embedding wrapper to abstract whether we are using shared or dedicated worker
// If config.MODELS.EMBEDDING.PATH is null, this will just point to clientWorker
let activeEmbeddingWorker: Worker | null = null;

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHAT_WORKER_PATH = path.resolve(__dirname, '../../core/inference/ChatWorker.js');
const EMBEDDING_WORKER_PATH = path.resolve(__dirname, '../../core/inference/EmbeddingWorker.js');
const HYBRID_WORKER_PATH = path.resolve(__dirname, '../../core/inference/llamaLoaderWorker.js');

// ... (rest of imports)

export interface LoadModelOptions {
  ctxSize?: number;
  batchSize?: number;
  systemPrompt?: string;
  gpuLayers?: number;
}

// Queue for embeddings ... (unchanged)
interface EmbeddingQueueItem {
  type: 'batch';
  data: string[];
  resolve: (value: number[][] | PromiseLike<number[][] | null> | null) => void;
  reject: (reason?: any) => void;
}
const embeddingQueue: EmbeddingQueueItem[] = [];
let isProcessingEmbeddings = false;

// Initialize workers based on configuration
export async function initWorker() {
  const useDedicatedEmbedding = !!config.MODELS.EMBEDDING.PATH;

  if (useDedicatedEmbedding) {
    // Dedicated Mode: Specialized Workers
    if (!clientWorker) {
      clientWorker = await spawnWorker("ChatWorker", CHAT_WORKER_PATH, {
        gpuLayers: config.MODELS.MAIN.GPU_LAYERS
      });
    }
    // Only spawn embedding worker if we have a path
    if (!embeddingWorker) {
      embeddingWorker = await spawnWorker("EmbeddingWorker", EMBEDDING_WORKER_PATH, {
        gpuLayers: config.MODELS.EMBEDDING.GPU_LAYERS,
        forceCpu: config.MODELS.EMBEDDING.GPU_LAYERS === 0
      });
    }
    activeEmbeddingWorker = embeddingWorker;
  } else {
    // Shared Mode: Hybrid Worker (Legacy)
    if (!clientWorker) {
      clientWorker = await spawnWorker("HybridWorker", HYBRID_WORKER_PATH, {
        gpuLayers: config.MODELS.MAIN.GPU_LAYERS
      });
    }
    activeEmbeddingWorker = clientWorker;
  }

  // Spawn Orchestrator (Side Channel) Worker - CPU Optimized
  if (!orchestratorWorker) {
    orchestratorWorker = await spawnWorker("OrchestratorWorker", CHAT_WORKER_PATH, {
      gpuLayers: config.MODELS.ORCHESTRATOR.GPU_LAYERS,
      forceCpu: config.MODELS.ORCHESTRATOR.GPU_LAYERS === 0
    });
  }

  return clientWorker;
}

async function spawnWorker(name: string, workerPath: string, workerData: any = {}): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const w = new Worker(workerPath, { workerData });
    w.on('message', (msg) => {
      if (msg.type === 'ready') resolve(w);
      if (msg.type === 'error') console.error(`[${name}] Error:`, msg.error);
    });
    w.on('error', (err) => {
      console.error(`[${name}] Thread Error:`, err);
      reject(err);
    });
    w.on('exit', (code) => {
      if (code !== 0) console.error(`[${name}] Stopped with exit code ${code}`);
    });
  });
}

// Lock for initAutoLoad
let initPromise: Promise<void> | null = null;

// Auto-loader for Engine Start
export async function initAutoLoad() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("[Provider] Auto-loading configured models...");

    try {
      await initWorker();

      // Load Chat Model
      await loadModel(config.MODELS.MAIN.PATH, {
        ctxSize: config.MODELS.MAIN.CTX_SIZE,
        gpuLayers: config.MODELS.MAIN.GPU_LAYERS
      }, 'chat');

      // Load Orchestrator Model
      await loadModel(config.MODELS.ORCHESTRATOR.PATH, {
        ctxSize: config.MODELS.ORCHESTRATOR.CTX_SIZE,
        gpuLayers: config.MODELS.ORCHESTRATOR.GPU_LAYERS
      }, 'orchestrator');

      // Load Embedding Model (if dedicated)
      if (config.MODELS.EMBEDDING.PATH && activeEmbeddingWorker !== clientWorker) {
        await loadModel(config.MODELS.EMBEDDING.PATH, {
          ctxSize: config.MODELS.EMBEDDING.CTX_SIZE,
          gpuLayers: config.MODELS.EMBEDDING.GPU_LAYERS
        }, 'embedding');
      } else if (!config.MODELS.EMBEDDING.PATH) {
        // If shared, we rely on the main model having an embedding context
        // The worker creates 'embeddingContext' automatically in handleLoadModel
        console.log("[Provider] Using Main Model for Embeddings (Shared Mode).");
        currentEmbeddingModelName = config.MODELS.MAIN.PATH;
      }

    } catch (e) {
      console.error("[Provider] Auto-load failed:", e);
      // Reset promise on failure to allow retry
      initPromise = null;
      throw e;
    }
  })();

  return initPromise;
}

// Model Loading Logic
// Updated to target specific workers
let chatLoadingPromise: Promise<any> | null = null;
let embedLoadingPromise: Promise<any> | null = null;
let orchLoadingPromise: Promise<any> | null = null;

export async function loadModel(modelPath: string, options: LoadModelOptions = {}, target: 'chat' | 'embedding' | 'orchestrator' = 'chat') {
  if (!clientWorker) await initWorker();

  let targetWorker = clientWorker;
  if (target === 'embedding') targetWorker = activeEmbeddingWorker;
  if (target === 'orchestrator') targetWorker = orchestratorWorker;

  if (!targetWorker) throw new Error("Worker not initialized");

  // Check if already loaded
  if (target === 'chat' && modelPath === currentChatModelName) return { status: "ready" };
  if (target === 'embedding' && modelPath === currentEmbeddingModelName) return { status: "ready" };
  if (target === 'orchestrator' && modelPath === currentOrchestratorModelName) return { status: "ready" };

  // Prevent parallel loads for *same target*
  if (target === 'chat' && chatLoadingPromise) return chatLoadingPromise;
  if (target === 'embedding' && embedLoadingPromise) return embedLoadingPromise;
  if (target === 'orchestrator' && orchLoadingPromise) return orchLoadingPromise;

  const loadTask = new Promise((resolve, reject) => {
    const fullModelPath = path.isAbsolute(modelPath) ? modelPath : path.join(MODELS_DIR, modelPath);

    const handler = (msg: any) => {
      if (msg.type === 'modelLoaded') {
        console.log(`[Provider] ${target} Model loaded: ${modelPath}`);
        targetWorker!.off('message', handler);
        if (target === 'chat') {
          currentChatModelName = modelPath;
          chatLoadingPromise = null;
        } else if (target === 'embedding') {
          currentEmbeddingModelName = modelPath;
          embedLoadingPromise = null;
        } else {
          currentOrchestratorModelName = modelPath;
          orchLoadingPromise = null;
        }
        resolve({ status: "success" });
      } else if (msg.type === 'error') {
        targetWorker!.off('message', handler);
        if (target === 'chat') chatLoadingPromise = null;
        else if (target === 'embedding') embedLoadingPromise = null;
        else orchLoadingPromise = null;
        reject(new Error(msg.error));
      }
    };

    targetWorker!.on('message', handler);
    targetWorker!.postMessage({
      type: 'loadModel',
      data: { modelPath: fullModelPath, options }
    });
  });

  if (target === 'chat') chatLoadingPromise = loadTask;
  else if (target === 'embedding') embedLoadingPromise = loadTask;
  else orchLoadingPromise = loadTask;

  return loadTask;
}

// ... Inference ...

export async function runInference(prompt: string, data: any) {
  if (!clientWorker || !currentChatModelName) throw new Error("Chat Model not loaded");
  // Stub implementation
  console.log("runInference called with", prompt.substring(0, 10), data ? "data present" : "no data");
  return null;
}

export async function runSideChannel(prompt: string, systemInstruction = "You are a helpful assistant.", options: any = {}) {
  // Use Orchestrator Worker if available, falling back to client
  let targetWorker = orchestratorWorker || clientWorker;
  let targetModel = currentOrchestratorModelName || currentChatModelName;

  if (!targetWorker || !targetModel) {
    await initAutoLoad();
    targetWorker = orchestratorWorker || clientWorker;
    targetModel = currentOrchestratorModelName || currentChatModelName;
  }

  if (!targetWorker || !targetModel) throw new Error("Orchestrator/Chat Model failed to load.");

  return new Promise((resolve, _reject) => {
    const handler = (msg: any) => {
      if (msg.type === 'chatResponse') {
        targetWorker?.off('message', handler);
        resolve(msg.data);
      } else if (msg.type === 'error') {
        targetWorker?.off('message', handler);
        console.error("SideChannel Error:", msg.error);
        resolve(null);
      }
    };
    targetWorker?.on('message', handler);
    targetWorker?.postMessage({
      type: 'chat',
      data: { prompt, options: { ...options, systemPrompt: systemInstruction } }
    });
  });
}

// Embeddings - Uses activeEmbeddingWorker
export async function getEmbedding(text: string): Promise<number[] | null> {
  // For single embedding, we can just wrap it in an array and call getEmbeddings
  const result = await getEmbeddings([text]);
  return result ? result[0] : null;
}

export async function getEmbeddings(texts: string[]): Promise<number[][] | null> {
  // Ensure appropriate model is loaded
  if (!activeEmbeddingWorker || (activeEmbeddingWorker === embeddingWorker && !currentEmbeddingModelName)) {
    await initAutoLoad();
  }

  // Double check
  if (!activeEmbeddingWorker) {
    console.error("[Provider] Cannot get embeddings: Worker not init.");
    return null;
  }

  // If dedicated worker, check strict name. If shared, check chat name.
  const isReady = activeEmbeddingWorker === embeddingWorker
    ? !!currentEmbeddingModelName
    : !!currentChatModelName;

  if (!isReady) {
    console.error("[Provider] Cannot get embeddings: Model not loaded.");
    return null;
  }

  return new Promise((resolve, reject) => {
    embeddingQueue.push({ type: 'batch', data: texts, resolve, reject });
    processEmbeddingQueue();
  });
}

async function processEmbeddingQueue() {
  if (isProcessingEmbeddings || embeddingQueue.length === 0) return;
  isProcessingEmbeddings = true;

  const item = embeddingQueue.shift();
  if (!item) {
    isProcessingEmbeddings = false;
    return;
  }

  const { data: texts, resolve, reject } = item;

  // Use activeEmbeddingWorker
  const worker = activeEmbeddingWorker;

  if (!worker) {
    reject(new Error("Worker vanished"));
    isProcessingEmbeddings = false;
    processEmbeddingQueue();
    return;
  }

  const handler = (msg: any) => {
    if (msg.type === 'embeddingsGenerated') {
      worker.off('message', handler);
      clearTimeout(timeoutId);
      console.log(`[Provider] Batch processed in ${(Date.now() - startTime)}ms`);
      resolve(msg.data);
      isProcessingEmbeddings = false;
      processEmbeddingQueue();
    } else if (msg.type === 'error') {
      worker.off('message', handler);
      clearTimeout(timeoutId);
      console.error("Embedding Error:", msg.error);
      resolve(null);
      isProcessingEmbeddings = false;
      processEmbeddingQueue();
    }
  };

  const startTime = Date.now();
  // 2 Minute Timeout Safety Valve
  const timeoutId = setTimeout(() => {
    worker.off('message', handler);
    console.error(`[Provider] Worker TIMEOUT processing batch of ${texts.length} texts after 120s.`);
    resolve(null); // Return null so Refiner skips embedding but continues
    isProcessingEmbeddings = false;
    processEmbeddingQueue();
  }, 120000);

  worker.on('message', handler);
  worker.postMessage({
    type: 'getEmbeddings',
    data: { texts }
  });
}

// Stub for now to match interface compatibility with rest of system
export async function initInference() {
  // This is called by context.ts usually to ensure model loaded
  const fs = await import('fs');
  if (!fs.existsSync(MODELS_DIR)) return null;
  try {
    const models = fs.readdirSync(MODELS_DIR).filter((f: string) => f.endsWith(".gguf"));
    if (models.length > 0) {
      return await loadModel(models[0]);
    }
  } catch (e) { console.error("Error listing models", e); }
  return null;
}

export function getSession() { return null; } // Worker handles session
export function getContext() { return null; }
export function getModel() { return null; }
export function getCurrentModelName() { return currentChatModelName; }
export function getCurrentCtxSize() { return config.MODELS.MAIN.CTX_SIZE; }

// Legacy/Unused exports needed to satisfy imports elsewhere until refactored
export const DEFAULT_GPU_LAYERS = config.MODELS.MAIN.GPU_LAYERS;
export async function listModels(customDir?: string) {
  const fs = await import('fs');
  const targetDir = customDir ? path.resolve(customDir) : MODELS_DIR;
  if (!fs.existsSync(targetDir)) return [];
  return fs.readdirSync(targetDir).filter((f: string) => f.endsWith(".gguf"));
}