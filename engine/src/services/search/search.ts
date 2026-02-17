/**
 * Search Orchestrator — "The Brain"
 *
 * Core search orchestration, Tag-Walker physics engine, engram lookup,
 * and result merging. All NLP parsing lives in query-parser.ts ("The Ears"),
 * utilities in search-utils.ts ("The Tools"), and graph reasoning in
 * bright-nodes.ts ("The Illuminator").
 *
 * Standard 086 Compliant.
 */

import { db } from '../../core/db.js';
import { createHash } from 'crypto';
import { config } from '../../config/index.js';
import { SemanticCategory } from '../../types/taxonomy.js';
import { ContextInflator } from './context-inflator.js';
import { Timer } from '../../utils/timer.js';

// --- Imports from extracted modules ---
import {
  nlp, isExpansionReady, semanticExpand,
  getGlobalTags, expandQuery, sanitizeFtsQuery,
  parseNaturalLanguage, extractKeyTermsFromConversation,
  extractTemporalContext, splitQueryIntoMolecules, parseQuery,
  expandConversationalQuery, getRelatedTagsForQuery
} from './query-parser.js';

import {
  SearchResult,
  getHammingDistance, getItems, formatResults, filterDisplayTags
} from './search-utils.js';

// Re-export everything that external consumers need
export { getGlobalTags, filterDisplayTags, parseQuery, splitQueryIntoMolecules };
export type { SearchResult };
export type { BrightNode, BrightNodeRelationship } from './bright-nodes.js';
export { getBrightNodes, getStructuredGraph } from './bright-nodes.js';

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
    return JSON.parse(result.rows[0].value as string);
  }

  return [];
}

import { PhysicsTagWalker } from './physics-tag-walker.js';
import { assembleAndSerialize, assembleContextPackage } from './graph-context-serializer.js';
import { UserContext } from '../../types/context.js';

/**
 * Find Anchors (Direct Hits) - Formerly part of tagWalkerSearch
 * Executes Strategy A (Atom positions) and Strategy B (Molecules FTS)
 */
