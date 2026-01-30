import { fetch } from 'undici';
import * as readline from 'readline';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure Markdown Renderer
marked.setOptions({
    renderer: new TerminalRenderer({
        reflowText: true,
        width: 80,
    })
});

const API_URL = 'http://localhost:3000/v1/chat/completions';
const MODEL = 'Gemma-3-it-4B-Uncensored-D_AU-Q8_0.gguf'; // Default, effectively

// ANSI Colors
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${GREEN}USER>${RESET} `
});

let messageHistory: any[] = [];

console.clear();
console.log(`${MAGENTA}=================================================${RESET}`);
console.log(`${MAGENTA}   Sovereign Context Engine - Neural Terminal    ${RESET}`);
console.log(`${MAGENTA}=================================================${RESET}`);
console.log(`${DIM}Type /exit to quit, /clear to clear screen${RESET}\n`);

async function chatLoop() {
    rl.prompt();

    rl.on('line', async (line) => {
        const input = line.trim();

        if (input === '/exit') {
            process.exit(0);
        } else if (input === '/clear') {
            console.clear();
            rl.prompt();
            return;
        } else if (!input) {
            rl.prompt();
            return;
        }

        // Add to history
        messageHistory.push({ role: 'user', content: input });

        // Prepare request
        const body = {
            model: MODEL,
            messages: messageHistory,
            stream: true
        };

        // Start Inference UI
        console.log(''); // Newline
        process.stdout.write(`${CYAN}[SOVEREIGN]:${RESET} `);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                console.error(`\nAPI Error: ${response.statusText}`);
                rl.prompt();
                return;
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            let finalAnswer = "";
            let currentThought = "";
            let inThought = false;

            // @ts-ignore
            while (true) {
                // @ts-ignore
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);

                            // Handle Thoughts
                            if (data.type === 'thought') {
                                if (!inThought) {
                                    process.stdout.write(`\n${DIM}Thinking...${RESET}\n`);
                                    inThought = true;
                                }
                                process.stdout.write(`${DIM}${data.content}${RESET}`);
                            }
                            // Handle Streaming Answers
                            else if (data.choices && data.choices[0].delta.content) {
                                if (inThought) {
                                    process.stdout.write(`\n\n${CYAN}Answer:${RESET} `);
                                    inThought = false;
                                }
                                const content = data.choices[0].delta.content;
                                process.stdout.write(content);
                                finalAnswer += content;
                            }
                        } catch (e) {
                            // Ignore parse errors for partial chunks
                        }
                    }
                }
            }

            // Append assistant response to history
            if (finalAnswer) {
                messageHistory.push({ role: 'assistant', content: finalAnswer });
            }

            console.log('\n'); // Spacing
            rl.prompt();

        } catch (e: any) {
            console.error(`\nConnection Error: ${e.message}`);
            rl.prompt();
        }

    }).on('close', () => {
        process.exit(0);
    });
}

chatLoop();
