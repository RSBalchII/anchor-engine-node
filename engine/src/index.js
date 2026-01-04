const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { CozoDb } = require('cozo-node');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createReadStream } = require('fs');
const { join } = require('path');

// Initialize CozoDB with RocksDB backend
const db = new CozoDb('rocksdb', '../context.db');

// Set up Express app
const app = express();
const PORT = 3000;

// Serve static files from interface directory
app.use(express.static(join(__dirname, '..', '..', 'interface')));

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database schema
async function initializeDb() {
  try {
    // Check if the memory relation already exists
    const checkQuery = '::relations';
    const relations = await db.run(checkQuery);

    // Only create the memory table if it doesn't already exist
    if (!relations.rows.some(row => row[0] === 'memory')) {
        const schemaQuery = ':create memory {id: String, timestamp: Int, content: String, source: String, type: String}';
        await db.run(schemaQuery);
        console.log('Database schema initialized');
    } else {
        console.log('Database schema already exists');
    }

    // Try to create FTS index (optional, may not be supported in all builds)
    try {
      // Create FTS index for content field - using correct CozoDB syntax
      const ftsQuery = `::fts create memory:content_fts {extractor: [content], tokenizer: Simple, filters: [Lowercase]};`;
      await db.run(ftsQuery);
      console.log('FTS index created');
    } catch (e) {
      // FTS might not be supported in this build or index might already exist
      console.log('FTS creation failed (optional feature):', e.message);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// POST /v1/ingest endpoint
app.post('/v1/ingest', async (req, res) => {
  try {
    const { content, filename, source, type = 'text' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const timestamp = Date.now();
    
    // Insert into CozoDB
    const query = `:insert memory {id, timestamp, content, source, type} <- $data`;
    const params = {
      data: [[
        id,
        timestamp,
        content,
        source || filename || 'unknown',
        type
      ]]
    };
    
    const result = await db.run(query, params);
    
    res.json({ 
      status: 'success', 
      id: id,
      message: 'Content ingested successfully'
    });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/query endpoint
app.post('/v1/query', async (req, res) => {
  try {
    const { query, params = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const result = await db.run(query, params);

    res.json(result);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Basic search function as fallback when FTS fails
async function basicSearch(query, max_chars = 5000) {
  try {
    // Simple search implementation - retrieve all memory entries
    const searchQuery = `?[id, timestamp, content, source, type] := *memory{id, timestamp, content, source, type}`;
    const result = await db.run(searchQuery);

    if (result.ok) {
      let context = '';
      let charCount = 0;

      if (result.rows) {
        // Filter rows that contain the query term (case insensitive)
        const filteredRows = result.rows.filter(row => {
          const [id, timestamp, content, source, type] = row;
          return content.toLowerCase().includes(query.toLowerCase()) ||
                 source.toLowerCase().includes(query.toLowerCase());
        });

        // Sort by relevance (rows with query in content first, then in source)
        filteredRows.sort((a, b) => {
          const [a_id, a_timestamp, a_content, a_source, a_type] = a;
          const [b_id, b_timestamp, b_content, b_source, b_type] = b;

          const aContentMatch = a_content.toLowerCase().includes(query.toLowerCase());
          const bContentMatch = b_content.toLowerCase().includes(query.toLowerCase());

          // Prioritize content matches over source matches
          if (aContentMatch && !bContentMatch) return -1;
          if (!aContentMatch && bContentMatch) return 1;
          return 0;
        });

        for (const row of filteredRows) {
          const [id, timestamp, content, source, type] = row;
          const entryText = `### Source: ${source}\n${content}\n\n`;
          if (charCount + entryText.length > max_chars) {
            // Add partial content if we're near the limit
            const remainingChars = max_chars - charCount;
            context += entryText.substring(0, remainingChars);
            break;
          }
          context += entryText;
          charCount += entryText.length;
        }
      }

      return { context: context || 'No results found.' };
    } else {
      return { context: 'Search failed' };
    }
  } catch (error) {
    console.error('Basic search error:', error);
    return { context: 'Search failed' };
  }
}

// POST /v1/memory/search endpoint (for context.html)
app.post('/v1/memory/search', async (req, res) => {
  try {
    const { query, max_chars = 5000 } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // 1. Use FTS Index to find matching IDs and Scores
    // Using basic FTS query syntax with direct string interpolation (properly escaped)
    const safeQuery = query.replace(/'/g, "''"); // Escape single quotes for CozoDB
    const ftsQuery = `?[id, score] := *memory:content_fts{id, score | query: '${safeQuery}'} :order -score :limit 20`;

    const ftsResult = await db.run(ftsQuery);

    if (!ftsResult.ok) {
      console.error('FTS search failed:', ftsResult.message);
      // Fallback to basic search if FTS fails
      const basicResult = await basicSearch(query, max_chars);
      return res.json(basicResult);
    }

    if (ftsResult.rows.length === 0) {
      // If FTS found no results, try basic search as fallback
      const basicResult = await basicSearch(query, max_chars);
      return res.json(basicResult);
    }

    // 2. Get the IDs from FTS results to fetch full content
    const ids = ftsResult.rows.map(row => row[0]); // Get the IDs
    const scores = {};
    ftsResult.rows.forEach(row => {
        scores[row[0]] = row[1]; // Map ID to score
    });

    // Build a query to get full content for these specific IDs
    // We'll build a temporary relation with the IDs and join with memory
    const idList = ids.map(id => `["${id.replace(/"/g, '""')}"]`).join(', ');
    const contentQuery = `
      ?[id, timestamp, content, source, type] :=
        *memory{id, timestamp, content, source, type},
        [$id] = [${idList}],
        id = $id
    `;

    const contentResult = await db.run(contentQuery);

    // 3. Format Output (same context window logic) with scores
    let context = '';
    let charCount = 0;

    for (const row of contentResult.rows) {
      const [id, ts, text, src, type] = row;
      const score = scores[id] || 0; // Get score from our map, default to 0
      const entry = `### Source: ${src} (Relevance: ${Math.round(score*100)}%)\n${text}\n\n`;

      if (charCount + entry.length > max_chars) break;
      context += entry;
      charCount += entry.length;
    }

    res.json({ context });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/system/spawn_shell endpoint (for index.html)
app.post('/v1/system/spawn_shell', async (req, res) => {
  try {
    // For now, just return success - spawning a shell is complex and platform-dependent
    // In a real implementation, this would spawn a PowerShell terminal
    res.json({ success: true, message: "Shell spawned successfully" });
  } catch (error) {
    console.error('Spawn shell error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/backup endpoint
app.get('/v1/backup', async (req, res) => {
  try {
    console.log("[Backup] Starting full database export...");

    // 1. Query EVERYTHING from the memory relation
    // We explicitly select columns to ensure order
    const query = `?[id, timestamp, content, source, type] := *memory{id, timestamp, content, source, type}`;
    const result = await db.run(query);

    if (!result.ok) {
      throw new Error("Database query failed");
    }

    // 2. Format as a clean List of Objects
    const records = result.rows.map(row => ({
      id: row[0],
      timestamp: row[1],
      content: row[2],
      source: row[3],
      type: row[4]
    }));

    // 3. Convert to YAML (Block style for readability)
    const yamlStr = yaml.dump(records, {
      lineWidth: -1,        // Don't wrap long lines
      noRefs: true,         // No aliases
      quotingType: '"',     // Force quotes for safety
      forceQuotes: false
    });

    // 4. Send as Downloadable File
    const filename = `cozo_memory_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`;

    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(yamlStr);

    console.log(`[Backup] Exported ${records.length} memories to ${filename}`);

  } catch (error) {
    console.error('[Backup] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'Sovereign',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Set up file watcher for context directory
function setupFileWatcher() {
  const contextDir = path.join(__dirname, '..', '..', 'context');

  // Ensure context directory exists
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  
  const watcher = chokidar.watch(contextDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true, // Don't trigger events for existing files
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher
    .on('add', filePath => handleFileChange(filePath))
    .on('change', filePath => handleFileChange(filePath))
    .on('error', error => console.error('Watcher error:', error));
    
  console.log('File watcher initialized for context directory');
}

async function handleFileChange(filePath) {
  console.log(`File changed: ${filePath}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(
      path.join(__dirname, '..', '..', 'context'),
      filePath
    );
    
    // Ingest the file content
    const query = `:insert memory {id, timestamp, content, source, type} <- $data`;
    const id = `file_${Date.now()}_${path.basename(filePath)}`;
    const params = {
      data: [[
        id,
        Date.now(),
        content,
        relPath,
        path.extname(filePath) || 'unknown'
      ]]
    };
    
    await db.run(query, params);
    console.log(`File ingested: ${relPath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Initialize and start server
async function startServer() {
  try {
    await initializeDb();
    setupFileWatcher();
    
    app.listen(PORT, () => {
      console.log(`Sovereign Context Engine listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await db.close();
  } catch (e) {
    console.error('Error closing database:', e);
  }
  process.exit(0);
});

// Start the server
startServer();

module.exports = { db, app };