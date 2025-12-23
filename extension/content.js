// Platform-specific DOM selectors
const SELECTORS = {
    'gemini.google.com': 'div[contenteditable="true"], textarea',
    'chatgpt.openai.com': 'textarea, div[contenteditable="true"]'
};

let textArea = null;
let inputTimeout = null;
const PAUSE_THRESHOLD = 3000; // 3 seconds

// 1. Detect the active text input
function detectTextArea() {
    const domain = window.location.hostname;
    const selector = SELECTORS[domain];
    if (!selector) return null;
    return document.querySelector(selector);
}

// 2. Extract text from the input
function getVisibleText() {
    if (!textArea) return "";
    return textArea.value || textArea.textContent || "";
}

// 3. Monitor for user pauses
function setupPauseDetector() {
    if (!textArea) return;

    textArea.addEventListener('input', () => {
        clearTimeout(inputTimeout);
        inputTimeout = setTimeout(() => {
            const text = getVisibleText();
            if (text.length > 10) { // Only query if meaningful text exists
                console.log('[Sovereign] 3-second pause detected, querying memories...');
                chrome.runtime.sendMessage(
                    { action: 'queryMemories', query: text },
                    (response) => {
                        if (response && response.success) injectContext(response);
                    }
                );
            }
        }, PAUSE_THRESHOLD);
    });
}

// 4. Inject the retrieved context
function injectContext(contextData) {
    if (!contextData.summary) return;

    const timestamp = new Date().toLocaleTimeString();
    const summary = `\n\n[Sovereign Context Injection at ${timestamp}]\n${contextData.summary}\n---\n`;

    // For contenteditable (Gemini/modern apps)
    if (textArea.isContentEditable || textArea.getAttribute('contenteditable') === 'true') {
        // Simple append - in production this might need Range/Selection manipulation for cursors
        textArea.textContent = textArea.textContent + summary;
    }
    // For standard textarea (ChatGPT legacy)
    else {
        textArea.value += summary;
    }

    // Notify user
    displayIndicator('\u2713 Context injected', 'success'); // Using Unicode checkmark
}

// 5. UI Feedback
function displayIndicator(message, type) {
    let indicator = document.getElementById('sovereign-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'sovereign-indicator';
        indicator.style.position = 'fixed';
        indicator.style.bottom = '20px';
        indicator.style.right = '20px';
        indicator.style.padding = '10px 15px';
        indicator.style.borderRadius = '5px';
        indicator.style.zIndex = '9999';
        indicator.style.fontFamily = 'monospace';
        document.body.appendChild(indicator);
    }

    indicator.textContent = message;
    indicator.style.background = type === 'success' ? '#238636' : '#da3633';
    indicator.style.color = '#ffffff';

    setTimeout(() => indicator.remove(), 5000);
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'testInjection') {
        // For testing purposes, inject a sample context
        const testData = {
            summary: "This is a test injection from Sovereign Context Bridge.\n\n[Sample Memory] Example context for testing purposes..."
        };
        injectContext(testData);
        sendResponse({ success: true });
        return true; // Keep channel open for async response
    }
});

// Initialization Loop
const observer = new MutationObserver(() => {
    if (!textArea) {
        textArea = detectTextArea();
        if (textArea) {
            console.log("[Sovereign] Text Area Detected.");
            setupPauseDetector();
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });