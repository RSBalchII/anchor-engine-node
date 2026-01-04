/**
 * Context Aggregation Tool for ECE_Core Engine
 *
 * This script recursively scans all text files in the context directory,
 * aggregates their content into a single YAML file with a 200k token limit.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

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

    // Always ignore certain files
    const ignoreFiles = ['.DS_Store', 'Thumbs.db'];
    if (ignoreFiles.includes(fileName) || fileName.endsWith('.log') || fileName.endsWith('.tmp') || fileName.endsWith('.temp')) {
        return true;
    }

    // Skip binary files based on extension
    const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.exe', '.bin', '.zip', '.tar', '.gz', '.rar', '.7z', '.pdf'];
    if (binaryExts.includes(ext)) {
        return true;
    }

    // Skip large files to avoid memory issues
    try {
        const stats = fs.statSync(filePath);
        if (stats.size > 10 * 1024 * 1024) { // 10MB limit
            return true;
        }
    } catch (e) {
        // If we can't stat the file, skip it
        return true;
    }

    return false;
}

// Function to aggregate all file contents from context directory
function createFullCorpusRecursive() {
    const contextDir = path.join(__dirname, '..', '..', 'context');
    console.log(`Scanning context directory: ${contextDir}`);

    if (!fs.existsSync(contextDir)) {
        console.log('Context directory does not exist, creating it...');
        fs.mkdirSync(contextDir, { recursive: true });
        return;
    }

    const aggregatedData = {
        project_structure: contextDir,
        files: []
    };

    let totalTokens = 0;
    const tokenLimit = 200000; // 200k tokens

    // Walk through all files in the context directory
    function walkDirectory(currentPath) {
        let items;
        try {
            items = fs.readdirSync(currentPath);
        } catch (e) {
            // If we can't read the directory, skip it
            console.error(`Cannot read directory ${currentPath}: ${e.message}`);
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
                    const relativePath = path.relative(contextDir, itemPath);
                    const fileData = {
                        path: relativePath,
                        content: content,
                        size: content.length,
                        tokens: fileTokens
                    };

                    aggregatedData.files.push(fileData);
                    totalTokens += fileTokens;

                    console.log(`Processed: ${relativePath} (${fileTokens} tokens)`);

                } catch (e) {
                    // If it's not a text file or there's an error, skip it
                    console.log(`Error reading file ${itemPath}: ${e.message}`);
                }
            }
        }
    }

    walkDirectory(contextDir);

    aggregatedData.metadata = {
        total_files: aggregatedData.files.length,
        total_tokens: totalTokens,
        token_limit: tokenLimit,
        token_limit_reached: totalTokens >= tokenLimit,
        timestamp: new Date().toISOString()
    };

    // Write to YAML file in context directory
    const outputFile = path.join(contextDir, "combined_context.yaml");
    const yamlContent = yaml.dump(aggregatedData, { lineWidth: -1 });
    fs.writeFileSync(outputFile, yamlContent);

    console.log("Aggregation complete!");
    console.log(`Output file: ${outputFile}`);
    console.log(`Total files processed: ${aggregatedData.metadata.total_files}`);
    console.log(`Total tokens: ${aggregatedData.metadata.total_tokens}`);

    return aggregatedData;
}

module.exports = { createFullCorpusRecursive };

// Run if this file is executed directly
if (require.main === module) {
    console.log('Starting context aggregation from context directory...');
    createFullCorpusRecursive();
}