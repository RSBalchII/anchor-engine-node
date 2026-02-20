# fix(search): Patch Bucket Leak & Add Dynamic Sort Order

**Commit:** ef75c95039843044f609fbe27eef2f0f8670cdfb
**Date:** 2026-02-04T00:30:57
**Timestamp:** 1770190257

## Description

- Security: Added bucket filter to 'Walk Phase' to prevent context leaks between sandboxes.\n- Feature: Added dynamic 'ORDER BY timestamp ASC' when query contains 'earliest' or 'oldest'.\n- Optimized 'LIMIT' placement in query construction.

---
#git #commit #code #anchor-engine-sync
