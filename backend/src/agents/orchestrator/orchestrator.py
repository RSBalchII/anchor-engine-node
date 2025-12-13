import json
import logging
import re
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
        
        # Detect model type for prompt optimization
        await self.llm.detect_model()
        model_name = self.llm.get_model_name().lower()
        is_reasoning_model = "deepseek" in model_name or "gemma" in model_name or "granite" in model_name or "qwen" in model_name or "thinking" in model_name or "heretic" in model_name

        # Initial Planner Context
        if is_reasoning_model:
            # Merge System Prompt into User Prompt for models that don't support system role well
            combined_prompt = f"[INSTRUCTION]\n{PLANNER_PERSONA}\n\n[CONTEXT]\n{context}\n\n[USER REQUEST]\n{user_message}"
            current_history = [
                {"role": "user", "content": combined_prompt}
            ]
        else:
            current_history = [
                {"role": "system", "content": PLANNER_PERSONA},
                {"role": "user", "content": f"Context:\n{context}\n\nUser Request: {user_message}"}
            ]

        for turn in range(self.max_turns):
            logger.info(f"SGR Turn {turn + 1}/{self.max_turns} for session {session_id}")
            
            # 1. Generate Plan
            try:
                # Force JSON mode if possible, or rely on prompt
                # For reasoning models, json_mode can sometimes cause empty output if the model isn't fine-tuned for it.
                # We will try with json_mode=True first, but if it fails (empty response), we retry without it.
                
                response_text = await self.llm.generate_response(
                    messages=current_history,
                    temperature=0.2, # Low temp for deterministic planning
                    json_mode=True
                )
                
                # Retry logic for empty JSON response (common with some local models in JSON mode)
                if not response_text or response_text.strip() == "{}":
                    logger.warning("Received empty JSON response. Retrying without json_mode constraint...")
                    response_text = await self.llm.generate_response(
                        messages=current_history,
                        temperature=0.2,
                        json_mode=False
                    )

                # Parse JSON
                try:
                    # Extract thinking content for fallback
                    thinking_content = ""
                    think_match = re.search(r'<think>(.*?)</think>', response_text, flags=re.DOTALL)
                    if think_match:
                        thinking_content = think_match.group(1).strip()
                    elif '<think>' in response_text:
                        # Handle truncated thinking block
                        parts = response_text.split('<think>')
                        if len(parts) > 1:
                            thinking_content = parts[1].strip()

                    # Clean up thinking tags (common in reasoning models)
                    # Remove <think>...</think> blocks
                    cleaned_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
                    # Remove dangling </think> if present (some models output only the closing tag)
                    cleaned_text = cleaned_text.replace('</think>', '')

                    # Clean up potential markdown code blocks if json_mode=False was used
                    cleaned_text = cleaned_text.strip()
                    if cleaned_text.startswith("```json"):
                        cleaned_text = cleaned_text[7:]
                    if cleaned_text.startswith("```"):
                        cleaned_text = cleaned_text[3:]
                    if cleaned_text.endswith("```"):
                        cleaned_text = cleaned_text[:-3]
                    
                    plan_data = json.loads(cleaned_text)
                    plan = SGRPlan(**plan_data)
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Failed to parse SGR plan: {e}. Response: {response_text}")
                    
                    # Fallback: If we have thinking content, return it formatted
                    if thinking_content:
                        return f"**Thinking Process:**\n\n{thinking_content}\n\n*[Response Truncated or JSON Parsing Failed]*"
                    
                    # Return raw text with a marker so the UI knows it failed parsing
                    return f"[SGR Parsing Failed] {response_text}"

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
                    final_output = plan.final_response
                    
                    # If no final response in JSON, do a quick Scribe pass
                    if not final_output:
                        scribe_history = current_history + [{"role": "assistant", "content": response_text}]
                        scribe_history[0] = {"role": "system", "content": SCRIBE_PERSONA}
                        scribe_history.append({"role": "user", "content": "Please synthesize the final response based on the above plan and context."})
                        
                        final_output = await self.llm.generate_response(
                            messages=scribe_history,
                            temperature=0.7
                        )
                    
                    # Attach reasoning trace for UI visibility
                    return f"thinking: {plan.reasoning_trace}\n\n{final_output}"
                
                elif plan.next_action == NextAction.ASK_USER:
                    return f"thinking: {plan.reasoning_trace}\n\n{plan.final_response or 'Could you please clarify?'}"

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

