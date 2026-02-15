
# Standard 061: Context Management Logic

**Supersedes**: N/A (New Standard)
**Effective Date**: 2026-01-16
**Status**: Active

## 1. Rolling Context Assembly
ECE_Core uses a "Middle-Out" budgeting strategy to maximize context relevance while preserving narrative flow.

### 1.1 Selection Pipeline
1.  **Temporal Analysis**:
    *   If query contains `["recent", "latest", "today", "now", "current"]`:
        *   **Recency Weight**: 60%
        *   **Relevance Weight**: 40%
    *   Otherwise:
        *   **Recency Weight**: 30%
        *   **Relevance Weight**: 70%
2.  **Scoring**: Atoms are ranked by `MixedScore` (Relevance * W1 + Recency * W2).
3.  **Budgeting**: Atoms fill the `TokenBudget` starting from highest score.

### 1.2 Safety Constraints
- **Token Buffer**: The target budget is effectively `min(ConfiguredBudget, 3800)` to provide a ~300 token safety margin against CJK/multibyte inflation and tokenizer mismatches.
- **Smart Slicing**:
    *   Atoms are NOT cut mid-sentence.
    *   The slicer looks for punctuation (`.`, `!`, `?`, `\n`) within the last 50-100 characters of the remaining budget.
    *   If no punctuation is found, it falls back to a hard cut with `...`

### 1.3 Assembly
- **Re-Sorting**: After selection, atoms are re-sorted **Chronologically** to present a linear narrative to the LLM.
- **Formatting**: Each atom is prefixed with `[Source: <filename>] (<ISO-Date>)`.
- **Inflation**: See [085-context-inflation](./085-context-inflation.md). Atoms are inflated into coherent windows before budgeting.
