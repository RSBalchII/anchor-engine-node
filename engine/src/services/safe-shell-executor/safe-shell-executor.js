// safe-shell-executor.js
const { spawn } = require('child_process');
const path = require('path');
const { LOGS_DIR } = require('../../config/paths');

class SafeShellExecutor {
    static async execute(command, options = {}) {
        return new Promise((resolve, reject) => {
            const {
                timeout = 30000, // 30 second default timeout
                logFile = path.join(LOGS_DIR, `shell_cmd_${Date.now()}.log`),
                detached = true,
                stdio = ['ignore', 'ignore', 'ignore'] // Completely detached
            } = options;

            // Split command into command and args
            const [cmd, ...args] = command.split(' ');

            const child = spawn(cmd, args, {
                detached,
                stdio,
                ...options.spawnOptions
            });

            // Set up timeout
            const timer = setTimeout(() => {
                child.kill();
                reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
            }, timeout);

            // Handle process completion
            child.on('close', (code) => {
                clearTimeout(timer);
                resolve({
                    success: code === 0,
                    code,
                    logFile
                });
            });

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });

            // If detached, unref to not keep Node.js process alive
            if (detached) {
                child.unref();
            }
        });
    }
}

module.exports = SafeShellExecutor;
