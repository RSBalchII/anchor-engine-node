import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { MODELS_DIR } from '../../config/paths.js';
import config from '../../config/index.js';

// --- CONFIGURATION ---
const LLM_PROVIDER = config.LLM_PROVIDER || 'local';
const REMOTE_LLM_URL = config.REMOTE_LLM_URL;
const REMOTE_MODEL_NAME = config.REMOTE_MODEL_NAME;

// Global State (Local)
let clientWorker: Worker | null = null;
let orchestratorWorker: Worker | null = null;
let currentChatModelName = "";
let currentOrchestratorModelName = "";

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveWorkerPath(relativePath: string) {
  const isDev = __dirname.includes('src');
  const ext = isDev ? '.ts' : '.js';
  return path.resolve(__dirname, relativePath + ext);
}

const CHAT_WORKER_PATH = resolveWorkerPath('../../core/inference/ChatWorker');

export interface LoadModelOptions {
  ctxSize?: number;
  batchSize?: number;
  systemPrompt?: string;
  gpuLayers?: number;
}

// --- REMOTE CLIENT ---
async function remoteChatCompletion(prompt: string, systemPrompt: string, options: any, onToken?: (token: string) => void) {
  const body = {
    model: REMOTE_MODEL_NAME,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    stream: !!onToken,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 2048
  };

  try {
    const response = await fetch(`${REMOTE_LLM_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Remote Brain Error: ${response.status} ${response.statusText}`);

    if (onToken && response.body) {
      // Streaming Mode
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.substring(6));
              const delta = json.choices[0]?.delta?.content;
              if (delta) onToken(delta);
            } catch (e) {
              /* Ignore parse errors on partial chunks */
            }
          }
        }
      }
      return ""; // Stream handled via callback
    } else {
      // Blocking Mode
      const json = await response.json();
      return json.choices[0]?.message?.content || "";
    }
  } catch (error: any) {
    console.error("❌ [Provider] Remote Inference Failed:", error.message);
    throw error;
  }
}

// --- PUBLIC API ---

export async function initWorker() {
  if (LLM_PROVIDER === 'remote') {
    console.log(`🔌 [Provider] REMOTE MODE ACTIVE. Brain at: ${REMOTE_LLM_URL}`);
    // Ping to verify
    try {
      await fetch(REMOTE_LLM_URL.replace('/v1', '/health').replace('/chat/completions', ''), { method: 'GET' }).catch(() => { });
    } catch (e) {
      console.warn("⚠️ [Provider] Remote Brain unreachable? Is the Desktop server running?");
    }
    return;
  }

  // LOCAL FALLBACK
  // TAG-WALKER MODE (Lightweight) - strictly skip embedding workers to save RAM
  if (!clientWorker) {
    console.log(`[Provider] Tag-Walker Mode Active. Spawning Chat Worker...`);
    clientWorker = await spawnWorker("ChatWorker", CHAT_WORKER_PATH, {
      gpuLayers: config.MODELS.MAIN.GPU_LAYERS,
      forceCpu: config.MODELS.MAIN.GPU_LAYERS === 0
    });
  }

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
    await initWorker();

    if (LLM_PROVIDER === 'local') {
      console.log(`[Provider] DEBUG: Loading Local Models...`);
      try {
        // Load Chat Model
        // ... (Local Loading Logic) ...
        console.log(`[Provider] Loading Main Chat Model: ${config.MODELS.MAIN.PATH}`);
        await loadModel(config.MODELS.MAIN.PATH, {
          ctxSize: config.MODELS.MAIN.CTX_SIZE,
          gpuLayers: config.MODELS.MAIN.GPU_LAYERS
        }, 'chat');

        // Load Orchestrator Model
        console.log(`[Provider] Loading Orchestrator Model: ${config.MODELS.ORCHESTRATOR.PATH}`);
        await loadModel(config.MODELS.ORCHESTRATOR.PATH, {
          ctxSize: config.MODELS.ORCHESTRATOR.CTX_SIZE,
          gpuLayers: config.MODELS.ORCHESTRATOR.GPU_LAYERS
        }, 'orchestrator');

      } catch (e) {
        console.error("[Provider] Auto-load failed:", e);
        initPromise = null;
        throw e;
      }
    }
  })();

  return initPromise;
}

// Model Loading Logic
let chatLoadingPromise: Promise<any> | null = null;
let orchLoadingPromise: Promise<any> | null = null;

