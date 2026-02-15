/**
 * Graph-Context Protocol (GCP) — Type Definitions
 * 
 * The Neuro-Symbolic Bridge between the Physics Engine (PGlite/SQL)
 * and the Local LLM (Creative Reasoning).
 * 
 * Design Principles:
 * - High Signal-to-Token Ratio: Every byte fed to the LLM must carry meaning.
 * - Deterministic Provenance: The LLM can trace WHY a memory was surfaced.
 * - Federated Sovereignty: User context adapts the graph without changing code.
 * 
 * Mathematical Foundations (Unified Field Equation):
 *   Weight = BaseCo-occurrence × TemporalDecay × SimhashGravity × Damping
 *   Where:
 *     TemporalDecay = e^(-λΔt)
 *     SimhashGravity = 1 - (HammingDistance / 64)
 *     Damping = α (default 0.85)
 */

// =============================================================================
// USER CONTEXT — Federated Sovereignty
// =============================================================================

export interface UserContext {
  /** User identifier (e.g., "rsb", "dory") */
  name: string;
  /** Current state of the user — grounds the LLM's tone and priority */
  current_state: string;
}

// =============================================================================
// QUERY INTENT — What the user is asking for
// =============================================================================

export type QueryIntent = 'factual' | 'emotional' | 'creative' | 'temporal' | 'relational';

export interface QueryContext {
  /** The raw user query text */
  text: string;
  /** Unix timestamp of the query */
  timestamp: number;
  /** Detected intent category */
  intent: QueryIntent;
  /** NLP-extracted key terms */
  keyTerms: string[];
  /** Explicit scope tags (e.g., #work, #health) */
  scopeTags: string[];
}

// =============================================================================
// PHYSICS METADATA — Why a memory was surfaced
// =============================================================================

/** How the node was discovered by the search engine */
export type ConnectionType =
  | 'direct_fts'           // Full-text search hit (Planet)
  | 'direct_simhash'       // SimHash near-duplicate match (Planet)
  | 'tag_walk_neighbor'    // Physics engine co-occurrence (Moon)
  | 'temporal_neighbor'    // Temporally adjacent memory (Moon)
  | 'serendipity'          // Weighted reservoir sample (Moon — lucky find)
  | 'engram_hit'           // O(1) engram cache hit (Planet)
  | 'walk_fallback';       // Traditional walk fallback (Moon)

export interface PhysicsMetadata {
  /** 
   * Final weight from the Unified Field Equation (0.0 - 1.0+ normalized).
   * This IS the "gravity" of this memory toward the current thought.
   */
  gravity_score: number;

  /** Human-readable time distance (e.g., "2 hours ago", "3 days ago") */
  time_drift: string;

  /** 
   * Whether this thought has been encountered multiple times.
   * High frequency = core belief / obsession. The LLM should treat these as axioms.
   */
  is_recurring: boolean;

  /** How many times this thought has been recorded */
  frequency: number;

  /** How this node was discovered */
  connection_type: ConnectionType;

  /** ID of the anchor node that led to this discovery (for Walker results) */
  source_anchor_id?: string;

  /** The specific link reason (e.g., "via tag: sovereignty", "hamming: 3") */
  link_reason?: string;
}

// =============================================================================
// MEMORY NODE — A single unit of recalled thought
// =============================================================================

export interface MemoryNode {
  /** Unique atom/molecule ID */
  id: string;

  /** The actual content text */
  content: string;

  /** Source file path or origin */
  source: string;

  /** Content type classification */
  type: string;

  /** Associated tags */
  tags: string[];

  /** Provenance: internal (sovereign) or imported */
  provenance: string;

  /** Unix timestamp */
  timestamp: number;

  /** The physics metadata explaining WHY this memory is here */
  physics: PhysicsMetadata;
}

// =============================================================================
// CONTEXT PACKAGE — The complete graph payload for the LLM
// =============================================================================

export interface ContextPackage {
  /** Who are we talking to? */
  userContext: UserContext;

  /** What are they asking? */
  query: QueryContext;

  /** 
   * The "Planets" — Direct search hits.
   * These are the heavy objects that explicitly match the query.
   */
  anchors: MemoryNode[];

  /**
   * The "Moons" — Physics-discovered associations.
   * These orbits the anchors via shared tags, temporal proximity, or simhash gravity.
   */
  associations: MemoryNode[];

  /** 
   * Aggregate statistics for the LLM to calibrate confidence.
   */
  graphStats: {
    /** Total nodes in this package */
    totalNodes: number;
    /** How full the context budget is (0-100%) */
    budgetUtilization: number;
    /** Average gravity score across all results */
    avgGravity: number;
    /** Number of recurring themes detected */
    recurringThemes: number;
    /** Token estimate for this package */
    estimatedTokens: number;
  };
}

// =============================================================================
// SEARCH CONFIGURATION — Tuning the Physics Engine
// =============================================================================

export interface SearchConfig {
  /** Max direct search results ("Planets") */
  direct_limit: number;

  /** Max physics-walked results ("Moons") */
  walker_limit: number;

  /**
   * Serendipity temperature (0.0 - 1.0).
   * 0.0 = Strict: only strongest connections. Deterministic.
   * 0.2 = Default: mostly strong, occasionally surprising.
   * 1.0 = Chaotic: maximum randomness in neighbor selection.
   */
  temperature: number;

  /** Minimum gravity score to include a walker result */
  gravity_threshold: number;

  /** Number of hops in the radial inflation */
  walk_radius: number;

  /** Maximum nodes per hop (prevents explosion) */
  max_per_hop: number;
}

/** Sensible defaults — these match the existing hyperparameters */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  direct_limit: 5,
  walker_limit: 10,
  temperature: 0.2,
  gravity_threshold: 0.01,
  walk_radius: 1,
  max_per_hop: 50,
};
