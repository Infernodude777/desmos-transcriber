// Background service worker for Desmos Transcriber

// When extension icon is clicked, open the transcribe page
chrome.action.onClicked.addListener(async (tab) => {
  // Check if we're on a Desmos page
  if (tab.url && tab.url.includes('desmos.com/calculator')) {
    // Extract equations from the current Desmos tab
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractDesmosData
      });
      
      const equations = results[0].result;
      
      if (equations && equations.length > 0) {
        // Store the data and open transcription page
        await chrome.storage.local.set({ 
          equations: equations,
          sourceUrl: tab.url 
        });
        
        const transcribePage = chrome.runtime.getURL('transcribe.html');
        await chrome.tabs.create({ url: transcribePage });
      } else {
        // No equations found - open transcribe page with error
        await chrome.storage.local.set({ 
          error: 'No equations found on this page. Make sure the Desmos calculator is fully loaded.',
          sourceUrl: tab.url 
        });
        
        const transcribePage = chrome.runtime.getURL('transcribe.html');
        await chrome.tabs.create({ url: transcribePage });
      }
    } catch (error) {
      console.error('Error extracting Desmos data:', error);
      
      // Store error and open transcribe page
      await chrome.storage.local.set({ 
        error: 'Error extracting equations: ' + error.message,
        sourceUrl: tab.url 
      });
      
      const transcribePage = chrome.runtime.getURL('transcribe.html');
      await chrome.tabs.create({ url: transcribePage });
    }
  } else {
    // Not on a Desmos page - just open the transcribe page
    await chrome.storage.local.remove(['equations', 'sourceUrl', 'error']);
    const transcribePage = chrome.runtime.getURL('transcribe.html');
    await chrome.tabs.create({ url: transcribePage });
  }
});

// Function to extract Desmos data - runs in the context of the Desmos page
function extractDesmosData() {
  console.log('Starting Desmos data extraction...');
  
  try {
    // Try multiple ways to access the Desmos calculator
    let calculator = null;
    
    // Method 1: window.Calc
    if (window.Calc) {
      calculator = window.Calc;
      console.log('Found calculator via window.Calc');
    }
    
    // Method 2: Check for Desmos namespace
    if (!calculator && window.Desmos && window.Desmos.GraphingCalculator) {
      // Try to find the calculator instance
      const calculatorElements = document.querySelectorAll('.dcg-calculator-api-container');
      if (calculatorElements.length > 0) {
        calculator = calculatorElements[0].calculator;
        console.log('Found calculator via Desmos.GraphingCalculator');
      }
    }
    
    // Method 3: Try to find it in the global scope
    if (!calculator) {
      for (let key in window) {
        if (window[key] && typeof window[key] === 'object' && window[key].getState) {
          calculator = window[key];
          console.log('Found calculator via global scope search');
          break;
        }
      }
    }
    
    if (!calculator || !calculator.getState) {
      console.error('Calculator not found or getState not available');
      return [];
    }
    
    // Get the state which contains all expressions
    const state = calculator.getState();
    console.log('Got state:', state);
    
    if (!state || !state.expressions || !state.expressions.list) {
      console.error('State or expressions list not found');
      return [];
    }
    
    const equations = [];
    let currentFolder = null;
    
    // Process each expression
    state.expressions.list.forEach((expr, index) => {
      console.log(`Processing expression ${index}:`, expr.type, expr.latex || expr.title);
      
      if (expr.type === 'folder') {
        currentFolder = expr.id;
        equations.push({
          id: expr.id,
          type: 'folder',
          title: expr.title || 'Folder',
          collapsed: expr.collapsed || false
        });
      } else if (expr.type === 'expression' && expr.latex) {
        equations.push({
          id: expr.id,
          latex: expr.latex,
          color: expr.color || '#000000',
          folderId: expr.folderId || null,
          hidden: expr.hidden || false,
          inFolder: expr.folderId === currentFolder
        });
      } else if (expr.latex) {
        // Some expressions might not have explicit type
        equations.push({
          id: expr.id,
          latex: expr.latex,
          color: expr.color || '#000000',
          folderId: expr.folderId || null,
          hidden: expr.hidden || false,
          inFolder: expr.folderId === currentFolder
        });
      }
    });
    
    console.log(`Found ${equations.length} equations/folders`);
    return equations;
  } catch (error) {
    console.error('Error extracting Desmos data:', error);
    return [];
  }
}
