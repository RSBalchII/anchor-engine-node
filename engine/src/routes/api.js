const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { db } = require('../core/db');
const { BACKUPS_DIR } = require('../config/paths');
const { executeSearch } = require('../services/search');
const { ingestContent } = require('../services/ingest');
const { dream } = require('../services/dreamer');
const inference = require('../services/inference');

// POST /v1/ingest
router.post('/ingest', async (req, res) => {
  try {
    const { content, filename, source, type, bucket, buckets } = req.body;
    const targetBuckets = buckets || (bucket ? [bucket] : ['core']);
    const result = await ingestContent(content, filename, source, type, targetBuckets);
    res.json(result);
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/query
router.post('/query', async (req, res) => {
  try {
    const { query, params = {} } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    const result = await db.run(query, params);
    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/memory/search
router.post('/memory/search', async (req, res) => {
  try {
    const { query, max_chars, bucket, buckets, deep } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });
    const result = await executeSearch(query, bucket, buckets, max_chars, deep);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/system/spawn_shell
router.post('/system/spawn_shell', async (req, res) => {
  try {
    res.json({ success: true, message: "Shell spawned successfully" });
  } catch (error) {
    console.error('Spawn shell error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/models
router.get('/models', async (req, res) => {
  try {
    res.json(inference.listModels());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/inference/load
router.post('/inference/load', async (req, res) => {
  try {
    const { model, options } = req.body;
    const result = await inference.loadModel(model, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/chat/completions
router.post('/chat/completions', async (req, res) => {
  try {
    const { messages, ...options } = req.body;
    const response = await inference.chat(messages, options);
    res.json({ choices: [{ message: { content: response } }] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/dream
router.post('/dream', async (req, res) => {
  try {
    const result = await dream();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === SCRIBE (Markovian State) ENDPOINTS ===
const scribe = require('../services/scribe');

// POST /v1/scribe/update - Update session state from conversation history
router.post('/scribe/update', async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: 'history array is required' });
    }
    const result = await scribe.updateState(history);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/scribe/state - Get current session state
router.get('/scribe/state', async (req, res) => {
  try {
    const state = await scribe.getState();
    res.json({ state: state || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /v1/scribe/state - Clear session state
router.delete('/scribe/state', async (req, res) => {
  try {
    const result = await scribe.clearState();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/inference/status - Get model status
router.get('/inference/status', async (req, res) => {
  try {
    res.json(inference.getStatus());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/backup
router.get('/backup', async (req, res) => {
  try {
    console.log("[Backup] Starting full database export...");
    const query = `?[id, timestamp, content, source, type, hash, buckets] := *memory{id, timestamp, content, source, type, hash, buckets}`;
    const result = await db.run(query);

    const records = result.rows.map(row => ({
      id: row[0],
      timestamp: row[1],
      content: row[2],
      source: row[3],
      type: row[4],
      hash: row[5],
      buckets: row[6]
    }));

    const yamlStr = yaml.dump(records, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });

    const filename = `cozo_memory_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`;
    const backupPath = path.join(BACKUPS_DIR, filename);
    
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    fs.writeFileSync(backupPath, yamlStr);

    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(yamlStr);
    console.log(`[Backup] Exported ${records.length} memories to ${filename}`);
  } catch (error) {
    console.error('[Backup] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/buckets
router.get('/buckets', async (req, res) => {
  try {
    const query = '?[buckets] := *memory{buckets}';
    const result = await db.run(query);
    let buckets = [...new Set(result.rows.flatMap(row => row[0]))].sort();
    if (buckets.length === 0) buckets = ['core'];
    res.json(buckets);
  } catch (error) {
    console.error('Buckets error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
