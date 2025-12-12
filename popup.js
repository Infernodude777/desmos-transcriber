document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('desmosUrl');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const status = document.getElementById('status');
  
  // Try to get current tab URL if it's a Desmos page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    if (currentUrl && currentUrl.includes('desmos.com/calculator')) {
      urlInput.value = currentUrl;
    }
  });
  
  transcribeBtn.addEventListener('click', async function() {
    const url = urlInput.value.trim();
    
    if (!url) {
      showStatus('Please enter a Desmos URL', 'error');
      return;
    }
    
    if (!url.includes('desmos.com/calculator')) {
      showStatus('Invalid Desmos calculator URL', 'error');
      return;
    }
    
    transcribeBtn.disabled = true;
    showStatus('Loading Desmos page...', '');
    
    try {
      // Open the Desmos URL in a new tab
      const tab = await chrome.tabs.create({ url: url, active: false });
      
      // Wait for the page to load
      await new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });
      
      // Wait a bit more for Desmos to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showStatus('Extracting equations...', '');
      
      // Inject content script to extract data
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractDesmosData
      });
      
      const equations = results[0].result;
      
      if (!equations || equations.length === 0) {
        showStatus('No equations found', 'error');
        chrome.tabs.remove(tab.id);
        transcribeBtn.disabled = false;
        return;
      }
      
      // Close the temporary tab
      chrome.tabs.remove(tab.id);
      
      // Open transcription page with the data
      const transcribePage = chrome.runtime.getURL('transcribe.html');
      const newTab = await chrome.tabs.create({ url: transcribePage });
      
      // Store the equations data
      chrome.storage.local.set({ 
        equations: equations,
        sourceUrl: url 
      });
      
      showStatus('Opening transcription page...', 'success');
      
      setTimeout(() => {
        window.close();
      }, 500);
      
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
      transcribeBtn.disabled = false;
    }
  });
  
  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
  }
});

// This function runs in the context of the Desmos page
function extractDesmosData() {
  try {
    // Access the Desmos calculator API
    const calculator = window.Calc;
    if (!calculator) {
      throw new Error('Desmos calculator not found');
    }
    
    // Get the state which contains all expressions
    const state = calculator.getState();
    
    if (!state || !state.expressions || !state.expressions.list) {
      return [];
    }
    
    const equations = [];
    
    // Process each expression
    state.expressions.list.forEach(expr => {
      if (expr.type === 'expression' && expr.latex) {
        equations.push({
          id: expr.id,
          latex: expr.latex,
          color: expr.color || '#000000',
          folderId: expr.folderId || null,
          hidden: expr.hidden || false
        });
      } else if (expr.type === 'folder') {
        equations.push({
          id: expr.id,
          type: 'folder',
          title: expr.title || 'Folder',
          collapsed: expr.collapsed || false
        });
      }
    });
    
    return equations;
  } catch (error) {
    console.error('Error extracting Desmos data:', error);
    return [];
  }
}
