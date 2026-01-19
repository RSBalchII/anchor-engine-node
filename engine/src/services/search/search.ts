/**
 * Search Service with Engram Layer and Provenance Boosting
 *
 * Implements:
 * 1. Engram Layer (Fast Lookup) - O(1) lookup for known entities
 * 2. Provenance Boosting - Sovereign content gets 2x score boost
 */

import { db } from '../../core/db.js';
import { createHash } from 'crypto';
import { getEmbedding } from '../llm/provider.js';

// ...

interface SearchResult {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  buckets: string[];
  tags: string;
  epochs: string;
  provenance: string;
  score: number;
}

/**
 * Create or update an engram (lexical sidecar) for fast entity lookup
 */
export async function createEngram(key: string, memoryIds: string[]): Promise<void> {
  const normalizedKey = key.toLowerCase().trim();
  const engramId = createHash('md5').update(normalizedKey).digest('hex');

  const insertQuery = `?[key, value] <- $data :put engrams {key, value}`;
  await db.run(insertQuery, {
    data: [[engramId, JSON.stringify(memoryIds)]]
  });
}

/**
 * Lookup memories by engram key (O(1) operation)
 */
export async function lookupByEngram(key: string): Promise<string[]> {
  const normalizedKey = key.toLowerCase().trim();
  const engramId = createHash('md5').update(normalizedKey).digest('hex');

  const query = `?[value] := *engrams{key, value}, key = $engramId`;
  const result = await db.run(query, { engramId });

  if (result.rows && result.rows.length > 0) {
    return JSON.parse(result.rows[0][0] as string);
  }

  return [];
}

/**
 * Perform Semantic Vector Search
 */
async function vectorSearch(query: string, buckets: string[] = [], maxChars: number = 524288): Promise<SearchResult[]> {
  try {
    const queryVec = await getEmbedding(query);
    if (!queryVec || queryVec.length === 0) return [];

    // Dynamic K based on budget (Avg atom ~500 chars)
    // If budget is high (e.g. 500k chars), we need K=1000.
    // If budget is low (e.g. 5k chars), K=20 is enough.
    // Clamp K between 50 and 2000.
    const k = Math.min(2000, Math.max(50, Math.ceil(maxChars / 400)));
    const ef = Math.min(3200, k * 2); // Recommend ef = 2*k

    let queryCozo = '';
    if (buckets.length > 0) {
      queryCozo = `?[id, content, source, timestamp, buckets, tags, epochs, provenance, dist] := ~memory:knn{id | query: vec($queryVec), k: ${k}, ef: ${ef}, bind_distance: d}, dist = d, *memory{id, content, source, timestamp, buckets, tags, epochs, provenance, embedding}, length(intersection(buckets, $buckets)) > 0`;
    } else {
      queryCozo = `?[id, content, source, timestamp, buckets, tags, epochs, provenance, dist] := ~memory:knn{id | query: vec($queryVec), k: ${k}, ef: ${ef}, bind_distance: d}, dist = d, *memory{id, content, source, timestamp, buckets, tags, epochs, provenance, embedding}`;
    }

    const result = await db.run(queryCozo, { queryVec, buckets });

    if (!result.rows) return [];

    return result.rows.map((row: any[]) => ({
      id: row[0],
      content: row[1],
      source: row[2],
      timestamp: row[3],
      buckets: row[4],
      tags: row[5],
      epochs: row[6],
      provenance: row[7],
      score: (1.0 - row[8]) * 100 // Convert distance to score (approx)
    }));

  } catch (e) {
    console.error('[Search] Vector search failed:', e);
    return [];
  }
}

/**
 * Execute search with provenance-aware scoring and Intelligent Routing
 */
