# Anchor Documentation Policy

**Principle**: Dead stupid simple. One source of truth per topic. No duplication.

## Allowed Documentation Files (STRICT)

### Root Level (2 files):
1. **README.md** - Current state, goals, and quick start
   - Project overview and current capabilities
   - Goals and direction
   - Quick start guide
   - Current implementation status
2. **CHANGELOG.md** - Stateful project updates
   - All changes organized by date
   - Technical decisions and rationale
   - What was done, when, and why

### specs/ Directory (4 files):
1. **spec.md** - System architecture & design
   - Architecture diagrams and decisions
   - Component interactions
   - Technical implementation details
2. **plan.md** - Vision and implementation priorities
   - Project vision and philosophy
   - Strategic roadmap
   - Implementation priorities
3. **tasks.md** - Current work items and next steps
   - What's in progress
   - What's next
   - Dependencies between tasks
4. **doc_policy.md** - This file (documentation standards)
   - File structure rules
   - Documentation conventions
   - Maintenance guidelines

## Documentation Rules (ENFORCED)

1. ✅ **ONLY 6 TOTAL FILES** - README, CHANGELOG, spec.md, plan.md, tasks.md, doc_policy.md
2. ✅ **NO DUPLICATES** - Each concept documented in ONE place only
3. ✅ **STATEFUL IN CHANGELOG** - Completed work, decisions made → CHANGELOG
4. ✅ **GOALS IN README & specs/** - Direction, vision, priorities → README + plan.md
5. ✅ **CURRENT STATE IN README** - What works now → README
6. ✅ **ARCHITECTURE IN SPEC** - How it works → spec.md
7. ✅ **PRIORITIES IN PLAN** - What's next and why → plan.md + tasks.md
8. ✅ **MINIMAL CODE COMMENTS** - Explain WHY, not WHAT

## Document Roles

**README.md**:
- Current state of the project
- What works NOW
- Project goals and direction
- Quick start guide

**CHANGELOG.md**:
- Historical record
- Completed work
- Decisions made
- Migration history
- What was done and when

**spec.md**:
- Technical architecture
- How components work
- System design
- Implementation details

**plan.md**:
- Project vision
- Strategic priorities
- Future roadmap
- Why we're building this

**tasks.md**:
- Current work in progress
- Next steps
- Implementation priorities
- What's coming next

**doc_policy.md**:
- Documentation standards
- File structure rules
- Maintenance guidelines

## Structure

```
anchor/
├── README.md              ← Current state + goals + quick start
├── CHANGELOG.md           ← Historical record of changes
└── specs/
    ├── spec.md            ← Architecture & design
    ├── plan.md            ← Vision & priorities
    ├── tasks.md           ← Current work items
    └── doc_policy.md      ← This file (documentation standards)
```

**Total:** 6 documentation files (2 root + 4 specs)

**Philosophy:** Dead stupid simple. If you can't find it in these 6 files, it's not documented.

## Code & Architecture Standards (CRITIQUE-DRIVEN)

These standards are enforced to maintain project quality and consistency.

### Architecture
1. **Tiered Memory**: Explicit separation of hot (Redis) and cold (Neo4j) storage.
2. **Async-First**: Non-blocking I/O for all LLM and DB operations.
3. **Graph-R1**: Iterative graph retrieval over simple vector search.

### Code Quality
1. **No God Objects**: Components must be focused; avoid monolithic `main.py`.
2. **Type Safety**: Strict Pydantic models for all data structures.
3. **Centralized Prompts**: All LLM prompts must reside in `src/prompts.py`.

### Testing
1. **Mock-First**: Unit tests must not depend on live DBs.
2. **Integration Separation**: E2E tests must be marked and separated.

### Traceability & Maintenance (NEW)
1. **Traceability**: Automated maintenance or repair tools that write to the DB must generate and persist a `run_id` UUID per run and write it to created relationships (property name `r.auto_commit_run_id`). All runs must be auditable via CSV and runtime logs.
2. **Rollback Support**: Every write operation must be reversible: tools that create relationships must provide a rollback script that deletes relationships by run_id.
3. **Weaver Engine**: Any periodic agent that runs repairs (the Weaver) must be auditable, reversible, and integrated into a supervising agent (Archivist) that toggles, monitors, and logs activity.
4. **Audit Fields**: Relationship merges from automated tooling must include properties: `auto_commit_run_id`, `auto_commit_score`, `auto_commit_delta`, `auto_committed_by`, and `auto_commit_ts`.

## Alignment with ECE_Core

This policy mirrors ECE_Core's documentation approach with one addition:
- ECE_Core: 5 files (no doc_policy.md)
- Anchor: 6 files (adds doc_policy.md for clarity)

Both projects share the same philosophy: minimal, focused, single source of truth.
