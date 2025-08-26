from agents.hierarchical_agent import HierarchicalAgent

if __name__ == "__main__":
    # Instantiate HierarchicalAgent first, then its inner SpecialistAgent
    hierarchical_agent_instance = HierarchicalAgent()
    agent = hierarchical_agent_instance.SpecialistAgent()
    user_request = "Analyze recent open-source reports on vulnerabilities in national power grid infrastructure"
    result = agent.orchestrate_task(user_request)
    print("n=== DEMO OUTPUT ===")
    print(result)