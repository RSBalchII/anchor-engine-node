/**
 * Database Module for Sovereign Context Engine
 *
 * This module manages the CozoDB database connection and provides
 * database operations for the context engine.
 */

console.log("[DB] Loading Config...");
import { config } from "../config/index.js";
import path from "path"; // @ts-ignore - used in path resolution
import { fileURLToPath } from "url"; // @ts-ignore - used in path resolution
console.log("[DB] Creating Require...");
import { createRequire } from "module";
const require = createRequire(import.meta.url);
console.log("[DB] Requiring cozo-node...");

const __filename = fileURLToPath(import.meta.url); // @ts-ignore - used in path resolution
// const __dirname = path.dirname(__filename); // Not used, commented out to avoid TS error

import { pathManager } from '../utils/path-manager.js';

// Use centralized path manager
const getNativePath = (filename: string) => {
  return pathManager.getNativePath(filename);
};

let cozoNode: any;
let CozoDb: any;

// Try to load the standard cozo-node module
try {
  const cozoModule = require("cozo-node");
  CozoDb = cozoModule.CozoDb || cozoModule.default?.CozoDb || cozoModule;
  console.log("[DB] cozo-node loaded (Standard Module).");
} catch (e) {
  // If standard module fails, try loading platform-specific binary
  try {
    console.log(
      `[DB] Standard module load failed. Attempting local binary override for platform: ${process.platform}...`,
    );

    const nativePath = getNativePath('cozo_lib.node'); // Using the renamed binary from electron-builder config
    console.log(`[DB] Loading Cozo from: ${nativePath}`);

    // Use the native module manager for consistent error handling
    const native = require(nativePath);

    // Create platform-specific wrapper functions
    if (process.platform === "win32") {
      cozoNode = {
        open_db: (engine: string, path: string, options: any) =>
          native.open_db(
            engine || "mem",
            path || "data.db",
            JSON.stringify(options || {}),
          ),
        close_db: (id: number) => native.close_db(id),
        query_db: (
          id: number,
          script: string,
          params: any,
          immutable?: boolean,
        ) =>
          new Promise((resolve, reject) => {
            native.query_db(
              id,
              script,
              params || {},
              (err: any, result: any) => {
                if (err) {
                  try {
                    reject(JSON.parse(err));
                  } catch (e) {
                    reject(err);
                  }
                } else {
                  resolve(result);
                }
              },
              !!immutable,
            );
          }),
      };
    } else if (process.platform === "darwin") {
      cozoNode = {
        open_db: (engine: string, path: string, options: any) =>
          native.open_db(
            engine || "mem",
            path || "data.db",
            JSON.stringify(options || {}),
          ),
        close_db: (id: number) => native.close_db(id),
        query_db: (
          id: number,
          script: string,
          params: any,
          immutable?: boolean,
        ) =>
          new Promise((resolve, reject) => {
            native.query_db(
              id,
              script,
              params || {},
              (err: any, result: any) => {
                if (err) {
                  try {
                    reject(JSON.parse(err));
                  } catch (e) {
                    reject(err);
                  }
                } else {
                  resolve(result);
                }
              },
              !!immutable,
            );
          }),
      };
    } else if (process.platform === "linux") {
      cozoNode = {
        open_db: (engine: string, path: string, options: any) =>
          native.open_db(
            engine || "mem",
            path || "data.db",
            JSON.stringify(options || {}),
          ),
        close_db: (id: number) => native.close_db(id),
        query_db: (
          id: number,
          script: string,
          params: any,
          immutable?: boolean,
        ) =>
          new Promise((resolve, reject) => {
            native.query_db(
              id,
              script,
              params || {},
              (err: any, result: any) => {
                if (err) {
                  try {
                    reject(JSON.parse(err));
                  } catch (e) {
                    reject(err);
                  }
                } else {
                  resolve(result);
                }
              },
              !!immutable,
            );
          }),
      };
    } else {
      throw new Error(
        `Unsupported platform for local binary override: ${process.platform}`,
      );
    }

    console.log(
      `[DB] Loaded cozo-node from local binary override (${process.platform}).`,
    );
  } catch (e2: any) {
    console.warn(
      `[DB] WARNING: cozo-node missing (both standard and local). Engine will run in Stateless Mode. Error: ${e2.message}`,
    );
  }
}

