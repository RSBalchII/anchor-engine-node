/**
 * Unit tests for QueryBuilder SQL injection prevention
 */

import { QueryBuilder } from '../dist/services/query-builder/QueryBuilder.js';

// Mock database interface
const mockDb = {
  async run(query, params) {
    return { rows: [], fields: [] };
  }
};

console.log('\n╔════════════════════════════════════════╗');
console.log('║  QueryBuilder Security Tests          ║');
console.log('╚════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passCount++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failCount++;
  }
}

// Test 1: Normal table name should work
test('Normal table name', () => {
  const qb = new QueryBuilder(mockDb, 'users');
  const { sql } = qb.getSQL();
  if (!sql.includes('FROM "users"')) {
    throw new Error(`Expected SQL to contain 'FROM "users"', got: ${sql}`);
  }
});

// Test 2: Table name with embedded quotes should be escaped
test('Table name with embedded double quotes', () => {
  const qb = new QueryBuilder(mockDb, 'user"s');
  const { sql } = qb.getSQL();
  // Should escape the quote: "user""s"
  if (!sql.includes('FROM "user""s"')) {
    throw new Error(`Expected SQL to contain 'FROM "user""s"', got: ${sql}`);
  }
  // Should NOT have unescaped quote that would break out
  if (sql.includes('FROM "user"s"')) {
    throw new Error(`SQL has unescaped quote vulnerability: ${sql}`);
  }
});

// Test 3: Field name with embedded quotes should be escaped in SELECT
test('Field name with embedded double quotes in SELECT', () => {
  const qb = new QueryBuilder(mockDb, 'users');
  qb.select(['name"field']);
  const { sql } = qb.getSQL();
  // Should escape the quote: "name""field"
  if (!sql.includes('"name""field"')) {
    throw new Error(`Expected SQL to contain '"name""field"', got: ${sql}`);
  }
});

// Test 4: Field name with embedded quotes should be escaped in WHERE
test('Field name with embedded double quotes in WHERE', () => {
  const qb = new QueryBuilder(mockDb, 'users');
  qb.where('user"name', '=', 'test');
  const { sql } = qb.getSQL();
  // Should escape the quote: "user""name"
  if (!sql.includes('"user""name"')) {
    throw new Error(`Expected SQL to contain '"user""name"', got: ${sql}`);
  }
});

// Test 5: Field name with embedded quotes should be escaped in ORDER BY
test('Field name with embedded double quotes in ORDER BY', () => {
  const qb = new QueryBuilder(mockDb, 'users');
  qb.orderBy('created"at', 'DESC');
  const { sql } = qb.getSQL();
  // Should escape the quote: "created""at"
  if (!sql.includes('"created""at"')) {
    throw new Error(`Expected SQL to contain '"created""at"', got: ${sql}`);
  }
});

// Test 6: Complex query with multiple escaped identifiers
test('Complex query with multiple potential injection points', () => {
  const qb = new QueryBuilder(mockDb, 'my"table');
  qb.select(['field"1', 'field"2'])
    .where('user"name', '=', 'test')
    .orderBy('created"at', 'ASC')
    .limit(10);
  
  const { sql } = qb.getSQL();
  
  // Verify all identifiers are properly escaped
  if (!sql.includes('"my""table"')) {
    throw new Error(`Table name not properly escaped: ${sql}`);
  }
  if (!sql.includes('"field""1"')) {
    throw new Error(`Field 1 not properly escaped: ${sql}`);
  }
  if (!sql.includes('"field""2"')) {
    throw new Error(`Field 2 not properly escaped: ${sql}`);
  }
  if (!sql.includes('"user""name"')) {
    throw new Error(`WHERE field not properly escaped: ${sql}`);
  }
  if (!sql.includes('"created""at"')) {
    throw new Error(`ORDER BY field not properly escaped: ${sql}`);
  }
});

// Test 7: Verify parameterized values are still used (not vulnerable to SQL injection)
test('Values are still parameterized', () => {
  const qb = new QueryBuilder(mockDb, 'users');
  qb.where('name', '=', "'; DROP TABLE users; --");
  const { sql, params } = qb.getSQL();
  
  // SQL should use parameterized query
  if (!sql.includes('$1')) {
    throw new Error(`SQL should use parameterized query, got: ${sql}`);
  }
  // Value should be in params, not in SQL
  if (sql.includes("DROP TABLE")) {
    throw new Error(`SQL injection vulnerability: value embedded in SQL: ${sql}`);
  }
  // Verify the dangerous value is in params
  if (params[0] !== "'; DROP TABLE users; --") {
    throw new Error(`Expected dangerous value in params, got: ${params[0]}`);
  }
});

console.log('\n─────────────────────────────────────────');
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log('─────────────────────────────────────────\n');

process.exit(failCount > 0 ? 1 : 0);
