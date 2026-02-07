import { db } from '../../core/db.js';
import { SearchResult } from './search.js';

interface ContextWindow {
    compoundId: string;
    source: string;
    start: number;
    end: number;
    originalResults: SearchResult[];
}

export class ContextInflator {

    /**
     * Inflate search results into expanded Context Windows.
     * Supports "Dynamic Density": Scales window size based on available budget and result count.
     * Fetches content from compound_body in the database to ensure coordinate space alignment.
     */
    static async inflate(results: SearchResult[], totalBudget?: number): Promise<SearchResult[]> {
        if (results.length === 0) return [];

        // Process each result to potentially expand content from compound_body
        const processedResults: SearchResult[] = [];
        
        for (const res of results) {
            // Skip inflation if we don't have the necessary compound coordinates
            // We need compound_id to fetch the compound_body from the database
            if (!res.compound_id || res.start_byte === undefined || res.end_byte === undefined) {
                // If no compound coordinates, use the result as-is
                processedResults.push(res);
                continue;
            }

            try {
                // Skip inflation for virtual sources
                if (res.source === 'atom_source' || res.source === 'internal' || res.source === 'memory') {
                    processedResults.push(res);
                    continue;
                }

                // Fetch the compound_body from the database (same coordinate space as offsets)
                // The byte offsets were computed on sanitized content, so we must inflate from
                // the sanitized compound_body, not the raw file content
                const query = `SELECT compound_body FROM compounds WHERE id = $1`;
                const result = await db.run(query, [res.compound_id]);

                if (!result.rows || result.rows.length === 0) {
                    // Fallback to original result if compound not found
                    processedResults.push(res);
                    continue;
                }

                const compoundBody = result.rows[0][0] as string;
                
                // Extract the specific content based on byte coordinates
                // Convert to Buffer to handle byte offsets correctly (not string indices)
                const contentBuffer = Buffer.from(compoundBody, 'utf-8');
                const start = Math.max(0, res.start_byte);
                const end = res.end_byte ?? contentBuffer.length;
                const sliceBuffer = contentBuffer.subarray(start, end);
                const extractedContent = sliceBuffer.toString('utf-8');

                // Create a new result with expanded content
                const expandedResult: SearchResult = {
                    ...res,
                    content: `...${extractedContent}...`,
                    is_inflated: true
                };

                processedResults.push(expandedResult);
            } catch (e) {
                console.error(`[ContextInflator] Failed to inflate result for ${res.source}`, e);
                // On error, use the original result
                processedResults.push(res);
            }
        }

        // If we have a total budget and our current results don't fill it, try to expand with less directly connected data
        if (totalBudget && totalBudget > 0) {
            const currentCharCount = processedResults.reduce((sum, result) => sum + (result.content?.length || 0), 0);

            if (currentCharCount < totalBudget) {
                console.log(`[ContextInflator] Current results (${currentCharCount} chars) don't fill budget (${totalBudget} chars). Attempting to expand with less directly connected data...`);

                // Fetch additional related content to fill the budget
                const additionalResults = await this.fetchAdditionalContext(processedResults, totalBudget - currentCharCount);

                if (additionalResults.length > 0) {
                    // Add additional results to fill the remaining budget
                    processedResults.push(...additionalResults);

                    // Sort by score to prioritize the most relevant content
                    processedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
                }
            }
        }

        return processedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    /**
     * Fetch additional context to fill the token budget with less directly connected but still relevant data
     */
    private static async fetchAdditionalContext(baseResults: SearchResult[], remainingBudget: number): Promise<SearchResult[]> {
        if (remainingBudget <= 0) return [];

        // Extract tags and buckets from base results to find related content
        const allTags = new Set<string>();
        const allBuckets = new Set<string>();

        for (const result of baseResults) {
            if (result.tags) {
                result.tags.forEach(tag => allTags.add(tag));
            }
            if (result.buckets) {
                result.buckets.forEach(bucket => allBuckets.add(bucket));
            }
        }

        // Convert sets to arrays for use in queries
        const tagsArray = Array.from(allTags);
        const bucketsArray = Array.from(allBuckets);

        // Query for related content that shares tags or buckets but wasn't in the original results
        let query = `
            SELECT id, content, source_path as source, timestamp,
                   buckets, tags, epochs, provenance, simhash as molecular_signature,
                   100 as score  -- Lower score for less directly connected content
            FROM atoms
            WHERE `;

        const params: any[] = [];
        const conditions: string[] = [];

        // Add conditions for tags if we have any
        if (tagsArray.length > 0) {
            conditions.push(`EXISTS (
                SELECT 1 FROM unnest(tags) as tag WHERE tag = ANY($${params.length + 1})
            )`);
            params.push(tagsArray);
        }

        // Add conditions for buckets if we have any
        if (bucketsArray.length > 0) {
            const bucketParamIndex = params.length + 1;
            conditions.push(`EXISTS (
                SELECT 1 FROM unnest(buckets) as bucket WHERE bucket = ANY($${bucketParamIndex})
            )`);
            params.push(bucketsArray);
        }

        // Combine conditions with OR (so we get content that matches either tags OR buckets)
        let queryConditions = '';
        if (conditions.length > 0) {
            queryConditions = `(${conditions.join(' OR ')})`;
        } else {
            // If no tags or buckets to match, just get some random content
            queryConditions = 'TRUE';
        }

        // Exclude original results
        const originalIds = baseResults.map(r => r.id);
        let fullQuery = query + queryConditions;
        if (originalIds.length > 0) {
            const excludeParamIndex = params.length + 1;
            fullQuery += ` AND id != ALL($${excludeParamIndex})`;
            params.push(originalIds);
        }

        // Limit to avoid fetching too much
        fullQuery += ` ORDER BY timestamp DESC LIMIT 20`;

        try {
            const result = await db.run(fullQuery, params);
            if (!result.rows) return [];

            // Convert rows to SearchResult objects
            const additionalResults: SearchResult[] = result.rows.map((row: any[]) => ({
                id: row[0],
                content: row[1],
                source: row[2],
                timestamp: row[3],
                buckets: row[4],
                tags: row[5],
                epochs: row[6],
                provenance: row[7],
                molecular_signature: row[8],
                score: row[9] || 100, // Default score if not provided
                is_inflated: true
            }));

            // Further filter and truncate content to fit the remaining budget
            let totalChars = 0;
            const filteredResults: SearchResult[] = [];

            for (const result of additionalResults) {
                if (!result.content) continue;

                const availableSpace = remainingBudget - totalChars;
                if (availableSpace <= 0) break;

                if (result.content.length <= availableSpace) {
                    // If the content fits entirely, add it
                    filteredResults.push(result);
                    totalChars += result.content.length;
                } else {
                    // If the content is too large, truncate it to fit
                    const truncatedContent = result.content.substring(0, availableSpace);
                    filteredResults.push({
                        ...result,
                        content: truncatedContent
                    });
                    totalChars += truncatedContent.length;
                    break; // Budget is filled
                }
            }

            console.log(`[ContextInflator] Fetched ${filteredResults.length} additional results to fill budget`);
            return filteredResults;
        } catch (e) {
            console.error(`[ContextInflator] Failed to fetch additional context:`, e);
            return [];
        }
    }
}