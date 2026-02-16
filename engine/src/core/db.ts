/**
 * Database Module for Sovereign Context Engine
 *
 * This module manages the PGlite database connection and provides
 * database operations for the context engine.
 */

console.log("[DB] Loading Config...");
import { config } from "../config/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PGlite } from "@electric-sql/pglite";
// import { vector } from "@electric-sql/pglite/extensions/vector"; // Commenting out since it may not be available

const __filename = fileURLToPath(import.meta.url);

import { pathManager } from '../utils/path-manager.js';

export class Database {
  private dbInstance: any = null;
  private _isInitialized: boolean = false;

  constructor() {
    // Database connection is now established in init()
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Initialize the database with required schemas
   */
  async init(): Promise<void> {
    // 0. Initialize the database connection
    if (this.dbInstance === null) {
      // Use pathManager for consistent absolute path (Standard 051)
      const dbPath = process.env.PGLITE_DB_PATH || pathManager.getDatabasePath();

      // Wipe and recreate the database directory NOT performed for persistence (Standard 051)
      try {
        console.log(`[DB] Using database directory: ${dbPath}`);

        // Close any existing database connection first
        if (this.dbInstance) {
          await this.dbInstance.close();
          this.dbInstance = null;
        }

        /* 
        // DO NOT REMOVE the database directory if we want persistence
        if (fs.existsSync(dbPath)) {
          console.log(`[DB] Removing existing database directory: ${dbPath}`);
          fs.rmSync(dbPath, { recursive: true, force: true });
        }
        */

        console.log(`[DB] Database directory ready: ${dbPath}`);
      } catch (cleanupError: any) {
        console.error(`[DB] Error during database directory preparation:`, cleanupError);
        // throw cleanupError; // Don't crash if wipe fails, just try to continue
      }
      // }

      try {
        console.log(`[DB] Initializing PGlite at: ${dbPath}`);
        // Initialize PGlite without vector extension initially
        // Let PGlite handle directory creation internally
        this.dbInstance = await new PGlite(dbPath);
        console.log(`[DB] PGlite initialized successfully: ${dbPath}`);
      } catch (e: any) {
        console.error(`[DB] Failed to initialize PGlite: ${e.message}`);
        throw e;
      }
    }

    // Create extensions
    try {
      await this.run('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      console.log("[DB] 'pg_trgm' extension enabled.");
    } catch (e: any) {
      console.warn("[DB] Could not enable 'pg_trgm' extension:", e.message);
    }

    // Create atoms table schema - simplified for PGlite compatibility
    try {
      // Create sequence for vector_ids
      await this.run('CREATE SEQUENCE IF NOT EXISTS vector_id_seq START 1;');

      await this.run(`
        CREATE TABLE IF NOT EXISTS atoms (
          id TEXT PRIMARY KEY,
          content TEXT,
          source_path TEXT,
          timestamp REAL,
          simhash TEXT,
          embedding TEXT,
          vector_id BIGINT,
          provenance TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log("[DB] 'atoms' table initialized.");

      // Add missing columns if they don't exist (for existing databases)
      const columnsToAdd = [
        { name: 'vector_id', type: 'BIGINT' },
        { name: 'buckets', type: 'TEXT[]' },
        { name: 'tags', type: 'TEXT[]' },
        { name: 'epochs', type: 'TEXT[]' },
        { name: 'sequence', type: 'INTEGER' },
        { name: 'type', type: 'TEXT' },
        { name: 'hash', type: 'TEXT' },
        { name: 'molecular_signature', type: 'TEXT' },
        { name: 'compound_id', type: 'TEXT' },
        { name: 'start_byte', type: 'INTEGER' },
        { name: 'end_byte', type: 'INTEGER' },
        { name: 'numeric_value', type: 'REAL' },
        { name: 'numeric_unit', type: 'TEXT' },
        { name: 'source_id', type: 'TEXT' },
        { name: 'payload', type: 'JSONB' } // Crystal Atom Structure (Hybrid Architecture)
      ];

      for (const col of columnsToAdd) {
        try {
          await this.run(`ALTER TABLE atoms ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
        } catch (alterErr: any) {
          // Column might already exist, which is fine
          console.debug(`[DB] Column ${col.name} addition:`, alterErr.message);
        }
      }
    } catch (e: any) {
      console.error("[DB] Error initializing atoms table:", e);
      throw e;
    }

    // Create the tags table (The "Nervous System")
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS tags (
          atom_id TEXT,
          tag TEXT,
          bucket TEXT,
          PRIMARY KEY (atom_id, tag, bucket)
        );
      `);

      // Create indexes - simplified for PGlite
      try {
        await this.run('CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);');
      } catch (indexErr: any) {
        console.warn("[DB] Could not create tag index:", indexErr.message);
      }
      try {
        await this.run('CREATE INDEX IF NOT EXISTS idx_tags_bucket ON tags(bucket);');
      } catch (indexErr: any) {
        console.warn("[DB] Could not create bucket index:", indexErr.message);
      }

      console.log("[DB] 'tags' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating tags table:", e);
      throw e;
    }

    // Create Edges table (The Graph Connections)
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS edges (
          source_id TEXT,
          target_id TEXT,
          relation TEXT,
          weight REAL,
          PRIMARY KEY (source_id, target_id, relation)
        );
      `);

      console.log("[DB] 'edges' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating edges table:", e);
      throw e;
    }

