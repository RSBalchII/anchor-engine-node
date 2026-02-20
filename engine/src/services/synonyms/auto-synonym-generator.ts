/**
 * Automated Synonym Ring Generator
 * 
 * Mines your existing data (codebase + chat logs) to automatically generate
 * synonym rings for semantic query expansion.
 * 
 * Strategies:
 * 1. Co-occurrence Analysis: Terms appearing together frequently
 * 2. Tag Neighborhood Similarity: Terms with similar tag patterns
 * 3. SimHash Proximity: Terms in atoms with similar simhashes
 * 4. Content Similarity: Terms appearing in similar contexts
 * 
 * Usage:
 *   const generator = new AutoSynonymGenerator();
 *   const synonyms = await generator.generateSynonymRings();
 *   await generator.saveSynonymRings(synonyms, './data/synonym-ring.json');
 */

import { db } from '../../core/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TermPair {
  term1: string;
  term2: string;
  score: number;
  strategy: string;
}

interface TermCluster {
  seed: string;
  synonyms: string[];
  confidence: number;
}

export class AutoSynonymGenerator {
  private MIN_CO_OCCURRENCE = 5;        // Minimum times terms must appear together
  private MIN_JACCARD_SIMILARITY = 0.5; // Minimum tag neighborhood similarity
  private MAX_SIMHASH_DISTANCE = 8;     // Maximum Hamming distance for simhash clustering
  private TOP_SYNONYMS_PER_TERM = 10;   // Maximum synonyms to suggest per term

  /**
   * Strategy 1: Co-occurrence Mining
   * Find terms that frequently appear together in the same atoms/documents.
   * 
   * SQL: Finds pairs of terms appearing in same atom content
   * Groups by term pairs, counts co-occurrences
   * Returns top N pairs per term
   */
  async mineCooccurrenceSynonyms(windowSize: number = 100): Promise<Map<string, TermPair[]>> {
    console.log('[SynonymGenerator] Strategy 1: Mining co-occurrence patterns...');
    
    try {
      // Extract terms from atom content and find co-occurrences
      // This query finds term pairs appearing in the same atom
      const query = `
        WITH term_atoms AS (
          SELECT
            a.id as atom_id,
            LOWER(t.term) as term
          FROM atoms a,
          LATERAL (
            SELECT DISTINCT LOWER(term) as term
            FROM unnest(string_to_array(a.content, ' ')) as term
            WHERE length(term) > 3
          ) t
          WHERE length(a.content) > 50
        ),
        term_pairs AS (
          SELECT 
            t1.term as term1,
            t2.term as term2,
            COUNT(DISTINCT t1.atom_id) as co_occurrence_count
          FROM term_atoms t1
          JOIN term_atoms t2 ON t1.atom_id = t2.atom_id AND t1.term < t2.term
          GROUP BY t1.term, t2.term
          HAVING COUNT(DISTINCT t1.atom_id) >= $1
        )
        SELECT term1, term2, co_occurrence_count as score
        FROM term_pairs
        ORDER BY term1, score DESC
        LIMIT 1000
      `;
      
      const result = await db.run(query, [this.MIN_CO_OCCURRENCE]);
      
      const cooccurrenceMap = new Map<string, TermPair[]>();
      
      if (!result.rows) {
        console.log('[SynonymGenerator] No co-occurrence patterns found');
        return cooccurrenceMap;
      }
      
      for (const row of result.rows as any[]) {
        const { term1, term2, score } = row;
        
        if (!cooccurrenceMap.has(term1)) {
          cooccurrenceMap.set(term1, []);
        }
        
        cooccurrenceMap.get(term1)!.push({
          term1,
          term2,
          score: parseFloat(score),
          strategy: 'cooccurrence'
        });
        
        // Also add reverse mapping
        if (!cooccurrenceMap.has(term2)) {
          cooccurrenceMap.set(term2, []);
        }
        
        cooccurrenceMap.get(term2)!.push({
          term1: term2,
          term2: term1,
          score: parseFloat(score),
          strategy: 'cooccurrence'
        });
      }
      
      console.log(`[SynonymGenerator] Found ${cooccurrenceMap.size} terms with co-occurrence synonyms`);
      return cooccurrenceMap;
    } catch (error: any) {
      console.error('[SynonymGenerator] Co-occurrence mining failed:', error.message);
      return new Map<string, TermPair[]>();
    }
  }

