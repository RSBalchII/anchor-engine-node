import AudioRecorder from 'node-audiorecorder';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const OUTPUT_DIR = path.join(__dirname, '../../recordings'); // plugins/whisper-recorder/recordings

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Configuration for 16-bit PCM, 16kHz, Mono (Whisper Standard)
const options = {
    program: 'sox',     // Server-side recording usually works best with SoX
    silence: 0,
    thresholdStart: 0.5,
    thresholdStop: 0.5,
    keepSilence: true,
    device: null,       // Default device
    bits: 16,
    channels: 1,
    encoding: 'signed-integer',
    rate: 16000,
    type: 'wav',
};

// Initialize
const audioRecorder = new AudioRecorder(options, console);

console.log('Recording... Press Ctrl+C to stop.');

// Create file stream
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `recording_${timestamp}.wav`;
const filePath = path.join(OUTPUT_DIR, filename);
const fileStream = fs.createWriteStream(filePath, { encoding: 'binary' });

// Start recording
audioRecorder.start().stream().pipe(fileStream);

// Handle exit
process.on('SIGINT', () => {
    console.log('Stopping recording...');
    audioRecorder.stop();
    console.log(`Saved: ${filePath}`);
    process.exit();
});
