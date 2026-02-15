
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
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

    console.log(`[Backup] Starting streaming backup to ${filename}...`);

    const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });

    // Helper to write to stream and wait for drain if needed
    // Helper to write to stream and wait for drain if needed
    const write = (data: string): Promise<void> => {
        return new Promise((resolve) => {
            if (!stream.write(data)) {
                stream.once('drain', resolve);
            } else {
                resolve();
            }
        });
    };

    let memoryCount = 0;
    let sourceCount = 0;
    let engramCount = 0;

    try {
        await write('{\n  "timestamp": "' + new Date().toISOString() + '",\n');

        // 1. Stream Memory
        await write('  "memory": [\n');
        let memoryLastId = '';
        let firstMemory = true;

        while (true) {
            const query = `
                SELECT id, timestamp, content, source_path as source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, simhash, embedding
                FROM atoms
                WHERE id > $1
                ORDER BY id
                LIMIT 500
            `;
            const result = await db.run(query, [memoryLastId]);

            if (!result.rows || result.rows.length === 0) break;

            for (const row of result.rows) {
                if (!firstMemory) await write(',\n');
                await write('    ' + JSON.stringify(row));
                firstMemory = false;
                memoryLastId = row.id as string;
                memoryCount++;
            }
        }
        await write('\n  ],\n');

        // 2. Stream Source
        await write('  "source": [\n');
        const sourceResult = await db.run('SELECT path, hash, total_atoms, last_ingest FROM sources');
        if (sourceResult.rows) {
            for (let i = 0; i < sourceResult.rows.length; i++) {
                if (i > 0) await write(',\n');
                await write('    ' + JSON.stringify(sourceResult.rows[i]));
                sourceCount++;
            }
        }
        await write('\n  ],\n');

        // 3. Stream Engrams
        await write('  "engrams": [\n');
        const engramResult = await db.run('SELECT key, value FROM engrams');
        if (engramResult.rows) {
            for (let i = 0; i < engramResult.rows.length; i++) {
                if (i > 0) await write(',\n');
                await write('    ' + JSON.stringify(engramResult.rows[i]));
                engramCount++;
            }
        }
        await write('\n  ]\n}');

    } catch (e: any) {
        console.error('[Backup] Streaming failed:', e);
        stream.end();
        throw e;
    }

    return new Promise((resolve, reject) => {
        stream.end(() => {
            const stats: BackupStats = {
                memory_count: memoryCount,
                source_count: sourceCount,
                engram_count: engramCount,
                timestamp: timestamp
            };
            console.log(`[Backup] Completed. Stats:`, stats);
            resolve({ filename, stats });
        });
        stream.on('error', reject);
    });
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

    console.log(`[Backup] Restoring from ${filename} (Streaming Mode)...`);

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentSection: 'none' | 'memory' | 'source' | 'engrams' = 'none';
    let batch: any[] = [];
    const BATCH_SIZE = 100;

    // Stats tracking
    let stats: BackupStats = {
        memory_count: 0,
        source_count: 0,
        engram_count: 0,
        timestamp: new Date().toISOString()
    };

    const flushBatch = async () => {
        if (batch.length === 0) return;

        if (currentSection === 'memory') {
            for (const row of batch) {
                await db.run(
                    `INSERT INTO atoms (id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, tags, epochs, provenance, simhash, embedding)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                     ON CONFLICT (id) DO UPDATE SET
                       content = EXCLUDED.content,
                       timestamp = EXCLUDED.timestamp,
                       source_path = EXCLUDED.source_path,
                       source_id = EXCLUDED.source_id,
                       sequence = EXCLUDED.sequence,
                       type = EXCLUDED.type,
                       hash = EXCLUDED.hash,
                       buckets = EXCLUDED.buckets,
                       tags = EXCLUDED.tags,
                       epochs = EXCLUDED.epochs,
                       provenance = EXCLUDED.provenance,
                       simhash = EXCLUDED.simhash,
                       embedding = EXCLUDED.embedding`,
                    row
                );
            }
            stats.memory_count += batch.length;
        } else if (currentSection === 'source') {
            for (const row of batch) {
                await db.run(
                    `INSERT INTO sources (path, hash, total_atoms, last_ingest)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (path) DO UPDATE SET
                       hash = EXCLUDED.hash,
                       total_atoms = EXCLUDED.total_atoms,
                       last_ingest = EXCLUDED.last_ingest`,
                    row
                );
            }
            stats.source_count += batch.length;
        } else if (currentSection === 'engrams') {
            for (const row of batch) {
                await db.run(
                    `INSERT INTO engrams (key, value)
                     VALUES ($1, $2)
                     ON CONFLICT (key) DO UPDATE SET
                       value = EXCLUDED.value`,
                    row
                );
            }
            stats.engram_count += batch.length;
        }

        batch = [];
    };

    for await (const line of rl) {
        const trimmed = line.trim();

        // Detect Section Start
        if (trimmed.startsWith('"memory": [')) {
            currentSection = 'memory';
            continue;
        } else if (trimmed.startsWith('"source": [')) {
            currentSection = 'source';
            continue;
        } else if (trimmed.startsWith('"engrams": [')) {
            currentSection = 'engrams';
            continue;
        }

        // Detect Section End
        if (trimmed.startsWith('],')) {
            await flushBatch();
            currentSection = 'none';
            continue;
        }

        // Process Data Lines
        if (currentSection !== 'none') {
            // Remove trailing comma if present
            const jsonStr = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
            try {
                // Only parse object-like lines
                if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
                    const item = JSON.parse(jsonStr);
                    batch.push(item);

                    if (batch.length >= BATCH_SIZE) {
                        await flushBatch();
                    }
                }
            } catch (e) {
                // Ignore parsing errors for non-data lines
            }
        }
    }

    // Final flush if any leftovers (though `],` should catch it)
    await flushBatch();

    console.log(`[Backup] Restore Completed. Stats:`, stats);
    return stats;
}
