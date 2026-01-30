/**
 * Mirror Protocol Service - "Tangible Knowledge Graph"
 *
 * Projects the AI Brain onto the filesystem using a @bucket/#tag structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { db } from '../../core/db.js';
import { NOTEBOOK_DIR } from '../../config/paths.js';

export const MIRRORED_BRAIN_PATH = path.join(NOTEBOOK_DIR, 'mirrored_brain');

// Clean filename helper
function sanitizeFilename(text: string): string {
    return text.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 64);
}

const ATOMS_PER_BUNDLE = 100;

/**
 * Mirror Protocol: Exports memories to Markdown files organized by @bucket/#tag/#nested hierarchy
 */
export async function createMirror() {
    console.log('🪞 Mirror Protocol: Starting semantic brain mirroring (Recursive Tree)...');

    // Wipe existing mirrored brain to ensure only latest state is present
    if (fs.existsSync(MIRRORED_BRAIN_PATH)) {
        console.log(`🪞 Mirror Protocol: Wiping stale mirror at ${MIRRORED_BRAIN_PATH}`);
        try {
            fs.rmSync(MIRRORED_BRAIN_PATH, { recursive: true, force: true });
        } catch (e: any) {
            console.warn(`🪞 Mirror Protocol: Wipe failed (EPERM/Locked). Attempting to proceed without full wipe. Error: ${e.message}`);
            // Retry once with small delay? Or just proceed.
            // Proceeding is safer than crashing. 
            // We might have stale files, but better than no mirror.
        }
    }

    fs.mkdirSync(MIRRORED_BRAIN_PATH, { recursive: true });

    // Fetch atoms with sequence and provenance for proper bundling and re-hydration
    const query = '?[id, timestamp, content, source, type, hash, buckets, tags, sequence, provenance] := *memory{id, timestamp, content, source, type, hash, buckets, tags, sequence, provenance}';
    const result = await db.run(query);

    if (!result.rows || result.rows.length === 0) {
        console.log('🪞 Mirror Protocol: No memories to mirror.');
        return;
    }

    console.log(`🪞 Mirror Protocol: Processing ${result.rows.length} memories for hierarchical bundling...`);

    // Grouping structure: Map<FullPathString, Map<SourcePath, Atom[]>>
    // We group by Target Directory Path -> Then by Source File (Original Provenance)
    const directoryGroups = new Map<string, Map<string, any[]>>();

    for (const row of result.rows) {
        const [id, timestamp, content, source, type, hash, buckets, tags, sequence, provenance] = row;

        const bucketList = (buckets as string[]) || [];
        const tagList = (tags as string[]) || [];
        const primaryBucket = bucketList.length > 0 ? bucketList[0] : 'general';

        // 1. Determine Root Bucket
        let bucketName = (primaryBucket && primaryBucket !== 'general' && primaryBucket !== 'unknown') ? primaryBucket : 'general';

        // QUARANTINE OVERRIDE
        const isQuarantined = tagList.includes('#manually_quarantined') || tagList.includes('#auto_quarantined');
        if (isQuarantined) {
            bucketName = 'quarantine';
        }

        // 2. Determine Tag Path
        // Filter out the bucket name itself and 'inbox' to avoid redundancy
        const specificTags = tagList.filter((t: string) => t !== bucketName && t !== 'inbox');

        // Sort tags alphabetically to ensure deterministic nesting order
        // e.g. ["#z", "#a"] -> "#a/#z" path
        specificTags.sort();

        // Construct Path segments
        // starting with @bucket
        const pathSegments = [`@${sanitizeFilename(bucketName)}`];

        // Append tag segments
        if (specificTags.length > 0) {
            specificTags.forEach(t => pathSegments.push(`#${sanitizeFilename(t)}`));
        } else {
            // Check if we should use "_untagged" or just root?
            // Existing logic used "_untagged". Let's stick to that for cleanliness.
            pathSegments.push('#_untagged');
        }

        const relativePath = path.join(...pathSegments);

        // 3. Add to Group
        if (!directoryGroups.has(relativePath)) directoryGroups.set(relativePath, new Map());
        const sourceMap = directoryGroups.get(relativePath)!;

        const sourcePath = (source as string) || 'unknown';
        if (!sourceMap.has(sourcePath)) sourceMap.set(sourcePath, []);

        sourceMap.get(sourcePath)!.push({
            id, timestamp, content, source: sourcePath, type, hash, buckets: bucketList, tags: tagList, sequence: sequence || 0, provenance
        });
    }

    let bundleCount = 0;
    let totalAtoms = 0;

    // Write bundles recursively
    for (const [relPath, sourceMap] of directoryGroups) {
        const fullDir = path.join(MIRRORED_BRAIN_PATH, relPath);

        if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });

        for (const [sourcePath, atomList] of sourceMap) {
            // Sort by sequence or timestamp
            atomList.sort((a, b) => (a.sequence - b.sequence) || (a.timestamp - b.timestamp));

            // Chunk into bundles
            for (let i = 0; i < atomList.length; i += ATOMS_PER_BUNDLE) {
                const chunk = atomList.slice(i, i + ATOMS_PER_BUNDLE);
                const partNum = Math.floor(i / ATOMS_PER_BUNDLE) + 1;
                const isMultiPart = atomList.length > ATOMS_PER_BUNDLE;

                // We pass the "bucketName" just for the Archive label in case of orphan
                // We extract it from the path (first segment)
                const bucketLabel = relPath.split(path.sep)[0].replace('@', '');

                await writeBundleFile(fullDir, sourcePath, chunk, partNum, isMultiPart, bucketLabel);
                bundleCount++;
                totalAtoms += chunk.length;
            }
        }
    }

    console.log(`🪞 Mirror Protocol: Synchronization complete. ${totalAtoms} memories mirrored across ${bundleCount} bundles in ${MIRRORED_BRAIN_PATH}`);
}

