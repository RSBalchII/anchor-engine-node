# Documentation Policy

## 1. Source of Truth
- The code is the primary source of truth.
- `backend/src/agents/orchestrator/schemas.py` defines the reasoning structures.
- `backend/src/agents/orchestrator/prompts.py` defines the agent personas.

## 2. Allowed Documentation
- `README.md`: High-level overview and setup.
- `CONFIGURATION.md`: Environment variables and configuration.
- `CHANGELOG.md`: Version history.
- `CITATIONS.md`: References for the "Empirical Distrust" protocol.

## 3. Deprecated Documentation
- All legacy documentation in `backend/docs/` has been moved to `backend/archive/docs_removed/`.
- Do not rely on archived documentation for current implementation details.

## 4. Reality Constraint
- Documentation must not contradict the "Empirical Distrust" protocol.
- The system prioritizes retrieved memory and tool outputs over internal knowledge.

- Keep `CONFIGURATION.md` in sync with `src/config.py`.
