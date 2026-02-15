/**
 * Distributed Query Budget Allocation
 * 
 * Implements 70/30 split:
 * - 70% for direct query terms (evenly distributed)
 * - 30% for related terms from synonym ring (5 per original term)
 */

import { loadSynonymRing, expandTerms as getSynonyms } from '@rbalchii/dse';

export interface TermBudget {
    term: string;
    budget: number;  // Percentage of total (0-1)
    isRelated: boolean;  // True if this is a related/nearby term
}

export interface QueryBudget {
    directTerms: TermBudget[];
    relatedTerms: TermBudget[];
    totalBudget: number;  // Character budget
}

/**
 * Parse query into distinct search terms
 */
function parseQueryTerms(query: string): string[] {
    // Split on spaces, filter short words, dedupe
    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 2)
        .filter((t, i, arr) => arr.indexOf(t) === i);

    return terms.slice(0, 5); // Max 5 primary terms
}

/**
 * Get related terms for a given term using synonym ring
 */
async function getRelatedTerms(term: string, count: number = 5): Promise<string[]> {
    try {
        const synonyms = await getSynonyms([term]); // expandTerms expects array
        return synonyms.slice(0, count);
    } catch {
        return [];
    }
}

/**
 * Distribute query budget across terms
 * 
 * For query "Rob Jade Dory" with 10000 char budget:
 * - Rob: 23% (2300 chars)
 * - Jade: 23% (2300 chars)
 * - Dory: 23% (2300 chars)
 * - Rob related (5 terms): 9.5% total (1.9% each = 190 chars)
 * - Jade related (5 terms): 9.5% total
 * - Dory related (5 terms): 9.5% total
 */
export async function distributeQueryBudget(
    query: string,
    totalBudget: number
): Promise<QueryBudget> {
    const terms = parseQueryTerms(query);
    if (terms.length === 0) {
        return { directTerms: [], relatedTerms: [], totalBudget };
    }

    const DIRECT_RATIO = 0.70;  // 70% for direct terms
    const RELATED_RATIO = 0.30; // 30% for related terms
    const RELATED_TERMS_PER = 5;

    const directBudget = totalBudget * DIRECT_RATIO;
    const relatedBudget = totalBudget * RELATED_RATIO;

    const directTerms: TermBudget[] = [];
    const relatedTerms: TermBudget[] = [];

    // Distribute direct budget evenly across terms
    const directPerTerm = directBudget / terms.length;
    for (const term of terms) {
        directTerms.push({
            term,
            budget: directPerTerm / totalBudget,
            isRelated: false
        });
    }

    // Get related terms for each primary term
    const relatedPerPrimaryTerm = relatedBudget / terms.length;
    const relatedPerSecondaryTerm = relatedPerPrimaryTerm / RELATED_TERMS_PER;

    for (const term of terms) {
        const related = await getRelatedTerms(term, RELATED_TERMS_PER);
        for (const relatedTerm of related) {
            relatedTerms.push({
                term: relatedTerm,
                budget: relatedPerSecondaryTerm / totalBudget,
                isRelated: true
            });
        }
    }

    console.log(`[DistributedQuery] Budget: ${terms.length} direct terms (${(DIRECT_RATIO * 100).toFixed(0)}%), ${relatedTerms.length} related terms (${(RELATED_RATIO * 100).toFixed(0)}%)`);

    return {
        directTerms,
        relatedTerms,
        totalBudget
    };
}

/**
 * Calculate how many characters to allocate for a term
 */
export function getBudgetForTerm(budget: QueryBudget, term: string): number {
    const direct = budget.directTerms.find(t => t.term === term);
    if (direct) return Math.floor(direct.budget * budget.totalBudget);

    const related = budget.relatedTerms.find(t => t.term === term);
    if (related) return Math.floor(related.budget * budget.totalBudget);

    return 0;
}

/**
 * Get all terms from budget (for parallel search)
 */
export function getAllTerms(budget: QueryBudget): string[] {
    const direct = budget.directTerms.map(t => t.term);
    const related = budget.relatedTerms.map(t => t.term);
    return [...direct, ...related];
}
