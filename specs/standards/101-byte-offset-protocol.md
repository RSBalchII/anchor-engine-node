# Standard 101: Byte Offset Protocol

**Status:** Active | **Authority:** Human-Locked | **Domain:** Data Processing

## Problem Statement
Unicode text has different byte lengths vs character counts. String slicing with `substring()` uses character indices, causing incorrect extraction when molecules use byte offsets.

## Solution: Buffer.subarray

### Pattern
```typescript
// CORRECT: Use Buffer for byte-accurate extraction
const buffer = Buffer.from(content, 'utf8');
const slice = buffer.subarray(startByte, endByte);
const text = slice.toString('utf8');
```

### Incorrect Approach
```typescript
// WRONG: String.substring uses character indices, not bytes
const text = content.substring(startByte, endByte);
```

## Coordinate Space Consistency

```
┌─────────────────────────────────────────────────────────────────┐
│  ATOMIZER           →    INGEST           →    INFLATOR         │
├─────────────────────────────────────────────────────────────────┤
│  byte_start: 0         byte_start: 0          Buffer.subarray   │
│  byte_end: 156         byte_end: 156          (0, 156)          │
│  (stored in DB)        (stored in DB)         (byte-accurate)   │
└─────────────────────────────────────────────────────────────────┘
```

## Rules
1. **Store byte offsets** in molecules, not character indices
2. **Use Buffer.subarray** for extraction, never String.substring
3. **Validate UTF-8 boundaries** after extraction

## Key Commits
- `f63deeb` - Buffer.subarray fix in context-inflator
- `3662b66` - Atomizer byte offset fix
- `3438b30` - Context-inflator coordinate space fix

## Affected Files
- `engine/src/services/ingest/atomizer-service.ts`
- `engine/src/services/search/context-inflator.ts`