async function writeBundleFile(tagDir: string, sourcePath: string, atoms: any[], partNum: number, isMultiPart: boolean, bucketName: string) {
    try {
        let isOrphan = sourcePath === 'unknown' || !sourcePath;
        let sourceBase = isOrphan ? `daily_archive_${new Date().toISOString().split('T')[0]}` : path.basename(sourcePath);

        // Add hash of full path to prevent collisions for same basename in different dirs
        const pathHash = crypto.createHash('md5').update(sourcePath || 'orphan').digest('hex').substring(0, 8);
        const safeName = sanitizeFilename(sourceBase).toLowerCase();

        let fileName = `${safeName}_${pathHash}`;
        if (isMultiPart) fileName += `_part${partNum}`;
        fileName += '.md';

        const filePath = path.join(tagDir, fileName);

        if (!fs.existsSync(tagDir)) {
            fs.mkdirSync(tagDir, { recursive: true });
        }

        // Build content (Standard 066)
        let content = `# Source: ${isOrphan ? 'Archive (' + bucketName + ')' : sourcePath}\n`;
        if (isMultiPart) content += `> Part: ${partNum}\n`;
        content += `\n---\n\n`;

        for (const atom of atoms) {
            let nameSnippet = "atom";
            const titleMatch = atom.content.match(/^#\s+(.+)$/m);
            if (titleMatch) {
                nameSnippet = titleMatch[1];
            } else {
                nameSnippet = atom.content.substring(0, 50).trim().split('\n')[0];
            }

            const shortId = (atom.id || "").split('_').pop() || "anon";

            content += `## [${shortId}] ${nameSnippet}\n`;
            // Metadata header as per POML
            content += `> **Provenance**: ${atom.provenance || 'unknown'} | **Date**: ${new Date(atom.timestamp).toISOString()}\n`;
            if (atom.tags.length > 0) content += `> **Tags**: ${atom.tags.join(', ')}\n`;
            content += `\n${atom.content}\n\n`;
            content += `---`; // Horizontal rule separation
            content += `\n\n`;
        }

        await fs.promises.writeFile(filePath, content, 'utf8');
        return true;
    } catch (e: any) {
        console.error(`Failed to write bundle file in ${tagDir}:`, e.message);
        return false;
    }
}