export async function executeSearch(
  query: string,
  bucket?: string,
  buckets?: string[],
  maxChars: number = 524288,
  _deep: boolean = false,
  provenance: 'sovereign' | 'external' | 'all' = 'all'
): Promise<{ context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any }> {
  console.log(`[Search] executeSearch called with maxChars: ${maxChars}, provenance: ${provenance}`);

  // 1. ENGRAM LOOKUP (Fast Path)
  const engramResults = await lookupByEngram(query);
  if (engramResults.length > 0) {
    // ... (Existing Engram Logic)
    // I need to preserve the existing engram fetches if I replace the whole function
    // But I will just use the code from the View.
    // Wait, replacement tool replaces LINES. I should be careful.
  }

  // ... (Re-implement Engram Lookup Fetching or assume it's kept if I offset correctly)
  // Actually, I am replacing the WHOLE executeSearch. So I must re-include Engram Lookup logic.
  // Copying from previous view_file.

  if (engramResults.length > 0) {
    console.log(`[Search] Found ${engramResults.length} results via Engram lookup for: ${query}`);
    const engramContextQuery = `?[id, content, source, timestamp, buckets, tags, epochs, provenance] := *memory{id, content, source, timestamp, buckets, tags, epochs, provenance}, id in $ids`;
    const engramContentResult = await db.run(engramContextQuery, { ids: engramResults });
    if (engramContentResult.rows && engramContentResult.rows.length > 0) {
      const results: SearchResult[] = engramContentResult.rows.map((row: any[]) => ({
        id: row[0], content: row[1], source: row[2], timestamp: row[3], buckets: row[4], tags: row[5], epochs: row[6], provenance: row[7], score: 100
      }));
      return formatResults(results, maxChars);
    }
  }

  // 2. INTELLIGENT ROUTING
  const targetBuckets = buckets || (bucket ? [bucket] : []);
  const isComplex = query.split(' ').length > 3; // Heuristic
  console.log(`[Search] Query: "${query}" | Complex: ${isComplex} | Buckets: ${targetBuckets.join(',')}`);

  let results: SearchResult[] = [];

  // Always use Hybrid Search for better recall
  console.log('[Search] Routing to Hybrid Search (FTS + Vector)');

  const [ftsRes, vecRes] = await Promise.all([
    runTraditionalSearch(query, targetBuckets),
    vectorSearch(query, targetBuckets, maxChars)
  ]);

  // Merge Strategy:
  // 1. Create Map by ID
  const idMap = new Map<string, SearchResult>();

  // 2. Add FTS results (Base Score)
  ftsRes.forEach(r => idMap.set(r.id, r));

  // 3. Add Vector results (Boost or Add)
  vecRes.forEach(r => {
    if (idMap.has(r.id)) {
      // If found in both, boost significantly
      const existing = idMap.get(r.id)!;
      existing.score += (r.score * 1.5); // Boost semantic matches
      // Keep the highest text content (usually same)
    } else {
      idMap.set(r.id, r);
    }
  });

  results = Array.from(idMap.values());

  // Fallback if 0 results
  if (results.length === 0) {
    console.log('[Search] 0 results. Attempting Regex Fallback...');
    // Use existing fallback logic...
    // Or simplified one.
    // Let's implement a simple regex fallback here for completeness since I'm overwriting.
    // Actually, I'll define runFtsSearch to include the regex fallback internally?
    // No, explicit fallback is better.
    // I will inline the internal FTS logic into a helper function `runTraditionalSearch`.
    results = await runTraditionalSearch(query, targetBuckets);
  }

  // Provenance Boosting logic
  results = results.map(r => {
    let score = r.score;

    if (provenance === 'sovereign') {
      // Strong bias for sovereign
      if (r.provenance === 'sovereign') {
        score *= 3.0;
      } else {
        score *= 0.5;
      }
    } else if (provenance === 'external') {
      // Bias for external
      if (r.provenance !== 'sovereign') {
        score *= 1.5;
      }
    } else {
      // Default: Mild Sovereign Preference
      if (r.provenance === 'sovereign') score *= 2.0;
    }

    return { ...r, score };
  });

  return formatResults(results, maxChars);
}

