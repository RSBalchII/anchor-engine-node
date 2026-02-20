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

        // Determine the root directory dynamically
        // Try multiple strategies to find the project root
        let rootDir: string;
        
        // Strategy 1: Use PROJECT_ROOT from config if available
        try {
            const { PROJECT_ROOT } = await import('../config/paths.js');
            if (PROJECT_ROOT) {
                rootDir = PROJECT_ROOT;
                console.log(`[ProcessManager] Using PROJECT_ROOT: ${rootDir}`);
            } else {
                throw new Error('PROJECT_ROOT not set');
            }
        } catch (e) {
            // Strategy 2: Calculate from __dirname
            // From packages/anchor-engine/engine/dist/utils/ go up 5 levels
            rootDir = path.resolve(__dirname, '../../../../../../');
            console.log(`[ProcessManager] Calculated rootDir: ${rootDir}`);
        }
        
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
            console.error(`[ProcessManager]   rootDir: ${rootDir}`);
            console.error(`[ProcessManager]   config.cwd: ${config.cwd}`);
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
