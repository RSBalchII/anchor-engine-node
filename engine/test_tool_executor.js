import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const native = require('./build/Release/ece_native.node');

console.log('Testing ToolExecutor functionality...');

// Test 1: List directory
const listCmd = JSON.stringify({tool: 'list_dir', params: {path: '.'}});
const listResult = native.executeTool(listCmd);
console.log('List directory result length:', listResult.length);
console.log('Contains package.json?', listResult.includes('package.json'));

// Test 2: Execute tool function exists
console.log('executeTool function available:', typeof native.executeTool === 'function');

// Test 3: Test with a simple command
try {
  const testCmd = JSON.stringify({tool: 'list_dir', params: {path: './src'}});
  const testResult = native.executeTool(testCmd);
  console.log('Test command result length:', testResult.length);
  console.log('Test command successful:', testResult.length > 0);
} catch (e) {
  console.log('Test command failed:', e.message);
}

console.log('All tests completed.');