export async function findAnchors(
  query: string,
  buckets: string[] = [],
  tags: string[] = [],
  _maxChars: number = config.SEARCH.max_chars_default,
  provenance: 'internal' | 'external' | 'quarantine' | 'all' = 'all',
  filters?: { type?: string; minVal?: number; maxVal?: number; },
  fuzzy: boolean = false
): Promise<SearchResult[]> {
  try {
    const sanitizedQuery = sanitizeFtsQuery(query);
    if (!sanitizedQuery) return [];

    // 0. Dynamic Atom Scaling
    const tokenBudget = Math.floor(_maxChars / 4);
    const avgTokensPerAtom = 60; // Tuned for better density
    const targetAtomCount = Math.max(10, Math.ceil(tokenBudget / avgTokensPerAtom));

    console.log(`[Search] Dynamic Scaling: Budget=${tokenBudget}t -> Target=${targetAtomCount} atoms`);

    // Construct Query String for FTS
    let tsQueryString = sanitizedQuery.trim();
    if (fuzzy) {
      tsQueryString = tsQueryString.split(/\s+/).join(' | ');
    } else {
      tsQueryString = tsQueryString.split(/\s+/).join(' & ');
    }

    let anchors: SearchResult[] = [];

    // A. Atom Search (Radial Inflation)
    const terms = sanitizedQuery.split(/\s+/).filter(t => t.length > 2);
    const atomResults: SearchResult[] = [];

    if (terms.length > 0) {
      const inflations = await Promise.all(
        terms.map(term => ContextInflator.inflateFromAtomPositions(term, 150, 20, undefined, { buckets, provenance }))
      );
      let rawAtoms = inflations.flat();
      atomResults.push(...rawAtoms);
    }

    // B. Molecule Search (Full-Text)
    let moleculeQuery = `
        SELECT m.id, m.content, c.path as source, m.timestamp,
               '{}'::text[] as buckets, '{}'::text[] as tags, 'epoch_placeholder' as epochs, c.provenance,
               ts_rank(to_tsvector('simple', m.content), to_tsquery('simple', $1)) * 10 as score,
               m.sequence, m.molecular_signature,
               m.start_byte, m.end_byte, m.type, m.numeric_value, m.numeric_unit, m.compound_id
        FROM molecules m
        JOIN compounds c ON m.compound_id = c.id
        WHERE to_tsvector('simple', m.content) @@ to_tsquery('simple', $1)
    `;

    const moleculeParams: any[] = [tsQueryString];

    if (buckets.length > 0) {
      // Use EXISTS subquery to check if any atom for this file has the bucket
      // Since compounds don't store buckets directly, we look up via source_path
      moleculeQuery += ` AND EXISTS (
        SELECT 1 FROM atoms a 
        WHERE a.source_path = c.path 
        AND a.buckets && $${moleculeParams.length + 1}
      )`;
      moleculeParams.push(buckets);
    }

    if (provenance !== 'all' && provenance !== 'quarantine') {
      moleculeQuery += ` AND c.provenance = $${moleculeParams.length + 1}`;
      moleculeParams.push(provenance);
    } else if (provenance === 'all') {
      moleculeQuery += ` AND c.provenance != 'quarantine'`;
    }

    moleculeQuery += ` ORDER BY score DESC LIMIT 50`;

    try {
      const molResult = await db.run(moleculeQuery, moleculeParams);
      const molecules = (molResult.rows || []).map((row: any) => ({
        id: row.id,
        content: row.content,
        source: row.source,
        timestamp: row.timestamp,
        buckets: row.buckets,
        tags: row.tags,
        epochs: row.epochs,
        provenance: row.provenance,
        score: row.score,
        sequence: row.sequence,
        molecular_signature: row.molecular_signature,
        start_byte: row.start_byte,
        end_byte: row.end_byte,
        type: row.type,
        numeric_value: row.numeric_value,
        numeric_unit: row.numeric_unit,
        compound_id: row.compound_id
      }));

      anchors = [...atomResults, ...molecules];

      // Deduplicate anchors using Range Merging
      // Group by compound_id to find overlaps
      const anchorsByCompound = new Map<string, SearchResult[]>();

      [...atomResults, ...molecules].forEach(a => {
        if (!a.compound_id) return;
        if (!anchorsByCompound.has(a.compound_id)) {
          anchorsByCompound.set(a.compound_id, []);
        }
        anchorsByCompound.get(a.compound_id)!.push(a);
      });

      anchors = [];

      for (const [cId, compoundAnchors] of anchorsByCompound) {
        // Sort by start byte
        compoundAnchors.sort((a, b) => (a.start_byte || 0) - (b.start_byte || 0));

        const merged: SearchResult[] = [];
        if (compoundAnchors.length === 0) continue;

        let current = compoundAnchors[0];

        for (let i = 1; i < compoundAnchors.length; i++) {
          const next = compoundAnchors[i];
          const currentEnd = (current.end_byte || 0);
          const nextStart = (next.start_byte || 0);
          const nextEnd = (next.end_byte || 0);

          // LOGGING FOR DEBUGGING
          // console.log(`[Dedup] Checking ${cId}: [${current.start_byte}-${currentEnd}] vs [${nextStart}-${nextEnd}]`);

          // Check for overlap or adjacency (within 50 bytes)
          if (nextStart <= currentEnd + 50) {
            // If identical start/end, it's a true duplicate (just skip next)
            if (Math.abs(nextStart - (current.start_byte || 0)) < 5 && Math.abs(nextEnd - currentEnd) < 5) {
              // console.log(`[Dedup] Exact/Near match found. Skipping.`);
              continue;
            }

            // If next is contained in current, skip next
            if (nextEnd <= currentEnd) {
              // console.log(`[Dedup] Next contained in Current. Skipping.`);
              continue;
            }

            // If current is contained in next, switch to next
            if ((next.start_byte || 0) <= (current.start_byte || 0) && nextEnd >= currentEnd) {
              // console.log(`[Dedup] Current contained in Next. Swapping.`);
              current = next;
              continue;
            }

            // Strict Dedup: If they overlap by more than 50% (lowered from 80%), suppress the lower scored one.
            const overlap = Math.min(currentEnd, nextEnd) - Math.max((current.start_byte || 0), nextStart);
            const len1 = currentEnd - (current.start_byte || 0);
            const len2 = nextEnd - nextStart;

            if (overlap > 0 && (overlap / len1 > 0.5 || overlap / len2 > 0.5)) {
              // console.log(`[Dedup] Heavy overlap (>50%). Picking better score.`);
              // Keep the one with higher score, or if equal, the current (first)
              if ((next.score || 0) > (current.score || 0)) {
                current = next;
              }
              continue; // Skip the 'loser'
            }

            merged.push(current);
            current = next;

          } else {
            merged.push(current);
            current = next;
          }
        }
        merged.push(current);
        anchors.push(...merged);
      }

      // Final Safety Net: Global Content Similarity Deduplication (O(N^2))
      // Addresses:
      // 1. Cross-Compound Duplicates (different IDs/provenance, same text)
      // 2. Near-Exact Duplicates (whitespace diffs, timestamp diffs)
      // 3. Containment (one result is a subset of another)

      const distinctAnchors: SearchResult[] = [];
      // Sort by length desc first (preserve largest context), then score? 
      // Actually score is more important. Let's keep input order (assumed sorted by score/relevance)
      // anchored by 'anchors' which is mixed. Let's sort anchors by score desc to prioritize best matches.
      anchors.sort((a, b) => (b.score || 0) - (a.score || 0));

      // Helper for normalization: lowercase + remove non-alphanumeric chars
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Track kept ranges per compound to detect sliding window duplicates
      const keptRanges = new Map<string, { start: number, end: number, content: string }[]>();

      for (const candidate of anchors) {
        if (!candidate.content || candidate.content.length < 20) {
          distinctAnchors.push(candidate);
          continue;
        }

        // A. Geometric Deduplication (if compound_id is available)
        let isGeometricDuplicate = false;
        if (candidate.compound_id && candidate.start_byte !== undefined && candidate.end_byte !== undefined) {
          const ranges = keptRanges.get(candidate.compound_id) || [];
          for (const range of ranges) {
            // Check overlap
            const overlapStart = Math.max(candidate.start_byte, range.start);
            const overlapEnd = Math.min(candidate.end_byte, range.end);
            const overlapLen = Math.max(0, overlapEnd - overlapStart);

            const candidateLen = candidate.end_byte - candidate.start_byte;

            // If candidate is fully contained or heavily overlaps (> 75%)
            // OR if the overlap is absolute (same start/end)
            if (overlapLen > 0 && (overlapLen >= candidateLen * 0.75 || (overlapStart === candidate.start_byte && overlapEnd === candidate.end_byte))) {
              // console.log(`[Dedup] Geometric Match: dropping item ${candidate.id} (overlaps with ${candidate.compound_id} range)`);
              isGeometricDuplicate = true;
              break;
            }
          }

          if (isGeometricDuplicate) continue;
        }

        // B. Content Deduplication (Fallback)
        const candidateNorm = normalize(candidate.content);
        // Take a robust fingerprint (first 100 normalized chars)
        const candidateFingerprint = candidateNorm.substring(0, 100);

        let isContentDuplicate = false;

        for (const kept of distinctAnchors) {
          const keptNorm = normalize(kept.content);

          // 1. Exact Containment (Candidate is subset of Kept, or vice-versa)
          if (keptNorm.includes(candidateNorm)) {
            isContentDuplicate = true;
            break;
          }
          if (candidateNorm.includes(keptNorm)) {
            isContentDuplicate = true;
            break;
          }

          // 2. Fuzzy Prefix Match
          const keptFingerprint = keptNorm.substring(0, 100);
          const checkLen = Math.min(candidateFingerprint.length, keptFingerprint.length);
          if (checkLen > 30 && candidateFingerprint.substring(0, checkLen) === keptFingerprint.substring(0, checkLen)) {
            isContentDuplicate = true;
            break;
          }
        }

        if (!isContentDuplicate) {
          distinctAnchors.push(candidate);

          // Register range
          if (candidate.compound_id && candidate.start_byte !== undefined && candidate.end_byte !== undefined) {
            const ranges = keptRanges.get(candidate.compound_id) || [];
            ranges.push({ start: candidate.start_byte, end: candidate.end_byte, content: candidate.content });
            keptRanges.set(candidate.compound_id, ranges);
          }
        } else {
          // Debug log on dropped items
          if (distinctAnchors.length < 5) {
            // console.log(`[Dedup] Dropped Content Duplicate: ${candidate.content.substring(0, 50)}...`);
          }
        }
      }

      const originalCount = anchors.length;
      anchors = distinctAnchors;
      console.log(`[Search] Final Dedup: ${originalCount} -> ${anchors.length} items. Removed ${originalCount - anchors.length} duplicates.`);

      console.log(`[Search] Anchors found: ${atomResults.length} Atoms, ${molecules.length} Molecules. Final Unique: ${anchors.length}`);

    } catch (e) {
      console.error('[Search] Molecule search failed:', e);
      anchors = atomResults;
    }

    // Intercept: Read content from Mirror
    // We do this AFTER finding anchors but BEFORE returning them.
    // This ensures we serve the "Live" content from the Mirror Brain.

    const { getMirrorPath } = await import('../mirror/mirror.js');
    const fs = await import('fs');

    for (const anchor of anchors) {
      try {
        // Calculate Mirror Path
        const mirrorPath = getMirrorPath(anchor.source, anchor.provenance);

        // Check if exists and read
        if (fs.existsSync(mirrorPath)) {
          const liveContent = fs.readFileSync(mirrorPath, 'utf-8');
          if (liveContent && liveContent.length > 0) {
            anchor.content = liveContent;
          }
        }
      } catch (e: any) {
        // Fail silently -> Fallback to DB content
        // console.warn(`[Search] Failed to hydrate from mirror: ${e.message}`);
      }
    }

    return anchors;

  } catch (e) {
    console.error('[Search] findAnchors failed:', e);
    return [];
  }
}

