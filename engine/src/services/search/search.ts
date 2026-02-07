/**
 * Enhanced Search Service with Semantic Shift Architecture (Standard 086 Compliant)
 *
 * Implements:
 * 1. Semantic Molecule Lookup - O(1) lookup for semantic categories
 * 2. Provenance Boosting - Sovereign content gets boost
 * 3. Enhanced Tag-Walker Protocol - Graph-based associative retrieval with semantic category illumination
 * 4. Intelligent Query Expansion - GLM-assisted decomposition (Standard 069)
 * 5. Semantic Inference Protocol - Selective graph illumination for relationship narratives
 * 6. Adaptive Query Processing - Natural language intent mapping with relaxed filtering (Standard 086)
 * 7. Relationship Narrative Discovery - Entity co-occurrence detection for relationship patterns (Standard 087)
 */

import { db } from '../../core/db.js';
import { createHash } from 'crypto';
import { composeRollingContext } from '../../core/inference/context_manager.js';
import { config } from '../../config/index.js';
import { SemanticCategory } from '../../types/taxonomy.js';
import { executeSemanticSearch } from '../semantic/semantic-search.js';  // Import semantic search
import { expandTerms as semanticExpand, loadSynonymRing, isExpansionReady } from '../semantic/expansion.js'; // DSE expansion
import wink from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { ContextInflator } from './context-inflator.js';

// Initialize NLP (Fast CPU-based)
const nlp = wink(model);

// Initialize Semantic Expansion (Synonym Ring)
loadSynonymRing();

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

// ...



/**
 * Fetch top tags from the system to ground the LLM's query expansion
 */
export async function getGlobalTags(limit: number = 50): Promise<string[]> {
  try {
    // Fetch unique tags from the tags table
    const query = `
        SELECT DISTINCT unnest(tags) as tag
        FROM atoms
        WHERE tags IS NOT NULL
        LIMIT $1
    `;
    const result = await db.run(query, [limit * 10]); // Get more than needed for filtering
    if (!result.rows) return [];

    const uniqueTags = [...new Set(result.rows.map((r: any[]) => r[0]))];
    return uniqueTags.slice(0, limit) as string[];
  } catch (e) {
    console.error('[Search] Failed to fetch global tags:', e);
    return [];
  }
}

/**
 * Use LLM to expand query into semantically similar system tags
 */
import { getMasterTags } from '../tags/discovery.js';

/**
 * Deterministic Query Expansion (No LLM)
 * Scans the user query for known tags from the master list.
 */
export async function expandQuery(originalQuery: string): Promise<string[]> {
  try {
    const globalTags = getMasterTags(); // This is synchronous file read
    const queryLower = originalQuery.toLowerCase();

    // Find tags specifically mentioned in the query or that substring match
    // Simple heuristic: if query contains the tag, we boost it.
    const foundTags = globalTags.filter(tag => {
      const tagLower = tag.toLowerCase();
      // Check for boundary matches or direct inclusion
      return queryLower.includes(tagLower);
    });

    if (foundTags.length > 0) {
      console.log(`[Search] Deterministically matched tags: ${foundTags.join(', ')}`);
    }
    return foundTags;
  } catch (e) {
    console.error('[Search] Expansion failed:', e);
    return [];
  }
}

/**
 * Helper to sanitize queries for CozoDB FTS engine
 */
function sanitizeFtsQuery(query: string): string {
  return query
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Natural Language Parser (Standard 070)
 * Uses NLP to extract "Meaningful Tags" (Nouns, Proper Nouns, Important Verbs).
 * This prevents common words ("lately", "been", "working") from killing FTS recall.
 */
/**
 * Helper: Extract Temporal Context
 * Detects "last X months/years", year ranges, and returns a list of relevant year tags.
 */
function extractTemporalContext(query: string): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const tags: Set<string> = new Set();

  // Regex for "last X months/years"
  const match = query.match(/last\s+(\d+)\s+(months?|years?|days?)/i);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    tags.add(currentYear.toString()); // Always include current year

    if (unit.startsWith('year')) {
      for (let i = 1; i <= amount; i++) {
        tags.add((currentYear - i).toString());
      }
    } else if (unit.startsWith('month')) {
      // If subtracting months goes back to prev year
      const pastDate = new Date(now);
      pastDate.setMonth(now.getMonth() - amount);
      const pastYear = pastDate.getFullYear();
      if (pastYear < currentYear) {
        for (let y = pastYear; y < currentYear; y++) tags.add(y.toString());
      }
    }
  }

  // Detect year ranges like "from 2025 to 2026" or "between 2024 and 2025"
  const rangeMatch = query.match(/\b(from|between)\s+(\d{4})\s+(to|and)\s+(\d{4})\b/i);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[2]);
    const endYear = parseInt(rangeMatch[4]);
    // Add all years in the range
    for (let year = Math.min(startYear, endYear); year <= Math.max(startYear, endYear); year++) {
      tags.add(year.toString());
    }
  }

  // Also detect explicit years (2020-2030)
  const yearMatch = query.match(/\b(202[0-9]|203[0-9])\b/g);
  if (yearMatch) {
    yearMatch.forEach(y => tags.add(y));
  }

  return Array.from(tags);
}

/**
 * Natural Language Parser (Standard 070 - Enhanced)
 * Uses NLP to extract "Meaningful Tags" including Temporal Context.
 */
function parseNaturalLanguage(query: string): string {
  // 1. Extract Temporal Context
  const timeTags = extractTemporalContext(query);

  // 2. NLP Processing
  const doc = nlp.readDoc(query);

  // Extract Nouns, PropNouns, Adjectives, AND "Domain Verbs"
  // We want to keep words like "burnout" (Noun), "started" (Verb), "career" (Noun)
  // By default, just keeping NOUN/PROPN/ADJ is usually safe, but let's be slightly more permissive
  // or rely on the query expansion to catch synonyms.
  // Actually, "burnout" is a Noun. "Career" is a Noun.
  // "Decisions" is a Noun.
  // The issue might have been valid stopwords or tokenization.

  const tokens = doc.tokens().filter((t: any) => {
    const tag = t.out(nlp.its.pos);
    const text = t.out().toLowerCase();

    // Whitelist specific domain words that might get misclassified or filtered
    // Uses Config-based whitelist or falls back to defaults
    const whitelist = config.SEARCH?.whitelist || ['burnout', 'career', 'decision', 'pattern', 'impact'];
    if (whitelist.some((w: string) => text.includes(w))) return true;

    return tag === 'NOUN' || tag === 'PROPN' || tag === 'ADJ' || tag === 'VERB';
  }).out((nlp as any).its.text);

  // Combine
  const uniqueTokens = new Set([...tokens, ...timeTags]);

  if (uniqueTokens.size > 0) {
    return Array.from(uniqueTokens).join(' ').toLowerCase();
  }

  return sanitizeFtsQuery(query);
}

