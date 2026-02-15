// packages/anchor-engine/engine/src/utils/process-manager.ts
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServiceConfig {
    name: string;
    cwd: string;
    command?: string;
    script: string;
    args?: string[];
    env?: Record<string, string>;
}

export class ProcessManager {
    private processes: Map<string, ChildProcess> = new Map();
    private static instance: ProcessManager;

    private constructor() {}

    public static getInstance(): ProcessManager {
        if (!ProcessManager.instance) {
            ProcessManager.instance = new ProcessManager();
        }
        return ProcessManager.instance;
    }

    public async startService(config: ServiceConfig): Promise<void> {
        if (this.processes.has(config.name)) {
            console.log(`[ProcessManager] Service ${config.name} is already running.`);
            return;
        }

        // Determine the root directory. 
        // Since we are in packages/anchor-engine/engine/dist/utils/, 
        // root is 5 levels up.
        const rootDir = path.resolve(__dirname, '../../../../../');
        const fullCwd = path.resolve(rootDir, config.cwd);
        const command = config.command || 'node';
        const args = [...(config.args || [])];

        // If command is node, add --expose-gc
        const finalArgs = command === 'node' ? ['--expose-gc', config.script, ...args] : [config.script, ...args];
        
        console.log(`[ProcessManager] Starting service: ${config.name}`);
        console.log(`[ProcessManager]   Command: ${command}`);
        console.log(`[ProcessManager]   Script: ${config.script}`);
        console.log(`[ProcessManager]   CWD: ${fullCwd}`);

        if (!fs.existsSync(fullCwd)) {
            console.error(`[ProcessManager] Error: CWD directory not found at ${fullCwd}`);
            return;
        }

        // Only use shell for pnpm or on Windows when command is not an absolute path
        const useShell = command === 'pnpm' || (process.platform === 'win32' && command !== 'node');

        const child = spawn(command, finalArgs, {
            cwd: fullCwd,
            stdio: ['inherit', 'pipe', 'pipe'],
            env: { ...process.env, ...config.env },
            shell: useShell
        });

        child.stdout?.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach((line: string) => {
                if (line.trim()) {
                    console.log(`[${config.name}] ${line.trim()}`);
                }
            });
        });

        child.stderr?.on('data', (data) => {
            const lines = data.toString().split('\n');
            lines.forEach((line: string) => {
                if (line.trim()) {
                    console.error(`[${config.name}][ERROR] ${line.trim()}`);
                }
            });
        });

        child.on('close', (code) => {
            console.log(`[ProcessManager] Service ${config.name} exited with code ${code}`);
            this.processes.delete(config.name);
        });

        child.on('error', (err) => {
            console.error(`[ProcessManager] Failed to start service ${config.name}:`, err);
        });

        this.processes.set(config.name, child);
    }

    public stopAll(): void {
        console.log('[ProcessManager] Stopping all services...');
        for (const [name, child] of this.processes.entries()) {
            console.log(`[ProcessManager] Killing ${name}...`);
            child.kill();
        }
        this.processes.clear();
    }
}
