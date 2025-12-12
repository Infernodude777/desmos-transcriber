// Content script for Desmos pages
console.log('🎯 Desmos Transcriber content script loaded');

// Inject script into page context to access window.Calc
function injectPageScript() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      console.log('📊 Page script injected - searching for Desmos calculator');
      
      let searchAttempts = 0;
      const maxAttempts = 100; // 10 seconds
      
      function findCalculator() {
        searchAttempts++;
        console.log('Search attempt', searchAttempts, '/ ' + maxAttempts);
        
        // Method 1: window.Calc
        if (window.Calc && typeof window.Calc.getState === 'function') {
          console.log('✅ Found via window.Calc');
          window.__DESMOS_CALC__ = window.Calc;
          window.__DESMOS_READY__ = true;
          return true;
        }
        
        // Method 2: Container
        const containers = document.querySelectorAll('.dcg-calculator-api-container');
        for (let container of containers) {
          if (container.calculator && typeof container.calculator.getState === 'function') {
            console.log('✅ Found via container.calculator');
            window.__DESMOS_CALC__ = container.calculator;
            window.__DESMOS_READY__ = true;
            return true;
          }
        }
        
        // Method 3: Desmos.GraphingCalculator instances
        if (window.Desmos && window.Desmos.GraphingCalculator) {
          console.log('✅ Found Desmos.GraphingCalculator');
          // The calculator might be stored somewhere
          const allElements = document.querySelectorAll('*');
          for (let elem of allElements) {
            if (elem.calculator && typeof elem.calculator.getState === 'function') {
              console.log('✅ Found calculator on element');
              window.__DESMOS_CALC__ = elem.calculator;
              window.__DESMOS_READY__ = true;
              return true;
            }
          }
        }
        
        if (searchAttempts < maxAttempts) {
          setTimeout(findCalculator, 100);
        } else {
          console.error('❌ Could not find Desmos calculator after', maxAttempts, 'attempts');
          window.__DESMOS_ERROR__ = 'Calculator not found after ' + (maxAttempts / 10) + ' seconds';
        }
        return false;
      }
      
      // Start searching immediately
      findCalculator();
      
      // Extraction function
      window.__extractDesmosEquations__ = function() {
        const logs = ['=== Starting Extraction ==='];
        
        try {
          if (!window.__DESMOS_CALC__) {
            logs.push('❌ ERROR: Calculator not available');
            logs.push('window.Calc exists: ' + (!!window.Calc));
            logs.push('window.Desmos exists: ' + (!!window.Desmos));
            return { equations: [], debugLog: logs.join('\\n'), error: 'Calculator not found' };
          }
          
          const calculator = window.__DESMOS_CALC__;
          logs.push('✅ Calculator found');
          
          const state = calculator.getState();
          if (!state) {
            logs.push('❌ getState() returned null');
            return { equations: [], debugLog: logs.join('\\n'), error: 'getState() failed' };
          }
          
          logs.push('✅ Got state successfully');
          
          if (!state.expressions || !state.expressions.list) {
            logs.push('❌ No expressions list in state');
            return { equations: [], debugLog: logs.join('\\n'), error: 'No expressions found' };
          }
          
          const list = state.expressions.list;
          logs.push('📝 Found ' + list.length + ' expressions');
          
          const equations = [];
          list.forEach((expr, i) => {
            if (expr.type === 'folder') {
              equations.push({
                id: expr.id,
                type: 'folder',
                title: expr.title || 'Folder',
                collapsed: expr.collapsed || false
              });
              logs.push('[' + i + '] 📁 Folder: ' + expr.title);
            } else if (expr.latex) {
              equations.push({
                id: expr.id,
                latex: expr.latex,
                color: expr.color || '#000000',
                folderId: expr.folderId || null,
                hidden: expr.hidden || false
              });
              const preview = expr.latex.substring(0, 40);
              logs.push('[' + i + '] 📐 ' + preview + (expr.latex.length > 40 ? '...' : ''));
            }
          });
          
          logs.push('✅ Successfully extracted ' + equations.length + ' items');
          return { equations: equations, debugLog: logs.join('\\n'), error: null };
          
        } catch (err) {
          logs.push('❌ EXCEPTION: ' + err.message);
          logs.push('Stack: ' + err.stack);
          return { equations: [], debugLog: logs.join('\\n'), error: err.message };
        }
      };
    })();
  `;
  
  (document.head || document.documentElement).appendChild(script);
  script.remove();
  console.log('✅ Page script injected');
}

// Inject immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectPageScript);
} else {
  injectPageScript();
}

// Listen for extraction request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    console.log('📥 Extraction requested');
    
    // Wait for calculator to be ready
    let attempts = 0;
    const maxAttempts = 200; // 20 seconds
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.__DESMOS_READY__) {
        clearInterval(checkInterval);
        console.log('✅ Desmos ready, extracting...');
        
        // Call extraction function
        const result = window.__extractDesmosEquations__();
        console.log('📊 Extraction result:', result);
        
        // Send back to background script
        chrome.runtime.sendMessage({
          action: 'extractionComplete',
          data: result
        });
        
        sendResponse({ success: true });
      } else if (window.__DESMOS_ERROR__) {
        clearInterval(checkInterval);
        console.error('❌ Desmos error:', window.__DESMOS_ERROR__);
        
        chrome.runtime.sendMessage({
          action: 'extractionComplete',
          data: {
            equations: [],
            debugLog: window.__DESMOS_ERROR__,
            error: window.__DESMOS_ERROR__
          }
        });
        
        sendResponse({ success: false, error: window.__DESMOS_ERROR__ });
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        const errorMsg = 'Timeout: Desmos did not load after 20 seconds';
        console.error('❌', errorMsg);
        
        chrome.runtime.sendMessage({
          action: 'extractionComplete',
          data: {
            equations: [],
            debugLog: errorMsg,
            error: errorMsg
          }
        });
        
        sendResponse({ success: false, error: errorMsg });
      }
    }, 100);
    
    return true; // Keep channel open
  }
});