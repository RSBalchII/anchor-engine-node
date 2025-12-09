import json
import logging
from typing import List, Dict, Any, Optional
from src.llm import LLMClient
from src.tools import ToolExecutor
from src.agents.orchestrator.schemas import SGRPlan, NextAction, IntentType
from src.agents.orchestrator.prompts import PLANNER_PERSONA, SCRIBE_PERSONA

logger = logging.getLogger(__name__)

class SGROrchestrator:
    def __init__(self, llm_client: LLMClient, tool_executor: ToolExecutor, audit_logger=None):
        self.llm = llm_client
        self.tools = tool_executor
        self.audit = audit_logger
        self.max_turns = 5

    async def run_loop(self, session_id: str, user_message: str, context: str) -> str:
        """
        Executes the Schema-Guided Reasoning loop.
        """
        # Initialize conversation history for this run
        # We start with the retrieved context + user message
        # Note: 'context' here is the assembled context string from ContextManager
        
        # Initial Planner Context
        current_history = [
            {"role": "system", "content": PLANNER_PERSONA},
            {"role": "user", "content": f"Context:\n{context}\n\nUser Request: {user_message}"}
        ]

        for turn in range(self.max_turns):
            logger.info(f"SGR Turn {turn + 1}/{self.max_turns} for session {session_id}")
            
            # 1. Generate Plan
            try:
                # Force JSON mode if possible, or rely on prompt
                response_text = await self.llm.generate_response(
                    messages=current_history,
                    temperature=0.2, # Low temp for deterministic planning
                    json_mode=True
                )
                
                # Parse JSON
                try:
                    plan_data = json.loads(response_text)
                    plan = SGRPlan(**plan_data)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Failed to parse SGR plan: {e}. Response: {response_text}")
                    # Fallback: try to repair or just return the raw text if it looks like a response
                    if "{" not in response_text:
                         return response_text
                    return "I encountered an error processing my internal plan. Please try again."

                # Log the thought process
                if self.audit:
                    await self.audit.log_event(
                        session_id=session_id,
                        event_type="sgr_plan",
                        content=plan.model_dump_json(),
                        metadata={"turn": turn}
                    )

                # 2. Execute Logic based on NextAction
                if plan.next_action == NextAction.FINALIZE_RESPONSE:
                    # Optimization: If the plan already has a good final response, use it.
                    # Otherwise, we could switch to SCRIBE_PERSONA here if needed.
                    # For now, we trust the Planner's final_response if present.
                    if plan.final_response:
                        return plan.final_response
                    
                    # If no final response in JSON, do a quick Scribe pass
                    scribe_history = current_history + [{"role": "assistant", "content": response_text}]
                    scribe_history[0] = {"role": "system", "content": SCRIBE_PERSONA}
                    scribe_history.append({"role": "user", "content": "Please synthesize the final response based on the above plan and context."})
                    
                    final_answer = await self.llm.generate_response(
                        messages=scribe_history,
                        temperature=0.7
                    )
                    return final_answer
                
                elif plan.next_action == NextAction.ASK_USER:
                    return plan.final_response or "Could you please clarify?"

                elif plan.next_action == NextAction.CALL_TOOL:
                    if not plan.tool_call:
                        logger.warning("SGR planned CALL_TOOL but no tool_call provided.")
                        return plan.final_response or "I intended to use a tool but couldn't determine which one."

                    logger.info(f"Executing tool: {plan.tool_call.name}")
                    
                    # Execute Tool
                    try:
                        tool_result = await self.tools.execute_tool(
                            tool_name=plan.tool_call.name,
                            tool_args=plan.tool_call.arguments
                        )
                    except Exception as tool_err:
                        tool_result = {"error": str(tool_err)}

                    # Add result to history
                    # We append the planner's JSON output as assistant message
                    current_history.append({"role": "assistant", "content": response_text})
                    # Then the tool output as user message (simulating environment feedback)
                    current_history.append({
                        "role": "user", 
                        "content": f"Tool '{plan.tool_call.name}' Output: {json.dumps(tool_result)}"
                    })
                    
                    # Continue to next turn
                    continue
                
            except Exception as e:
                logger.error(f"Error in SGR loop: {e}")
                return f"I encountered an internal error: {str(e)}"

        return "I reached the maximum number of reasoning steps without a final answer."

