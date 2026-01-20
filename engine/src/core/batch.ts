/**
 * Batch Processing Utility
 * 
 * Provides a standardized way to process large arrays of items in chunks.
 * Useful for LLM operations, Database writes, and heavy processing loops.
 */

export interface BatchOptions {
    batchSize: number;
    delayMs?: number; // Optional delay between batches to let system breathe
}

/**
 * Process an array of items in batches.
 * 
 * @param items Array of items to process
 * @param processor Async function to process a single batch
 * @param options Configuration options
 */
export async function processInBatches<T, R>(
    items: T[],
    processor: (batch: T[], batchIndex: number, startItemIndex: number) => Promise<R>,
    options: BatchOptions
): Promise<R[]> {
    const { batchSize, delayMs } = options;
    const results: R[] = [];
    const totalBatches = Math.ceil(items.length / batchSize);

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize);

        try {
            const result = await processor(batch, batchIndex, i);
            results.push(result);
        } catch (error) {
            console.error(`[Batch] Error in batch ${batchIndex + 1}/${totalBatches}:`, error);
            // We continue processing other batches? 
            // Depends on specific service needs, but generally safer to throw or let caller handle try/catch inside processor.
            throw error;
        }

        if (delayMs && i + batchSize < items.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}
