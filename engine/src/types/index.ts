/**
 * Anchor Engine Type Definitions — Barrel File
 *
 * Per doc_policy.md: Modular Architecture with API-First Design.
 * All types are defined in domain-specific files and re-exported here.
 *
 * ## Domain Files:
 * - atomic.ts:           Compound → Molecule → Atom hierarchy
 * - api.ts:              Request/Response interfaces (Menu, SearchRequest, SearchResponse)
 * - taxonomy.ts:         SemanticCategory enum (Standard 084)
 * - context-protocol.ts: Graph-Context Protocol types
 * - tool-call.ts:        Structured function execution types
 * - trace.ts:            Performance and diagnostic tracking
 */

// 1. Atomic Taxonomy (Core Data Model)
export type { Atom, Molecule, Compound } from './atomic.js';

// 2. API Layer (Request/Response)
export type { Menu, SearchRequest, SearchResponse } from './api.js';

// 3. Semantic Taxonomy
export { SemanticCategory } from './taxonomy.js';

// 4. Graph-Context Protocol
export type {
    ContextPackage,
    MemoryNode,
    PhysicsMetadata,
    UserContext,
    QueryContext,
    QueryIntent,
    ConnectionType,
    SearchConfig,
} from './context-protocol.js';

export { DEFAULT_SEARCH_CONFIG } from './context-protocol.js';