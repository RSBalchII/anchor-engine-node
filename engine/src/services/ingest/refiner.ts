
import * as crypto from 'crypto';
import { atomizeContent as rawAtomize } from './atomizer.js';

/**
 * Atom Interface
 * Represents a single unit of thought/memory.
 */
export interface Atom {
    id: string;
    content: string;
    sourceId: string;
    sourcePath: string;
    sequence: number;
    timestamp: number;
    provenance: 'sovereign' | 'external';
    embedding?: number[]; // Deprecated, kept for schema compatibility (zero-filled)
}

/**
 * Refine Content
 * 
 * The Orchestrator for ingestion:
 * 1. Sanitizes Input (BOM, Encoding)
 * 2. Selects Strategy (Code vs Prose)
 * 3. Atomizes (via Atomizer)
 * 4. Enriches (Metadata injection)
 */

export async function refineContent(rawBuffer: Buffer | string, filePath: string, options: { skipEmbeddings?: boolean } = {}): Promise<Atom[]> {
    // Force skip embeddings per user directive (Tag-Walker architecture)
    options.skipEmbeddings = true;

    let cleanText = '';

    if (Buffer.isBuffer(rawBuffer)) {
        // DEBUG: Check raw buffer for nulls
        let bufferNulls = 0;
        for (let k = 0; k < Math.min(rawBuffer.length, 2000); k++) {
            if (rawBuffer[k] === 0) bufferNulls++;
        }
        console.log(`[Refiner] Raw Buffer Analysis: Size=${rawBuffer.length}, First 2000 Nulls=${bufferNulls}`);

        // 1. Check for BOM (Byte Order Mark)
        if (rawBuffer.length >= 2) {
            if (rawBuffer[0] === 0xFF && rawBuffer[1] === 0xFE) {
                console.log(`[Refiner] Detected UTF-16 LE BOM. Decoding as UTF-16LE...`);
                cleanText = rawBuffer.toString('utf16le');
            } else if (rawBuffer[0] === 0xFE && rawBuffer[1] === 0xFF) {
                console.log(`[Refiner] Detected UTF-16 BE BOM. Decoding as UTF-16BE...`);
                // Node.js doesn't natively support utf16be in toString, swap bytes
                const swapped = Buffer.alloc(rawBuffer.length);
                for (let i = 0; i < rawBuffer.length; i += 2) {
                    swapped[i] = rawBuffer[i + 1];
                    swapped[i + 1] = rawBuffer[i];
                }
                cleanText = swapped.toString('utf16le');
            } else {
                // 2. Heuristic: Check for High Null Density (UTF-16 without BOM)
                let nullCount = 0;
                // Check start, middle, and end segments to be sure
                const checkLen = Math.min(rawBuffer.length, 1000);
                const midStart = Math.floor(rawBuffer.length / 2);
                const midLen = Math.min(rawBuffer.length - midStart, 1000);

                // Scan start
                for (let i = 0; i < checkLen; i++) {
                    if (rawBuffer[i] === 0x00) nullCount++;
                }
                // Scan middle
                if (midLen > 0) {
                    for (let i = midStart; i < midStart + midLen; i++) {
                        if (rawBuffer[i] === 0x00) nullCount++;
                    }
                }

                const totalChecked = checkLen + midLen;
                const ratio = nullCount / totalChecked;

                // If > 20% nulls, assume UTF-16LE
                if (totalChecked > 10 && ratio > 0.2) {
                    console.log(`[Refiner] Auto-detected UTF-16LE (Null Density: ${ratio.toFixed(2)}). Decoding as UTF-16LE...`);
                    cleanText = rawBuffer.toString('utf16le');
                } else {
                    cleanText = rawBuffer.toString('utf8');
                }
            }
        } else {
            cleanText = rawBuffer.toString('utf8');
        }
    } else {
        cleanText = rawBuffer;
    }

    if (cleanText.charCodeAt(0) === 0xFEFF) {
        cleanText = cleanText.slice(1);
    }

    // Encoding Correction: Aggressive Cleanup
    cleanText = cleanText.replace(/[\u0000\uFFFD]/g, '');

    // Normalize line endings
    cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 3. Heuristic Strategy Selection
    const lineCount = cleanText.split('\n').length;
    const avgLineLength = cleanText.length / (lineCount || 1);

    let strategy: 'code' | 'prose' | 'blob' = 'prose';

    if (avgLineLength > 300 || cleanText.length > 50000 && lineCount < 50) {
        console.log(`[Refiner] Detected BLOB content (Avg Line Len: ${avgLineLength.toFixed(0)}). Using 'blob' strategy.`);
        strategy = 'blob';
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.py') || filePath.endsWith('.rs') || filePath.endsWith('.cpp')) {
        strategy = 'code';
    }

    // 4. Atomize
    const rawAtoms = rawAtomize(cleanText, strategy);

    // FILTER: Remove atoms that look like garbage/binary (Last Line of Defense)
    const validAtoms = rawAtoms.filter(atom => {
        if (atom.indexOf('\u0000') !== -1) return false;
        const badCharCount = (atom.match(/[\uFFFD]/g) || []).length;
        if (badCharCount > 0 && (badCharCount / atom.length) > 0.05) return false;
        const controlCharCount = (atom.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
        if (controlCharCount > 0 && (controlCharCount / atom.length) > 0.1) return false;
        return true;
    });

    if (rawAtoms.length !== validAtoms.length) {
        console.warn(`[Refiner] GARBAGE COLLECTION: Dropped ${rawAtoms.length - validAtoms.length} atoms from ${filePath} (contained nulls or binary data).`);
    }

    const sourceId = crypto.createHash('md5').update(filePath).digest('hex');
    const timestamp = Date.now();
    const normalizedPath = filePath.replace(/\\/g, '/');
    let provenance: 'sovereign' | 'external' = 'external';

    if (normalizedPath.includes('/inbox') ||
        normalizedPath.includes('/chat_logs') ||
        normalizedPath.includes('/diary') ||
        normalizedPath.includes('sovereign')) {
        provenance = 'sovereign';
    }

    // Return atoms without embeddings (Standard 071)
    return validAtoms.map((content, index) => {
        const idHash = crypto.createHash('sha256')
            .update(sourceId + index.toString() + content)
            .digest('hex')
            .substring(0, 16);
        return {
            id: `atom_${idHash}`,
            content: content,
            sourceId: sourceId,
            sourcePath: normalizedPath,
            sequence: index,
            timestamp: timestamp,
            provenance: provenance,
            embedding: [] // Explicitly empty
        };
    });
}

/**
 * Enriches a list of atoms with embeddings.
 * Used for differential ingestion (only embedding new/changed atoms).
 */
export async function enrichAtoms(atoms: Atom[]): Promise<Atom[]> {
    // Standard 071: No Embeddings. Return atoms as-is (embeddings are optional/zeros).
    // This aligns with "Tag-Walker" architecture where we rely on Tags, not Vectors.
    return atoms;
}