  /**
   * Strategy 2: Tag Neighborhood Similarity
   * Terms with similar tag patterns are likely synonyms.
   * 
   * Computes Jaccard similarity between term tag-sets.
   * Jaccard(A,B) = |A ∩ B| / |A ∪ B|
   * Clusters terms with Jaccard > threshold
   */
  async mineTagNeighborhoodSynonyms(): Promise<Map<string, TermPair[]>> {
    console.log('[SynonymGenerator] Strategy 2: Mining tag neighborhood similarity...');
    
    try {
      // Get all terms and their associated tags
      const termTagsQuery = `
        WITH term_tag_counts AS (
          SELECT 
            LOWER(unnest(tags)) as tag,
            a.id as atom_id
          FROM atoms a
          WHERE tags IS NOT NULL AND cardinality(tags) > 0
        ),
        term_tag_sets AS (
          SELECT 
            tag,
            array_agg(DISTINCT atom_id) as atom_ids
          FROM term_tag_counts
          GROUP BY tag
        )
        SELECT tag, atom_ids
        FROM term_tag_sets
        WHERE array_length(atom_ids, 1) >= 2
        ORDER BY array_length(atom_ids, 1) DESC
        LIMIT 500
      `;
      
      const result = await db.run(termTagsQuery);
      
      if (!result.rows || result.rows.length < 2) {
        console.log('[SynonymGenerator] Insufficient tag data for neighborhood analysis');
        return new Map<string, TermPair[]>();
      }
      
      const termTagSets = new Map<string, Set<string>>();
      
      for (const row of result.rows as any[]) {
        const { tag, atom_ids } = row;
        termTagSets.set(tag, new Set(atom_ids));
      }
      
      // Compute Jaccard similarity between all pairs
      const pairs = new Map<string, TermPair[]>();
      const terms = Array.from(termTagSets.keys());
      
      for (let i = 0; i < terms.length; i++) {
        for (let j = i + 1; j < terms.length; j++) {
          const term1 = terms[i];
          const term2 = terms[j];
          
          const set1 = termTagSets.get(term1)!;
          const set2 = termTagSets.get(term2)!;
          
          const intersection = new Set([...set1].filter(x => set2.has(x)));
          const union = new Set([...set1, ...set2]);
          
          const jaccard = intersection.size / union.size;
          
          if (jaccard >= this.MIN_JACCARD_SIMILARITY) {
            if (!pairs.has(term1)) {
              pairs.set(term1, []);
            }
            
            pairs.get(term1)!.push({
              term1,
              term2,
              score: jaccard,
              strategy: 'tag_neighborhood'
            });
            
            if (!pairs.has(term2)) {
              pairs.set(term2, []);
            }
            
            pairs.get(term2)!.push({
              term1: term2,
              term2: term1,
              score: jaccard,
              strategy: 'tag_neighborhood'
            });
          }
        }
      }
      
      console.log(`[SynonymGenerator] Found ${pairs.size} terms with tag neighborhood synonyms`);
      return pairs;
    } catch (error: any) {
      console.error('[SynonymGenerator] Tag neighborhood mining failed:', error.message);
      return new Map<string, TermPair[]>();
    }
  }

