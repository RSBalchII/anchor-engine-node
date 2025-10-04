#!/usr/bin/env python3
\"""
Manual fix for orchestrator_agent.py - handles the escaped characters properly
\"""
import re

# Read the file content
with open(\"ece/agents/tier1/orchestrator/orchestrator_agent.py\", \"r\", encoding=\"utf-8\") as f:
    content = f.read()

# Find and replace the problematic part
# The issue is around line 451 with the logger.info statement
# Search for the specific pattern that's causing the syntax error

# Replace all occurrences of \\\" with \" and \\\\n with \\n
# But we need to be precise about what we're replacing
fixed_content = content

# First, replace the problematic context_summary line that's causing the error
lines = fixed_content.split('\\n')
for i, line in enumerate(lines):
    if 'logger.info(f\"Full context after response:' in line:
        # This line contains the issue - need to fix the escapes
        lines[i] = line.replace('\\\"', '\"')
    elif 'context_summary = \"\\\n\".join' in line:
        # Fix the line that joins with newlines
        lines[i] = line.replace('\\\"', '\"').replace('\\\\n', '\\n')
    elif '\"ConversationalAgent\":' in line:
        lines[i] = line.replace('\\\"', '\"')
    elif 'f\"User: {prompt}\\\\nAssistant:' in line:
        lines[i] = line.replace('f\\\"', 'f\"').replace('\\\\n', '\\n').replace('\\\"', '\"')
    elif 'self.cache_manager.store(f\"' in line:
        lines[i] = line.replace('f\\\"', 'f\"').replace('\\\"', '\"')
    elif 'f\"Sending context-aware prompt' in line:
        lines[i] = line.replace('f\\\"', 'f\"').replace('\\\"', '\"')
    elif 'elif target_agent_name == \"DistillerAgent\":' in line:
        lines[i] = line.replace('\\\"', '\"')
    elif 'elif target_agent_name == \"WebSearchAgent\":' in line:
        lines[i] = line.replace('\\\"', '\"')


fixed_content = '\\n'.join(lines)

# Write the fixed content back
with open(\"ece/agents/tier1/orchestrator/orchestrator_agent.py\", \"w\", encoding=\"utf-8\") as f:
    f.write(fixed_content)

print(\"Fixed the orchestrator agent file!\")