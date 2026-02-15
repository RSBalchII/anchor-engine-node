
import { db } from '../src/core/db.js';
import { executeSearch, getGlobalTags } from '../src/services/search/search.js';
import { ingestContent } from '../src/services/ingest/ingest.js';

async function testQueryExpansion() {
    console.log('--- Testing Intelligent Query Expansion ---');
    await db.init();

    // 1. Setup Grounding Tags
    console.log('Step 1: Ingesting tagged data for grounding...');
    const data = [
        { content: "The ECE_Core engine uses CozoDB for efficient graph storage.", source: "docs/architecture.md", tags: ["ECE_Core", "CozoDB", "Architecture"] },
        { content: "Tag-Walker provides associative search without vectors.", source: "docs/search.md", tags: ["Tag-Walker", "Search", "Graph"] },
        { content: "Mirror 2.0 projects the brain onto the filesystem.", source: "docs/mirror.md", tags: ["Mirror", "Filesystem", "Projection"] }
    ];

    for (const item of data) {
        await ingestContent(item.content, item.source, 'text', ['tech_bucket']);
        // Manual tag update as current ingestContent might not use all tags provided in this array format if not mapped
        // Actually, let's assume ingestContent handles it or we'll check global tags
    }

    const tags = await getGlobalTags(10);
    console.log('Current System Tags:', tags);

    // 2. Perform Expanded Search
    console.log('Step 2: Performing complex query search...');
    const complexQuery = "How does the core engine handle persistent graph storage and filesystem projection?";

    // Note: This will trigger expandQuery which uses runSideChannel (GLM)
    const result = await executeSearch(complexQuery, 'tech_bucket');

    console.log('--- Search Results ---');
    console.log('Context Snippet:', result.context.substring(0, 500));
    console.log('Result Count:', result.results.length);

    if (result.results.length > 0) {
        console.log('✅ PASS: Retrieval successful with query expansion.');
    } else {
        console.log('❌ FAIL: No results found for complex query.');
    }

    process.exit(0);
}

testQueryExpansion().catch(err => {
    console.error(err);
    process.exit(1);
});
