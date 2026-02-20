import { db } from '../engine/src/core/db.js';
import { executeSearch } from '../engine/src/services/search/search.js';
import { PhysicsTagWalker } from '../engine/src/services/search/physics-tag-walker.js';

async function verify() {
    console.log('[Verify] Initializing DB...');
    // Force path to populated database
    process.env.PGLITE_DB_PATH = 'c:/Users/rsbiiw/Projects/anchor-engine-sync/engine/context_data';
    await db.init();

    const query = 'STAR Algorithm explained';
    const provenance = 'internal';
    const buckets = ['Personal'];

    console.log(`[Verify] Running search for: "${query}"`);

    const atomCount = await db.run('SELECT count(*) as count FROM atoms');
    const moleculeCount = await db.run('SELECT count(*) as count FROM molecules');
    console.log(`[Verify] DB Stats: ${atomCount.rows[0].count} Atoms, ${moleculeCount.rows[0].count} Molecules.`);


    const startTime = Date.now();
    const searchResult = await executeSearch(query, undefined, buckets, 12288, false, provenance);
    const elapsed = Date.now() - startTime;

    console.log(`[Verify] Search completed in ${elapsed}ms`);
    console.log(`[Verify] Found ${searchResult.results.length} total results.`);

    // Debug: Inspect tags for the top hits
    if (searchResult.results.length > 0) {
        const topHit = searchResult.results[0];
        console.log(`[Verify] Top Hit ID: ${topHit.id}, CompoundID: ${topHit.compound_id}`);

        // 1. Verify resolved_atoms logic
        const resolved = await db.run(`
            SELECT a.id as atom_id FROM atoms a
            JOIN molecules m ON a.compound_id = m.compound_id
            WHERE m.id = $1
        `, [topHit.id]);
        console.log(`[Verify] Resolved Atom IDs for molecule ${topHit.id}: ${resolved.rows.length}`);
        if (resolved.rows.length > 0) {
            console.log('[Verify] Sample Atom ID:', resolved.rows[0].atom_id);
        }

        // Find Atoms for this molecule's compound
        const atomTags = await db.run(`
            SELECT t.tag, a.id 
            FROM tags t 
            JOIN atoms a ON t.atom_id = a.id 
            WHERE a.compound_id = $1
        `, [topHit.compound_id]);

        console.log(`[Verify] Tags found for compound ${topHit.compound_id}: ${atomTags.rows.length}`);
        if (atomTags.rows.length > 0) {
            console.log('[Verify] Sample Tags:', atomTags.rows.slice(0, 5).map((r: any) => r.tag).join(', '));
        }
    }

    // Check for Physics discoveries
    const associations = searchResult.results.filter(r => (r as any).physics);
    console.log(`[Verify] Physics Associations found: ${associations.length}`);

    if (associations.length > 0) {
        console.log('[Verify] Sample Association:', associations[0].content.substring(0, 100));
    }

    // Check if "star" keyword was found in any result
    const starHits = searchResult.results.filter(r => r.content.toLowerCase().includes('star'));
    console.log(`[Verify] Content hits containing 'star': ${starHits.length}`);

    process.exit(0);
}

verify().catch(err => {
    console.error('[Verify] Failed:', err);
    process.exit(1);
});