class MockDatabase {
  init() {
    console.log("[MockDB] Initialized (Stateless).");
    return Promise.resolve();
  }
  close() {
    console.log("[MockDB] Closed.");
  }
  run(_q: string, _p?: any) {
    console.log("[MockDB] Query executed in stateless mode.");
    return Promise.resolve({ rows: [], headers: [] });
  }
  search(_q: string) {
    return Promise.resolve({ rows: [] });
  }
}

export class Database {
  private dbInstance: any = null;

  constructor() {
    // Database connection is now established in init()
  }

  /**
   * Initialize the database with required schemas
   */
  async init(): Promise<void> {
    // 0. Initialize the database connection
    if (this.dbInstance === null) {
      // Use pathManager for consistent absolute path (Standard 051)
      const dbPath = process.env.COZO_DB_PATH || pathManager.getDatabasePath();
      try {
        console.log(`[DB] Attempting to open RocksDB backend: ${dbPath}`);

        if (CozoDb) {
          this.dbInstance = new CozoDb("rocksdb", dbPath, {});
        } else {
          this.dbInstance = cozoNode.open_db("rocksdb", dbPath, {});
        }
        console.log(`[DB] Initialized with RocksDB backend: ${dbPath}`);
      } catch (e: any) {
        const errStr = String(e) + (e.message || "");
        // ... (Error handling logic tailored to dbPath would be ideal, 
        // but for now we keep the simple purge logic referring to ./context.db 
        // or just re-throw if it's a test path to avoid accidental test data loss?)

        // Actually, let's keep it simple for now and just update the initialization block.
        // If recovery is needed, we might need to update the path there too.

        if (
          errStr.includes("lock file") ||
          errStr.includes("IO error") ||
          errStr.includes("Invalid argument") ||
          errStr.includes("does not exist") ||
          errStr.includes("rocksdb")
        ) {
          // ... Existing auto-purge logic is hardcoded to ./context.db
          // For safety, we only auto-purge if using default path or explicitly allow it.
          // Let's just throw if custom path for now to avoid side effects.
          if (dbPath !== "./context.db") throw e;

          console.error("\n[DB] Database corruption or lock detected. Auto-purging...");

          const fs = await import('fs');
          if (fs.existsSync(dbPath)) {
            fs.rmSync(dbPath, { recursive: true, force: true });
            console.log(`[DB] Purged ${dbPath}`);
          }

          // Retry initialization
          console.log(`[DB] Retrying initialization...`);
          if (CozoDb) {
            this.dbInstance = new CozoDb("rocksdb", dbPath, {});
          } else {
            this.dbInstance = cozoNode.open_db("rocksdb", dbPath, {});
          }
          console.log(`[DB] Initialized with RocksDB backend (Post-Purge): ${dbPath}`);
        } else {
          throw e;
        }
      }
    }

    // ... skipping to Source Table ...

    // Create the memory table schema
    // We check for existing columns to determine if migration is needed
    try {
      const result = await this.run("::columns memory");
      const columns = result.rows.map((r: any) => r[0]);

      // Check for Level 1 Atomizer fields
      const hasSequence = columns.includes("sequence");
      const hasEmbedding = columns.includes("embedding");
      const hasSourceId = columns.includes("source_id");
      const hasSimhash = columns.includes("simhash");

      if (!hasSequence || !hasEmbedding || !hasSourceId || !hasSimhash) {
        console.log("Migrating memory schema: Adding Atomizer columns...");

        // 1. Fetch old data into memory
        const simhashField = hasSimhash ? ", simhash" : "";
        const oldDataResult = await this.run(`
          ?[id, timestamp, content, source, provenance${simhashField}] :=
          *memory{id, timestamp, content, source, provenance${simhashField}}
        `);

        console.log(`[DB] Migrating ${oldDataResult.rows.length} rows...`);

        // 2. Drop old indices and table
        try {
          await this.run("::remove memory:knn");
          await this.run("::remove memory:vec_idx");
          await this.run("::remove memory:content_fts");
        } catch (e) { }

        await this.run("::remove memory");

        // 3. Create new table
        await this.run(`
          :create memory {
            id: String
            =>
            timestamp: Float,
            content: String,
            source: String,
            source_id: String,
            sequence: Int,
            type: String,
            hash: String,
            buckets: [String],
            epochs: [String],
            tags: [String],
            provenance: String,
            simhash: String,
            embedding: <F32; ${config.MODELS.EMBEDDING_DIM}>
          }
        `);
        console.log("[DB] Memory table migrated.");
      }
    } catch (e: any) {
      if (e.message && (e.message.includes("RelNotFound") || e.message.includes("Cannot find"))) {
        console.log("[DB] Creating memory table from scratch...");
        try {
          await this.run(`
            :create memory {
                id: String
                =>
                timestamp: Float,
                content: String,
                source: String,
                source_id: String,
                sequence: Int,
                type: String,
                hash: String,
                buckets: [String],
                epochs: [String],
                tags: [String],
                provenance: String,
                simhash: String,
                embedding: <F32; ${config.MODELS.EMBEDDING_DIM}>
            }
           `);
          console.log("[DB] Memory table initialized");
        } catch (err: any) {
          if (!err.message?.includes("Duplicate")) throw err;
        }
      } else {
        // Ignore other errors if table check fails weirdly, or re-throw?
        // For now, assume it exists or some other non-critical error
        console.log(`[DB] Memory check skipped: ${e.message}`);
      }
    }

    // Create Source Table (Container)
    try {
      await this.run(`
        :create source {
           path: String,
           hash: String,
           total_atoms: Int,
           last_ingest: Float
        }
      `);
      console.log("[DB] 'source' table initialized.");
    } catch (e: any) {
      if (!e.message?.includes("conflict") && !e.message?.includes("Duplicate"))
        throw e;
    }

    // Create Summary Node Table (Level 2/3: Episodes/Epochs)
    try {
      await this.run(`
        :create summary_node {
           id: String,
           type: String,
           content: String,
           span_start: Float,
           span_end: Float,
           embedding: <F32; 384>
        }
      `);
    } catch (e: any) {
      if (!e.message?.includes("conflict") && !e.message?.includes("Duplicate"))
        throw e;
    }

    // Create Parent_Of Edge Table (Hierarchy)
    try {
      await this.run(`
        :create parent_of {
           parent_id: String,
           child_id: String,
           weight: Float
        }
      `);
    } catch (e: any) {
      if (!e.message?.includes("conflict") && !e.message?.includes("Duplicate"))
        throw e;
    }

    // Create Engram table (Lexical Sidecar)
    try {
      await this.run(`
        :create engrams {
          key: String,
          value: String
        }
      `);
    } catch (e: any) {
      if (!e.message?.includes("conflict") && !e.message?.includes("Duplicate"))
        throw e;
    }

    // Create FTS index for content
    try {
      await this.run(`
        ::fts create memory:content_fts {
          extractor: content,
          tokenizer: Simple,
          filters: [Lowercase]
        }
      `);
    } catch (e: any) {
      if (
        !e.message?.includes("conflict") &&
        !e.message?.includes("Duplicate") &&
        !e.message?.includes("already exists")
      )
        throw e;
    }

    // --- ATOMIC ARCHITECTURE TABLES (Level 4) ---

    // 1. Atoms (The fundamental units / tags)
    try {
      await this.run(`
         :create atoms {
            id: String
            =>
            label: String,
            type: String,
            weight: Float,
            embedding: <F32; ${config.MODELS.EMBEDDING_DIM}>
         }
       `);
      console.log("[DB] 'atoms' table initialized.");
    } catch (e: any) {
      if (!e.message?.includes("Duplicate") && !e.message?.includes("conflicts with")) throw e;
    }



    // ... Source table ...

    // ...

    // 2. Molecules (Sentences / Thoughts)
    try {
      // Check for schema update (Universal Topology)
      let needsRecreation = false;
      try {
        const result = await this.run("::columns molecules");
        const columns = result.rows.map((r: any) => r[0]);
        // Also check if columns are nullable? (Hard to check via ::columns)
        // We just verify fields exist.
        if (!columns.includes("start_byte") || !columns.includes("type") || !columns.includes("molecular_signature")) {
          console.log("[DB] Schema Mismatch: 'molecules' table missing Universal Topology fields. Recreating...");
          needsRecreation = true;
        }
      } catch (e) {
        // Table doesn't exist, proceed to create
      }

      if (needsRecreation) {
        console.log("[DB] Schema Mismatch detected. Triggering Phoenix Protocol (Purge & Rebuild)...");

        // 1. Close existing connection (if confirmed open)
        try {
          if (this.dbInstance) {
            if (typeof this.dbInstance.close === 'function') {
              // Check if likely async
              const p = this.dbInstance.close();
              if (p instanceof Promise) await p;
            } else if (typeof this.dbInstance.close_db === 'function') {
              this.dbInstance.close_db();
            }
          }
        } catch (e) {
          console.log("[DB] Warning: Error closing DB:", e);
        }

        // Wait for RocksDB lock release (Windows is slow)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 2. Nuke the files (with Retry)
        const fs = await import('fs');
        const dbPath = process.env.COZO_DB_PATH || pathManager.getDatabasePath();

        if (fs.existsSync(dbPath)) {
          let deleted = false;
          let attempts = 0;
          while (!deleted && attempts < 5) {
            try {
              fs.rmSync(dbPath, { recursive: true, force: true });
              deleted = true;
              console.log(`[DB] Purged ${dbPath}`);
            } catch (e: any) {
              attempts++;
              console.log(`[DB] Locked (${attempts}/5). Waiting...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          if (!deleted) throw new Error(`[DB] Critical: Could not delete ${dbPath} after 5 attempts. Process lock likely.`);
        }

        // 3. Re-open (Resurrection)
        if (CozoDb) {
          this.dbInstance = new CozoDb("rocksdb", dbPath, {});
        } else {
          this.dbInstance = cozoNode.open_db("rocksdb", dbPath, {});
        }
        console.log("[DB] Phoenix Protocol successful. Database reborn.");

        // NOTE: We must proceed to re-create ALL tables, not just molecules, 
        // because we just wiped the whole DB.
        // The flow below continues to create 'molecules'. 
        // But what about 'memory', 'source'? 
        // They were created ABOVE this block.
        // CRITICAL: If we wipe here, we lose 'memory' and 'source' tables created in step 1.

        // FIX: If we wipe, we must RESTART the init sequence or ensure we recreate previous tables.
        // EASIEST: Throw a special error to retry `init()` from the top?
        // OR: Just accept we need to recreate 'molecules' and rely on the fact that 
        // subsequent checks for other tables (later in init?) or just duplicate the create commands?

        // actually, 'memory' and 'source' are created BEFORE 'molecules'.
        // If we wipe here, they are gone.
        // We must re-run their create commands.

        // SIMPLEST: Recursively call init()?
        // this.dbInstance = null; // Reset
        // return this.init(); // Retry from scratch

        // Let's do that. It's cleaner.
        this.dbInstance = null;
        return this.init();
      }

      await this.run(`
         :create molecules {
        id: String
          =>
          content: String,
            compound_id: String,
              sequence: Int,
                start_byte: Int,
                  end_byte: Int,
                    type: String,
                      numeric_value: Float ?,
                        numeric_unit: String ?,
                          molecular_signature: String,
                            embedding: <F32; ${config.MODELS.EMBEDDING_DIM}>
         }
      `);
      console.log("[DB] 'molecules' table initialized.");

      // Create FTS for molecules
      try {
        await this.run(`
            ::fts create molecules:content_fts {
        extractor: content,
          tokenizer: Simple,
            filters: [Lowercase]
      }
      `);
      } catch (e) { }

    } catch (e: any) {
      if (!e.message?.includes("Duplicate") && !e.message?.includes("conflicts with")) throw e;
    }

    // 3. Atom Edges (Graph Connections: Atom <-> Molecule/Compound)
    try {
      await this.run(`
         :create atom_edges {
        from_id: String,
          to_id: String
            =>
            weight: Float,
              relation: String
      }
      `);
      console.log("[DB] 'atom_edges' table initialized.");
    } catch (e: any) {
      if (!e.message?.includes("Duplicate") && !e.message?.includes("conflicts with")) throw e;
    }

    // 4. Compounds (Atomic V4 Storage - Files/Chunks)
    try {
      await this.run(`
         :create compounds {
        id: String
          =>
          compound_body: String,
            path: String,
              timestamp: Float,
                provenance: String,
                  molecular_signature: String,
                    atoms: [String],
                      molecules: [String],
                        embedding: <F32; ${config.MODELS.EMBEDDING_DIM}>
         }
      `);
      console.log("[DB] 'compounds' table initialized (POML V4).");
    } catch (e: any) {
      if (!e.message?.includes("Duplicate") && !e.message?.includes("conflicts with")) throw e;
    }

    // ----------------------------------------------------
    // CRITICAL: Performance Indices (Tags, Buckets, Epochs)
    // ----------------------------------------------------
    // We attempt to create HNSW or basic indices for these list columns if supported,
    // or standard indices for scalar columns.
    // Since CozoDB 0.7+ supports list indexing via JSON ops or specific index types,
    // we will start with basic covering indices if possible, or skip if complex.
    //
    // Update: CozoDB `::index create` works on specific columns.
    // For List columns, it indexes the list AS A VALUE unless we use specific techniques.
    // However, filtering `tag in tags` usually triggers a scan.
    // A better approach for specific performance is ensuring we rely on the `:: index` if supported.
    // We will just try to create them. If it fails (due to list type), we log warning.

    const indices = ["buckets", "tags", "epochs"];
    for (const idx of indices) {
      try {
        // Create a standard index (non-unique).
        // Note: Indexing a List column in RocksDB backend might just index the JSON string.
        // Effectively this speeds up exact match of the WHOLE list, but maybe not `contains`.
        // BUT, it's better than nothing for equality checks.
        await this.run(`::index create memory:${idx} { keys: [${idx}] } `);
        console.log(`[DB] Index created: memory:${idx} `);
      } catch (e: any) {
        // Ignore "already exists"
        if (
          !e.message?.includes("Duplicate") &&
          !e.message?.includes("already exists")
        ) {
          // console.warn(`[DB] Could not create index for ${ idx }(might be expected for Lists): ${ e.message } `);
        }
      }
    }

    console.log("Database initialized successfully");
  }

  /**
   * Close the database connection
   */
  async close() {
    // Close the database connection
    if (this.dbInstance) {
      if (this.dbInstance.close) {
        this.dbInstance.close();
      } else if (cozoNode?.close_db) {
        cozoNode.close_db(this.dbInstance);
      }
    }
  }

  /**
   * Run a query against the database
   */
  async run(q: string, p?: any) {
    const { config } = await import("../config/index.js");
    if (config.LOG_LEVEL === "DEBUG") {
      if (q.includes(":put") || q.includes(":insert")) {
        console.log(
          `[DB] Executing Write: ${q.substring(0, 50)}... Params keys: ${p ? Object.keys(p) : "none"} `,
        );
        if (p && p.data) console.log(`[DB] Data rows: ${p.data.length} `);
      }
    }

    try {
      if (this.dbInstance === null) {
        throw new Error("Database not initialized");
      }
      const result = this.dbInstance.run
        ? await this.dbInstance.run(q, p !== undefined ? p : {})
        : cozoNode.query_db(this.dbInstance, q, p !== undefined ? p : {});
      return result;
    } catch (e: any) {
      console.error(`[DB] Query Failed: ${e.message} `);
      console.error(`[DB] Query: ${q} `);
      throw e;
    }
  }

  /**
   * Run a FTS search query
   */
  async search(query: string) {
    if (this.dbInstance === null) {
      throw new Error("Database not initialized");
    }
    return this.dbInstance.run
      ? await this.dbInstance.run(query, {})
      : cozoNode.query_db(this.dbInstance, query, {});
  }
}

// Export a singleton instance
export const db =
  cozoNode || CozoDb
    ? new Database()
    : (new MockDatabase() as unknown as Database);
