const { createFullCorpusRecursive } = require('./src/read_all.js');

// Run the function to aggregate content from the context directory
// This is a wrapper to run the read_all functionality from the server directory
// where all dependencies are properly installed

console.log('Starting context aggregation from server directory...');
createFullCorpusRecursive();