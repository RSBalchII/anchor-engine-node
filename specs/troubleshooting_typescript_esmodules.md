# Troubleshooting: TypeScript Compilation and ES Module Issues

## Objectives
- Document the TypeScript compilation issues encountered during the ECE_Core evolution
- Provide solutions for ES Module compatibility problems
- Create a reference for future development and maintenance

## Issues Encountered During Build Process

### 1. __dirname Unavailability in ES Modules
**Problem**: 
- `__dirname` is not available in ES module scope when `"type": "module"` is set in package.json
- Error: `ReferenceError: __dirname is not defined in ES module scope`
- Affected multiple files in the codebase

**Solution**:
```typescript
// OLD (CommonJS)
import path from "path";
const __dirname = path.dirname(__filename);

// NEW (ES Module compatible)
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

**Files Fixed**:
- `src/utils/path-manager.ts`
- `src/core/db.ts`
- `src/services/ingest/atomizer.ts`
- `src/services/ingest/refiner.ts`

### 2. Unused Import/Variable Errors
**Problem**:
- TypeScript compiler complained about unused imports and variables
- Error: `TS6133: 'X' is declared but its value is never read`
- Affected variables: `path`, `__filename`, `require`, `getNativePath`

**Solutions**:
1. Used imports in code to make them "used"
2. Added `// @ts-ignore` comments where appropriate
3. Removed truly unused imports
4. Used `import type` for type-only imports

### 3. Import Path Extensions in ES Modules
**Problem**:
- Relative import paths need explicit file extensions in ECMAScript imports when `--moduleResolution` is `node16` or `nodenext`
- Error: `TS2835: Relative import paths need explicit file extensions...`
- Affected: `src/services/inference/inference.ts`

**Solution**:
```typescript
// OLD
import config from '../../config/index';

// NEW
import config from '../../config/index.js';
```

### 4. Native Module Loading in ES Modules
**Problem**:
- Native modules (`.node` files) require CommonJS `require()` which is not directly available in ES modules
- Need to use `createRequire` for native module loading

**Solution**:
```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Then use normally
const nativeModule = require('./path/to/native.node');
```

## Build System Configuration Issues

### TypeScript Compiler Options
**Problem**: 
- Strict compilation settings caused build failures
- Needed to balance type safety with ES module compatibility

**Solution**:
Updated `tsconfig.json` with appropriate settings:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

## Verification Steps

After applying fixes:
1. Run `npm run build` to ensure TypeScript compilation succeeds
2. Test functionality in both development and production builds
3. Verify that all new features work as expected
4. Confirm that native modules load correctly
5. Test cross-platform compatibility

## Prevention Strategies

### For Future Development
1. Always add `.js` extensions to relative imports in ES modules
2. Use the ES module compatible path resolution pattern when directory access is needed
3. Be mindful of unused imports that TypeScript will flag as errors
4. Test builds regularly to catch compatibility issues early
5. Use `import type` for imports that are only used for typing

### Code Review Checklist
- [ ] All relative imports have `.js` extensions
- [ ] Path resolution uses ES module compatible patterns
- [ ] No unused imports or variables
- [ ] Native modules loaded with `createRequire`
- [ ] Type-only imports use `import type`

## Related Standards
- Standard 076: TypeScript Compilation and ES Module Compatibility
- Standard 074: Native Module Acceleration (The "Iron Lung" Protocol)
- Standard 051: Service Module Path Resolution