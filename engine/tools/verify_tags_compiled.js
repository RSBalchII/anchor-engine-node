
import { db } from '../dist/core/db.js';

async function verifyTags() {
    try {
        console.log('Verifying tags in database (using compiled core)...');

        // Query recent concept atoms
        const query = `
            SELECT id, content, type, timestamp 
            FROM atoms 
            WHERE type = 'concept' 
            ORDER BY timestamp DESC 
            LIMIT 20
        `;

        const result = await db.run(query);

        if (!result.rows || result.rows.length === 0) {
            console.log('No concept atoms found.');
        } else {
            console.log('Recent Concept Atoms (Tags):');
            result.rows.forEach((row) => {
                console.log(`[${row[2]}] ${row[1]} (ID: ${row[0]})`);
            });
        }

        // Also check for any 'Entity0' to be sure
        const entity0Query = `
            SELECT id, content 
            FROM atoms 
            WHERE content LIKE 'Entity0%' 
            LIMIT 5
        `;
        const entity0Result = await db.run(entity0Query);
        if (entity0Result.rows && entity0Result.rows.length > 0) {
            console.error('❌ FOUND ENTITY0 TAGS:', entity0Result.rows);
        } else {
            console.log('✅ No "Entity0" tags found.');
        }

    } catch (error) {
        console.error('Error verification failed:', error);
    }
}

verifyTags();
