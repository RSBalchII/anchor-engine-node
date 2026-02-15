/**
 * Prioritized Context Aggregation Tool
 *
 * Scans the project and aggregates the MOST IMPORTANT files first,
 * fitting within a 200k token budget. Files are priority-ranked so
 * core engine code, types, and config always make it in before tests,
 * specs, docs, and peripheral scripts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

// Configuration options
const CONFIG = {
    // Token limits
    tokenLimit: 200000, // 200k tokens — fits in a single LLM context window
    maxFileSize: 2 * 1024 * 1024, // 2MB max per file
    maxLinesPerFile: 3000, // Max 3000 lines per file

    // Output options
    outputDir: 'codebase',
    outputFile: 'combined_context.yaml',

    // File inclusion/exclusion patterns
    includeExtensions: [
        // Code files (primary)
        '.js', '.ts', '.jsx', '.tsx', '.mjs',
        // Config & data
        '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
        // Shell/scripts
        '.sh', '.bash', '.bat', '.ps1',
        // Docs (lower priority but included)
        '.md', '.txt',
        // SQL
        '.sql',
        // Other source
        '.py', '.cpp', '.c', '.h', '.cs',
    ],

    excludeExtensions: [
        // Binary files
        '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp',
        '.exe', '.bin', '.dll', '.so', '.dylib', '.zip', '.tar', '.gz', '.rar', '.7z',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
        '.ttf', '.otf', '.woff', '.woff2',
        // Build/cache files
        '.o', '.obj', '.a', '.lib', '.out', '.class', '.jar', '.war', '.swp', '.swo',
        '.lock', '.cache', '.log', '.tmp', '.temp', '.DS_Store', 'Thumbs.db'
    ],

    excludeDirectories: [
        '.git', 'node_modules', 'archive', 'backups', 'logs', 'context', '.vscode',
        '.idea', '.pytest_cache', '__pycache__', 'dist', 'build', 'target',
        'venv', 'env', '.venv', '.env', 'Pods', 'Carthage', 'CocoaPods',
        '.next', '.nuxt', 'public', 'static', 'assets', 'images', 'img', 'codebase',
        'data', 'context_data', 'test_minimal_db', 'rbalchii', 'python_vision',
        'desktop-overlay', 'grammar',
    ],

    excludeFiles: [
        'combined_context.yaml', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'Gemfile.lock', 'Pipfile.lock', 'Cargo.lock', 'composer.lock',
        'go.sum', 'go.mod', 'requirements.txt', 'poetry.lock',
        '*.db', '*.sqlite', '*.sqlite3', '*.fdb', '*.mdb', '*.accdb',
        '*~', '*.tmp', '*.temp', '*.cache', '*.swp', '*.swo',
        'validation-report.md', 'OPTIMIZATION_SUMMARY.md', 'INSTALL_OPTIMIZED.md',
    ],

    // =========================================================================
    // PRIORITY TIERS — Files are scored and sorted BEFORE filling the budget.
    // Tier 1 (highest) always gets in. Tier 5 (lowest) only if budget remains.
    // =========================================================================
    priorityRules: [
        // TIER 1: Core engine source — the brain
        { pattern: /engine\/src\/services\/search\//, tier: 1 },
        { pattern: /engine\/src\/core\//, tier: 1 },
        { pattern: /engine\/src\/types\//, tier: 1 },
        { pattern: /engine\/src\/config\//, tier: 1 },
        { pattern: /engine\/src\/index\.ts$/, tier: 1 },
        { pattern: /engine\/src\/server/, tier: 1 },

        // TIER 2: Service layer — ingestion, tags, inference, LLM
        { pattern: /engine\/src\/services\//, tier: 2 },
        { pattern: /engine\/src\/utils\//, tier: 2 },
        { pattern: /engine\/src\/middleware\//, tier: 2 },
        { pattern: /engine\/src\/routes\//, tier: 2 },
        { pattern: /engine\/src\/agent\//, tier: 2 },

        // TIER 3: Config, package manifests, key scripts
        { pattern: /user_settings\.json$/, tier: 1 },
        { pattern: /tsconfig\.json$/, tier: 3 },
        { pattern: /package\.json$/, tier: 3 },
        { pattern: /sovereign\.yaml$/, tier: 2 },
        { pattern: /start\.(bat|sh)$/, tier: 3 },

        // TIER 4: Docs, specs, readmes (useful but not critical)
        { pattern: /README\.md$/i, tier: 4 },
        { pattern: /ROADMAP\.md$/i, tier: 4 },
        { pattern: /CHANGELOG\.md$/i, tier: 4 },
        { pattern: /specs\//, tier: 4 },
        { pattern: /docs\//, tier: 4 },
        { pattern: /\.md$/, tier: 4 },

        // TIER 5: Tests, benchmarks, tools, scripts
        { pattern: /test/, tier: 5 },
        { pattern: /benchmark/, tier: 5 },
        { pattern: /tools\//, tier: 5 },
        { pattern: /scripts\//, tier: 5 },
    ]
};

// Simple token counting function
function countTokens(text) {
    // A rough approximation: 1 token ≈ 4 characters or 1 word
    const words = text.match(/\b\w+\b/g) || [];
    return words.length + Math.ceil(text.length / 4);
}

// Function to check if a path should be ignored based on configuration
function shouldIgnore(filePath, rootDir) {
    const fileName = path.basename(filePath).toLowerCase();
    const dirName = path.dirname(filePath).split(path.sep).pop().toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // Check if directory should be excluded
    for (const excludeDir of CONFIG.excludeDirectories) {
        if (dirName === excludeDir.toLowerCase()) {
            return true;
        }
    }

    // Check if file extension should be excluded
    if (CONFIG.excludeExtensions.includes(ext)) {
        return true;
    }

    // Check if file should be excluded by name patterns
    for (const excludePattern of CONFIG.excludeFiles) {
        if (matchesPattern(fileName, excludePattern.toLowerCase()) ||
            matchesPattern(path.basename(filePath), excludePattern)) {
            return true;
        }
    }

    // Check if file is too large
    try {
        const stats = fs.statSync(filePath);
        if (stats.size > CONFIG.maxFileSize) {
            return true;
        }
    } catch (e) {
        // If we can't stat the file, skip it
        return true;
    }

    // Check if file extension should be included (if include list is specified)
    if (CONFIG.includeExtensions.length > 0) {
        const fullName = path.basename(filePath).toLowerCase();
        if (!CONFIG.includeExtensions.includes(ext) && !CONFIG.includeExtensions.includes(fullName)) {
            return true;
        }
    }

    return false;
}

// Helper function to check if a filename matches a pattern (supports wildcards)
function matchesPattern(fileName, pattern) {
    if (pattern === fileName) return true;

    if (pattern.startsWith('*') && fileName.endsWith(pattern.substring(1))) {
        return true;
    }

    if (pattern.endsWith('*') && fileName.startsWith(pattern.substring(0, pattern.length - 1))) {
        return true;
    }

    return false;
}

// Function to limit file content based on line count
function limitFileContent(content) {
    if (!content) return '';

    const lines = content.split('\n');
    if (lines.length <= CONFIG.maxLinesPerFile) {
        return content;
    }

    // Take the first and last parts of the file to preserve context
    const header = lines.slice(0, CONFIG.maxLinesPerFile / 2).join('\n');
    const footer = lines.slice(-CONFIG.maxLinesPerFile / 2).join('\n');

    return `${header}\n\n... [CONTENT TRUNCATED - ${lines.length - CONFIG.maxLinesPerFile} LINES REMOVED] ...\n\n${footer}`;
}

// Function to assign a priority tier to a file (lower = more important)
function getPriorityTier(relativePath) {
    const normalized = relativePath.replace(/\\/g, '/');
    for (const rule of CONFIG.priorityRules) {
        if (rule.pattern.test(normalized)) {
            return rule.tier;
        }
    }
    // Default tier for unmatched files
    const ext = path.extname(relativePath).toLowerCase();
    if (ext === '.ts' || ext === '.js' || ext === '.mjs') return 3;
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') return 3;
    return 5; // Lowest priority for everything else
}

// Function to aggregate all file contents from the project root (PRIORITY-SORTED)
export function createFullCorpusRecursive(rootDir = process.cwd()) {
    // Allow rootDir to be passed as command line argument
    if (process.argv[2] && process.argv[2] !== 'json' && process.argv[2] !== 'yaml') {
        rootDir = path.resolve(process.argv[2]);
    }

    const outputDir = path.join(rootDir, CONFIG.outputDir);
    console.log(`Scanning project root: ${rootDir}`);
    console.log(`Token budget: ${CONFIG.tokenLimit.toLocaleString()} tokens`);

    if (!fs.existsSync(outputDir)) {
        console.log(`Output directory does not exist, creating: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // PHASE 1: Discover all eligible files and their metadata (no content yet)
    const candidates = [];

    function walkDirectory(currentPath) {
        let items;
        try {
            items = fs.readdirSync(currentPath);
        } catch (e) {
            console.warn(`Could not read directory: ${currentPath} - ${e.message}`);
            return;
        }

        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const relativePath = path.relative(rootDir, itemPath);

            let stat;
            try {
                stat = fs.statSync(itemPath);
            } catch (e) {
                continue;
            }

            if (stat.isDirectory()) {
                const dirName = item.toLowerCase();
                if (CONFIG.excludeDirectories.some(exclude => dirName === exclude.toLowerCase())) {
                    continue;
                }
                walkDirectory(itemPath);
            } else {
                if (shouldIgnore(itemPath, rootDir)) {
                    continue;
                }
                candidates.push({
                    absolutePath: itemPath,
                    relativePath: relativePath,
                    size: stat.size,
                    tier: getPriorityTier(relativePath),
                });
            }
        }
    }

    walkDirectory(rootDir);

    // PHASE 2: Sort by priority tier (ascending), then by path depth (shallower first)
    candidates.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        // Within same tier, prefer shallower files (closer to root = more important)
        const depthA = a.relativePath.split(path.sep).length;
        const depthB = b.relativePath.split(path.sep).length;
        if (depthA !== depthB) return depthA - depthB;
        // Within same depth, alphabetical
        return a.relativePath.localeCompare(b.relativePath);
    });

    console.log(`\nDiscovered ${candidates.length} eligible files. Filling budget by priority...\n`);

    // PHASE 3: Fill the token budget in priority order
    const aggregatedData = {
        project_structure: rootDir,
        scan_config: {
            tokenLimit: CONFIG.tokenLimit,
            maxFileSize: CONFIG.maxFileSize,
            maxLinesPerFile: CONFIG.maxLinesPerFile,
            priorityTiers: '1=core engine, 2=services, 3=config/scripts, 4=docs/specs, 5=tests/tools',
        },
        files: []
    };

    let totalTokens = 0;
    let skippedFiles = 0;
    const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tierTokens = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const candidate of candidates) {
        try {
            const rawContent = fs.readFileSync(candidate.absolutePath, 'utf-8');
            const content = limitFileContent(rawContent);
            const fileTokens = countTokens(content);

            if (totalTokens + fileTokens > CONFIG.tokenLimit) {
                skippedFiles++;
                // Log first few skips so user sees what's being cut
                if (skippedFiles <= 5) {
                    console.log(`  [SKIP T${candidate.tier}] ${candidate.relativePath} (${fileTokens} tok) — budget full`);
                }
                continue;
            }

            const fileData = {
                path: candidate.relativePath,
                priority: candidate.tier,
                content: content,
                tokens: fileTokens,
                size: candidate.size,
            };

            aggregatedData.files.push(fileData);
            totalTokens += fileTokens;
            tierCounts[candidate.tier] = (tierCounts[candidate.tier] || 0) + 1;
            tierTokens[candidate.tier] = (tierTokens[candidate.tier] || 0) + fileTokens;
            console.log(`  [T${candidate.tier}] ${candidate.relativePath} (${fileTokens} tok)`);
        } catch (e) {
            console.warn(`Could not read file: ${candidate.absolutePath} - ${e.message}`);
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PRIORITY BUDGET REPORT`);
    console.log(`${'='.repeat(60)}`);
    for (const tier of [1, 2, 3, 4, 5]) {
        if (tierCounts[tier] > 0) {
            console.log(`  Tier ${tier}: ${tierCounts[tier]} files, ${tierTokens[tier].toLocaleString()} tokens`);
        }
    }
    console.log(`${'─'.repeat(60)}`);
    console.log(`  Total: ${aggregatedData.files.length} files, ${totalTokens.toLocaleString()} tokens`);
    console.log(`  Budget: ${((totalTokens / CONFIG.tokenLimit) * 100).toFixed(1)}% of ${CONFIG.tokenLimit.toLocaleString()}`);
    if (skippedFiles > 0) {
        console.log(`  Skipped: ${skippedFiles} lower-priority files (budget exhausted)`);
    }
    console.log(`${'='.repeat(60)}\n`);

    aggregatedData.metadata = {
        total_files: aggregatedData.files.length,
        total_tokens: totalTokens,
        token_limit: CONFIG.tokenLimit,
        token_limit_reached: totalTokens >= CONFIG.tokenLimit,
        budget_utilization: `${((totalTokens / CONFIG.tokenLimit) * 100).toFixed(1)}%`,
        skipped_files: skippedFiles,
        tier_breakdown: tierCounts,
        tier_tokens: tierTokens,
        timestamp: new Date().toISOString(),
        root_directory: rootDir,
    };

    // Write to YAML file in output directory
    const outputFile = path.join(outputDir, CONFIG.outputFile);
    const yamlContent = yaml.dump(aggregatedData, {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false
    });
    fs.writeFileSync(outputFile, yamlContent);

    console.log("Aggregation complete!");
    console.log(`Output file: ${outputFile}`);
    console.log(`Total files processed: ${aggregatedData.metadata.total_files}`);
    console.log(`Total tokens: ${aggregatedData.metadata.total_tokens}`);
    console.log(`Scan completed at: ${new Date().toISOString()}`);

    return aggregatedData;
}

// Alternative function to output JSON format
export function createFullCorpusRecursiveJSON(rootDir = process.cwd()) {
    const result = createFullCorpusRecursive(rootDir);
    const outputDir = path.join(rootDir, CONFIG.outputDir);
    const outputFile = path.join(outputDir, CONFIG.outputFile.replace('.yaml', '.json'));

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`JSON output also saved to: ${outputFile}`);

    return result;
}

export { CONFIG };

// Run if this file is executed directly
const __filename = fileURLToPath(import.meta.url);
const entryFile = process.argv[1];

if (entryFile === __filename) {
    console.log('Starting universal project aggregation...');

    // Allow format selection via command line argument
    const format = process.argv[3] || 'yaml';
    let rootDir = process.argv[2];

    // Check if first arg is format instead of dir
    if (rootDir === 'json' || rootDir === 'yaml') {
        rootDir = process.cwd();
    } else {
        rootDir = rootDir || process.cwd();
    }

    if (process.argv.includes('json') || format.toLowerCase() === 'json') {
        createFullCorpusRecursiveJSON(rootDir);
    } else {
        createFullCorpusRecursive(rootDir);
    }
}
