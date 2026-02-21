# Standard 115: GitHub Repository Ingestion

**Status:** ACTIVE
**Date:** 2026-02-21
**Component:** Engine / Ingestion Service

## 1. Executive Summary

This standard establishes the **GitHub Repository Ingestion** protocol, enabling users to ingest entire GitHub repositories with a single click. The system downloads repository tarballs, extracts source files, and atomizes them into the knowledge graph with proper context preservation.

## 2. Core Problem

### The Issue (Manual Code Ingestion)
Developers working with AI assistants face significant friction when trying to provide project context:
*   **Tedious Copy-Paste**: Manually copying files or dragging individual files into chat
*   **Lost Context**: File relationships, directory structure, and project organization are lost
*   **Stale Snapshots**: No easy way to refresh the AI's understanding when code changes
*   **Rate Limiting Concerns**: Unauthenticated GitHub API calls limited to 60/hour

### The Resolution (Standard 115)
A **manual-trigger ingestion system** that:
*   **One-Click Ingest**: Paste GitHub URL → entire repo atomized in seconds
*   **Preserves Context**: Directory structure encoded in `source_path` for each atom
*   **Manual Refresh**: User clicks [Sync Now] when code changes
*   **Simple Architecture**: No scheduler complexity, no delta detection overhead

## 3. Architecture

### 3.1. Data Flow

```
User pastes GitHub URL
         ↓
Parse URL → {owner, repo, branch}
         ↓
Download tarball from GitHub API
    (https://api.github.com/repos/{owner}/{repo}/tarball/{branch})
         ↓
Extract to temp directory
         ↓
Walk directory tree (skip binaries, node_modules, .git, etc.)
         ↓
For each source file:
    - Read content
    - Atomize (molecules → atoms)
    - Tag with #github, #code, #language:{detected}
    - Store with source_path: "github:{owner}/{repo}/{filepath}"
         ↓
Quarantine old atoms from same repo (if re-syncing)
         ↓
Update registry with stats
         ↓
Cleanup temp directory
```

### 3.2. Database Schema

