# Desmos Transcriber - Testing Guide

## How to Test the Extension

### Installation
1. Open Opera GX (or Chrome/Edge)
2. Go to: `opera://extensions` (or `chrome://extensions`, `edge://extensions`)
3. Enable **Developer mode** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select folder: `/workspaces/desmos-transcriber`

### Testing Steps

#### Test 1: Basic Extraction
1. Click the extension icon in your browser toolbar
2. This opens `transcribe.html`
3. Enter this test URL: `https://www.desmos.com/calculator/ispi70ryez`
4. Click "Extract Equations"
5. **What should happen:**
   - A new tab opens with Desmos calculator
   - You should see the equations loading
   - Wait 5-10 seconds (Desmos needs time to initialize)
   - Tab closes automatically
   - Equations appear one by one with progress bar (0% → 100%)
   
#### Test 2: Console Verification
1. Before extracting, open Developer Tools (F12)
2. Go to the **Console** tab
3. Perform extraction
4. You should see logs like:
   ```
   Desmos Transcriber background script loaded
   Starting extraction from: https://www.desmos.com/calculator/ispi70ryez
   Opening Desmos tab...
   Waiting for tab to load...
   Tab loaded successfully
   Waiting for Desmos to initialize...
   Sending extract message to content script...
   ```
5. Switch to the Desmos tab console and check for:
   ```
   🎯 Desmos Transcriber content script loaded
   ✅ Page script injected
   📊 Page script injected - searching for Desmos calculator
   Search attempt 1 / 100
   ✅ Found via window.Calc
   📥 Extraction requested
   ✅ Desmos ready, extracting...
   📊 Extraction result: {equations: Array(X), debugLog: "...", error: null}
   ```

#### Test 3: Debug Panel
1. After extraction completes
2. Scroll down to "Debug Log" section
3. Check for extraction details:
   - Number of expressions found
   - Each equation type (folder/equation)
   - Any errors or warnings

#### Test 4: Progressive Transcription
1. Watch the progress bar during extraction
2. It should show: "Processing 1 of X (Y%)"
3. Equations should appear ONE BY ONE
4. Not all at once

### Known Issues & Solutions

**Problem:** "No equations found"
- **Cause:** Desmos didn't finish loading
- **Solution:** Wait longer (increased to 5 seconds)
- **Check:** Look at debug log for "Calculator not found"

**Problem:** "Error communicating with page"
- **Cause:** Content script not injected
- **Solution:** Reload extension, try again
- **Check:** Look for content script logs in Desmos tab console

**Problem:** Tab closes too fast
- **Cause:** Extraction finished before you could see it
- **Solution:** This is normal! Check transcribe.html for results
- **Check:** Look at storage in DevTools → Application → Storage

**Problem:** Progress bar stuck at 0%
- **Cause:** No data received from background script
- **Solution:** Check background script console for errors
- **Check:** Look at chrome.storage.local contents

### Test URLs

1. **Simple example:** `https://www.desmos.com/calculator/ispi70ryez`
2. **Complex example:** `https://www.desmos.com/calculator/pj0nzjfejh`
3. **Piecewise functions:** (test your own)
4. **Folders:** (test your own)

### Console Commands for Debugging

Open Developer Tools (F12) and try:

```javascript
// Check storage
chrome.storage.local.get(null, (data) => console.log(data));

// Clear storage
chrome.storage.local.clear();

// Check if content script is ready (run in Desmos tab console)
console.log(window.__DESMOS_READY__);
console.log(window.__DESMOS_CALC__);

// Manually extract (run in Desmos tab console)
console.log(window.__extractDesmosEquations__());
```

### Expected Output Format

**Folders:**
```
📁 Folder Name
```

**Equations:**
```
y = x^2 + 2x + 1
f(x) = sin(x)
```

**Piecewise functions:**
```
f(x) = {
  x^2  when x < 0
  x    when x ≥ 0
}
```

**Vectors:**
```
v = ⟨3, 4⟩
```

### Timing Details

The extension waits at these points:
1. **Tab creation:** Immediate
2. **Tab loading:** Until `status === 'complete'` (up to 30 seconds)
3. **Desmos initialization:** Additional 5 seconds
4. **Calculator detection:** Up to 10 seconds (100 attempts × 100ms)
5. **Extraction:** Instant once ready
6. **Progressive display:** ~50ms per equation

**Total time:** Usually 7-15 seconds for full extraction

### Architecture

```
User clicks extension
    ↓
Opens transcribe.html
    ↓
User enters URL and clicks "Extract"
    ↓
background.js opens new Desmos tab
    ↓
content.js injects into page context
    ↓
Searches for window.Calc
    ↓
Extracts equations from getState()
    ↓
Sends data back to background.js
    ↓
background.js stores in chrome.storage.local
    ↓
Closes Desmos tab
    ↓
transcribe.js reads from storage
    ↓
Progressive transcription displays equations one by one
```

### If All Else Fails

1. Remove extension completely
2. Reload extension files
3. Clear browser cache
4. Restart browser
5. Check browser console for any errors
6. Verify manifest.json permissions
7. Check that all files are present (run `bash test-install.sh`)
