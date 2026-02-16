/**
 * Watchdog Service
 *
 * Scans the Notebook directory for changes and ingests new content.
 * Uses 'chokidar' for efficient file watching.
 */

import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '../../core/db.js';
import { NOTEBOOK_DIR } from '../../config/paths.js';
import { ingestAtoms } from './ingest.js';
import { config } from '../../config/index.js';

let watcher: chokidar.FSWatcher | null = null;
const IGNORE_PATTERNS = /(^|[\/\\])\../; // Ignore dotfiles

export async function startWatchdog() {
    if (watcher) return;

    if (!fs.existsSync(NOTEBOOK_DIR)) {
        console.warn(`[Watchdog] Notebook directory not found: ${NOTEBOOK_DIR}. Skipping watch.`);
        return;
    }

    const inbox = path.join(NOTEBOOK_DIR, 'inbox');
    const externalInbox = path.join(NOTEBOOK_DIR, 'external-inbox');

    console.log(`[Watchdog] Starting watch on: ${inbox} and ${externalInbox}`);

    if (!fs.existsSync(inbox)) {
        console.warn(`[Watchdog] Inbox directory not found: ${inbox}. Skipping watch.`);
        return;
    }

    // Auto-create external inbox if missing
    if (!fs.existsSync(externalInbox)) {
        fs.mkdirSync(externalInbox, { recursive: true });
    }

    // Load extra paths from config
    const extraPaths = config.WATCHER_EXTRA_PATHS || [];
    const validExtraPaths = extraPaths.filter((p: string) => {
        if (fs.existsSync(p)) return true;
        console.warn(`[Watchdog] Extra path not found: ${p}`);
        return false;
    });

    const pathsToWatch = [inbox, externalInbox, ...validExtraPaths];

    watcher = chokidar.watch(pathsToWatch, {
        ignored: IGNORE_PATTERNS,
        persistent: true,
        ignoreInitial: false, // Force scan on start to ingest existing files
        awaitWriteFinish: {
            stabilityThreshold: config.WATCHER_STABILITY_THRESHOLD_MS,
            pollInterval: 100
        }
    });

    watcher
        .on('add', (path) => processFile(path, 'add'))
        .on('change', (path) => processFile(path, 'change'))
        .on('addDir', (path) => console.log(`[Watchdog] Detected new directory: ${path}`));

    // .on('unlink', (path) => deleteFile(path)); // Implement delete logic later
}

// Dynamic Path Management
export function getWatchedPaths(): string[] {
    if (!watcher) return [];
    // chokidar.getWatched() returns an object where keys are paths
    // But it returns all subdirectories too. We mainly want the roots we added.
    // For simplicity, we can return the configured roots + static roots.

    // Better approach: Return the paths explicitly tracked
    const inbox = path.join(NOTEBOOK_DIR, 'inbox');
    const externalInbox = path.join(NOTEBOOK_DIR, 'external-inbox');
    const extraPaths = config.WATCHER_EXTRA_PATHS || [];

    return [inbox, externalInbox, ...extraPaths];
}

export async function addWatchPath(newPath: string): Promise<boolean> {
    if (!fs.existsSync(newPath)) {
        throw new Error(`Path does not exist: ${newPath}`);
    }

    if (!watcher) {
        throw new Error("Watchdog not started");
    }

    // Add to watcher
    watcher.add(newPath);
    console.log(`[Watchdog] Added dynamic watch path: ${newPath}`);

    // Update Config (In-Memory)
    if (!config.WATCHER_EXTRA_PATHS) config.WATCHER_EXTRA_PATHS = [];
    if (!config.WATCHER_EXTRA_PATHS.includes(newPath)) {
        config.WATCHER_EXTRA_PATHS.push(newPath);

        // Persist to user_settings.json
        try {
            const settingsPath = path.join(process.cwd(), 'user_settings.json');
            if (fs.existsSync(settingsPath)) {
                const settingsRequest = await fs.promises.readFile(settingsPath, 'utf8');
                const settings = JSON.parse(settingsRequest);

                if (!settings.watcher) settings.watcher = {};
                if (!settings.watcher.extra_paths) settings.watcher.extra_paths = [];

                if (!settings.watcher.extra_paths.includes(newPath)) {
                    settings.watcher.extra_paths.push(newPath);
                    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 4));
                    console.log(`[Watchdog] Persisted path to user_settings.json`);
                }
            }
        } catch (e: any) {
            console.error(`[Watchdog] Failed to persist settings: ${e.message}`);
        }
    }

    return true;
}

