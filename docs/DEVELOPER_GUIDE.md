# Developer Guide (Spec-Kit)

This guide explains how to work within the Spec-Kit guardrails for the ECE project.

## Commands
- `make spec-index` → regenerate spec manifest and task map from the specs
- `make spec-validate` → run validations (required docs, manifest drift, TASK-ID headers)
- `make spec-gap` → report any source files missing TASK-ID headers



## Code Annotation Standard
Every source file changed for a task should include a header comment indicating the TASK ID:

```python
# TASK-030: Create Context Builder class
```

## Writing Specs First
For any new functionality:
1. Update `specs/memory-management-system/feature-spec.md` and `implementation-plan.md`
2. Add or update entries in `tasks.md` (include ID, priority, effort, and Done criteria)
3. Regenerate the manifest (`make spec-index`)
4. Implement code with TASK headers and commit messages referencing `TASK-XXX`

## CI
The GitHub Action `.github/workflows/spec-check.yml` enforces the same checks on PRs.

