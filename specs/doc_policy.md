# Documentation Policy

## 1. Core Philosophy
Documentation in Anchor Engine must be **concise**, **accurate**, and **maintainable**. We prioritize high-signal technical writing over verbose explanations.

## 2. Document Locations

### Root Directory (`/`)
**ONLY** the following files are allowed in the root:
- `README.md` - Project overview, quickstart, API reference
- `CHANGELOG.md` - Version history and release notes
- `LICENSE` - License file
- `.gitignore` - Git ignore patterns
- `package.json` - Package configuration
- Source code directories (`src/`, `specs/`, `docs/`, `tests/`, etc.)

**PROHIBITED** in root:
- Phase completion reports
- Implementation summaries
- Git operation logs
- Temporary documentation files
- Any other `.md` files not listed above

### Specs Directory (`/specs/`)
**ALLOWED** files:
- `spec.md` - Main technical specification
- `tasks.md` - Implementation task list
- `plan.md` - Development plan
- `standards/` - Architecture standards (001-114)
- `standards/doc_policy.md` - This document

**PROHIBITED** in specs:
- Duplicate documentation already in README
- Phase reports or implementation logs

### Docs Directory (`/docs/`)
**ALLOWED** files:
- `STAR_Whitepaper.md` - STAR algorithm whitepaper
- `benchmarking.md` - Performance benchmarks
- Technical reference documentation
- Architecture diagrams

**PROHIBITED** in docs:
- Temporary files
- Unfinished drafts

## 3. Documentation Standards

### README.md
- Quick start guide (5-minute setup)
- Core features overview
- API reference
- Architecture overview
- Configuration guide
- Performance benchmarks (summary)

### CHANGELOG.md
- Follow [Keep a Changelog](https://keepachangelog.com/) format
- Semantic versioning (MAJOR.MINOR.PATCH)
- Group changes by: Added, Changed, Deprecated, Removed, Fixed, Security
- Include date and version number
- Link to GitHub releases when applicable

### Standards (specs/standards/)
- Numbered format: `standard-XXX-title.md`
- Include: Purpose, Problem Statement, Solution, Implementation Details, Testing
- Reference related standards
- Include code examples where applicable

## 4. Prohibited Documentation Patterns

**DO NOT CREATE:**
- Phase completion reports (PHASE_1_COMPLETE.md, etc.)
- Implementation update logs (BATCHING_UPDATE.md, etc.)
- Git operation logs (GIT_PUSH_COMPLETE.md, etc.)
- Consolidation summaries (DOCS_CONSOLIDATION_SUMMARY.md, etc.)
- Standard implementation reports (STANDARD_109_IMPLEMENTATION.md, etc.)

**INSTEAD:**
- Update README.md with new features
- Update CHANGELOG.md with version changes
- Update or create standards in specs/standards/
- Update specs/spec.md with architectural changes

## 5. Maintenance

### Before Merging PR
- [ ] Verify no prohibited files in root
- [ ] Ensure all new features documented in README or CHANGELOG
- [ ] Update relevant standards if architecture changed
- [ ] Remove temporary documentation files

### Automated Checks
Future CI/CD should:
- Reject PR with prohibited .md files in root
- Verify CHANGELOG.md updated for version changes
- Check README.md includes new features

## 6. Rationale

**Why this policy?**
- Prevents documentation sprawl
- Ensures single source of truth
- Makes finding information easier
- Reduces maintenance burden
- Keeps repository clean and professional

**What to do with implementation notes?**
1. Update relevant standard (if architectural)
2. Add to CHANGELOG (if user-facing change)
3. Add to README (if new feature)
4. Delete temporary notes after integration

---

**Last Updated:** February 20, 2026  
**Version:** 2.0 (Restructured for clarity)
