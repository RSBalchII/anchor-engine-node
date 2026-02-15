# @anchor/native-atomizer

High-performance C++ text splitter for Node.js - prose and code aware chunking

## Description
Splits text into semantic chunks for LLM/RAG processing. This native module provides extremely fast text splitting capabilities with two strategies optimized for different content types.

## Installation

```bash
npm install @anchor/native-atomizer
```

## Usage

### Basic Usage
```javascript
const { atomize } = require('@anchor/native-atomizer');

// Prose splitting (default)
const chunks = atomize("Hello world. This is a test.", { strategy: 'prose' });
console.log(chunks); // ['Hello world. ', 'This is a test.']

// Code splitting
const codeChunks = atomize("function hello() { console.log('world'); }", { strategy: 'code' });
console.log(codeChunks); // Splits based on code structure
```

### Options
- `strategy`: Either `'prose'` or `'code'` (default: `'prose'`)
- `maxChunkSize`: Maximum size of each chunk (default: `512`)

### Prose Strategy
The prose strategy intelligently splits text based on:
- Sentence boundaries (periods, exclamation marks, question marks)
- Paragraph breaks (double newlines)
- Maintains semantic coherence

### Code Strategy
The code strategy intelligently splits code based on:
- Bracket balancing (preserves code blocks)
- Line boundaries
- Maintains syntactic validity

## Why C++?
This module is implemented in C++ for performance-critical applications. Text splitting can be computationally intensive, especially for large documents, and the C++ implementation provides significantly faster processing compared to pure JavaScript implementations.

## API
```typescript
interface AtomizerOptions {
  strategy: 'prose' | 'code';
  maxChunkSize?: number; // default 512
}

function atomize(text: string, options?: AtomizerOptions): string[];
```