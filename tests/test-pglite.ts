/**
 * Test script to verify PGlite implementation
 */

import { db } from './src/core/db.js';

async function testDatabase() {
  console.log('[Test] Testing PGlite database connection...');

  try {
    // Initialize the database
    await db.init();
    console.log('[Test] Database initialized successfully');

    // Test inserting a record
    const testId = `test_${Date.now()}`;
    const insertQuery = `
      INSERT INTO atoms (id, content, source_path, timestamp, simhash, provenance)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `;

    await db.run(insertQuery, [
      testId,
      'Test content for PGlite verification',
      'test-source',
      Date.now(),
      0n, // simhash as bigint
      'internal'
    ]);

    console.log('[Test] Test record inserted');

    // Test querying the record
    const selectQuery = `SELECT * FROM atoms WHERE id = $1`;
    const result = await db.run(selectQuery, [testId]);

    if (result.rows && result.rows.length > 0) {
      console.log('[Test] Query successful, retrieved record:', result.rows[0]);
    } else {
      console.error('[Test] Query failed, no records found');
    }

    // Test inserting a tag
    const tagInsertQuery = `
      INSERT INTO tags (atom_id, tag, bucket)
      VALUES ($1, $2, $3)
      ON CONFLICT (atom_id, tag) DO NOTHING
    `;
    
    await db.run(tagInsertQuery, [testId, 'test-tag', 'test-bucket']);
    console.log('[Test] Tag inserted successfully');

    // Test tag query
    const tagSelectQuery = `SELECT * FROM tags WHERE atom_id = $1`;
    const tagResult = await db.run(tagSelectQuery, [testId]);
    
    if (tagResult.rows && tagResult.rows.length > 0) {
      console.log('[Test] Tag query successful, retrieved tag:', tagResult.rows[0]);
    } else {
      console.error('[Test] Tag query failed, no tags found');
    }

    console.log('[Test] All tests passed successfully!');
  } catch (error) {
    console.error('[Test] Test failed:', error);
  } finally {
    // Close the database
    await db.close();
    console.log('[Test] Database closed');
  }
}

// Run the test
testDatabase().catch(console.error);