import sys
import os
from pathlib import Path
import yaml

config_path = Path("config.yaml")
if config_path.exists():
    print(f"Found config.yaml at {config_path.absolute()}")
    try:
        with open(config_path, 'r') as f:
            data = yaml.safe_load(f)
        print("YAML loaded successfully.")
        print(f"Neo4j URI in YAML: {data.get('neo4j', {}).get('uri')}")
    except Exception as e:
        print(f"YAML load error: {e}")
else:
    print("config.yaml not found.")
