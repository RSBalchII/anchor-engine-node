# Standard 051: Service Module Path Resolution

**Category:** Architecture / Node.js
**Status:** Active
**Date:** 2026-01-24

## 1. Context
The ECE Core Engine runs as a **Node.js Monolith** using **ES Modules (ESM)**.  
Legacy CommonJS patterns like `__filename`, `__dirname`, and `require()` are **NOT available** by default in ESM files (`.ts` / `.mjs`).

This creates critical failures when:
1.  Resolving paths to external resources (e.g., native binaries, config files).
2.  Dynamically loading modules that rely on `require` behavior.

## 2. The Protcol: Native & Path Resolution

### 2.1 Top-Level Scoping
If a module requires file-system awareness, it MUST define the path globals at the **FILE SCOPE**, not inside a function.

**❌ INCORRECT (Runtime ReferenceError):**
```typescript
function getPath() {
   // Fails: __filename is not defined
   return path.dirname(__filename);
}
```

**✅ CORRECT (ESM Pattern):**
```typescript
import { fileURLToPath } from 'url';
import path from 'path';

// Define globals once at top-level
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPath() {
   return path.join(__dirname, 'resources');
}
```

### 2.2 Native Binary Loading
When loading native addons (like `cozo_node_win32.node`) or dynamic dependencies:

1.  **Use `createRequire`**: Do not rely on bundlers to shim `require`.
2.  **Relative Resolution**: Resolve paths relative to `__dirname`.

```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const binaryPath = path.resolve(__dirname, '../../cozo_lib.node');
const nativeModule = require(binaryPath);
```

## 3. Electron Compatibility
Path resolution varies between **Development** (Source) and **Production** (Asar/Resources).

*   **Production**: Binaries live in `process.resourcesPath` (Electron Main) or via relative paths from the unpacked executable.
*   **Development**: Binaries live in the source tree (e.g., `engine/`).

**Resolution Logic:**
```typescript
const getNativePath = (file: string) => {
    // 1. Check Electron Production
    if (process.env['NODE_ENV'] === 'production') {
        const basePath = (process as any).resourcesPath;
        if (basePath) return path.join(basePath, 'resources/bin', file);
    }
    // 2. Fallback to Dev (Relative)
    return path.resolve(__dirname, '../', file);
};
```
