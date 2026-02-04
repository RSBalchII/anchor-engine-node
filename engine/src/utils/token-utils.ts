/**
 * Token Utilities
 * 
 * Provides functions for token counting and truncation
 */

/**
 * Estimates token count in text (simple word-based estimation)
 * In a real implementation, you'd use a proper tokenizer like GPT-3's cl100k_base
 */
export function estimateTokenCount(text: string): number {
    if (!text) return 0;
    
    // Simple estimation: split on whitespace and punctuation
    // This is a rough approximation - real tokenizers are more sophisticated
    const tokens = text.trim().split(/\s+/).filter(token => token.length > 0);
    return tokens.length;
}

/**
 * Truncates text to approximately the specified token limit
 */
export function truncateTokens(text: string, maxTokens: number): string {
    if (!text || maxTokens <= 0) return '';
    
    // For this simple implementation, we'll use word splitting
    const words = text.split(/\s+/);
    let result = '';
    let tokenCount = 0;
    
    for (const word of words) {
        if (tokenCount >= maxTokens) break;
        
        if (result) result += ' ';
        result += word;
        tokenCount++;
    }
    
    return result;
}

/**
 * More sophisticated token estimation using common tokenization patterns
 */
export function estimateTokenCountAdvanced(text: string): number {
    if (!text) return 0;
    
    // This is still a simplified approach
    // A real implementation would use a proper BPE tokenizer
    let count = 0;
    let currentToken = '';
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Common token boundaries
        if (/\s/.test(char)) {
            if (currentToken) {
                count++;
                currentToken = '';
            }
        } else if (/[\.,!?;:]/.test(char)) {
            if (currentToken) count++;
            count++; // Punctuation often forms its own token
            currentToken = '';
        } else {
            currentToken += char;
        }
    }
    
    if (currentToken) count++;
    
    return count;
}