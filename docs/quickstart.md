# Quickstart Guide - Essential User Workflow

**Status:** Active | **Authority:** Human-Locked | **Domain:** User Onboarding

## Quick Launch

### Prerequisites
- Node.js v18+
- PNPM package manager

### Setup & Launch
```bash
# Clone and setup
git clone <repository-url>
cd Anchor
pnpm install
pnpm build

# Launch the system
./start.sh        # Linux/macOS
.\start.bat      # Windows
```

Access UI at the configured server URL (default: http://localhost:3160, configurable in user_settings.json)

## Core Operations

### Data Ingestion
- **File Drop**: Place files in `context/` directory
- **API**: `POST /v1/ingest` endpoint
- **Real-time Sync**: Watchdog monitors `context/` directory

### Search Capabilities
- **Natural Language**: Ask questions in plain English
- **Tag-Based**: Use hashtags for filtering (`#tagname`)
- **Tag-Walker**: Retrieve related concepts using graph-based associative search with 70/30 keyword/associative split

### API Examples
```bash
# Ingest content
curl -X POST http://localhost:3160/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your content", "buckets": ["inbox"]}'

# Search memory
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  -d '{"query": "search terms", "buckets": ["inbox"]}'

# Get server configuration
curl -X GET http://localhost:3160/v1/config
```

## Troubleshooting

### Common Issues
- **Slow startup**: First run includes database initialization
- **UI delays**: Electron wrapper may take up to 15 seconds
- **Direct access**: Available at the configured server URL (default: http://localhost:3160, configurable in user_settings.json) if needed

### Health Checks
- System status: `GET /health`
- Performance metrics: `GET /monitoring/metrics`