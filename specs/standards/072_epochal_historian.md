# Standard 072: Epochal Historian Architecture (Hybrid)

## 1. Core Philosophy
The Dreamer acts as a **Historian**, organizing memory into a searchable timeline.
To maintain speed and search relevance ($70/30$), we use a **Hybrid Approach**:
*   **Granular (Episodes)**: Deterministic, Metadata-Rich, Fast.
*   **High-Level (Epochs)**: Narrative, Reflective, Slow.

## 2. Context-Aware Sorting
**Rule**: Trust the content, then the file.
1.  **Extraction**: Scan first 500 chars for `[YYYY-MM-DD]` or `January 1st, 2024`.
2.  **Sort**: Process memories by `narrative_timestamp` ASC.

## 3. The Abstraction Hierarchy

### Level 1: Episodes (Search Anchors)
*   **Technique**: **Deterministic Extraction** (No LLM).
*   **Tool**: `op-layer` (wink-nlp).
*   **Input**: Cluster of 5-25 atoms.
*   **Output**: `Episode` Node.
*   **Schema**:
    *   `content`: "Entities: [X, Y]. Topics: [A, B]. Range: [Start - End]."
    *   **Goal**: Provide high-density metadata for the Search weights.
*   **Cost**: O(1) ~0ms.

### Level 2: Epochs (The Narrative)
*   **Technique**: **Abstractive Summarization** (LLM).
*   **Input**: A sequential lists of `Episode` nodes filling context window.
*   **Output**: `Epoch` Node.
*   **Schema**:
    *   `content`: "A narrative summary of the week's events..."
    *   `meta`: Key URLs, Project Milestones.
*   **Goal**: Provide the "Big Picture" view for the User.
*   **Cost**: Once per Epoch (High latency acceptable).

## 4. Performance Constraints
*   **No LLM in Level 1**: Episodes MUST be generated via text analysis.
*   **Generators**: Use async iterators for all processing.
