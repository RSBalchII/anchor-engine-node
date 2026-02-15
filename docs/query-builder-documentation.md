# Anchor Query Builder Documentation

## Overview

The Anchor Query Builder provides a simplified, fluent API for constructing database queries with JavaScript transformations. It's designed to be LLM-friendly and human-readable while maintaining performance by leveraging the underlying PGlite database.

## Basic Usage

### Import the Query Builder
```javascript
import { createQueryBuilder } from './services/query-builder/QueryBuilder.js';
import { db } from '../core/db.js';
```

### Simple Query Example
```javascript
// Basic query to get recent atoms
const queryBuilder = createQueryBuilder(db, 'atoms');
const results = await queryBuilder
  .select(['timestamp', 'content', 'buckets'])
  .where('content', 'LIKE', 'test')
  .orderBy('timestamp', 'DESC')
  .limit(10)
  .execute();
```

## Available Methods

### `select(fields: string[])`
Specify which fields to retrieve from the table.

```javascript
// Select specific fields
createQueryBuilder(db, 'atoms').select(['content', 'timestamp']);

// Select all fields - use ['*'] or omit select() entirely
createQueryBuilder(db, 'atoms').select(['*']);
// or
createQueryBuilder(db, 'atoms'); // defaults to SELECT *
```

**Note:** The wildcard `'*'` is specially handled and will generate `SELECT *` without quotes. All other field names are validated and quoted for SQL safety.

### `where(field: string, operator: string, value: any)`
Add a WHERE condition to filter results.

```javascript
// Various operators
createQueryBuilder(db, 'atoms').where('content', 'LIKE', 'search term');
createQueryBuilder(db, 'atoms').where('content', 'CONTAINS', 'specific text');
createQueryBuilder(db, 'atoms').where('timestamp', '>', 1640995200);
createQueryBuilder(db, 'atoms').where('timestamp', '>=', 1640995200);
createQueryBuilder(db, 'atoms').where('timestamp', '<', 1672531200);
createQueryBuilder(db, 'atoms').where('timestamp', '<=', 1672531200);
createQueryBuilder(db, 'atoms').where('buckets', '=', 'inbox');
```

### `orderBy(field: string, direction: 'ASC' | 'DESC')`
Sort the results by a specific field.

```javascript
// Ascending order (default)
createQueryBuilder(db, 'atoms').orderBy('timestamp', 'ASC');

// Descending order
createQueryBuilder(db, 'atoms').orderBy('timestamp', 'DESC');
```

### `limit(count: number)`
Limit the number of results returned.

```javascript
// Get only the first 5 results
createQueryBuilder(db, 'atoms').limit(5);
```

### `transform(transformations: Record<string, TransformFunction>)`
Apply JavaScript transformations to create computed fields.

```javascript
// Transform data during query execution
const queryBuilder = createQueryBuilder(db, 'atoms');
const results = await queryBuilder
  .select(['timestamp', 'content'])
  .where('content', 'LIKE', 'Order Delivered')
  .transform({
    date: (row) => new Date(row.timestamp / 1000).toISOString(),
    vendor: (row) => row.content.split(',')[0],
    items: (row) => row.content.split(',')[1],
    revenue: (row) => {
      const match = row.content.match(/,([\d\.]+),"Order Delivered/);
      return match ? parseFloat(match[1]) / 100.00 : 0;
    }
  })
  .execute();
```

### `execute(): Promise<any[]>`
Execute the query and return results.

```javascript
const queryBuilder = createQueryBuilder(db, 'atoms');
const results = await queryBuilder
  .select(['*'])
  .where('content', 'LIKE', 'test')
  .execute();
```

### `toDataFrame(): Promise<DataFrame>`
Execute the query and return a DataFrame for in-memory operations.

```javascript
const queryBuilder = createQueryBuilder(db, 'atoms');
const df = await queryBuilder
  .select(['timestamp', 'content'])
  .where('content', 'LIKE', 'test')
  .toDataFrame();
```

### `export(filename: string, format: 'csv' | 'json' | 'yaml' | 'table')`
Execute the query and export results to a file in the specified format.

```javascript
// Export to CSV
const queryBuilder = createQueryBuilder(db, 'atoms');
await queryBuilder
  .select(['timestamp', 'content'])
  .where('content', 'LIKE', 'test')
  .export('results.csv', 'csv');

// Export to JSON
await queryBuilder
  .select(['timestamp', 'content'])
  .where('content', 'LIKE', 'test')
  .export('results.json', 'json');
```

## Complete Examples

### DoorDash Data Analysis
```javascript
// Analyze DoorDash delivery data
import { createQueryBuilder } from './services/query-builder/QueryBuilder.js';
import { db } from '../core/db.js';

const queryBuilder = createQueryBuilder(db, 'atoms');
const dashResults = await queryBuilder
  .select(['timestamp', 'content'])
  .where('content', 'LIKE', 'Order Delivered')
  .orderBy('timestamp', 'ASC')
  .limit(100)
  .transform({
    date: (row) => new Date(row.timestamp / 1000).toISOString(),
    vendor: (row) => row.content.split(',')[0],
    items: (row) => row.content.split(',')[1],
    revenue: (row) => {
      const match = row.content.match(/,([\d\.]+),"Order Delivered/);
      return match ? parseFloat(match[1]) / 100.00 : 0;
    }
  })
  .execute();

console.log(dashResults);
```

### Export Data to Different Formats
```javascript
import { createQueryBuilder } from './services/query-builder/QueryBuilder.js';
import { db } from '../core/db.js';

const queryBuilder = createQueryBuilder(db, 'atoms');

// Export to CSV
await queryBuilder
  .select(['timestamp', 'content', 'buckets'])
  .where('buckets', '=', 'inbox')
  .orderBy('timestamp', 'DESC')
  .limit(50)
  .export('inbox_data.csv', 'csv');

// Export to JSON
await queryBuilder
  .select(['timestamp', 'content', 'buckets'])
  .where('buckets', '=', 'inbox')
  .orderBy('timestamp', 'DESC')
  .limit(50)
  .export('inbox_data.json', 'json');
```

## Using with the Anchor CLI

The query builder is available programmatically in your scripts. Import it using:

```javascript
import { createQueryBuilder } from './services/query-builder/QueryBuilder.js';
import { db } from '../core/db.js';
```

## Performance Considerations

- The query builder translates operations to efficient SQL queries
- Filtering and sorting happen at the database level for optimal performance
- JavaScript transformations are applied after data retrieval
- Use `limit()` to restrict result set sizes for better performance

## Error Handling

```javascript
try {
  const queryBuilder = createQueryBuilder(db, 'atoms');
  const results = await queryBuilder
    .select(['*'])
    .where('content', 'LIKE', 'test')
    .execute();
} catch (error) {
  console.error('Query failed:', error);
}
```