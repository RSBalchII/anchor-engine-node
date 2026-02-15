/**
 * Enhanced Native Module Tests - Validation of New Features
 *
 * Tests the new NativeModuleManager and PathManager functionality
 * added as part of the evolution plan.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the new utilities we created
const { nativeModuleManager } = await import('../dist/utils/native-module-manager.js');
const { pathManager } = await import('../dist/utils/path-manager.js');

// Test results tracking
let passed = 0;
let failed = 0;

/**
 * Test runner with pretty output
 */
async function test(name, fn) {
    try {
        process.stdout.write(`  ${name}... `);
        await fn();
        console.log('✅ PASS');
        passed++;
    } catch (e) {
        console.log('❌ FAIL');
        console.error(`     └─ ${e.message}`);
        failed++;
    }
}

/**
 * Assert helper
 */
function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

/**
 * Main test suite for enhanced native module functionality
 */
async function runEnhancedNativeTests() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ENHANCED NATIVE MODULE TESTS           ║');
    console.log('║  (PathManager & NativeModuleManager)   ║');
    console.log('╚════════════════════════════════════════╝\n');

    // ═══════════════════════════════════════════
    // SECTION 1: PathManager Tests
    // ═══════════════════════════════════════════
    console.log('─── PathManager Tests ───');

    await test('PathManager singleton works correctly', async () => {
        const pm1 = await import('../dist/utils/path-manager.js');
        const pm2 = await import('../dist/utils/path-manager.js');
        
        assert(pm1.pathManager === pm2.pathManager, 'PathManager should be a singleton');
    });

    await test('PathManager returns valid database path', async () => {
        const dbPath = pathManager.getDatabasePath();
        assert(typeof dbPath === 'string', 'Database path should be a string');
        assert(dbPath.length > 0, 'Database path should not be empty');
        assert(dbPath.endsWith('context.db'), 'Database path should end with context.db');
    });

    await test('PathManager returns valid notebook directory', async () => {
        const notebookDir = pathManager.getNotebookDir();
        assert(typeof notebookDir === 'string', 'Notebook directory should be a string');
        assert(notebookDir.length > 0, 'Notebook directory should not be empty');
        assert(notebookDir.includes('notebook'), 'Notebook directory should contain "notebook"');
    });

    await test('PathManager returns valid context directory', async () => {
        const contextDir = pathManager.getContextDir();
        assert(typeof contextDir === 'string', 'Context directory should be a string');
        assert(contextDir.length > 0, 'Context directory should not be empty');
        assert(contextDir.includes('context'), 'Context directory should contain "context"');
    });

    await test('PathManager returns valid logs directory', async () => {
        const logsDir = pathManager.getLogsDir();
        assert(typeof logsDir === 'string', 'Logs directory should be a string');
        assert(logsDir.length > 0, 'Logs directory should not be empty');
        assert(logsDir.includes('logs'), 'Logs directory should contain "logs"');
    });

    await test('PathManager returns valid sovereign tags path', async () => {
        const tagsPath = pathManager.getSovereignTagsPath();
        assert(typeof tagsPath === 'string', 'Sovereign tags path should be a string');
        assert(tagsPath.length > 0, 'Sovereign tags path should not be empty');
        assert(tagsPath.includes('internal_tags.json'), 'Should point to internal_tags.json');
    });

    // ═══════════════════════════════════════════
    // SECTION 2: NativeModuleManager Tests
    // ═══════════════════════════════════════════
    console.log('\n─── NativeModuleManager Tests ───');

    await test('NativeModuleManager singleton works correctly', async () => {
        const nm1 = await import('../dist/utils/native-module-manager.js');
        const nm2 = await import('../dist/utils/native-module-manager.js');
        
        assert(nm1.nativeModuleManager === nm2.nativeModuleManager, 'NativeModuleManager should be a singleton');
    });

    await test('NativeModuleManager loads ece_native module', async () => {
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        assert(native !== null, 'Native module should load (even if with fallback)');
    });

    await test('NativeModuleManager tracks module status', async () => {
        // Load the module first
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        
        const status = nativeModuleManager.getStatus('ece_native');
        assert(status !== undefined, 'Status should be available for loaded module');
        assert(status.moduleName === 'ece_native', 'Status should have correct module name');
        assert(typeof status.loaded === 'boolean', 'Status should have loaded boolean');
        assert(typeof status.platform === 'string', 'Status should have platform string');
        assert(typeof status.architecture === 'string', 'Status should have architecture string');
        assert(typeof status.fallbackActive === 'boolean', 'Status should have fallbackActive boolean');
    });

    await test('NativeModuleManager detects fallback status', async () => {
        // Load the module first
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        
        const isFallback = nativeModuleManager.isUsingFallback('ece_native');
        assert(typeof isFallback === 'boolean', 'Fallback status should be boolean');
    });

    await test('NativeModuleManager provides fallback functions', async () => {
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        
        // Even if using fallback, the functions should exist
        assert(typeof native.cleanse === 'function', 'Should have cleanse function');
        assert(typeof native.atomize === 'function', 'Should have atomize function');
        assert(typeof native.fingerprint === 'function', 'Should have fingerprint function');
        assert(typeof native.distance === 'function', 'Should have distance function');
    });

    await test('NativeModuleManager fallback cleanse works', async () => {
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        
        const input = 'Hello\\nWorld!';
        const result = native.cleanse(input);
        assert(typeof result === 'string', 'Result should be a string');
    });

    await test('NativeModuleManager fallback atomize works', async () => {
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        
        const input = 'This is a test sentence. This is another sentence.';
        const result = native.atomize(input, 'prose');
        assert(Array.isArray(result), 'Result should be an array');
    });

    await test('NativeModuleManager fallback fingerprint works', async () => {
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        
        const input = 'This is a test string for fingerprinting.';
        const result = native.fingerprint(input);
        assert(typeof result === 'bigint' || typeof result === 'number', 'Result should be a number/bigint');
    });

    await test('NativeModuleManager fallback distance works', async () => {
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        
        const hash1 = native.fingerprint('test string 1');
        const hash2 = native.fingerprint('test string 2');
        const result = native.distance(hash1, hash2);
        assert(typeof result === 'number', 'Result should be a number');
        assert(result >= 0, 'Distance should be non-negative');
    });

    // ═══════════════════════════════════════════
    // SECTION 3: Integration Tests
    // ═══════════════════════════════════════════
    console.log('\n─── Integration Tests ───');

    await test('PathManager integrates with NativeModuleManager', async () => {
        // This test verifies that both systems work together
        const nativePath = pathManager.getNativePath('ece_native.node');
        assert(typeof nativePath === 'string', 'Native path should be a string');
        assert(nativePath.length > 0, 'Native path should not be empty');
        
        // The native module manager should be able to use paths from path manager
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');
        assert(native !== null, 'Native module should load successfully');
    });

    await test('PathManager native path generation works', async () => {
        const pathsToTest = [
            'cozo_node_win32.node',
            'cozo_node_darwin.node', 
            'cozo_node_linux.node',
            'ece_native.node'
        ];

        for (const pathName of pathsToTest) {
            const fullPath = pathManager.getNativePath(pathName);
            assert(typeof fullPath === 'string', `Path for ${pathName} should be a string`);
            assert(fullPath.length > 0, `Path for ${pathName} should not be empty`);
        }
    });

    // ═══════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  RESULTS: ${passed} passed, ${failed} failed         ║`);
    console.log('╚════════════════════════════════════════╝\n');

    if (failed === 0) {
        console.log('🎉 All enhanced native module tests passed!');
        console.log('🚀 PathManager and NativeModuleManager are working correctly!');
    } else {
        console.log('⚠️  Some enhanced native module tests failed.');
    }

    return { passed, failed };
}

// Run the tests if this file is executed directly
if (process.argv[1] === __filename) {
    runEnhancedNativeTests().catch(err => {
        console.error('Enhanced native test suite error:', err);
        process.exit(1);
    });
}

export { runEnhancedNativeTests };