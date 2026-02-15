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
  MemoryNode
} from '../../types/context-protocol.js';

/** Maximum time (ms) any single physics walker SQL query is allowed to run */
const QUERY_TIMEOUT_MS = 10_000;
/** Maximum number of anchor IDs to feed into a single SQL query */
const MAX_ANCHOR_IDS = 20;

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
  /** Which anchor led to this discovery */
  sourceAnchorId?: string;
  /** How this node was found */
  connectionType?: ConnectionType;
  /** Human-readable link reason */
  linkReason?: string;
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
   * With temperature-based serendipity: instead of always taking top-N,
   * we use weighted reservoir sampling to occasionally surface faint signals.
   */
  async performRadialInflation(
    anchorIds: string[],
    radius: number = 1,
    maxPerHop: number = 50,
    temperature: number = 0.2
  ): Promise<WalkerNode[]> {
    let currentAnchors = anchorIds;
    let allConnectedNodes: WalkerNode[] = [];
    const seenIds = new Set<string>(anchorIds); // Prevent revisiting anchors

    for (let i = 0; i < radius; i++) {
      // Get connected nodes via shared tags (matrix multiplication in SQL)
      const connectedNodes = await this.getConnectedNodes(currentAnchors, maxPerHop * 2);

      // Filter out already-seen nodes
      const freshNodes = connectedNodes.filter(n => !seenIds.has(n.atomId));

      // Apply weighted reservoir sampling for serendipity
      const selectedNodes = this.weightedReservoirSample(freshNodes, maxPerHop, temperature);

      // Mark as seen
      selectedNodes.forEach(n => seenIds.add(n.atomId));

      // Add to overall results
      allConnectedNodes = [...allConnectedNodes, ...selectedNodes];

      // Update anchors for next iteration (expand radius)
      currentAnchors = selectedNodes.map(node => node.atomId);
    }

    return allConnectedNodes;
  }

  /**
   * Weighted Reservoir Sampling with Temperature
   * 
   * Instead of just taking top-N by shared tags (deterministic, boring),
   * we sample proportional to shared tag count with a temperature knob.
   * 
   * temperature = 0.0: Pure greedy (always top-N). Deterministic.
   * temperature = 0.2: Mostly strong connections, occasional surprise.
   * temperature = 1.0: Maximum wandering — uniform random weighted by tags.
   */
  private weightedReservoirSample(
    nodes: WalkerNode[],
    limit: number,
    temperature: number
  ): WalkerNode[] {
    if (nodes.length <= limit) return nodes;
    if (temperature <= 0.001) {
      // Pure greedy: just take the top ones
      return nodes.slice(0, limit);
    }

    // Assign sampling weights: w_i = sharedTags^(1/temperature)
    // Higher temperature → flatter distribution → more randomness
    const weighted = nodes.map(node => ({
      node,
      // Exponent controls sharpness: low temp = sharp peak on high-tag nodes
      samplingKey: Math.pow(Math.random(), 1.0 / (node.sharedTags * (1.0 / temperature) + 0.001))
    }));

    // Sort by sampling key descending and take top-limit
    weighted.sort((a, b) => b.samplingKey - a.samplingKey);
    return weighted.slice(0, limit).map(w => w.node);
  }

  /**
   * Gets connected nodes via shared tags using SQL matrix operations.
   * 
   * Optimized 2-step approach to avoid quadratic JOIN explosion:
   *   Step 1 (CTE): Collect distinct tags from anchor atoms (small set).
   *   Step 2: Find other atoms that share those tags, count co-occurrences.
   * 
   * This avoids the expensive 4-way atoms×tags×tags×atoms cross-product
   * that was causing 2+ minute queries on large datasets.
   */
  private async getConnectedNodes(anchorIds: string[], limit: number = 50): Promise<WalkerNode[]> {
    if (anchorIds.length === 0) return [];

    // Short-circuit: cap anchor IDs to prevent massive IN (...) clauses
    const cappedIds = anchorIds.length > MAX_ANCHOR_IDS
      ? anchorIds.slice(0, MAX_ANCHOR_IDS)
      : anchorIds;
    if (cappedIds.length < anchorIds.length) {
      console.log(`[PhysicsWalker] Capped anchor IDs from ${anchorIds.length} to ${MAX_ANCHOR_IDS}`);
    }

    const startTime = Date.now();

    // Build parameter placeholders (using cappedIds)
    const placeholders = cappedIds.map((_, idx) => `$${idx + 1}`).join(', ');
    const limitParamIdx = cappedIds.length + 1;

    // Optimized 2-step query using CTE:
    // 1. anchor_tags: Get the DISTINCT set of tags from our anchor atoms (small)
    // 2. Main query: Find atoms that share those tags, excluding anchors themselves
    const query = `
      WITH anchor_tags AS (
        SELECT DISTINCT tag
        FROM tags
        WHERE atom_id IN (${placeholders})
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
      WHERE t.atom_id NOT IN (${placeholders})
      GROUP BY 
          t.atom_id, a.timestamp, a.simhash, 
          a.content, a.source_path, a.tags,
          a.provenance, a.type,
          a.compound_id, a.start_byte, a.end_byte
      ORDER BY shared_tag_count DESC
      LIMIT $${limitParamIdx}
    `;

    const params = [...cappedIds, limit];

    try {
      const result = await sqlWithTimeout<any>(query, params, QUERY_TIMEOUT_MS);
      const elapsed = Date.now() - startTime;

      if (elapsed > 5000) {
        console.warn(`[PhysicsWalker] getConnectedNodes took ${elapsed}ms for ${anchorIds.length} anchors — consider reducing walk radius`);
      } else {
        console.log(`[PhysicsWalker] getConnectedNodes: ${result.rows?.length || 0} results in ${elapsed}ms`);
      }

      if (!result.rows) return [];

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
        startByte: (row.start_byte !== null && row.start_byte !== undefined) ? row.start_byte : undefined,
        endByte: (row.end_byte !== null && row.end_byte !== undefined) ? row.end_byte : undefined
      }));
    } catch (e) {
      console.error(`[PhysicsWalker] getConnectedNodes failed after ${Date.now() - startTime}ms:`, e);
      return [];
    }
  }

  /**
   * Gets connected nodes using an anchor tag set instead of anchor atom IDs.
   * This is used when anchors are virtual/mol results and do not exist in the atoms table.
   */
  private async getConnectedNodesFromTags(anchorTags: string[], limit: number = 50): Promise<WalkerNode[]> {
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
      const elapsed = Date.now() - startTime;

      if (elapsed > 5000) {
        console.warn(`[PhysicsWalker] getConnectedNodesFromTags took ${elapsed}ms for ${anchorTags.length} tags`);
      } else {
        console.log(`[PhysicsWalker] getConnectedNodesFromTags: ${result.rows?.length || 0} results in ${elapsed}ms`);
      }

      if (!result.rows) return [];

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
        startByte: (row.start_byte !== null && row.start_byte !== undefined) ? row.start_byte : undefined,
        endByte: (row.end_byte !== null && row.end_byte !== undefined) ? row.end_byte : undefined
      }));
    } catch (e) {
      console.error(`[PhysicsWalker] getConnectedNodesFromTags failed after ${Date.now() - startTime}ms:`, e);
      return [];
    }
  }

  /**
   * Calculates the Hamming distance between two Simhashes
   */
  private calculateHammingDistance(hash1: bigint, hash2: bigint): number {
    let xor = hash1 ^ hash2;
    let distance = 0;
    while (xor > 0n) {
      distance += Number(xor & 1n);
      xor >>= 1n;
    }
    return distance; // Max 64
  }

  /**
   * The mathematical weight calculation for a connected atom
   */
  public calculateBondWeight(
    anchorNode: WalkerNode,
    targetNode: WalkerNode
  ): number {
    // 1. Matrix C value (Base Co-occurrence)
    const baseBond = targetNode.sharedTags;

    // 2. Temporal Decay (e^(-lambda * delta_t))
    // Calculates how many hours/days apart the thoughts were
    const timeDeltaHours = Math.abs(anchorNode.timestamp - targetNode.timestamp) / (1000 * 60 * 60);
    const temporalWeight = Math.exp(-this.TIME_DECAY_LAMBDA * timeDeltaHours);

    // 3. Simhash Similarity (1 - d/64)
    // If Hamming distance is 0, multiplier is 1.0 (exact match)
    // If distance is 32 (totally different), multiplier is 0.5
    const hammingDist = this.calculateHammingDistance(anchorNode.simhash, targetNode.simhash);
    const simhashWeight = 1.0 - (hammingDist / 64.0);

    // The Unified Field Equation for your memories:
    const finalWeight = baseBond * temporalWeight * simhashWeight * this.DAMPING_FACTOR;

    return finalWeight;
  }

  /**
   * Applies physics-based weighting to search results.
   * Returns PhysicsResult[] with full metadata for the Graph-Context Protocol.
   * 
   * This is the main entry point: takes raw search anchors, walks the graph,
   * and returns weighted results with complete provenance metadata.
   */
  async applyPhysicsWeighting(
    anchorResults: SearchResult[],
    threshold: number = 0.1,
    config?: Partial<SearchConfig>
  ): Promise<PhysicsResult[]> {
    if (anchorResults.length === 0) return [];

    const maxPerHop = config?.max_per_hop ?? 50;
    const temperature = config?.temperature ?? 0.2;
    const gravityThreshold = config?.gravity_threshold ?? threshold;
    const walkRadius = config?.walk_radius ?? 1;

    // Get anchor IDs
    const anchorIds = anchorResults.map(r => r.id);

    // Perform radial inflation to get connected nodes
    const connectedNodes = await this.performRadialInflation(
      anchorIds, walkRadius, maxPerHop, temperature
    );

    // Create anchor node representations
    const anchorNodes: WalkerNode[] = anchorResults.map(r => ({
      atomId: r.id,
      sharedTags: 1, // Base value for anchors
      timestamp: r.timestamp,
      simhash: this.safeParseHex(r.molecular_signature)
    }));

    // Apply physics weighting to connected nodes
    const weightedResults: PhysicsResult[] = [];

    for (const targetNode of connectedNodes) {
      // Find the best anchor to calculate weight against
      let maxWeight = 0;
      let bestAnchorId = anchorIds[0];
      let bestAnchorNode = anchorNodes[0];

      for (const anchorNode of anchorNodes) {
        const weight = this.calculateBondWeight(anchorNode, targetNode);
        if (weight > maxWeight) {
          maxWeight = weight;
          bestAnchorId = anchorNode.atomId;
          bestAnchorNode = anchorNode;
        }
      }

      // Only include if weight exceeds threshold
      if (maxWeight > gravityThreshold) {
        // Determine connection type based on how the node was found
        const hammingDist = this.calculateHammingDistance(
          bestAnchorNode.simhash,
          targetNode.simhash
        );
        let connectionType: ConnectionType = 'tag_walk_neighbor';
        let linkReason = `via ${targetNode.sharedTags} shared tag(s)`;

        if (hammingDist <= 3) {
          connectionType = 'direct_simhash';
          linkReason = `simhash hamming: ${hammingDist}`;
        } else if (targetNode.sharedTags <= 1 && temperature > 0.1) {
          connectionType = 'serendipity';
          linkReason = `serendipity sample (temp: ${temperature.toFixed(1)})`;
        }

        const timeDeltaMs = Math.abs(bestAnchorNode.timestamp - targetNode.timestamp);
        if (timeDeltaMs < 3600000 && connectionType === 'tag_walk_neighbor') {
          connectionType = 'temporal_neighbor';
          linkReason = `temporal proximity: ${this.formatTimeDrift(timeDeltaMs)}`;
        }

        // Determine if recurring (frequency > 1 indicates repeated thought)
        const frequency = targetNode.frequency || 1;
        const isRecurring = frequency > 1 || targetNode.sharedTags >= 3;

        const result: SearchResult = {
          id: targetNode.atomId,
          content: targetNode.content || '',
          source: targetNode.source || '',
          timestamp: targetNode.timestamp,
          buckets: [],
          tags: targetNode.tags || [],
          epochs: '',
          provenance: targetNode.provenance || 'internal',
          score: maxWeight,
          molecular_signature: targetNode.simhash.toString(),
          frequency: frequency,
          type: targetNode.type || 'thought',
          compound_id: targetNode.compoundId,
          start_byte: targetNode.startByte,
          end_byte: targetNode.endByte,
          temporal_state: {
            first_seen: targetNode.timestamp,
            last_seen: targetNode.timestamp,
            occurrence_count: frequency,
            timestamps: [targetNode.timestamp]
          }
        };

        const physics: PhysicsMetadata = {
          gravity_score: maxWeight,
          time_drift: this.formatTimeDrift(timeDeltaMs),
          is_recurring: isRecurring,
          frequency: frequency,
          connection_type: connectionType,
          source_anchor_id: bestAnchorId,
          link_reason: linkReason
        };

        weightedResults.push({ result, physics });
      }
    }

    // Sort by gravity score descending
    weightedResults.sort((a, b) => b.physics.gravity_score - a.physics.gravity_score);

    return weightedResults;
  }

  /**
   * Tag-seeded physics walk for virtual/mol anchors.
   * Uses anchor tags to find connected atoms in the tags table.
   */
  async applyPhysicsWeightingFromTags(
    anchorResults: SearchResult[],
    threshold: number = 0.1,
    config?: Partial<SearchConfig>
  ): Promise<PhysicsResult[]> {
    if (anchorResults.length === 0) return [];

    const walkRadius = config?.walk_radius ?? 1;
    const maxPerHop = config?.max_per_hop ?? 50;
    const temperature = config?.temperature ?? 0.2;
    const gravityThreshold = config?.gravity_threshold ?? threshold;

    const anchorTags = Array.from(
      new Set(anchorResults.flatMap(r => (r.tags || []).filter(Boolean)))
    );
    if (anchorTags.length === 0) return [];

    // Get connected nodes based on tag overlap
    const connectedNodes = await this.getConnectedNodesFromTags(anchorTags, maxPerHop * 2);

    // Create anchor node representations (virtual/mol anchors are ok)
    const anchorNodes: WalkerNode[] = anchorResults.map(r => ({
      atomId: r.id,
      sharedTags: 1,
      timestamp: r.timestamp,
      simhash: this.safeParseHex(r.molecular_signature)
    }));

    const weightedResults: PhysicsResult[] = [];

    for (const targetNode of connectedNodes) {
      let maxWeight = 0;
      let bestAnchorId = anchorNodes[0]?.atomId || '';
      let bestAnchorNode = anchorNodes[0];

      for (const anchorNode of anchorNodes) {
        const weight = this.calculateBondWeight(anchorNode, targetNode);
        if (weight > maxWeight) {
          maxWeight = weight;
          bestAnchorId = anchorNode.atomId;
          bestAnchorNode = anchorNode;
        }
      }

      if (!bestAnchorNode) continue;

      if (maxWeight > gravityThreshold) {
        const hammingDist = this.calculateHammingDistance(
          bestAnchorNode.simhash,
          targetNode.simhash
        );
        let connectionType: ConnectionType = 'tag_walk_neighbor';
        let linkReason = `via ${targetNode.sharedTags} shared tag(s)`;

        if (hammingDist <= 3) {
          connectionType = 'direct_simhash';
          linkReason = `simhash hamming: ${hammingDist}`;
        } else if (targetNode.sharedTags <= 1 && temperature > 0.1) {
          connectionType = 'serendipity';
          linkReason = `serendipity sample (temp: ${temperature.toFixed(1)})`;
        }

        const timeDeltaMs = Math.abs(bestAnchorNode.timestamp - targetNode.timestamp);
        if (timeDeltaMs < 3600000 && connectionType === 'tag_walk_neighbor') {
          connectionType = 'temporal_neighbor';
          linkReason = `temporal proximity: ${this.formatTimeDrift(timeDeltaMs)}`;
        }

        const frequency = targetNode.frequency || 1;
        const isRecurring = frequency > 1 || targetNode.sharedTags >= 3;

        const result: SearchResult = {
          id: targetNode.atomId,
          content: targetNode.content || '',
          source: targetNode.source || '',
          timestamp: targetNode.timestamp,
          buckets: [],
          tags: targetNode.tags || [],
          epochs: '',
          provenance: targetNode.provenance || 'internal',
          score: maxWeight,
          molecular_signature: targetNode.simhash.toString(),
          frequency: frequency,
          type: targetNode.type || 'thought',
          compound_id: targetNode.compoundId,
          start_byte: targetNode.startByte,
          end_byte: targetNode.endByte,
          temporal_state: {
            first_seen: targetNode.timestamp,
            last_seen: targetNode.timestamp,
            occurrence_count: frequency,
            timestamps: [targetNode.timestamp]
          }
        };

        const physics: PhysicsMetadata = {
          gravity_score: maxWeight,
          time_drift: this.formatTimeDrift(timeDeltaMs),
          is_recurring: isRecurring,
          frequency: frequency,
          connection_type: connectionType,
          source_anchor_id: bestAnchorId,
          link_reason: linkReason
        };

        weightedResults.push({ result, physics });
      }
    }

    weightedResults.sort((a, b) => b.physics.gravity_score - a.physics.gravity_score);
    return weightedResults;
  }

  /**
   * Legacy-compatible wrapper: returns SearchResult[] for backward compatibility
   * with the existing search pipeline.
   */
  async applyPhysicsWeightingLegacy(
    anchorResults: SearchResult[],
    threshold: number = 0.1
  ): Promise<SearchResult[]> {
    const results = await this.applyPhysicsWeighting(anchorResults, threshold);
    return results.map(r => r.result);
  }

  /**
   * Formats a millisecond time delta into human-readable drift string.
   */
  private formatTimeDrift(deltaMs: number): string {
    const hours = deltaMs / (1000 * 60 * 60);
    if (hours < 1) return `${Math.round(deltaMs / (1000 * 60))} minutes ago`;
    if (hours < 24) return `${Math.round(hours)} hours ago`;
    const days = hours / 24;
    if (days < 30) return `${Math.round(days)} days ago`;
    const months = days / 30;
    if (months < 12) return `${Math.round(months)} months ago`;
    return `${(months / 12).toFixed(1)} years ago`;
  }
}