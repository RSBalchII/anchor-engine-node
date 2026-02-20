#!/usr/bin/env node
/**
 * Tag Quality Audit CLI
 * 
 * Usage:
 *   node --loader ts-node/esm src/commands/audit-tags.ts [options]
 * 
 * Options:
 *   --interactive, -i  Interactive review mode
 *   --output, -o       Output report file (default: ./reports/tag-audit.md)
 *   --json             Output as JSON instead of markdown
 */

import { TagAuditor } from '../services/tags/tag-auditor.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const isInteractive = args.includes('--interactive') || args.includes('-i');
  const outputIndex = args.indexOf('--output') || args.indexOf('-o');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : './reports/tag-audit.md';
  const asJson = args.includes('--json');
  
  console.log('='.repeat(60));
  console.log('  Anchor Engine - Tag Quality Auditor');
  console.log('='.repeat(60));
  console.log();
  
  try {
    const auditor = new TagAuditor();
    
    console.log('Analyzing tag quality...');
    console.log('This may take a moment depending on database size.');
    console.log();
    
    const report = await auditor.generateAuditReport();
    
    if (asJson) {
      // Output as JSON
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    
    // Generate markdown report
    const markdown = generateMarkdownReport(report);
    
    // Show summary
    console.log('Summary:');
    console.log('-'.repeat(60));
    console.log(`  Total atoms: ${report.totalAtoms.toLocaleString()}`);
    console.log(`  Total unique tags: ${report.totalTags.toLocaleString()}`);
    console.log(`  Under-tagged atoms: ${report.underTagged.length}`);
    console.log(`  Orphan tags: ${report.orphanTags.length}`);
    console.log(`  Tag clusters: ${report.tagClusters.length}`);
    console.log();
    console.log('Statistics:');
    console.log(`  Average tags per atom: ${report.statistics.avgTagsPerAtom.toFixed(2)}`);
    console.log(`  Max tags in atom: ${report.statistics.maxTagsInAtom}`);
    console.log(`  Tags used only once: ${report.statistics.tagsUsedOnce}`);
    console.log('-'.repeat(60));
    console.log();
    
    if (isInteractive) {
      await interactiveReview(report);
    }
    
    // Save report
    const fullPath = path.resolve(process.cwd(), outputPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, markdown, 'utf-8');
    
    console.log(`✓ Full audit report saved to: ${fullPath}`);
    console.log();
    console.log('Recommendations:');
    console.log('  1. Review under-tagged atoms and apply suggested tags');
    console.log('  2. Consider removing or merging orphan tags');
    console.log('  3. Review tag clusters for potential synonym rings');
    
  } catch (error: any) {
    console.error('Error during tag audit:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function generateMarkdownReport(report: any): string {
  let md = '# Tag Quality Audit Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  
  md += '## Summary\n\n';
  md += `- **Total atoms:** ${report.totalAtoms.toLocaleString()}\n`;
  md += `- **Total unique tags:** ${report.totalTags.toLocaleString()}\n`;
  md += `- **Under-tagged atoms:** ${report.underTagged.length}\n`;
  md += `- **Orphan tags:** ${report.orphanTags.length}\n`;
  md += `- **Tag clusters:** ${report.tagClusters.length}\n\n`;
  
  md += '## Statistics\n\n';
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Average tags per atom | ${report.statistics.avgTagsPerAtom.toFixed(2)} |\n`;
  md += `| Median tags per atom | ${report.statistics.medianTagsPerAtom} |\n`;
  md += `| Max tags in atom | ${report.statistics.maxTagsInAtom} |\n`;
  md += `| Unique tags | ${report.statistics.uniqueTags} |\n`;
  md += `| Tags used once | ${report.statistics.tagsUsedOnce} |\n\n`;
  
  md += '## Under-Tagged Atoms\n\n';
  md += 'These atoms have substantial content but few tags.\n\n';
  
  for (const atom of report.underTagged.slice(0, 20)) {
    md += `### ${atom.id}\n\n`;
    md += `- **Source:** ${atom.source}\n`;
    md += `- **Content length:** ${atom.contentLength} chars\n`;
    md += `- **Current tags:** ${atom.tagCount}\n`;
    md += `- **Suggested tags:** ${atom.suggestedTags.join(', ') || 'None'}\n\n`;
  }
  
  if (report.underTagged.length > 20) {
    md += `*... and ${report.underTagged.length - 20} more*\n\n`;
  }
  
  md += '## Orphan Tags\n\n';
  md += 'These tags are used only once and may be candidates for removal or merging.\n\n';
  md += report.orphanTags.slice(0, 50).join(', ');
  
  if (report.orphanTags.length > 50) {
    md += ` *... and ${report.orphanTags.length - 50} more*`;
  }
  md += '\n\n';
  
  md += '## Tag Clusters\n\n';
  md += 'These tags frequently appear together and may represent related concepts.\n\n';
  
  for (let i = 0; i < Math.min(report.tagClusters.length, 10); i++) {
    md += `**Cluster ${i + 1}:** ${report.tagClusters[i].join(' ↔ ')}\n`;
  }
  
  if (report.tagClusters.length > 10) {
    md += `\n*... and ${report.tagClusters.length - 10} more*\n`;
  }
  
  return md;
}

async function interactiveReview(report: any) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt: string): Promise<string> => 
    new Promise(resolve => rl.question(prompt, resolve));
  
  console.log();
  console.log('Interactive Review Mode');
  console.log('-'.repeat(60));
  console.log();
  
  // Review under-tagged atoms
  if (report.underTagged.length > 0) {
    console.log(`Found ${report.underTagged.length} under-tagged atoms.`);
    const review = await question('Review first 5 under-tagged atoms? (y/n): ');
    
    if (review.toLowerCase() === 'y') {
      for (let i = 0; i < Math.min(5, report.underTagged.length); i++) {
        const atom = report.underTagged[i];
        console.log();
        console.log(`[${i + 1}] ${atom.id}`);
        console.log(`    Source: ${atom.source}`);
        console.log(`    Content: ${atom.contentLength} chars, ${atom.tagCount} tags`);
        console.log(`    Suggested: ${atom.suggestedTags.join(', ') || 'None'}`);
      }
    }
  }
  
  // Review orphan tags
  if (report.orphanTags.length > 0) {
    console.log();
    console.log(`Found ${report.orphanTags.length} orphan tags (used only once).`);
    const review = await question('Show first 20 orphan tags? (y/n): ');
    
    if (review.toLowerCase() === 'y') {
      console.log();
      console.log(report.orphanTags.slice(0, 20).join(', '));
    }
  }
  
  // Review tag clusters
  if (report.tagClusters.length > 0) {
    console.log();
    console.log(`Found ${report.tagClusters.length} tag clusters.`);
    const review = await question('Show tag clusters? (y/n): ');
    
    if (review.toLowerCase() === 'y') {
      console.log();
      report.tagClusters.slice(0, 10).forEach((cluster: string[], i: number) => {
        console.log(`[${i + 1}] ${cluster.join(' ↔ ')}`);
      });
    }
  }
  
  rl.close();
  console.log();
  console.log('Review complete. See the full report for details.');
}

main();
