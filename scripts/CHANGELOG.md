# Changelog

All notable changes to the `scripts/` module will be documented in this file.

## [Unreleased] - 2025-12-26

### Added
- **Smart GPU Bridge**: Added `StaticFiles` mount at `/models` to serve local model artifacts.
- **On-Demand Downloads**: Added `POST /v1/models/pull` and `GET /v1/models/pull/status` to handle server-side model downloading from Hugging Face.
- **Shared Module**: Integrated `scripts.download_models` for reusable download logic.

### Fixed
- **CORS/Auth Collision**: Reordered `CORSMiddleware` to wrap the entire application (including Auth middleware) to ensure CORS headers are sent even on 401 Unauthorized responses.
- **Authentication**: Exempted `/models` path from Token Verification to allow browser-side fetching of artifacts without credentials.
- **Import Error**: Fixed `ModuleNotFoundError` by changing import to `from download_models import ...` for direct script execution.
