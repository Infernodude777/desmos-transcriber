# Quick Start Guide - Desmos Transcriber

## Installation (5 minutes)

### Step 1: Load the Extension
1. Open Chrome browser
2. Type `chrome://extensions/` in the address bar and press Enter
3. Enable **Developer mode** by clicking the toggle in the top-right corner
4. Click **"Load unpacked"** button
5. Navigate to and select the `desmos-transcriber` folder
6. You should see the Desmos Transcriber extension card appear

### Step 2: Test It Out
1. Go to https://www.desmos.com/calculator
2. Enter some equations, for example:
   - `f(x) = x^2`
   - `g(x) = {0<x<1: x, 1≤x≤2: x^2}`  (piecewise function)
   - `v = (3, 4, 5)`  (vector)
3. Click the extension icon (∑) in your Chrome toolbar
4. The URL should auto-fill since you're on a Desmos page
5. Click **"Transcribe Equations"**
6. A new tab will open with your equations in proper mathematical notation!

## Features You'll Love

### ✅ Piecewise Functions
Desmos format:
```
f\left(x\right)=\left\{0<x<1:x,\ 1\le x\le2:x^{2}\right\}
```
Becomes:
```
f(x) = {
    x when 0<x<1
    x² when 1≤x≤2
}
```

### ✅ Proper Vector Notation
Desmos: `(3, 4, 5)`
Output: `⟨3, 4, 5⟩`

### ✅ Mathematical Symbols
- `\le` → `≤`
- `\ge` → `≥`
- `\pi` → `π`
- `\theta` → `θ`
- And many more!

### ✅ Easy Copying
- Copy individual equations with the "Copy" button
- Copy all equations at once with "Copy All Equations"
- Download as a text file

## Troubleshooting

**Extension doesn't appear?**
- Make sure Developer mode is enabled
- Try refreshing the extensions page

**No equations extracted?**
- Make sure the Desmos page is fully loaded
- Wait 2-3 seconds after the page loads before clicking transcribe
- Refresh the Desmos page and try again

**Some equations look wrong?**
- Very complex LaTeX may need manual adjustment
- Report issues for improvement!

## Next Steps

- Open `test-examples.html` in a browser to see more examples
- Read the full `README.md` for technical details
- Customize the code to fit your needs!

## Need Help?

Check the README.md file for more detailed information about:
- How the extension works
- Technical details
- Contributing
- Advanced usage

Enjoy transcribing! 📐✨
