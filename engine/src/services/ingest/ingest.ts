/**
 * Ingest Service - Memory Ingestion with Provenance Tracking
 *
 * Implements the Data Provenance feature by adding a 'provenance' column
 * to distinguish between "Sovereign" (User-Created) and "Ancillary" (External) data.
 */

import { db } from '../../core/db.js';
import crypto from 'crypto';
import { config } from '../../config/index.js';

interface IngestOptions {
  atomize?: boolean;
}

/**
 * Determines the provenance of content based on its source
 */
function determineProvenance(source: string, type?: string): 'internal' | 'external' | 'system' {
  const normalizedSource = source.replace(/\\/g, '/');

  // 1. Explicit Trusted Inbox (or default 'inbox' folder)
  // Matches "inbox/..." or ".../inbox/..."
  if (normalizedSource.includes('/inbox/') || normalizedSource.startsWith('inbox/') ||
    normalizedSource.includes('/internal-inbox/') || normalizedSource.startsWith('internal-inbox/') ||
    normalizedSource.includes('/sovereign/') ||
    type === 'user') {
    return 'internal';
  }

  // 2. Explicit External Inbox
  // Matches "external-inbox/..." or ".../external-inbox/..."
  if (normalizedSource.includes('/external-inbox/') || normalizedSource.startsWith('external-inbox/') ||
    normalizedSource.includes('web_scrape') ||
    normalizedSource.includes('news_agent') ||
    type === 'external') {
    return 'external';
  }

  // Default to external only if it didn't match the explicitly internal folders above
  // Note: We flipped the order to prioritize the known 'inbox' check which was failing before (falling through to default)
  return 'external';
}

/**
 * Ingest content into the memory database with provenance tracking
 */
export async function ingestContent(
  content: string,
  source: string,
  type: string = 'text',
  buckets: string[] = ['core'],
  tags: string[] = [],
  _options: IngestOptions = {}
): Promise<{ status: string; id?: string; message?: string }> {

  if (!content) {
    throw new Error('Content is required for ingestion');
  }

  // --- NATIVE ACCELERATION: HTML Parsing ---
  // Use the "Iron Lung" native parser for HTML/Web content
  let processedContent = content;
  let processedTags = [...tags];

  if (type === 'html' || type === 'web_page') {
    /*
    try {
      const { nativeModuleManager } = await import('../../utils/native-module-manager.js');
      const native = nativeModuleManager.loadNativeModule('ece_native', 'ece_native.node');

      if (native && native.HtmlIngestor) {
        console.log('[Ingest] Engaging Native HTML Parser ⚡');

        // 1. Extract Clean Text
        const cleanText = native.HtmlIngestor.extractContent(content);
        if (cleanText && cleanText.length > 0) {
          processedContent = cleanText;
        }

        // 2. Extract Metadata
        const metadata = native.HtmlIngestor.extractMetadata(content);
        if (metadata) {
          if (metadata.title) processedTags.push(`meta:title:${metadata.title.replace(/[:,\s]+/g, '_')}`);
          // Add other metadata as needed
        }
      }
    } catch (e) {
      console.warn('[Ingest] Native HTML parsing failed, using raw content:', e);
    }
    */
    // Native parser disabled for stability
    console.log('[Ingest] Native HTML parser disabled for stability. Using raw content.');
  }

  // Auto-assign provenance based on source
  const provenance = determineProvenance(source, type);

  // Generate hash for content deduplication (using processed content)
  const hash = crypto.createHash('md5').update(processedContent).digest('hex');

  // Check if content with same hash already exists
  const existingQuery = `SELECT id FROM atoms WHERE simhash = $1`;
  const existingResult = await db.run(existingQuery, [BigInt(hash)]);

  if (existingResult.rows && existingResult.rows.length > 0) {
    return {
      status: 'skipped',
      id: existingResult.rows[0][0],
      message: 'Content with same hash already exists'
    };
  }

  // Generate unique ID
  const id = `mem_${Date.now()}_${crypto.randomBytes(8).toString('hex').substring(0, 16)}`;
  const timestamp = Date.now();

  // Process content into semantic molecules using the semantic processor
  const { SemanticMoleculeProcessor } = await import('../semantic/semantic-molecule-processor.js');
  const semanticProcessor = new SemanticMoleculeProcessor();
  const semanticMolecule = await semanticProcessor.processTextChunk(processedContent, source, timestamp, provenance);

  // Extract semantic categories and contained entities from the semantic molecule
  const semanticCategories = semanticMolecule.semanticTags || [];
  const containedEntities = semanticMolecule.containedEntities || [];

  // Combine semantic categories with existing tags
  const allTags = [...new Set([...tags, ...semanticCategories.map((cat: string) => cat.replace('#', ''))])];

  // Insert the atom with provenance information
  const insertQuery = `
    INSERT INTO atoms (id, content, source_path, timestamp, simhash, embedding, provenance)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO NOTHING
  `;

  // Create a dummy embedding array with the correct dimensions
  const embeddingArray = new Array(config.MODELS.EMBEDDING_DIM).fill(0.1);

  await db.run(insertQuery, [
    id,
    processedContent,
    source,
    timestamp,
    BigInt(hash),
    embeddingArray,
    provenance
  ]);

  // Insert tags
  for (const tag of allTags) {
    const tagInsertQuery = `
      INSERT INTO tags (atom_id, tag, bucket)
      VALUES ($1, $2, $3)
      ON CONFLICT (atom_id, tag) DO NOTHING
    `;
    await db.run(tagInsertQuery, [id, tag, buckets[0]]);
  }

  // Strict Read-After-Write Verification (Standard 059)
  const verifyQuery = `SELECT id FROM atoms WHERE id = $1`;
  const verify = await db.run(verifyQuery, [id]);
  if (!verify.rows || verify.rows.length === 0) {
    throw new Error(`Ingestion Verification Failed: ID ${id} not found after write.`);
  }

  return {
    status: 'success',
    id,
    message: 'Content ingested successfully with provenance tracking'
  };
}