export async function loadModel(modelPath: string, options: LoadModelOptions = {}, target: 'chat' | 'orchestrator' = 'chat') {
  if (LLM_PROVIDER === 'remote') return { status: "ready (remote)" };

  // ... (Local Loading Logic) ...
  console.log(`[Provider] loadModel called for: ${modelPath} [Target: ${target}]`);

  if (!clientWorker) await initWorker();

  let targetWorker = clientWorker;
  if (target === 'orchestrator') {
    targetWorker = orchestratorWorker;
    if (!targetWorker) console.warn("[Provider] Warning: Orchestrator target requested but OrchestratorWorker is null. Fallback to ClientWorker?");
  }

  if (!targetWorker) throw new Error(`Worker not initialized for target ${target}`);

  // Check if already loaded
  if (target === 'chat' && modelPath === currentChatModelName) return { status: "ready" };
  if (target === 'orchestrator' && modelPath === currentOrchestratorModelName) return { status: "ready" };

  // Prevent parallel loads for *same target*
  if (target === 'chat' && chatLoadingPromise) return chatLoadingPromise;
  if (target === 'orchestrator' && orchLoadingPromise) return orchLoadingPromise;

  const loadTask = new Promise((resolve, reject) => {
    const fullModelPath = path.isAbsolute(modelPath) ? modelPath : path.resolve(MODELS_DIR, modelPath);

    const handler = (msg: any) => {
      if (msg.type === 'modelLoaded') {
        console.log(`[Provider] ${target} Model loaded successfully: ${modelPath}`);
        targetWorker!.off('message', handler);
        if (target === 'chat') {
          currentChatModelName = modelPath;
          chatLoadingPromise = null;
        } else {
          currentOrchestratorModelName = modelPath;
          orchLoadingPromise = null;
        }
        resolve({ status: "success" });
      } else if (msg.type === 'error') {
        targetWorker!.off('message', handler);
        if (target === 'chat') chatLoadingPromise = null;
        else orchLoadingPromise = null;
        console.error(`[Provider] Worker ${target} Error:`, msg.error);
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
  else orchLoadingPromise = loadTask;

  return loadTask;
}

export async function runInference(prompt: string, data: any) {
  if (LLM_PROVIDER === 'remote') {
    // Stub for generic inference if needed, or throw
    return null;
  }
  if (!clientWorker || !currentChatModelName) throw new Error("Chat Model not loaded");
  console.log("runInference called locally");
  return null;
}

export async function runStreamingChat(
  prompt: string,
  onToken: (token: string) => void,
  systemInstruction = "You are a helpful assistant.",
  options: any = {},
  requestedModel?: string
): Promise<string> {
  if (LLM_PROVIDER === 'remote') {
    await remoteChatCompletion(prompt, systemInstruction, options, onToken);
    return ""; // Remote stream handled via callback
  }

  // Local Logic
  if (requestedModel && requestedModel !== currentChatModelName) {
    console.log(`[Provider] Requested model "${requestedModel}" differs from current "${currentChatModelName}". Loading...`);
    await loadModel(requestedModel, {
      ctxSize: options.ctxSize || config.MODELS.MAIN.CTX_SIZE,
      gpuLayers: options.gpuLayers || config.MODELS.MAIN.GPU_LAYERS
    }, 'chat');
  }

  if (!clientWorker || !currentChatModelName) {
    console.log("[Provider] Chat Model not loaded, auto-loading...");
    await initAutoLoad();
    if (!clientWorker || !currentChatModelName) throw new Error("Chat Model failed to load.");
  }

  const worker = clientWorker!;

  return new Promise((resolve, reject) => {
    let fullResponse = "";

    const handler = (msg: any) => {
      if (msg.type === 'token') {
        if (onToken) onToken(msg.token);
        fullResponse += msg.token;
      } else if (msg.type === 'chatResponse') {
        worker.off('message', handler);
        resolve(msg.data || fullResponse);
      } else if (msg.type === 'error') {
        worker.off('message', handler);
        reject(new Error(msg.error));
      }
    };

    worker.on('message', handler);
    worker.postMessage({
      type: 'chat',
      data: { prompt, options: { ...options, onToken: undefined, systemPrompt: systemInstruction } }
    });
  });
}

export async function runSideChannel(
  prompt: string,
  systemInstruction = "You are a helpful assistant.",
  options: any = {},
  requestedModel?: string
) {
  if (LLM_PROVIDER === 'remote') {
    return await remoteChatCompletion(prompt, systemInstruction, options);
  }

  // Local Logic
  const worker = orchestratorWorker || clientWorker;
  if (!worker) await initAutoLoad();

  // Retry logic (simplified from original for brevity/clarity in this patch)
  const targetWorker = orchestratorWorker || clientWorker;
  if (!targetWorker) throw new Error("Orchestrator/Chat Model failed to load.");

  return new Promise((resolve, _reject) => {
    const handler = (msg: any) => {
      if (msg.type === 'chatResponse') {
        targetWorker.off('message', handler);
        resolve(msg.data);
      } else if (msg.type === 'error') {
        targetWorker.off('message', handler);
        resolve(null);
      }
    };
    targetWorker.on('message', handler);
    const { onToken, ...workerOptions } = options;
    targetWorker.postMessage({
      type: 'chat',
      data: { prompt, options: { ...workerOptions, systemPrompt: systemInstruction } }
    });
  });
}

// Embeddings - STUBBED
export async function getEmbedding(text: string): Promise<number[] | null> {
  const result = await getEmbeddings([text]);
  return result ? result[0] : null;
}

export async function getEmbeddings(texts: string[]): Promise<number[][] | null> {
  const dim = config.MODELS.EMBEDDING_DIM || 768;
  return texts.map(() => new Array(dim).fill(0.1));
}

// Stub for now
export async function initInference() {
  console.warn("[Provider] initInference called (Legacy). BLOCKED.");
  return null;
}

export function getSession() { return null; }
export function getContext() { return null; }
export function getModel() { return null; }
export function getCurrentModelName() { return LLM_PROVIDER === 'remote' ? REMOTE_MODEL_NAME : currentChatModelName; }
export function getCurrentCtxSize() { return LLM_PROVIDER === 'remote' ? 8192 : config.MODELS.MAIN.CTX_SIZE; }

export const DEFAULT_GPU_LAYERS = config.MODELS.MAIN.GPU_LAYERS;
export async function listModels(customDir?: string) {
  const fs = await import('fs');
  const targetDir = customDir ? path.resolve(customDir) : MODELS_DIR;
  if (!fs.existsSync(targetDir)) return [];
  return fs.readdirSync(targetDir).filter((f: string) => f.endsWith(".gguf"));
}