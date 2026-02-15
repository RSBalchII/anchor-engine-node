/**
 * Graph-Context Serializer
 * 
 * Transforms the Physics Engine output into a dense, token-efficient format
 * that the Local LLM can read as structured context.
 * 
 * Design Goal: HIGH SIGNAL-TO-TOKEN RATIO.
 * The LLM doesn't need pretty UI — it needs dense, structured signal.
 * Every byte must carry meaning.
 * 
 * Two output modes:
 * 1. serializeForLLM()  — Produces the compact [CONTEXT_GRAPH] text block.
 *                         This is what gets injected into the LLM's prompt.
 * 2. serializeToJSON()  — Produces the full ContextPackage JSON.
 *                         Used for debugging, API responses, and UI rendering.
 */

import type {
  ContextPackage,
  MemoryNode,
  PhysicsMetadata,
  UserContext,
  QueryContext,
  QueryIntent,
  ConnectionType,
  SearchConfig,
  DEFAULT_SEARCH_CONFIG,
} from '../../types/context-protocol.js';

import { SearchResult } from './search.js';
import { PhysicsResult } from './physics-tag-walker.js';

// =============================================================================
// INTENT DETECTION — Lightweight, no LLM needed
// =============================================================================

const EMOTIONAL_SIGNALS = ['feel', 'feeling', 'tired', 'frustrated', 'happy', 'sad', 'angry', 'anxious', 'stressed', 'burned', 'burnout', 'overwhelmed', 'excited', 'hopeful', 'lost', 'stuck'];
const TEMPORAL_SIGNALS = ['when', 'recently', 'lately', 'last', 'yesterday', 'today', 'this week', 'this month', 'ago', 'since', 'between', 'before', 'after'];
const RELATIONAL_SIGNALS = ['and', 'with', 'told', 'said', 'met', 'called', 'texted', 'about', 'between'];
const CREATIVE_SIGNALS = ['idea', 'brainstorm', 'imagine', 'what if', 'could we', 'design', 'build', 'create', 'invent', 'explore'];

/**
 * Detect the likely intent of a query without using the LLM.
 */
export function detectIntent(query: string): QueryIntent {
  const q = query.toLowerCase();
  
  const scores: Record<QueryIntent, number> = {
    emotional: 0,
    temporal: 0,
    relational: 0,
    creative: 0,
    factual: 0,
  };

  EMOTIONAL_SIGNALS.forEach(s => { if (q.includes(s)) scores.emotional += 2; });
  TEMPORAL_SIGNALS.forEach(s => { if (q.includes(s)) scores.temporal += 2; });
  RELATIONAL_SIGNALS.forEach(s => { if (q.includes(s)) scores.relational += 1; });
  CREATIVE_SIGNALS.forEach(s => { if (q.includes(s)) scores.creative += 2; });

  // Default to factual
  scores.factual = 1;

  // Return highest scoring intent
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][0] as QueryIntent;
}

// =============================================================================
// SERIALIZER — SearchResult → MemoryNode
// =============================================================================

/**
 * Convert a SearchResult + PhysicsMetadata into a MemoryNode.
 */
function toMemoryNode(result: SearchResult, physics: PhysicsMetadata): MemoryNode {
  return {
    id: result.id,
    content: result.content || '',
    source: result.source || '',
    type: result.type || 'thought',
    tags: result.tags || [],
    provenance: result.provenance || 'internal',
    timestamp: result.timestamp,
    physics,
  };
}

/**
 * Convert direct search results (anchors/planets) into MemoryNodes.
 * These get 'direct_fts' connection type and a normalized gravity score.
 */
function anchorsToMemoryNodes(anchors: SearchResult[]): MemoryNode[] {
  if (anchors.length === 0) return [];

  // Normalize scores relative to the best anchor
  const maxScore = Math.max(...anchors.map(a => a.score || 1));
  const now = Date.now();

  return anchors.map(anchor => {
    const normalizedScore = maxScore > 0 ? (anchor.score || 0) / maxScore : 0;
    const timeDeltaMs = Math.abs(now - anchor.timestamp);
    const frequency = anchor.frequency || 1;

    const physics: PhysicsMetadata = {
      gravity_score: normalizedScore,
      time_drift: formatTimeDrift(timeDeltaMs),
      is_recurring: frequency > 1,
      frequency,
      connection_type: 'direct_fts',
      link_reason: 'direct search match',
    };

    return toMemoryNode(anchor, physics);
  });
}

