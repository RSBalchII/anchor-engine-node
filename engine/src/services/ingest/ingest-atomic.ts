
import { db } from '../../core/db.js';
import { config } from '../../config/index.js';
import { Atom, Molecule, Compound } from '../../types/atomic.js';
// We might need to import getEmbeddings from provider if we were generating them live, 
// but for 'Tag-Walker' mode we usually use zero-vectors or let a background worker handle it.
// For now, we stub/zero-vector to match current behavior unless specified.

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

            // Upsert (CozoDB :put will update on conflict)
            await this.batchWrite('atoms',
                '?[id, label, type, weight, embedding] <- $data',
                '{id, label, type, weight, embedding}',
                atomRows
            );
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
                m.numeric_value ?? null, // Use null for CozoDB if missing
                m.numeric_unit ?? null,
                m.molecular_signature || "0",
                this.zeroVector()
            ]);

            await this.batchWrite('molecules',
                '?[id, content, compound_id, sequence, start_byte, end_byte, type, numeric_value, numeric_unit, molecular_signature, embedding] <- $data',
                '{id, content, compound_id, sequence, start_byte, end_byte, type, numeric_value, numeric_unit, molecular_signature, embedding}',
                molRows
            );
        }

        // 3. Persist Atom Edges (Graph)
        // Link Compound -> Atoms and Molecules -> Atoms (if we did granular tagging)
        // For now, Compound -> Atoms
        if (compound.atoms && compound.atoms.length > 0) {
            const edgeRows = compound.atoms.map(atomId => [
                compound.id,
                atomId,
                1.0,
                'has_tag'
            ]);
            await this.batchWrite('atom_edges',
                '?[from_id, to_id, weight, relation] <- $data',
                '{from_id, to_id, weight, relation}',
                edgeRows
            );
        }

        // 4. Persist Compound (Atomic V4)
        await this.batchWrite('compounds',
            '?[id, compound_body, path, timestamp, provenance, molecular_signature, atoms, molecules, embedding] <- $data',
            '{id, compound_body, path, timestamp, provenance, molecular_signature, atoms, molecules, embedding}',
            [[
                compound.id,
                compound.compound_body,
                compound.path,
                compound.timestamp,
                compound.provenance,
                compound.molecular_signature,
                compound.atoms,
                compound.molecules,
                this.zeroVector()
            ]]
        );

        // 5. LEGACY BRIDGE: Populate 'memory' table
        // We insert Molecules as 'fragments' into memory for RAG compatibility.
        // We also insert the Compound as 'compound' type.

        const memoryRows: any[] = [];

        // A. The Compound (File)
        memoryRows.push([
            compound.id,
            compound.timestamp,
            compound.compound_body, // Re-mapped
            compound.path, // source
            compound.path, // source_id
            0,             // sequence
            'compound',    // type
            compound.molecular_signature || "0", // hash
            buckets,
            [], // epochs
            atoms.map(a => a.label), // legacy tags list
            compound.provenance,
            compound.molecular_signature || "0",
            this.zeroVector()
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
                compound.timestamp, // Share timestamp
                m.content,
                compound.path,
                compound.id, // Parent ID as source_id
                m.sequence,
                'fragment', // Legacy type
                m.molecular_signature || this.generateHash(m.content), // Use Strong SimHash if available
                buckets,
                [],
                specificTags, // GRANULAR TAGS
                compound.provenance,
                m.molecular_signature || "0", // SimHash Column
                this.zeroVector()
            ]);
        });

        await this.batchWrite('memory',
            '?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding] <- $data',
            '{id, timestamp, content, source, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding}',
            memoryRows
        );

        console.log(`[AtomicIngest] Complete: ${atoms.length} atoms, ${molecules.length} molecules.`);
    }

    private async batchWrite(table: string, queryHeader: string, queryBody: string, rows: any[]) {
        const chunkSize = 50;
        const maxRetries = 5;
        const baseDelayMs = 50;

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            let attempt = 0;
            let success = false;

            while (!success && attempt < maxRetries) {
                try {
                    const query = `${queryHeader} :put ${table} ${queryBody}`;
                    await db.run(query, { data: chunk });
                    success = true;
                } catch (e: any) {
                    attempt++;
                    const isBusy = e?.code?.includes('kBusy') || e?.message?.includes('Resource busy');

                    if (isBusy && attempt < maxRetries) {
                        // Exponential backoff with jitter
                        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 50;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        console.error(`[AtomicIngest] Failed batch write to ${table} (attempt ${attempt}):`, e?.message || JSON.stringify(e));
                        // Continue best effort - don't block the pipeline
                        success = true; // Exit retry loop
                    }
                }
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
