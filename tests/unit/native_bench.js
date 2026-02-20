/**
 * Native Module Benchmark Test
 *
 * Compares the performance of the new C++ HTML ingestor against the old cheerio implementation
 * Also tests the new ToolExecutor functionality
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load the native module
let native = null;
try {
    const nativePath = path.join(__dirname, '../build/Release/ece_native.node');
    native = require(nativePath);
    console.log('✅ Native module loaded successfully');
} catch (e) {
    console.error('❌ Failed to load native module:', e.message);
    try {
        const nativePath = path.join(__dirname, '../build/Debug/ece_native.node');
        native = require(nativePath);
        console.log('✅ Native module loaded from Debug directory');
    } catch (e2) {
        console.error('❌ Failed to load native module from Debug directory too:', e2.message);
        process.exit(1);
    }
}

// Create a large HTML sample for testing
function createLargeHtmlSample() {
    let html = '<html><head><title>Test Document</title></head><body>';

    // Add script and style tags to test filtering
    html += '<script>console.log("test"); var x = 1;</script>';
    html += '<style>body { margin: 0; padding: 0; }</style>';

    // Add content with various block elements
    for (let i = 0; i < 1000; i++) {
        html += `<div>This is div ${i} with some content. <p>This is paragraph ${i} inside div.</p></div>`;
        html += `<p>Another paragraph ${i} with <span>inline content</span> and more text.</p>`;
    }

    html += '</body></html>';
    return html;
}

// Simulate old cheerio-based implementation (for comparison)
function oldCheerioApproach(html) {
    // This simulates what cheerio would do - a simplified version
    // In real implementation, cheerio would parse and manipulate the DOM

    // Remove script and style tags and their content
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove all HTML tags but preserve content
    clean = clean.replace(/<[^>]*>/g, ' ');

    // Clean up whitespace
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
}

async function runBenchmark() {
    console.log('\n🚀 Starting Native Module Benchmark Test...\n');

    // Create test HTML (approximately 1MB equivalent)
    const largeHtml = createLargeHtmlSample();
    console.log(`📊 Test HTML size: ${(largeHtml.length / 1024).toFixed(2)} KB`);

    // Benchmark old approach (simulated)
    console.log('\n⏱️  Benchmarking old approach (simulated)...');
    const oldTimes = [];
    for (let i = 0; i < 100; i++) {
        const start = performance.now();
        const result = oldCheerioApproach(largeHtml);
        const end = performance.now();
        oldTimes.push(end - start);
    }
    const oldAvg = oldTimes.reduce((a, b) => a + b, 0) / oldTimes.length;

    // Benchmark new C++ approach
    console.log('⏱️  Benchmarking new C++ approach...');
    const newTimes = [];
    for (let i = 0; i < 100; i++) {
        const start = performance.now();
        const htmlIngestor = new native.HtmlIngestor();
        const result = htmlIngestor.extractContent(largeHtml);
        const end = performance.now();
        newTimes.push(end - start);
    }
    const newAvg = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;

    // Results
    console.log('\n📈 BENCHMARK RESULTS:');
    console.log(`   Old Approach (simulated): ${oldAvg.toFixed(2)} ms average`);
    console.log(`   New C++ Approach: ${newAvg.toFixed(2)} ms average`);
    console.log(`   Performance Improvement: ${(oldAvg / newAvg).toFixed(2)}x faster`);

    // Validate correctness
    console.log('\n🔍 Validating correctness...');
    const oldResult = oldCheerioApproach(largeHtml);
    const htmlIngestor = new native.HtmlIngestor();
    const newResult = htmlIngestor.extractContent(largeHtml);

    // Basic checks
    const oldHasScriptContent = oldResult.includes('console.log');
    const newHasScriptContent = newResult.includes('console.log');

    const oldHasStyleContent = oldResult.includes('margin: 0');
    const newHasStyleContent = newResult.includes('margin: 0');

    console.log(`   Script content filtered correctly: ${!oldHasScriptContent && !newHasScriptContent ? '✅' : '❌'}`);
    console.log(`   Style content filtered correctly: ${!oldHasStyleContent && !newHasStyleContent ? '✅' : '❌'}`);
    console.log(`   Results have similar length: ${Math.abs(oldResult.length - newResult.length) < 100 ? '✅' : '❌'}`);

    // Additional validation - check that both preserve main content
    const expectedContentPresent = ['div 500', 'paragraph 750', 'inline content'].every(
        text => oldResult.includes(text) && newResult.includes(text)
    );
    console.log(`   Main content preserved: ${expectedContentPresent ? '✅' : '❌'}`);

    // Test the new ToolExecutor functionality
    console.log('\n🔧 Testing ToolExecutor functionality...');
    try {
        // Test list_dir functionality
        const listDirCommand = JSON.stringify({
            tool: "list_dir",
            params: { path: "." }
        });

        const listResult = native.executeTool(listDirCommand);
        console.log(`   list_dir result length: ${listResult.length} chars`);
        console.log(`   executeTool function available: ${!!native.executeTool ? '✅' : '❌'}`);

        // Test read_file functionality with a simple file
        const testFilePath = path.join(__dirname, 'test_file.txt');
        fs.writeFileSync(testFilePath, 'This is a test file for ToolExecutor.', 'utf8');

        const readFileCommand = JSON.stringify({
            tool: "read_file",
            params: { path: testFilePath }
        });

        const readResult = native.executeTool(readFileCommand);
        console.log(`   read_file result: ${readResult.substring(0, 50)}...`);

        // Clean up test file
        fs.unlinkSync(testFilePath);

        console.log('   ToolExecutor basic tests: ✅');
    } catch (e) {
        console.log(`   ToolExecutor basic tests: ❌ (${e.message})`);
    }

    console.log('\n🎯 SUMMARY:');
    if (newAvg < oldAvg) {
        console.log('✅ C++ implementation is faster!');
        console.log(`   Speed improvement: ${((oldAvg - newAvg) / oldAvg * 100).toFixed(1)}% faster`);
    } else {
        console.log('❌ C++ implementation is slower - needs optimization');
    }

    console.log('\n✨ Benchmark complete!');
}

// Run the benchmark
if (process.argv[1] === __filename) {
    runBenchmark().catch(err => {
        console.error('Benchmark error:', err);
        process.exit(1);
    });
}

export { runBenchmark };