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
  // Now configurable via constructor for max-recall mode
  private DAMPING_FACTOR: number;
  private TIME_DECAY_LAMBDA: number;
  private MAX_PER_HOP: number;
  private WALK_RADIUS: number;
  private GRAVITY_THRESHOLD: number;
  private TEMPERATURE: number;

  constructor(config?: {
    damping?: number;
    temporalDecay?: number;
    maxPerHop?: number;
    walkRadius?: number;
    gravityThreshold?: number;
    temperature?: number;
  }) {
    // Default values (balanced production config)
    this.DAMPING_FACTOR = config?.damping ?? 0.85;
    this.TIME_DECAY_LAMBDA = config?.temporalDecay ?? 0.00001;
    this.MAX_PER_HOP = config?.maxPerHop ?? 50;
    this.WALK_RADIUS = config?.walkRadius ?? 1;
    this.GRAVITY_THRESHOLD = config?.gravityThreshold ?? 0.01;
    this.TEMPERATURE = config?.temperature ?? 0.2;
  }

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
   * 
   * Uses instance configuration from constructor for max-recall support.
   */
  async performRadialInflation(
    anchorIds: string[],
    radius?: number,        // Uses instance WALK_RADIUS if not provided
    maxPerHop?: number,     // Uses instance MAX_PER_HOP if not provided
    temperature?: number,   // Uses instance TEMPERATURE if not provided
    gravityThreshold?: number // Uses instance GRAVITY_THRESHOLD if not provided
  ): Promise<PhysicsResult[]> {
    // Use instance defaults if not overridden
    const hopRadius = radius ?? this.WALK_RADIUS;
    const hopMaxPerHop = maxPerHop ?? this.MAX_PER_HOP;
    const hopTemperature = temperature ?? this.TEMPERATURE;
    const hopGravityThreshold = gravityThreshold ?? this.GRAVITY_THRESHOLD;
    
    let currentAnchors = anchorIds;
    let allPhysicsResults: PhysicsResult[] = [];
    const seenIds = new Set<string>(anchorIds); // Prevent revisiting anchors

    // We only support radius=1 fully optimized in SQL for now.
    // Iteration for radius > 1 would require feeding results back in.
    // Given the efficiency, radius=1 is usually sufficient if the first hop is high quality.

    // Get connected nodes via shared tags with SQL weighting
    const connectedNodes = await this.getConnectedNodesWeighted(
      currentAnchors,
      hopMaxPerHop * 3, // Fetch more candidates, we filter by threshold later
      hopGravityThreshold
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
    // We pass the anchor IDs as a single array as the first parameter.
    // threshold and limit follow as $2 and $3.

    // 2. The Great Physics Query
    const thresholdParamIdx = 2;
    const limitParamIdx = 3;

    const refinedQuery = `
      WITH anchor_ids AS (
        SELECT unnest($1::text[]) as id
      ),
      -- Resolve both Atoms and Molecules to a unified set of Atom IDs
      -- For molecules, we only resolve to atoms that overlap with the molecule's byte range (+/- 500 bytes)
      -- Resolve both Atoms and Molecules to a unified set of Atom IDs
      -- For molecules, we only resolve to atoms that overlap with the molecule's byte range (+/- 500 bytes)
      resolved_atoms AS (
        (SELECT id as atom_id FROM atoms WHERE id IN (SELECT id FROM anchor_ids))
        UNION
        (SELECT a.id as atom_id FROM atoms a
         JOIN molecules m ON a.compound_id = m.compound_id
         JOIN anchor_ids ai ON m.id = ai.id
         WHERE m.id IN (SELECT id FROM anchor_ids)
         AND a.start_byte >= (m.start_byte - 500)
         AND a.end_byte <= (m.end_byte + 500)
         LIMIT 100)
      ),
      anchor_stats AS (
        SELECT 
          id as anchor_id, 
          timestamp as anchor_ts,
          simhash as anchor_sh
        FROM atoms 
        WHERE id IN (SELECT atom_id FROM resolved_atoms)
        LIMIT 20 -- Ultra-stable cap
      ),
      -- 1. Candidate Generation
      candidates AS (
         -- Part A: Tag-based
         (SELECT t.atom_id, a.timestamp, a.simhash, COUNT(DISTINCT t.tag) as shared_tags, 0.0 as physical_bonus
          FROM tags t
          JOIN atoms a ON t.atom_id = a.id
          WHERE t.tag IN (SELECT DISTINCT tag FROM tags WHERE atom_id IN (SELECT anchor_id FROM anchor_stats))
          AND t.atom_id NOT IN (SELECT anchor_id FROM anchor_stats)
          GROUP BY t.atom_id, a.timestamp, a.simhash
          LIMIT 100)
         UNION ALL
         -- Part B: Physical proximity
         (SELECT a.id as atom_id, a.timestamp, a.simhash, 0 as shared_tags, 1.0 as physical_bonus
          FROM atoms a
          JOIN anchor_stats ast ON a.compound_id = (SELECT compound_id FROM atoms WHERE id = ast.anchor_id)
          WHERE a.id NOT IN (SELECT anchor_id FROM anchor_stats)
          AND a.start_byte >= ((SELECT start_byte FROM atoms WHERE id = ast.anchor_id) - 1000)
          AND a.end_byte <= ((SELECT end_byte FROM atoms WHERE id = ast.anchor_id) + 1000)
          LIMIT 100)
      ),
      -- 2. Aggregate candidate scores
      scored_candidates AS (
        SELECT 
           c.atom_id,
           c.timestamp,
           c.simhash,
           SUM(c.shared_tags) as total_shared_tags,
           MAX(c.physical_bonus) as physical_bonus
        FROM candidates c
        GROUP BY c.atom_id, c.timestamp, c.simhash
      ),
      -- 3. Physics Weighting (Unified Field Equation)
      weighted_ids AS (
        SELECT 
           sc.atom_id,
           MAX(
              ( (sc.total_shared_tags * ${this.DAMPING_FACTOR}) + (sc.physical_bonus * 0.1) ) * 
              EXP(-${this.TIME_DECAY_LAMBDA} * (ABS(sc.timestamp - ast.anchor_ts) / 3600000.0)) *
              (1.0 - (bit_count(('x' || LPAD(sc.simhash, 16, '0'))::bit(64) # ('x' || LPAD(ast.anchor_sh, 16, '0'))::bit(64)) / 64.0))
           ) as gravity_score,
           MAX(ast.anchor_id) as best_anchor_id,
           MAX(sc.total_shared_tags) as shared_tags
        FROM scored_candidates sc
        CROSS JOIN anchor_stats ast
        GROUP BY sc.atom_id
        HAVING MAX(
              ( (sc.total_shared_tags * ${this.DAMPING_FACTOR}) + (sc.physical_bonus * 0.1) ) * 
              EXP(-${this.TIME_DECAY_LAMBDA} * (ABS(sc.timestamp - ast.anchor_ts) / 3600000.0)) *
              (1.0 - (bit_count(('x' || LPAD(sc.simhash, 16, '0'))::bit(64) # ('x' || LPAD(ast.anchor_sh, 16, '0'))::bit(64)) / 64.0))
           ) > $${thresholdParamIdx}
        ORDER BY gravity_score DESC
        LIMIT $${limitParamIdx}
      )
      -- 4. Final projection
      SELECT 
         w.atom_id,
         w.shared_tags,
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
         w.gravity_score,
         w.best_anchor_id
      FROM weighted_ids w
      JOIN atoms a ON w.atom_id = a.id
    `;

    const params = [cappedIds, threshold, limit];

    try {
      const result = await sqlWithTimeout<any>(refinedQuery, params, QUERY_TIMEOUT_MS);
      const elapsed = Date.now() - startTime;

      if (elapsed > 5000) {
        console.warn(`[PhysicsWalker] SQL Weighting took ${elapsed}ms for ${anchorIds.length} anchors`);
      } else {
        console.log(`[PhysicsWalker] SQL Weighting: ${result.rows?.length || 0} results in ${elapsed} ms`);
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
      console.error(`[PhysicsWalker] SQL Weighting failed after ${Date.now() - startTime} ms: `, e);
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
      WITH anchor_tags AS(
      SELECT DISTINCT unnest($1:: text[]) AS tag
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
      console.error(`[PhysicsWalker] getConnectedNodesFromTags failed: `, e);
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