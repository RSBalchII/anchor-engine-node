import { db } from '../../core/db.js';
import { SearchResult } from './search.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { pathManager } from '../../utils/path-manager.js';

interface ContextWindow {
    compoundId: string;
    source: string;
    start: number;
    end: number;
    originalResults: SearchResult[];
}

export class ContextInflator {

    // Default Config (fallback if no budget provided)
    private static DEFAULT_PADDING = 200;
    private static DEFAULT_MAX_WINDOW = 2500;

    // Dynamic Density Constraints
    private static MIN_PADDING = 50;      // <50>search<50> (High density)
    private static MAX_PADDING = 500;     // Very generous context (Low density)
    private static MIN_WINDOW_CAP = 150;  // Absolute floor (roughly 50pad + 50content + 50pad)
    private static MERGE_THRESHOLD = 500;

    /**
     * Inflate search results into expanded Context Windows.
     * Supports "Dynamic Density": Scales window size based on available budget and result count.
     * READS FROM DISK (File System) instead of DB for content.
     */
    static async inflate(results: SearchResult[], totalBudget?: number): Promise<SearchResult[]> {
        const inflatedResults: SearchResult[] = [];
        let processingResults = [...results];

        if (results.length === 0) return [];

        // --- Calculate Dynamic Parameters ---
        let paddingChars = ContextInflator.DEFAULT_PADDING;
        let maxWindowSize = ContextInflator.DEFAULT_MAX_WINDOW;

        if (totalBudget && totalBudget > 0) {
            // 1. Check if we can fit everyone at Minimum Viability
            const minViableTotal = processingResults.length * ContextInflator.MIN_WINDOW_CAP;

            if (minViableTotal > totalBudget) {
                // Too many results! We must truncate the list to ensuring quality > 0.
                const safeCount = Math.floor(totalBudget / ContextInflator.MIN_WINDOW_CAP);
                console.log(`[ContextInflator] Budget squeeze! Truncating results from ${processingResults.length} to ${safeCount} to maintain min density.`);
                processingResults = processingResults.slice(0, safeCount);

                // Set params to minimum floor
                maxWindowSize = ContextInflator.MIN_WINDOW_CAP;
                paddingChars = ContextInflator.MIN_PADDING;
            } else {
                // We can fit everyone! Distribute budget.
                const budgetPerResult = Math.floor(totalBudget / processingResults.length);

                // Scale window size to available budget (capped at reasonable max to avoid massive single files)
                maxWindowSize = Math.max(ContextInflator.MIN_WINDOW_CAP, budgetPerResult);

                // Deduce padding
                const targetPadding = Math.floor((maxWindowSize - 50) / 2);
                paddingChars = Math.min(ContextInflator.MAX_PADDING, Math.max(ContextInflator.MIN_PADDING, targetPadding));

                console.log(`[ContextInflator] Dynamic Density: Fitting all ${processingResults.length} results. Budget/Item=${budgetPerResult}. Params: Pad=${paddingChars}, MaxWin=${maxWindowSize}`);
            }
        } else {
            console.log(`[ContextInflator] Using default static parameters.`);
        }

        // --- Standard Inflation Logic (using dynamic params) ---
        // Group by Source (File Path) instead of Compound ID to ensure we read from correct file
        const fileMap = new Map<string, SearchResult[]>();

        for (const res of processingResults) {
            if (!res.source || res.start_byte === undefined || res.end_byte === undefined) {
                inflatedResults.push(res);
                continue;
            }
            if (!fileMap.has(res.source)) {
                fileMap.set(res.source, []);
            }
            fileMap.get(res.source)?.push(res);
        }

        // 2. Process each File
        for (const [sourcePath, fileResults] of fileMap.entries()) {
            fileResults.sort((a, b) => (a.start_byte || 0) - (b.start_byte || 0));

            const windows: ContextWindow[] = [];
            let currentWindow: ContextWindow | null = null;

            for (const res of fileResults) {
                const rStart = Number(res.start_byte) || 0;
                const rEnd = Number(res.end_byte) || 0;

                const start = Math.max(0, rStart - paddingChars);
                let end = rEnd + paddingChars;

                // FORCE CAP: Ensure no single window exceeds MAX_WINDOW_SIZE
                if ((end - start) > maxWindowSize) {
                    end = start + maxWindowSize;
                }

                if (!currentWindow) {
                    currentWindow = {
                        compoundId: res.compound_id || '',
                        source: sourcePath,
                        start,
                        end,
                        originalResults: [res]
                    };
                } else {
                    const potentialEnd = Math.max(currentWindow.end, end);
                    const potentialSize = potentialEnd - currentWindow.start;

                    if (start <= (currentWindow.end + ContextInflator.MERGE_THRESHOLD) && potentialSize <= maxWindowSize) {
                        currentWindow.end = potentialEnd;
                        currentWindow.originalResults.push(res);
                    } else {
                        windows.push(currentWindow);
                        currentWindow = {
                            compoundId: res.compound_id || '',
                            source: sourcePath,
                            start,
                            end,
                            originalResults: [res]
                        };
                    }
                }
            }
            if (currentWindow) windows.push(currentWindow);

            // 3. Fetch Content for Windows from DISK
            for (const win of windows) {
                try {
                    const safeStart = Math.max(0, win.start);
                    // Cap fetch size for sanity
                    const requestedLength = Math.min(maxWindowSize, win.end - safeStart);

                    let expandedContent = "";

                    // Read from Disk
                    let filePath = win.source;

                    // Skip inflation for virtual sources
                    if (filePath === 'atom_source' || filePath === 'internal' || filePath === 'memory') {
                        // console.log(`[ContextInflator] Skipping virtual source: ${filePath}`);
                        inflatedResults.push(...win.originalResults);
                        continue;
                    }

                    if (!path.isAbsolute(filePath)) {
                        // Resolve relative path against Notebook Directory
                        filePath = path.join(pathManager.getNotebookDir(), filePath);
                    }

                    const fileHandle = await fs.open(filePath, 'r');
                    try {
                        const buffer = Buffer.alloc(requestedLength);
                        const { bytesRead } = await fileHandle.read(buffer, 0, requestedLength, safeStart);
                        if (bytesRead > 0) {
                            expandedContent = buffer.toString('utf-8', 0, bytesRead);
                        }
                    } finally {
                        await fileHandle.close();
                    }

                    if (expandedContent && expandedContent.length > 0) {
                        const safeEnd = safeStart + expandedContent.length;
                        const base = win.originalResults[0];
                        inflatedResults.push({
                            ...base,
                            content: `...${expandedContent}...`,
                            score: Math.max(...win.originalResults.map(r => r.score)),
                            is_inflated: true,
                            start_byte: safeStart,
                            end_byte: safeEnd,
                            compound_id: win.compoundId
                        });
                    } else {
                        // Fallback
                        inflatedResults.push(...win.originalResults);
                    }
                } catch (e) {
                    console.error(`[ContextInflator] Failed to inflate window for ${win.source}`, e);
                    // On error, use the original content (even if empty/partial)
                    inflatedResults.push(...win.originalResults);
                }
            }
        }

        return inflatedResults.sort((a, b) => b.score - a.score);
    }
}
