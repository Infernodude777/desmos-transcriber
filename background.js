// Background service worker for Desmos Transcriber
console.log('Desmos Transcriber background script loaded');

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchGraphData') {
    // Fetch graph data on behalf of the extension page to avoid CORS
    fetchGraphData(request.graphId)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(error => {
        console.error('Fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
});

// Fetch graph data from Desmos API
async function fetchGraphData(graphId) {
  console.log('Fetching graph data for:', graphId);
  
  try {
    const response = await fetch(`https://saved-work.desmos.com/calc-states/production/${graphId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Graph data fetched successfully');
    return data;
    
  } catch (error) {
    console.error('Error fetching graph:', error);
    throw error;
  }
}

// When extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  const transcribePage = chrome.runtime.getURL('transcribe.html');
  await chrome.tabs.create({ url: transcribePage });
});

