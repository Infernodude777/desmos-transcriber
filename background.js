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
  
  // Wait extra time for Desmos to initialize (8 seconds to be safe)
  console.log('Waiting 8 seconds for Desmos to fully initialize...');
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  // Try to extract equations
  try {
    console.log('Attempting to extract equations...');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractDesmosData
    });
    
    console.log('Script execution results:', results);
    const equations = results[0].result;
    console.log('Equations extracted:', equations);
    
    // Store the results
    if (equations && equations.length > 0) {
      console.log(`✓ Successfully extracted ${equations.length} items`);
      await chrome.storage.local.set({ 
        equations: equations,
        sourceUrl: url 
      });
    } else {
      console.error('❌ No equations returned from extraction');
      await chrome.storage.local.set({ 
        error: 'No equations found. The page may not be fully loaded or may not contain any equations.',
        sourceUrl: url 
      });
    }
    
    // Close the temporary tab
    await chrome.tabs.remove(tab.id);
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    console.error('Error stack:', error.stack);
    // Close tab and store error
    await chrome.tabs.remove(tab.id);
    await chrome.storage.local.set({ 
      error: 'Error extracting equations: ' + error.message,
      sourceUrl: url 
    });
    throw error;
  }
}

// When extension icon is clicked, open the transcribe page
chrome.action.onClicked.addListener(async (tab) => {
  // Check if we're on a Desmos page
  if (tab.url && tab.url.includes('desmos.com/calculator')) {
    // Extract equations from the current Desmos tab
    try {
      // Wait a moment to ensure Desmos is fully loaded
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      } else {
        // No equations found - store error
        await chrome.storage.local.set({ 
          error: 'No equations found on this page. Wait 3-5 seconds after the page loads, then try again. Or try entering the URL manually in the transcription page.',
          sourceUrl: tab.url 
        });
      }
    } catch (error) {
      console.error('Error extracting Desmos data:', error);
      
      // Store error
      await chrome.storage.local.set({ 
        error: 'Error extracting equations: ' + error.message + '. Try entering the URL manually in the transcription page.',
        sourceUrl: tab.url 
      });
    }
  } else {
    // Not on a Desmos page - clear any old data
    await chrome.storage.local.remove(['equations', 'sourceUrl', 'error']);
  }
  
  // Always open the transcription page
  const transcribePage = chrome.runtime.getURL('transcribe.html');
  await chrome.tabs.create({ url: transcribePage });
});

// Function to extract Desmos data - runs in the context of the Desmos page
function extractDesmosData() {
  console.log('=== Starting Desmos data extraction ===');
  console.log('Current URL:', window.location.href);
  console.log('Document readyState:', document.readyState);
  
  try {
    let calculator = null;
    
    // Method 1: Try window.Calc (most common)
    if (window.Calc && typeof window.Calc.getState === 'function') {
      calculator = window.Calc;
      console.log('✓ Found calculator via window.Calc');
    }
    
    // Method 2: Try Desmos.GraphingCalculator instances
    if (!calculator && window.Desmos) {
      console.log('Trying Desmos namespace...');
      const containers = document.querySelectorAll('.dcg-calculator-api-container');
      console.log(`Found ${containers.length} calculator containers`);
      
      for (let container of containers) {
        if (container.calculator && typeof container.calculator.getState === 'function') {
          calculator = container.calculator;
          console.log('✓ Found calculator via container.calculator');
          break;
        }
      }
    }
    
    // Method 3: Search window object for calculator-like objects
    if (!calculator) {
      console.log('Searching window object...');
      const calcKeys = [];
      for (let key in window) {
        try {
          const obj = window[key];
          if (obj && typeof obj === 'object' && typeof obj.getState === 'function') {
            calcKeys.push(key);
            // Test if it returns a state with expressions
            const testState = obj.getState();
            if (testState && testState.expressions) {
              calculator = obj;
              console.log(`✓ Found calculator via window.${key}`);
              break;
            }
          }
        } catch (e) {
          // Ignore errors when accessing window properties
        }
      }
      if (calcKeys.length > 0) {
        console.log('Found potential calculator keys:', calcKeys);
      }
    }
    
    // Method 4: Try to find via data attributes or IDs
    if (!calculator) {
      console.log('Trying to find via DOM...');
      const calcElements = document.querySelectorAll('[class*="calculator"]');
      console.log(`Found ${calcElements.length} elements with 'calculator' in class`);
      
      for (let elem of calcElements) {
        console.log('Checking element:', elem.className);
        if (elem.calculator && typeof elem.calculator.getState === 'function') {
          calculator = elem.calculator;
          console.log('✓ Found calculator via DOM element');
          break;
        }
      }
    }
    
    // Method 5: Last resort - check all elements for calculator property
    if (!calculator) {
      console.log('Last resort: checking all elements...');
      const allElements = document.querySelectorAll('*');
      for (let elem of allElements) {
        if (elem.calculator && typeof elem.calculator === 'object' && typeof elem.calculator.getState === 'function') {
          calculator = elem.calculator;
          console.log('✓ Found calculator via element scan');
          break;
        }
      }
    }
    
    if (!calculator || typeof calculator.getState !== 'function') {
      console.error('❌ Calculator not found after all methods');
      console.log('Window.Calc exists?', !!window.Calc);
      console.log('Window.Desmos exists?', !!window.Desmos);
      const relevantKeys = Object.keys(window).filter(k => 
        k.toLowerCase().includes('calc') || 
        k.toLowerCase().includes('desmos') ||
        k.toLowerCase().includes('graph')
      );
      console.log('Relevant window properties:', relevantKeys);
      return [];
    }
    
    // Get the state which contains all expressions
    console.log('Calling getState()...');
    const state = calculator.getState();
    console.log('State received:', state ? 'YES' : 'NO');
    
    if (!state) {
      console.error('❌ getState() returned null/undefined');
      return [];
    }
    
    if (!state.expressions) {
      console.error('❌ State has no expressions property');
      console.log('State keys:', Object.keys(state));
      return [];
    }
    
    if (!state.expressions.list) {
      console.error('❌ State.expressions has no list property');
      console.log('Expressions keys:', Object.keys(state.expressions));
      return [];
    }
    
    const equations = [];
    
    console.log(`Processing ${state.expressions.list.length} expressions...`);
    
    // Process each expression
    state.expressions.list.forEach((expr, index) => {
      const preview = expr.latex ? expr.latex.substring(0, 30) + '...' : 'no latex';
      console.log(`[${index}] Type: ${expr.type}, Latex: ${preview}, FolderId: ${expr.folderId || 'none'}`);
      
      if (expr.type === 'folder') {
        equations.push({
          id: expr.id,
          type: 'folder',
          title: expr.title || 'Folder',
          collapsed: expr.collapsed || false
        });
        console.log(`  → Added folder: "${expr.title}"`);
      } else if (expr.latex) {
        // Include any expression with latex, regardless of type
        equations.push({
          id: expr.id,
          latex: expr.latex,
          color: expr.color || '#000000',
          folderId: expr.folderId || null,
          hidden: expr.hidden || false
        });
        console.log(`  → Added equation (in folder: ${!!expr.folderId})`);
      }
    });
    
    console.log(`=== Extraction complete: ${equations.length} items found ===`);
    return equations;
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    return [];
  }
}
