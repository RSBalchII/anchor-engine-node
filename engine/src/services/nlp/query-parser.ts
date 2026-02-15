/**
 * Query Parser Service for ECE (Natural Language Query Processing)
 * 
 * Provides utilities for parsing and expanding natural language queries
 * to improve search effectiveness.
 */

const STOP_PHRASES = [
  'show me', 'what is', 'what are', 'can you find', 'search for', 'look for', 'find', 'display', 'list',
  'tell me about', 'give me', 'bring up', 'what do we know about', 'what can we see from', 'how about', 'describe', 'explain'
];

export function parseNaturalLanguage(query: string): string {
  let cleaned = query.trim();

  // Case insensitive removal of start phrases
  // We sort by length descending to match longest phrases first
  const sortedPhrases = [...STOP_PHRASES].sort((a, b) => b.length - a.length);

  for (const phrase of sortedPhrases) {
    const regex = new RegExp(`^${phrase}\\s+`, 'i');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '');
    }
  }

  return cleaned.trim();
}

export async function expandQuery(query: string): Promise<string[]> {
  // Basic query expansion - could be enhanced with semantic expansion
  // For now, just return empty array indicating no expansions
  return [];
}