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
    this.validateIdentifier(tableName, 'table name');
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
   * Validates that an identifier (table/field name) contains only safe characters
   * to prevent SQL injection attacks. Identifiers must contain only alphanumeric
   * characters, underscores, and start with a letter or underscore.
   */
  private validateIdentifier(identifier: string, contextName: string = 'identifier'): void {
    // Allow alphanumeric characters and underscores, must start with letter or underscore
    const safeIdentifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    
    if (!safeIdentifierPattern.test(identifier)) {
      throw new Error(
        `Invalid ${contextName}: "${identifier}". ` +
        `Identifiers must contain only alphanumeric characters and underscores, ` +
        `and must start with a letter or underscore.`
      );
    }
  }

  /**
   * Escapes an identifier (table/field name) for use in SQL by wrapping it in double quotes
   * and escaping any internal double quotes by doubling them
   */
  private escapeIdentifier(identifier: string): string {
    return '"' + identifier.replace(/"/g, '""') + '"';
  }

  /**
   * Select specific fields from the table
   */
  select(fields: string[]): QueryBuilder {
    // Validate all field names before storing them, but allow '*' as a wildcard
    const validatedFields: string[] = [];
    for (const field of fields) {
      if (field === '*') {
        validatedFields.push(field);
      } else {
        this.validateIdentifier(field, 'field name');
        validatedFields.push(field);
      }
    }
    this.options.selectFields = validatedFields;
    this.clearCache();
    return this;
  }

  /**
   * Add WHERE condition to the query
   */
  where(field: string, operator: string, value: any): QueryBuilder {
    this.validateIdentifier(field, 'field name');
    this.options.whereConditions.push({ field, operator, value });
    this.clearCache();
    return this;
  }

  /**
   * Add ORDER BY clause to the query
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.validateIdentifier(field, 'field name');
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
    
    if (this.options.selectFields.length === 0 ||
      (this.options.selectFields.length === 1 && this.options.selectFields[0] === '*')
    ) {
      sql += '*';
    } else {
      sql += this.options.selectFields
        .map(field => field === '*' ? '*' : this.escapeIdentifier(field))
        .join(', ');
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
      const rawDirection = String(this.options.orderByClause.direction || '').toUpperCase();
      const safeDirection = rawDirection === 'ASC' || rawDirection === 'DESC' ? rawDirection : 'ASC';
      sql += ` ORDER BY ${this.escapeIdentifier(this.options.orderByClause.field)} ${safeDirection}`;
    }
    
    if (this.options.limitValue !== null) {
      const limit = Number(this.options.limitValue);
      if (!Number.isSafeInteger(limit) || limit <= 0) {
        throw new Error('Invalid limit value for query');
      }
      sql += ` LIMIT ${limit}`;
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