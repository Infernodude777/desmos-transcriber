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
  
  // Wait initial time for page to settle
  console.log('Waiting 3 seconds for page to settle...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Poll for Desmos to be ready (up to 30 seconds)
  console.log('Polling for Desmos calculator to be ready...');
  const maxAttempts = 30;
  let attempt = 0;
  let ready = false;
  
  while (attempt < maxAttempts && !ready) {
    attempt++;
    console.log(`Attempt ${attempt}/${maxAttempts}...`);
    
    try {
      const checkResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: checkDesmosReady
      });
      
      ready = checkResults[0].result;
      
      if (ready) {
        console.log('✓ Desmos is ready!');
        break;
      }
    } catch (e) {
      console.log('Check failed:', e.message);
    }
    
    if (!ready) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  if (!ready) {
    console.error('❌ Desmos did not become ready after 30 seconds');
    await chrome.tabs.remove(tab.id);
    await chrome.storage.local.set({ 
      error: 'Desmos calculator did not load properly. The page may be blocked or slow to load.',
      sourceUrl: url,
      debugLog: `Waited 30 seconds but Desmos calculator never became ready.`
    });
    return;
  }
  
  // Try to extract equations
  try {
    console.log('Attempting to extract equations...');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractDesmosData
    });
    
    console.log('Script execution results:', results);
    const result = results[0].result;
    const equations = result.equations;
    const debugLog = result.debugLog;
    
    console.log('Equations extracted:', equations);
    console.log('Debug log:', debugLog);
    
    // Store the results including debug log
    if (equations && equations.length > 0) {
      console.log(`✓ Successfully extracted ${equations.length} items`);
      await chrome.storage.local.set({ 
        equations: equations,
        sourceUrl: url,
        debugLog: debugLog
      });
    } else {
      console.error('❌ No equations returned from extraction');
      await chrome.storage.local.set({ 
        error: 'No equations found. Check the debug log below for details.',
        sourceUrl: url,
        debugLog: debugLog
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
      sourceUrl: url,
      debugLog: `Error: ${error.message}\n\nStack: ${error.stack}`
    });
    throw error;
  }
}

