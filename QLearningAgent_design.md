# QLearningAgent Design

## Q-Table Structure

The Q-table will be implemented as a dictionary mapping state-action pairs to Q-values:

```python
q_table = {
    (state1, action1): q_value1,
    (state1, action2): q_value2,
    (state2, action1): q_value3,
    ...
}
```

Where:
- `state` represents a node in the Neo4j graph (identified by node ID or properties)
- `action` represents a possible traversal (relationship type) from that node
- `q_value` represents the learned quality of taking that action from that state

## State Representation

States will be represented by node identifiers in the Neo4j graph:
- Primary key: Node ID (integer)
- Secondary keys: Node labels and properties for more meaningful state identification

## Action Representation

Actions will represent possible traversals:
- Relationship types (e.g., "CONNECTED_TO", "PART_OF", "DEPENDS_ON")
- Directionality (outgoing, incoming, or both)

## Q-Value Updates

Q-values will be updated using the standard Q-learning update rule:
Q(s,a) ← Q(s,a) + α[r(s,a) + γ max<sub>a'</sub>Q(s',a') - Q(s,a)]

Where:
- α (alpha) is the learning rate
- r(s,a) is the immediate reward for taking action a in state s
- γ (gamma) is the discount factor
- s' is the resulting state after taking action a in state s

## Reward Structure

Rewards will be determined based on:
- Relevance of the traversed path to query context
- Information gain from visiting new nodes
- Path efficiency (shorter paths may have higher rewards)

## Interaction with ArchivistAgent

The QLearningAgent will interact with the ArchivistAgent through method calls:

1. The ArchivistAgent will call a method on QLearningAgent with a query or information request
2. The QLearningAgent will process the request by traversing the Neo4j graph using its learned policies
3. The QLearningAgent will return structured information and synthesized insights to the ArchivistAgent

The interface will look like:
```python
class QLearningAgent:
    def query_graph(self, query_context):
        # Process the query using learned policies
        # Traverse the graph
        # Return relevant information and insights
        return structured_response
```