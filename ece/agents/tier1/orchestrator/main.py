"""
Main entry point for the Orchestrator Agent
"""
import os
import sys

# Add the orchestrator agent directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from orchestrator_agent import OrchestratorAgent
from fastapi import FastAPI
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
async def process_prompt(prompt: str):
    """
    Process a context-enriched prompt through the full Orchestrator pipeline.
    
    Args:
        prompt: The context-enriched prompt to process.
        
    Returns:
        The synthesized final response.
    """
    try:
        response = orchestrator.process_prompt(prompt)
        return {"response": response}
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