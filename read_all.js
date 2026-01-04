#!/usr/bin/env node

/**
 * Context Aggregation Tool for ECE_Core
 *
 * This script recursively scans all directories and files in the project,
 * aggregates their content into a single YAML file with a 200k token limit,
 * and omits files/directories specified in .gitignore.
 */

const fs = require('fs');
const path = require('path');

// Try to load js-yaml, with fallback error handling
let yaml;
try {
    yaml = require('js-yaml');
} catch (e) {
    console.error('js-yaml not found. Please install it with: npm install js-yaml');
    process.exit(1);
}

// Simple token counting function
function countTokens(text) {
    // A rough approximation: 1 token ≈ 4 characters or 1 word
    const words = text.match(/\b\w+\b/g) || [];
    return words.length + Math.floor(text.length / 4);
}

// Function to check if a path should be ignored
function shouldIgnore(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Always ignore certain directories
    const pathParts = relativePath.split(path.sep);
    const ignoreDirs = new Set(['.git', '__pycache__', '.pytest_cache', '.vscode', 'node_modules', '.venv', 'venv', 'archive']);
    if (pathParts.some(part => ignoreDirs.has(part))) {
        return true;
    }

    // Always ignore certain files
    const ignoreFiles = ['.DS_Store', 'Thumbs.db'];
    if (ignoreFiles.includes(fileName) || fileName.endsWith('.log') || fileName.endsWith('.tmp') || fileName.endsWith('.txt') || fileName.endsWith('.yaml')   || fileName.endsWith('.temp')) {
        return true;
    }

    // Skip binary files based on extension
    const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.exe', '.bin', '.zip', '.tar', '.gz', '.rar', '.7z'];
    if (binaryExts.includes(ext)) {
        return true;
    }

    return false;
}

// Function to aggregate all file contents
function aggregateContent(rootPath) {
    const aggregatedData = {
        project_structure: rootPath,
        files: []
    };

    let totalTokens = 0;
    const tokenLimit = 200000; // 200k tokens

    // Walk through all files in the directory
    function walkDirectory(currentPath) {
        let items;
        try {
            items = fs.readdirSync(currentPath);
        } catch (e) {
            // If we can't read the directory, skip it
            return;
        }

        for (const item of items) {
            const itemPath = path.join(currentPath, item);

            let stat;
            try {
                stat = fs.statSync(itemPath);
            } catch (e) {
                // If we can't access the file/directory (e.g., broken symlink), skip it
                continue;
            }

            if (stat.isDirectory()) {
                // Skip specific directories
                if (item === '.git' || item === '__pycache__' || item === '.pytest_cache' ||
                    item === '.vscode' || item === 'node_modules' ||
                    item === '.venv' || item === 'venv' || item === 'archive') {
                    continue;
                }

                walkDirectory(itemPath);
            } else {
                // Check if file should be ignored
                if (shouldIgnore(itemPath)) {
                    continue;
                }

                try {
                    // Read file as text
                    const content = fs.readFileSync(itemPath, 'utf-8');

                    // Count tokens in this file
                    const fileTokens = countTokens(content);

                    // Check if adding this file would exceed the token limit
                    if (totalTokens + fileTokens > tokenLimit) {
                        console.log(`Token limit reached. Skipping: ${itemPath}`);
                        break;
                    }

                    // Add file data to aggregated content
                    const relativePath = path.relative(rootPath, itemPath);
                    const fileData = {
                        path: relativePath,
                        content: content,
                        size: content.length,
                        tokens: fileTokens
                    };

                    aggregatedData.files.push(fileData);
                    totalTokens += fileTokens;

                } catch (e) {
                    // If it's not a text file or there's an error, skip it
                    // Only log if it's not a binary file error
                    if (e.code !== 'EISDIR' && !e.message.includes('Invalid character') && !e.message.includes('Unexpected')) {
                        // console.log(`Error reading file ${itemPath}: ${e.message}`);
                    }
                }
            }
        }
    }

    walkDirectory(rootPath);

    aggregatedData.metadata = {
        total_files: aggregatedData.files.length,
        total_tokens: totalTokens,
        token_limit: tokenLimit,
        token_limit_reached: totalTokens >= tokenLimit
    };

    return aggregatedData;
}

// Main function
function main() {
    const rootPath = process.cwd();

    console.log("Starting context aggregation...");
    console.log(`Root path: ${rootPath}`);

    const aggregatedData = aggregateContent(rootPath);

    // Write to YAML file
    const outputFile = path.join(rootPath, "combined_context.yaml");
    const yamlContent = yaml.dump(aggregatedData, { lineWidth: -1 });
    fs.writeFileSync(outputFile, yamlContent);

    console.log("Aggregation complete!");
    console.log(`Output file: ${outputFile}`);
    console.log(`Total files processed: ${aggregatedData.metadata.total_files}`);
    console.log(`Total tokens: ${aggregatedData.metadata.total_tokens}`);
    console.log(`Token limit: ${aggregatedData.metadata.token_limit}`);
    console.log(`Token limit reached: ${aggregatedData.metadata.token_limit_reached}`);
}

// Run the main function
main();