  /**
   * Strategy 3: SimHash Proximity
   * Terms in atoms with similar simhashes are related.
   * 
   * Groups atoms by simhash Hamming distance < threshold.
   * Extracts terms from each cluster.
   * Terms appearing in same cluster are candidates.
   */
  async mineSimHashSynonyms(): Promise<Map<string, TermPair[]>> {
    console.log('[SynonymGenerator] Strategy 3: Mining simhash proximity...');
    
    try {
      // Get atoms with their simhashes and extract key terms
      const query = `
        SELECT 
          id,
          simhash,
          content,
          tags
        FROM atoms
        WHERE simhash IS NOT NULL AND simhash != '0'
        LIMIT 1000
      `;
      
      const result = await db.run(query);
      
      if (!result.rows) {
        console.log('[SynonymGenerator] No simhash data available');
        return new Map<string, TermPair[]>();
      }
      
      // Helper to compute Hamming distance
      const hammingDistance = (hash1: string, hash2: string): number => {
        try {
          const big1 = BigInt(hash1.startsWith('0x') ? hash1 : `0x${hash1}`);
          const big2 = BigInt(hash2.startsWith('0x') ? hash2 : `0x${hash2}`);
          let xor = big1 ^ big2;
          let distance = 0;
          while (xor > 0n) {
            distance += Number(xor & 1n);
            xor >>= 1n;
          }
          return distance;
        } catch {
          return 64; // Max distance on error
        }
      };
      
      // Helper to extract terms from content
      const extractTerms = (content: string): string[] => {
        return content.toLowerCase()
          .split(/[\s\W]+/)
          .filter(term => term.length > 3 && term.length < 30)
          .slice(0, 50); // Limit terms per atom
      };
      
      // Group atoms by simhash proximity
      const atoms = result.rows as any[];
      const termClusters = new Map<string, Set<string>>();
      
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const atom1 = atoms[i];
          const atom2 = atoms[j];
          
          const distance = hammingDistance(atom1.simhash, atom2.simhash);
          
          if (distance <= this.MAX_SIMHASH_DISTANCE) {
            // These atoms are similar - extract and cluster their terms
            const terms1 = extractTerms(atom1.content);
            const terms2 = extractTerms(atom2.content);
            
            // Add cross-cluster term pairs
            for (const t1 of terms1) {
              for (const t2 of terms2) {
                if (t1 !== t2) {
                  if (!termClusters.has(t1)) {
                    termClusters.set(t1, new Set());
                  }
                  termClusters.get(t1)!.add(t2);
                }
              }
            }
          }
        }
      }
      
      // Convert clusters to pairs
      const pairs = new Map<string, TermPair[]>();
      
      for (const [term1, relatedTerms] of termClusters.entries()) {
        if (!pairs.has(term1)) {
          pairs.set(term1, []);
        }
        
        for (const term2 of relatedTerms) {
          pairs.get(term1)!.push({
            term1,
            term2,
            score: 1.0 / relatedTerms.size, // Inverse of cluster size
            strategy: 'simhash_proximity'
          });
        }
      }
      