export async function removeWatchPath(pathToRemove: string): Promise<boolean> {
    if (!watcher) {
        throw new Error("Watchdog not started");
    }

    // Remove from watcher
    // chokidar.unwatch() accepts a file, dir, or array of them
    watcher.unwatch(pathToRemove);
    console.log(`[Watchdog] Removed watch path: ${pathToRemove}`);

    // Update Config (In-Memory)
    if (config.WATCHER_EXTRA_PATHS && config.WATCHER_EXTRA_PATHS.includes(pathToRemove)) {
        config.WATCHER_EXTRA_PATHS = config.WATCHER_EXTRA_PATHS.filter((p: string) => p !== pathToRemove);

        // Persist to user_settings.json
        try {
            const settingsPath = path.join(process.cwd(), 'user_settings.json');
            if (fs.existsSync(settingsPath)) {
                const settingsRequest = await fs.promises.readFile(settingsPath, 'utf8');
                const settings = JSON.parse(settingsRequest);

                if (settings.watcher && settings.watcher.extra_paths) {
                    settings.watcher.extra_paths = settings.watcher.extra_paths.filter((p: string) => p !== pathToRemove);
                    await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 4));
                    console.log(`[Watchdog] Persisted path removal to user_settings.json`);
                }
            }
        } catch (e: any) {
            console.error(`[Watchdog] Failed to persist settings removal: ${e.message}`);
        }
    }

    return true;
}

// Revert to AtomizerService for performance
// import { SemanticIngestionService } from '../semantic/semantic-ingestion-service.js';
import { AtomizerService } from './atomizer-service.js';
import { AtomicIngestService } from './ingest-atomic.js';
// import { ingestAtoms } from './ingest.js'; // Already imported at top of file

// Singleton Services
// const semanticIngest = new SemanticIngestionService();
const atomizer = new AtomizerService();
const atomicIngest = new AtomicIngestService();

async function processFile(filePath: string, event: string) {
    if (!filePath.endsWith('.md') && !filePath.endsWith('.txt') && !filePath.endsWith('.yaml') && !filePath.endsWith('.csv') && !filePath.endsWith('.json')) return;
    if (filePath.includes('mirrored_brain')) return;

    console.log(`[Watchdog] Detected ${event}: ${filePath}`);

    try {
        const buffer = await fs.promises.readFile(filePath);
        if (buffer.length === 0) return;

        // 1. Calculate File Hash (Raw)
        const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const relativePath = path.relative(NOTEBOOK_DIR, filePath);
        const content = buffer.toString('utf8');

        // 2. Check Source Table (Change Detection)
        const sourceQuery = `SELECT path, hash FROM sources WHERE path = $1`;
        const sourceResult = await db.run(sourceQuery, [relativePath]);

        // Handle potential null result
        if (!sourceResult || !sourceResult.rows) {
            console.log(`[Watchdog] No existing record for path: ${relativePath}`);
        }

        if (sourceResult && sourceResult.rows && sourceResult.rows.length > 0) {
            const row = sourceResult.rows[0];
            // Handle both array and object formats that PGlite might return
            let existingHash;
            if (Array.isArray(row)) {
                // Row is in array format [path, hash]
                existingHash = row[1];
            } else {
                // Row is in object format {path, hash}
                existingHash = row.hash;
            }
            if (existingHash === fileHash) {
                console.log(`[Watchdog] File unchanged (hash match): ${relativePath}`);
                return;
            }
        }

        console.log(`[Watchdog] Processing Pipeline: ${relativePath}`);

        // 3. DETERMINE METADATA
        // Determine buckets
        const parts = relativePath.split(path.sep);
        let bucket = 'notebook';

        // logic: if inside a root folder (inbox/external-inbox) and has a subfolder, use subfolder as bucket
        // otherwise use the root folder
        if (parts.length >= 2) {
            const root = parts[0];
            if ((root === 'inbox' || root === 'external-inbox') && parts.length > 2) {
                bucket = parts[1];
            } else {
                bucket = root;
            }
        }

        // Determine type
        const ext = path.extname(filePath).replace('.', '');
        const type = ext || 'text';

        // Determine Provenance
        let provenance: 'internal' | 'external' = 'internal';
        if (relativePath.includes('external-inbox') || relativePath.includes('web_scrape')) {
            provenance = 'external';
        }

        // 4. ATOMIZE (Legacy Pipeline)
        // This is the fast, regex-based splitter that respects token limits and semantics without heavy NLP
        const { compound, molecules, atoms } = await atomizer.atomize(
            content,
            relativePath,
            provenance
        );

        // 5. INGEST (Atomic)
        // Use the specialized AtomicIngestService for efficiency
        await atomicIngest.ingestResult(compound, molecules, atoms, [bucket]);

        // 6. Update Source Table
        await db.run(
            `INSERT INTO sources (path, hash, total_atoms, last_ingest)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (path) DO UPDATE SET
               hash = EXCLUDED.hash,
               total_atoms = EXCLUDED.total_atoms,
               last_ingest = EXCLUDED.last_ingest`,
            [
                relativePath,
                fileHash,
                atoms.length,
                Date.now()
            ]
        );

        console.log(`[Watchdog] Sync Complete: ${relativePath}`);

        // Trigger Mirror
        try {
            const { createMirror } = await import('../mirror/mirror.js');
            await createMirror();
        } catch (e: any) { console.error(`[Watchdog] Mirror trigger failed:`, e.message); }

    } catch (e: any) {
        console.error(`[Watchdog] Error processing ${filePath}:`, e.message);
    }
}
