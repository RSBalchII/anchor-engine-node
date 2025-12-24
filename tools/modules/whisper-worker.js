import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0';

// Configure for WASM
env.allowLocalModels = false;
env.useBrowserCache = true;

class WhisperWorker {
    constructor() {
        this.pipe = null;
    }

    async init() {
        if (!this.pipe) {
            console.log("[WhisperWorker] Loading model...");
            this.pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', { 
                device: 'wasm'
            });
            console.log("[WhisperWorker] Model loaded.");
        }
    }

    async transcribe(audioData) {
        if (!this.pipe) await this.init();
        
        console.log("[WhisperWorker] Processing audio...");
        const result = await this.pipe(audioData, { 
            language: 'english',
            chunk_length_s: 30,
            stride_length_s: 5
        });
        
        return result.text.trim();
    }
}

const worker = new WhisperWorker();

self.onmessage = async (e) => {
    const { type, data, id } = e.data;

    try {
        if (type === 'init') {
            await worker.init();
            self.postMessage({ type: 'init_done', id });
        } 
        else if (type === 'transcribe') {
            const text = await worker.transcribe(data);
            self.postMessage({ type: 'transcribe_result', text, id });
        }
    } catch (err) {
        self.postMessage({ type: 'error', error: err.message, id });
    }
};