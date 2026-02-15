
import { runSideChannel } from './provider.js';

interface ContextItem {
    content: string;
    source: string;
    timestamp?: number;
}

/**
 * Summarizes the retrieved search results in relation to the user's query.
 * Uses the secondary 'Orchestrator' model to keep the main chat context clean.
 */
export async function summarizeContext(
    results: ContextItem[],
    query: string
): Promise<string> {
    if (!results || results.length === 0) return "";

    // 1. Prepare the Retrieval Document
    const docs = results.map(r => {
        const time = r.timestamp ? `(${new Date(r.timestamp).toISOString()})` : '';
        return `[Source: ${r.source} ${time}]\n${r.content}`;
    }).join('\n\n---\n\n');

    // 2. Prepare the Reader Prompt
    const systemPrompt = `You are a Reader for the Sovereign Context Engine.
Your goal is to read the provided Search Results and create a concise, factual summary that answers the User's Query.
If the results are irrelevant, state that clearly.
Focus on extracting dates, decisions, and key patterns.
Output ONLY the summary. Do not chat.`;

    const userPrompt = `USER QUERY: "${query}"

SEARCH RESULTS:
${docs}

SUMMARY:`;

    try {
        console.log(`[Reader] Summarizing ${results.length} items for query: "${query}"`);
        const summary = await runSideChannel(userPrompt, systemPrompt, {
            temperature: 0.3, // Fact-focused
            maxTokens: 512
        }) as string;
        console.log(`[Reader] Summary generated (${summary.length} chars).`);
        return summary.trim();
    } catch (e) {
        console.error(`[Reader] Failed to summarize:`, e);
        return `Error summarizing results: ${(e as any).message}`; // Fallback
    }
}
