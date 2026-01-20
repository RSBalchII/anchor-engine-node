
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../core/db.js';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

export interface BackupStats {
    memory_count: number;
    source_count: number;
    engram_count: number;
    timestamp: string;
}

export async function createBackup(): Promise<{ filename: string; stats: BackupStats }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    console.log(`[Backup] Starting backup to ${filename}...`);

    // 1. Dump Memory
    const memoryResult = await db.run('?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding] := *memory{id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding}');

    // 2. Dump Source
    const sourceResult = await db.run('?[path, hash, total_atoms, last_ingest] := *source{path, hash, total_atoms, last_ingest}');

    // 3. Dump Engrams
    const engramResult = await db.run('?[key, value] := *engrams{key, value}');

    const backupData = {
        timestamp: new Date().toISOString(),
        memory: memoryResult.rows || [],
        source: sourceResult.rows || [],
        engrams: engramResult.rows || []
    };

    await fs.promises.writeFile(filePath, JSON.stringify(backupData, null, 2));

    const stats: BackupStats = {
        memory_count: (backupData.memory).length,
        source_count: (backupData.source).length,
        engram_count: (backupData.engrams).length,
        timestamp: backupData.timestamp
    };

    console.log(`[Backup] Completed. Stats:`, stats);
    return { filename, stats };
}

export async function listBackups(): Promise<string[]> {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    const files = await fs.promises.readdir(BACKUP_DIR);
    return files.filter(f => f.endsWith('.json')).sort().reverse(); // Newest first
}

export async function restoreBackup(filename: string): Promise<BackupStats> {
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filename}`);
    }

    console.log(`[Backup] Restoring from ${filename}...`);
    const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

    // 1. Restore Memory
    if (data.memory && data.memory.length > 0) {
        // Clear table? User requested "load the db FROM the backup... THEN ingest". 
        // Usually restore implies wiping current state or merging.
        // Idempotent Put handles merging.
        // If we want to restore to a specific state, we might ideally wipe first.
        // But "Attempt to not add in the same data if it exactly matches" suggests merging/idempotency.
        // Let's use :put (Upsert).

        // Batch insert
        const BATCH_SIZE = 100;
        for (let i = 0; i < data.memory.length; i += BATCH_SIZE) {
            const batch = data.memory.slice(i, i + BATCH_SIZE);
            await db.run(
                `?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding] <- $data
                 :put memory {id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding}`,
                { data: batch }
            );
        }
    }

    // 2. Restore Source
    if (data.source && data.source.length > 0) {
        await db.run(
            `?[path, hash, total_atoms, last_ingest] <- $data :put source {path, hash, total_atoms, last_ingest}`,
            { data: data.source }
        );
    }

    // 3. Restore Engrams
    if (data.engrams && data.engrams.length > 0) {
        await db.run(
            `?[key, value] <- $data :put engrams {key, value}`,
            { data: data.engrams }
        );
    }

    console.log(`[Backup] Restore Completed.`);

    return {
        memory_count: data.memory?.length || 0,
        source_count: data.source?.length || 0,
        engram_count: data.engrams?.length || 0,
        timestamp: new Date().toISOString()
    };
}
