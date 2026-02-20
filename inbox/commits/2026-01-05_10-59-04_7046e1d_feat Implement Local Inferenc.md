# feat: Implement Local Inference Cockpit and Multi-Bucket Schema

**Commit:** 7046e1d06c232925a8d372e6a68534bf15c8b61b
**Date:** 2026-01-05T10:59:04
**Timestamp:** 1767635944

## Description

- Added interface/chat.html for direct model control and manual context injection.
- Integrated
ode-llama-cpp v3 in ngine/src/services/inference.js with dynamic model loading.
- Updated ngine/src/services/search.js to support bucket-based filtering and sanitized FTS queries.
- Implemented multi-bucket schema in ngine/src/core/db.js and ingest.js.
- Added ngine/src/services/dreamer.js for background memory organization.
- Updated API routes in ngine/src/routes/api.js to expose inference and bucket endpoints.
- Added architecture specs for the new features.

---
#git #commit #code #anchor-engine-sync
