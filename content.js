// Content script for Desmos pages
// This runs on every Desmos calculator page

console.log('Desmos Transcriber content script loaded');

// Note: The content script is mainly here to ensure we have access to the page context.
// The actual extraction happens in background.js when the extension icon is clicked.

// Wait for the page to fully load and Desmos to initialize
let checkCount = 0;
const maxChecks = 20; // Check for up to 10 seconds

function waitForDesmos() {
  checkCount++;
  
  if (window.Calc || window.Desmos) {
    console.log('✓ Desmos API detected and ready');
    return;
  }
  
  if (checkCount < maxChecks) {
    setTimeout(waitForDesmos, 500);
  } else {
    console.log('ℹ️ Desmos API check timed out (this is OK - extraction will happen when you click the extension icon)');
  }
}

// Start checking
waitForDesmos();
