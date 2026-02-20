# Fix context-inflator to use Buffer.subarray for byte offsets

**Commit:** f63deeb5ebb5d4497db43268a662138ead7913e4
**Date:** 2026-02-06T19:20:10
**Timestamp:** 1770430810

## Description

- Changed from string.substring() to Buffer.subarray() for correct byte-based slicing
- This ensures non-ASCII text is extracted correctly from files

Co-authored-by: RSBalchII <128771311+RSBalchII@users.noreply.github.com>

---
#git #commit #code #anchor-engine-sync
