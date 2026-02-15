/**
 * Export Utility Functions
 * 
 * Provides functionality to export query results in various formats
 */

import fs from 'fs/promises';
import path from 'path';

export type ExportFormat = 'csv' | 'json' | 'yaml' | 'table';

/**
 * Export results to specified format and file
 */
export async function exportResults(results: any[], filename: string, format: ExportFormat = 'json'): Promise<void> {
  let content: string;

  switch (format.toLowerCase()) {
    case 'csv':
      content = toCSV(results);
      break;
    case 'json':
      content = toJSON(results);
      break;
    case 'yaml':
      content = toYAML(results);
      break;
    case 'table':
      content = toTable(results);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  // Ensure the directory exists
  const dir = path.dirname(filename);
  await fs.mkdir(dir, { recursive: true });

  // Write the file
  await fs.writeFile(filename, content);
}

/**
 * Convert results to CSV format
 */
function toCSV(results: any[]): string {
  if (results.length === 0) {
    return '';
  }

  // Get headers from the first row
  const headers = Object.keys(results[0]);
  const headerRow = headers.join(',');

  // Convert each row to CSV
  const rows = results.map(row => {
    return headers.map(header => {
      let value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      value = String(value);
      // Escape quotes and wrap in quotes if needed
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Convert results to JSON format
 */
function toJSON(results: any[]): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Convert results to YAML format
 */
function toYAML(results: any[]): string {
  if (results.length === 0) {
    return '[]';
  }

  // Simple YAML conversion (for more complex YAML, a library would be better)
  const yamlLines = ['-'];
  
  for (let i = 0; i < results.length; i++) {
    if (i > 0) {
      yamlLines.push('-');
    }
    
    const row = results[i];
    for (const [key, value] of Object.entries(row)) {
      yamlLines.push(`  ${key}: ${formatYAMLValue(value)}`);
    }
  }
  
  return yamlLines.join('\n');
}

/**
 * Helper to format values for YAML
 */
function formatYAMLValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string') {
    // Simple string quoting if needed
    if (value.includes(' ') || value.includes('\n') || value.includes('"') || value.includes("'")) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Convert results to a formatted table string
 */
function toTable(results: any[]): string {
  if (results.length === 0) {
    return 'No results';
  }

  // Get headers
  const headers = Object.keys(results[0]);

  // Calculate column widths
  const colWidths: Record<string, number> = {};
  for (const header of headers) {
    colWidths[header] = Math.max(
      header.length,
      ...results.map(row => String(row[header] ?? '').length)
    );
  }

  // Create header row
  const headerRow = headers.map(header => 
    header.padEnd(colWidths[header])
  ).join(' | ');

  // Create separator row
  const separatorRow = headers.map(header => 
    '-'.repeat(colWidths[header])
  ).join('-|-');

  // Create data rows
  const dataRows = results.map(row => 
    headers.map(header => 
      String(row[header] ?? '').padEnd(colWidths[header])
    ).join(' | ')
  );

  // Combine all rows
  return [headerRow, separatorRow, ...dataRows].join('\n');
}