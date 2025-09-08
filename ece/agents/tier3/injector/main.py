"""
Main entry point for the Injector Agent
"""
import os
import sys

# Add the injector agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from injector_agent import InjectorAgent


def main():
    """Main function to demonstrate the Injector Agent."""
    # Get Neo4j connection details from environment variables, with defaults for local development
    neo4j_uri = os.environ.get('NEO4J_URI', 'bolt://localhost:7688')
    neo4j_user = os.environ.get('NEO4J_USER', 'neo4j')
    neo4j_password = os.environ.get('NEO4J_PASSWORD', 'password')
    
    # Create an instance of the injector agent
    injector_agent = InjectorAgent(
        neo4j_uri=neo4j_uri,
        neo4j_user=neo4j_user,
        neo4j_password=neo4j_password
    )
    
    # Example data to inject
    data = {
        "entities": [
            {
                "id": "example_person_1",
                "type": "Person",
                "properties": {
                    "name": "John Doe",
                    "age": 30
                }
            },
            {
                "id": "example_company_1",
                "type": "Company",
                "properties": {
                    "name": "Acme Corp",
                    "industry": "Technology"
                }
            }
        ],
        "relationships": [
            {
                "start_id": "example_person_1",
                "start_type": "Person",
                "end_id": "example_company_1",
                "end_type": "Company",
                "type": "WORKS_FOR",
                "properties": {
                    "since": "2020-01-01",
                    "role": "Developer"
                }
            }
        ]
    }
    
    # Inject the data
    result = injector_agent.receive_data_for_injection(data)
    
    # Print the result
    print("Injection result:", result)
    
    # Disconnect from the database
    injector_agent.db_manager.disconnect()


if __name__ == "__main__":
    main()