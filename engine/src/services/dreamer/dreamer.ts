/**
 * Dreamer Service - Markovian Memory Organization with Epochal Historian
 *
 * Implements:
 * 1. Markovian reasoning for background memory organization
 * 2. Deterministic Temporal Tagging for grounding memories in time
 * 3. Epochal Historian for identifying Epochs, Episodes, and Entities
 */

import { db } from '../../core/db.js';
import wink from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

// Initialize Wink-NLP (Low-Memory Model)
const nlp = wink(model);

// AsyncLock implementation for preventing concurrent dream cycles
class AsyncLock {
  private locked = false;
  private waiting: Array<(releaser: () => void) => void> = [];

  async acquire(): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      return this.release.bind(this);
    }

    return new Promise<() => void>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  private release(): void {
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next(this.release.bind(this));
    } else {
      this.locked = false;
    }
  }

  get isLocked(): boolean {
    return this.locked;
  }
}

const dreamLock = new AsyncLock();

// Temporal constants
const SEASONS: { [key: number]: string } = {
  0: 'Winter', 1: 'Winter', 2: 'Spring',
  3: 'Spring', 4: 'Spring', 5: 'Summer',
  6: 'Summer', 7: 'Summer', 8: 'Autumn',
  9: 'Autumn', 10: 'Autumn', 11: 'Winter'
};

const QUARTERS: { [key: number]: string } = {
  0: 'Q1', 1: 'Q1', 2: 'Q1',
  3: 'Q2', 4: 'Q2', 5: 'Q2',
  6: 'Q3', 7: 'Q3', 8: 'Q3',
  9: 'Q4', 10: 'Q4', 11: 'Q4'
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Generates deterministic temporal tags based on the timestamp
 */
function generateTemporalTags(timestamp: number): string[] {
  if (!timestamp) return [];

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return [];

  const tags = new Set<string>();
  const monthIndex = date.getMonth();

  // Core Date Units
  tags.add(date.getFullYear().toString());
  tags.add(MONTHS[monthIndex]);
  tags.add(DAYS[date.getDay()]);

  // Broad Temporal Buckets
  tags.add(SEASONS[monthIndex]);
  tags.add(QUARTERS[monthIndex]);

  // Time of Day
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) tags.add('Morning');
  else if (hour >= 12 && hour < 17) tags.add('Afternoon');
  else if (hour >= 17 && hour < 21) tags.add('Evening');
  else tags.add('Night');

  return Array.from(tags);
}

/**
 * Performs background memory organization using Markovian reasoning
 * Identifies Epochs, Episodes, and Entities as part of the Epochal Historian
 */
