#!/usr/bin/env node
/**
 * Generate Synonym Rings CLI
 * 
 * Usage:
 *   node --loader ts-node/esm src/commands/generate-synonyms.ts [options]
 * 
 * Options:
 *   --output, -o  Output file path (default: ./data/synonym-ring.json)
 *   --merge       Merge with existing synonym rings
 *   --dry-run     Generate but don't save
 */

import { AutoSynonymGenerator } from '../services/synonyms/auto-synonym-generator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const outputIndex = args.indexOf('--output') || args.indexOf('-o');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : './data/synonym-ring.json';
  
  const shouldMerge = args.includes('--merge');
  const isDryRun = args.includes('--dry-run');
  
  console.log('='.repeat(60));
  console.log('  Anchor Engine - Automated Synonym Ring Generator');
  console.log('='.repeat(60));
  console.log();
  console.log(`Output: ${outputPath}`);
  console.log(`Merge with existing: ${shouldMerge ? 'Yes' : 'No'}`);
  console.log(`Dry run: ${isDryRun ? 'Yes' : 'No'}`);
  console.log();
  
  try {
    const generator = new AutoSynonymGenerator();
    
    // Load existing if merging
    let existingSynonyms = {};
    if (shouldMerge) {
      const fullPath = path.resolve(process.cwd(), outputPath);
      existingSynonyms = await generator.loadExistingSynonymRings(fullPath);
      if (Object.keys(existingSynonyms).length > 0) {
        console.log(`Loaded ${Object.keys(existingSynonyms).length} existing synonym rings`);
      }
    }
    
    // Generate new synonym rings
    console.log('Generating synonym rings from your data...');
    console.log('This may take a few minutes depending on database size.');
    console.log();
    
    const newSynonyms = await generator.generateSynonymRings();
    
    console.log();
    console.log(`Generated ${Object.keys(newSynonyms).length} new synonym rings`);
    console.log();
    
    // Merge if requested
    const finalSynonyms = shouldMerge 
      ? { ...existingSynonyms, ...newSynonyms }
      : newSynonyms;
    
    // Show preview
    console.log('Preview (top 20 synonym rings):');
    console.log('-'.repeat(60));
    
    const preview = Object.entries(finalSynonyms)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20);
    
    for (const [term, synonyms] of preview) {
      console.log(`  ${term}: ${synonyms.join(', ')}`);
    }
    
    console.log('-'.repeat(60));
    console.log();
    
    // Save if not dry run
    if (!isDryRun) {
      const fullPath = path.resolve(process.cwd(), outputPath);
      await generator.saveSynonymRings(finalSynonyms, fullPath);
      
      console.log();
      console.log('✓ Synonym rings saved successfully!');
      console.log();
      console.log('Next steps:');
      console.log('  1. Review the generated synonym rings in the summary file');
      console.log('  2. Edit if needed to remove incorrect associations');
      console.log('  3. The synonym ring will be automatically loaded on next engine start');
    } else {
      console.log();
      console.log('⊘ Dry run - no files saved');
    }
    
  } catch (error: any) {
    console.error('Error generating synonym rings:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
