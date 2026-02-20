import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test to validate that all dynamic imports in the codebase use the correct .js extension
 * This prevents ESM/CJS interop issues when running the application
 */

// Function to recursively find all .js, .ts, .mjs, and .cjs files in a directory
function getAllSourceFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            // Skip node_modules and dist directories to focus on source code
            if (file !== 'node_modules' && file !== 'dist' && !file.startsWith('.')) {
                getAllSourceFiles(filePath, fileList);
            }
        } else if (/\.(js|ts|mjs|cjs)$/.test(path.extname(filePath))) {
            fileList.push(filePath);
        }
    }
    
    return fileList;
}

// Function to find all dynamic import statements in a file
function findDynamicImports(content, filePath) {
    // Regular expression to match dynamic import statements
    // Looks for await import(...) or import(...) patterns
    const dynamicImportRegex = /(await\s+)?import\s*\(\s*["'](.*?\.(js|ts))["']\s*\)/g;
    const matches = [];
    let match;
    
    while ((match = dynamicImportRegex.exec(content)) !== null) {
        matches.push({
            fullMatch: match[0],
            hasAwait: match[1] ? true : false,
            importPath: match[2],
            extension: match[3],
            position: match.index
        });
    }
    
    return matches;
}

describe('Dynamic Import Validation', () => {
    it('should ensure all dynamic imports use .js extension for ESM compatibility', () => {
        // Get all source files from the src directory
        const srcDir = path.join(__dirname, '../src');
        const sourceFiles = getAllSourceFiles(srcDir);
        
        const errors = [];
        
        for (const filePath of sourceFiles) {
            const content = fs.readFileSync(filePath, 'utf8');
            const dynamicImports = findDynamicImports(content, filePath);
            
            for (const imp of dynamicImports) {
                // Check if the import path ends with .js for ESM compatibility
                if (!imp.importPath.endsWith('.js')) {
                    errors.push({
                        file: filePath,
                        importStatement: imp.fullMatch,
                        position: imp.position,
                        message: `Dynamic import uses '${imp.extension}' extension but should use '.js' for ESM compatibility`
                    });
                }
            }
        }
        
        // Also check some key files in the root and other directories
        const additionalFiles = [
            path.join(__dirname, '../server.js'),
            path.join(__dirname, '../index.js'),
            path.join(__dirname, '../src/index.ts'),
            path.join(__dirname, '../src/index.js')
        ];
        
        for (const filePath of additionalFiles) {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const dynamicImports = findDynamicImports(content, filePath);
                
                for (const imp of dynamicImports) {
                    if (!imp.importPath.endsWith('.js')) {
                        errors.push({
                            file: filePath,
                            importStatement: imp.fullMatch,
                            position: imp.position,
                            message: `Dynamic import uses '${imp.extension}' extension but should use '.js' for ESM compatibility`
                        });
                    }
                }
            }
        }
        
        // Report any errors found
        if (errors.length > 0) {
            console.error('\n❌ Dynamic Import Validation Failed!');
            console.error('Found dynamic imports that do not use .js extension:');
            
            for (const error of errors) {
                console.error(`\nFile: ${error.file}`);
                console.error(`Line: ${getLineNumber(error.file, error.position)}`);
                console.error(`Import: ${error.importStatement}`);
                console.error(`Issue: ${error.message}`);
            }
            
            throw new Error(`${errors.length} dynamic import(s) need to be updated to use .js extension`);
        }
        
        console.log(`✅ All dynamic imports validated successfully! Checked ${sourceFiles.length} source files.`);
    });
});

// Helper function to get line number from position in file
function getLineNumber(filePath, position) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.substring(0, position).split('\n');
    return lines.length;
}

// Additional test to validate specific known problematic files
describe('Specific Dynamic Import Checks', () => {
    it('should validate dynamic imports in key service files', () => {
        const keyFilesToCheck = [
            path.join(__dirname, '../src/services/inference/inference.ts'),
            path.join(__dirname, '../src/controllers/SearchController.js'),
            path.join(__dirname, '../src/controllers/ChatController.js'),
            path.join(__dirname, '../src/services/scribe/scribe.js'),
            path.join(__dirname, '../src/services/dreamer/dreamer.js'),
            path.join(__dirname, '../src/services/refiner/refiner.js')
        ];
        
        const errors = [];
        
        for (const filePath of keyFilesToCheck) {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const dynamicImports = findDynamicImports(content, filePath);
                
                for (const imp of dynamicImports) {
                    if (!imp.importPath.endsWith('.js')) {
                        errors.push({
                            file: filePath,
                            importStatement: imp.fullMatch,
                            position: imp.position,
                            message: `Dynamic import uses '${imp.extension}' extension but should use '.js' for ESM compatibility`
                        });
                    }
                }
            }
        }
        
        if (errors.length > 0) {
            console.error('\n❌ Specific Dynamic Import Validation Failed!');
            console.error('Found issues in key service files:');
            
            for (const error of errors) {
                console.error(`\nFile: ${error.file}`);
                console.error(`Line: ${getLineNumber(error.file, error.position)}`);
                console.error(`Import: ${error.importStatement}`);
                console.error(`Issue: ${error.message}`);
            }
            
            throw new Error(`${errors.length} dynamic import(s) in key files need to be updated`);
        }
        
        console.log(`✅ All key service files validated successfully!`);
    });
});