// Check if Desmos calculator is ready
function checkDesmosReady() {
  // Check if window.Calc exists and has getState
  if (window.Calc && typeof window.Calc.getState === 'function') {
    try {
      const state = window.Calc.getState();
      if (state && state.expressions) {
        return true;
      }
    } catch (e) {
      return false;
    }
  }
  
  // Check if Desmos namespace exists with calculator instances
  if (window.Desmos) {
    const containers = document.querySelectorAll('.dcg-calculator-api-container');
    for (let container of containers) {
      if (container.calculator && typeof container.calculator.getState === 'function') {
        try {
          const state = container.calculator.getState();
          if (state && state.expressions) {
            return true;
          }
        } catch (e) {
          continue;
        }
      }
    }
  }
  
  return false;
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
  const logs = [];
  const log = (msg) => {
    console.log(msg);
    logs.push(msg);
  };
  
  log('=== Starting Desmos data extraction ===');
  log('Current URL: ' + window.location.href);
  log('Document readyState: ' + document.readyState);
  
  try {
    let calculator = null;
    
    // Method 1: Try window.Calc (most common)
    if (window.Calc && typeof window.Calc.getState === 'function') {
      calculator = window.Calc;
      log('✓ Found calculator via window.Calc');
    }
    
    // Method 2: Try Desmos.GraphingCalculator instances
    if (!calculator && window.Desmos) {
      log('Trying Desmos namespace...');
      const containers = document.querySelectorAll('.dcg-calculator-api-container');
      log(`Found ${containers.length} calculator containers`);
      
      for (let container of containers) {
        if (container.calculator && typeof container.calculator.getState === 'function') {
          calculator = container.calculator;
          log('✓ Found calculator via container.calculator');
          break;
        }
      }
    }
    
    // Method 3: Search window object for calculator-like objects
    if (!calculator) {
      log('Searching window object...');
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
              log(`✓ Found calculator via window.${key}`);
              break;
            }
          }
        } catch (e) {
          // Ignore errors when accessing window properties
        }
      }
      if (calcKeys.length > 0) {
        log('Found potential calculator keys: ' + calcKeys.join(', '));
      }
    }
    
    // Method 4: Try to find via data attributes or IDs
    if (!calculator) {
      log('Trying to find via DOM...');
      const calcElements = document.querySelectorAll('[class*="calculator"]');
      log(`Found ${calcElements.length} elements with 'calculator' in class`);
      
      for (let elem of calcElements) {
        log('Checking element: ' + elem.className);
        if (elem.calculator && typeof elem.calculator.getState === 'function') {
          calculator = elem.calculator;
          log('✓ Found calculator via DOM element');
          break;
        }
      }
    }
    
    // Method 5: Last resort - check all elements for calculator property
    if (!calculator) {
      log('Last resort: checking all elements...');
      const allElements = document.querySelectorAll('*');
      log(`Scanning ${allElements.length} elements...`);
      let scannedCount = 0;
      for (let elem of allElements) {
        if (elem.calculator && typeof elem.calculator === 'object' && typeof elem.calculator.getState === 'function') {
          calculator = elem.calculator;
          log(`✓ Found calculator via element scan (checked ${scannedCount} elements)`);
          break;
        }
        scannedCount++;
        if (scannedCount > 1000) {
          log('Stopped scanning after 1000 elements');
          break;
        }
      }
    }
    
    if (!calculator || typeof calculator.getState !== 'function') {
      log('❌ Calculator not found after all methods');
      log('Window.Calc exists? ' + (!!window.Calc));
      log('Window.Desmos exists? ' + (!!window.Desmos));
      const relevantKeys = Object.keys(window).filter(k => 
        k.toLowerCase().includes('calc') || 
        k.toLowerCase().includes('desmos') ||
        k.toLowerCase().includes('graph')
      );
      log('Relevant window properties: ' + relevantKeys.join(', '));
      return { equations: [], debugLog: logs.join('\n') };
    }
    
    // Get the state which contains all expressions
    log('Calling getState()...');
    const state = calculator.getState();
    log('State received: ' + (state ? 'YES' : 'NO'));
    
    if (!state) {
      log('❌ getState() returned null/undefined');
      return { equations: [], debugLog: logs.join('\n') };
    }
    
    if (!state.expressions) {
      log('❌ State has no expressions property');
      log('State keys: ' + Object.keys(state).join(', '));
      return { equations: [], debugLog: logs.join('\n') };
    }
    
    if (!state.expressions.list) {
      log('❌ State.expressions has no list property');
      log('Expressions keys: ' + Object.keys(state.expressions).join(', '));
      return { equations: [], debugLog: logs.join('\n') };
    }
    
    const equations = [];
    
    log(`Processing ${state.expressions.list.length} expressions...`);
    
    // Process each expression
    state.expressions.list.forEach((expr, index) => {
      const preview = expr.latex ? expr.latex.substring(0, 30) + '...' : 'no latex';
      log(`[${index}] Type: ${expr.type}, Latex: ${preview}, FolderId: ${expr.folderId || 'none'}`);
      
      if (expr.type === 'folder') {
        equations.push({
          id: expr.id,
          type: 'folder',
          title: expr.title || 'Folder',
          collapsed: expr.collapsed || false
        });
        log(`  → Added folder: "${expr.title}"`);
      } else if (expr.latex) {
        // Include any expression with latex, regardless of type
        equations.push({
          id: expr.id,
          latex: expr.latex,
          color: expr.color || '#000000',
          folderId: expr.folderId || null,
          hidden: expr.hidden || false
        });
        log(`  → Added equation (in folder: ${!!expr.folderId})`);
      }
    });
    
    log(`=== Extraction complete: ${equations.length} items found ===`);
    return { equations: equations, debugLog: logs.join('\n') };
    
  } catch (error) {
    log('❌ Error during extraction: ' + error.message);
    log('Error stack: ' + error.stack);
    return { equations: [], debugLog: logs.join('\n') };
  }
}
