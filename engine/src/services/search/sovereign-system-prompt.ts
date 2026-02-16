/**
 * Sovereign System Prompt — The Narrator's Directive
 * 
 * This module generates the system prompt that instructs the Local LLM
 * on how to interpret the Graph-Context Protocol output.
 * 
 * The LLM is NOT the brain — it's the translator.
 * The Physics Engine (Tag-Walker + SQL) is the brain.
 * The LLM narrates the graph into human language.
 * 
 * Philosophy:
 * - "Trust the Physics": gravity_score dictates importance.
 * - "Respect the Rhythm": recurring themes are core beliefs, not noise.
 * - "Stay in the Graph": no hallucination outside the provided nodes.
 * - "Sovereignty": this system works offline, locally, with zero API dependency.
 */

import type { UserContext, QueryIntent } from '../../types/context-protocol.js';

// =============================================================================
// THE CORE SYSTEM PROMPT
// =============================================================================

/**
 * Generate the system prompt for Anchor OS.
 * This is injected as the system message before user + context.
 */
export function generateSystemPrompt(
  user: UserContext,
  intent?: QueryIntent
): string {
  const intentDirective = getIntentDirective(intent);

  return `You are the interface for Anchor OS, a sovereign memory system.

You have been provided with a Context Graph containing the user's memories. These memories have been retrieved using a physics-based relevance engine that calculates mathematical bonds between thoughts using:
- **Gravity Score**: How strongly a memory is attracted to the current query (0.0–1.0+).
- **Frequency**: How often the user has recorded similar thoughts. High frequency = core belief.
- **Connection Type**: Whether the memory was a direct match (FTS/SIM) or discovered via graph walk (WALK/TIME/LUCK).

Your Directives:

1. **Trust the Physics**: The gravity score indicates mathematical relevance. Prioritize high-gravity nodes. Do not second-guess the ranking.

2. **Respect the Rhythm**: If a memory has freq > 1, treat it as a recurring theme or deep concern. These are the user's mental anchors — acknowledge them.

3. **Synthesize, Don't List**: Do not regurgitate the memories verbatim. Weave them into a coherent answer that addresses the user's current state and query.

4. **Stay in the Graph**: Do not use outside knowledge unless the graph is insufficient AND the user explicitly asks. If the answer isn't in the graph, say: "That concept hasn't anchored yet."

5. **Trace Your Sources**: When referencing a specific memory, cite it by its node ID [N:xxxxxxxx] so the user can verify.

${intentDirective}

Current User: ${user.name}
Current State: ${user.current_state}`;
}

// =============================================================================
// INTENT-SPECIFIC DIRECTIVES
// =============================================================================

function getIntentDirective(intent?: QueryIntent): string {
  switch (intent) {
    case 'emotional':
      return `6. **Emotional Context**: The user is expressing or exploring feelings. Mirror their emotional language. Connect recurring emotional themes across memories. Be compassionate but honest — if the graph shows a pattern, name it gently.`;

    case 'temporal':
      return `6. **Temporal Context**: The user is asking about time-based patterns. Pay attention to the time_drift field and chronological ordering. Highlight how thoughts have evolved over time. If drift tracking shows a concept changing, narrate the evolution.`;

    case 'relational':
      return `6. **Relational Context**: The user is asking about people or relationships. Look for entity co-occurrences across memories. Identify patterns in how the user discusses specific people or groups.`;

    case 'creative':
      return `6. **Creative Context**: The user is brainstorming or exploring ideas. Give extra weight to LUCK (serendipity) connections — these are the unexpected associations that spark creativity. Connect distant nodes boldly.`;

    case 'factual':
    default:
      return `6. **Factual Context**: The user wants specific information. Be precise. Quote relevant content directly. If multiple memories contain the answer, synthesize them into a clear, authoritative response.`;
  }
}

// =============================================================================
// FULL PROMPT ASSEMBLY
// =============================================================================

/**
 * Compose the complete prompt: System + Context Graph + User Query.
 * 
 * This is the final output that goes to the LLM endpoint.
 * 
 * Token Budget Strategy:
 *   - System prompt:  ~300 tokens (fixed overhead)
 *   - Context graph:  Variable (the serialized [CONTEXT_GRAPH] block)
 *   - User query:     ~50-200 tokens
 *   - Generation:     Remaining budget for the LLM to respond
 * 
 * The context graph should consume the MAJORITY of the available budget.
 * The system prompt and query are the "micro amount of context to seed the generation."
 */
export function composeFullPrompt(
  systemPrompt: string,
  contextGraph: string,
  userQuery: string
): { system: string; user: string } {
  // The user message combines the context graph with the actual question.
  // This keeps the system prompt clean and the context in the user's "voice."
  const userMessage = `${contextGraph}\n\nMy question: ${userQuery}`;

  return {
    system: systemPrompt,
    user: userMessage,
  };
}

/**
 * Convenience: One-shot prompt composition from raw inputs.
 */
export function buildSovereignPrompt(
  user: UserContext,
  intent: QueryIntent,
  serializedGraph: string,
  query: string
): { system: string; user: string } {
  const systemPrompt = generateSystemPrompt(user, intent);
  return composeFullPrompt(systemPrompt, serializedGraph, query);
}