/**
 * Execute search with Intelligent Expansion and Physics Tag-Walker Protocol (GCP)
 */
export async function executeSearch(
  query: string,
  _bucket?: string,
  buckets?: string[],
  maxChars: number = config.SEARCH.max_chars_default,
  _deep: boolean = false,
  provenance: 'internal' | 'external' | 'quarantine' | 'all' = 'all',
  explicitTags: string[] = [],
  filters?: { type?: string; minVal?: number; maxVal?: number; }
): Promise<{ context: string; results: SearchResult[]; toAgentString: () => string; metadata?: any }> {
  console.log(`[Search] executeSearch (Physics Engine V2) called with provenance: ${provenance}`);
  const startTime = Date.now();

  // 1. Parse & Prepare
  const cleanQuery = query; // Simplified for now, real NLP parsing happens in findAnchors/query-parser calls if needed
  const realBuckets = new Set(buckets || []);
  if (explicitTags.length > 0) console.log(`[Search] Explicit tags: ${explicitTags.join(', ')}`);

  // 2. Find Anchors (Planets)
  // Combine Engram Lookup + FTS + Molecule Search
  const engramResults = await lookupByEngram(cleanQuery); // TODO: Hydrate these results
  const primaryAnchors = await findAnchors(cleanQuery, Array.from(realBuckets), explicitTags, maxChars, provenance, filters);

  // Clean up engram results if they are just IDs (lookupByEngram returns IDs? No, currently logic is missing hydration in my quick look, assuming compatible or empty)
  // Actually lookupByEngram returns string[] of IDs. We need to fetch them.
  // For now, let's rely on primaryAnchors. 
  // If we had time, we'd hydrate engrams.

  const allAnchors = [...primaryAnchors];

  // Deduplicate
  const seenIds = new Set<string>();
  const uniqueAnchors = allAnchors.filter(r => {
    if (seenIds.has(r.id)) return false;
    seenIds.add(r.id);
    return true;
  });

  // 3. physics-tag-Walker (Moons)
  const physicsWalker = new PhysicsTagWalker();
  const walkerResults = await physicsWalker.applyPhysicsWeighting(uniqueAnchors, 0.005, {
    temperature: 0.2,
    max_per_hop: 50,
    walk_radius: 1
  });

  console.log(`[Search] Physics Walker found ${walkerResults.length} associations.`);

  // 4. Graph-Context Serialization (GCP)
  const userContext: UserContext = {
    name: 'User', // TODO: Get from request context if available
    current_state: 'active'
  };

  const contextPackage = assembleContextPackage({
    user: userContext,
    query: cleanQuery,
    keyTerms: cleanQuery.split(' '),
    scopeTags: explicitTags,
    anchors: uniqueAnchors,
    walkerResults: walkerResults,
    charBudget: maxChars
  });

  const serializedContext = assembleAndSerialize({
    user: userContext,
    query: cleanQuery,
    keyTerms: cleanQuery.split(' '),
    scopeTags: explicitTags,
    anchors: uniqueAnchors,
    walkerResults: walkerResults,
    charBudget: maxChars
  });

  console.log(`[Search] Search completed in ${Date.now() - startTime}ms`);

  // Map back to SearchResult[] for legacy API compatibility
  // Combine Anchors + Walker Results
  const combinedResults = [
    ...uniqueAnchors,
    ...walkerResults.map(w => w.result)
  ];

  return {
    context: serializedContext,
    results: combinedResults,
    toAgentString: () => serializedContext,
    metadata: contextPackage.graphStats
  };
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

    const mappedResults = result.rows.map((row: any) => ({
      id: row.id,
      score: row.score,
      content: row.content,
      source: row.source,
      timestamp: row.timestamp,
      buckets: row.buckets,
      tags: row.tags,
      epochs: row.epochs,
      provenance: row.provenance
    }));

    await hydrateFromMirror(mappedResults);
    return mappedResults;
  } catch (e) {
    console.error('[Search] FTS failed', e);
    return [];
  }
}

