// Content script for Desmos pages
// This runs in an isolated context, but we need to access the page's actual JavaScript

console.log('Desmos Transcriber content script loaded');

// Inject a script into the page's actual context (not isolated)
function injectPageScript() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      console.log('Desmos Transcriber page script injected');
      
      // Wait for Desmos to be ready
      function waitForDesmos() {
        if (window.Calc && typeof window.Calc.getState === 'function') {
          console.log('✓ Desmos Calc found!');
          window.__DESMOS_READY__ = true;
          window.__DESMOS_CALC__ = window.Calc;
          return;
        }
        
        // Check for Desmos in containers
        const containers = document.querySelectorAll('.dcg-calculator-api-container');
        for (let container of containers) {
          if (container.calculator && typeof container.calculator.getState === 'function') {
            console.log('✓ Desmos calculator found in container!');
            window.__DESMOS_READY__ = true;
            window.__DESMOS_CALC__ = container.calculator;
            return;
          }
        }
        
        // Keep checking
        setTimeout(waitForDesmos, 100);
      }
      
      waitForDesmos();
      
      // Expose extraction function to the page
      window.__extractDesmosEquations__ = function() {
        const logs = [];
        
        try {
          let calculator = window.__DESMOS_CALC__ || window.Calc;
          
          if (!calculator) {
            // Try to find it again
            const containers = document.querySelectorAll('.dcg-calculator-api-container');
            for (let container of containers) {
              if (container.calculator && typeof container.calculator.getState === 'function') {
                calculator = container.calculator;
                break;
              }
            }
          }
          
          if (!calculator || typeof calculator.getState !== 'function') {
            logs.push('ERROR: Calculator not found');
            logs.push('window.Calc: ' + (!!window.Calc));
            logs.push('window.Desmos: ' + (!!window.Desmos));
            return { equations: [], debugLog: logs.join('\\n') };
          }
          
          logs.push('✓ Calculator found, calling getState()...');
          const state = calculator.getState();
          
          if (!state || !state.expressions || !state.expressions.list) {
            logs.push('ERROR: Invalid state structure');
            return { equations: [], debugLog: logs.join('\\n') };
          }
          
          logs.push('Processing ' + state.expressions.list.length + ' expressions...');
          
          const equations = [];
          state.expressions.list.forEach((expr, index) => {
            if (expr.type === 'folder') {
              equations.push({
                id: expr.id,
                type: 'folder',
                title: expr.title || 'Folder',
                collapsed: expr.collapsed || false
              });
              logs.push('[' + index + '] Folder: ' + expr.title);
            } else if (expr.latex) {
              equations.push({
                id: expr.id,
                latex: expr.latex,
                color: expr.color || '#000000',
                folderId: expr.folderId || null,
                hidden: expr.hidden || false
              });
              logs.push('[' + index + '] Equation: ' + expr.latex.substring(0, 30) + '...');
            }
          });
          
          logs.push('✓ Extracted ' + equations.length + ' items');
          return { equations: equations, debugLog: logs.join('\\n') };
          
        } catch (error) {
          logs.push('ERROR: ' + error.message);
          return { equations: [], debugLog: logs.join('\\n') };
        }
      };
    })();
  `;
  
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Inject as soon as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectPageScript);
} else {
  injectPageScript();
}

// Listen for extraction requests from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    console.log('Extraction requested');
    
    // Check if page script is ready (no timeout - wait as long as needed)
    const checkReady = setInterval(() => {
      if (window.__DESMOS_READY__) {
        clearInterval(checkReady);
        
        // Call the extraction function in page context
        const result = window.__extractDesmosEquations__();
        sendResponse({ success: true, data: result });
      }
    }, 100);
    
    return true; // Keep message channel open
  }
});