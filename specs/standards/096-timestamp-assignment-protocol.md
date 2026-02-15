# Standard 096: Timestamp Assignment Protocol (Temporal Context Propagation)

**Status:** Active | **Topic:** Data Ingestion & Temporal Context Management

## 1. The Problem: Static Timestamps
Previously, all data molecules received identical timestamps corresponding to ingestion time rather than content-specific temporal markers. This resulted in:
- Homogeneous timestamps across search results (e.g., all showing `[2026-02-05T05:18:20.000Z]`)
- Lack of temporal diversity in chronological searches
- Inability to distinguish content from different time periods
- Poor temporal context for relationship narratives

## 2. The Solution: Context-Aware Timestamp Assignment
Implement a multi-layered timestamp assignment protocol that prioritizes content-specific temporal data while maintaining file modification time as fallback.

### 2.1 The Protocol
1. **Content Extraction**: Scan content for temporal markers using regex patterns
2. **File Inheritance**: Use source file modification time as default
3. **Context Propagation**: Pass timestamps through atomic topology
4. **Fallback Chain**: Maintain ingestion time as ultimate fallback

### 2.2 Implementation Requirements
```typescript
// Enhanced timestamp extraction patterns
const extractTimestamp = (chunk: string): number | undefined => {
  // ISO timestamps: 2026-01-25T03:43:54.405Z
  const isoRegex = /\b(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\b/;
  
  // Date-only: 2026-01-25
  const dateRegex = /\b(20[2-9]\d-\d{2}-\d{2})\b/;
  
  // US format: 01/25/2026
  const usDateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/;
  
  // Month-Day-Year: January 25, 2026
  const monthDayYearRegex = /\b(January|February|...)\s+(\d{1,2}),\s+(\d{4})\b/;
  
  // Day-Month-Year: 25 January 2026
  const dayMonthYearRegex = /\b(\d{1,2})\s+(January|February|...)\s+(\d{4})\b/;
};
```

## 3. Temporal Pattern Recognition
The system now recognizes multiple date/time formats:
- **ISO 8601**: `2026-01-25T03:43:54.405Z`
- **Date Only**: `2026-01-25`
- **US Format**: `01/25/2026`
- **Month-Day-Year**: `January 25, 2026`
- **Day-Month-Year**: `25 January 2026`

## 4. Inheritance Hierarchy
1. **Primary**: Content-specific temporal markers (highest priority)
2. **Secondary**: File modification time (fallback)
3. **Tertiary**: Context-aware timestamp propagation from previous molecules
4. **Ultimate**: Ingestion time (last resort)

## 5. Benefits
- **Temporal Diversity**: Search results now show varied timestamps reflecting actual content timeline
- **Chronological Accuracy**: Molecules inherit timestamps from their source context
- **Content Awareness**: System recognizes temporal markers within content
- **File Integration**: Maintains connection to source file modification time

## 6. Implementation in Ingestion Pipeline
- **Watchdog Service**: Extracts file modification time using `fs.promises.stat()`
- **Atomizer Service**: Applies temporal pattern recognition during molecule creation
- **Ingestion Service**: Propagates timestamps through atomic topology
- **Database Layer**: Stores timestamps in `atoms`, `molecules`, and `compounds` tables

## 7. Search Integration
Chronological sorting now reflects actual content timeline rather than ingestion time, enabling accurate temporal queries like "What happened in 2025?" to return properly timestamped results.

## 8. Authority
This standard applies to all timestamp assignment operations in the Anchor/ECE_Core system and must be followed for any data ingestion or temporal context management procedures.