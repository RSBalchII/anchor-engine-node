/**
 * ECE Benchmark Tool
 * 
 * "Needle in a Haystack" test for context retrieval accuracy.
 * Measures how well the model can extract specific information
 * from varying context sizes.
 * 
 * Run: npm run benchmark (or node tests/benchmark.js)
 */

const path = require('path');

// Add engine src to path for imports
const engineSrc = path.join(__dirname, '..', 'src');
const { loadModel, chat, listModels, getStatus } = require(path.join(engineSrc, 'services', 'inference'));
const { performance } = require('perf_hooks');

// ═══════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════

const CONFIG = {
    // Context sizes to test (approximate token counts)
    contextSizes: [500, 1000, 2000, 4000],
    
    // The needle - what we're looking for
    needle: 'The secret activation code is OMEGA_SEVEN_DELTA.',
    
    // The question to ask
    question: 'What is the secret activation code?',
    
    // Expected answer fragment
    expectedAnswer: 'OMEGA_SEVEN_DELTA',
    
    // Word list for haystack generation
    wordList: [
        'system', 'process', 'data', 'flow', 'network', 'protocol',
        'signal', 'buffer', 'cache', 'memory', 'thread', 'queue',
        'handler', 'callback', 'event', 'stream', 'parser', 'token',
        'node', 'edge', 'graph', 'tree', 'hash', 'index', 'query'
    ]
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

/**
 * Generate random "haystack" text of approximate token count
 */
function generateHaystack(targetTokens) {
    const words = [];
    // Rough estimate: ~1.3 words per token for English
    const targetWords = Math.floor(targetTokens * 1.3);
    
    for (let i = 0; i < targetWords; i++) {
        // Occasionally add punctuation for realism
        if (i > 0 && i % 15 === 0) {
            words.push('.');
        }
        words.push(CONFIG.wordList[Math.floor(Math.random() * CONFIG.wordList.length)]);
    }
    
    return words.join(' ');
}

/**
 * Insert needle at specified position (0-1 range)
 */
function insertNeedle(haystack, needle, position = 0.5) {
    const insertAt = Math.floor(haystack.length * position);
    return haystack.slice(0, insertAt) + ' ' + needle + ' ' + haystack.slice(insertAt);
}

/**
 * Format duration
 */
function formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// ═══════════════════════════════════════════
// BENCHMARK RUNNER
// ═══════════════════════════════════════════

async function runBenchmark() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     NEEDLE IN A HAYSTACK BENCHMARK                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Check for available models
    const models = listModels();
    if (models.length === 0) {
        console.error('❌ No models found. Please add GGUF files to the models directory.');
        process.exit(1);
    }

    const modelName = process.argv[2] || models[0];
    console.log(`📦 Model: ${modelName}`);
    console.log(`🎯 Needle: "${CONFIG.needle}"`);
    console.log(`❓ Question: "${CONFIG.question}"\n`);

    // Load model
    console.log('Loading model...');
    try {
        await loadModel(modelName, { ctxSize: 8192 });
        console.log('✅ Model loaded\n');
    } catch (e) {
        console.error(`❌ Failed to load model: ${e.message}`);
        process.exit(1);
    }

    // Results table
    const results = [];

    console.log('─'.repeat(60));
    console.log('  Tokens  │  Position  │  Result  │  Time  │  Response');
    console.log('─'.repeat(60));

    // Run tests for each context size
    for (const tokenCount of CONFIG.contextSizes) {
        // Test at different needle positions
        for (const position of [0.25, 0.5, 0.75]) {
            const posLabel = position === 0.25 ? 'Start' : position === 0.5 ? 'Middle' : 'End';
            
            // Generate context
            const haystack = generateHaystack(tokenCount);
            const context = insertNeedle(haystack, CONFIG.needle, position);
            
            // Build prompt
            const prompt = `Context:\n${context}\n\nQuestion: ${CONFIG.question}\nAnswer:`;
            
            // Time the inference
            const start = performance.now();
            let response;
            try {
                response = await chat([{ role: 'user', content: prompt }], { maxTokens: 100 });
            } catch (e) {
                response = `[Error: ${e.message}]`;
            }
            const duration = performance.now() - start;

            // Check for needle
            const found = response.toUpperCase().includes(CONFIG.expectedAnswer);
            const status = found ? '✅ PASS' : '❌ FAIL';
            
            // Truncate response for display
            const shortResponse = response.replace(/\n/g, ' ').slice(0, 30) + '...';
            
            console.log(
                `  ${String(tokenCount).padStart(5)}  │  ${posLabel.padEnd(8)}  │  ${status}  │  ${formatDuration(duration).padStart(6)}  │  ${shortResponse}`
            );

            results.push({
                tokens: tokenCount,
                position: posLabel,
                found,
                duration
            });

            // Small delay between tests
            await new Promise(r => setTimeout(r, 100));
        }
    }

    console.log('─'.repeat(60));

    // Summary
    const passCount = results.filter(r => r.found).length;
    const totalTests = results.length;
    const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log(`\n📊 Summary:`);
    console.log(`   Accuracy: ${passCount}/${totalTests} (${Math.round(passCount/totalTests*100)}%)`);
    console.log(`   Avg Time: ${formatDuration(avgTime)}`);
    
    // Position breakdown
    const byPosition = {};
    for (const r of results) {
        if (!byPosition[r.position]) byPosition[r.position] = { pass: 0, total: 0 };
        byPosition[r.position].total++;
        if (r.found) byPosition[r.position].pass++;
    }
    
    console.log(`\n📍 By Position:`);
    for (const [pos, data] of Object.entries(byPosition)) {
        console.log(`   ${pos}: ${data.pass}/${data.total}`);
    }

    console.log('\n');
}

// Run
runBenchmark().catch(e => {
    console.error('Benchmark crashed:', e);
    process.exit(1);
});
