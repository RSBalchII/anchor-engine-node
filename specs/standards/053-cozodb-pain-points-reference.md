# Standard 053: CozoDB Pain Points & OS Compatibility

**Status:** Active | **Category:** Architecture / Database

## 1. Native Binary Desync (Critical)
The `cozo-node` package relies on a native C++ binding (`.node` file). On Windows systems, `pnpm install` may fail to correctly link or place the prebuilt binary in the expected path, especially when moving between different Node.js context (e.g., global vs workspace).

### Symptoms
- `Error: Cannot find module '.../cozo_node_prebuilt.node'`
- `MODULE_NOT_FOUND` during engine startup.

### Resolution
The prebuilt binary for Windows (`napi-v6`) must be manually verified. In case of failure:
1. Locate the correct binary (typically found in `.ignored` or a previous build's `node_modules`).
2. Map it to: `node_modules/cozo-node/native/6/cozo_node_prebuilt.node`.

## 2. API Inconsistency (v0.7.6+)
The official `cozo-node` library exports a `CozoDb` class, but the ECE_Core architecture (Standard 058/064) expects individual function exports (`open_db`, `query_db`, etc.) to maintain a functional, stateless-style interface.

### The Patch
We maintain a manual patch in `node_modules/cozo-node/index.js` to expose native methods directly:
```javascript
module.exports = {
    CozoDb: CozoDb,
    open_db: (engine, path, options) => native.open_db(engine, path, JSON.stringify(options)),
    query_db: (id, script, params) => {
        return new Promise((resolve, reject) => {
            native.query_db(id, script, params, (err, res) => { ... });
        });
    },
    // ...
}
```

## 3. CozoDB Parser Fragility
The CozoDB Datalog parser is sensitive to:
- **Multiline Strings**: Newlines in template literals can cause desync.
- **Empty Params**: Always pass `{}` if no params are used.
- **Type Downcasting**: Passing `null` to `path` in `open_db` can cause `failed to downcast any to string`. Use a string path or a descriptive constant.

## 4. Hardware/OS Constraints
- **Windows**: Requires VS Build Tools for native compilation if prebuilts fail.
- **VRAM**: CozoDB is disk-native (RocksDB); it does not compete for VRAM, but large FTS indices can bloat RAM. Limit file sizes to <500KB (Standard 053: FTS Poisoning).

> [!IMPORTANT]
> When updating dependencies, ALWAYS verify the `cozo-node/index.js` patch is still active. Automated builds may overwrite this file.
