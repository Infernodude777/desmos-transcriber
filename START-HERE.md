# 🚀 QUICK START - Desmos Transcriber

## Installation (30 seconds)
1. Open `opera://extensions` in Opera GX
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select folder: `/workspaces/desmos-transcriber`

## Usage (3 steps)
1. **Click extension icon** (opens transcribe.html)
2. **Enter Desmos URL**: `https://www.desmos.com/calculator/ispi70ryez`
3. **Click "Extract Equations"** and wait 10-15 seconds

## What You'll See
- ✅ Desmos tab opens (visible for 5-10 seconds)
- ✅ Progress bar: "Processing 1 of X (0% → 100%)"
- ✅ Equations appear one by one
- ✅ Copy & Download buttons

## If It Doesn't Work

### Check Console Logs:
1. Press **F12** on transcribe.html
2. Click **Console** tab
3. Look for errors in red

### Check Background Script:
1. Go to `opera://extensions`
2. Find "Desmos Transcriber"
3. Click **"Service Worker"**
4. Look for logs

### Common Fixes:
- **Reload extension** (click reload icon)
- **Clear storage**: `chrome.storage.local.clear()` in console
- **Try different URL**
- **Wait longer** (first extraction takes ~15 seconds)

## Test Immediately
```
URL: https://www.desmos.com/calculator/ispi70ryez
Should extract: ~20-30 equations
Time: ~10-15 seconds
```

## Console Test (If extension fails)
1. Open Desmos URL manually
2. Press **F12** → Console
3. Run: `window.Calc && window.Calc.getState().expressions.list.length`
4. Should show equation count

## Expected Logs (background.js)
```
Starting extraction from: https://...
Opening Desmos tab...
Tab loaded successfully
Waiting for Desmos to initialize...
Sending extract message to content script...
Extraction complete: {equations: Array(X)}
Closed Desmos tab
```

## Expected Logs (content.js in Desmos tab)
```
🎯 Desmos Transcriber content script loaded
✅ Page script injected
Search attempt 1 / 100
✅ Found via window.Calc
📥 Extraction requested
✅ Desmos ready, extracting...
📊 Extraction result: {equations: Array(X)}
```

## Files You Can Test
- `test-install.sh` - Verify all files present
- `test-manual.html` - Manual extraction testing
- `FIXED.md` - Complete documentation
- `TESTING.md` - Detailed testing guide

---

**Everything is ready! Just install and test now! 🎉**