/** 
 * Helper to hydrate results from Mirror (Code Reuse)
 */
async function hydrateFromMirror(results: SearchResult[]) {
  try {
    const { getMirrorPath } = await import('../mirror/mirror.js');
    const fs = await import('fs');

    for (const res of results) {
      try {
        const mirrorPath = getMirrorPath(res.source, res.provenance);
        if (fs.existsSync(mirrorPath)) {
          const content = fs.readFileSync(mirrorPath, 'utf-8');
          if (content) res.content = content;
        }
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
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
): Promise<{ context: string; results: SearchResult[]; attempt: number; metadata?: any; toAgentString: () => string }> {

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
): Promise<{ context: string; results: SearchResult[]; strategy: string; splitQueries?: string[]; metadata?: any; toAgentString: () => string }> {
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

  // 5. Re-Format using GCP (Standard 086)
  const userContext: UserContext = {
    name: 'User',
    current_state: 'active'
  };

  const serializedContext = assembleAndSerialize({
    user: userContext,
    query: query,
    keyTerms: entities,
    scopeTags: tags,
    anchors: mergedResults, // Treat all merged results as anchors for now in this aggregate view
    walkerResults: [],
    charBudget: maxChars * 1.5
  });

  return {
    context: serializedContext,
    results: mergedResults,
    toAgentString: () => serializedContext,
    strategy: 'split_merge',
    splitQueries: entities,
    metadata: { ...initial.metadata, strategy: 'split_merge' }
  };
}

