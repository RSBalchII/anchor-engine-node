# TASK-010: Create memory API models
from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class MemoryContext:
    paths: List[Dict[str, Any]] = field(default_factory=list)
    summary: str = ""

    def __post_init__(self):
        self.summary = self._generate_summary()

    def _generate_summary(self) -> str:
        # A simple placeholder summary generation. This would ideally involve an LLM.
        if not self.paths:
            return "No relevant context found."

        summaries = []
        for i, path in enumerate(self.paths):
            nodes = " -> ".join([node["name"] for node in path.get("nodes", [])])
            relationships = ", ".join([rel["type"] for rel in path.get("relationships", [])])
            summaries.append(f"Path {i+1}: {nodes} (Relationships: {relationships})")
        return "\n".join(summaries)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "paths": self.paths,
            "summary": self.summary
        }
