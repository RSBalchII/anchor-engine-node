document.addEventListener('DOMContentLoaded', async () => {
    const statusBadge = document.getElementById('status-badge');

    // Check connection to Local Bridge
    try {
        // Using a more robust approach to handle CORS issues
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const res = await fetch('http://localhost:8080/health', {
            signal: controller.signal,
            mode: 'cors', // Explicitly set CORS mode
            credentials: 'omit' // Don't send credentials
        });

        clearTimeout(timeoutId);

        if (res.ok) {
            statusBadge.textContent = "● Online";
            statusBadge.className = "status-ok";
        } else {
            statusBadge.textContent = "● Offline";
            statusBadge.className = "status-err";
        }
    } catch (e) {
        // Handle network errors, CORS errors, and timeouts
        console.warn('[Sovereign] Backend connection failed:', e.message);
        statusBadge.textContent = "● Offline";
        statusBadge.className = "status-err";
    }

    document.getElementById('test-inject-btn').addEventListener('click', () => {
        // Trigger manual test injection
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'testInjection' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('[Sovereign] Test injection not available on this page');
                } else {
                    console.log('[Sovereign] Test injection triggered');
                }
            });
        });
    });

    // Add settings button functionality
    document.getElementById('settings-btn').addEventListener('click', () => {
        // For now, just show a message - in the future this could open options page
        alert('Sovereign Context Bridge Settings\n\nConfigure extension preferences here.');
    });
});