/**
 * Convert PhysicsResult[] (walker output) into MemoryNodes.
 */
function walkerToMemoryNodes(walkerResults: PhysicsResult[]): MemoryNode[] {
  return walkerResults.map(pr => toMemoryNode(pr.result, pr.physics));
}

// =============================================================================
// TIME FORMATTING
// =============================================================================

function formatTimeDrift(deltaMs: number): string {
  const hours = deltaMs / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(deltaMs / (1000 * 60))}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d ago`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months)}mo ago`;
  return `${(months / 12).toFixed(1)}y ago`;
}

// =============================================================================
// LLM TEXT SERIALIZER — The Dense Format
// =============================================================================

const CHARS_PER_TOKEN = 4;

/**
 * Serialize a ContextPackage into the compact [CONTEXT_GRAPH] text block.
 * 
 * This is the format the LLM sees. Every character must carry signal.
 * 
 * Format:
 *   [CONTEXT_GRAPH_START]
 *   user: @name
 *   state: current_state
 *   
 *   // DIRECT HITS (Planets)
 *   [N:id] (freq:N) "content truncated to budget"
 *      -> [Themes: tag1, tag2]
 *   
 *   // ASSOCIATED MEMORIES (Moons)
 *   [N:id] [W:0.85|type] "content"
 *      -> LINKED_TO: [N:anchorId] (reason)
 *   
 *   [CONTEXT_GRAPH_END]
 */
export function serializeForLLM(pkg: ContextPackage, charBudget?: number): string {
  const budget = charBudget || Infinity;
  let output = '';
  let currentChars = 0;

  // Header
  const header = `[CONTEXT_GRAPH_START]\nuser: @${pkg.userContext.name}\nstate: ${pkg.userContext.current_state}\n`;
  output += header;
  currentChars += header.length;

  // Query echo (helps LLM understand the task)
  const queryLine = `intent: ${pkg.query.intent} | terms: ${pkg.query.keyTerms.join(', ')}\n\n`;
  output += queryLine;
  currentChars += queryLine.length;

  // 1. ANCHORS (Direct Hits / Planets)
  if (pkg.anchors.length > 0) {
    output += '// DIRECT HITS\n';
    currentChars += 16;

    for (const node of pkg.anchors) {
      if (currentChars >= budget * 0.95) break;

      const truncatedContent = truncateContent(node.content, Math.min(500, budget - currentChars - 100));
      const tagsStr = node.tags.length > 0 ? node.tags.slice(0, 5).join(', ') : 'none';
      
      const line = `[N:${shortId(node.id)}] (freq:${node.physics.frequency}) "${truncatedContent}"\n   -> [Themes: ${tagsStr}]\n`;
      output += line;
      currentChars += line.length;
    }
  }

  // 2. ASSOCIATIONS (Walker Results / Moons)
  if (pkg.associations.length > 0) {
    output += '\n// ASSOCIATED MEMORIES\n';
    currentChars += 24;

    for (const node of pkg.associations) {
      if (currentChars >= budget * 0.95) break;

      const truncatedContent = truncateContent(node.content, Math.min(400, budget - currentChars - 100));
      const typeLabel = connectionTypeLabel(node.physics.connection_type);
      const anchorRef = node.physics.source_anchor_id ? shortId(node.physics.source_anchor_id) : '?';
      const reason = node.physics.link_reason || node.physics.connection_type;
      
      const line = `[N:${shortId(node.id)}] [W:${node.physics.gravity_score.toFixed(2)}|${typeLabel}] "${truncatedContent}"\n   -> LINKED_TO: [N:${anchorRef}] (${reason})\n`;
      output += line;
      currentChars += line.length;
    }
  }

  // Footer
  const footer = `\n[CONTEXT_GRAPH_END]\n`;
  output += footer;

  return output;
}

/**
 * Truncate content to a character limit, cutting at the nearest sentence boundary.
 */
function truncateContent(content: string, maxChars: number): string {
  if (!content) return '';
  if (content.length <= maxChars) return content.replace(/\n/g, ' ').trim();
  
  const truncated = content.substring(0, maxChars);
  // Find last sentence boundary
  const lastDot = truncated.lastIndexOf('.');
  const lastBang = truncated.lastIndexOf('!');
  const lastQ = truncated.lastIndexOf('?');
  const bestCut = Math.max(lastDot, lastBang, lastQ);
  
  if (bestCut > maxChars * 0.5) {
    return truncated.substring(0, bestCut + 1).replace(/\n/g, ' ').trim();
  }
  return truncated.replace(/\n/g, ' ').trim() + '...';
}

