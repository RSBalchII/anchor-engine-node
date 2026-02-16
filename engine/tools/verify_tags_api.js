
async function verifyTags() {
    try {
        console.log('Verifying tags via API (http://localhost:3160)...');

        const query = `
            SELECT id, content, type, timestamp 
            FROM atoms 
            WHERE id LIKE 'atom_%'
            ORDER BY timestamp DESC 
            LIMIT 20
        `;

        const response = await fetch('http://localhost:3160/v1/debug/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.rows || result.rows.length === 0) {
            console.log('No concept atoms found.');
        } else {
            console.log('Recent Concept Atoms (Tags):');
            result.rows.forEach((row) => {
                // Row format depends on driver, usually array in PGlite
                console.log(`[${row[2]}] ${row[1]} (ID: ${row[0]})`);
            });
        }

        // Check for Entity0
        const entity0Query = `
            SELECT id, content 
            FROM atoms 
            WHERE content LIKE 'Entity0%' 
            LIMIT 5
        `;

        const e0Response = await fetch('http://localhost:3160/v1/debug/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: entity0Query })
        });

        const e0Result = await e0Response.json();

        if (e0Result.rows && e0Result.rows.length > 0) {
            console.error('❌ FOUND ENTITY0 TAGS:', e0Result.rows);
        } else {
            console.log('✅ No "Entity0" tags found.');
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

verifyTags();
