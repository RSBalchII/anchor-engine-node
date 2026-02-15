const { atomize } = require('./index.js');

// Test prose splitting
console.log('Testing prose splitting...');
const proseText = "Hello world. This is a test of the prose splitting functionality. It should split on sentence boundaries.";
const proseChunks = atomize(proseText, { strategy: 'prose', maxChunkSize: 50 });
console.log('Prose chunks:', proseChunks);

// Test code splitting
console.log('\nTesting code splitting...');
const codeText = `function hello() {
  console.log('world');
  if (true) {
    console.log('nested');
  }
}`;
const codeChunks = atomize(codeText, { strategy: 'code', maxChunkSize: 100 });
console.log('Code chunks:', codeChunks);

console.log('\nTests completed successfully!');