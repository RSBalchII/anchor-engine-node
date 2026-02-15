const { atomize } = require('./build/Release/native_atomizer');

/**
 * Splits text into semantic chunks for LLM/RAG processing
 * @param {string} text - The text to split
 * @param {Object} options - Options for splitting
 * @param {'prose'|'code'} options.strategy - The splitting strategy to use
 * @param {number} options.maxChunkSize - Maximum size of each chunk (default: 512)
 * @returns {string[]} Array of text chunks
 */
function atomizeText(text, options = {}) {
  const { strategy = 'prose', maxChunkSize = 512 } = options;
  
  if (typeof text !== 'string') {
    throw new TypeError('Text must be a string');
  }
  
  if (!['prose', 'code'].includes(strategy)) {
    throw new Error('Strategy must be either "prose" or "code"');
  }
  
  if (typeof maxChunkSize !== 'number' || maxChunkSize <= 0) {
    throw new Error('maxChunkSize must be a positive number');
  }
  
  return atomize(text, strategy, maxChunkSize);
}

module.exports = { atomize: atomizeText };