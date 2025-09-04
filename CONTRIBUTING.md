# Contributing Guide (Spec-Kit)

Welcome! This repository uses the GitHub Spec-Kit methodology. All code changes must trace to an approved TASK in the specification package.

## Workflow Overview
1. Brownfield → Analyze current state (already provided under `specs/memory-management-system/`).
2. Greenfield → Propose spec changes for new work (update spec docs first, then code).
3. Implementation → Only after specs are approved, implement code for the corresponding TASK IDs.

## Task Traceability
- Every commit message must include at least one `TASK-XXX` ID.
- Each modified source file should include a header comment with the `TASK-XXX` it implements, e.g.:

```python
# TASK-011: Implement memory query endpoint
```

## Local Validation
- Regenerate the spec manifest and task map:
  - `make spec-index`
- Run validations:
  - `make spec-validate`
- Optional gap analysis:
  - `make spec-gap`

## Pre-commit Hooks
Install and enable hooks once:
```bash
make pre-commit-install
```
This enforces a TASK ID in commit messages and runs staged spec validation.

## Pull Requests
Use the PR template and ensure CI passes. Code without proper spec traceability will be blocked.

