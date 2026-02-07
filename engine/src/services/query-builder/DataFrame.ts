/**
 * Anchor DataFrame - In-Memory Data Manipulation
 * 
 * Provides a pandas-like interface for in-memory data operations
 * Designed to work with query results from the Anchor system
 */

export type DataFrameRow = Record<string, any>;

export interface GroupByResult {
  [key: string]: DataFrameRow[];
}

export class DataFrame {
  private data: DataFrameRow[];

  constructor(data: DataFrameRow[] = []) {
    this.data = [...data]; // Create a copy to avoid external mutations
  }

  /**
   * Create a DataFrame from query results
   */
  static from(data: DataFrameRow[]): DataFrame {
    return new DataFrame(data);
  }

  /**
   * Get the number of rows in the DataFrame
   */
  get length(): number {
    return this.data.length;
  }

  /**
   * Get the column names in the DataFrame
   */
  get columns(): string[] {
    if (this.data.length === 0) return [];
    return Object.keys(this.data[0]);
  }

  /**
   * Select specific columns from the DataFrame
   */
  select(columnMap: Record<string, (row: DataFrameRow) => any>): DataFrame {
    const newData = this.data.map(row => {
      const newRow: DataFrameRow = {};
      for (const [newCol, selectorFn] of Object.entries(columnMap)) {
        newRow[newCol] = selectorFn(row);
      }
      return newRow;
    });

    return new DataFrame(newData);
  }

  /**
   * Filter rows based on a condition
   */
  filter(condition: (row: DataFrameRow) => boolean): DataFrame {
    const filteredData = this.data.filter(condition);
    return new DataFrame(filteredData);
  }

  /**
   * Transform columns using mapping functions
   */
  transform(transformations: Record<string, (row: DataFrameRow) => any>): DataFrame {
    const transformedData = this.data.map(row => {
      const newRow = { ...row };
      for (const [col, transformFn] of Object.entries(transformations)) {
        newRow[col] = transformFn(row);
      }
      return newRow;
    });

    return new DataFrame(transformedData);
  }

  /**
   * Sort the DataFrame by a specific column
   */
  sort(column: string, direction: 'asc' | 'desc' = 'asc'): DataFrame {
    const sortedData = [...this.data].sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      // Handle null/undefined values
      if (valA == null && valB == null) return 0;
      if (valA == null) return direction === 'asc' ? -1 : 1;
      if (valB == null) return direction === 'asc' ? 1 : -1;

      // Compare values
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return new DataFrame(sortedData);
  }

  /**
   * Limit the number of rows in the DataFrame
   */
  head(n: number): DataFrame {
    const limitedData = this.data.slice(0, n);
    return new DataFrame(limitedData);
  }

  /**
   * Skip the first n rows
   */
  tail(n: number): DataFrame {
    const tailData = this.data.slice(-n);
    return new DataFrame(tailData);
  }

  /**
   * Skip the first n rows
   */
  skip(n: number): DataFrame {
    const skippedData = this.data.slice(n);
    return new DataFrame(skippedData);
  }

  /**
   * Group rows by a specific column
   */
  groupBy(column: string): GroupByResult {
    const grouped: GroupByResult = {};

    for (const row of this.data) {
      const key = String(row[column]);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(row);
    }

    return grouped;
  }

  /**
   * Aggregate data by applying functions to groups
   */
  agg(aggregations: Record<string, (values: any[]) => any>): DataFrameRow[] {
    // For now, just return aggregated values for the whole dataset
    // In a more complex implementation, this would work with groupBy
    const result: DataFrameRow = {};

    for (const [col, aggFn] of Object.entries(aggregations)) {
      const values = this.data.map(row => row[col]);
      result[col] = aggFn(values);
    }

    return [result];
  }

  /**
   * Get unique values for a specific column
   */
  unique(column: string): any[] {
    const seen = new Set<any>();
    const uniqueValues: any[] = [];

    for (const row of this.data) {
      const value = row[column];
      if (!seen.has(value)) {
        seen.add(value);
        uniqueValues.push(value);
      }
    }

    return uniqueValues;
  }

  /**
   * Count occurrences of each unique value in a column
   */
  valueCounts(column: string): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const row of this.data) {
      const value = String(row[column]);
      counts[value] = (counts[value] || 0) + 1;
    }

    return counts;
  }

  /**
   * Apply a function to each row
   */
  map<T>(fn: (row: DataFrameRow, index: number) => T): T[] {
    return this.data.map(fn);
  }

  /**
   * Convert DataFrame to an array of objects
   */
  toArray(): DataFrameRow[] {
    return [...this.data];
  }

  /**
   * Convert DataFrame to CSV format
   */
  toCSV(): string {
    if (this.data.length === 0) {
      return '';
    }

    // Get headers from the first row
    const headers = Object.keys(this.data[0]);
    const headerRow = headers.join(',');

    // Convert each row to CSV
    const rows = this.data.map(row => {
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
   * Convert DataFrame to JSON format
   */
  toJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Convert DataFrame to a formatted table string
   */
  toTable(): string {
    if (this.data.length === 0) {
      return 'No results';
    }

    // Get headers
    const headers = Object.keys(this.data[0]);

    // Calculate column widths
    const colWidths: Record<string, number> = {};
    for (const header of headers) {
      colWidths[header] = Math.max(
        header.length,
        ...this.data.map(row => String(row[header] ?? '').length)
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
    const dataRows = this.data.map(row => 
      headers.map(header => 
        String(row[header] ?? '').padEnd(colWidths[header])
      ).join(' | ')
    );

    // Combine all rows
    return [headerRow, separatorRow, ...dataRows].join('\n');
  }

  /**
   * Export DataFrame to a file
   */
  async export(filename: string, format: 'csv' | 'json' | 'yaml' | 'table' = 'json'): Promise<void> {
    let content: string;

    switch (format.toLowerCase()) {
      case 'csv':
        content = this.toCSV();
        break;
      case 'json':
        content = this.toJSON();
        break;
      case 'table':
        content = this.toTable();
        break;
      case 'yaml': {
        const yaml = await import('js-yaml');
        content = yaml.dump(this.data);
        break;
      }
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    // Use Node.js fs module to write file
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Ensure the directory exists
    const dir = path.dirname(filename);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(filename, content);
  }
}