/**
 * Shorten a UUID to its first 8 chars for token efficiency.
 */
function shortId(id: string): string {
  if (!id) return '?';
  // If it's a UUID, take first 8 chars
  if (id.length > 12) return id.substring(0, 8);
  return id;
}

/**
 * Map ConnectionType to a short label for the serialized format.
 */
function connectionTypeLabel(type: ConnectionType): string {
  switch (type) {
    case 'direct_fts':        return 'FTS';
    case 'direct_simhash':    return 'SIM';
    case 'tag_walk_neighbor':  return 'WALK';
    case 'temporal_neighbor':  return 'TIME';
    case 'serendipity':        return 'LUCK';
    case 'engram_hit':         return 'ENGR';
    case 'walk_fallback':      return 'FALL';
    default:                   return 'UNK';
  }
}

// =============================================================================
// FULL CONTEXT PACKAGE ASSEMBLY
// =============================================================================

export interface AssembleOptions {
  /** User context (who is asking) */
  user: UserContext;
  /** The raw query string */
  query: string;
  /** NLP-extracted key terms */
  keyTerms: string[];
  /** Explicit scope tags */
  scopeTags?: string[];
  /** Direct search results (Planets) */
  anchors: SearchResult[];
  /** Physics walker results (Moons) — optional, may be empty */
  walkerResults?: PhysicsResult[];
  /** Legacy walker results (SearchResult[]) for backward compat */
  legacyWalkerResults?: SearchResult[];
  /** Character budget for the serialized output */
  charBudget?: number;
}

/**
 * Assemble the full ContextPackage from search results.
 * This is the main entry point for the serializer.
 */
export function assembleContextPackage(opts: AssembleOptions): ContextPackage {
  const now = Date.now();
  const intent = detectIntent(opts.query);

  const queryContext: QueryContext = {
    text: opts.query,
    timestamp: now,
    intent,
    keyTerms: opts.keyTerms,
    scopeTags: opts.scopeTags || [],
  };

  // Convert anchors to MemoryNodes
  const anchorNodes = anchorsToMemoryNodes(opts.anchors);

  // Convert walker results to MemoryNodes
  let associationNodes: MemoryNode[];
  if (opts.walkerResults && opts.walkerResults.length > 0) {
    associationNodes = walkerToMemoryNodes(opts.walkerResults);
  } else if (opts.legacyWalkerResults && opts.legacyWalkerResults.length > 0) {
    // Backward compat: convert legacy SearchResult[] to MemoryNodes with inferred physics
    associationNodes = opts.legacyWalkerResults.map(r => {
      const timeDeltaMs = Math.abs(now - r.timestamp);
      const frequency = r.frequency || 1;
      const physics: PhysicsMetadata = {
        gravity_score: r.score || 0,
        time_drift: formatTimeDrift(timeDeltaMs),
        is_recurring: frequency > 1,
        frequency,
        connection_type: 'walk_fallback',
        link_reason: 'traditional walk',
      };
      return toMemoryNode(r, physics);
    });
  } else {
    associationNodes = [];
  }

  // Compute aggregate statistics
  const allNodes = [...anchorNodes, ...associationNodes];
  const totalNodes = allNodes.length;
  const avgGravity = totalNodes > 0
    ? allNodes.reduce((sum, n) => sum + n.physics.gravity_score, 0) / totalNodes
    : 0;
  const recurringThemes = allNodes.filter(n => n.physics.is_recurring).length;
  const totalChars = allNodes.reduce((sum, n) => sum + n.content.length, 0);
  const estimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN);
  const budgetUtilization = opts.charBudget 
    ? Math.min(100, (totalChars / opts.charBudget) * 100)
    : 0;

  return {
    userContext: opts.user,
    query: queryContext,
    anchors: anchorNodes,
    associations: associationNodes,
    graphStats: {
      totalNodes,
      budgetUtilization,
      avgGravity,
      recurringThemes,
      estimatedTokens,
    },
  };
}

/**
 * One-shot convenience: assemble + serialize for LLM consumption.
 * Returns the compact text block ready to inject into a prompt.
 */
export function assembleAndSerialize(opts: AssembleOptions): string {
  const pkg = assembleContextPackage(opts);
  return serializeForLLM(pkg, opts.charBudget);
}
