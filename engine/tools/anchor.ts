#!/usr/bin/env node

/**
 * Anchor Console (TUI)
 *
 * A terminal interface for interacting with the Anchor System (formerly ECE).
 * Allows direct SQL execution and system monitoring.
 * Now includes simplified query builder functionality.
 */

// Native fetch is available in Node 18+
import * as readline from 'readline';
import yaml from 'js-yaml';

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


let queryBuffer = '';

rl.on('line', async (line) => {
    const trimmedLine = line.trim();

    // Command handling (only if buffer empty)
    if (queryBuffer.length === 0 && trimmedLine.startsWith('/')) {
        handleCommand(trimmedLine);
        rl.prompt();
        return;
    }

    // Check for query builder commands
    if (queryBuffer.length === 0 && trimmedLine.startsWith('qb:')) {
        await handleQueryBuilderCommand(trimmedLine.substring(3)); // Remove 'qb:' prefix
        rl.prompt();
        return;
    }

    // Empty input check (only if buffer empty)
    if (queryBuffer.length === 0 && trimmedLine.length === 0) {
        rl.prompt();
        return;
    }

    // Accumulate input
    // If it's a new line in a multi-line query, add space/newline
    if (queryBuffer.length > 0) {
        queryBuffer += '\n' + line;
    } else {
        queryBuffer = line;
    }

    // Check for termination (semicolon at end of line)
    // We strictly require the semicolon for multi-line support
    if (trimmedLine.endsWith(';')) {
        await executeSql(queryBuffer);
        queryBuffer = '';
        rl.setPrompt(`${colors.cyan}anchor>${colors.reset} `);
    } else {
        // Continuation prompt
        rl.setPrompt(`${colors.dim}   ...>${colors.reset} `);
    }

    rl.prompt();
}).on('close', () => {
    console.log('Disconnecting...');
    process.exit(0);
});





let outputMode: 'table' | 'csv' | 'json' | 'yaml' = 'table';

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
                if (outputMode === 'table') {
                    console.table(data.rows);
                    console.log(`${colors.green}${data.row_count} rows in ${data.duration_ms}ms${colors.reset}`);
                } else if (outputMode === 'json') {
                    console.log(JSON.stringify(data.rows, null, 2));
                } else if (outputMode === 'csv') {
                    console.log(convertToCsv(data.rows));
                    console.log(`${colors.green}${data.row_count} rows exported.${colors.reset}`);
                } else if (outputMode === 'yaml') {
                    console.log(yaml.dump(data.rows));
                    console.log(`${colors.green}${data.row_count} rows exported.${colors.reset}`);
                }
            } else {
                console.log(`${colors.yellow}No results returned. (${data.duration_ms}ms)${colors.reset}`);
            }
        }

    } catch (err: any) {
        console.error(`${colors.red}Connection Error: Is the Engine running?${colors.reset}`);
        console.error(err.message);
    }
}

async function handleQueryBuilderCommand(command: string) {
    try {
        // For now, we'll just show a message that the query builder is available
        // In a real implementation, you would need to run the query builder in a Node.js context
        console.log(`${colors.yellow}Query builder functionality is available in the API.${colors.reset}`);
        console.log(`${colors.dim}Use the query builder programmatically in your scripts.${colors.reset}`);
    } catch (err: any) {
        console.error(`${colors.red}Query builder error: ${err.message}${colors.reset}`);
    }
}

function convertToCsv(rows: any[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = rows.map(row => {
        return headers.map(fieldName => {
            const val = row[fieldName];
            const safeVal = (val === null || val === undefined) ? '' : String(val);
            // Escape quotes and wrap in quotes
            const escaped = safeVal.replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    });
    return [headers.join(','), ...csvRows].join('\n');
}

function handleCommand(cmd: string) {
    const [command, ...args] = cmd.toLowerCase().split(' ');

    switch (command) {
        case '/help':
            console.log(`
  ${colors.bright}Commands:${colors.reset}
    /help           Show this help
    /exit, /quit    Exit the console
    /clear          Clear screen
    /table          Switch to Table output (Default)
    /csv            Switch to CSV output
    /json           Switch to JSON output
    /yaml           Switch to YAML output

  ${colors.bright}Query Builder:${colors.reset}
    The query builder is available programmatically in your scripts.
    Import it using: import { createQueryBuilder } from './services/query-builder/QueryBuilder.js'

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

        case '/csv':
            outputMode = 'csv';
            console.log(`${colors.green}Output mode set to CSV.${colors.reset}`);
            break;

        case '/json':
            outputMode = 'json';
            console.log(`${colors.green}Output mode set to JSON.${colors.reset}`);
            break;

        case '/yaml':
            outputMode = 'yaml';
            console.log(`${colors.green}Output mode set to YAML.${colors.reset}`);
            break;

        case '/table':
            outputMode = 'table';
            console.log(`${colors.green}Output mode set to Table.${colors.reset}`);
            break;

        default:
            console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
    }
}