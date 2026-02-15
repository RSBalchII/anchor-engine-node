import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Transcriber } from './transcriber.js';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const RECORDING_SCRIPT = path.join(__dirname, 'recorder.js');

async function main() {
    console.log('=== Whisper Audio Recorder ===');
    console.log('1. Press ENTER to START recording.');

    await new Promise<void>(resolve => rl.question('', () => resolve()));

    console.log('Starting Recorder...');
    const child = spawn('node', [RECORDING_SCRIPT], {
        stdio: ['ignore', 'pipe', 'inherit'] // Pipe stdout to capture filename
    });

    let capturedFile = '';

    child.stdout.on('data', (data) => {
        const line = data.toString();
        console.log(`[Recorder] ${line.trim()}`);
        // Recorder script prints "Saved: <path>" on exit
        const match = line.match(/Saved: (.+\.wav)/);
        if (match) {
            capturedFile = match[1];
        }
    });

    console.log('Recording in progress... Press ENTER to STOP.');

    await new Promise<void>(resolve => rl.question('', () => resolve()));

    console.log('Stopping Recorder...');
    child.kill('SIGINT');

    // Wait for child to exit
    await new Promise<void>(resolve => child.on('exit', () => resolve()));

    if (capturedFile && fs.existsSync(capturedFile.trim())) {
        console.log(`\nAnalyzing Audio: ${capturedFile}`);
        // Transformers.js downloads model automatically
        const transcriber = new Transcriber('Xenova/whisper-tiny.en');
        try {
            console.log('Running Whisper (WASM/ONNX)...');
            const text = await transcriber.transcribe(capturedFile.trim());
            console.log('\n--- Transcript ---');
            console.log(text);
            console.log('------------------\n');
        } catch (e) {
            console.error('Transcription failed:', e);
        }
    } else {
        console.error('No capture file found.');
    }

    rl.close();
}

main();
