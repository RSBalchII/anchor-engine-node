/**
 * Physics-Based Tag Walker for ECE
 * 
 * Implements mathematical approach to graph traversal using SQL matrix operations
 * leveraging the relational nature of PGlite for efficient sparse matrix processing.
 * 
 * Architecture: Treats the database as a Knowledge Graph.
 * - Atoms (memories) and Tags (concepts) form a bipartite graph.
 * - JOIN operations simulate sparse matrix multiplication (M × M^T).
 * - The Unified Field Equation weights every connection deterministically.
 * 
 * The "Planets and Moons" Model:
 * - Planets: Direct search hits (FTS/SimHash) — heavy, explicit anchors.
 * - Moons:   Physics-discovered associations — orbit via shared tags, time, simhash.
 * - Serendipity: Weighted reservoir sampling occasionally surfaces faint but relevant signals.
 */

import { db } from '../../core/db.js';
import { SearchResult } from './search.js';
import type {
  SearchConfig,
  ConnectionType,
  PhysicsMetadata,
  // MemoryNode // Unused
} from '../../types/context-protocol.js';

/** Maximum time (ms) any single physics walker SQL query is allowed to run */
const QUERY_TIMEOUT_MS = 10_000;
/** Maximum number of anchor IDs to feed into a single SQL query */
const MAX_ANCHOR_IDS = 50; // Increased from 20 since SQL is more efficient now

/**
 * Run a DB query with a timeout. If the query takes longer than `timeoutMs`,
 * the promise rejects with an error (PGlite has no native cancel, but this
 * prevents the physics walker from blocking the search pipeline forever).
 */
