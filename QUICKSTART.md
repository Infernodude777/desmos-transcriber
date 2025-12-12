# ⚡ 60-SECOND INSTALL & TEST

## Install (20 seconds)
1. Open: `opera://extensions`
2. Toggle: **Developer mode** ON
3. Click: **Load unpacked**
4. Select: `/workspaces/desmos-transcriber`

## Test (40 seconds)
1. Click extension icon in toolbar
2. Paste: `https://www.desmos.com/calculator/ispi70ryez`
3. Click: **Extract Equations**
4. Wait: 10-15 seconds

## Success = You See This:
✅ Desmos tab opens  
✅ Graphs appear  
✅ Tab closes automatically  
✅ Progress: "Processing 1 of X (0%)"  
✅ Progress bar fills up  
✅ Equations appear one by one  
✅ "Copy All" and "Download" buttons  

## Failure = You See This:
❌ "No equations found"  
❌ "Error communicating"  
❌ Tab opens but nothing happens  
❌ Progress stuck at 0%  

## If It Fails:
Press **F12** → **Console** tab → Look for errors

## Debug Commands:
```javascript
// In transcribe.html console:
chrome.storage.local.get(null, d => console.log(d))

// In Desmos tab console (before it closes):
console.log(window.Calc)
console.log(window.__DESMOS_READY__)
```

## Common Fixes:
- **Reload extension**: Go to extensions page, click reload icon
- **Clear storage**: `chrome.storage.local.clear()` in console
- **Try different URL**: Use the test URL above
- **Wait longer**: First extraction takes ~15 seconds
- **Check background script**: Extensions → Service Worker → Console

## Files to Read:
- `START-HERE.md` - Quick start guide
- `FIXED.md` - Complete documentation
- `TESTING.md` - Detailed testing protocol
- `CHANGES.md` - Technical changes
- `test-manual.html` - Manual testing page

---

**Everything is ready! Install and test now! 🚀**
