/**
 * Mirror Protocol Service
 *
 * Creates a human-readable physical copy of the "AI Brain" by exporting
 * the entire CozoDB memory relation to files in the context/mirrored_brain directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../core/db.js';
import { NOTEBOOK_DIR } from '../../config/paths.js';

// Path to the mirrored brain directory
export const MIRRORED_BRAIN_PATH = path.join(NOTEBOOK_DIR, 'mirrored_brain');

/**
 * Mirror Protocol: Exports memories to Markdown files
 */
export async function createMirror() {
    console.log('🪞 Mirror Protocol: Starting brain mirroring process...');

    if (!fs.existsSync(MIRRORED_BRAIN_PATH)) {
        fs.mkdirSync(MIRRORED_BRAIN_PATH, { recursive: true });
    }

    const query = '?[id, timestamp, content, source, type, hash, buckets, tags] := *memory{id, timestamp, content, source, type, hash, buckets, tags}';
    const result = await db.run(query);

    if (!result.rows || result.rows.length === 0) {
        console.log('🪞 Mirror Protocol: No memories to mirror.');
        return;
    }

    console.log(`🪞 Mirror Protocol: Mirroring ${result.rows.length} memories to disk...`);

    let count = 0;
    for (const row of result.rows) {
        const [id, timestamp, content, source, type, _hash, buckets, tags] = row;
        let parsedTags: string[] = [];
        try { parsedTags = tags ? JSON.parse(tags as string) : []; } catch (e) { }

        // Buckets comes as array of strings
        const bucketList = buckets as string[];
        const primaryBucket = (bucketList && bucketList.length > 0) ? bucketList[0] : 'unsorted';
        const year = new Date(timestamp as number).getFullYear().toString();

        await writeMirrorFile({
            id: id as string,
            timestamp: timestamp as number,
            content: content as string,
            source: source as string,
            type: type as string,
            bucket: primaryBucket,
            tags: parsedTags,
            year
        });
        count++;
    }

    console.log(`🪞 Mirror Protocol: Synchronization complete. ${count} memories mirrored to ${MIRRORED_BRAIN_PATH}`);
}

async function writeMirrorFile(memory: any) {
    try {
        const bucketDir = path.join(MIRRORED_BRAIN_PATH, memory.bucket.replace(/[^a-zA-Z0-9-_]/g, '_'));
        const yearDir = path.join(bucketDir, memory.year);

        if (!fs.existsSync(yearDir)) {
            fs.mkdirSync(yearDir, { recursive: true });
        }

        let extension = '.md';
        // Basic mapping
        if (memory.type === 'json') extension = '.json';

        const frontmatter = `---
id: ${memory.id}
timestamp: ${memory.timestamp}
date: ${new Date(memory.timestamp).toISOString()}
source: ${memory.source}
type: ${memory.type}
tags: ${JSON.stringify(memory.tags)}
---

`;

        const filePath = path.join(yearDir, `${memory.id.replace(/[^a-zA-Z0-9-_]/g, '_')}${extension}`);
        const fileContent = frontmatter + memory.content;

        await fs.promises.writeFile(filePath, fileContent, 'utf8');
        return true;
    } catch (e: any) {
        console.error(`Failed to write mirror file for ${memory.id}:`, e.message);
        return false;
    }
}
