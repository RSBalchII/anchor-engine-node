import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Atom, Molecule, Compound } from '../../types/atomic.js';
import { nativeModuleManager } from '../../utils/native-module-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Native Modules
const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node'); // Reuse existing binding

export class AtomizerService {

    /**
     * Deconstructs raw content into Atomic Topology.
     * Returns the Compound (Main Body) and its Constituent Particles (Atoms/Molecules).
     */
    async atomize(
        content: string,
        sourcePath: string,
        provenance: 'internal' | 'external'
    ): Promise<{ compound: Compound, molecules: Molecule[], atoms: Atom[] }> {

        // 1. Sanitize (Iron Lung)
        // Optimized port of Refiner's Key Assassin
        const cleanContent = this.sanitize(content, sourcePath);

        // 2. Identification (Hash)
        const compoundId = crypto.createHash('md5').update(cleanContent + sourcePath).digest('hex');
        const timestamp = Date.now();

        // 3. System Atoms (Project/File Level)
        const systemAtoms = this.extractSystemAtoms(sourcePath);

        // 4. Construct Compound ID
        const fullCompoundId = `mem_${compoundId}`;

        // 5. Molecular Fission (Semantic Splitting)
        // Determine Type & Extract Data
        const type = this.detectMoleculeType(cleanContent, sourcePath); // Determine main type

        // Pass type to optimize splitting strategy
        const moleculeParts = this.splitIntoMolecules(cleanContent, type);

        // 5. Molecular Enrichment (Granular Tagging & Typing)
        const molecules: Molecule[] = [];
        const allAtomsMap = new Map<string, Atom>();

        // Add System Atoms to global map
        systemAtoms.forEach(a => allAtomsMap.set(a.id, a));

        // Timestamp Context: Start with file timestamp (modification time)
        // As we scan molecules, if we find a date in the content (e.g. log timestamp),
        // we update this context so subsequent atoms inherit it.
        let currentTimestamp = timestamp;

        moleculeParts.forEach((part, idx) => {
            const { content: text, start, end, timestamp: partTimestamp } = part;

            // Update time context if this part has a specific timestamp
            if (partTimestamp) {
                currentTimestamp = partTimestamp;
            }

            // Scan for concepts in this specific molecule
            const conceptAtoms = this.scanAtoms(text);

            // Merge System Atoms (Inherited) + Local Concepts
            const moleculeAtoms = [...systemAtoms, ...conceptAtoms];

            // Add concepts to global map
            conceptAtoms.forEach(a => allAtomsMap.set(a.id, a));

            const molId = `mol_${crypto.createHash('md5').update(compoundId + idx + text).digest('hex').substring(0, 12)}`;

            // Re-Determine Type locally (e.g. code block in markdown)
            // Use the passed type as default, but refined per chunk if needed
            const molType = (type === 'prose' && (text.includes('```') || text.includes('function') || text.includes('const '))) ? 'code' : type;

            let numericVal: number | undefined = undefined;
            let numericUnit: string | undefined = undefined;

            if (molType === 'data') {
                const data = this.extractNumericData(text);
                if (data) {
                    numericVal = data.value;
                    numericUnit = data.unit;
                }
            }

            molecules.push({
                id: molId,
                content: text,
                atoms: moleculeAtoms.map(a => a.id),
                sequence: idx,
                compoundId: fullCompoundId,

                // Universal Coordinates
                start_byte: start,
                end_byte: end,

                // Metadata
                type: molType,
                numeric_value: numericVal,
                numeric_unit: numericUnit,
                molecular_signature: this.generateSimHash(text),
                timestamp: currentTimestamp // Assign context-aware timestamp
            });
        });

        const allAtoms = Array.from(allAtomsMap.values());

        const compound: Compound = {
            id: fullCompoundId,
            compound_body: cleanContent,
            molecules: molecules.map(m => m.id),
            atoms: allAtoms.map(a => a.id),
            path: sourcePath,
            timestamp: timestamp, // Compound keeps file timestamp
            provenance: provenance,
            molecular_signature: this.generateSimHash(cleanContent)
        };

        return {
            compound,
            molecules,
            atoms: allAtoms
        };
    }

    // --- PORTED LOGIC FROM REFINER.TS ---

