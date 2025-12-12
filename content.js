// Content script for Desmos pages
// This runs on every Desmos calculator page

console.log('Desmos Transcriber content script loaded');

// Wait for the page to fully load and Desmos to initialize
let checkCount = 0;
const maxChecks = 20; // Check for up to 10 seconds

function waitForDesmos() {
  checkCount++;
  
  if (window.Calc || window.Desmos) {
    console.log('Desmos API detected and ready');
    return;
  }
  
  if (checkCount < maxChecks) {
    setTimeout(waitForDesmos, 500);
  } else {
    console.warn('Desmos API not detected after waiting');
  }
}

// Start checking
waitForDesmos();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractEquations') {
    console.log('Received extraction request');
    
    try {
      const equations = extractDesmosData();
      sendResponse({ success: true, equations: equations });
    } catch (error) {
      console.error('Error in content script:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  return true; // Keep the message channel open for async response
});

function extractDesmosData() {
  console.log('Extracting Desmos data from content script...');
  
  // Try multiple methods to access calculator
  let calculator = null;
  
  if (window.Calc) {
    calculator = window.Calc;
  } else if (window.Desmos) {
    // Try to find calculator instance
    const containers = document.querySelectorAll('.dcg-calculator-api-container');
    if (containers.length > 0 && containers[0].calculator) {
      calculator = containers[0].calculator;
    }
  }
  
  if (!calculator || !calculator.getState) {
    throw new Error('Desmos calculator not found. Make sure the page is fully loaded.');
  }
  
  const state = calculator.getState();
  
  if (!state || !state.expressions || !state.expressions.list) {
    throw new Error('No expressions found in calculator state');
  }
  
  const equations = [];
  
  state.expressions.list.forEach(expr => {
    if (expr.type === 'folder') {
      equations.push({
        id: expr.id,
        type: 'folder',
        title: expr.title || 'Folder',
        collapsed: expr.collapsed || false
      });
    } else if (expr.latex) {
      equations.push({
        id: expr.id,
        latex: expr.latex,
        color: expr.color || '#000000',
        folderId: expr.folderId || null,
        hidden: expr.hidden || false
      });
    }
  });
  
  console.log(`Extracted ${equations.length} items`);
  return equations;
}