```sql
-- GitHub Repository Registry
CREATE TABLE github_repos (
  id TEXT PRIMARY KEY,              -- ULID or UUID
  owner TEXT NOT NULL,              -- GitHub org/user
  repo TEXT NOT NULL,               -- Repository name
  branch TEXT DEFAULT 'main',       -- Branch to sync
  bucket TEXT NOT NULL,             -- Anchor bucket for atoms
  github_url TEXT NOT NULL,         -- Original URL for reference
  last_synced_at TIMESTAMP,         -- Last successful sync
  last_sync_status TEXT,            -- 'success', 'failed', 'in_progress'
  last_error TEXT,                  -- Error message if failed
  total_files INTEGER DEFAULT 0,    -- Files ingested
  total_atoms INTEGER DEFAULT 0,    -- Atoms created
  total_size_bytes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3. File Exclusion Patterns

**Hardcoded Exclusions** (never ingest):
```
node_modules/**
.git/**
dist/**
build/**
target/**
vendor/**
*.bin
*.exe
*.dll
*.so
*.dylib
*.png, *.jpg, *.gif, *.svg, *.ico
*.pdf, *.doc, *.docx
*.lock (package-lock.json, Cargo.lock, etc.)
```

**Binary Detection**:
- Check for null bytes in first 8KB
- Skip files that fail UTF-8 decoding

## 4. Implementation Details

### 4.1. GitHubIngestService

**Location:** `engine/src/services/ingest/github-ingest-service.ts`

**Key Methods:**

```typescript
class GitHubIngestService {
  // Parse GitHub URL into components
  parseGitHubUrl(url: string): { owner: string; repo: string; branch: string }
  
  // Download tarball with optional auth token
  downloadTarball(owner: string, repo: string, branch: string, token?: string): Promise<string>
  
  // Extract tarball to temp directory
  extractTarball(tarballPath: string): Promise<string>
  
  // Walk directory, apply exclusions, return file list
  walkDirectory(dir: string, options: { exclude: string[] }): Promise<FileInfo[]>
  
  // Check if file is binary
  isBinaryFile(filePath: string): Promise<boolean>
  
  // Detect language from file extension
  detectLanguage(filePath: string): string
  
  // Register new repo in database
  registerRepo(url: string, bucket: string): Promise<RepoRecord>
  
  // Sync repo (download + extract + ingest)
  syncRepo(repoId: string): Promise<SyncResult>
  
  // List all registered repos
  listRepos(): Promise<RepoRecord[]>
  
  // Remove repo and quarantine its atoms
  removeRepo(repoId: string): Promise<void>
}
```

### 4.2. API Endpoints

**Base Path:** `/v1/github`

```typescript
// Register new repo and trigger initial ingestion
POST /v1/github/repos
Body: { url: string, bucket: string }
Response: { id: string, status: 'ingesting', message: string }

// List all registered repos
GET /v1/github/repos
Response: RepoRecord[]

// Manual sync trigger (re-ingest entire repo)
POST /v1/github/repos/:id/sync
Response: { status: 'syncing', message: string }

// Remove repo from registry
DELETE /v1/github/repos/:id
Response: { status: 'removed', quarantined_atoms: number }

// Check GitHub API rate limit status
GET /v1/github/rate-limit
Response: { 
  limit: number, 
  remaining: number, 
  reset_at: string,
  authenticated: boolean
}
```

### 4.3. Rate Limit Handling

**GitHub API Limits:**
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour

**Strategy:**
1. Check `X-RateLimit-Remaining` header on each API call
2. If remaining < 5, return error: "GitHub API rate limit exceeded. Try again in {reset_time}"
3. Support optional `GITHUB_TOKEN` env var for authenticated requests
4. Tarball downloads count as 1 request each

### 4.4. Atom Tagging Convention

**Standard Tags for GitHub Ingestion:**
```
#github              - All GitHub-ingested content
#code                - Source code files
#language:{lang}     - Detected language (e.g., #language:typescript)
#path:{directory}    - Top-level directory (e.g., #path:src, #path:tests)
#repo:{owner}/{repo} - Repository identifier
```

**Source Path Format:**
```
github:{owner}/{repo}/{relative_path}
Example: github:RSBalchII/anchor-engine-node/engine/src/index.ts
```

### 4.5. Re-Sync Behavior

When user clicks [Sync Now]:
1. Mark all atoms with `source_path LIKE 'github:{owner}/{repo}/%'` as `#quarantined`
2. Download fresh tarball
3. Ingest all files as new atoms
4. Update `last_synced_at`, `total_files`, `total_atoms` in registry

**Rationale:** Simple approach avoids complex delta detection. Quarantine preserves history if needed for debugging.

## 5. UI Integration

### 5.1. GitHub Panel Component

**Location:** Added to `engine/public/index.html`

**Features:**
- List of registered repos with status indicators
- [Add Repo] button → modal with URL + bucket inputs
- Per-repo actions: [Sync Now] [Remove]
- Display: last synced time, file count, atom count, status

**Status Indicators:**
- ✅ `success` - Last sync successful
- ⏳ `in_progress` - Currently syncing
- ❌ `failed` - Last sync failed (show error on hover)

### 5.2. Example UI Flow

```jsx
// Add Repo Modal
1. User clicks [Add Repo]
2. Modal opens with:
   - GitHub URL input (placeholder: "https://github.com/owner/repo")
   - Bucket input (default: "github/{repo-name}")
   - [Add & Ingest] button
3. User submits → modal closes, repo appears in list with "⏳ Ingesting..."
4. Poll status every 2s until complete
5. Update UI with final stats
```

## 6. Configuration

### 6.1. Environment Variables

```bash
# Optional: GitHub token for higher rate limits
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Optional: Custom exclusion patterns (comma-separated)
GITHUB_EXCLUDE_PATTERNS=node_modules/**,.git/**,dist/**
```

### 6.2. user_settings.json

```json
{
  "github": {
    "default_bucket_prefix": "github",
    "max_repo_size_mb": 100,
    "concurrent_ingests": 1
  }
}
```

## 7. Error Handling

### 7.1. Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `404 Not Found` | Private repo or invalid URL | Add GITHUB_TOKEN or check URL |
| `403 Rate Limit` | Too many requests | Wait for reset time or add token |
| `Repo too large` | Exceeds max_repo_size_mb | Ingest specific subdirectory (future) |
| `Extraction failed` | Corrupt tarball | Retry download |
| `Ingest failed` | Database error | Check logs, retry sync |

### 7.2. Retry Logic

- Tarball download: Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Atomization: No retry (failures logged per-file, continue with rest)
- Database writes: Retry once on lock contention

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Small repo (<100 files) ingest time | <30s | Manual testing |
| Medium repo (~500 files) ingest time | <2min | Manual testing |
| Large repo (~2000 files) ingest time | <5min | Manual testing |
| Binary file detection accuracy | >99% | Log analysis |
| Rate limit errors (with token) | <1% | Error tracking |

## 9. Future Enhancements (Out of Scope)

- **Delta Sync**: Detect changed files via commit SHA comparison
- **Branch Selection**: UI dropdown to select branch before ingest
- **Subdirectory Ingest**: Only ingest `/src` or `/docs` folder
- **Webhook Integration**: Auto-sync on GitHub push events
- **PR Review Mode**: Ingest PR diff for code review context

## 10. Related Standards

- **Standard 059**: Reliable Ingestion (Ghost Data Protocol)
- **Standard 097**: Enhanced Code Analysis
- **Standard 109**: Batched Ingestion (large file handling)
- **Standard 110**: Ephemeral Index (disposable architecture)

## 11. Implementation Checklist

- [ ] Database schema migration (github_repos table)
- [ ] GitHubIngestService implementation
- [ ] API endpoints (/v1/github/*)
- [ ] UI panel in dashboard
- [ ] Binary file detection
- [ ] Exclusion pattern logic
- [ ] Rate limit checking
- [ ] Error handling and logging
- [ ] Manual testing with 3+ repos of varying sizes
