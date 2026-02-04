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

    watcher = chokidar.watch([inbox, externalInbox], {
        ignored: IGNORE_PATTERNS,
        persistent: true,
        ignoreInitial: false, // Force scan on start to ingest existing files
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });

    watcher
        .on('add', (path) => processFile(path, 'add'))
        .on('change', (path) => processFile(path, 'change'))
        .on('addDir', (path) => console.log(`[Watchdog] Detected new directory: ${path}`));

    // .on('unlink', (path) => deleteFile(path)); // Implement delete logic later
}

import { AtomizerService } from './atomizer-service.js';
import { AtomicIngestService } from './ingest-atomic.js';

// Singleton Services
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

        console.log(`[Watchdog] Atomic Pipeline: ${relativePath}`);

        // 3. ATOMIZE
        // Determine provenance
        let provenance: 'internal' | 'external' = 'external';
        if (relativePath.includes('inbox') && !relativePath.includes('external-inbox')) {
            provenance = 'internal';
        }

        const topology = await atomizer.atomize(content, relativePath, provenance);

        // 4. CLEANUP (Full Refresh Strategy)
        // Find existing chunks for this file and wipe them to prevent ghosts
        // We look for anything linked to this source path
        const pathQuery = `SELECT id FROM atoms WHERE source_path = $1`;
        const existingResult = await db.run(pathQuery, [relativePath]);

        if (existingResult.rows && existingResult.rows.length > 0) {
            const idsToDelete = existingResult.rows.map((r: any) => {
                // Handle both array and object formats that PGlite might return
                if (Array.isArray(r)) {
                    return r[0]; // If array format, id is at index 0
                } else {
                    return r.id; // If object format, use id property
                }
            });
            console.log(`[Watchdog] Cleaning up ${idsToDelete.length} stale fragments...`);
            await db.run(`DELETE FROM atoms WHERE id = ANY($1)`, [idsToDelete]);
        }

        // 5. INGEST (Atomic)
        // Determine Bucket
        const parts = relativePath.split(path.sep);
        let bucket = 'notebook';
        if (parts.length >= 2) {
            bucket = parts[0] === 'inbox' && parts.length > 2 ? parts[1] : parts[0];
        }

        await atomicIngest.ingestResult(
            topology.compound,
            topology.molecules,
            topology.atoms,
            [bucket]
        );

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
                topology.molecules.length, // Track molecules count
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
