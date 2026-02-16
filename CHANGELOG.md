# Changelog

All notable changes to the Anchor Engine standards and protocols will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [Standard 104] - 2026-02-10
### Added
- **Universal Semantic Search Protocol**: Unified search architecture replacing "Smart Search" and "Tag Walker".
- **70/30 Distributed Budgeting**: Strict token budget split (70% Direct / 30% Associative) to balance depth and breadth.
- **Adaptive Radius**: Dynamic context window sizing based on budget (Deep for direct matches, Broad for related matches).
- **Smart Content Weighting**: `code_weight` parameter to penalize logs/code in narrative searches.

### Deprecated
- **Standard 094 (Smart Search)**: The "Strict Anchor Phase" (AND logic) proved too brittle for natural language queries.
- **Standard 086 (Tag Walker)**: Replaced by the unified Semantic Search route.

## [Standard 103] - 2026-02-05
### Added
- **Standalone UI**: Internal lightweight UI serving capability for the engine.

## [Standard 098] - 2026-01-28
### Added
- **Horizontal Scaling Architecture**: Distributed processing protocol.
