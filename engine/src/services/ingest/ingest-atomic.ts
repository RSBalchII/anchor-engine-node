import { db } from '../../core/db.js';
import { config } from '../../config/index.js';
import { Atom, Molecule, Compound } from '../../types/atomic.js';

export class AtomicIngestService {

    async ingestResult(
        compound: Compound,
        molecules: Molecule[],
        atoms: Atom[],
        buckets: string[] = ['core']
    ) {
        console.log(`[AtomicIngest] Persisting topology for ${compound.id}...`);


        // 1. Persist Atoms (Tags)
        // Deduplicate atoms by ID BEFORE batch write to prevent constraint violations
        const uniqueAtoms = Array.from(new Map(atoms.map(a => [a.id, a])).values());

        if (uniqueAtoms.length > 0) {
            const atomRows = uniqueAtoms.map(a => [
                a.id,
                a.label,
                a.type,
                a.weight,
                this.zeroVector()
            ]);

            await this.batchWriteAtoms(atomRows);
        }


        // 2. Persist Molecules
        if (molecules.length > 0) {
            const molRows = molecules.map(m => [
                m.id,
                m.content,
                m.compoundId,
                m.sequence,
                m.start_byte || 0,
                m.end_byte || 0,
                m.type || 'prose',
                m.numeric_value ?? null,
                m.numeric_unit ?? null,
                m.molecular_signature || "0",
                this.zeroVector(),
                m.timestamp
            ]);

            await this.batchWriteMolecules(molRows);
        }

        // 3. Persist Atom Edges (Graph)
        // Link Compound -> Atoms (if we did granular tagging)
        if (compound.atoms && compound.atoms.length > 0) {
            const edgeRows = compound.atoms.map(atomId => [
                compound.id,
                atomId,
                1.0,
                'has_tag'
            ]);
            await this.batchWriteEdges(edgeRows);
        }

        // 4. Persist Compound (Atomic V4)
        await this.batchWriteCompounds([
            [
                compound.id,
                compound.compound_body,
                compound.path,
                compound.timestamp,
                compound.provenance,
                compound.molecular_signature,
                compound.atoms,
                compound.molecules,
                this.zeroVector()
            ]
        ]);

        // 5. LEGACY BRIDGE: Populate 'atoms' table (was 'memory')
        // We insert Molecules as 'fragments' into atoms for RAG compatibility.
        // We also insert the Compound as 'compound' type.

        const memoryRows: any[] = [];

        // A. The Compound (File)
        memoryRows.push([
            compound.id,
            compound.compound_body, // content
            compound.path, // source_path
            compound.timestamp,
            compound.molecular_signature || "0", // simhash
            this.zeroVector(), // embedding
            compound.provenance,
            buckets,
            atoms.map(a => a.label), // tags
            // New Inflation Fields
            compound.id, // compound_id (self)
            0, // start_byte
            compound.compound_body.length // end_byte
        ]);

        // B. The Molecules (Sentences/Fragments)
        // Map Atom IDs to Labels for legacy tag support
        const atomLabelMap = new Map<string, string>();
        atoms.forEach(a => atomLabelMap.set(a.id, a.label));

        molecules.forEach(m => {
            // resolve specific tags for this molecule
            const specificTags = (m.atoms || []).map(id => atomLabelMap.get(id)).filter(l => l !== undefined) as string[];

            memoryRows.push([
                m.id,
                m.content,
                compound.path, // source_path
                m.timestamp, // Use molecule's context-aware timestamp
                m.molecular_signature || this.generateHash(m.content), // simhash
                this.zeroVector(), // embedding
                compound.provenance,
                buckets,
                specificTags, // TAGS
                // New Inflation Fields
                m.compoundId,
                m.start_byte || 0,
                m.end_byte || 0
            ]);
        });

        await this.batchWriteMemory(memoryRows);

        console.log(`[AtomicIngest] Complete: ${atoms.length} atoms, ${molecules.length} molecules.`);
    }