    // Create Source Table (Container)
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS sources (
          path TEXT PRIMARY KEY,
          hash TEXT,
          total_atoms INTEGER,
          last_ingest REAL
        );
      `);

      console.log("[DB] 'sources' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating sources table:", e);
      throw e;
    }

    // Create Molecules table (Atomic Architecture)
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS molecules (
          id TEXT PRIMARY KEY,
          content TEXT,
          compound_id TEXT,
          sequence INTEGER,
          start_byte INTEGER,
          end_byte INTEGER,
          type TEXT,
          numeric_value REAL,
          numeric_unit TEXT,
          molecular_signature TEXT,
          embedding TEXT,
          timestamp REAL
        );
      `);

      console.log("[DB] 'molecules' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating molecules table:", e);
      throw e;
    }

    // Create Compounds table (Atomic Architecture)
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS compounds (
          id TEXT PRIMARY KEY,
          compound_body TEXT,
          path TEXT,
          timestamp REAL,
          provenance TEXT,
          molecular_signature TEXT,
          atoms TEXT,
          molecules TEXT,
          embedding TEXT
        );
      `);

      console.log("[DB] 'compounds' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating compounds table:", e);
      throw e;
    }

    // Create Engrams table (Lexical Sidecar)
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS engrams (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      console.log("[DB] 'engrams' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating engrams table:", e);
      throw e;
    }

    // Create Atom Positions table (Lazy Molecule Inflation)
    // Tracks where atoms (keywords) appear in compounds for radial inflation
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS atom_positions (
          compound_id TEXT NOT NULL,
          atom_label TEXT NOT NULL,
          byte_offset INTEGER NOT NULL,
          PRIMARY KEY (compound_id, atom_label, byte_offset)
        );
      `);
      await this.run(`
        CREATE INDEX IF NOT EXISTS idx_atom_positions_label 
        ON atom_positions(atom_label);
      `);

      console.log("[DB] 'atom_positions' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating atom_positions table:", e);
      throw e;
    }

    // Create Summary Nodes Table (Dreamer Abstractions)
    try {
      await this.run(`
        CREATE TABLE IF NOT EXISTS summary_nodes (
          id TEXT PRIMARY KEY,
          type TEXT,
          content TEXT,
          span_start REAL,
          span_end REAL,
          embedding TEXT
        );
      `);
      console.log("[DB] 'summary_nodes' table initialized.");
    } catch (e: any) {
      console.error("[DB] Error creating summary_nodes table:", e);
      throw e;
    }

    // Create FTS index for content search
    try {
      await this.run(`
        CREATE INDEX IF NOT EXISTS idx_atoms_content_gin
        ON atoms
        USING GIN(to_tsvector('simple', content));
      `);
      console.log("[DB] FTS index created for content search.");
    } catch (e: any) {
      console.warn("[DB] Could not create FTS index:", e.message);
      // Try creating a simpler index if GIN fails
      try {
        await this.run(`
          CREATE INDEX IF NOT EXISTS idx_atoms_content_text
          ON atoms (content);
        `);
        console.log("[DB] Text index created as fallback.");
      } catch (fallbackErr: any) {
        console.warn("[DB] Could not create fallback text index:", fallbackErr.message);
      }
    }

    // Create FTS index for molecules content search (Tag-Walker anchor stage)
    try {
      await this.run(`
        CREATE INDEX IF NOT EXISTS idx_molecules_content_gin
        ON molecules
        USING GIN(to_tsvector('simple', content));
      `);
      console.log("[DB] FTS index created for molecules content search.");
    } catch (e: any) {
      console.warn("[DB] Could not create molecules FTS index:", e.message);
      // Try creating a simpler index if GIN fails
      try {
        await this.run(`
          CREATE INDEX IF NOT EXISTS idx_molecules_content_text
          ON molecules (content);
        `);
        console.log("[DB] Molecules text index created as fallback.");
      } catch (fallbackErr: any) {
        console.warn("[DB] Could not create molecules fallback text index:", fallbackErr.message);
      }
    }

    // Create JSONB GIN Index (Crystal Atom Optimization)
    try {
      await this.run(`
        CREATE INDEX IF NOT EXISTS idx_atoms_payload_gin
        ON atoms
        USING GIN (payload);
      `);
      console.log("[DB] GIN index created for payload (Crystal Atom).");
    } catch (e: any) {
      console.warn("[DB] Could not create payload GIN index:", e.message);
    }

    // Mark as initialized after all setup is complete
    this._isInitialized = true;
    console.log("Database initialized successfully");
  }

  /**
   * Close the database connection
   */
  async close() {
    // Close the database connection
    if (this.dbInstance) {
      await this.dbInstance.close();
    }
  }

  /**
   * Run a query against the database
   */
  async run(query: string, params?: any[]) {
    const { config } = await import("../config/index.js");
    if (config.LOG_LEVEL === "DEBUG") {
      console.log(`[DB] Executing Query: ${query.substring(0, 50)}...`);
      if (params) console.log(`[DB] Params:`, params);
    }

    try {
      if (this.dbInstance === null) {
        throw new Error("Database not initialized");
      }

      // PGlite returns objects by default which works with our named fields
      const result = await this.dbInstance.query(query, params || []);
      return result;
    } catch (e: any) {
      console.error(`[DB] Query Failed: ${e.message}`);
      console.error(`[DB] Query: ${query}`);
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

    // For now, use a simple LIKE query since full-text search may not be available
    const result = await this.dbInstance.query(
      `SELECT * FROM atoms WHERE content LIKE ?`,
      [`%${query}%`]
    );
    return result;
  }

  // Helper methods for file system operations
  private existsSync = fs.existsSync;
  private rmdirSync = fs.rmSync;
  private mkdirSync = fs.mkdirSync;
}

// Export a singleton instance
export const db = new Database();