      console.log(`[SynonymGenerator] Found ${pairs.size} terms with simhash synonyms`);
      return pairs;
    } catch (error: any) {
      console.error('[SynonymGenerator] SimHash mining failed:', error.message);
      return new Map<string, TermPair[]>();
    }
  }

  /**
   * Merge all strategies with weighted voting
   * Term pairs appearing in 2+ strategies get higher confidence
   */
  async generateSynonymRings(): Promise<Record<string, string[]>> {
    console.log('[SynonymGenerator] Generating synonym rings from all strategies...');
    
    // Run all strategies in parallel
    const [cooccurrence, neighborhood, simhash] = await Promise.all([
      this.mineCooccurrenceSynonyms(),
      this.mineTagNeighborhoodSynonyms(),
      this.mineSimHashSynonyms()
    ]);
    
    // Merge with voting
    const pairVotes = new Map<string, { score: number; strategies: Set<string> }>();
    
    for (const [term, pairs] of cooccurrence.entries()) {
      for (const pair of pairs) {
        const key = `${pair.term1}<->${pair.term2}`;
        if (!pairVotes.has(key)) {
          pairVotes.set(key, { score: 0, strategies: new Set() });
        }
        const vote = pairVotes.get(key)!;
        vote.score += pair.score;
        vote.strategies.add(pair.strategy);
      }
    }
    
    for (const [term, pairs] of neighborhood.entries()) {
      for (const pair of pairs) {
        const key = `${pair.term1}<->${pair.term2}`;
        if (!pairVotes.has(key)) {
          pairVotes.set(key, { score: 0, strategies: new Set() });
        }
        const vote = pairVotes.get(key)!;
        vote.score += pair.score * 1.5; // Weight tag neighborhood higher
        vote.strategies.add(pair.strategy);
      }
    }
    
    for (const [term, pairs] of simhash.entries()) {
      for (const pair of pairs) {
        const key = `${pair.term1}<->${pair.term2}`;
        if (!pairVotes.has(key)) {
          pairVotes.set(key, { score: 0, strategies: new Set() });
        }
        const vote = pairVotes.get(key)!;
        vote.score += pair.score;
        vote.strategies.add(pair.strategy);
      }
    }
    
    // Build final synonym rings
    const synonymRings: Record<string, string[]> = {};
    const processedPairs = new Set<string>();
    
    for (const [key, vote] of pairVotes.entries()) {
      // Require at least 2 strategies or very high score
      if (vote.strategies.size < 2 && vote.score < 3.0) {
        continue;
      }
      
      const [term1, term2] = key.split('<->>');
      
      // Add to both directions
      if (!synonymRings[term1]) {
        synonymRings[term1] = [];
      }
      if (!synonymRings[term2]) {
        synonymRings[term2] = [];
      }
      
      if (!synonymRings[term1].includes(term2) && synonymRings[term1].length < this.TOP_SYNONYMS_PER_TERM) {
        synonymRings[term1].push(term2);
      }
      if (!synonymRings[term2].includes(term1) && synonymRings[term2].length < this.TOP_SYNONYMS_PER_TERM) {
        synonymRings[term2].push(term1);
      }
    }
    
    console.log(`[SynonymGenerator] Generated ${Object.keys(synonymRings).length} synonym rings`);
    return synonymRings;
  }

  /**
   * Save to synonym ring file for @rbalchii/dse to load
   */
  async saveSynonymRings(synonyms: Record<string, string[]>, outputPath: string): Promise<void> {
    console.log(`[SynonymGenerator] Saving synonym rings to ${outputPath}...`);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Save as JSON
      const jsonContent = JSON.stringify(synonyms, null, 2);
      fs.writeFileSync(outputPath, jsonContent, 'utf-8');
      
      console.log(`[SynonymGenerator] Saved ${Object.keys(synonyms).length} synonym rings`);
      
      // Also generate a human-readable summary
      const summaryPath = outputPath.replace('.json', '-summary.md');
      this.generateSummary(synonyms, summaryPath);
      
    } catch (error: any) {
      console.error('[SynonymGenerator] Failed to save synonym rings:', error.message);
      throw error;
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(synonyms: Record<string, string[]>, outputPath: string): void {
    let markdown = '# Auto-Generated Synonym Rings\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    markdown += `Total terms: ${Object.keys(synonyms).length}\n\n`;
    markdown += '## Synonym Clusters\n\n';
    
    // Sort by number of synonyms
    const sorted = Object.entries(synonyms)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 100); // Top 100
    
    for (const [term, synonymList] of sorted) {
      markdown += `### ${term}\n`;
      markdown += `**Synonyms:** ${synonymList.join(', ')}\n\n`;
    }
    
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`[SynonymGenerator] Generated summary at ${outputPath}`);
  }

  /**
   * Load existing synonym rings
   */
  async loadExistingSynonymRings(inputPath: string): Promise<Record<string, string[]>> {
    try {
      if (!fs.existsSync(inputPath)) {
        return {};
      }
      
      const content = fs.readFileSync(inputPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      console.error('[SynonymGenerator] Failed to load existing synonym rings:', error.message);
      return {};
    }
  }
}
