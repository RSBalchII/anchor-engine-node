# Quickstart Guide - User Workflow Reference

**Status:** Active | **Authority:** Human-Locked | **Domain:** User Onboarding

## Getting Started

### Prerequisites
- Node.js v18+
- PNPM package manager
- Windows 10+ / macOS 10.15+ / Linux Ubuntu 20.04+

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd ECE_Core

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Launching the System
```bash
# Using the launcher script (recommended)
./start.sh    # Linux/macOS
.\start.bat   # Windows

# Or launch directly
cd engine && node dist/index.js
```

## Core Workflows

### Data Ingestion Methods
1. **File Drop**: Place files in `context/` directory for automatic ingestion
2. **API Ingestion**: Send content to `POST /v1/ingest`
3. **Corpus Ingestion**: Use `read_all.js` output format
4. **Backup Restore**: Import from `backups/` directory

### Search & Retrieval
- Use `POST /v1/memory/search` for semantic queries
- Apply bucket filtering for targeted searches
- Leverage tag-based filtering for precision
- Utilize temporal filters for time-based queries

### Backup & Restore
- Export data using backup endpoints
- Restore from backup files in `backups/` directory
- Verify integrity after restoration
- Resume sessions with restored context

## Troubleshooting Common Issues

### ECONNREFUSED Error (RESOLVED - Standard 088)
**Problem**: Electron wrapper fails to connect to engine with "ECONNREFUSED" error
**Cause**: Improper startup sequence where database initialization blocked server startup
**Solution**: Server now starts immediately, with database initialization running in background
**Verification**: Server binds to port 3000 before database initialization completes

### UI Access Issues
**Problem**: UI not accessible through Electron wrapper
**Solution**: Direct access available at http://localhost:3000
**Note**: Electron wrapper may have longer initialization time (up to 15 seconds)

### Performance Considerations
- First startup may take longer due to database initialization
- Subsequent startups are faster with initialized database
- Large datasets may require extended processing time
- Monitor resource usage during intensive operations

## Daily Workflow Patterns

### Morning Routine
1. Launch system with `./start.sh` or `.\start.bat`
2. Verify health status at `GET /health`
3. Check monitoring dashboard at `/monitoring`
4. Begin data ingestion or search operations

### Data Processing
1. Ingest new content via API or file drop
2. Monitor processing status through logs
3. Verify data availability through search
4. Adjust tags or buckets as needed

### End-of-Day Procedures
1. Review system performance metrics
2. Backup important data if needed
3. Graceful shutdown using Ctrl+C
4. Verify clean process termination

## Search Patterns

### Basic Queries
- Simple keyword searches: `GET /v1/memory/search?q=term`
- Phrase searches: Enclose in quotes
- Boolean operators: AND, OR, NOT support
- Wildcard matching: Use asterisk (*) for partial matches

### Advanced Queries
- Tag-based filtering: `#tagname` syntax
- Temporal filtering: Specify date ranges
- Bucket restriction: Limit to specific data sources
- Semantic expansion: Natural language queries

## System Maintenance

### Regular Tasks
- Monitor database growth and performance
- Clean up old logs periodically
- Update configuration as needed
- Verify backup integrity regularly

### Performance Tuning
- Adjust worker thread counts
- Configure cache sizes appropriately
- Optimize database indices
- Fine-tune memory allocation

## API Usage Examples

### Ingest Content
```bash
curl -X POST http://localhost:3000/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your content here", "source": "manual", "buckets": ["inbox"]}'
```

### Search Memory
```bash
curl -X POST http://localhost:3000/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{"query": "search terms", "buckets": ["inbox"]}'
```

### Check Health
```bash
curl http://localhost:3000/health
```

## Error Recovery

### Common Recovery Steps
1. Check system logs for error details
2. Verify database connectivity
3. Restart services if needed
4. Contact support for persistent issues

### Known Issues & Solutions
- **Slow startup**: Normal for first initialization after fresh install
- **Memory usage**: Increases with dataset size; monitor and scale accordingly
- **UI delays**: May occur during heavy processing; wait for completion
- **Connection timeouts**: Usually resolve automatically after initialization

## Support Resources

### Documentation
- Full API documentation at `/docs`
- Architecture specs in `/specs/`
- Standards and guidelines in `/specs/standards/`
- Troubleshooting guides in `/docs/troubleshooting/`

### Community Support
- GitHub issues for bug reports
- Discussion forums for feature requests
- Contributing guidelines for developers
- Code of conduct for community interactions