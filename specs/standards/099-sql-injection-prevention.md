# Standard 099: SQL Injection Prevention Protocol

**Status:** Active | **Authority:** Human-Locked | **Domain:** Security

## Problem Statement
QueryBuilder must prevent SQL injection when constructing dynamic queries with user-provided field/table names.

## Solution: Identifier Escaping

### Pattern
```typescript
private escapeIdentifier(identifier: string): string {
  return '"' + identifier.replace(/"/g, '""') + '"';
}
```

### Rules
1. **All identifiers** (table/field names) must be escaped with double quotes
2. **Internal double quotes** must be doubled (`"` → `""`)
3. **Field validation** must whitelist allowed field names before query construction

### Validation Example
```typescript
const ALLOWED_FIELDS = ['id', 'content', 'timestamp', 'tags'];
if (!ALLOWED_FIELDS.includes(fieldName)) {
  throw new Error(`Invalid field: ${fieldName}`);
}
```

## Key Commits
- `0f7fb23` - Initial escapeIdentifier implementation
- `7ccd7ef` - Field identifier validation

## Do Not
- Use template literals directly with user input
- Skip field validation for "internal" queries
- Use single quotes for identifiers (PostgreSQL uses double quotes)
