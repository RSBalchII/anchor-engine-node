# Use escapeIdentifier() consistently for SELECT fields

**Commit:** c7abeecf952edc3f2a6f1c0bbee3e516f91c7fd2
**Date:** 2026-02-06T21:09:13
**Timestamp:** 1770437353

## Description

- Changed SELECT field escaping to use escapeIdentifier() method
- Ensures consistency with FROM/WHERE/ORDER BY identifier handling
- Strengthens defense-in-depth by applying validation at escape time
- All security tests pass

Co-authored-by: RSBalchII <128771311+RSBalchII@users.noreply.github.com>

---
#git #commit #code #anchor-engine-sync
