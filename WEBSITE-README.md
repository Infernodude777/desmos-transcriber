# Desmos Transcriber Website

A standalone web tool to convert Desmos LaTeX equations to clean Unicode notation.

## 🌐 Use Online

Simply open `index.html` in your browser - no downloads, no installation needed!

## ✨ Features

- **LaTeX to Unicode**: Convert `x^{2}+y^{2}=25` to `x²+y²=25`
- **Embedded Calculator**: Work with Desmos directly in the page
- **Load Graphs**: Enter any Desmos graph URL to load it
- **Proper Notation**:
  - Superscripts: x² not x^2
  - Subscripts: x₁ not x_1
  - Greek letters: α, β, θ, π
  - Operators: ≤, ≥, ≠, ≈, ∞
  - Piecewise: "when" format
- **Easy Copy**: Copy individual equations or all at once
- **Download**: Save as .txt file

## 🚀 How to Use

1. **Create equations** in the Desmos calculator OR **load a graph URL**
2. **Copy LaTeX** from Desmos (right-click equation → Copy as LaTeX)
3. **Paste** into the textarea
4. Click **"✨ Transcribe to Unicode"**
5. **Copy** individual equations or use "Copy All"

## 📝 Input Format

Separate equations with:
- **Semicolons**: `x^2=4; y=2x; ...`
- **New lines**: One equation per line

## 🎨 Example

**Input LaTeX:**
```
x^{2}+y^{2}=25;
f(x)=\frac{1}{x};
\theta=\frac{\pi}{4}
```

**Output Unicode:**
```
x²+y²=25

f(x)=(1/x)

θ=π/4
```

## 🔧 Hosting

To host this website:

1. Upload `index.html`, `website.js`, and `styles.css` to any web server
2. Or use GitHub Pages, Netlify, Vercel, etc.
3. No backend needed - pure frontend!

## 📦 Files

- `index.html` - Main webpage
- `website.js` - Transcription logic (no extension APIs)
- `styles.css` - Styling
- `transcribe.html` + `transcribe.js` - Chrome extension version
- `manifest.json` - Extension manifest

## 🆚 Website vs Extension

| Feature | Website | Extension |
|---------|---------|-----------|
| Installation | None | Download & install |
| Auto-extract | ❌ Manual paste | ✅ Auto from URL |
| Offline | ❌ Needs internet | ✅ Works offline |
| Updates | Auto (reload page) | Manual update |

The website version is simpler and requires no installation, while the extension can auto-extract equations from saved graphs.
