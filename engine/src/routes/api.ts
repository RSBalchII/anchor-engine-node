/**
 * API Routes for Sovereign Context Engine
 *
 * Standardized API Interface implementing UniversalRAG architecture.
 */

import { Application, Request, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../core/db.js';

// Import services and types
import { executeSearch } from '../services/search/search.js';
import { SemanticIngestionService } from '../services/semantic/semantic-ingestion-service.js';
import { dream } from '../services/dreamer/dreamer.js';
import { getState, clearState } from '../services/scribe/scribe.js';
import { listModels, loadModel } from '../services/llm/provider.js';
import { createBackup, listBackups, restoreBackup } from '../services/backup/backup.js';
import { fetchAndProcess, searchWeb } from '../services/research/researcher.js';
import { SearchRequest } from '../types/api.js';
import { setupEnhancedRoutes } from './enhanced-api.js';

export function setupRoutes(app: Application) {
  // Ingestion endpoint (Semantic Shift Architecture)
  app.post('/v1/ingest', async (req: Request, res: Response) => {
    try {
      const { content, source, type, bucket, buckets = [], tags = [] } = req.body;

      if (!content) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      // Use the new semantic ingestion service
      const ingestionService = new SemanticIngestionService();
      const result = await ingestionService.ingestContent(
        content,
        source || 'unknown',
        type || 'text',
        bucket,
        buckets,
        tags
      );

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

      const atoms = (result.rows || []).map((row: any[]) => ({
        id: row[0],
        content: row[1],
        source: row[2],
        timestamp: row[3],
        buckets: row[4],
        tags: row[5],
        provenance: row[6],
        simhash: row[7]
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
      // row indices: 0:id, 1:timestamp, 2:content, 3:source_path, 4:source_id, 5:sequence, 6:type, 7:hash, 8:buckets, 9:epochs, 10:tags, 11:provenance, 12:simhash, 13:embedding
      const updatedRow = [...row];
      updatedRow[2] = content; // Update Content

      // Update Hash
      updatedRow[7] = crypto.createHash('sha256').update(content).digest('hex');

      // Zero Embedding (Force re-embed)
      updatedRow[13] = new Array(384).fill(0.1); // Index 13 is embedding now

      await db.run(
        `UPDATE atoms SET content = $1, hash = $2, embedding = $3 WHERE id = $4`,
        [content, updatedRow[7], updatedRow[13], id]
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
      const currentTags = row[10] as string[] || [];

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
  app.post('/v1/memory/search', async (req: Request, res: Response) => {
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
      const budget = (req.body as any).token_budget ? (req.body as any).token_budget * 4 : (body.max_chars || 20000);
      const tags = (req.body as any).tags || [];

      // Check if this is a semantic/relationship query
      const isSemanticQuery = req.body.semantic ||
        req.body.relationship ||
        req.body.narrative ||
        (body.query.toLowerCase().includes('relationship') ||
          body.query.toLowerCase().includes('with') ||
          body.query.toLowerCase().includes('and') && body.query.toLowerCase().includes('jade') ||
          body.query.toLowerCase().includes('rob'));

      let result;
      if (isSemanticQuery) {
        // Use semantic search for relationship/narrative queries
        console.log('[API] Using semantic search for relationship query');
        const { executeSemanticSearch } = await import('../services/semantic/semantic-search.js');
        result = await executeSemanticSearch(
          body.query,
          allBuckets,
          budget,
          (req.body as any).provenance || 'all',
          tags
        );
      } else {
        // Use traditional search for other queries
        console.log('[API] Using traditional search');
        const { executeSearch } = await import('../services/search/search.js');

        // Wrap the executeSearch call in additional error handling to catch any crashes
        try {
          result = await executeSearch(
            body.query,
            undefined, // bucket
            allBuckets,
            budget,
            false, // deep
            (req.body as any).provenance || 'all',
            tags
          );
        } catch (searchError: any) {
          console.error('[API] executeSearch failed:', searchError);
          // Ensure we return a proper response even if search fails
          res.status(500).json({
            error: 'Search service temporarily unavailable',
            details: searchError.message
          });
          return;
        }
      }

      // Construct standard response
      console.log(`[API] ${isSemanticQuery ? 'Semantic' : 'Traditional'} Search "${body.query}" -> Found ${result.results.length} results (Strategy: ${(result as any).strategy || 'unknown'})`);

      // Ensure response is sent even if there are issues with result formatting
      if (!res.headersSent) {
        res.status(200).json({
          status: 'success',
          context: result.context,
          results: result.results,
          strategy: (result as any).strategy || 'traditional',
          attempt: (result as any).attempt || 1,
          split_queries: (result as any).splitQueries || [],
          metadata: {
            engram_hits: 0,
            vector_latency: 0,
            provenance_boost_active: true,
            search_type: isSemanticQuery ? 'semantic' : 'traditional',
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
      // Improved Bucket Retrieval: Get distinct arrays first to avoid scanning all rows
      const result = await db.run('SELECT DISTINCT buckets FROM atoms WHERE buckets IS NOT NULL');
      const allBuckets = new Set<string>();

      if (result.rows) {
        for (const row of result.rows) {
          const bucketArr = row[0];
          if (Array.isArray(bucketArr)) {
            bucketArr.forEach((b: string) => allBuckets.add(b));
          } else if (typeof bucketArr === 'string') {
            allBuckets.add(bucketArr);
          }
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

      let query = 'SELECT tags FROM atoms WHERE tags IS NOT NULL';
      const params: any[] = [];

      if (buckets.length > 0) {
        query += ` AND EXISTS (SELECT 1 FROM unnest(buckets) as b WHERE b = ANY($1))`;
        params.push(buckets);
      }

      query += ' LIMIT 5000';

      // Unnesting ALL atoms crashes WASM memory. We fetch raw arrays and dedupe in JS.
      const result = await db.run(query, params);
      const allTags = new Set<string>();

      if (result.rows) {
        for (const row of result.rows) {
          const tagArr = row[0];
          if (Array.isArray(tagArr)) {
            tagArr.forEach((t: string) => allTags.add(t));
          } else if (typeof tagArr === 'string') {
            allTags.add(tagArr);
          }
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
  app.post('/v1/research/scrape', async (req: Request, res: Response) => {
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



  // LLM: List Models
  app.get('/v1/models', async (req: Request, res: Response) => {
    try {
      const dir = req.query['dir'] as string | undefined;
      const models = await listModels(dir);
      res.status(200).json(models);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // LLM: Load Model
  app.post('/v1/inference/load', async (req: Request, res: Response) => {
    try {
      const { model, options, dir } = req.body; // dir optional, used to construct absolute path if model is just filename?
      if (!model) {
        res.status(400).json({ error: "Model name required" });
        return;
      }

      // If dir provided and model is not absolute, join them
      const path = await import('path');
      let modelPath = model;
      if (dir && !path.isAbsolute(model)) {
        modelPath = path.join(dir, model);
      }

      const result = await loadModel(modelPath, options);
      res.status(200).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // LLM: Chat Completions (Intelligent Context Provision)
  app.post('/v1/chat/completions', async (req: Request, res: Response) => {
    try {
      const { messages, model, save_to_graph = false } = req.body;

      // Get the last user message to use as the objective
      const lastMessage = messages[messages.length - 1];
      const objective = lastMessage.content;

      console.log(`[API] Agent Request Objective: "${objective}" (Length: ${objective?.length})`);
      console.log(`[API] Objective Type: ${typeof objective}`);

      // 1. Retrieve context from ECE search API
      const { executeSearch } = await import('../services/search/search.js');
      const searchResults = await executeSearch(objective, undefined, [], 20000, false, 'all', []); // query, bucket, buckets, maxChars, deep, provenance, tags
      const contextBlock = searchResults.context || '';

      // Prepare messages with context as system prompt and user query
      const contextualMessages = [
        { role: 'system', content: `Context:\n${contextBlock}\n\nPrevious conversation and user context has been omitted for performance. Use only the provided context above to inform your response.` },
        { role: 'user', content: objective }
      ];

      // 2. Setup SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Variable to store the full response for potential saving
      let fullResponse = '';

      // 3. Initialize Agent Runtime with contextual messages
      const { AgentRuntime } = await import('../agent/runtime.js');
      const runtime = new AgentRuntime({
        model,
        verbose: true,
        maxIterations: 5,
        messages: contextualMessages, // Pass the contextual messages to the agent
        onEvent: (event) => {
          // Map Agent Events to SSE
          if (event.type === 'thought') {
            // Use specific event type for UI to show "Thinking"
            res.write(`data: ${JSON.stringify({ type: 'thought', content: event.content, id: event.id })}\n\n`);
          } else if (event.type === 'token') {
            // Send streaming tokens as assistant chunks
            const chunk = {
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: model || "ece-agent",
              choices: [{ index: 0, delta: { content: event.content }, finish_reason: null }]
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);

            // Accumulate the response if we need to save it
            if (save_to_graph) {
              fullResponse += event.content;
            }
          } else if (event.type === 'answer') {
            // Ensure any remaining content is sent before stop
            if (event.content) {
              const contentChunk = {
                id: `chatcmpl-${Date.now()}`,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: model || "ece-agent",
                choices: [{ index: 0, delta: { content: event.content }, finish_reason: null }]
              };
              // We only send this if we think we missed tokens, otherwise it might double print.
              // Actually, Basic Chat streams tokens. sending full answer again is bad.
              // let's just log it for debug
              console.log(`[API] Agent finished. Final Answer length: ${event.content.length}`);

              // Accumulate the response if we need to save it
              if (save_to_graph) {
                fullResponse += event.content;
              }
            }

            // Final stop chunk
            const chunk = {
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: model || "ece-agent",
              choices: [{ index: 0, delta: { content: "" }, finish_reason: "stop" }]
            };
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          } else if (event.type === 'error') {
            res.write(`data: ${JSON.stringify({ error: event.content })}\n\n`);
          }
        }
      });

      // 4. Run the Agent Loop with contextual messages (Context -> Prompt -> Model Responds)
      await runtime.runLoop(objective);

      // 5. If save_to_graph is true, save the conversation to the graph
      if (save_to_graph) {
        try {
          // Save user message
          const userTimestamp = Date.now();
          const userHash = crypto.createHash('sha256').update(objective).digest('hex');

          await db.run(
            `INSERT INTO atoms (id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, tags, epochs, provenance, simhash, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (id) DO UPDATE SET
               content = EXCLUDED.content,
               timestamp = EXCLUDED.timestamp,
               source_path = EXCLUDED.source_path,
               source_id = EXCLUDED.source_id,
               sequence = EXCLUDED.sequence,
               type = EXCLUDED.type,
               hash = EXCLUDED.hash,
               buckets = EXCLUDED.buckets,
               tags = EXCLUDED.tags,
               epochs = EXCLUDED.epochs,
               provenance = EXCLUDED.provenance,
               simhash = EXCLUDED.simhash,
               embedding = EXCLUDED.embedding`,
            [
              `chat_${userTimestamp}_user`,
              userTimestamp,
              objective,
              'chat_session',
              `chat_${userTimestamp}`,
              0,
              'chat_user',
              userHash,
              ['inbox', 'personal'],
              ['#chat', '#conversation'],
              [],
              'internal',
              "0",
              new Array(768).fill(0.1)
            ]
          );

          // Save AI response
          const aiTimestamp = Date.now();
          const aiHash = crypto.createHash('sha256').update(fullResponse).digest('hex');

          await db.run(
            `INSERT INTO atoms (id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, tags, epochs, provenance, simhash, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (id) DO UPDATE SET
               content = EXCLUDED.content,
               timestamp = EXCLUDED.timestamp,
               source_path = EXCLUDED.source_path,
               source_id = EXCLUDED.source_id,
               sequence = EXCLUDED.sequence,
               type = EXCLUDED.type,
               hash = EXCLUDED.hash,
               buckets = EXCLUDED.buckets,
               tags = EXCLUDED.tags,
               epochs = EXCLUDED.epochs,
               provenance = EXCLUDED.provenance,
               simhash = EXCLUDED.simhash,
               embedding = EXCLUDED.embedding`,
            [
              `chat_${aiTimestamp}_ai`,
              aiTimestamp,
              fullResponse,
              'chat_session',
              `chat_${aiTimestamp}`,
              1,
              'chat_ai',
              aiHash,
              ['inbox', 'personal'],
              ['#chat', '#conversation'],
              [],
              'internal',
              "0",
              new Array(768).fill(0.1)
            ]
          );

          console.log(`[API] Chat saved to graph: User message and AI response`);
        } catch (saveErr) {
          console.error('[API] Error saving chat to graph:', saveErr);
        }
      }

      // 6. Finish
      res.write('data: [DONE]\n\n');
      res.end();

    } catch (e: any) {
      console.error("Chat API Error", e);
      if (!res.headersSent) res.status(500).json({ error: e.message });
      else {
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
      }
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

  // Include enhanced routes
  setupEnhancedRoutes(app);
}