    private async batchWriteAtoms(rows: any[]) {
        const chunkSize = 50;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            for (const row of chunk) {
                await db.run(
                    `INSERT INTO atoms (id, content, source_path, timestamp, simhash, embedding, provenance, buckets, tags)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET
                       content = EXCLUDED.content,
                       source_path = EXCLUDED.source_path,
                       timestamp = EXCLUDED.timestamp,
                       simhash = EXCLUDED.simhash,
                       embedding = EXCLUDED.embedding,
                       provenance = EXCLUDED.provenance,
                       buckets = EXCLUDED.buckets,
                       tags = EXCLUDED.tags`,
                    [
                        row[0], // id
                        row[1], // label becomes content
                        'atom_source', // source_path
                        Date.now(), // timestamp
                        "0", // simhash
                        row[4], // embedding
                        'internal', // provenance
                        ['atoms'], // buckets
                        [row[1]] // tags
                    ]
                );
            }
        }
    }

    private async batchWriteMolecules(rows: any[]) {
        const chunkSize = 50;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            for (const row of chunk) {
                await db.run(
                    `INSERT INTO molecules (id, content, compound_id, sequence, start_byte, end_byte, type, numeric_value, numeric_unit, molecular_signature, embedding, timestamp)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                     ON CONFLICT (id) DO UPDATE SET
                       content = EXCLUDED.content,
                       compound_id = EXCLUDED.compound_id,
                       sequence = EXCLUDED.sequence,
                       start_byte = EXCLUDED.start_byte,
                       end_byte = EXCLUDED.end_byte,
                       type = EXCLUDED.type,
                       numeric_value = EXCLUDED.numeric_value,
                       numeric_unit = EXCLUDED.numeric_unit,
                       molecular_signature = EXCLUDED.molecular_signature,
                       embedding = EXCLUDED.embedding,
                       timestamp = EXCLUDED.timestamp`,
                    row
                );
            }
        }
    }

    private async batchWriteEdges(rows: any[]) {
        const chunkSize = 50;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            for (const row of chunk) {
                await db.run(
                    `INSERT INTO edges (source_id, target_id, weight, relation)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (source_id, target_id, relation) DO UPDATE SET
                       weight = EXCLUDED.weight,
                       relation = EXCLUDED.relation`,
                    row
                );
            }
        }
    }

    private async batchWriteCompounds(rows: any[]) {
        const chunkSize = 50;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            for (const row of chunk) {
                await db.run(
                    `INSERT INTO compounds (id, compound_body, path, timestamp, provenance, molecular_signature, atoms, molecules, embedding)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET
                       compound_body = EXCLUDED.compound_body,
                       path = EXCLUDED.path,
                       timestamp = EXCLUDED.timestamp,
                       provenance = EXCLUDED.provenance,
                       molecular_signature = EXCLUDED.molecular_signature,
                       atoms = EXCLUDED.atoms,
                       molecules = EXCLUDED.molecules,
                       embedding = EXCLUDED.embedding`,
                    row
                );
            }
        }
    }

    private async batchWriteMemory(rows: any[]) {
        const chunkSize = 50;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);

            for (const row of chunk) {
                await db.run(
                    `INSERT INTO atoms (id, content, source_path, timestamp, simhash, embedding, provenance, buckets, tags, compound_id, start_byte, end_byte)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                     ON CONFLICT (id) DO UPDATE SET
                       content = EXCLUDED.content,
                       source_path = EXCLUDED.source_path,
                       timestamp = EXCLUDED.timestamp,
                       simhash = EXCLUDED.simhash,
                       embedding = EXCLUDED.embedding,
                       provenance = EXCLUDED.provenance,
                       buckets = EXCLUDED.buckets,
                       tags = EXCLUDED.tags,
                       compound_id = EXCLUDED.compound_id,
                       start_byte = EXCLUDED.start_byte,
                       end_byte = EXCLUDED.end_byte`,
                    row
                );
            }
        }
    }


    private zeroVector() {
        return new Array(config.MODELS.EMBEDDING_DIM).fill(0.1);
    }

    private generateHash(str: string): string {
        // Simple hash for legacy field
        let hash = 0;
        if (str.length === 0) return "0";
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString(16);
    }
}