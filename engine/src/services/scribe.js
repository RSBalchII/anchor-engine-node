/**
 * Scribe Service - Markovian Rolling Context
 * 
 * Maintains a "Session State" that summarizes the current conversation.
 * This enables the model to maintain coherence across long conversations
 * without requiring the full history in context.
 */

const { db } = require('../core/db');

// Lazy-load inference to avoid circular dependency
let inference = null;
function getInference() {
    if (!inference) {
        inference = require('./inference');
    }
    return inference;
}

const SESSION_STATE_ID = 'session_state';
const STATE_BUCKET = ['system', 'state'];

/**
 * Updates the rolling session state based on recent conversation history.
 * Uses the LLM to compress recent turns into a coherent state summary.
 * 
 * @param {Array} history - Array of {role, content} message objects
 * @returns {Object} - {status, summary} or {status, error}
 */
async function updateState(history) {
    console.log('✍️ Scribe: Analyzing conversation state...');
    
    try {
        // 1. Flatten last 10 turns into readable text
        const recentTurns = history.slice(-10);
        const recentText = recentTurns
            .map(m => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n\n');
        
        if (!recentText.trim()) {
            return { status: 'skipped', message: 'No conversation history to analyze' };
        }

        // 2. Construct the state extraction prompt
        const prompt = `Analyze this conversation segment and produce a concise "Session State" summary.

Keep it under 200 words. Focus on:
- Current Goal: What is the user trying to accomplish?
- Key Decisions: What has been decided or agreed upon?
- Active Tasks: What work is in progress or pending?
- Important Context: Any critical information the assistant needs to remember.

Conversation:
${recentText}

---
Session State Summary:`;

        // 3. Generate the state summary
        const inf = getInference();
        const summary = await inf.rawCompletion(prompt);
        
        if (!summary || summary.trim().length < 10) {
            return { status: 'error', message: 'Failed to generate meaningful state' };
        }

        // 4. Persist to database with special ID
        const timestamp = Date.now();
        const query = `?[id, timestamp, content, source, type, hash, buckets] <- $data :put memory {id, timestamp, content, source, type, hash, buckets}`;
        
        await db.run(query, { 
            data: [[
                SESSION_STATE_ID, 
                timestamp, 
                summary.trim(), 
                'Scribe', 
                'state', 
                `state_${timestamp}`, 
                STATE_BUCKET
            ]] 
        });

        console.log('✍️ Scribe: State updated successfully');
        return { status: 'updated', summary: summary.trim() };
        
    } catch (e) {
        console.error('✍️ Scribe Error:', e.message);
        return { status: 'error', message: e.message };
    }
}

/**
 * Retrieves the current session state from the database.
 * 
 * @returns {string|null} - The state summary or null if not found
 */
async function getState() {
    try {
        const query = '?[content] := *memory{id, content}, id = $id';
        const res = await db.run(query, { id: SESSION_STATE_ID });
        
        if (res.rows && res.rows.length > 0) {
            return res.rows[0][0];
        }
        return null;
    } catch (e) {
        console.error('✍️ Scribe: Failed to retrieve state:', e.message);
        return null;
    }
}

/**
 * Clears the current session state.
 * Useful for starting a fresh conversation.
 * 
 * @returns {Object} - {status}
 */
async function clearState() {
    try {
        const query = `?[id] <- [[$id]] :rm memory {id}`;
        await db.run(query, { id: SESSION_STATE_ID });
        console.log('✍️ Scribe: State cleared');
        return { status: 'cleared' };
    } catch (e) {
        console.error('✍️ Scribe: Failed to clear state:', e.message);
        return { status: 'error', message: e.message };
    }
}

module.exports = { 
    updateState, 
    getState, 
    clearState,
    SESSION_STATE_ID 
};
