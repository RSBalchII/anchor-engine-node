# Fix byte offset vs string index mismatch in atomizer-service.ts

**Commit:** 3662b66b768bf82a13e2fcf6414987b23a541fd7
**Date:** 2026-02-06T19:19:37
**Timestamp:** 1770430777

## Description

- Added helper functions to compute true UTF-8 byte lengths
- Converted all string index calculations to byte offset calculations
- Updated CODE, DATA, and PROSE splitting strategies to use byte offsets
- Fixed size limit enforcement to use byte-based splitting
- Added comprehensive test for non-ASCII text (emoji, Chinese, mixed)

Co-authored-by: RSBalchII <128771311+RSBalchII@users.noreply.github.com>

---
#git #commit #code #anchor-engine-sync
