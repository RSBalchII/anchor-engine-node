/**
 * Minimal test for PGlite to understand its current capabilities
 */

import { PGlite } from "@electric-sql/pglite";

async function testMinimalPGlite() {
  console.log('[Minimal Test] Testing basic PGlite functionality...');

  try {
    // Initialize PGlite with a simple path
    const db = await new PGlite('./test_minimal_db');
    
    console.log('[Minimal Test] PGlite initialized successfully');

    // Try a simple query first
    const result = await db.query('SELECT 1 as test;');
    console.log('[Minimal Test] Simple query result:', result);

    // Try creating a basic table
    await db.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name TEXT
      );
    `);
    console.log('[Minimal Test] Basic table created');

    // Insert a record
    await db.query(`
      INSERT INTO test_table (name) VALUES ('test_record');
    `);
    console.log('[Minimal Test] Record inserted');

    // Query the record
    const selectResult = await db.query('SELECT * FROM test_table;');
    console.log('[Minimal Test] Retrieved record:', selectResult);

    // Close the database
    await db.close();
    console.log('[Minimal Test] Database closed successfully');
  } catch (error) {
    console.error('[Minimal Test] Error occurred:', error);
  }
}

testMinimalPGlite().catch(console.error);