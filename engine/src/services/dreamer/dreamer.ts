/**
 * Dreamer Service - Markovian Memory Organization with Epochal Historian
 *
 * Implements:
 * 1. Markovian reasoning for background memory organization
 * 2. Deterministic Temporal Tagging for grounding memories in time
 * 3. Epochal Historian for identifying Epochs, Episodes, and Entities
 */

import { db } from '../../core/db.js';

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

    // 1. Get all memories that might benefit from re-categorization
    const allMemoriesQuery = '?[id, content, buckets, timestamp] := *memory{id, content, buckets, timestamp}';
    const allMemoriesResult = await db.run(allMemoriesQuery);

    if (!allMemoriesResult.rows || allMemoriesResult.rows.length === 0) {
      return { status: 'success', analyzed: 0, message: 'No memories to analyze' };
    }

    // Filter memories that need attention
    const memoriesToAnalyze = allMemoriesResult.rows.filter((row: any[]) => {
      const [_, __, buckets, timestamp] = row;

      // Always include memories with no buckets
      if (!buckets || buckets.length === 0) return true;

      // Include memories with generic buckets
      const genericBuckets = ['core', 'misc', 'general', 'other', 'unknown'];
      const hasOnlyGenericBuckets = buckets.every((bucket: string) => genericBuckets.includes(bucket));
      if (hasOnlyGenericBuckets) return true;

      // Include memories that lack temporal tags
      const year = new Date(timestamp).getFullYear().toString();
      if (!buckets.includes(year)) return true;

      return false;
    });

    console.log(`🌙 Dreamer: Found ${memoriesToAnalyze.length} memories to analyze.`);

    let updatedCount = 0;

    // Process in batches using Shared Module
    const { processInBatches } = await import('../../core/batch.js');
    const { config } = await import('../../config/index.js');
    const batchSize = config.DREAMER_BATCH_SIZE || 5;

    const totalBatches = Math.ceil(memoriesToAnalyze.length / batchSize);
    await processInBatches(memoriesToAnalyze, async (batch: any[], batchIndex: number) => {
      if ((batchIndex + 1) % 5 === 0 || batchIndex === 0 || batchIndex === totalBatches - 1) {
        console.log(`[Dreamer] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} memories)...`);
      }

      for (const row of batch) {
        const [id, _content, currentBuckets, timestamp] = row;

        try {
          // Generate temporal tags
          const temporalTags = generateTemporalTags(timestamp);

          // Only call LLM for semantic tags if we don't have rich tags yet
          let newSemanticTags: string[] = [];
          const meaningfulBuckets = (currentBuckets || []).filter((b: string) =>
            !['core', 'pending'].includes(b) && !/^\d{4}$/.test(b) // Exclude years
          );

          if (meaningfulBuckets.length < 2) {
            newSemanticTags = ['semantic_tag_placeholder'];
          }

          // Combine tags: Old + Semantic + Temporal
          const combinedBuckets = [
            ...new Set([
              ...(currentBuckets || []),
              ...newSemanticTags,
              ...temporalTags
            ])
          ];

          // Cleanup: Remove generic tags if we have specific ones
          let finalBuckets = [...combinedBuckets];
          if (combinedBuckets.length > 1) {
            const specificBuckets = combinedBuckets.filter((b: string) =>
              !['core', 'pending', 'misc', 'general', 'other', 'unknown', 'inbox'].includes(b)
            );
            if (specificBuckets.length > 0) {
              finalBuckets = specificBuckets;
            }
          }

          // Update the memory with new buckets
          const updateQuery = `?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding] := *memory{id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding}, id = $id`;
          const currentResult = await db.run(updateQuery, { id });

          if (currentResult.rows && currentResult.rows.length > 0) {
            const [_, ts, cont, src, srcId, seq, typ, hash, __, tag, epoch, prov, emb] = currentResult.rows[0];

            // Delete old record
            await db.run(`?[id] <- [[$id]] :delete memory {id}`, { id });

            // Insert updated record with ALL columns
            await db.run(
              `?[id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding] <- $data :put memory {id, timestamp, content, source, source_id, sequence, type, hash, buckets, tags, epochs, provenance, embedding}`,
              { data: [[id, ts, cont, src, srcId, seq, typ, hash, finalBuckets, tag, epoch, prov, emb]] }
            );

            updatedCount++;
          }
        } catch (error: any) {
          console.error(`🌙 Dreamer: Failed to process memory ${id}:`, error.message);
        }
      }
    }, { batchSize });

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

    const { runSideChannel } = await import('../llm/provider.js');

    // 1. Find Unbound Atoms (Level 1 Nodes without a Parent)
    const { config } = await import('../../config/index.js');
    const limit = (config.DREAMER_BATCH_SIZE || 5) * 4; // Fetch 4x batch size for clustering context

    // We look for memories that are NOT a child in 'parent_of'
    // Cozo: `?[id] := *memory{id}, not *parent_of{child_id: id}`
    const unboundQuery = `
            ?[id, timestamp, content] := *memory{id, timestamp, content},
            not *parent_of{child_id: id},
            :order timestamp
    :limit ${limit}
    `;
    const result = await db.run(unboundQuery);

    if (!result.rows || result.rows.length === 0) {
      console.log('🌙 Dreamer: No unbound atoms found.');
      return;
    }

    const atoms = result.rows.map((r: any[]) => ({ id: r[0], timestamp: r[1], content: r[2] }));
    console.log(`🌙 Dreamer: Found ${atoms.length} unbound atoms.Clustering...`);

    // 2. Temporal Clustering (Gap > 15 minutes = New Cluster)
    const clusters: any[][] = [];
    let currentCluster: any[] = [];
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

    // 3. Process Clusters -> Episodes (Level 2)
    for (const cluster of clusters) {
      if (cluster.length < 3) continue; // Skip tiny clusters for now, wait for more context? 
      // Or just summarize them if they are old enough?
      // For now, let's process clusters of size >= 3.

      console.log(`🌙 Dreamer: Summarizing cluster of ${cluster.length} atoms...`);

      // Iterative Summarization (Map-Reduce)
      let runningSummary = "";

      // Map: Read Atoms
      // Reduce: Summarize (Prev + Next)

      for (let i = 0; i < cluster.length; i++) {
        const atom = cluster[i];
        const content = String(atom.content);

        // If we have a running summary, combine it.
        if (runningSummary) {
          // Reduce Step
          const prompt = `
                    Current Episode Summary: "${runningSummary}"
                    
                    Next Event: "${content}"
                    
                    Update the summary to include the new event naturally.Keep it concise.
                    `;
          const updated = (await runSideChannel(prompt)) as string;
          if (updated) runningSummary = updated;
          else runningSummary += `\n${content} `; // Fallback
        } else {
          // Start
          runningSummary = content;
          // Initial summarization if first chunk is huge?
          if (content.length > 500) {
            const initialFix = (await runSideChannel(`Summarize this event concisely: ${content} `)) as string;
            if (initialFix) runningSummary = initialFix;
          }
        }
      }

      // Create Episode Node (Level 2)
      const crypto = await import('crypto');
      const summaryHash = crypto.createHash('sha256').update(runningSummary).digest('hex');
      const episodeId = `ep_${summaryHash.substring(0, 16)} `;
      const startTime = cluster[0].timestamp;
      const endTime = cluster[cluster.length - 1].timestamp;

      // Insert Summary Node
      // :create summary_node { id, type, content, span_start, span_end, embedding }
      await db.run(
        `?[id, type, content, span_start, span_end, embedding] <- [[$id, $type, $content, $start, $end, $emb]]
      :put summary_node { id, type, content, span_start, span_end, embedding }`,
        {
          id: episodeId,
          type: 'episode',
          content: runningSummary,
          start: startTime,
          end: endTime,
          emb: new Array(384).fill(0.0) // Placeholder
        }
      );

      // Link Atoms to Episode (Parent_Of)
      const edges = cluster.map(atom => [episodeId, atom.id, 1.0]);
      await db.run(
        `?[parent_id, child_id, weight] <- $edges :put parent_of { parent_id, child_id, weight }`,
        { edges }
      );

      console.log(`🌙 Dreamer: Created Episode ${episodeId} from ${cluster.length} atoms.`);
    }

  } catch (e: any) {
    console.error('🌙 Dreamer: Error in Abstraction Pyramid:', e.message);
  }
}