/**
 * Create or update an engram (lexical sidecar) for fast entity lookup
 */
export async function createEngram(key: string, memoryIds: string[]): Promise<void> {
  const normalizedKey = key.toLowerCase().trim();
  const engramId = createHash('md5').update(normalizedKey).digest('hex');

  const insertQuery = `INSERT INTO engrams (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  await db.run(insertQuery, [engramId, JSON.stringify(memoryIds)]);
}

/**
 * Lookup memories by engram key (O(1) operation)
 */
export async function lookupByEngram(key: string): Promise<string[]> {
  const normalizedKey = key.toLowerCase().trim();
  const engramId = createHash('md5').update(normalizedKey).digest('hex');

  const query = `SELECT value FROM engrams WHERE key = $1`;
  const result = await db.run(query, [engramId]);

  if (result.rows && result.rows.length > 0) {
    return JSON.parse(result.rows[0][0] as string);
  }

  return [];
}

/**
 * Tag-Walker Associative Search (Replaces Vector Search)
 */
export async function tagWalkerSearch(
  query: string,
  buckets: string[] = [],
  tags: string[] = [],
  _maxChars: number = 524288,
  provenance: 'internal' | 'external' | 'quarantine' | 'all' = 'all',
  filters?: { type?: string; minVal?: number; maxVal?: number; },
  fuzzy: boolean = false
): Promise<SearchResult[]> {
  try {
    const sanitizedQuery = sanitizeFtsQuery(query);
    if (!sanitizedQuery) return [];

    // 0. Dynamic Atom Scaling (Standard 069 update)
    // User Requirement: Scale atoms with token budget.
    // Heuristic: 2k tokens -> ~10 atoms. 4k -> ~20 atoms. Min 5.
    // Ratio: 70% Direct (Anchor), 30% Associative (Walk).
    const tokenBudget = Math.floor(_maxChars / 4);
    const avgTokensPerAtom = 200;
    const targetAtomCount = Math.max(5, Math.ceil(tokenBudget / avgTokensPerAtom));

    // Split 70/30
    const anchorLimit = Math.ceil(targetAtomCount * 0.70);
    const walkLimit = Math.max(2, Math.floor(targetAtomCount * 0.30)); // Ensure at least 2 for walk if possible

    console.log(`[Search] Dynamic Scaling: Budget=${tokenBudget}t -> Target=${targetAtomCount} atoms (Anchor: ${anchorLimit}, Walk: ${walkLimit})`);

    // 1. Direct Search (The Anchor) - Using SQL instead of CozoDB datalog
    let anchorQuery = `
        SELECT a.id, a.content, a.source_path as source, a.timestamp,
               a.buckets, a.tags, 'epoch_placeholder' as epochs, a.provenance,
                -- Metadata Relevance Boosting (Crash-Proof)
                (
                  (CASE WHEN array_to_string(a.tags, ' ') ILIKE $2 THEN 20 ELSE 0 END) +
                  (CASE WHEN a.source_path ILIKE $2 THEN 20 ELSE 0 END)
                ) as score,
               a.sequence, a.simhash as molecular_signature
        FROM atoms a
        WHERE to_tsvector('simple', a.content) @@ to_tsquery('simple', $1)
    `;

    // Construct Query String
    // If Fuzzy: Convert "A B C" to "A | B | C"
    // If Strict: "A & B & C" (plainto_tsquery does this implicitly but we want explicit control now)
    let tsQueryString = sanitizedQuery.trim();
    if (fuzzy) {
      tsQueryString = tsQueryString.split(/\s+/).join(' | ');
      console.log(`[Search] Using Fuzzy Query: ${tsQueryString}`);
    } else {
      tsQueryString = tsQueryString.split(/\s+/).join(' & ');
    }

    // Add provenance filter
    let anchorParams: any[] = [
      tsQueryString,
      `%${sanitizedQuery}%` // $2 for ILIKE matching
    ];

    if (provenance !== 'all' && provenance !== 'quarantine') {
      const provParamIdx = anchorParams.length + 1;
      anchorQuery += ` AND a.provenance = $${provParamIdx}`;
      anchorParams.push(provenance);
    } else if (provenance === 'all') {
      // EXCLUDE quarantine from general search
      anchorQuery += ` AND a.provenance != 'quarantine'`;
    } else if (provenance === 'quarantine') {
      anchorQuery += ` AND a.provenance = 'quarantine'`;
    }

    // Add bucket and tag filters
    if (buckets.length > 0) {
      const bucketParamIdx = anchorParams.length + 1;
      anchorQuery += ` AND EXISTS (
        SELECT 1 FROM unnest(a.buckets) as bucket WHERE bucket = ANY($${bucketParamIdx})
      )`;
      anchorParams.push(buckets);
    }
    if (tags.length > 0) {
      const tagParamIdx = anchorParams.length + 1;
      anchorQuery += ` AND EXISTS (
        SELECT 1 FROM unnest(a.tags) as tag WHERE tag = ANY($${tagParamIdx})
      )`;
      anchorParams.push(tags);
    }

    const limitParamIdx = anchorParams.length + 1;

    // Check for chronological sort intent - enhanced to detect year ranges
    const queryLower = sanitizedQuery.toLowerCase();
    const isEarliest = queryLower.includes('earliest') ||
      queryLower.includes('oldest') ||
      queryLower.includes('first');

    // Check for temporal range queries (e.g., "from 2025 to 2026")
    const hasTemporalRange = /\b(from|between)\s+\d{4}\s+(to|and)\s+\d{4}\b/.test(queryLower);

    if (hasTemporalRange) {
      // For temporal range queries, sort by timestamp to show chronological spread
      anchorQuery += ` ORDER BY a.timestamp ASC LIMIT $${limitParamIdx}`;
    } else if (isEarliest) {
      anchorQuery += ` ORDER BY a.timestamp ASC LIMIT $${limitParamIdx}`;
    } else {
      anchorQuery += ` ORDER BY score DESC, a.timestamp DESC LIMIT $${limitParamIdx}`;
    }

    anchorParams.push(anchorLimit);

    const anchorResult = await db.run(anchorQuery, anchorParams);

    if (!anchorResult.rows || anchorResult.rows.length === 0) return [];

    // Map Anchors
    const anchors = anchorResult.rows.map((row: any[]) => {
      // Detect if we have atomic fields (length > 11)
      const isAtomic = row.length > 11;
      return {
        id: row[0],
        content: row[1],
        source: row[2],
        timestamp: row[3],
        buckets: row[4],
        tags: row[5],
        epochs: row[6],
        provenance: row[7],
        score: row[8],
        sequence: row[9],
        molecular_signature: row[10],
        // Atomic
        start_byte: isAtomic ? row[11] : undefined,
        end_byte: isAtomic ? row[12] : undefined,
        type: isAtomic ? row[13] : undefined,
        numeric_value: isAtomic ? row[14] : undefined,
        numeric_unit: isAtomic ? row[15] : undefined,
        compound_id: isAtomic ? row[16] : undefined
      };
    });

    // 2. The Walk (Associative Discovery) - Find related atoms through shared tags
    const anchorIds = anchors.map((a: any) => a.id);

    if (anchorIds.length === 0) return [];

    let walkQuery = `
        SELECT DISTINCT a.id, a.content, a.source_path as source, a.timestamp,
               a.buckets, a.tags, 'epoch_placeholder' as epochs, a.provenance,
               30.0 as score, a.sequence, a.simhash as molecular_signature
        FROM atoms a
        JOIN atoms anchor_a ON EXISTS (
          SELECT 1 FROM unnest(anchor_a.tags) as anchor_tag
          JOIN unnest(a.tags) as shared_tag ON anchor_tag = shared_tag
        )
        WHERE anchor_a.id = ANY($1)  -- Related to anchor atoms
          AND a.id != ALL($1)       -- Exclude anchor atoms themselves
    `;

    // Add provenance filter - we'll add it as a parameter if needed
    let walkParams: any[] = [anchorIds];

    if (provenance !== 'all' && provenance !== 'quarantine') {
      const provParamIdx = walkParams.length + 1;
      walkQuery += ` AND a.provenance = $${provParamIdx}`;
      walkParams.push(provenance);
    } else if (provenance === 'all') {
      walkQuery += ` AND a.provenance != 'quarantine'`;
    } else if (provenance === 'quarantine') {
      walkQuery += ` AND a.provenance = 'quarantine'`;
    }

    // Add tag filters
    if (tags.length > 0) {
      const walkParamCount = walkParams.length + 1;
      walkQuery += ` AND EXISTS (
        SELECT 1 FROM unnest(a.tags) as tag WHERE tag = ANY($${walkParamCount})
      )`;
      walkParams.push(tags);
    }

    // [SECURITY PATCH] Add bucket filters to Walk Phase
    if (buckets.length > 0) {
      const walkBucketParamIdx = walkParams.length + 1;
      walkQuery += ` AND EXISTS (
        SELECT 1 FROM unnest(a.buckets) as bucket WHERE bucket = ANY($${walkBucketParamIdx})
      )`;
      walkParams.push(buckets);
    }

    // Apply temporal range filtering to walk results if needed
    if (hasTemporalRange) {
      const yearMatches = queryLower.match(/\b(202[0-9]|203[0-9])\b/g);
      if (yearMatches && yearMatches.length >= 2) {
        const startYear = Math.min(...yearMatches.map(Number));
        const endYear = Math.max(...yearMatches.map(Number));
        const yearParamIdx = walkParams.length + 1;
        walkQuery += ` AND EXTRACT(YEAR FROM TO_TIMESTAMP(a.timestamp / 1000.0)) BETWEEN $${yearParamIdx} AND $${yearParamIdx + 1}`;
        walkParams.push(startYear, endYear);
      }
    }

    const walkLimitParamIdx = walkParams.length + 1;
    if (hasTemporalRange) {
      // For temporal range queries, sort walk results by timestamp to maintain chronological spread
      walkQuery += ` ORDER BY a.timestamp ASC LIMIT $${walkLimitParamIdx}`;
    } else {
      walkQuery += ` LIMIT $${walkLimitParamIdx}`;
    }
    walkParams.push(walkLimit);

    const walkResult = await db.run(walkQuery, walkParams);

    const neighbors = (walkResult.rows || []).map((row: any[]) => {
      const isAtomic = row.length > 11;
      return {
        id: row[0],
        content: row[1],
        source: row[2],
        timestamp: row[3],
        buckets: row[4],
        tags: row[5],
        epochs: row[6],
        provenance: row[7],
        score: row[8],
        sequence: row[9],
        molecular_signature: row[10],
        start_byte: isAtomic ? row[11] : undefined,
        end_byte: isAtomic ? row[12] : undefined,
        type: isAtomic ? row[13] : undefined,
        numeric_value: isAtomic ? row[14] : undefined,
        numeric_unit: isAtomic ? row[15] : undefined,
        compound_id: isAtomic ? row[16] : undefined
      };
    });

    return [...anchors, ...neighbors];

  } catch (e) {
    console.error('[Search] Tag-Walker failed:', e);
    return [];
  }
}

/**
 * Split a query into sentence-like chunks (molecules)
 */
export function splitQueryIntoMolecules(query: string): string[] {
  // First, clean the query of any extraneous characters or formatting
  let cleanQuery = query.trim();

  // Remove common prefixes/suffixes that might interfere with sentence detection
  cleanQuery = cleanQuery.replace(/^[#\-\*\s]+|[#\-\*\s]+$/g, '').trim();

  // Split by sentence endings first (periods, exclamation marks, question marks)
  let sentences = cleanQuery.split(/(?<=[.!?])\s+/);

  // If no sentence endings found, try to split by commas or other separators
  if (sentences.length <= 1) {
    sentences = cleanQuery.split(/(?<=[,;:])\s+/);
  }

  // If still no good splits, split by word count (about 10-15 words per chunk)
  if (sentences.length <= 1) {
    const words = cleanQuery.split(/\s+/);
    const chunks: string[] = [];
    const chunkSize = 15; // About 15 words per "molecule"

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    return chunks.length > 0 ? chunks : [cleanQuery];
  }

  // Clean up the sentences
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}


// Import Native Module Manager for SimHash utilities
import { nativeModuleManager } from '../../utils/native-module-manager.js';

/**
 * Helper: Calculate Hamming Distance between two hex strings
 * Uses the native module or fallback if available
 */
function getHammingDistance(hashA: string, hashB: string): number {
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
 * Execute search with Intelligent Expansion and Tag-Walker Protocol
 */
export async function executeSearch(
  query: string,
  _bucket?: string,
  buckets?: string[],
  maxChars: number = 524288,
  _deep: boolean = false,
  provenance: 'internal' | 'external' | 'quarantine' | 'all' = 'all',
  explicitTags: string[] = [],
  filters?: { type?: string; minVal?: number; maxVal?: number; }
): Promise<{ context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any }> {
  console.log(`[Search] executeSearch (Semantic Shift Architecture) called with provenance: ${provenance}`);

  // Add additional logging to track the request flow
  const startTime = Date.now();
  console.log(`[Search] Starting search for query: "${query.substring(0, 100)}..." with ${maxChars} char limit`);

  // PRE-PROCESS: Extract semantic categories from query
  const scopeTags: string[] = [...explicitTags];
  const queryParts = query.split(/\s+/);
  const cleanQueryParts: string[] = [];
  const semanticCategories: SemanticCategory[] = [];
  const entityPairs: string[] = []; // For relationship detection
  const KNOWN_BUCKETS = ['notebook', 'inbox', 'codebase', 'journal', 'archive', 'memories', 'external'];

  for (const part of queryParts) {
    if (part.startsWith('#')) {
      const term = part.substring(1).toLowerCase();
      // Check if it's a semantic category
      const semanticCategory = Object.values(SemanticCategory).find(cat =>
        cat.toLowerCase().includes(term) || cat.toLowerCase().replace('#', '').includes(term)
      );

      if (semanticCategory) {
        semanticCategories.push(semanticCategory as SemanticCategory);
      } else if (KNOWN_BUCKETS.includes(term) || term.includes('inbox')) {
        if (!buckets) buckets = [];
        buckets.push(term);
      } else {
        scopeTags.push(term);
      }
    } else {
      cleanQueryParts.push(part);
    }
  }

  // Detect potential entity pairs for relationship search
  if (cleanQueryParts.length >= 2) {
    // Look for relationship indicators in the query
    const relationshipIndicators = ['and', 'with', 'met', 'told', 'said', 'visited', 'called', 'texted', 'about'];
    for (let i = 0; i < cleanQueryParts.length - 1; i++) {
      if (relationshipIndicators.includes(cleanQueryParts[i].toLowerCase())) {
        // Found a potential relationship: [person1] [indicator] [person2]
        if (i > 0 && i < cleanQueryParts.length - 1) {
          entityPairs.push(`${cleanQueryParts[i - 1]}_${cleanQueryParts[i + 1]}`);
          entityPairs.push(`${cleanQueryParts[i + 1]}_${cleanQueryParts[i - 1]}`); // Bidirectional
        }
      }
    }
  }

  const cleanQuery = cleanQueryParts.join(' ');
  const realBuckets = new Set(buckets || []);

  if (realBuckets.size === 0) {
    scopeTags.forEach(tag => {
      const name = tag.replace('#', '');
      realBuckets.add(name);
    });
  }

  console.log(`[Search] Query: "${cleanQuery}"`);
  console.log(`[Search] Filters -> Buckets: [${Array.from(realBuckets).join(', ')}] | Tags: [${scopeTags.join(', ')}] | Semantic Categories: [${semanticCategories.join(', ')}] | Entity Pairs: [${entityPairs.join(', ')}]`);

  const parsedQuery = parseNaturalLanguage(cleanQuery);
  if (parsedQuery !== cleanQuery) {
    console.log(`[Search] NLP Parsed Query: "${cleanQuery}" -> "${parsedQuery}"`);
  }

  // Apply Deterministic Semantic Expansion (Synonym Ring)
  const parsedWords = parsedQuery.split(/\s+/).filter((w: string) => w.length > 2);
  const semanticExpandedTerms = isExpansionReady() ? semanticExpand(parsedWords) : parsedWords;
  const semanticExpandedQuery = semanticExpandedTerms.join(' ');
  if (semanticExpandedQuery !== parsedQuery) {
    console.log(`[Search] Semantic Expansion: "${parsedQuery}" -> "${semanticExpandedQuery}"`);
  }

  const expansionTags = await expandQuery(cleanQuery);
  const expandedQuery = expansionTags.length > 0 ? `${semanticExpandedQuery} ${expansionTags.join(' ')}` : semanticExpandedQuery;
  console.log(`[Search] Optimized Query: ${expandedQuery}`);

  // 1. ENGRAM LOOKUP
  const engramResults = await lookupByEngram(cleanQuery);
  let finalResults: SearchResult[] = [];
  const includedIds = new Set<string>();

  // Active Cleansing: Track existing SimHashes
  const includedHashes: string[] = [];
  // Track frequency of content occurrences
  const hashFrequencyMap = new Map<string, number>();
  const SIMHASH_THRESHOLD = 3; // Standard 074: < 3 bits difference = duplicate


  if (engramResults.length > 0) {
    console.log(`[Search] Found ${engramResults.length} via Engram lookup.`);

    let engramContextQuery = `SELECT id, content, source_path as source, timestamp, buckets, tags, epochs, provenance, simhash FROM atoms WHERE id = ANY($1)`;
    const engramParams: any[] = [engramResults];

    if (provenance !== 'all' && provenance !== 'quarantine') {
      engramContextQuery += ` AND provenance = $2`;
      engramParams.push(provenance);
    } else if (provenance === 'all') {
      engramContextQuery += ` AND provenance != 'quarantine'`;
    } else if (provenance === 'quarantine') {
      engramContextQuery += ` AND provenance = 'quarantine'`;
    }

    const engramContentResult = await db.run(engramContextQuery, engramParams);
    if (engramContentResult.rows) {
      const realBucketsArray = Array.from(realBuckets);
      engramContentResult.rows.forEach((row: any[]) => {
        if (!includedIds.has(row[0])) {
          const rowTags = row[5] as string[];
          const rowBuckets = row[4] as string[];

          // Tags are intersectional (AND): Must have ALL specified tags
          const matchesTags = scopeTags.every(t => rowTags.includes(t));
          // Buckets are categorical (OR): Must be in AT LEAST ONE of the specified buckets
          const matchesBuckets = realBucketsArray.some(b => rowBuckets.includes(b));

          // NEW: Check semantic category match
          const matchesSemanticCategory = semanticCategories.length === 0 ||
            semanticCategories.some(cat => rowTags.includes(cat.replace('#', '')));

          // NEW: Check for entity pair relationships in content
          const hasEntityPair = entityPairs.length > 0 &&
            entityPairs.some(pair => {
              const [entity1, entity2] = pair.split('_');
              const contentLower = (row[1] as string).toLowerCase();
              return contentLower.includes(entity1.toLowerCase()) && contentLower.includes(entity2.toLowerCase());
            });

          if ((scopeTags.length === 0 || matchesTags) &&
            (realBucketsArray.length === 0 || matchesBuckets) &&
            (semanticCategories.length === 0 || matchesSemanticCategory)) {

            // Boost score for entity pair matches
            let score = hasEntityPair ? 250 : 200; // Higher score for relationship matches

            // Active Cleansing
            const simhash = row[8] || "0";
            let isDuplicate = false;
            let existingItem: SearchResult | undefined;

            if (simhash !== "0") {
              for (const existingHash of includedHashes) {
                if (getHammingDistance(simhash, existingHash) < SIMHASH_THRESHOLD) {
                  isDuplicate = true;

                  // --- MERGE TAGS (Directive 3) ---
                  // Find the existing item and merge tags/buckets
                  existingItem = finalResults.find(r => r.molecular_signature === existingHash);
                  if (existingItem) {
                    const mergedTags = new Set([...existingItem.tags, ...rowTags]);
                    const mergedBuckets = new Set([...getItems(existingItem.buckets), ...rowBuckets]);
                    existingItem.tags = Array.from(mergedTags);
                    existingItem.buckets = Array.from(mergedBuckets);
                    // Update frequency count
                    const currentFreq = hashFrequencyMap.get(existingHash) || 1;
                    hashFrequencyMap.set(existingHash, currentFreq + 1);
                    existingItem.frequency = currentFreq + 1;
                    // console.log(`[Search] Merged tags for duplicate atom: ${row[0]} -> ${existingItem.id}`);
                  }
                  break;
                }
              }
            }

            if (!isDuplicate) {
              const newItem: SearchResult = {
                id: row[0],
                content: row[1],
                source: row[2],
                timestamp: row[3],
                buckets: row[4],
                tags: row[5],
                epochs: row[6],
                provenance: row[7],
                score: score,
                molecular_signature: simhash,
                frequency: 1, // Initialize frequency to 1 for new items
                // Add semantic information
                semanticCategories: semanticCategories,
                relatedEntities: hasEntityPair ? entityPairs : undefined
              };

              // Initialize frequency to 1 for new items
              if (simhash !== "0") {
                hashFrequencyMap.set(simhash, 1);
              }

              finalResults.push(newItem);
              includedIds.add(row[0]);
              if (simhash !== "0") includedHashes.push(simhash);
            } else if (existingItem) {
              // Update the existing item's frequency if we found a duplicate during merge
              const currentFreq = hashFrequencyMap.get(simhash) || 1;
              existingItem.frequency = currentFreq;
            }
          }
        }
      });
    }
  }

  // 2. TAG-WALKER SEARCH (Hybrid FTS + Graph)
  // Use parsedQuery (NLP-processed) for better FTS recall - removes stopwords and extracts meaningful terms
  let walkerResults = await tagWalkerSearch(parsedQuery, Array.from(realBuckets), scopeTags, maxChars, provenance, filters);

  // --- FUZZY FALLBACK (Standard 093) ---
  // If strict AND-search returns 0 results, retry with OR-logic
  // CRITICAL: Use parsedQuery (not cleanQuery) to prevent stopwords from polluting fuzzy OR search
  if ((engramResults.length === 0 && walkerResults.length === 0) || (walkerResults.length === 0 && finalResults.length === 0)) {
    console.log(`[Search] Strict search returned 0 results. Triggering Fuzzy Fallback for: "${parsedQuery}" (parsed from: "${cleanQuery}")`);
    walkerResults = await tagWalkerSearch(parsedQuery, Array.from(realBuckets), scopeTags, maxChars, provenance, filters, true); // Fuzzy = true
  }

  // Type-Based Scoring Multipliers (POML V4)
  const TYPE_SCORE_MULT: Record<string, number> = {
    'prose': 1.0,
    'code': 0.8,
    'data': 0.6,
    'log': 0.4  // Downweight logs heavily
  };

  // Merge and Apply Provenance Boosting + Type-Based Scoring with Active Cleansing
  walkerResults.forEach(r => {
    let score = r.score;

    // Provenance Boosting
    if (provenance === 'internal') {
      if (r.provenance === 'internal') score *= 3.0;
      else score *= 0.5;
    } else if (provenance === 'external') {
      if (r.provenance !== 'internal') score *= 1.5;
    } else {
      if (r.provenance === 'internal') score *= 2.0;
    }

    // Type-Based Scoring (POML V4)
    const typeMultiplier = TYPE_SCORE_MULT[r.type || 'prose'] || 1.0;
    score *= typeMultiplier;

    // NEW: Boost scores for semantic category matches
    if (semanticCategories.length > 0) {
      const hasSemanticMatch = semanticCategories.some(cat =>
        r.tags.includes(cat.replace('#', ''))
      );
      if (hasSemanticMatch) {
        score *= 1.5; // Boost for semantic category matches
      }
    }

    // NEW: Boost scores for entity pair relationships
    if (entityPairs.length > 0) {
      const hasEntityPairMatch = entityPairs.some(pair => {
        const [entity1, entity2] = pair.split('_');
        const contentLower = (r.content || '').toLowerCase();
        return contentLower.includes(entity1.toLowerCase()) && contentLower.includes(entity2.toLowerCase());
      });
      if (hasEntityPairMatch) {
        score *= 2.0; // Significant boost for relationship matches
      }
    }

    if (!includedIds.has(r.id)) {
      // Active Cleansing Check
      let isDuplicate = false;
      const simhash = r.molecular_signature || "0";
      let existingItem: SearchResult | undefined;

      if (simhash !== "0") {
        for (const existingHash of includedHashes) {
          if (getHammingDistance(simhash, existingHash) < SIMHASH_THRESHOLD) {
            isDuplicate = true;

            // --- MERGE TAGS (Directive 3) ---
            existingItem = finalResults.find(r => r.molecular_signature === existingHash);
            if (existingItem) {
              const mergedTags = new Set([...existingItem.tags, ...(r.tags || [])]);
              const mergedBuckets = new Set([...getItems(existingItem.buckets), ...getItems(r.buckets)]);
              existingItem.tags = Array.from(mergedTags);
              existingItem.buckets = Array.from(mergedBuckets);
              // Update frequency count
              const currentFreq = hashFrequencyMap.get(existingHash) || 1;
              hashFrequencyMap.set(existingHash, currentFreq + 1);
              existingItem.frequency = currentFreq + 1;
            }
            break;
          }
        }
      }

      if (!isDuplicate) {
        const newItem: SearchResult = {
          ...r,
          score,
          frequency: 1, // Initialize frequency to 1 for new items
          // Add semantic information
          semanticCategories: semanticCategories,
          relatedEntities: entityPairs.length > 0 ? entityPairs : undefined
        };

        // Initialize frequency to 1 for new items
        if (simhash !== "0") {
          hashFrequencyMap.set(simhash, 1);
        }

        finalResults.push(newItem);
        includedIds.add(r.id);
        if (simhash !== "0") includedHashes.push(simhash);
      } else if (existingItem) {
        // Update the existing item's frequency if we found a duplicate during merge
        const currentFreq = hashFrequencyMap.get(simhash) || 1;
        existingItem.frequency = currentFreq;
      }
    }
  });

  console.log(`[Search] Total Results (After Deduplication): ${finalResults.length}`);

  // Final Sort by Score
  finalResults.sort((a, b) => b.score - a.score);

  // 3. CONTEXT INFLATION (Standard 085)
  // Inflate separate molecules into coherent windows
  // ContextInflator.inflate() already handles budget-filling with additional related content
  const inflatedResults = await ContextInflator.inflate(finalResults, maxChars);

  console.log(`[Search] Inflated ${finalResults.length} atoms into ${inflatedResults.length} context windows.`);

  const result = await formatResults(inflatedResults, maxChars);
  console.log(`[Search] Search completed in ${Date.now() - startTime}ms`);
  return result;
}

/**
 * Execute molecule-based search - splits query into sentence-like chunks and searches each separately
 */
export async function executeMoleculeSearch(
  query: string,
  bucket?: string,
  buckets?: string[],
  maxChars: number = 2400, // 2400 tokens as specified
  deep: boolean = false,
  provenance: 'internal' | 'external' | 'quarantine' | 'all' = 'all',
  explicitTags: string[] = []
): Promise<{ context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any }> {

  // Split the query into molecules (sentence-like chunks)
  const molecules = splitQueryIntoMolecules(query);
  console.log(`[MoleculeSearch] Split query into ${molecules.length} molecules:`, molecules);

  // Search each molecule separately
  const allResults: SearchResult[] = [];
  const includedIds = new Set<string>();

  for (const [index, molecule] of molecules.entries()) {
    console.log(`[MoleculeSearch] Searching molecule ${index + 1}/${molecules.length}: "${molecule}"`);

    try {
      // Execute search for this specific molecule
      const result = await executeSearch(
        molecule,
        bucket,
        buckets,
        maxChars,
        deep,
        provenance,
        explicitTags
      );

      // Add unique results to our collection
      for (const item of result.results) {
        if (!includedIds.has(item.id)) {
          allResults.push(item);
          includedIds.add(item.id);
        }
      }
    } catch (error) {
      console.error(`[MoleculeSearch] Error searching molecule:`, molecule, error);
      // Continue with other molecules even if one fails
    }
  }

  // Sort results by score
  allResults.sort((a, b) => b.score - a.score);

  console.log(`[MoleculeSearch] Combined results from ${molecules.length} molecules: ${allResults.length} total results`);

  return await formatResults(allResults, maxChars); // Use original maxChars to maintain token budget
}

/**
 * Traditional FTS fallback
 */
export async function runTraditionalSearch(query: string, buckets: string[]): Promise<SearchResult[]> {
  const sanitizedQuery = sanitizeFtsQuery(query);
  if (!sanitizedQuery) return [];

  let querySql = `
    SELECT a.id,
           ts_rank(to_tsvector('simple', a.content), plainto_tsquery('simple', $1)) as score,
           a.content, a.source_path as source, a.timestamp,
           a.buckets, a.tags, 'epoch_placeholder' as epochs, a.provenance
    FROM atoms a
    WHERE to_tsvector('simple', a.content) @@ plainto_tsquery('simple', $1)
  `;

  if (buckets.length > 0) {
    querySql += ` AND EXISTS (
      SELECT 1 FROM unnest(a.buckets) as bucket WHERE bucket = ANY($2)
    )`;
  }

  querySql += ` ORDER BY score DESC`;

  try {
    const result = await db.run(querySql, buckets.length > 0 ? [sanitizedQuery, buckets] : [sanitizedQuery]);
    if (!result.rows) return [];

    return result.rows.map((row: any[]) => ({
      id: row[0],
      score: row[1],
      content: row[2],
      source: row[3],
      timestamp: row[4],
      buckets: row[5],
      tags: row[6],
      epochs: row[7],
      provenance: row[8]
    }));
  } catch (e) {
    console.error('[Search] FTS failed', e);
    return [];
  }
}

function getItems(input: string[] | undefined): string[] {
  return Array.isArray(input) ? input : [];
}

/**
 * Format search results within character budget
 * Uses molecular coordinates (start_byte/end_byte) for precise content slicing
 */
async function formatResults(results: SearchResult[], maxChars: number): Promise<{ context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any }> {
  try {
    // Extract molecular slices when coordinates are available
    const candidates = await Promise.all(results.map(async r => {
      let content = r.content || '';

      // Include frequency information in the content if available
      if (r.frequency && r.frequency > 1) {
        content = `[Found ${r.frequency} times] ${content}`;
      }

      // Use molecular coordinates for precise slicing if available, but skip if already inflated
      if (!r.is_inflated && r.compound_id && r.start_byte !== undefined && r.end_byte !== undefined && r.start_byte >= 0 && r.end_byte > r.start_byte) {
        try {
          // Fetch the full compound document to extract the precise slice
          const compoundQuery = `SELECT compound_body FROM compounds WHERE id = $1`;
          const compoundResult = await db.run(compoundQuery, [r.compound_id]);

          if (compoundResult.rows && compoundResult.rows.length > 0) {
            const fullBody = compoundResult.rows[0][0] as string;
            const contentBuffer = Buffer.from(fullBody, 'utf8');
            const sliceBuffer = contentBuffer.subarray(r.start_byte!, r.end_byte!);
            content = `...${sliceBuffer.toString('utf8')}...`;
          }
        } catch (e) {
          // Fallback to content field if coordinate extraction fails
          console.warn(`[Search] Coordinate extraction failed for ${r.id}:`, e);
        }
      }

      return {
        id: r.id,
        content,
        source: r.source,
        timestamp: r.timestamp,
        score: r.score,
        type: r.type  // Pass type for potential downstream use
      };
    }));

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

/**
 * Iterative Search with Back-off Strategy
 * Attempts to retrieve results by progressively simplifying the query.
 */
export async function iterativeSearch(
  query: string,
  buckets: string[] = [],
  maxChars: number = 20000,
  tags: string[] = []
): Promise<{ context: string; results: SearchResult[]; attempt: number; metadata?: any }> {

  // 0. Extract Scope Tags (Hashtags) to preserve them across strategies
  // We want to make sure if user typed "#work", it stays even if we strip adjectives.
  const scopeTags: string[] = [...tags];
  const queryParts = query.split(/\s+/);
  queryParts.forEach(part => {
    if (part.startsWith('#')) scopeTags.push(part);
  });
  const tagsString = scopeTags.join(' ');

  // Strategy 1: Standard Expanded Search (All Nouns, Verbs, Dates + Expansion)
  console.log(`[IterativeSearch] Strategy 1: Standard Execution`);
  let results = await executeSearch(query, undefined, buckets, maxChars, false, 'all', tags);
  if (results.results.length > 0) return { ...results, attempt: 1 };

  // Strategy 2: Strict "Subjects & Time" (Strip Verbs/Adjectives, keep Nouns + Dates)
  console.log(`[IterativeSearch] Strategy 2: Strict Nouns/Dates`);
  const temporalContext = extractTemporalContext(query);
  const doc = nlp.readDoc(query);
  const nouns = doc.tokens().filter((t: any) => {
    const tag = t.out(nlp.its.pos);
    return tag === 'NOUN' || tag === 'PROPN';
  }).out((nlp as any).its.text);

  const uniqueTokens = new Set([...nouns, ...temporalContext]);
  if (uniqueTokens.size > 0) {
    // Re-inject scope tags
    const strictQuery = Array.from(uniqueTokens).join(' ') + ' ' + tagsString;
    console.log(`[IterativeSearch] Fallback Query 1: "${strictQuery.trim()}"`);
    results = await executeSearch(strictQuery, undefined, buckets, maxChars, false, 'all', tags);
    if (results.results.length > 0) return { ...results, attempt: 2 };
  }

  // Strategy 3: "Just the Dates" (If query heavily implies time)
  // Sometimes "2025" is the only anchor we have if keywords fail.
  // Or maybe just "Proper Nouns" (Entities).
  const propNouns = doc.tokens().filter((t: any) => t.out(nlp.its.pos) === 'PROPN').out((nlp as any).its.text);

  // Re-inject scope tags
  const entityQuery = [...new Set([...propNouns, ...temporalContext])].join(' ') + ' ' + tagsString;

  if (entityQuery.trim().length > 0 && entityQuery.trim() !== (Array.from(uniqueTokens).join(' ') + ' ' + tagsString).trim()) {
    console.log(`[IterativeSearch] Fallback Query 2: "${entityQuery.trim()}"`);
    results = await executeSearch(entityQuery, undefined, buckets, maxChars, false, 'all', tags);
    if (results.results.length > 0) return { ...results, attempt: 3 };
  }

  return { ...results, attempt: 4 }; // Return empty result if all fail
}

/**
 * Conversational Query Expansion (Standard 086)
 * Expands natural language queries into semantic equivalents
 */
function expandConversationalQuery(query: string): string[] {
  const expansions: string[] = [];

  // Common conversational patterns
  const patterns = [
    { pattern: /what is the (latest|current|recent) (.+)/i, replacement: "$2" },
    { pattern: /tell me about (.+)/i, replacement: "$1" },
    { pattern: /how is (.+) doing/i, replacement: "$1" },
    { pattern: /what's happening with (.+)/i, replacement: "$1" },
    { pattern: /what do you know about (.+)/i, replacement: "$1" },
    { pattern: /explain (.+)/i, replacement: "$1" },
    { pattern: /describe (.+)/i, replacement: "$1" },
    { pattern: /summarize (.+)/i, replacement: "$1" }
  ];

  for (const p of patterns) {
    const match = query.match(p.pattern);
    if (match) {
      const expanded = query.replace(p.pattern, p.replacement).trim();
      if (expanded && !expansions.includes(expanded)) {
        expansions.push(expanded);
      }
    }
  }

  return expansions;
}

/**
 * Smart Chat Search (The "Markovian" Context Gatherer)
 * Logic:
 * 1. Try standard Iterative Search.
 * 2. If Recall is Low (< 10 atoms), TRIGGER SPLIT.
 * 3. Split Query into Top Entities (Alice, Bob, etc.).
 * 4. Run Parallel Searches for each entity.
 * 5. Aggregate & Deduplicate.
 */
export async function smartChatSearch(
  query: string,
  buckets: string[] = [],
  maxChars: number = 20000,
  tags: string[] = []
): Promise<{ context: string; results: SearchResult[]; strategy: string; splitQueries?: string[]; metadata?: any }> {
  // 1. Initial Attempt
  const initial = await iterativeSearch(query, buckets, maxChars, tags);

  // If we have enough results, returns immediately
  if (initial.results.length >= 10) {
    return { ...initial, strategy: 'standard' };
  }

  console.log(`[SmartSearch] Low Recall (${initial.results.length} results). Triggering Multi-Query Split...`);

  // 2. Extract Entities for Split Search
  const doc = nlp.readDoc(query);
  // Get Proper Nouns (Entities) and regular Nouns
  // We prioritize PROPN (High Value)
  const entities = doc.tokens()
    .filter((t: any) => t.out(nlp.its.pos) === 'PROPN')
    .out(nlp.its.normal, nlp.as.freqTable)
    .map((e: any) => e[0])
    .slice(0, 3); // Top 3 Entities

  // If no entities, try Nouns
  if (entities.length === 0) {
    const nouns = doc.tokens()
      .filter((t: any) => t.out(nlp.its.pos) === 'NOUN')
      .out(nlp.its.normal, nlp.as.freqTable)
      .map((e: any) => e[0])
      .slice(0, 3);
    entities.push(...nouns);
  }

  if (entities.length === 0) {
    // No entities to split on, return what we have
    return { ...initial, strategy: 'shallow', splitQueries: [] };
  }

  console.log(`[SmartSearch] Split Entities: ${JSON.stringify(entities)}`);

  // 3. Parallel Execution
  // We run executeSearch for each entity independently
  const parallelPromises = entities.map((entity: string) =>
    executeSearch(entity, undefined, buckets, maxChars / entities.length, false, 'all', tags) // Split budget? Or full budget?
    // Let's iterate search? No, simple executeSearch is simpler.
    // Use full budget per search, we will truncate at merge time.
  );

  const parallelResults = await Promise.all(parallelPromises);

  // 4. Merge & Deduplicate
  const mergedMap = new Map<string, SearchResult>();

  // Add initial results first
  initial.results.forEach(r => mergedMap.set(r.id, r));

  // Add split results
  parallelResults.forEach((res) => {
    res.results.forEach(r => {
      if (!mergedMap.has(r.id)) {
        // Boost score slightly for multi-path discovery?
        // Or keep as is.
        mergedMap.set(r.id, r);
      }
    });
  });

  const mergedResults = Array.from(mergedMap.values());
  console.log(`[SmartSearch] Merged Total: ${mergedResults.length} atoms.`);

  // 5. Re-Format
  const formatted = await formatResults(mergedResults, maxChars * 1.5);
  return { ...formatted, strategy: 'split_merge', splitQueries: entities };
}

/**
 * Bright Node Protocol - Selective Graph Illumination
 *
 * Implements the "Bright Node" inference protocol where only relevant
 * graph nodes are illuminated for reasoning, similar to how a flashlight
 * illuminates only the relevant parts of a dark room.
 *
 * This supports the "Logic-Data Decoupling" concept by providing
 * structured graph data to lightweight reasoning models.
 */
export interface BrightNode {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  buckets: string[];
  tags: string[];
  epochs: string;
  provenance: string;
  score: number;
  sequence?: number;
  molecular_signature?: string;
  relationships: BrightNodeRelationship[];
}

export interface BrightNodeRelationship {
  targetId: string;
  relationshipType: string;
  strength: number;
}

export async function getBrightNodes(
  query: string,
  buckets: string[] = [],
  maxNodes: number = 50
): Promise<BrightNode[]> {
  console.log(`[BrightNode] Illuminating graph for query: "${query}"`);

  // First, get relevant search results using the enhanced Tag-Walker
  const searchResults = await tagWalkerSearch(query, buckets, [], maxNodes * 1000, 'all');

  if (searchResults.length === 0) {
    console.log('[BrightNode] No results found for query.');
    return [];
  }

  // Take top results based on score
  const topResults = searchResults
    .sort((a, b) => b.score - a.score)
    .slice(0, maxNodes);

  // Create bright nodes with relationship information
  const brightNodes: BrightNode[] = topResults.map(result => ({
    id: result.id,
    content: result.content,
    source: result.source,
    timestamp: result.timestamp,
    buckets: result.buckets,
    tags: result.tags,
    epochs: result.epochs,
    provenance: result.provenance,
    score: result.score,
    sequence: result.sequence, // Pass through sequence
    molecular_signature: result.molecular_signature,   // V4 Nomenclature
    relationships: [] // Will be populated based on shared tags/buckets
  }));

  // Identify relationships between nodes based on shared attributes
  for (let i = 0; i < brightNodes.length; i++) {
    const currentNode = brightNodes[i];
    const relationships: BrightNodeRelationship[] = [];

    for (let j = 0; j < brightNodes.length; j++) {
      if (i === j) continue;

      const otherNode = brightNodes[j];
      let relationshipStrength = 0;
      let relationshipType = 'related';

      // 1. Semantic Overlap (Tags & Buckets)
      const sharedBuckets = currentNode.buckets.filter((b: string) => otherNode.buckets.includes(b));
      const sharedTags = currentNode.tags.filter((t: string) => otherNode.tags.includes(t));
      relationshipStrength += sharedBuckets.length * 2 + sharedTags.length;

      // 2. Source Continuity (Same Document)
      if (currentNode.source === otherNode.source) {
        relationshipStrength += 5; // Strong boost for same file
        relationshipType = 'same_source';

        // 3. Sequential Adjacency (The "Markov Link")
        if (currentNode.sequence !== undefined && otherNode.sequence !== undefined) {
          const dist = Math.abs(currentNode.sequence - otherNode.sequence);
          if (dist === 1) {
            relationshipStrength += 10; // Massive boost for direct neighbors
            relationshipType = 'next_chunk';
          } else if (dist < 5) {
            relationshipStrength += 3; // Boost for nearby chunks
          }
        }
      }

      if (relationshipStrength > 0) {
        relationships.push({
          targetId: otherNode.id,
          relationshipType,
          strength: relationshipStrength
        });
      }
    }

    // Sort relationships by strength and keep top 5
    currentNode.relationships = relationships
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5);
  }

  console.log(`[BrightNode] Illuminated ${brightNodes.length} nodes with relationships`);

  return brightNodes;
}

/**
 * Get Structured Graph for Reasoning Models
 *
 * Formats the bright nodes into a structure suitable for reasoning models
 * as described in the "Logic-Data Decoupling" section of the white paper.
 */
export async function getStructuredGraph(
  query: string,
  buckets: string[] = []
): Promise<any> {
  const brightNodes = await getBrightNodes(query, buckets);

  // Format as a graph structure suitable for reasoning models
  return {
    nodes: brightNodes.map(node => ({
      id: node.id,
      content: node.content.substring(0, 500), // Truncate for efficiency
      tags: node.tags,
      buckets: node.buckets,
      provenance: node.provenance,
      score: node.score
    })),
    edges: brightNodes.flatMap(node =>
      node.relationships.map(rel => ({
        source: node.id,
        target: rel.targetId,
        type: rel.relationshipType,
        strength: rel.strength
      }))
    ),
    query: query,
    timestamp: Date.now()
  };
}