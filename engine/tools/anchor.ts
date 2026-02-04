#!/usr/bin/env node

/**
 * Anchor Console (TUI)
 * 
 * A terminal interface for interacting with the Anchor System (formerly ECE).
 * Allows direct SQL execution and system monitoring.
 */

// Native fetch is available in Node 18+
import * as readline from 'readline';

const API_URL = 'http://localhost:3000/v1/debug/sql';

// CLI Colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.cyan}anchor>${colors.reset} `
});

console.log(`
${colors.bright}${colors.blue}
    _    _   _  ____ _   _  ___  ____  
   / \\  | \\ | |/ ___| | | |/ _ \\|  _ \\ 
  / _ \\ |  \\| | |   | |_| | | | | |_) |
 / ___ \\| |\\  | |___|  _  | |_| |  _ < 
/_/   \\_\\_| \\_|\\____|_| |_|\\___/|_| \\_\\
${colors.reset}
${colors.dim}System Reality Interface v1.0${colors.reset}
Type ${colors.yellow}/help${colors.reset} for commands.
`);

rl.prompt();

rl.on('line', async (line) => {
    const input = line.trim();

    if (input.length === 0) {
        rl.prompt();
        return;
    }

    if (input.startsWith('/')) {
        handleCommand(input);
    } else {
        await executeSql(input);
    }

    rl.prompt();
}).on('close', () => {
    console.log('Disconnecting...');
    process.exit(0);
});

function handleCommand(cmd: string) {
    const [command, ...args] = cmd.toLowerCase().split(' ');

    switch (command) {
        case '/help':
            console.log(`
  ${colors.bright}Commands:${colors.reset}
    /help           Show this help
    /exit, /quit    Exit the console
    /clear          Clear screen
    /status         Check system health (TODO)
  
  ${colors.bright}Usage:${colors.reset}
    Simply type standard SQL queries to execute them against the live database.
    Example: ${colors.green}SELECT * FROM atoms LIMIT 5;${colors.reset}
      `);
            break;

        case '/exit':
        case '/quit':
            rl.close();
            break;

        case '/clear':
            console.clear();
            break;

        default:
            console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
    }
}

async function executeSql(query: string) {
    try {
        const start = Date.now();
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`${colors.red}API Error (${response.status}): ${errText}${colors.reset}`);
            return;
        }

        const data = await response.json();

        if (data.error) {
            console.error(`${colors.red}SQL Error: ${data.error}${colors.reset}`);
        } else {
            const duration = Date.now() - start;

            if (data.rows && data.rows.length > 0) {
                // Format as table
                console.table(data.rows);
                console.log(`${colors.green}${data.row_count} rows in ${data.duration_ms}ms${colors.reset}`);
            } else {
                console.log(`${colors.yellow}No results returned. (${data.duration_ms}ms)${colors.reset}`);
            }
        }

    } catch (err: any) {
        console.error(`${colors.red}Connection Error: Is the Engine running?${colors.reset}`);
        console.error(err.message);
    }
}
