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
  
  // Try multiple possible endpoints
  const endpoints = [
    `https://www.desmos.com/calculator/${graphId}`,
    `https://saved-work.desmos.com/calc-states/production/${graphId}`,
    `https://www.desmos.com/api/v1/calculator/state/${graphId}`,
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log('Trying endpoint:', endpoint);
      const response = await fetch(endpoint);
      
      if (response.ok) {
        // Check if it's JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('Graph data fetched successfully from:', endpoint);
          return data;
        } else {
          // Try to parse HTML and extract state
          const html = await response.text();
          const stateMatch = html.match(/window\.Calc\.setState\((.*?)\);/s);
          if (stateMatch) {
            const state = JSON.parse(stateMatch[1]);
            console.log('Extracted state from HTML');
            return { state: state };
          }
        }
      }
    } catch (error) {
      console.log('Failed with endpoint:', endpoint, error.message);
      continue;
    }
  }
  
  throw new Error('Could not fetch graph from any endpoint');
}

// When extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  const transcribePage = chrome.runtime.getURL('transcribe.html');
  await chrome.tabs.create({ url: transcribePage });
});

