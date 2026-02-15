/**
 * API Routes for Sovereign Context Engine
 *
 * Standardized API Interface implementing UniversalRAG architecture.
 */

import { Application, Request, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../core/db.js';
import { config } from '../config/index.js';
import { validate, schemas } from '../middleware/validate.js';

// Import services and types
import { executeSearch } from '../services/search/search.js';
import { AtomizerService } from '../services/ingest/atomizer-service.js';
import { AtomicIngestService } from '../services/ingest/ingest-atomic.js';
import { dream } from '../services/dreamer/dreamer.js';
import { getState, clearState } from '../services/scribe/scribe.js';
import { createBackup, listBackups, restoreBackup } from '../services/backup/backup.js';
import { fetchAndProcess, searchWeb } from '../services/research/researcher.js';
import { SearchRequest } from '../types/api.js';
import { setupEnhancedRoutes } from './enhanced-api.js';

export function setupRoutes(app: Application) {
  // Ingestion endpoint (Atomic Architecture)
  app.post('/v1/ingest', validate(schemas.ingest), async (req: Request, res: Response) => {
    try {
      const { content, source, type, bucket, buckets = [], tags = [] } = req.body;

      if (!content) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      // Use legacy Atomizer pipeline for performance
      const atomizer = new AtomizerService();
      const atomicIngest = new AtomicIngestService();

      const provenance = (source && (source.includes('external') || source.includes('web'))) ? 'external' : 'internal';

      const { compound, molecules, atoms } = await atomizer.atomize(
        content,
        source || 'api_upload',
        provenance
      );

      // Ingest result
      const targetBuckets = buckets.length > 0 ? buckets : [bucket || 'notebook'];
      await atomicIngest.ingestResult(compound, molecules, atoms, targetBuckets);

      const result = {
        status: 'success',
        message: `Ingested ${atoms.length} atoms and ${molecules.length} molecules`,
        id: compound.id
      };

      res.status(200).json(result);
    } catch (e: any) {
      console.error('[API] Ingest Error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST Quarantine Atom (Standard 073)
  app.post('/v1/atoms/:id/quarantine', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Atom ID is required' });
        return;
      }

      console.log(`[API] Quarantining Atom: ${id}`);

      // Update Provenance + Add Tag
      // We use a transaction-like update: Read -> Modify -> Write
      // 1. Get current record
      const check = await db.run(
        `SELECT tags FROM atoms WHERE id = $1`,
        [id]
      );
      if (!check.rows || check.rows.length === 0) {
        res.status(404).json({ error: 'Atom not found' });
        return;
      }

      const currentTags = check.rows[0][0] as string[] || [];
      const newTags = [...new Set([...currentTags, '#manually_quarantined'])];

      // 2. Update Record
      await db.run(
        `UPDATE atoms SET tags = $1, provenance = $2 WHERE id = $3`,
        [newTags, 'quarantine', id]
      );

      res.status(200).json({ status: 'success', message: `Atom ${id} quarantined.` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET Quarantined Atoms
  app.get('/v1/atoms/quarantined', async (_req: Request, res: Response) => {
    try {
      const query = `
        SELECT id, content, source_path, timestamp, buckets, tags, provenance, simhash, embedding
        FROM atoms
        WHERE provenance = 'quarantine'
        ORDER BY timestamp DESC
        LIMIT 100
      `;
      const result = await db.run(query);

      const atoms = (result.rows || []).map((row: any) => ({
        id: row.id,
        content: row.content,
        source: row.source_path,
        timestamp: row.timestamp,
        buckets: row.buckets,
        tags: row.tags,
        provenance: row.provenance,
        simhash: row.simhash
      }));

      res.status(200).json(atoms);
    } catch (e: any) {
      console.error('[API] Failed to fetch quarantined atoms:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // ...

  // PUT Update Atom Content
  app.put('/v1/atoms/:id/content', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      // ...

      console.log(`[API] Updating Atom Content: ${id}`);

      // We must preserve all other fields, BUT zero out embedding to signal re-index needed
      const fullRecord = await db.run(
        `SELECT id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding
         FROM atoms WHERE id = $1`,
        [id]
      );

      if (!fullRecord.rows || fullRecord.rows.length === 0) {
        res.status(404).json({ error: 'Atom not found' });
        return;
      }

      const row = fullRecord.rows[0];
      const newHash = crypto.createHash('sha256').update(content).digest('hex');
      const newEmbedding = new Array(384).fill(0.1);

      await db.run(
        `UPDATE atoms SET content = $1, hash = $2, embedding = $3 WHERE id = $4`,
        [content, newHash, newEmbedding, id]
      );

      res.status(200).json({ status: 'success', message: `Atom ${id} updated.` });

    } catch (e: any) {
      // ...
    }
  });

  // POST Restore Atom
  app.post('/v1/atoms/:id/restore', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[API] Restoring Atom: ${id}`);

      const fullRecord = await db.run(
        `SELECT id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding
         FROM atoms WHERE id = $1`,
        [id]
      );

      if (!fullRecord.rows || fullRecord.rows.length === 0) {
        res.status(404).json({ error: 'Atom not found' });
        return;
      }

      const row = fullRecord.rows[0];
      const currentTags = row.tags as string[] || [];

      // Filter out quarantine tags
      const newTags = currentTags.filter(t => t !== '#manually_quarantined' && t !== '#auto_quarantined');

      await db.run(
        `UPDATE atoms SET tags = $1, provenance = $2 WHERE id = $3`,
        [newTags, 'internal', id]
      );

      res.status(200).json({ status: 'success', message: `Atom ${id} restored to Graph.` });
    } catch (e: any) {
      // ...
    }
  });

  // POST Search endpoint (Standard UniversalRAG + Iterative Logic)
  app.post('/v1/memory/search', validate(schemas.memorySearch), async (req: Request, res: Response) => {
    console.log('[API] Received search request at /v1/memory/search');

    try {
      const body = req.body as SearchRequest;
      if (!body.query) {
        console.log('[API] Search request missing query parameter');
        res.status(400).json({ error: 'Query is required' });
        return;
      }

      console.log(`[API] Processing search request for query: "${body.query.substring(0, 50)}..."`);

      // Handle legacy params
      const bucketParam = (req.body as any).bucket;
      const buckets = body.buckets || [];
      const allBuckets = bucketParam ? [...buckets, bucketParam] : buckets;
      // Use config limit (default 100k) if no budget provided
      const defaultLimit = 100000;
      const budget = (req.body as any).token_budget ? (req.body as any).token_budget * 4 : (body.max_chars || defaultLimit);
      const tags = (req.body as any).tags || [];

      // Enhanced Search Strategy (Standard 086)
      // We now use our enhanced executeSearch for ALL queries to benefit from:
      // 1. Multi-term splitting (e.g. "Rob and Coda" -> "Rob", "Coda")
      // 2. Tag-Walker Protocol (graph-based associative retrieval)
      // 3. Physics-based spreading activation with temporal decay
      // 4. Context Inflation (Radial Search)
      console.log('[API] Using Enhanced Search Strategy for query');

      const result = await executeSearch(
        body.query,
        undefined, // bucket
        allBuckets,
        budget,
        false, // deep
        (req.body as any).provenance || 'all',
        tags
      );

      // Construct standard response
      console.log(`[API] Enhanced Search "${body.query}" -> Found ${result.results.length} results (Strategy: enhanced_tag_walker)`);

      // Ensure response is sent even if there are issues with result formatting
      if (!res.headersSent) {
        res.status(200).json({
          status: 'success',
          context: result.context,
          results: result.results,
          strategy: 'enhanced_tag_walker',
          attempt: 1,
          split_queries: [],
          metadata: {
            engram_hits: 0,
            vector_latency: 0,
            provenance_boost_active: true,
            search_type: 'enhanced',
            ...((result as any).metadata || {})
          }
        });
      }
    } catch (error: any) {
      console.error('[API] Search error:', error);

      // Check if headers have already been sent to avoid duplicate responses
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error during search',
          details: error.message
        });
      }
    }
  });

  // GET Search (Legacy support) - redirect to use POST effectively
  app.get('/v1/memory/search', async (_req: Request, res: Response) => {
    res.status(400).json({ error: "Use POST /v1/memory/search for complex queries." });
  });

  // POST Molecule Search endpoint - splits query into sentence-like chunks
  app.post('/v1/memory/molecule-search', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body.query) {
        res.status(400).json({ error: 'Query is required' });
        return;
      }

      // Handle legacy params
      const bucketParam = body.bucket;
      const buckets = body.buckets || [];
      const allBuckets = bucketParam ? [...buckets, bucketParam] : buckets;
      const budget = body.token_budget ? body.token_budget * 4 : (body.max_chars || 2400); // Default to 2400 as specified
      const tags = body.tags || [];

      // Use Molecule Search Strategy - split query into sentence-like chunks
      const { executeMoleculeSearch } = await import('../services/search/search.js');
      const result = await executeMoleculeSearch(
        body.query,
        undefined, // bucket
        allBuckets,
        budget,
        false, // deep
        'all', // provenance
        tags
      );

      // Construct standard response
      console.log(`[API] Molecule Search "${body.query}" -> Found ${result.results.length} results`);

      res.status(200).json({
        status: 'success',
        context: result.context,
        results: result.results,
        strategy: 'molecule_split',
        metadata: {
          engram_hits: 0,
          vector_latency: 0,
          provenance_boost_active: true,
          ...(result.metadata || {})
        }
      });
    } catch (error: any) {
      console.error('Molecule Search error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all buckets
  app.get('/v1/buckets', async (_req: Request, res: Response) => {
    try {
      // Improved Bucket Retrieval: Use the tags table which is much lighter (Atomic Architecture)
      const result = await db.run('SELECT DISTINCT bucket FROM tags WHERE bucket IS NOT NULL ORDER BY bucket');

      const allBuckets = new Set<string>();
      if (result.rows) {
        for (const row of result.rows) {
          const b = row.bucket;
          if (b && typeof b === 'string') allBuckets.add(b);
        }
      }

      res.status(200).json([...allBuckets].sort());
    } catch (error) {
      console.error('Bucket retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve buckets' });
    }
  });

  // Get all tags (Faceted by Bucket)
  app.get('/v1/tags', async (req: Request, res: Response) => {
    try {
      const bucketsParam = req.query['buckets'] as string;
      const buckets = bucketsParam ? bucketsParam.split(',') : [];

      // Optimized for PGlite: Use tags table directly
      let query = 'SELECT DISTINCT tag FROM tags WHERE tag IS NOT NULL';
      const params: any[] = [];

      if (buckets.length > 0) {
        query += ` AND bucket = ANY($1)`;
        params.push(buckets);
      }

      query += ' ORDER BY tag LIMIT 5000';

      const result = await db.run(query, params);
      const allTags = new Set<string>();

      if (result.rows) {
        for (const row of result.rows) {
          if (row.tag) allTags.add(row.tag as string);
        }
      }

      res.status(200).json([...allTags].sort());
    } catch (error) {
      console.error('Tag retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve tags' });
    }
  });

  // Backup Endpoints
  // POST /v1/backup - Create a new backup
  app.post('/v1/backup', async (_req: Request, res: Response) => {
    try {
      const result = await createBackup();
      res.status(200).json(result);
    } catch (e: any) {
      console.error("Backup Failed", e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /v1/backups - List available backups
  app.get('/v1/backups', async (_req: Request, res: Response) => {
    try {
      const result = await listBackups();
      res.status(200).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /v1/backup/restore - Restore a specific backup
  app.post('/v1/backup/restore', async (req: Request, res: Response) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        res.status(400).json({ error: "Filename required" });
        return;
      }
      const result = await restoreBackup(filename);
      res.status(200).json(result);
    } catch (e: any) {
      console.error("Restore Failed", e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET /v1/backup (Legacy Dump) - Kept for compatibility or download
  app.get('/v1/backup', async (_req: Request, res: Response) => {
    try {
      const result = await createBackup();
      const path = await import('path');
      const fpath = path.join(process.cwd(), 'backups', result.filename);
      res.download(fpath);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Trigger Dream Endpoint
  app.post('/v1/dream', async (_req: Request, res: Response) => {
    try {
      const result = await dream();
      res.status(200).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Research Plugin Endpoint
  app.post('/v1/research/scrape', validate(schemas.researchScrape), async (req: Request, res: Response) => {
    try {
      const { url, category } = req.body;
      if (!url) {
        res.status(400).json({ error: 'URL required' });
        return;
      }

      const result = await fetchAndProcess(url, category || 'article');
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Maintenance: Re-index Tags (Fix for missing buckets/tags in UI)
  app.post('/v1/maintenance/reindex-tags', async (_req: Request, res: Response) => {
    try {
      console.log("[Maintenance] Starting Tag Re-indexing...");

      // 1. Drop old table
      await db.run('DROP TABLE IF EXISTS tags');

      // 2. Re-create table with correct schema (atom_id, tag, bucket)
      // Note: This relies on db.ts schema, but we want to be explicit here since we just dropped it
      await db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          atom_id TEXT,
          tag TEXT,
          bucket TEXT,
          PRIMARY KEY (atom_id, tag, bucket)
        );
      `);

      // 3. Re-create indexes
      try {
        await db.run('CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);');
        await db.run('CREATE INDEX IF NOT EXISTS idx_tags_bucket ON tags(bucket);');
      } catch (e) { console.warn("Index creation warning", e); }

      // 4. Migrate Data
      const atoms = await db.run('SELECT id, tags, buckets FROM atoms');
      console.log(`[Maintenance] Found ${atoms.rows.length} atoms to re-index.`);

      let count = 0;
      for (const row of atoms.rows) {
        const atomId = row.id;
        const tags = row.tags as string[];
        const buckets = row.buckets as string[];

        if (!tags || !buckets) continue;

        for (const bucket of buckets) {
          for (const tag of tags) {
            if (tag && bucket) {
              try {
                await db.run(
                  `INSERT INTO tags (atom_id, tag, bucket) VALUES ($1, $2, $3)
                       ON CONFLICT (atom_id, tag, bucket) DO NOTHING`,
                  [atomId, tag, bucket]
                );
                count++;
              } catch (e) { }
            }
          }
        }
      }

      console.log(`[Maintenance] Re-indexing complete. Inserted ${count} tags.`);
      res.status(200).json({ status: 'success', message: `Re-indexed ${count} tags from ${atoms.rows.length} atoms.` });

    } catch (e: any) {
      console.error('[Maintenance] Re-index failed:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Web Search Endpoint
  app.get('/v1/research/web-search', async (req: Request, res: Response) => {
    try {
      const q = req.query['q'] as string;
      if (!q) {
        res.status(400).json({ error: 'Query required' });
        return;
      }

      const results = await searchWeb(q);
      res.status(200).json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Scribe State Endpoints
  // Get State
  // Note: We need to import getState, clearState from services.
  // I will add the import at the top first, then this block.
  // Actually, I can use "import(...)" if I don't want to mess up top level imports, but better to update top level.
  // Let's assume I updated imports.

  app.get('/v1/scribe/state', async (_req: Request, res: Response) => {
    try {
      const state = await getState();
      res.status(200).json({ state });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/v1/scribe/state', async (_req: Request, res: Response) => {
    try {
      const result = await clearState();
      res.status(200).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // System config endpoint
  app.get('/v1/system/config', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      config: {
        version: '1.0.0',
        engine: 'Sovereign Context Engine',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Watcher Path Endpoints
  // GET /v1/system/paths - List currently watched paths
  app.get('/v1/system/paths', async (_req: Request, res: Response) => {
    try {
      const { getWatchedPaths } = await import('../services/ingest/watchdog.js');
      const paths = getWatchedPaths();
      res.status(200).json({ paths });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /v1/system/paths - Add a new path to watch
  app.post('/v1/system/paths', async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      if (!path) {
        res.status(400).json({ error: 'Path is required' });
        return;
      }

      const { addWatchPath } = await import('../services/ingest/watchdog.js');
      const success = await addWatchPath(path);

      res.status(200).json({
        status: success ? 'success' : 'failed',
        message: success ? `Now watching: ${path}` : 'Failed to add path',
        path
      });
    } catch (e: any) {
      console.error('[API] Failed to add watch path:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Terminal Command Execution Endpoint
  app.post('/v1/terminal/exec', async (req: Request, res: Response) => {
    try {
      const { command } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      // For now, we'll simulate command execution for security
      // In a real implementation, you'd want to use a secure sandbox
      console.log(`[Terminal] Executing command: ${command}`);

      // Validate command to prevent dangerous operations
      const dangerousCommands = ['rm', 'del', 'format', 'mkfs', 'dd', 'shutdown', 'reboot', 'poweroff'];
      const commandParts = command.toLowerCase().split(' ');
      const isDangerous = dangerousCommands.some(dc => commandParts.includes(dc));

      if (isDangerous) {
        return res.status(400).json({
          error: 'Command contains potentially dangerous operations',
          stderr: 'ERROR: Dangerous command blocked by security policy'
        });
      }

      // Special handling for 'clear' command
      if (command.trim().toLowerCase() === 'clear') {
        return res.status(200).json({
          command: command,
          stdout: '', // Empty stdout for clear command
          stderr: '',
          code: 0
        });
      }

      // For now, return mock response - in a real implementation you'd execute securely
      const mockResponses: Record<string, { stdout?: string, stderr?: string, code?: number }> = {
        'ls': { stdout: 'file1.txt\nfile2.md\nfolder1/\nfolder2/' },
        'dir': { stdout: 'file1.txt\nfile2.md\nfolder1/\nfolder2/' },
        'pwd': { stdout: '/home/user/project' },
        'whoami': { stdout: 'user' },
        'echo hello': { stdout: 'hello' },
        'cat README.md': { stdout: '# Project README\n\nThis is a sample readme file.' },
        'type README.md': { stdout: '# Project README\n\nThis is a sample readme file.' },
        'help': { stdout: 'Available commands: ls, pwd, whoami, echo, cat/type, help' },
        'cls': { stdout: '' }
      };

      // Check if we have a predefined response
      const normalizedCmd = command.toLowerCase().trim();
      let response = mockResponses[normalizedCmd];

      // If no exact match, try partial matches
      if (!response) {
        if (normalizedCmd.startsWith('ls') || normalizedCmd.startsWith('dir')) {
          response = { stdout: 'file1.txt\nfile2.md\nfolder1/\nfolder2/' };
        } else if (normalizedCmd.startsWith('cat ') || normalizedCmd.startsWith('type ')) {
          response = { stdout: 'Sample file content for: ' + command.split(' ')[1] };
        } else {
          response = {
            stdout: `Command executed: ${command}\n(Output simulated for security)`,
            stderr: command.includes('error') ? 'Simulated error for testing' : undefined
          };
        }
      }

      res.status(200).json({
        command: command,
        stdout: response.stdout || '',
        stderr: response.stderr || '',
        code: response.code !== undefined ? response.code : 0
      });

    } catch (error: any) {
      console.error('Terminal execution error:', error);
      res.status(500).json({
        error: error.message,
        stderr: `Execution failed: ${error.message}`
      });
    }
  });

  // [DEBUG] Raw SQL Endpoint for Anchor TUI
  // WARNING: accessing this allows full DB control.
  app.post('/v1/debug/sql', async (req: Request, res: Response) => {
    try {
      const { query, params } = req.body;
      if (!query) return res.status(400).json({ error: 'Query required' });

      console.log(`[SQL] Executing: ${query}`);
      const start = Date.now();
      const result = await db.run(query, params || []);
      const duration = Date.now() - start;

      res.status(200).json({
        rows: result.rows,
        fields: result.fields,
        duration_ms: duration,
        row_count: result.rows ? result.rows.length : 0
      });
    } catch (error: any) {
      console.error('[SQL] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Graph Data Endpoint for Context Visualization
  app.post('/v1/graph/data', async (req: Request, res: Response) => {
    try {
      const { query, limit = 20 } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // This would normally call the search service to get real data
      // For now, we'll return mock data based on the query
      console.log(`[Graph] Generating visualization data for query: ${query}`);

      // Generate mock nodes and links based on the query
      const nodes = [
        { id: 'query', label: query, type: 'search', x: 400, y: 300, size: 20, color: '#646cff' },
        { id: 'atom1', label: 'Project Notes', type: 'document', x: 200, y: 150, size: 15, color: '#22d3ee' },
        { id: 'atom2', label: 'Code Snippet', type: 'code', x: 600, y: 150, size: 15, color: '#8b5cf6' },
        { id: 'atom3', label: 'Research Paper', type: 'document', x: 200, y: 450, size: 15, color: '#22d3ee' },
        { id: 'atom4', label: 'Configuration', type: 'config', x: 600, y: 450, size: 15, color: '#10b981' },
        { id: 'tag1', label: '#typescript', type: 'tag', x: 300, y: 100, size: 12, color: '#f59e0b' },
        { id: 'tag2', label: '#ai', type: 'tag', x: 500, y: 100, size: 12, color: '#f59e0b' },
        { id: 'tag3', label: '#graph', type: 'tag', x: 300, y: 500, size: 12, color: '#f59e0b' },
        { id: 'tag4', label: '#memory', type: 'tag', x: 500, y: 500, size: 12, color: '#f59e0b' },
      ];

      const links = [
        { source: 'query', target: 'atom1', strength: 0.8 },
        { source: 'query', target: 'atom2', strength: 0.7 },
        { source: 'query', target: 'atom3', strength: 0.6 },
        { source: 'query', target: 'atom4', strength: 0.5 },
        { source: 'atom1', target: 'tag1', strength: 0.9 },
        { source: 'atom1', target: 'tag2', strength: 0.6 },
        { source: 'atom2', target: 'tag1', strength: 0.7 },
        { source: 'atom2', target: 'tag2', strength: 0.8 },
        { source: 'atom3', target: 'tag3', strength: 0.9 },
        { source: 'atom3', target: 'tag4', strength: 0.6 },
        { source: 'atom4', target: 'tag3', strength: 0.7 },
        { source: 'atom4', target: 'tag4', strength: 0.8 },
      ];

      res.status(200).json({
        nodes: nodes.slice(0, limit),
        links: links.slice(0, limit * 2), // More links than nodes typically
        query: query,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Graph data error:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });

  // Configuration endpoint to provide runtime configuration to clients
  app.get('/v1/config', async (_req: Request, res: Response) => {
    try {
      // Import config here to avoid circular dependencies
      const { config } = await import('../config/index.js');

      const serverConfig = {
        port: config.PORT,
        host: config.HOST,
        server_url: `http://${config.HOST}:${config.PORT}`,
        llm_provider: config.LLM_PROVIDER,
        search_strategy: config.SEARCH.strategy,
        features: config.FEATURES
      };

      res.status(200).json(serverConfig);
    } catch (error: any) {
      console.error('Config endpoint error:', error);
      res.status(500).json({
        error: error.message,
        fallback_config: {
          port: 3160,
          host: '127.0.0.1',
          server_url: 'http://127.0.0.1:3160'
        }
      });
    }
  });

  // Include enhanced routes
  setupEnhancedRoutes(app);

  // Chat Completions Proxy (Standard 088 Gateway Pattern)
  // Proxies requests to the Inference Server (3001) if available, or returns error.
  app.post('/v1/chat/completions', async (req: Request, res: Response) => {
    try {
      // Determine destination (Inference Server default)
      // In a full implementation, this could load balance or check config
      const NANOBOT_URL = 'http://localhost:8080';
      const INFERENCE_URL = `${NANOBOT_URL}/v1/chat/completions`;

      console.log(`[API] Proxying chat request to ${INFERENCE_URL}`);

      // We need to fetch from the inference server
      // Note: We use dynamic import for fetch if not available globally (Node 18+ has it)

      const proxyResponse = await fetch(INFERENCE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass through auth headers if needed
        },
        body: JSON.stringify(req.body)
      });

      if (!proxyResponse.ok) {
        throw new Error(`Nanobot Server Error: ${proxyResponse.statusText}`);
      }

      // Stream the response back
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      if (proxyResponse.body) {
        // @ts-ignore - ReadableStream/Node stream mismatch handling
        for await (const chunk of proxyResponse.body) {
          res.write(chunk);
        }
      }

      res.end();

    } catch (e: any) {
      console.error('[API] Chat Proxy Error:', e);
      // If we haven't started streaming, send JSON error
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Nanobot Server Unavailable',
          details: 'Ensure packages/nanobot-node is running on port 8080',
          internal_message: e.message
        });
      } else {
        res.end();
      }
    }
  });

  // Proxy Model Management Endpoints to Nanobot
  const proxyToNanobot = async (req: Request, res: Response, path: string, method: string = 'GET') => {
    try {
      const NANOBOT_URL = 'http://localhost:8080';
      const url = `${NANOBOT_URL}${path}`;
      const options: any = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (method !== 'GET' && method !== 'HEAD') {
        options.body = JSON.stringify(req.body);
      }

      const response = await fetch(url, options);
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (e: any) {
      console.error(`[API] Proxy Error (${path}):`, e);
      res.status(503).json({ error: 'Nanobot Unavailable', details: e.message });
    }
  };

  app.post('/v1/model/load', (req, res) => proxyToNanobot(req, res, '/v1/model/load', 'POST'));
  app.post('/v1/model/unload', (req, res) => proxyToNanobot(req, res, '/v1/model/unload', 'POST'));
  app.get('/v1/model/status', (req, res) => proxyToNanobot(req, res, '/v1/model/status', 'GET'));
  app.get('/v1/models', (req, res) => proxyToNanobot(req, res, '/v1/models', 'GET'));
}