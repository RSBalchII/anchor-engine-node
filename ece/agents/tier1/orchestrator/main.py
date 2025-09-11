"""
Main entry point for the Orchestrator Agent
"""
import os
import sys

# Add the orchestrator agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from orchestrator_agent import OrchestratorAgent
from fastapi import FastAPI
from ece.common.poml_schemas import POML, TaskDirective
import uvicorn

# Create the FastAPI app
app = FastAPI(
    title="ECE Orchestrator Agent",
    description="The Orchestrator is the central cognitive unit of the ECE system.",
    version="1.0.0"
)

# Initialize the Orchestrator agent with the correct Redis host
orchestrator = OrchestratorAgent(redis_host="redis")

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"message": "ECE Orchestrator Agent is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.post("/process_prompt")
async def process_prompt(poml_request: POML):
    """
    Process a context-enriched prompt through the full Orchestrator pipeline.
    
    Args:
        poml_request: The POML document containing the prompt to process.
        
    Returns:
        The synthesized final response.
    """
    try:
        # Extract the prompt from the POML document
        prompt = poml_request.directive.goal
        
        # Process the prompt
        response = orchestrator.process_prompt(prompt)
        
        # Create a POML response
        response_poml = TaskDirective(
            identity={
                "name": "OrchestratorAgent",
                "version": "1.0",
                "type": "Specialized Code Generation Agent"
            },
            operational_context={
                "project": "External Context Engine (ECE) v2.0",
                "objective": "Process user prompts and provide synthesized responses."
            },
            directive={
                "goal": "Provide a synthesized response to the user's prompt.",
                "task": {
                    "name": "ProcessPrompt",
                    "steps": [
                        "Extract prompt from POML document",
                        "Process prompt through cognitive pipeline",
                        "Synthesize final response"
                    ]
                }
            },
            task_name="ProcessPrompt",
            steps=[
                "Extract prompt from POML document",
                "Process prompt through cognitive pipeline",
                "Synthesize final response"
            ]
        )
        
        return response_poml.dict()
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )