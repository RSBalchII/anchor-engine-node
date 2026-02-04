/**
 * Migration Script: CozoDB to PGlite
 * 
 * This script migrates data from the old CozoDB schema to the new PGlite schema.
 * It reads from the old CozoDB and writes to the new PGlite database.
 */

import { Database as CozoDatabase } from 'cozo-node'; // Old database
import { db as pgliteDatabase } from './src/core/db.js';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('[Migration] Starting CozoDB to PGlite migration...');

  try {
    // Initialize the new database
    await pgliteDatabase.init();

    // Connect to old CozoDB
    const oldDb = new CozoDb("rocksdb", "./context.db", {});
    
    // Query all memory entries from old database
    const oldDataResult = await oldDb.run(`
      ?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding] := 
      *memory{id, timestamp, content, source, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding}
    `);

    console.log(`[Migration] Found ${oldDataResult.rows.length} records to migrate`);

    // Process and migrate each record
    for (const row of oldDataResult.rows) {
      const [
        id, 
        timestamp, 
        content, 
        source, 
        source_id, 
        sequence, 
        type, 
        hash, 
        buckets, 
        epochs, 
        tags, 
        provenance, 
        simhash, 
        embedding
      ] = row;

      // Insert atom into new database
      const insertAtomQuery = `
        INSERT INTO atoms (id, content, source_path, timestamp, simhash, embedding, provenance)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          source_path = EXCLUDED.source_path,
          timestamp = EXCLUDED.timestamp,
          simhash = EXCLUDED.simhash,
          embedding = EXCLUDED.embedding,
          provenance = EXCLUDED.provenance
      `;

      // Convert simhash to BigInt if it exists
      let simhashBigInt: bigint | null = null;
      if (simhash && simhash !== "0") {
        try {
          simhashBigInt = BigInt(simhash);
        } catch (e) {
          console.warn(`[Migration] Invalid simhash for atom ${id}: ${simhash}`);
        }
      }

      await pgliteDatabase.run(insertAtomQuery, [
        id, 
        content, 
        source, 
        timestamp, 
        simhashBigInt || 0n, 
        embedding, 
        provenance
      ]);

      // Insert tags
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          const tagInsertQuery = `
            INSERT INTO tags (atom_id, tag, bucket)
            VALUES ($1, $2, $3)
            ON CONFLICT (atom_id, tag) DO UPDATE SET
              bucket = EXCLUDED.bucket
          `;
          
          // Use first bucket or default
          const bucket = Array.isArray(buckets) && buckets.length > 0 ? buckets[0] : 'default';
          await pgliteDatabase.run(tagInsertQuery, [id, tag, bucket]);
        }
      }
    }

    console.log(`[Migration] Successfully migrated ${oldDataResult.rows.length} records`);

    // Close old database connection
    oldDb.close();

    console.log('[Migration] Migration completed successfully!');
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate().catch(console.error);
}

export { migrate };