/**
 * Anchor Query Builder - Simplified Database Query Interface
 * 
 * Provides a fluent API for constructing database queries with JavaScript transformations
 * Designed to be LLM-friendly and human-readable while maintaining performance
 */

import { DataFrame } from './DataFrame.js';

export type TransformFunction = (row: any) => any;

export interface QueryResult {
  rows: any[];
  fields: string[];
}

export type ExportFormat = 'csv' | 'json' | 'yaml' | 'table';

export interface QueryBuilderOptions {
  tableName: string;
  selectFields: string[];
  whereConditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  orderByClause: {
    field: string;
    direction: 'ASC' | 'DESC';
  } | null;
  limitValue: number | null;
  transformFunctions: Record<string, TransformFunction>;
}

// Define a minimal database interface to work with
export interface DatabaseInterface {
  run(query: string, params?: any[]): Promise<any>;
}

export class QueryBuilder {
  private options: QueryBuilderOptions;
  private sqlCache: string | null = null;
  private paramsCache: any[] | null = null;
  private db: DatabaseInterface;

  constructor(db: DatabaseInterface, tableName: string) {
    this.db = db;
    this.options = {
      tableName,
      selectFields: [],
      whereConditions: [],
      orderByClause: null,
      limitValue: null,
      transformFunctions: {}
    };
  }

  /**
   * Escape SQL identifier (table name, column name) to prevent SQL injection
   * PostgreSQL identifiers are enclosed in double quotes, and any embedded double quotes
   * must be doubled to escape them.
   */
  private escapeIdentifier(identifier: string): string {
    // Replace any double quotes with two double quotes to escape them
    const escaped = identifier.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  /**
   * Select specific fields from the table
   */
  select(fields: string[]): QueryBuilder {
    this.options.selectFields = fields;
    this.clearCache();
    return this;
  }

  /**
   * Add WHERE condition to the query
   */
  where(field: string, operator: string, value: any): QueryBuilder {
    this.options.whereConditions.push({ field, operator, value });
    this.clearCache();
    return this;
  }

  /**
   * Add ORDER BY clause to the query
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.options.orderByClause = { field, direction };
    this.clearCache();
    return this;
  }

  /**
   * Add LIMIT clause to the query
   */
  limit(count: number): QueryBuilder {
    this.options.limitValue = count;
    this.clearCache();
    return this;
  }

  /**
   * Add JavaScript transformation functions to computed fields
   */
  transform(transformations: Record<string, TransformFunction>): QueryBuilder {
    this.options.transformFunctions = { ...this.options.transformFunctions, ...transformations };
    this.clearCache();
    return this;
  }

  /**
   * Build the SQL query string and parameters
   */
  private buildQuery(): { sql: string; params: any[] } {
    if (this.sqlCache && this.paramsCache) {
      return { sql: this.sqlCache, params: this.paramsCache };
    }

    let sql = 'SELECT ';
    
    if (this.options.selectFields.length > 0) {
      sql += this.options.selectFields.map(field => this.escapeIdentifier(field)).join(', ');
    } else {
      sql += '*';
    }
    
    sql += ` FROM ${this.escapeIdentifier(this.options.tableName)}`;
    
    const params: any[] = [];
    if (this.options.whereConditions.length > 0) {
      const whereClauses = this.options.whereConditions.map(condition => {
        // Handle different operators
        let operator = condition.operator.toUpperCase();
        if (operator === 'LIKE') {
          params.push(`%${condition.value}%`);
          return `${this.escapeIdentifier(condition.field)} LIKE $${params.length}`;
        } else if (operator === 'CONTAINS') {
          // Convert CONTAINS to LIKE for PGlite
          params.push(`%${condition.value}%`);
          return `${this.escapeIdentifier(condition.field)} LIKE $${params.length}`;
        } else if (operator === '=') {
          params.push(condition.value);
          return `${this.escapeIdentifier(condition.field)} = $${params.length}`;
        } else if (operator === '>') {
          params.push(condition.value);
          return `${this.escapeIdentifier(condition.field)} > $${params.length}`;
        } else if (operator === '<') {
          params.push(condition.value);
          return `${this.escapeIdentifier(condition.field)} < $${params.length}`;
        } else if (operator === '>=') {
          params.push(condition.value);
          return `${this.escapeIdentifier(condition.field)} >= $${params.length}`;
        } else if (operator === '<=') {
          params.push(condition.value);
          return `${this.escapeIdentifier(condition.field)} <= $${params.length}`;
        } else {
          // Default to equality
          params.push(condition.value);
          return `${this.escapeIdentifier(condition.field)} = $${params.length}`;
        }
      });
      
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    
    if (this.options.orderByClause) {
      sql += ` ORDER BY ${this.escapeIdentifier(this.options.orderByClause.field)} ${this.options.orderByClause.direction}`;
    }
    
    if (this.options.limitValue !== null) {
      sql += ` LIMIT ${this.options.limitValue}`;
    }

    this.sqlCache = sql;
    this.paramsCache = params;

    return { sql, params };
  }

  /**
   * Apply JavaScript transformations to the results
   */
  private applyTransformations(rows: any[]): any[] {
    if (Object.keys(this.options.transformFunctions).length === 0) {
      return rows;
    }

    return rows.map(row => {
      const newRow = { ...row };
      
      for (const [fieldName, transformFn] of Object.entries(this.options.transformFunctions)) {
        newRow[fieldName] = transformFn(row);
      }
      
      return newRow;
    });
  }

  /**
   * Clear cached SQL and parameters when query changes
   */
  private clearCache(): void {
    this.sqlCache = null;
    this.paramsCache = null;
  }

  /**
   * Execute the query and return results
   */
  async execute(): Promise<any[]> {
    const { sql, params } = this.buildQuery();
    const result = await this.db.run(sql, params);
    return this.applyTransformations(result.rows || []);
  }

  /**
   * Execute the query and return a DataFrame
   */
  async toDataFrame(): Promise<DataFrame> {
    const results = await this.execute();
    return DataFrame.from(results);
  }

  /**
   * Export results to specified format and file
   */
  async export(filename: string, format: ExportFormat = 'json'): Promise<void> {
    const results = await this.execute();
    
    // Import the export utility
    const { exportResults } = await import('./utils/export.js');
    await exportResults(results, filename, format);
  }

  /**
   * Get the generated SQL query (for debugging)
   */
  getSQL(): { sql: string; params: any[] } {
    return this.buildQuery();
  }
}

/**
 * Convenience function to start building a query
 * This assumes the db instance is available in the context where it's used
 */
export function createQueryBuilder(db: DatabaseInterface, table: string): QueryBuilder {
  return new QueryBuilder(db, table);
}