// Helper for FTS + Regex Fallback
async function runTraditionalSearch(query: string, buckets: string[]): Promise<SearchResult[]> {
  // Aggressive Sanitization: Allow only alphanumeric and spaces. 
  // Strip FTS operators (~, -, *, OR, AND) and Unicode symbols that crash the parser.
  const sanitizedQuery = query
    .replace(/[^a-zA-Z0-9\s]/g, ' ') // Replace non-alphanumeric with space
    .replace(/\s+/g, ' ')            // Collapse spaces
    .trim()
    .toLowerCase();

  if (!sanitizedQuery) return [];

  let queryCozo = '';
  const params: any = { q: sanitizedQuery, buckets };

  if (buckets.length > 0) {
    queryCozo = `?[id, score, content, source, timestamp, buckets, tags, epochs, provenance] :=
          ~memory:content_fts{id | query: $q, k: 500, bind_score: s},
          score = s,
          *memory{id, content, source, timestamp, buckets, tags, epochs, provenance},
          length(intersection(buckets, $buckets)) > 0`;
  } else {
    queryCozo = `?[id, score, content, source, timestamp, buckets, tags, epochs, provenance] :=
          ~memory:content_fts{id | query: $q, k: 500, bind_score: s},
          score = s,
          *memory{id, content, source, timestamp, buckets, tags, epochs, provenance}`;
  }

  try {
    let result = await db.run(queryCozo, params);
    if (!result.rows || result.rows.length === 0) {
      // Regex Fallback
      const fallbackQuery = buckets.length > 0 ?
        `?[id, score, content, source, timestamp, buckets, tags, epochs, provenance] := 
                *memory{id, content, source, timestamp, buckets, tags, epochs, provenance},
                length(intersection(buckets, $buckets)) > 0,
                str_includes(lowercase(content), $q),
                score = 1.0` :
        `?[id, score, content, source, timestamp, buckets, tags, epochs, provenance] := 
                *memory{id, content, source, timestamp, buckets, tags, epochs, provenance},
                str_includes(lowercase(content), $q),
                score = 1.0`;

      result = await db.run(fallbackQuery, { q: query.toLowerCase(), buckets });
    }

    if (!result.rows) return [];
    return result.rows.map((row: any[]) => ({
      id: row[0], content: row[2], source: row[3], timestamp: row[4], buckets: row[5], tags: row[6], epochs: row[7], provenance: row[8], score: row[1]
    }));

  } catch (e) {
    console.error('FTS/Fallback failed', e);
    return [];
  }
}

// Compatibility Alias



import { composeRollingContext } from '../../core/inference/context_manager.js';

/**
 * Format search results within character budget
 */
function formatResults(results: SearchResult[], maxChars: number): { context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any } {
  // Convert SearchResult to ContextAtom
  const candidates = results.map(r => ({
    id: r.id,
    content: r.content,
    source: r.source,
    timestamp: r.timestamp,
    score: r.score
  }));

  const tokenBudget = Math.floor(maxChars / 4); // Approximation
  const rollingContext = composeRollingContext("query_placeholder", candidates, tokenBudget);

  const sortedResults = results.sort((a, b) => b.score - a.score);

  return {
    context: rollingContext.prompt || 'No results found.',
    results: sortedResults,
    toAgentString: () => {
      return sortedResults.map(r => `[${r.provenance}] ${r.source}: ${r.content.substring(0, 200)}...`).join('\n');
    },
    metadata: rollingContext.stats
  };
}

export function parseQuery(query: string): { phrases: string[]; temporal: string[]; buckets: string[]; keywords: string[]; } {
  const result = { phrases: [] as string[], temporal: [] as string[], buckets: [] as string[], keywords: [] as string[] };
  const phraseRegex = /"([^"]+)"/g;
  let phraseMatch;
  while ((phraseMatch = phraseRegex.exec(query)) !== null) result.phrases.push(phraseMatch[1]);
  let remainingQuery = query.replace(/"[^"]+"/g, '');
  const temporalRegex = /@(\w+)/g;
  let temporalMatch;
  while ((temporalMatch = temporalRegex.exec(remainingQuery)) !== null) result.temporal.push(temporalMatch[1]);
  remainingQuery = remainingQuery.replace(/@\w+/g, '');
  const bucketRegex = /#(\w+)/g;
  let bucketMatch;
  while ((bucketMatch = bucketRegex.exec(remainingQuery)) !== null) result.buckets.push(bucketMatch[1]);
  remainingQuery = remainingQuery.replace(/#\w+/g, '');
  result.keywords = remainingQuery.split(/\s+/).filter(kw => kw.length > 0);
  return result;
}