    /**
     * Enhanced Content Sanitization (The Key Assassin)
     * Surgically removes JSON wrappers, log spam, and PII.
     */
    private sanitize(text: string, filePath: string = ''): string {
        let clean = text;

        // 1. Remove BOM and Binary Trash
        clean = clean.replace(/^\uFEFF/, '').replace(/[\u0000\uFFFD]/g, '');
        clean = clean.replace(/\r\n/g, '\n');

        // 2. Enhanced Surgeon: Log Spam Removal
        const beforeSurgeon = clean.length;
        clean = clean.replace(/(?:^|\s|\.{3}\s*)Processing '[^']+'\.{3}/g, '\n');
        clean = clean.replace(/(?:^|\s|\.{3}\s*)Loading '[^']+'\.{3}/g, '\n');
        clean = clean.replace(/(?:^|\s|\.{3}\s*)Indexing '[^']+'\.{3}/g, '\n');
        clean = clean.replace(/(?:^|\s|\.{3}\s*)Analyzing '[^']+'\.{3}/g, '\n');
        clean = clean.replace(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{3})?\s*(?:AM|PM)?\s*[-:>]/g, '');
        clean = clean.replace(/\[\d{4}-\d{2}-\d{2}.*?\]/g, ''); // [YYYY-MM-DD...]
        clean = clean.replace(/\[[#=]{0,10}\s{0,10}\]\s*\d{1,3}%/g, ''); // [===] 100%
        clean = clean.replace(/\n{3,}/g, '\n\n');

        // 2.5 PII Masking
        clean = clean.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
        clean = clean.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_REDACTED]');
        clean = clean.replace(/sk-[a-zA-Z0-9]{32,}/g, 'sk-[REDACTED]');

        // --- DENSITY-AWARE SCRUBBER (Standard 073) ---
        // Specifically targets "Ghost in the Machine" artifacts where the context engine
        // re-indexes its own previous output dumps.

        // 1. Strip "Dirty Read" Source Headers (Context Injection Artifacts)
        // Matches: [Source: inbox\1-19-2026.md] or [Source: ...] (Timestamp: ...)
        // SAFETY: Use .*? to be non-greedy and avoid spanning massive blocks.
        clean = clean.replace(/\[Source: .*?\](?:\s*\(Timestamp: .*?\))?/g, '');

        // 2. Strip Logging/YAML Wrappers (Aggressive)
        // Matches: "response_content": |-, response_content: |-, "content": ...
        clean = clean.replace(/["']?response_content["']?:\s*\|-?\s*/g, '');
        clean = clean.replace(/["']?content["']?:\s*\|-?\s*/g, '');
        clean = clean.replace(/["']?thinking_content["']?:\s*""\s*/g, '');

        // Matches: timestamp: "2026-..." (common in YAML logs)
        clean = clean.replace(/["']?timestamp["']?:\s*"[^"]*"\s*/g, '');

        // Matches: - type: "User" or - type: "Coda..."
        clean = clean.replace(/- type:\s*"[^"]*"\s*/g, '');

        // 3. Strip LLM Role Markers
        clean = clean.replace(/<\|user\|>/g, '');
        clean = clean.replace(/<\|assistant\|>/g, '');
        clean = clean.replace(/<\|system\|>/g, '');


        // 3. JSON Artifact Removal (The Key Assassin)
        const isJsonLog = !/\.(ts|js|py|rs|go|java|cpp|h|c)$/.test(filePath) && (
            clean.includes('"response_content":') ||
            (clean.includes('"type":') && clean.includes('"Coda')) ||
            clean.includes('"thinking_content":') ||
            clean.includes('"message":') ||
            clean.includes('"content":')
        );

        if (isJsonLog || filePath.endsWith('.json')) {
            try {
                // Try to extract content from JSON structures
                const jsonRegex = /({[\s\S]*?})/g;
                const matches = [...clean.matchAll(jsonRegex)];
                if (matches.length > 0) {
                    let extractedContent = '';
                    for (const match of matches) {
                        try {
                            const obj = JSON.parse(match[1]);
                            const contentFields = ['content', 'response_content', 'message', 'text', 'body', 'data'];
                            for (const field of contentFields) {
                                if (obj[field] && typeof obj[field] === 'string') {
                                    extractedContent += obj[field] + '\n\n';
                                    break;
                                }
                            }
                        } catch (e) { continue; }
                    }
                    if (extractedContent) clean = extractedContent;
                }
            } catch (e) { /* Fallback */ }

            // Fallback: The Key Assassin Logic
            clean = this.cleanseJsonArtifacts(clean);
        }

        return clean.trim();
    }

    /**
     * Helper: The Key Assassin
     * Recursively un-escapes and removes JSON wrappers.
     */
    private cleanseJsonArtifacts(text: string): string {
        let clean = text;

        // 1. Recursive Un-escape
        if (native && native.cleanse) {
            clean = native.cleanse(clean);
        } else {
            let pass = 0;
            while (clean.includes('\\') && pass < 3) {
                pass++;
                clean = clean.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
            }
        }

        // 2. Code Block Protection
        const codeBlocks: string[] = [];
        const PLACEHOLDER = '___CODE_BLOCK_PLACEHOLDER___';
        clean = clean.replace(/```[\s\S]*?```/g, (match) => {
            codeBlocks.push(match);
            return `${PLACEHOLDER}${codeBlocks.length - 1}___`;
        });

        // 3. Remove Metadata & Wrappers
        const purge = (ptrn: RegExp) => { clean = clean.replace(ptrn, ''); };
        purge(/"type"\s*:\s*"[^"]*",?/g);
        purge(/"timestamp"\s*:\s*"[^"]*",?/g);
        purge(/"source"\s*:\s*"[^"]*",?/g);
        purge(/"response_content"\s*:\s*/g);
        purge(/"thinking_content"\s*:\s*/g);
        purge(/"content"\s*:\s*/g);

        // 4. Structural Cleanup
        clean = clean.replace(/\}\s*,\s*\{/g, '\n\n');
        clean = clean.trim();
        if (clean.startsWith('[') && clean.endsWith(']')) clean = clean.substring(1, clean.length - 1);

        // 5. Restore Code Blocks
        clean = clean.replace(/___CODE_BLOCK_PLACEHOLDER___(\d+)___/g, (_, idx) => codeBlocks[parseInt(idx)] || _);

        // 6. Slash Compressor
        clean = clean.replace(/\\{2,}/g, '/');

        return clean;
    }

    private extractSystemAtoms(filePath: string): Atom[] {
        const atoms: Atom[] = [];
        const normalized = filePath.replace(/\\/g, '/');
        const lowerPath = normalized.toLowerCase();
        const parts = normalized.split('/');

        // --- TIME-LADDER LOGIC ---
        // History/Archive gets down-weighted #Archive tag
        if (lowerPath.includes('/history/') || lowerPath.includes('/archive/')) {
            atoms.push(this.createAtom('#Archive', 'system', 0.5));
        }
        // Everything else is implicitly Current/Truth (Weight 1.0) unless specified otherwise

        // 1. Project Root & Structure (Auto-Tagging)
        const projectIndicators = ['codebase', 'projects', 'repos', 'src', 'packages', 'apps', 'personal', 'work', 'client'];

        for (let i = 0; i < parts.length; i++) {
            if (projectIndicators.includes(parts[i].toLowerCase()) && parts[i + 1]) {
                atoms.push(this.createAtom(`#project:${parts[i + 1]}`, 'system'));
                break;
            }
        }

        // Structure Tags
        if (normalized.includes('/src/') || normalized.startsWith('src/')) atoms.push(this.createAtom('#src', 'system'));
        if (normalized.includes('/docs/') || normalized.startsWith('docs/')) atoms.push(this.createAtom('#docs', 'system'));
        if (normalized.includes('/tests/') || normalized.startsWith('tests/')) atoms.push(this.createAtom('#test', 'system'));

        // File Type Tags
        const ext = normalized.split('.').pop()?.toLowerCase() || '';
        if (['ts', 'js', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h'].includes(ext)) atoms.push(this.createAtom('#code', 'system'));
        if (['md', 'txt', 'rst'].includes(ext)) atoms.push(this.createAtom('#doc', 'system'));
        if (['json', 'yaml', 'yml', 'xml'].includes(ext)) atoms.push(this.createAtom('#config', 'system'));

        return atoms;
    }

    private scanAtoms(content: string): Atom[] {
        const atoms: Atom[] = [];

        // 1. Sovereign Keywords (Dynamic Scan)
        const keywords = this.loadSovereignKeywords();
        const lowerContent = content.toLowerCase();
        for (const kw of keywords) {
            if (lowerContent.includes(kw.toLowerCase())) {
                atoms.push(this.createAtom(`#${kw}`, 'concept'));
            }
        }

        // 2. Explicit Content Tags (#tag)
        const tagRegex = /#(\w+)/g;
        const matches = content.match(tagRegex);
        if (matches) {
            matches.forEach(m => atoms.push(this.createAtom(m, 'concept')));
        }

        // Deduplicate locally
        const unique = new Map();
        atoms.forEach(a => unique.set(a.id, a));
        return Array.from(unique.values());
    }

    // Cache for keywords
    private cachedKeywords: string[] | null = null;

    private loadSovereignKeywords(): string[] {
        if (this.cachedKeywords) return this.cachedKeywords;
        try {
            // Check likely locations for internal_tags.json
            const possiblePaths = [
                path.join(process.cwd(), 'context', 'internal_tags.json'),
                path.join(process.cwd(), '..', 'context', 'internal_tags.json'),
                // engine/src/services/ingest -> ../../../../context
                path.join(__dirname, '../../../../context/internal_tags.json')
            ];

            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    const content = fs.readFileSync(p, 'utf-8');
                    const json = JSON.parse(content);
                    if (Array.isArray(json.keywords)) {
                        this.cachedKeywords = json.keywords;
                        return json.keywords;
                    }
                }
            }
            this.cachedKeywords = [];
            return [];
        } catch (e) {
            console.error('[Atomizer] Failed to load internal_tags.json', e);
            return [];
        }
    }

    private createAtom(label: string, type: Atom['type'], weight: number = 1.0): Atom {
        return {
            id: `atom_${crypto.createHash('sha256').update(label).digest('hex').substring(0, 12)}`,
            label,
            type,
            weight
        };
    }

    /**
     * Splits content into molecules with byte offsets and extracted timestamps.
     * Enhanced with Type awareness (Prose vs Code vs Data).
     */
    private splitIntoMolecules(text: string, type: 'prose' | 'code' | 'data' = 'prose', maxSize: number = 1024): { content: string, start: number, end: number, timestamp?: number }[] {
        const results: { content: string, start: number, end: number, timestamp?: number }[] = [];

        // Helper to extract timestamp from a chunk
        const extractTimestamp = (chunk: string): number | undefined => {
            // Match ISO timestamps: 2026-01-25T03:43:54.405Z or 2026-01-25 03:43:54
            const isoRegex = /\b(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\b/;
            const match = chunk.match(isoRegex);
            if (match) {
                const ts = Date.parse(match[1]);
                if (!isNaN(ts)) return ts;
            }
            return undefined;
        };

        // --- STRATEGY: CODE (AST BLOCKS) ---
        if (type === 'code') {
            // "Heuristic AST": Split by top-level blocks (functions, classes) or chunks of logic.
            // Using regex to detect block starts and tracking braces.
            const lines = text.split('\n');
            let currentBlock = '';
            let blockStart = 0;
            let currentCursor = 0;

            let braceDepth = 0;

            for (const line of lines) {
                const lineLen = line.length + 1; // +1 for \n
                const openBraces = (line.match(/\{/g) || []).length;
                const closeBraces = (line.match(/\}/g) || []).length;

                const prevDepth = braceDepth;
                braceDepth += (openBraces - closeBraces);

                currentBlock += line + '\n';

                // End of a top-level block?
                if (braceDepth === 0 && prevDepth > 0) {
                    // Just closed a root block (function/class)
                    results.push({ content: currentBlock, start: blockStart, end: currentCursor + lineLen, timestamp: extractTimestamp(currentBlock) });
                    currentBlock = '';
                    blockStart = currentCursor + lineLen;
                }
                // Double newline in root scope -> likely separate statements?
                else if (braceDepth === 0 && line.trim() === '' && currentBlock.trim().length > 0) {
                    results.push({ content: currentBlock, start: blockStart, end: currentCursor + lineLen, timestamp: extractTimestamp(currentBlock) });
                    currentBlock = '';
                    blockStart = currentCursor + lineLen;
                }

                currentCursor += lineLen;
            }

            if (currentBlock.trim().length > 0) {
                results.push({ content: currentBlock, start: blockStart, end: currentCursor, timestamp: extractTimestamp(currentBlock) });
            }
        }
        else if (type === 'data') {
            // --- STRATEGY: DATA (ROWS) ---
            // Split by line
            let cursor = 0;
            const lines = text.split('\n');
            for (const line of lines) {
                const len = line.length;
                if (line.trim().length > 0) {
                    results.push({ content: line, start: cursor, end: cursor + len, timestamp: extractTimestamp(line) });
                }
                cursor += len + 1;
            }
        }
        else {
            // --- STRATEGY: PROSE (SENTENCES with MARKDOWN FISSION) ---

            // MARKDOWN FISSION: Split on code fences first to separate code from prose
            const codeFenceRegex = /```[\s\S]*?```/g;
            const codeFences: { match: string, start: number, end: number }[] = [];
            let fenceMatch;

            while ((fenceMatch = codeFenceRegex.exec(text)) !== null) {
                codeFences.push({
                    match: fenceMatch[0],
                    start: fenceMatch.index,
                    end: fenceMatch.index + fenceMatch[0].length
                });
            }

            // If we have code fences, split around them
            if (codeFences.length > 0) {
                let cursor = 0;

                for (const fence of codeFences) {
                    // Pre-fence prose
                    if (fence.start > cursor) {
                        const preProse = text.substring(cursor, fence.start);
                        if (preProse.trim().length > 0) {
                            // Recursively split the prose portion into sentences
                            const proseParts = preProse.split(/(?<=[.!?])\s+(?=[A-Z])/);
                            let proseCursor = cursor;
                            for (const part of proseParts) {
                                if (part.trim().length === 0) continue;
                                const partStart = text.indexOf(part, proseCursor);
                                if (partStart !== -1) {
                                    results.push({ content: part, start: partStart, end: partStart + part.length, timestamp: extractTimestamp(part) });
                                    proseCursor = partStart + part.length;
                                }
                            }
                        }
                    }

                    // The code fence itself (will be typed as 'code' in molecule enrichment)
                    results.push({ content: fence.match, start: fence.start, end: fence.end, timestamp: extractTimestamp(fence.match) });
                    cursor = fence.end;
                }

                // Post-fence prose (after last fence)
                if (cursor < text.length) {
                    const postProse = text.substring(cursor);
                    if (postProse.trim().length > 0) {
                        const proseParts = postProse.split(/(?<=[.!?])\s+(?=[A-Z])/);
                        let proseCursor = cursor;
                        for (const part of proseParts) {
                            if (part.trim().length === 0) continue;
                            const partStart = text.indexOf(part, proseCursor);
                            if (partStart !== -1) {
                                results.push({ content: part, start: partStart, end: partStart + part.length, timestamp: extractTimestamp(part) });
                                proseCursor = partStart + part.length;
                            }
                        }
                    }
                }
            } else {
                // No code fences - standard sentence splitting
                const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
                let searchCursor = 0;

                for (const part of parts) {
                    if (part.trim().length === 0) continue;
                    const len = part.length;
                    const realStart = text.indexOf(part, searchCursor); // Find next occurrence

                    if (realStart !== -1) {
                        results.push({ content: part, start: realStart, end: realStart + len, timestamp: extractTimestamp(part) });
                        searchCursor = realStart + len;
                    }
                }
            }
        }

        // --- ENFORCE SIZE LIMIT (POST-PROCESS) ---
        const finalResults: { content: string, start: number, end: number, timestamp?: number }[] = [];

        for (const item of results) {
            if (item.content.length <= maxSize) {
                finalResults.push(item);
            } else {
                // Force split large molecules
                let currentStart = item.start;
                let remaining = item.content;

                while (remaining.length > 0) {
                    const chunk = remaining.substring(0, maxSize);
                    // Inherit timestamp for all chunks if the original item had one
                    finalResults.push({
                        content: chunk,
                        start: currentStart,
                        end: currentStart + chunk.length,
                        timestamp: item.timestamp
                    });

                    remaining = remaining.substring(maxSize);
                    currentStart += maxSize;
                }
            }
        }

        return finalResults;
    }

    private detectMoleculeType(text: string, filePath: string): 'prose' | 'code' | 'data' {
        // 1. File Extension hints
        if (filePath.endsWith('.csv') || filePath.endsWith('.json')) return 'data';
        if (filePath.match(/\.(ts|js|py|rs|go|cpp|h|c)$/)) return 'code';

        // 2. Content Heuristics
        if (text.trim().startsWith('|') && text.includes('|')) return 'data'; // Markdown Table row
        if (text.includes('```') || text.includes('function ') || text.includes('const ') || text.includes('import ')) return 'code';

        return 'prose';
    }

    private extractNumericData(text: string): { value: number, unit?: string } | null {
        // Examples: "1500 PSI", "15%", "$10.50"
        const matches = text.match(/([\d,]+\.?\d*)\s?([A-Za-z%]+)?/g);
        if (!matches) return null;

        let bestCandidate: { value: number, unit?: string } | null = null;

        for (const m of matches) {
            const valStr = m.match(/[\d,]+\.?\d*/)?.[0]?.replace(/,/g, '');
            const unit = m.match(/[A-Za-z%]+/)?.[0];

            if (valStr) {
                const val = parseFloat(valStr);
                // Filter out likely years (1900-2100) if no unit, to avoid false positives in history
                if ((val >= 1900 && val <= 2100) && Number.isInteger(val) && !unit) continue;

                if (unit || !bestCandidate) {
                    bestCandidate = { value: val, unit: unit };
                }
            }
        }

        return bestCandidate;
    }

    private generateSimHash(text: string): string {
        if (native && native.fingerprint) {
            try {
                return native.fingerprint(text).toString(16);
            } catch (e) { return "0"; }
        }
        return "0";
    }
}
