chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'queryMemories') {
    queryMemoriesFromCozoDB(request.query)
      .then(memories => ({
        success: true,
        memories: memories,
        summary: generateSummary(memories)
      }))
      .then(sendResponse)
      .catch(err => ({
        success: false,
        error: err.message
      }));
    return true; // Keep channel open for async response
  }
});

async function queryMemoriesFromCozoDB(userInput) {
  try {
    // Attempt to hit the Local Bridge (webgpu_bridge.py)
    // Note: The bridge currently supports /v1/chat/completions.
    // Ideally, we add a specific /memories/search endpoint to the python bridge
    // or use a specialized prompt to the LLM to search.
    // For now, we simulate the /memories/search call as defined in the spec.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch('http://localhost:8080/memories/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sovereign-secret'
      },
      body: JSON.stringify({ query: userInput }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Backend connection failed with status ${response.status}`);
    return response.json();
  } catch (e) {
    console.warn('[Sovereign] Backend unavailable, querying local store (simulation)...', e.message);
    // In the future, this can connect directly to IndexedDB via shared worker
    // For now, return simulated data
    return [
      {
        content: "This is a simulated memory based on your input: " + userInput.substring(0, 100) + "...",
        timestamp: new Date().toISOString(),
        relevance: 0.8
      }
    ];
  }
}

function generateSummary(memories) {
  if (!memories || memories.length === 0) return null;
  
  const maxMemories = 3;
  const relevant = memories.slice(0, maxMemories);
  
  return relevant
    .map((m, idx) => `[Memory ${idx + 1}] ${m.content.substring(0, 150)}...`)
    .join('\n');
}