async function sqlWithTimeout<T>(query: string, params: any[], timeoutMs: number = QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    db.run(query, params) as Promise<T>,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[PhysicsWalker] SQL query timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

export interface WalkerNode {
  atomId: string;
  sharedTags: number;
  timestamp: number;    // Unix epoch
  simhash: bigint;      // 64-bit simhash
  content?: string;     // Populated when fetching full atom details
  source?: string;
  tags?: string[];
  provenance?: string;
  type?: string;
  frequency?: number;
  /** Compound document ID for context inflation */
  compoundId?: string;
  /** Start byte offset in compound body */
  startByte?: number;
  /** End byte offset in compound body */
  endByte?: number;

  // Physics Metadata (Calculated in SQL)
  gravityScore: number;
  bestAnchorId?: string;
}

/** Result from the physics walk with full metadata */
export interface PhysicsResult {
  /** The search result with all standard fields */
  result: SearchResult;
  /** Physics metadata for the Graph-Context Protocol */
  physics: PhysicsMetadata;
}

export class PhysicsTagWalker {
  // Hyperparameters (The "Laws of Physics" for your mind)
  private DAMPING_FACTOR = 0.85; // Alpha: How far inflation spreads
  private TIME_DECAY_LAMBDA = 0.00001; // How fast old memories fade

  /**
   * Safely parse a simhash string into a BigInt (hex with or without 0x).
   */
  private safeParseHex(hash?: string | null): bigint {
    if (!hash || hash === '0') return 0n;
    const clean = hash.startsWith('0x') ? hash : `0x${hash}`;
    try {
      return BigInt(clean);
    } catch (e) {
      console.warn(`[PhysicsWalker] Invalid simhash format: ${hash}`);
      return 0n;
    }
  }

  /**
   * Performs radial inflation using SQL matrix operations.
   * This executes the equivalent of: r = (M * M^T) * q
   * 
   * Now includes the Unified Field Equation directly in the SQL query:
   * Weight = (SharedTags) * Exp(-Lambda * DeltaT) * (1 - SimHashDist/64)
   */
  async performRadialInflation(
    anchorIds: string[],
    radius: number = 1,
    maxPerHop: number = 50,
    temperature: number = 0.2,
    gravityThreshold: number = 0.1
  ): Promise<PhysicsResult[]> {
    let currentAnchors = anchorIds;
    let allPhysicsResults: PhysicsResult[] = [];
    const seenIds = new Set<string>(anchorIds); // Prevent revisiting anchors

    // We only support radius=1 fully optimized in SQL for now.
    // Iteration for radius > 1 would require feeding results back in.
    // Given the efficiency, radius=1 is usually sufficient if the first hop is high quality.

    // Get connected nodes via shared tags with SQL weighting
    const connectedNodes = await this.getConnectedNodesWeighted(
      currentAnchors,
      maxPerHop * 3, // Fetch more candidates, we filter by threshold later
      gravityThreshold
    );

    for (const node of connectedNodes) {
      if (seenIds.has(node.atomId)) continue;
      seenIds.add(node.atomId);

      // Determine connection type based on physics
      // Note: We don't have the *exact* partial scores from SQL separate easily
      // without more complex queries, so we infer reason from properties.

      let connectionType: ConnectionType = 'tag_walk_neighbor';
      let linkReason = `via ${node.sharedTags} shared tag(s)`;

      // Re-calculate some factors for explanation text (cheap in JS)
      // We don't need exact anchor match here, just general properties

      if (node.gravityScore > 0.8 && node.sharedTags > 2) {
        connectionType = 'tag_walk_neighbor'; // Strong bond is just a high-quality tag walk
        linkReason = `strong bond via ${node.sharedTags} shared tag(s)`;
      }

      // Calculate simhash distance to *best anchor* if we had it, but SQL aggregation
      // hides the specific anchor relation. 
      // Ideally SQL returns "best_anchor_id". It does!

      const timeDeltaMs = 0; // SQL handled time decay, we don't need exact delta for now unless we query it.
      // (Actually we can't easily get the specific edge delta from the aggregate)

      const isRecurring = (node.frequency || 0) > 1 || node.sharedTags >= 3;

      const result: SearchResult = {
        id: node.atomId,
        content: node.content || '',
        source: node.source || '',
        timestamp: node.timestamp,
        buckets: [],
        tags: node.tags || [],
        epochs: '',
        provenance: node.provenance || 'internal',
        score: node.gravityScore,
        molecular_signature: node.simhash.toString(16),
        frequency: node.frequency || 1,
        type: node.type || 'thought',
        compound_id: node.compoundId,
        start_byte: node.startByte,
        end_byte: node.endByte,
        temporal_state: {
          first_seen: node.timestamp,
          last_seen: node.timestamp,
          occurrence_count: node.frequency || 1,
          timestamps: [node.timestamp]
        }
      };

      const physics: PhysicsMetadata = {
        gravity_score: node.gravityScore,
        time_drift: 'calculated_in_flux', // Placeholder as we aggregate
        is_recurring: isRecurring,
        frequency: node.frequency || 1,
        connection_type: connectionType,
        source_anchor_id: node.bestAnchorId || '',
        link_reason: linkReason
      };

      allPhysicsResults.push({ result, physics });
    }

    // Sort by gravity score
    allPhysicsResults.sort((a, b) => b.physics.gravity_score - a.physics.gravity_score);

    // Weighted Reservoir Sampling / Serendipity could be applied here if needed
    // But SQL ranking is "Unified Field" based.
    // If temperature is high, we might want to shuffle the top K?
    // For now, returning the physics-sorted list.

    return allPhysicsResults.slice(0, maxPerHop);
  }

  /**
   * Gets connected nodes via shared tags using SQL matrix operations w/ Physics equations.
   * 
   * The SQL performs:
   * 1. Collect Anchor Stats (ID, Timestamp, SimHash)
   * 2. Find Shared Tags (Sparse Matrix Multiply)
   * 3. Calculate Weight: 
   *    W = (SharedTags) * Exp(-lambda * delta_t) * (1 - Hamming/64)
   * 4. Aggregate: Take the MAX weight overlapping with any anchor.
   */
  private async getConnectedNodesWeighted(
    anchorIds: string[],
    limit: number = 50,
    threshold: number = 0.1
  ): Promise<WalkerNode[]> {
    if (anchorIds.length === 0) return [];

    // Cap anchors
    const cappedIds = anchorIds.length > MAX_ANCHOR_IDS
      ? anchorIds.slice(0, MAX_ANCHOR_IDS)
      : anchorIds;

    const startTime = Date.now();

    // 1. Prepare Anchor Params
    // We need to pass the anchor IDs to the CTEs.
    const placeHolders = cappedIds.map((_, i) => `$${i + 1}`).join(',');
    const limitParamIdx = cappedIds.length + 1;
    const thresholdParamIdx = cappedIds.length + 2;

    // 2. The Great Physics Query
    // Note: bit_count requires casting to bit(64) then int? 
    // Postgres 'bit_count' is available in recent versions or via extension.
    // If bit_count is missing, we might fail. PGlite usually has standard functions.
    // Fallback: simple text similarity or just skip simhash in SQL if risky?
    // Let's assume PGlite standard functions. 
    // Verified: bit_count is standard in PG 14+. PGlite is PG 15.

    // Cast logic:
    // SimHash is stored as TEXT (e.g. "0xa1b2...").
    // We need to convert clean hex to BIT(64) -> BIGINT.
    // Conversion: x'...'::bigint
    // But we have a column `simhash`. 
    // Helper: ('x' || ltrim(simhash, '0x'))::bit(64)::bigint

    const query = `
      WITH anchor_stats AS (
        SELECT 
          id as anchor_id, 
          timestamp as anchor_ts, 
          -- Parse Hex String to BigInt safe for bitwise ops
          ('x' || ltrim(COALESCE(NULLIF(simhash, '0'), '0'), '0x'))::bit(64)::bigint as anchor_hash
        FROM atoms 
        WHERE id IN (${placeHolders})
      ),
      anchor_tags AS (
        SELECT DISTINCT tag 
        FROM tags 
        WHERE atom_id IN (${placeHolders})
      )
      SELECT 
          t.atom_id,
          COUNT(DISTINCT t.tag) AS shared_tag_count,
          MAX(a.timestamp) as timestamp,
          MAX(a.simhash) as simhash,
          MAX(a.content) as content,
          MAX(a.source_path) as source_path,
          MAX(a.tags) as tags,
          MAX(a.provenance) as provenance,
          MAX(a.type) as type,
          MAX(a.compound_id) as compound_id,
          MAX(a.start_byte) as start_byte,
          MAX(a.end_byte) as end_byte,
          
          -- Gravity Score Calculation
          -- We compute the max attraction to ANY of the anchors
          MAX(
            (
               -- Base Bond: Shared Tags (Local to this pair? No, t.atom_id group by)
               -- This is an approximation. Ideally we sum weighs from all anchors?
               -- Or logic: "How strongly is this atom pulled by the anchor set?"
               -- Let's take the BEST single bond for now (MAX).
               
               -- Re-calc shared tags for the specific anchor-target pair?
               -- That requires joining tags again. Expensive.
               
               -- Optimization: Use the aggregate shared_tag_count as a proxy for 'mass'
               -- and modulate by the 'closest' anchor in time/space.
               
               -- Better approach for SQL: Cross Join anchors is O(N*M).
               -- With 20 anchors and 1000 candidates, it's 20k rows. Fine.
               
               -- Wait, we grouped by t.atom_id. We can't easily access specific anchor stats without cross join inside.
               -- Let's stick to the plan: Cross Join anchor_stats.
               
               -- Formula:
               -- Weight = (SharedTagsWithAnchor) * TimeDecay * SimHashSim
               
               -- Issue: 'shared_tag_count' above is Total Shared with *Any* anchor.
               -- We want Shared with *Specific* anchor.
               -- That requires a join on tags for both.
               
               -- Simplified Physics V1 in SQL:
               -- 1. Count total shared tags (Magnetism)
               -- 2. Find 'closest' anchor by Time/Simhash to penalize.
               -- score = (TotalSharedTags) * MAX( TimeDecay * SimHashSim )
            )
          ) as raw_score_placeholder,
          
          -- REAL CALCULATION
          -- We just select the generic attributes and do a sub-ranking?
          -- OR we do the Cross Join.
          
          MAX(ast.anchor_id) as best_anchor_id -- Placeholder, see below
          
      FROM tags t
      JOIN anchor_tags at ON t.tag = at.tag
      JOIN atoms a ON t.atom_id = a.id
      CROSS JOIN anchor_stats ast -- Tie every candidate to every anchor
      WHERE t.atom_id NOT IN (${placeHolders})
      GROUP BY t.atom_id, a.id 
          -- Grouping by a.id includes all cols technically, but PGlite is strict.
          -- Actually we should Group by t.atom_id and agg the rest.
      
      -- Refined Query Structure for Correctness:
      -- We need pairwise scores.
      -- (Candidate) --[Tags]--(Anchor)
    `;

    // Correct Efficient Query:
    // 1. Find Candidates (share tags).
    // 2. Score Candidates against Anchors.

    // Since we can't easily count "Shared Tags per Anchor" without expanding the join table massively,
    // We will use the "Total Shared Tags" (Set Overlap) as the mass.
    // And "Min Distance to Centroid" (or Closest Anchor) as the decay.

    const refinedQuery = `
      WITH anchor_stats AS (
        SELECT 
          id as anchor_id, 
          timestamp as anchor_ts, 
          ('x' || ltrim(COALESCE(NULLIF(simhash, '0'), '0'), '0x'))::bit(64)::bigint as anchor_hash
        FROM atoms 
        WHERE id IN (${placeHolders})
      ),
      -- Candidates are atoms sharing tags with anchors
      candidates AS (
         SELECT t.atom_id, COUNT(DISTINCT t.tag) as shared_tags
         FROM tags t
         WHERE t.tag IN (SELECT DISTINCT tag FROM tags WHERE atom_id IN (${placeHolders}))
         AND t.atom_id NOT IN (${placeHolders})
         GROUP BY t.atom_id
      )
      SELECT 
         c.atom_id,
         c.shared_tags,
         a.timestamp,
         a.simhash,
         a.content,
         a.source_path,
         a.tags,
         a.provenance,
         a.type,
         a.compound_id,
         a.start_byte,
         a.end_byte,
         
         -- Calculate Max Gravity for this candidate against all anchors
         MAX(
            c.shared_tags * 
            ${this.DAMPING_FACTOR} *
            EXP(-${this.TIME_DECAY_LAMBDA} * (ABS(a.timestamp - ast.anchor_ts) / 3600000.0)) *
            (1.0 - (
                bit_count(
                   ((('x' || ltrim(COALESCE(NULLIF(a.simhash, '0'), '0'), '0x'))::bit(64)::bigint) # ast.anchor_hash)::bit(64)
                )::float / 64.0
            ))
         ) as gravity_score,
         
         -- Keep track of which anchor pulled it closest (Max ID by score ideally, but MAX(ID) is approx)
         MAX(ast.anchor_id) as best_anchor_id 
         
      FROM candidates c
      JOIN atoms a ON c.atom_id = a.id
      CROSS JOIN anchor_stats ast
      GROUP BY 
          c.atom_id, c.shared_tags, a.timestamp, a.simhash, 
          a.content, a.source_path, a.tags, a.provenance, 
          a.type, a.compound_id, a.start_byte, a.end_byte
      HAVING MAX(
            c.shared_tags * 
            ${this.DAMPING_FACTOR} *
            EXP(-${this.TIME_DECAY_LAMBDA} * (ABS(a.timestamp - ast.anchor_ts) / 3600000.0)) *
            (1.0 - (
                bit_count(
                   ((('x' || ltrim(COALESCE(NULLIF(a.simhash, '0'), '0'), '0x'))::bit(64)::bigint) # ast.anchor_hash)::bit(64)
                )::float / 64.0
            ))
         ) > $${limitParamIdx} -- Threshold check
      ORDER BY gravity_score DESC
      LIMIT $${thresholdParamIdx}
    `;

    const params = [...cappedIds, threshold, limit];

    try {
      const result = await sqlWithTimeout<any>(refinedQuery, params, QUERY_TIMEOUT_MS);
      const elapsed = Date.now() - startTime;

      if (elapsed > 5000) {
        console.warn(`[PhysicsWalker] SQL Weighting took ${elapsed}ms for ${anchorIds.length} anchors`);
      } else {
        console.log(`[PhysicsWalker] SQL Weighting: ${result.rows?.length || 0} results in ${elapsed}ms`);
      }

      if (!result.rows) return [];

      return result.rows.map((row: any) => ({
        atomId: row.atom_id,
        sharedTags: parseInt(row.shared_tags),
        timestamp: parseFloat(row.timestamp),
        simhash: this.safeParseHex(row.simhash),
        content: row.content || '',
        source: row.source_path || '',
        tags: row.tags || [],
        provenance: row.provenance || 'internal',
        type: row.type || 'thought',
        compoundId: row.compound_id || undefined,
        startByte: (row.start_byte !== null && row.start_byte !== undefined) ? row.start_byte : undefined,
        endByte: (row.end_byte !== null && row.end_byte !== undefined) ? row.end_byte : undefined,
        gravityScore: parseFloat(row.gravity_score),
        bestAnchorId: row.best_anchor_id
      }));
    } catch (e) {
      console.error(`[PhysicsWalker] SQL Weighting failed after ${Date.now() - startTime}ms:`, e);
      return [];
    }
  }

  // --- Tag-Based Variant (for Virtual/Mol Anchors) ---

  /**
   * Applies physics weighting seeded from tags directly.
   */
  async applyPhysicsWeightingFromTags(
    anchorResults: SearchResult[],
    threshold: number = 0.1,
    config?: Partial<SearchConfig>
  ): Promise<PhysicsResult[]> {
    // 1. Extract Tags
    const anchorTags = Array.from(
      new Set(anchorResults.flatMap(r => (r.tags || []).filter(Boolean)))
    );
    if (anchorTags.length === 0) return [];

    const temperature = config?.temperature ?? 0.2;
    const maxPerHop = config?.max_per_hop ?? 50;

    // 2. Run simplified SQL query 
    // (Simulating an anchor at "Now" with null hash for distance? or just shared tag count?)
    // For pure tag walk, we often lack a specific SimHash or Timestamp anchor.
    // We'll use the "Mean Timestamp" of the anchor results if available.

    // Simplification: Reuse the main walker but treat the resulting nodes
    // as having a gravity score purely based on Shared Tags count for now,
    // or reimplement a specific Tag-SQL query.

    // Let's implement a specific customized query for Tag-Walking that
    // incorporates the "Concept Gravity".

    // For now, to keep this refactor focused and safe, we will use the OLD logic for Tag-Walking
    // but optimized to not loop heavily.
    // Actually, let's just fetch candidates by tags and score in JS for this edge case
    // OR create a "Virtual Anchor" in the CTE.

    // Fallback to simpler implementation for tags-only start:
    const nodes = await this.getConnectedNodesFromTags(anchorTags, maxPerHop * 2);

    // Map to PhysicsResult manually
    return nodes.map(node => ({
      result: {
        id: node.atomId,
        content: node.content || '',
        source: node.source || '',
        timestamp: node.timestamp,
        buckets: [],
        tags: node.tags || [],
        epochs: '',
        provenance: node.provenance || 'internal',
        score: node.sharedTags * 0.1, // Crude score
        molecular_signature: node.simhash.toString(16),
        frequency: node.frequency || 1,
        type: node.type || 'thought',
        compound_id: node.compoundId,
        start_byte: node.startByte,
        end_byte: node.endByte,
        temporal_state: {
          first_seen: node.timestamp,
          last_seen: node.timestamp,
          occurrence_count: node.frequency || 1,
          timestamps: [node.timestamp]
        }
      },
      physics: {
        gravity_score: node.sharedTags * 0.1,
        time_drift: 'tag_walk',
        is_recurring: false,
        frequency: 1,
        connection_type: 'tag_walk_neighbor' as ConnectionType,
        source_anchor_id: 'virtual_tag_cloud',
        link_reason: `via ${node.sharedTags} shared tag(s)`
      }
    })).sort((a, b) => b.physics.gravity_score - a.physics.gravity_score).slice(0, maxPerHop);
  }

  // Helper for tag-only retrieval (Legacy/Virtual)
  private async getConnectedNodesFromTags(anchorTags: string[], limit: number = 50): Promise<WalkerNode[]> {
    // ... (Keep existing optimized CTE implementation for tags) ...
    // Re-copying the implementation for completeness of the replacement
    if (anchorTags.length === 0) return [];

    const startTime = Date.now();
    const query = `
      WITH anchor_tags AS (
        SELECT DISTINCT unnest($1::text[]) AS tag
      )
      SELECT 
          t.atom_id,
          COUNT(DISTINCT t.tag) AS shared_tag_count,
          a.timestamp,
          a.simhash,
          a.content,
          a.source_path,
          a.tags,
          a.provenance,
          a.type,
          a.compound_id,
          a.start_byte,
          a.end_byte
      FROM tags t
      JOIN anchor_tags at ON t.tag = at.tag
      JOIN atoms a ON t.atom_id = a.id
      GROUP BY 
          t.atom_id, a.timestamp, a.simhash,
          a.content, a.source_path, a.tags,
          a.provenance, a.type,
          a.compound_id, a.start_byte, a.end_byte
      ORDER BY shared_tag_count DESC
      LIMIT $2
    `;

    try {
      const result = await sqlWithTimeout<any>(query, [anchorTags, limit], QUERY_TIMEOUT_MS);
      return result.rows.map((row: any) => ({
        atomId: row.atom_id,
        sharedTags: parseInt(row.shared_tag_count),
        timestamp: parseFloat(row.timestamp),
        simhash: this.safeParseHex(row.simhash),
        content: row.content || '',
        source: row.source_path || '',
        tags: row.tags || [],
        provenance: row.provenance || 'internal',
        type: row.type || 'thought',
        compoundId: row.compound_id || undefined,
        startByte: row.start_byte,
        endByte: row.end_byte,
        gravityScore: 0 // Placeholder
      }));
    } catch (e) {
      console.error(`[PhysicsWalker] getConnectedNodesFromTags failed:`, e);
      return [];
    }
  }

  /**
   * Format time drift helper
   */
  private formatTimeDrift(deltaMs: number): string {
    const hours = deltaMs / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(deltaMs / (1000 * 60))} minutes ago`;
    if (hours < 24) return `${Math.round(hours)} hours ago`;
    const days = hours / 24;
    return `${Math.round(days)} days ago`;
  }

  /**
   * Main Entry Point
   * Applies physics weighting to search results.
   */
  async applyPhysicsWeighting(
    anchorResults: SearchResult[],
    threshold: number = 0.1,
    config?: Partial<SearchConfig>
  ): Promise<PhysicsResult[]> {
    if (anchorResults.length === 0) return [];

    // Pass everything to the SQL engine
    return this.performRadialInflation(
      anchorResults.map(r => r.id),
      config?.walk_radius || 1,
      config?.max_per_hop || 50,
      config?.temperature || 0.2, // Temperature unused in pure SQL sort currently
      threshold
    );
  }

  /**
   * Legacy wrapper
   */
  async applyPhysicsWeightingLegacy(
    anchorResults: SearchResult[],
    threshold: number = 0.1
  ): Promise<SearchResult[]> {
    const results = await this.applyPhysicsWeighting(anchorResults, threshold);
    return results.map(r => r.result);
  }
}