import { config } from '../../config/index.js';

export interface ContextAtom {
    id: string;
    content: string;
    source: string;
    timestamp: number;
    score: number; // Relevance Score
}

export interface ContextResult {
    prompt: string;
    stats: {
        tokenCount: number;
        charCount: number;
        filledPercent: number;
        atomCount: number;
    };
}

/**
 * Rolling Context Slicer (Feature 8)
 * 
 * Implements "Middle-Out" Context Budgeting.
 * Prioritizes atoms based on a mix of Relevance (Vector Similarity) and Recency.
 * 
 * Strategy:
 * 1. Rank Candidates: Score = (Relevance * 0.7) + (RecencyNorm * 0.3).
 * 2. Select: Fill budget with highest ranked atoms.
 * 3. Smart Slice: If an atom fits partially, slice around the keyword match (windowing).
 * 4. Order: Sort selected atoms Chronologically (or by Sequence) for linear readability.
 */
export function composeRollingContext(
    query: string,
    results: ContextAtom[],
    tokenBudget: number = 4096
): ContextResult {
    // Constants
    const CHARS_PER_TOKEN = 4; // Rough estimate

    // Safety Buffer: Target 95% of budget to account for multibyte chars / math errors
    const SAFE_BUDGET = Math.floor(tokenBudget * 0.95);
    const charBudget = SAFE_BUDGET * CHARS_PER_TOKEN;

    // 1. Dynamic Recency Analysis
    // Check for temporal signals in query
    const temporalSignals = ["recent", "latest", "new", "today", "now", "current", "last"];
    const hasTemporalSignal = temporalSignals.some(signal => query.toLowerCase().includes(signal));

    // Adjust weights based on intent
    // Default: Relevance 70%, Recency 30%
    // Temporal: Relevance 40%, Recency 60%
    const RELEVANCE_WEIGHT = hasTemporalSignal ? 0.4 : config.CONTEXT_RELEVANCE_WEIGHT;
    const RECENCY_WEIGHT = hasTemporalSignal ? 0.6 : config.CONTEXT_RECENCY_WEIGHT;

    // 2. Normalize Recency & Score
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const candidates = results.map(atom => {
        const age = Math.max(0, now - atom.timestamp);
        // Recency Score: 1.0 = Brand new, 0.0 = >1 Month old (clamped)
        const recencyScore = Math.max(0, 1.0 - (age / oneMonth));

        // Final Mixed Score
        const mixedScore = (atom.score * RELEVANCE_WEIGHT) + (recencyScore * RECENCY_WEIGHT);

        return { ...atom, mixedScore, recencyScore };
    });

    // 3. Sort by Mixed Score (Descending)
    candidates.sort((a, b) => b.mixedScore - a.mixedScore);

    // 4. Selection (Fill Budget)
    const selectedAtoms: typeof candidates = [];
    let currentChars = 0;

    for (const atom of candidates) {
        if (currentChars >= charBudget) break;

        const atomLen = atom.content.length;

        if (currentChars + atomLen <= charBudget) {
            selectedAtoms.push(atom);
            currentChars += atomLen;
        } else {
            // Partial Fill with Smart Slicing
            const remaining = charBudget - currentChars;
            if (remaining > 200) {
                // Slice to nearest punctuation to keep thought intact
                // Look for . ! ? or \n within the last 50 chars of the budget

                // Finds last punctuation before the hard limit
                const safeContent = atom.content.substring(0, remaining);

                // Polyfill for finding last punctuation
                const lastDot = safeContent.lastIndexOf('.');
                const lastBang = safeContent.lastIndexOf('!');
                const lastQ = safeContent.lastIndexOf('?');
                const lastNew = safeContent.lastIndexOf('\n');

                const bestCut = Math.max(lastDot, lastBang, lastQ, lastNew);

                if (bestCut > (remaining * 0.5)) {
                    // If punctuation is reasonably far in, use it
                    const slicedContent = atom.content.substring(0, bestCut + 1) + " [Truncated]";
                    selectedAtoms.push({ ...atom, content: slicedContent });
                    currentChars += slicedContent.length;
                } else {
                    // Fallback to hard cut if no punctuation found nearby
                    const slicedContent = atom.content.substring(0, remaining) + "...";
                    selectedAtoms.push({ ...atom, content: slicedContent });
                    currentChars += slicedContent.length;
                }
            }
            break; // Filled
        }
    }

    // 5. Final Sort (Chronological / Flow)
    // Preservation of narrative flow is key.
    selectedAtoms.sort((a, b) => a.timestamp - b.timestamp);

    // 6. Assemble
    const contextString = selectedAtoms
        .map(a => `[Source: ${a.source}] (${new Date(a.timestamp).toISOString()})\n${a.content}`)
        .join('\n\n');

    return {
        prompt: contextString,
        stats: {
            tokenCount: Math.ceil(currentChars / CHARS_PER_TOKEN),
            charCount: currentChars,
            filledPercent: Math.min(100, (currentChars / charBudget) * 100),
            atomCount: selectedAtoms.length
        }
    };
}
