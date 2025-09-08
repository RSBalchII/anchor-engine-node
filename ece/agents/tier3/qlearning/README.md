# QLearning Agent

The QLearning Agent is a specialized Tier 3 agent that implements a Q-Learning algorithm for intelligent navigation of the Neo4j knowledge graph. It is used by the Archivist to find optimal paths between concepts based on learned Q-values.

## Overview

The QLearning Agent uses Reinforcement Learning to find the most relevant and efficient paths between concepts in the knowledge graph. It maintains a Q-Table for storing state-action values and persists its learned Q-values as properties on the relationships within the Neo4j graph itself.

## Features

- Q-Learning algorithm implementation for graph navigation
- Q-Table management for storing state-action values
- Persistence of learned Q-values to Neo4j relationships
- Continuous training capabilities
- API for integration with the Archivist agent

## Dependencies

- Python 3.8+
- Neo4j Python Driver
- NumPy

## Installation

1. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Ensure Neo4j database is running and accessible.

## Usage

The QLearning Agent is primarily used by the Archivist agent through its internal API methods:

- `find_optimal_path(start_node, end_node)`: Find the optimal path between two nodes
- `update_q_values(path, reward)`: Update Q-values based on path success
- `train(training_data)`: Train the agent with historical data
- `sync_q_values_to_graph()`: Synchronize in-memory Q-values with Neo4j

## Configuration

The agent can be configured with the following parameters:

- `learning_rate`: Rate at which the agent learns (default: 0.1)
- `discount_factor`: Factor for future rewards (default: 0.9)
- `epsilon`: Exploration rate for epsilon-greedy strategy (default: 0.1)

## Integration

The QLearning Agent integrates with:
- Neo4j Knowledge Graph (data source)
- Archivist Agent (controller/caller)