export interface IngestAtom {
  id: string;
  content: string;
  sourceId: string;
  sourcePath: string; // Preservation of original context
  sequence: number;
  timestamp: number;
  provenance: 'internal' | 'external' | 'quarantine';
  embedding?: number[];
  hash?: string; // Explicit hash to avoid ID-based guessing
  simhash?: string;
  tags?: string[];
  payload?: any; // Crystal Atom Data (JSONB)
}

/**
 * Ingest pre-processed atoms
 */
export async function ingestAtoms(
  atoms: IngestAtom[],
  source: string,
  buckets: string[] = ['core'],
  tags: string[] = [], // Batch-level tags (e.g., "inbox")
  fileTimestamp?: number
): Promise<number> {

  if (atoms.length === 0) return 0;

  let inserted = 0;

  // Process each atom individually for better error handling
  for (const atom of atoms) {
    // MERGE: Combine Batch Tags + Atom-Specific Tags (Deduplicated)
    const atomSpecificTags = atom.tags || [];
    const finalTags = [...new Set([...tags, ...atomSpecificTags])];

    // Insert the atom
    const atomInsertQuery = `
      INSERT INTO atoms (id, content, source_path, timestamp, simhash, embedding, provenance, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        source_path = EXCLUDED.source_path,
        timestamp = EXCLUDED.timestamp,
        simhash = EXCLUDED.simhash,
        embedding = EXCLUDED.embedding,
        provenance = EXCLUDED.provenance,
        payload = EXCLUDED.payload
    `;

    // Convert simhash to BigInt if it exists
    let simhashBigInt: bigint | null = null;
    if (atom.simhash) {
      try {
        simhashBigInt = BigInt(atom.simhash);
      } catch (e) {
        console.warn(`[Ingest] Invalid simhash for atom ${atom.id}: ${atom.simhash}`);
      }
    }

    // Standard 096: Timestamp Assignment Protocol with Fallback Hierarchy
    // Priority: 1) Content-specific temporal markers (atom.timestamp)
    //           2) File modification time (fileTimestamp)
    //           3) Ingestion time (Date.now())
    let finalTimestamp = atom.timestamp;
    if (!finalTimestamp || finalTimestamp <= 0 || isNaN(finalTimestamp)) {
      finalTimestamp = (fileTimestamp != null) ? fileTimestamp : Date.now();
    }

    // Prepare embedding array
    let embeddingArray: number[] = new Array(config.MODELS.EMBEDDING_DIM).fill(0.1);
    if (atom.embedding && atom.embedding.length === config.MODELS.EMBEDDING_DIM) {
      embeddingArray = atom.embedding;
    }

    // Prepare Payload (JSONB)
    const payloadJson = atom.payload ? JSON.stringify(atom.payload) : '{}';

    await db.run(atomInsertQuery, [
      atom.id,
      atom.content,
      atom.sourcePath,
      finalTimestamp,
      simhashBigInt || 0n,
      embeddingArray,
      atom.provenance,
      payloadJson
    ]);

    // Insert associated tags
    for (const tag of finalTags) {
      const tagInsertQuery = `
        INSERT INTO tags (atom_id, tag, bucket)
        VALUES ($1, $2, $3)
        ON CONFLICT (atom_id, tag) DO UPDATE SET
          bucket = EXCLUDED.bucket
      `;
      await db.run(tagInsertQuery, [atom.id, tag, buckets[0]]);
    }

    // Standard 059: Verification
    const verifyQuery = `SELECT id FROM atoms WHERE id = $1`;
    const verifyResult = await db.run(verifyQuery, [atom.id]);
    if (verifyResult.rows && verifyResult.rows.length > 0) {
      inserted++;
    } else {
      console.error(`[Ingest] Verification failed for atom: ${atom.id}`);
    }
  }

  return inserted;
}

/**
 * Bulk import YAML content with provenance tracking
 */
export async function importYamlContent(yamlContent: any[]): Promise<{ imported: number; skipped: number; errors: number }> {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of yamlContent) {
    try {
      if (!record.content) {
        errors++;
        continue;
      }

      const result = await ingestContent(
        record.content,
        record.source || 'yaml_import',
        record.type || 'text',
        record.buckets || ['imported'],
        record.tags || []
      );

      if (result.status === 'success') {
        imported++;
      } else if (result.status === 'skipped') {
        skipped++;
      }
    } catch (error) {
      console.error('YAML import error for record:', record, error);
      errors++;
    }
  }

  return { imported, skipped, errors };
}