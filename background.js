// Background service worker for Desmos Transcriber
console.log('Desmos Transcriber background script loaded');

// Track extraction state
let extractionState = {
  tabId: null,
  inProgress: false
};

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractFromUrl') {
    handleUrlExtraction(request.url)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Extraction error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open
  }
  
  if (request.action === 'extractionComplete') {
    // Content script finished extraction
    console.log('Extraction complete:', request.data);
    handleExtractionComplete(request.data);
    sendResponse({ success: true });
    return false;
  }
});

// Handle extraction from URL
async function handleUrlExtraction(url) {
  if (extractionState.inProgress) {
    throw new Error('Extraction already in progress');
  }
  
  console.log('Starting extraction from:', url);
  extractionState.inProgress = true;
  
  // Clear previous data
  await chrome.storage.local.remove(['equations', 'sourceUrl', 'error', 'debugLog']);
  
  try {
    // Open Desmos page
    console.log('Opening Desmos tab...');
    const tab = await chrome.tabs.create({ url: url, active: true });
    extractionState.tabId = tab.id;
    
    // Store the URL immediately
    await chrome.storage.local.set({ sourceUrl: url });
    
    // Wait for tab to be fully loaded
    console.log('Waiting for tab to load...');
    await waitForTabLoad(tab.id);
    
    // Wait additional time for Desmos to initialize (longer wait)
    console.log('Waiting for Desmos to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Now send extract message to content script
    console.log('Sending extract message to content script...');
    await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    
    // Content script will call back with extractionComplete
    // Don't close the tab here - let content script do it
    
  } catch (error) {
    console.error('Error in handleUrlExtraction:', error);
    extractionState.inProgress = false;
    
    // Close tab if it was opened
    if (extractionState.tabId) {
      try {
        await chrome.tabs.remove(extractionState.tabId);
      } catch (e) {
        // Tab might already be closed
      }
      extractionState.tabId = null;
    }
    
    // Store error
    await chrome.storage.local.set({
      error: error.message || 'Unknown error during extraction',
      debugLog: error.stack || error.message
    });
    
    throw error;
  }
}

// Wait for tab to finish loading
function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, 30000); // 30 second timeout
    
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        console.log('Tab loaded successfully');
        resolve();
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Handle extraction completion from content script
async function handleExtractionComplete(data) {
  const { equations, debugLog, error } = data;
  
  console.log('Handling extraction complete:', {
    equationCount: equations?.length,
    hasError: !!error
  });
  
  if (error) {
    await chrome.storage.local.set({
      error: error,
      debugLog: debugLog || 'No debug log available'
    });
  } else if (equations && equations.length > 0) {
    await chrome.storage.local.set({
      equations: equations,
      debugLog: debugLog || 'Extraction successful'
    });
  } else {
    await chrome.storage.local.set({
      error: 'No equations found',
      debugLog: debugLog || 'No equations in calculator'
    });
  }
  
  // Close the Desmos tab
  if (extractionState.tabId) {
    try {
      await chrome.tabs.remove(extractionState.tabId);
      console.log('Closed Desmos tab');
    } catch (e) {
      console.error('Error closing tab:', e);
    }
  }
  
  // Reset state
  extractionState.tabId = null;
  extractionState.inProgress = false;
}

// When extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  const transcribePage = chrome.runtime.getURL('transcribe.html');
  await chrome.tabs.create({ url: transcribePage });
});

