import { config } from '../../config/index.js';
import type { ContextPackage, UserContext, QueryIntent, MemoryNode } from '../../types/context-protocol.js';
import { 
  assembleContextPackage, 
  serializeForLLM, 
  detectIntent,
  assembleAndSerialize
} from '../../services/search/graph-context-serializer.js';
import {
  generateSystemPrompt,
  buildSovereignPrompt
} from '../../services/search/sovereign-system-prompt.js';

export interface ContextAtom {
    id: string;
    content: string;
    source: string;
    timestamp: number;
    score: number; // Relevance Score
    tags?: string[];
    type?: string;
    provenance?: string;
    connections?: string[]; // IDs of connected atoms
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
 * Rolling Context Slicer (Feature 8) - Neuro-Symbolic Bridge Edition
 * 
 * Implements "Middle-Out" Context Budgeting with Structured Graph Output.
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
        const atomTimestamp = typeof atom.timestamp === 'number' && !isNaN(atom.timestamp) 
            ? atom.timestamp 
            : now;
        const age = Math.max(0, now - atomTimestamp);
        // Recency Score: 1.0 = Brand new, 0.0 = >1 Month old (clamped)
        const recencyScore = Math.max(0, 1.0 - (age / oneMonth));

        // Final Mixed Score
        const mixedScore = (atom.score * RELEVANCE_WEIGHT) + (recencyScore * RECENCY_WEIGHT);

        return { ...atom, timestamp: atomTimestamp, mixedScore, recencyScore };
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

    // 6. Assemble JSON Graph (Neuro-Symbolic Output)
    const graphNodes = selectedAtoms.map(a => ({
        id: a.id,
        type: a.type || 'thought',
        content: a.content,
        meta: {
            score: Number(a.mixedScore.toFixed(3)),
            tags: a.tags || [],
            source: a.source,
            timestamp: (() => {
                try {
                    return new Date(a.timestamp).toISOString();
                } catch (e) {
                    return new Date().toISOString();
                }
            })(),
            provenance: a.provenance || 'internal'
        }
    }));

    const graph = {
        intent: query,
        nodes: graphNodes
    };

    const jsonString = JSON.stringify(graph, null, 2);

    // Wrap with the User's Neuro-Symbolic Directive
    const promptWrapper = `Here is a graph of thoughts from my memory, ranked by mathematical relevance (Time + Logic). Use these nodes to answer my question. Do not use outside knowledge unless necessary.\n\n\`\`\`json\n${jsonString}\n\`\`\``;

    return {
        prompt: promptWrapper,
        stats: {
            tokenCount: Math.ceil(currentChars / CHARS_PER_TOKEN),
            charCount: currentChars,
            filledPercent: Math.min(100, (currentChars / charBudget) * 100),
            atomCount: selectedAtoms.length
        }
    };
}

// =============================================================================
// GRAPH-CONTEXT PROTOCOL (GCP) — Enhanced Context Assembly
// =============================================================================

/**
 * Compose context using the Graph-Context Protocol.
 * 
 * This produces the sovereign prompt format:
 *   System: "You are the interface for Anchor OS..."
 *   User:   [CONTEXT_GRAPH_START]...[CONTEXT_GRAPH_END] + query
 * 
 * Use this instead of composeRollingContext when you have physics metadata.
 */
export function composeGraphContext(
    query: string,
    anchors: ContextAtom[],
    walkerResults: ContextAtom[],
    user: UserContext,
    tokenBudget: number = 4096
): { system: string; user: string; stats: ContextResult['stats'] } {
    const CHARS_PER_TOKEN_GCP = 4;
    const charBudget = Math.floor(tokenBudget * 0.95 * CHARS_PER_TOKEN_GCP);

    // Convert ContextAtoms to SearchResult-compatible format for the serializer
    const anchorSearchResults = anchors.map(a => ({
        id: a.id,
        content: a.content,
        source: a.source,
        timestamp: a.timestamp,
        buckets: [] as string[],
        tags: a.tags || [],
        epochs: '',
        provenance: a.provenance || 'internal',
        score: a.score,
        type: a.type || 'thought',
        frequency: 1,
    }));

    const walkerSearchResults = walkerResults.map(a => ({
        id: a.id,
        content: a.content,
        source: a.source,
        timestamp: a.timestamp,
        buckets: [] as string[],
        tags: a.tags || [],
        epochs: '',
        provenance: a.provenance || 'internal',
        score: a.score,
        type: a.type || 'thought',
        frequency: 1,
    }));

    const intent = detectIntent(query);

    // Extract key terms from query (simple NLP-free approach)
    const keyTerms = query.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3 && !['what', 'when', 'where', 'that', 'this', 'with', 'from', 'about'].includes(w));

    const serialized = assembleAndSerialize({
        user,
        query,
        keyTerms,
        anchors: anchorSearchResults,
        legacyWalkerResults: walkerSearchResults,
        charBudget,
    });

    const { system, user: userMsg } = buildSovereignPrompt(user, intent, serialized, query);

    const totalChars = system.length + userMsg.length;

    return {
        system,
        user: userMsg,
        stats: {
            tokenCount: Math.ceil(totalChars / CHARS_PER_TOKEN_GCP),
            charCount: totalChars,
            filledPercent: Math.min(100, (totalChars / charBudget) * 100),
            atomCount: anchors.length + walkerResults.length,
        }
    };
}