export async function dream(): Promise<{ status: string; analyzed?: number; updated?: number; message?: string }> {
  // Check if a dream cycle is already running
  if (dreamLock.isLocked) {
    return {
      status: 'skipped',
      message: 'Previous dream cycle still running'
    };
  }

  const release = await dreamLock.acquire();

  try {
    console.log('🌙 Dreamer: Starting self-organization cycle...');

    // 1. Get all memories that might benefit from re-categorization (Paginated)
    let hasMore = true;
    let offset = 0;
    const FETCH_LIMIT = 500; // Small page size for WASM safety
    const MAX_ANALYZE_LIMIT = 5000; // Cap total analysis per cycle to prevent OOM
    const memoriesToAnalyze: any[] = [];

    console.log('🌙 Dreamer: Fetching memories in pages...');

    while (hasMore && memoriesToAnalyze.length < MAX_ANALYZE_LIMIT) {
      // Order by timestamp desc to process recent ones first if we hit the limit
      const query = `SELECT id, content, buckets, timestamp FROM atoms ORDER BY timestamp DESC LIMIT ${FETCH_LIMIT} OFFSET ${offset}`;
      const result = await db.run(query);

      if (!result.rows || result.rows.length === 0) {
        hasMore = false;
        break;
      }

      // Filter memories from this page
      const pageMemories = result.rows.filter((row: any) => {
        let buckets: any, timestamp: any;
        if (row && Array.isArray(row)) {
          if (row.length >= 4) [, , buckets, timestamp] = row;
          else { buckets = []; timestamp = 0; }
        } else if (row && typeof row === 'object') {
          buckets = row.buckets; timestamp = row.timestamp;
        } else { buckets = []; timestamp = 0; }

        if (!buckets || (Array.isArray(buckets) && buckets.length === 0)) return true;

        const genericBuckets = ['core', 'misc', 'general', 'other', 'unknown'];
        const hasOnlyGenericBuckets = Array.isArray(buckets) && buckets.every((bucket: string) => genericBuckets.includes(bucket));
        if (hasOnlyGenericBuckets) return true;

        const year = new Date(timestamp).getFullYear().toString();
        if (Array.isArray(buckets) && !buckets.includes(year)) return true;

        return false;
      });

      memoriesToAnalyze.push(...pageMemories);
      offset += FETCH_LIMIT;

      // Safety break for very large DBs if we aren't finding anything
      if (offset > 50000) break;

      // Small yield
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    console.log(`🌙 Dreamer: Found ${memoriesToAnalyze.length} memories to analyze (searched ${offset} atoms).`);

    let updatedCount = 0;

    // Process in batches using Shared Module
    const { processInBatches } = await import('../../core/batch.js');
    const { config } = await import('../../config/index.js');
    const batchSize = config.DREAMER_BATCH_SIZE || 5;

    const totalBatches = Math.ceil(memoriesToAnalyze.length / batchSize);
    await processInBatches(memoriesToAnalyze, async (batch: any[], batchIndex: number) => {
      const batchStartTime = Date.now();
      if ((batchIndex + 1) % 5 === 0 || batchIndex === 0 || batchIndex === totalBatches - 1) {
        console.log(`[Dreamer] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} memories)...`);
      }

      // 1. Prepare updates mapping in memory
      const updatesMap = new Map<string, string[]>();
      for (const row of batch) {
        // Handle both array and object formats that PGlite might return
        let id: string, content: string, currentBuckets: any, timestamp: any;

        if (Array.isArray(row)) {
          // Row is in array format [id, content, buckets, timestamp]
          [id, content, currentBuckets, timestamp] = row;
        } else {
          // Row is in object format {id, content, buckets, timestamp}
          id = row.id;
          content = row.content;
          currentBuckets = row.buckets;
          timestamp = row.timestamp;
        }

        const temporalTags = generateTemporalTags(timestamp);

        let newSemanticTags: string[] = [];
        const meaningfulBuckets = (currentBuckets || []).filter((b: string) =>
          !['core', 'pending'].includes(b) && !/^\d{4}$/.test(b)
        );

        if (meaningfulBuckets.length < 2) {
          newSemanticTags = ['semantic_tag_placeholder'];
        }

        const combinedBuckets = [...new Set([...(currentBuckets || []), ...newSemanticTags, ...temporalTags])];
        let finalBuckets = [...combinedBuckets];
        if (combinedBuckets.length > 1) {
          const specificBuckets = combinedBuckets.filter((b: string) =>
            !['core', 'pending', 'misc', 'general', 'other', 'unknown', 'inbox'].includes(b)
          );
          if (specificBuckets.length > 0) {
            finalBuckets = specificBuckets;
          }
        }
        updatesMap.set(id, finalBuckets);
      }

      // 2. Bulk fetch full data for the batch
      const flatIds = batch.map(r => {
        // Handle both array and object formats that PGlite might return
        if (Array.isArray(r)) {
          return r[0]; // If array format, id is at index 0
        } else {
          return r.id; // If object format, use id property
        }
      });

      const fetchQuery = `
        SELECT id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding
        FROM atoms
        WHERE id = ANY($1)
      `;
      const fullDataResult = await db.run(fetchQuery, [flatIds]);

      if (fullDataResult.rows && fullDataResult.rows.length > 0) {
        const finalUpdateData = fullDataResult.rows.map((row: any) => {
          let id: string;

          if (Array.isArray(row)) {
            id = row[0];  // First element is always the ID in our SELECT
            const newBuckets = updatesMap.get(id);
            const updatedRow = [...row];
            updatedRow[8] = newBuckets; // index 8 is buckets
            return updatedRow;
          } else if (row && typeof row === 'object') {
            // Handle object format
            id = row.id;
            const newBuckets = updatesMap.get(id);
            // Return in the expected array format for the SQL update
            return [
              row.id,
              row.timestamp,
              row.content,
              row.source_path,
              row.source_id,
              row.sequence,
              row.type,
              row.hash,
              newBuckets, // Updated buckets
              row.epochs,
              row.tags,
              row.provenance,
              row.simhash,
              row.embedding
            ];
          } else {
            throw new Error(`Unexpected row format: ${typeof row}`);
          }
        });

        // 3. Bulk Update
        // Process each item in the batch individually to update atoms table
        // 3. Bulk Update Transaction with Sub-batching
        // Split the batch into smaller chunks to avoid PostgreSQL parameter limits (approx 65k) or massive query strings
        // 2500 items * 14 params = 35,000 params, which is safe for Postgres but might overwhelm the driver or logger
        const SUB_BATCH_SIZE = 100;

        if (finalUpdateData.length > 0) {
          await db.run('BEGIN');
          try {
            for (let j = 0; j < finalUpdateData.length; j += SUB_BATCH_SIZE) {
              const chunk = finalUpdateData.slice(j, j + SUB_BATCH_SIZE);
              const values: any[] = [];
              const placeholders: string[] = [];
              let pIndex = 1;

              for (const item of chunk) {
                // item is [id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding]
                placeholders.push(`($${pIndex}, $${pIndex + 1}, $${pIndex + 2}, $${pIndex + 3}, $${pIndex + 4}, $${pIndex + 5}, $${pIndex + 6}, $${pIndex + 7}, $${pIndex + 8}, $${pIndex + 9}, $${pIndex + 10}, $${pIndex + 11}, $${pIndex + 12}, $${pIndex + 13})`);
                values.push(...item);
                pIndex += 14;
              }

              const query = `
                  INSERT INTO atoms (id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding)
                  VALUES ${placeholders.join(', ')}
                  ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    timestamp = EXCLUDED.timestamp,
                    source_path = EXCLUDED.source_path,
                    source_id = EXCLUDED.source_id,
                    sequence = EXCLUDED.sequence,
                    type = EXCLUDED.type,
                    hash = EXCLUDED.hash,
                    buckets = EXCLUDED.buckets,
                    epochs = EXCLUDED.epochs,
                    tags = EXCLUDED.tags,
                    provenance = EXCLUDED.provenance,
                    simhash = EXCLUDED.simhash,
                    embedding = EXCLUDED.embedding
                `;

              await db.run(query, values);
            }
            await db.run('COMMIT');
            updatedCount += finalUpdateData.length;
          } catch (err) {
            console.error('[Dreamer] Batch update failed, rolling back:', err);
            await db.run('ROLLBACK');
            throw err;
          }
        }
      }

      const batchDuration = Date.now() - batchStartTime;
      const rate = Math.round((batch.length / (batchDuration / 1000)) * 10) / 10;
      if (batchDuration > 500) {
        console.log(`[Dreamer] Batch ${batchIndex + 1}/${totalBatches} completed in ${batchDuration}ms (${rate} items/sec)`);
      }
    }, { batchSize });

    // PHASE 21: Tag Infection Protocol (Standard 068)
    try {
      console.log('🌙 Dreamer: Running Tag Infection cycle...');
      const { runDiscovery } = await import('../tags/discovery.js');
      const { runInfectionLoop } = await import('../tags/infector.js');

      // 1. Teacher learns from a sample
      await runDiscovery(30);
      // 2. Student infects the entire graph
      await runInfectionLoop();
    } catch (infectionError: any) {
      console.error('🌙 Dreamer: Tag Infection failed:', infectionError.message);
    }

    // NEW: The Abstraction Pyramid - Cluster and Summarize into Episodes/Epochs
    await clusterAndSummarize();

    // MIRROR PROTOCOL: Export to Notebook
    try {
      console.log('🌙 Dreamer: Triggering Mirror Protocol...');
      // Dynamic import to handle JS file and potential circular deps
      const { createMirror } = await import('../mirror/mirror.js');
      await createMirror();
    } catch (mirrorError: any) {
      console.error('🌙 Dreamer: Mirror Protocol failed:', mirrorError.message);
    }

    return {
      status: 'success',
      analyzed: memoriesToAnalyze.length,
      updated: updatedCount
    };
  } catch (error) {
    console.error('🌙 Dreamer Fatal Error:', error);
    throw error;
  } finally {
    release();
  }
}

/**
 * The Abstraction Pyramid: Clusters Atoms into Episodes and Epochs
 * Uses Iterative Summarization to prevent Context Window overflow.
 */
async function clusterAndSummarize(): Promise<void> {
  try {
    console.log('🌙 Dreamer: Running Abstraction Pyramid analysis...');

    // Burst Mode limit: Prevent infinite loops if DB query is somehow failing to clear queue
    let loopCount = 0;
    const MAX_LOOPS = 20;

    // Keep processing until we run out of unbound atoms or hit safety limit
    while (loopCount < MAX_LOOPS) {
      loopCount++;

      // 1. Find Unbound Atoms (Level 1 Nodes without a Parent)
      const { config } = await import('../../config/index.js');
      // Increase batch size for rapid catch-up
      const limit = (config.DREAMER_BATCH_SIZE || 5) * 10;

      // We look for memories that are NOT a child in 'parent_of' (using edges table)
      // Optimized Query: Use LEFT JOIN instead of NOT IN for O(1) index usage
      const unboundQuery = `
              SELECT a.id, a.timestamp, a.content, a.tags
              FROM atoms a
              LEFT JOIN edges e ON a.id = e.target_id AND e.relation = 'parent_of'
              WHERE e.source_id IS NULL
              ORDER BY a.timestamp
              LIMIT ${limit}
      `;
      const result = await db.run(unboundQuery);

      if (!result.rows || result.rows.length === 0) {
        if (loopCount === 1) console.log('🌙 Dreamer: No unbound atoms found.');
        else console.log(`🌙 Dreamer: All unbound atoms processed after ${loopCount} cycles.`);
        break; // Done!
      }

      const atoms = result.rows.map((r: any) => {
        const ts = Number(r.timestamp);
        return {
          id: r.id,
          timestamp: isNaN(ts) ? 0 : ts, // Ensure numeric timestamp
          content: r.content,
          tags: r.tags || []
        };
      });
      console.log(`🌙 Dreamer [Cycle ${loopCount}]: Found ${atoms.length} unbound atoms. Clustering...`);

      // 2. Temporal Clustering (Gap > 15 minutes = New Cluster)
      const clusters: any[][] = [];
      let currentCluster: any[] = [];
      if (atoms.length > 0) {
        let lastTime = atoms[0].timestamp;

        for (const atom of atoms) {
          if (atom.timestamp - lastTime > config.DREAMER_CLUSTERING_GAP_MS) {
            if (currentCluster.length > 0) clusters.push(currentCluster);
            currentCluster = [];
          }
          currentCluster.push(atom);
          lastTime = atom.timestamp;
        }
        if (currentCluster.length > 0) clusters.push(currentCluster);
      }

      // 3. Process Clusters -> Episodes (Level 2)
      console.log(`🌙 Dreamer [Cycle ${loopCount}]: Processing ${clusters.length} temporal clusters...`);
      let clusterIndex = 0;
      for (const cluster of clusters) {
        clusterIndex++;
        if (cluster.length < 3) continue; // Skip tiny clusters for now

        console.log(`🌙 Dreamer: Summarizing cluster of ${cluster.length} atoms (Deterministic Episode)...`);

        // DETERMINISTIC EPISODE GENERATION (Standard 072)
        // Instead of LLM, we use pure metadata extraction for the Episode Node.
        // This is O(1) and instant.

        // A. Extract Date Range
        const startTime = cluster[0].timestamp;
        const endTime = cluster[cluster.length - 1].timestamp;

        // B. Concatenate content for Wink Analysis
        const fullText = cluster.map((a: any) => a.content).join('\n');

        // C. Extract Entities & Keywords using Wink
        const doc = nlp.readDoc(fullText);

        // Get top entities (if any)
        // Filter: Must be > 2 chars, exclude numbers
        const entities = doc.entities().out(nlp.its.value, nlp.as.freqTable)
          .filter((e: any) => e[0].length > 2 && !/^\d+$/.test(e[0]))
          .slice(0, 10)
          .map((e: any) => e[0]);

        // D. Aggregate Tags (The "Sovereign" Context)
        // Instead of weak NLP nouns, we harvest the high-quality tags from the atoms themselves.
        const tagCounts = new Map<string, number>();
        cluster.forEach((atom: any) => {
          atom.tags.forEach((tag: string) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });

        // Sort tags by frequency
        const topics = Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(entry => entry[0]);

        // Fallback: If no tags, try basic NLP nouns
        if (topics.length === 0) {
          const nouns = doc.tokens()
            .filter((t: any) => t.out(nlp.its.pos) === 'NOUN' && !t.out((nlp.its as any).stopWord))
            .out(nlp.its.normal, nlp.as.freqTable)
            .filter((t: any) => t[0].length > 3 && !/^[0-9]+$/.test(t[0]))
            .slice(0, 5)
            .map((t: any) => t[0]);
          topics.push(...nouns);
        }

        // D. Construct Metadata-Rich Content
        const episodeContent = `
EPISODE HEADER
Range: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}
Topics: ${topics.join(', ')}
Entities: ${entities.join(', ')}
Atom Count: ${cluster.length}
        `.trim();

        // Create Episode Node (Level 2)
        const crypto = await import('crypto');
        const summaryHash = crypto.createHash('sha256').update(episodeContent).digest('hex');
        const episodeId = `ep_${summaryHash.substring(0, 16)}`;

        // Insert Summary Node
        await db.run(
          `INSERT INTO summary_nodes (id, type, content, span_start, span_end, embedding)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             content = EXCLUDED.content,
             span_start = EXCLUDED.span_start,
             span_end = EXCLUDED.span_end,
             embedding = EXCLUDED.embedding`,
          [
            episodeId,
            'episode',
            episodeContent,
            startTime,
            endTime,
            JSON.stringify(new Array(384).fill(0.0)) // Placeholder
          ]
        );

        // Link Atoms to Episode (Parent_Of)
        // Link Atoms to Episode (Parent_Of) - Bulk Insert with Sub-batching
        if (cluster.length > 0) {
          const EDGE_BATCH_SIZE = 500;
          for (let j = 0; j < cluster.length; j += EDGE_BATCH_SIZE) {
            const chunk = cluster.slice(j, j + EDGE_BATCH_SIZE);
            const edgeValues: any[] = [];
            const edgePlaceholders: string[] = [];
            let k = 1;

            for (const atom of chunk) {
              if (!atom.id) {
                console.warn('[Dreamer] Skipping atom with null ID during edge creation');
                continue;
              }
              edgePlaceholders.push(`($${k}, $${k + 1}, $${k + 2}, $${k + 3})`);
              edgeValues.push(episodeId, atom.id, 1.0, 'parent_of');
              k += 4;
            }

            if (edgeValues.length > 0) {
              await db.run(
                `INSERT INTO edges (source_id, target_id, weight, relation)
                    VALUES ${edgePlaceholders.join(', ')}
                    ON CONFLICT (source_id, target_id, relation) DO UPDATE SET
                      weight = EXCLUDED.weight`,
                edgeValues
              );
            }
          }
        }

        console.log(`🌙 Dreamer: Created Episode ${episodeId} (Topics: ${topics.join(', ')})`);
      }

      // Small breathing room for event loop between bursts
      await new Promise(resolve => setTimeout(resolve, 50));
    }

  } catch (e: any) {
    console.error('🌙 Dreamer: Error in Abstraction Pyramid:', e.message);
  }
}