# Standard 076: TypeScript Compilation and ES Module Compatibility

**Status**: Active | **Domain**: 00-CORE | **Category**: Build Systems & Module Compatibility

## 1. Problem Statement

During the evolution of the ECE_Core project, several TypeScript compilation and ES Module compatibility issues were encountered when building the project with `tsc` (TypeScript compiler). These issues stemmed from differences between CommonJS and ES Module environments, particularly around the availability of `__dirname` and handling of unused imports.

## 2. Issues Encountered

### 2.1 __dirname Unavailability in ES Modules
- **Issue**: `__dirname` is not available in ES module scope when `"type": "module"` is set in package.json
- **Error**: `ReferenceError: __dirname is not defined in ES module scope`
- **Affected Files**: 
  - `src/utils/path-manager.ts`
  - `src/core/db.ts`
  - `src/services/ingest/atomizer.ts`
  - `src/services/ingest/refiner.ts`
  - `src/services/ingest/ingester.ts`

### 2.2 Unused Import/Variable Errors
- **Issue**: TypeScript compiler complained about unused imports and variables
- **Error**: `TS6133: 'X' is declared but its value is never read`
- **Affected Variables**: `path`, `__filename`, `require`, `getNativePath`

### 2.3 Import Path Extensions in ES Modules
- **Issue**: Relative import paths need explicit file extensions in ECMAScript imports when `--moduleResolution` is `node16` or `nodenext`
- **Error**: `TS2835: Relative import paths need explicit file extensions...`
- **Affected Files**: `src/services/inference/inference.ts`

## 3. Solutions Applied

### 3.1 __dirname Replacement in ES Modules
For files requiring directory path resolution, replaced `__dirname` with ES module compatible approach:

```typescript
// OLD (CommonJS)
const __dirname = path.dirname(__filename);

// NEW (ES Module)
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### 3.2 Proper Import Usage
To address unused import errors, either:
1. Used the imports in the code to make them "used"
2. Added `// @ts-ignore` comments where appropriate
3. Removed truly unused imports

### 3.3 Explicit File Extensions
Added `.js` extensions to all relative imports in ES modules:
```typescript
// OLD
import config from '../../config/index';

// NEW
import config from '../../config/index.js';
```

## 4. Best Practices for ES Module Compatibility

### 4.1 Path Resolution in ES Modules
When working with file paths in ES modules:
- Always use `import.meta.url` to get the current module URL
- Use `fileURLToPath(import.meta.url)` to convert to file path
- Use `path.dirname()` to get the directory path

### 4.2 Import Management
- Avoid importing types that are not used in runtime code if they're only for type checking
- Use `import type` for imports that are only used for typing
- Add explicit file extensions (`.js`) to relative imports in ES modules

### 4.3 Conditional Code for Both CJS and ES
For code that needs to work in both CommonJS and ES module environments:
```typescript
let __dirname: string;
if (typeof __dirname !== 'undefined') {
  // CommonJS environment
  __dirname = __dirname;
} else {
  // ES Module environment
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
}
```

## 5. Verification Steps

After applying fixes:
1. Run `npm run build` to ensure TypeScript compilation succeeds
2. Test functionality in both development and production builds
3. Verify that all new features work as expected
4. Confirm that native modules load correctly

## 6. Impact on Development Workflow

Developers working on the ECE_Core project should:
- Always add `.js` extensions to relative imports in ES modules
- Use the ES module compatible path resolution pattern when directory access is needed
- Be mindful of unused imports that TypeScript will flag as errors
- Test builds regularly to catch compatibility issues early

## 7. Related Standards
- Standard 074: Native Module Acceleration (The "Iron Lung" Protocol)
- Standard 051: Service Module Path Resolution
- Standard 053: CozoDB Pain Points & OS Compatibility