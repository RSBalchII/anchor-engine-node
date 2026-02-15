
// import type { LlamaChatSession } from 'node-llama-cpp'; // Unused
import { getModel, getContext, getCurrentCtxSize, runSideChannel } from './provider.js';
import { config } from '../../config/index.js';

interface MockLlamaModel {
    tokenize(text: string): { length: number; slice(start: number, end: number): any[] } & any[];
    detokenize(tokens: any[]): string;
}


/**
 * Summarizes massive content by chunking it and processing through a side-channel session.
 * Prevents polluting the main chat history with raw data.
 */
export async function summarizeLargeContent(text: string, maxOutputTokens = 500): Promise<string> {
    const model = getModel() as unknown as MockLlamaModel;
    const context = getContext();

    if (!text || !model || !context) return "";

    // First, check if the text is too large and needs to be preprocessed
    if (text.length > config.LIMITS.MAX_CONTENT_LENGTH_CHARS) {
        console.log(`[Summarizer] Content too large (${text.length} chars). Preprocessing...`);

        // For very large texts, we'll use a more aggressive chunking strategy
        const MAX_CHUNK_SIZE = config.LIMITS.MAX_CHUNK_SIZE_CHARS;
        const chunks: string[] = [];

        for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
            chunks.push(text.substring(i, i + MAX_CHUNK_SIZE));
        }

        console.log(`[Summarizer] Split into ${chunks.length} chunks for processing...`);
        const summaries: string[] = [];

        for (const [i, chunk] of chunks.entries()) {
            try {
                console.log(`[Summarizer] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

                const systemPrompt = "You are a precise technical summarizer. Extract key facts, code snippets, and definitions. Be extremely concise.";
                const prompt = `Summarize this content in under ${Math.min(Math.floor(maxOutputTokens / chunks.length) + 20, 200)} words found below:\n\n${chunk}\n\nSummary:`;

                const chunkSummary = (await runSideChannel(
                    prompt,
                    systemPrompt,
                    { maxTokens: 300, temperature: 0.1 }
                )) as string;

                summaries.push(chunkSummary || `[SUMMARY UNAVAILABLE] Chunk ${i + 1} failed.`);
            } catch (chunkError: any) {
                console.warn(`[Summarizer] Failed to process chunk ${i + 1}:`, chunkError.message);
                summaries.push(`[SUMMARY UNAVAILABLE] Failed to process chunk ${i + 1} due to context limitations.`);
            }
        }

        // Now summarize the combined summaries if needed
        const combinedSummaries = summaries.join("\n\n");
        if (combinedSummaries.length > config.LIMITS.MAX_SUMMARY_LENGTH_CHARS) {
            console.log(`[Summarizer] Combined summaries still large (${combinedSummaries.length} chars), final summarization...`);
            const finalSystem = "You are a precise technical summarizer. Be extremely concise.";
            const finalPrompt = `Summarize these notes:\n\n${combinedSummaries}`;
            const final = (await runSideChannel(finalPrompt, finalSystem, { maxTokens: Math.min(maxOutputTokens, 400), temperature: 0.1 })) as string;
            return final || combinedSummaries;
        }

        return combinedSummaries;
    } else {
        // Original logic for smaller texts
        const tokens = model.tokenize(text);
        const totalTokens = tokens.length;

        // Reserve space for prompt overhead + generation
        const CONTEXT_WINDOW = getCurrentCtxSize();
        const CHUNK_CAPACITY = Math.floor(CONTEXT_WINDOW * 0.4);

        if (totalTokens <= CHUNK_CAPACITY) {
            const systemPrompt = "You are a precise technical summarizer. Extract key facts, code snippets, and definitions. Be extremely concise.";
            const prompt = `Summarize this content in under ${maxOutputTokens} words found below:\n\n${text}\n\nSummary:`;
            const res = (await runSideChannel(prompt, systemPrompt, { maxTokens: maxOutputTokens, temperature: 0.1 })) as string;
            return res || text.substring(0, maxOutputTokens * 4);
        }

        console.log(`[Summarizer] Content too large (${totalTokens} tokens). Chunking...`);
        const chunks: string[] = [];
        let offset = 0;
        while (offset < totalTokens) {
            const chunkTokens = tokens.slice(offset, offset + CHUNK_CAPACITY);
            chunks.push(model.detokenize(chunkTokens));
            offset += CHUNK_CAPACITY;
        }

        console.log(`[Summarizer] Processing ${chunks.length} chunks...`);
        const summaries: string[] = [];

        for (const [i, chunk] of chunks.entries()) {
            const systemPrompt = "You are a precise technical summarizer. Be extremely concise.";
            const prompt = `Summarize this chunk:\n\n${chunk}`;
            const res = (await runSideChannel(prompt, systemPrompt, { maxTokens: 300, temperature: 0.1 })) as string;
            summaries.push(res || `[Chunk ${i} Failed]`);
        }

        return summaries.join("\n\n");
    }
}
