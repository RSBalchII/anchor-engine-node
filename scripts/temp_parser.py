
import re
import yaml

# Read the tasks.md file
with open('/home/rsbiiw/projects/External-Context-Engine-ECE/specs/memory-management-system/tasks.md', 'r') as f:
    tasks_md = f.read()

task_map = {'tasks': []}

# Regex to find lines with TASK-ID and a description
# Example: - [ ] **TASK-001** | P0 | M | Setup Neo4j database with Docker
task_regex = re.compile(r"- \[ \] \*\*(TASK-\d+)\*\* \| .* \| .* \| (.*)")

for line in tasks_md.splitlines():
    match = task_regex.match(line)
    if match:
        task_id = match.group(1)
        description = match.group(2).strip()
        
        # Infer file paths based on description keywords
        source_file = ''
        test_file = ''
        if 'Archivist Agent' in description:
            source_file = 'src/external_context_engine/memory_management/agents/archivist_agent.py'
            test_file = 'tests/memory_management/agents/test_archivist_agent.py'
        elif 'Q-Learning Agent' in description:
            source_file = 'src/external_context_engine/memory_management/agents/q_learning_agent.py'
            test_file = 'tests/memory_management/agents/test_q_learning_agent.py'
        elif 'Orchestrator' in description:
            source_file = 'src/external_context_engine/orchestrator.py'
            test_file = 'tests/test_orchestrator.py'
        elif 'API' in description or 'endpoint' in description:
            source_file = 'src/external_context_engine/main.py'
            test_file = 'tests/test_api.py'
        elif 'Docker' in description:
            source_file = 'docker-compose.yaml'
        elif 'Redis' in description:
            source_file = 'docker-compose.yaml'
        elif 'Neo4j' in description:
            source_file = 'docker-compose.yaml'
            
        task_map['tasks'].append({
            'id': task_id,
            'description': description,
            'source_files': [source_file] if source_file else [],
            'test_files': [test_file] if test_file else []
        })

# Write the task_map.yml file
with open('/home/rsbiiw/projects/External-Context-Engine-ECE/specs/memory-management-system/task_map.yml', 'w') as f:
    yaml.dump(task_map, f, default_flow_style=False, sort_keys=False)

print('task_map.yml generated successfully.')
