const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const paths = require('../../config/paths');
const Config = require('../../config');

let serverProcess = null;
let lastVisionError = null;
const SERVER_PORT = Config.SERVICES.VISION_SERVER_PORT;
const BIN_PATH = path.join(paths.BASE_PATH, 'engine/bin/llama-server.exe');
const MODEL_DIR = path.join(paths.BASE_PATH, 'engine/models/vision');
const VISION_CONFIG = Config.MODELS.VISION;

// Auto-detect model file
const getModelPath = () => {
    try {
        // Prioritize User's custom model from Config
        if (VISION_CONFIG.PATH) {
            // Check if absolute path
            if (fs.existsSync(VISION_CONFIG.PATH)) {
                console.log(`[Vision] Using configured path: ${VISION_CONFIG.PATH}`);
                return VISION_CONFIG.PATH;
            }
            // Check if relative to MODEL_DIR
            const relativePath = path.join(MODEL_DIR, VISION_CONFIG.PATH);
            if (fs.existsSync(relativePath)) {
                console.log(`[Vision] Using configured model (relative): ${relativePath}`);
                return relativePath;
            }
        }

        if (!fs.existsSync(MODEL_DIR)) {
            console.log(`[Vision] MODEL_DIR not found: ${MODEL_DIR}`);
            return null;
        }
        const files = fs.readdirSync(MODEL_DIR);
        const gguf = files.find(f => f.endsWith('.gguf') && !f.includes('mmproj'));
        return gguf ? path.join(MODEL_DIR, gguf) : null;
    } catch (e) {
        console.error(`[Vision] Error detecting models: ${e.message}`);
        return null;
    }
};

// Optional: detect separate projector if exists
const getMmprojPath = () => {
    try {
        // Check Config first
        if (VISION_CONFIG.PROJECTOR) {
            const configProjPath = path.isAbsolute(VISION_CONFIG.PROJECTOR)
                ? VISION_CONFIG.PROJECTOR
                : path.join(MODEL_DIR, VISION_CONFIG.PROJECTOR);

            if (fs.existsSync(configProjPath)) return configProjPath;
        }

        if (!fs.existsSync(MODEL_DIR)) return null;
        const files = fs.readdirSync(MODEL_DIR);
        const proj = files.find(f => f.includes('mmproj'));
        return proj ? path.join(MODEL_DIR, proj) : null;
    } catch (e) { return null; }
};

async function startVisionServer() {
    if (serverProcess) {
        // Double check if process is really alive, otherwise nullify
        if (serverProcess.exitCode !== null) {
            console.warn("[Vision] Process found but it has exited. Restarting...");
            serverProcess = null;
        } else {
            return;
        }
    }

    const modelPath = getModelPath();
    if (!modelPath) {
        console.warn("[Vision] No GGUF model found. Vision features disabled.");
        return;
    }

    const args = [
        '-m', modelPath,
        '--port', SERVER_PORT.toString(),
        '-c', VISION_CONFIG.CTX_SIZE.toString(),
        '--n-gpu-layers', VISION_CONFIG.GPU_LAYERS.toString(),
    ];

    // Check if separate mmproj exists
    const mmproj = getMmprojPath();
    if (mmproj) {
        args.push('--mmproj', mmproj);
    }

    console.log(`[Vision] Launching Binary Sidecar: llama-server.exe on port ${SERVER_PORT}`);
    console.log(`[Vision] Model Path: ${modelPath}`);
    if (mmproj) console.log(`[Vision] Projector Path: ${mmproj}`);

    try {
        serverProcess = spawn(BIN_PATH, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        serverProcess.stdout.on('data', (data) => {
            const msg = data.toString();
            // console.log(`[Vision Binary] ${msg}`); 
        });

        serverProcess.stderr.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('server is listening') || msg.includes('HTTP server listening')) {
                console.log(`[Vision] Sidecar Ready.`);
            }

            // Detect specific architecture errors
            if (msg.includes('unknown model architecture')) {
                lastVisionError = "Incompatible Binary: Your llama-server.exe does not support this model type (e.g. Qwen2-VL). Please update engine/bin or use a different model.";
                console.error(`[Vision Critical] ${lastVisionError}`);
            }

            // LOG ALL ERRORS
            if (msg.includes('error') || msg.includes('Error') || msg.includes('failed')) {
                console.error(`[Vision Binary Error] ${msg.trim()}`);
            }
        });

        serverProcess.on('close', (code) => {
            console.log(`[Vision] Sidecar exited with code ${code}`);
            serverProcess = null;
        });
    } catch (e) {
        console.error(`[Vision] Failed to spawn sidecar: ${e.message}`);
    }
}

function stopVisionServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

async function analyzeImage(base64Image, prompt) {
    if (!serverProcess) {
        lastVisionError = null;
        await startVisionServer();
        if (!serverProcess) throw new Error("Vision server failed to start (Mock Mode or Missing Binary).");
        // Wait for boot
        await new Promise(r => setTimeout(r, 4000)); // Fixed timeout for now, could be configurable later

        if (!serverProcess) {
            // Return the specific error if captured, otherwise generic
            throw new Error(lastVisionError || "Vision server crashed during startup.");
        }
    }

    return new Promise((resolve, reject) => {
        // Standard ChatML format for Qwen2-VL
        const payload = JSON.stringify({
            prompt: `<|im_start|>system\nYou are a helpful visual assistant. You can see the image provided. Describe it in detail.<|im_end|>\n<|im_start|>user\n<image>\n${prompt}<|im_end|>\n<|im_start|>assistant\n`,
            image_data: [{ data: base64Image, id: 12 }],
            n_predict: 400,
            temperature: 0.1,
            cache_prompt: true
        });

        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/completion',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (!data || data.trim().length === 0) {
                    return reject(new Error("Vision sidecar returned empty response. It may have crashed."));
                }
                try {
                    const json = JSON.parse(data);
                    // Standard llama-server completion response
                    resolve(json.content || json.text || String(data));
                } catch (e) {
                    // If not JSON, it might be raw text error output
                    if (data.includes('error') || data.includes('failed')) {
                        reject(new Error(`Vision sidecar error: ${data.substring(0, 100)}`));
                    } else {
                        reject(new Error(`Failed to parse vision response: ${e.message}`));
                    }
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error(`Vision Request Error: ${e.message}`));
        });

        req.write(payload);
        req.end();
    });
}

module.exports = { startVisionServer, stopVisionServer, analyzeImage };
