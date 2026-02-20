# Fix fileTimestamp fallback to handle 0 as valid timestamp

**Commit:** 3dc7f5c55495393ac0918bc31ccadb6b540c5403
**Date:** 2026-02-06T19:11:57
**Timestamp:** 1770430317

## Description

Use explicit null/undefined check instead of falsy check to prevent treating timestamp 0 (Unix epoch) as invalid.

Co-authored-by: RSBalchII <128771311+RSBalchII@users.noreply.github.com>

---
#git #commit #code #anchor-engine-sync
