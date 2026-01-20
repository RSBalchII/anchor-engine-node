# Standard 069: Intelligent Query Expansion Protocol

## 1. The Core Philosophy
**"Semantics for the Human, Tags for the Graph."**

While humans provide natural language queries, the Tag-Walker engine is most efficient when seeded with precise tags and entities. This protocol defines the use of an LLM (GLM 1.5B) to bridge the gap between human "intent" and graph "indices".

## 2. Expansion Workflow
When a query is marked as "Complex" or by default in high-precision modes:

1. **Tag Grounding**: The engine retrieves the **Top 50 most frequent tags** from the database.
2. **LLM Prompting**: The user query and the tag list are passed to the GLM.
3. **Decomposition**: The GLM is instructed to:
   - Identify literal entities (Names, Places, Technical Terms).
   - map abstract concepts to the most semantically similar tags from the provided list.
   - Output a list of "Expansion Tags".
4. **Weighted Execution**: The original query (FTS) is combined with the Expansion Tags (Tag Search) to find the Anchors for the Tag-Walker.

## 3. The Directive
The GLM must follow a strict persona:
- **Role**: Search Specialist for an Associative Graph.
- **Goal**: Convert natural language into a boolean-style set of high-recall tags.
- **Constraints**: Prefer existing tags from the system list; only invent new tags if absolutely necessary for the query's core meaning.

## 4. Performance Targets
- **Latency**: Expansion should add < 500ms to the search cycle.
- **Precision Improvement**: Increase "Anchor Hit Rate" for multi-intent queries by >40% compared to raw FTS.
