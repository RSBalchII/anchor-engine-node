// --- CACHE OVERRIDE: Prevent Cache API usage in worker thread ---
// This is critical for WebLLM to work in environments with strict cache policies
if ('caches' in self) {
    try {
        // Override the Cache API to prevent WebLLM from using it in the worker
        const originalAdd = Cache.prototype.add;
        const originalAddAll = Cache.prototype.addAll;
        const originalPut = Cache.prototype.put;

        Cache.prototype.add = function(request) {
            console.warn("Worker: Cache.add blocked by Root Coda security override");
            return Promise.resolve();
        };

        Cache.prototype.addAll = function(requests) {
            console.warn("Worker: Cache.addAll blocked by Root Coda security override");
            return Promise.resolve();
        };

        Cache.prototype.put = function(request, response) {
            console.warn("Worker: Cache.put blocked by Root Coda security override");
            return Promise.resolve();
        };

        console.log("🛡️ Worker: Cache API overridden to prevent tracking prevention errors");
    } catch (e) {
        console.warn("Worker: Could not override Cache API:", e);
    }
}

import { WebWorkerMLCEngineHandler, MLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// The handler bridges messages between the Main Thread and the Engine
const engine = new MLCEngine();
const handler = new WebWorkerMLCEngineHandler(engine);

self.onmessage = (msg) => {
    handler.onmessage(msg);
};