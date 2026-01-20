import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import wav from 'wav'; // Used to read WAV headers if needed, but transformers handles paths

// Configure cache to avoid re-downloading to user home
env.localModelPath = path.join(process.cwd(), 'models');
env.allowRemoteModels = true;

/**
 * Transcriber (WASM/ONNX Edition)
 * Uses @xenova/transformers to run Whisper.
 */
export class Transcriber {
    private p: any = null;

    constructor(private modelName: string = 'Xenova/whisper-tiny.en') { }

    async init() {
        console.log(`[Transcriber] Loading Model: ${this.modelName}...`);
        // Define task and model
        this.p = await pipeline('automatic-speech-recognition', this.modelName, {
            quantized: true // Use INT8 quantized model for speed
        });
        console.log(`[Transcriber] Model Loaded.`);
    }

    async transcribe(wavPath: string): Promise<string> {
        if (!this.p) await this.init();

        console.log(`[Transcriber] Processing: ${wavPath}`);

        if (!fs.existsSync(wavPath)) {
            throw new Error(`File not found: ${wavPath}`);
        }

        try {
            // @xenova/transformers accepts file paths directly in Node.js
            // It uses 'wavefile' internally to parse.
            const result = await this.p(wavPath, {
                chunk_length_s: 30,
                stride_length_s: 5,
                language: 'english',
                task: 'transcribe',
                return_timestamps: true
            });

            // Result is { text: "...", chunks: [...] }
            const text = result.text.trim();

            // Save transcript
            const txtPath = wavPath.replace('.wav', '.txt');
            fs.writeFileSync(txtPath, text);
            console.log(`[Transcriber] Saved: ${txtPath}`);

            return text;

        } catch (e) {
            console.error(`[Transcriber] Error:`, e);
            throw e;
        }
    }
}
