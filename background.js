// Background service worker for Desmos Transcriber

// Listen for messages from transcribe.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractFromUrl') {
    handleUrlExtraction(request.url)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Handle extraction from a URL (entered by user)
async function handleUrlExtraction(url) {
  // Clear any previous data
  await chrome.storage.local.remove(['equations', 'sourceUrl', 'error']);
  
  // Open the URL in a new tab (VISIBLE so user can see what's happening)
  console.log('Opening Desmos URL:', url);
  const tab = await chrome.tabs.create({ url: url, active: true });
  
  // Wait for the page to fully load
  await new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
  });
  
  // Wait a moment for content script to inject
  console.log('Waiting for content script to inject...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Send message to content script to extract
  console.log('Sending extraction request to content script...');
  
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    
    if (response && response.success) {
      const { equations, debugLog } = response.data;
      
      console.log(`✓ Extracted ${equations.length} equations`);
      
      if (equations && equations.length > 0) {
        await chrome.storage.local.set({ 
          equations: equations,
          sourceUrl: url,
          debugLog: debugLog
        });
      } else {
        await chrome.storage.local.set({ 
          error: 'No equations found. Check the debug log below.',
          sourceUrl: url,
          debugLog: debugLog
        });
      }
    } else {
      await chrome.storage.local.set({ 
        error: response.error || 'Extraction failed',
        sourceUrl: url,
        debugLog: response.data?.debugLog || 'Unknown error'
      });
    }
    
    await chrome.tabs.remove(tab.id);
    
  } catch (error) {
    console.error('❌ Error communicating with content script:', error);
    await chrome.tabs.remove(tab.id);
    await chrome.storage.local.set({ 
      error: 'Error communicating with page: ' + error.message,
      sourceUrl: url,
      debugLog: `Communication error: ${error.message}`
    });
  }
}

// When extension icon is clicked, open the transcribe page
chrome.action.onClicked.addListener(async (tab) => {
  // Always open the transcription page
  const transcribePage = chrome.runtime.getURL('transcribe.html');
  await chrome.tabs.create({ url: transcribePage });
});

