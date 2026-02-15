/**
 * Search Utilities Module — "The Tools"
 *
 * Types, interfaces, Hamming distance calculation, result formatting,
 * and display helpers used across the search subsystem.
 * Extracted from search.ts for clean separation of concerns.
 */

import { config } from '../../config/index.js';
import { composeRollingContext } from '../../core/inference/context_manager.js';
import { nativeModuleManager } from '../../utils/native-module-manager.js';
import { SemanticCategory } from '../../types/taxonomy.js';

export interface SearchResult {
    id: string;
    content: string;
    source: string;
    timestamp: number;
    buckets: string[];
    tags: string[];
    epochs: string;
    provenance: string;
    score: number;
    sequence?: number; // Added for Bright Node continuity
    molecular_signature?: string;  // V4 Nomenclature (formerly simhash)
    frequency?: number; // Number of times this content was found (for deduplication)
    temporal_state?: { // Information about temporal aspects of duplicates
        first_seen: number;
        last_seen: number;
        occurrence_count: number;
        timestamps: number[]; // Array of all timestamps when this content or similar was found
    };
    // Atomic Fields
    compound_id?: string;
    start_byte?: number;
    end_byte?: number;
    type?: string;
    numeric_value?: number;
    numeric_unit?: string;
    is_inflated?: boolean;
    // Semantic Fields
    semanticCategories?: SemanticCategory[];
    relatedEntities?: string[];
}

/**
 * Helper: Calculate Hamming Distance between two hex strings
 * Uses the native module or fallback if available
 */
export function getHammingDistance(hashA: string, hashB: string): number {
    try {
        // Validate inputs before processing
        if (!hashA || !hashB) {
            console.warn('[Search] Invalid hash inputs for Hamming distance calculation:', { hashA, hashB });
            return 64; // Max distance on error (assume different)
        }

        // Ensure valid hex strings
        if (!/^[0-9a-fA-F]+$/.test(hashA) || !/^[0-9a-fA-F]+$/.test(hashB)) {
            console.warn('[Search] Invalid hex string format for Hamming distance:', { hashA, hashB });
            return 64; // Max distance on error (assume different)
        }

        const a = BigInt(`0x${hashA}`);
        const b = BigInt(`0x${hashB}`);

        // Force JS fallback to prevent native module crashes (ECONNRESET/Segfault debugging)
        /*
        const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node'); // Ensure loaded
    
        // Check if we're using fallback implementation
        const isUsingFallback = nativeModuleManager.isUsingFallback('ece_native');
        if (isUsingFallback) {
          console.log('[Search] Using fallback implementation for native module distance calculation');
        }
    
        if (native && native.distance) {
          try {
            // Add timeout protection for native calls to prevent hanging
            const result = native.distance(a, b);
            if (typeof result !== 'number') {
              console.warn('[Search] Unexpected result type from native distance function:', typeof result);
              return 64;
            }
            return result;
          } catch (nativeError) {
            console.error('[Search] Native module distance function failed:', nativeError);
            // Fallback to JavaScript implementation if native call fails
            let xor = a ^ b;
            let count = 0;
            while (xor > 0n) {
              xor &= (xor - 1n);
              count++;
            }
            return count;
          }
        } else {
        */
        // JavaScript fallback implementation
        let xor = a ^ b;
        let count = 0;
        while (xor > 0n) {
            xor &= (xor - 1n);
            count++;
        }
        return count;
        //}

    } catch (e) {
        console.error('[Search] Hamming distance calculation failed:', e);
        return 64; // Max distance on error (assume different)
    }
}

/**
 * Helper: safely extract array from possibly undefined input
 */
export function getItems(input: string[] | undefined): string[] {
    return Array.isArray(input) ? input : [];
}

/**
 * Format search results within character budget
 * Uses molecular coordinates (start_byte/end_byte) for precise content slicing
 */
export async function formatResults(results: SearchResult[], maxChars: number): Promise<{ context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any }> {
    try {
        // By this point, ContextInflator.inflate() has already resolved compound coordinates
        // into real content from disk files. Results with is_inflated=true have content ready.
        const candidates = results.map(r => {
            let content = r.content || '';

            // Include frequency information in the content if available
            if (r.frequency && r.frequency > 1) {
                content = `[Found ${r.frequency} times] ${content}`;
            }

            return {
                id: r.id,
                content,
                source: r.source,
                timestamp: r.timestamp,
                score: r.score,
                type: r.type,
                tags: r.tags || [],
                buckets: r.buckets || [],
                provenance: r.provenance || 'internal',
                connections: []
            };
        });

        const tokenBudget = Math.floor(maxChars / 4);
        const rollingContext = composeRollingContext("query_placeholder", candidates, tokenBudget);

        const sortedResults = results.sort((a, b) => b.score - a.score);

        return {
            context: rollingContext.prompt || 'No results found.',
            results: sortedResults,
            toAgentString: () => {
                return sortedResults.map(r => `[${r.provenance}] ${r.source}: ${(r.content || "").substring(0, 200)}...`).join('\n');
            },
            metadata: rollingContext.stats
        };
    } catch (error) {
        console.error('[Search] formatResults failed:', error);
        // Return a safe fallback result to prevent crashes
        return {
            context: 'Error occurred during result formatting.',
            results: [],
            toAgentString: () => 'Error occurred during result formatting.',
            metadata: { error: true, message: 'Failed to format search results' }
        };
    }
}

/**
 * Helper to filter tags for display (User Request: Hide Year Numbers)
 */
export function filterDisplayTags(tags: string[]): string[] {
    if (!config.SEARCH?.hide_years_in_tags) return tags;
    // Remove if exactly 4 digits (approx year check)
    return tags.filter(t => !/^\d{4}$/.test(t));
}
