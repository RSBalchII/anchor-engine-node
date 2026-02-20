# Fix context-inflator coordinate space mismatch

**Commit:** 3438b30700e3f4ab34617cfd722e117570c044e7
**Date:** 2026-02-06T19:14:12
**Timestamp:** 1770430452

## Description

Inflation now fetches from compound_body instead of raw file content.
This ensures byte offsets align with the sanitized content coordinate
space used during atomization. Fixes issue where sanitization changes
(BOM removal, newline normalization) caused offset mismatches.

Co-authored-by: RSBalchII <128771311+RSBalchII@users.noreply.github.com>

---
#git #commit #code #anchor-engine-sync
