# 📐 Desmos Transcriber

A Chrome extension that transcribes Desmos calculator equations into properly formatted mathematical notation, ready for copying and pasting.

## Features

- **Extract Equations**: Automatically extracts all equations from a Desmos calculator link
- **Proper Notation**: Converts Desmos LaTeX to standard mathematical notation
- **Piecewise Functions**: Formats piecewise functions in readable format:
  ```
  f(x) = {
      x when 0<x<1
      x² when 1≤x≤2
  }
  ```
- **Vector Notation**: Converts parentheses to proper angle brackets: `⟨a, b, c⟩`
- **Folder Support**: Maintains organization with folders
- **Easy Copying**: Copy individual equations or all at once
- **Download**: Save equations as a text file
- **Beautiful UI**: Clean, mathematical interface with gradient styling

## Installation

### For Development:

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `desmos-transcriber` folder
5. The extension icon should appear in your toolbar

### Creating Icons (Optional):

The extension includes placeholder icon files. To create proper PNG icons from the SVG:

```bash
# Using rsvg-convert (install librsvg2-bin on Ubuntu/Debian)
sudo apt-get install librsvg2-bin
cd /workspaces/desmos-transcriber
rsvg-convert -w 128 -h 128 icon.svg > icon128.png
rsvg-convert -w 48 -h 48 icon.svg > icon48.png
rsvg-convert -w 16 -h 16 icon.svg > icon16.png
```

Or use any online SVG to PNG converter with the `icon.svg` file.

## Usage

1. **Navigate to a Desmos Calculator**
   - Open any Desmos calculator URL (e.g., `https://www.desmos.com/calculator/abc123`)

2. **Click the Extension Icon**
   - The extension popup will appear
   - The URL will be auto-filled if you're on a Desmos page

3. **Transcribe Equations**
   - Click "Transcribe Equations"
   - The extension will extract all equations and open them in a new tab

4. **Copy or Download**
   - Use the "Copy All Equations" button to copy everything
   - Use "Copy" buttons to copy individual equations
   - Use "Download as Text" to save as a file

## Notation Conversions

The extension automatically converts Desmos notation to standard mathematical notation:

| Desmos | Output |
|--------|--------|
| `\left(a,b,c\right)` | `⟨a, b, c⟩` (vectors) |
| `\frac{a}{b}` | `a/b` or `(a)/(b)` |
| `\sqrt{x}` | `√(x)` |
| `\le` | `≤` |
| `\ge` | `≥` |
| `\cdot` | `·` |
| `\times` | `×` |
| `\pi` | `π` |
| Greek letters | Unicode symbols (α, β, θ, etc.) |
| Piecewise | Multi-line format with "when" |

## Project Structure

```
desmos-transcriber/
├── manifest.json         # Extension manifest
├── popup.html           # Extension popup interface
├── popup.js             # Popup logic and Desmos data extraction
├── transcribe.html      # Transcription display page
├── transcribe.js        # Equation processing and notation conversion
├── styles.css           # Styling for the transcription page
├── icon.svg             # Source icon (SVG format)
├── icon16.png           # 16x16 icon
├── icon48.png           # 48x48 icon
├── icon128.png          # 128x128 icon
└── README.md            # This file
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `activeTab`, `scripting`, `storage`
- **Host Permissions**: `https://www.desmos.com/*`
- **APIs Used**: Chrome Extensions API, Desmos Calculator API

## How It Works

1. The extension injects a content script into the Desmos page
2. It accesses the Desmos calculator API (`window.Calc.getState()`)
3. Extracts all expressions, including their LaTeX notation
4. Processes the LaTeX to convert it to readable mathematical notation
5. Displays the results in a beautifully formatted page

## Known Limitations

- Requires the Desmos page to be fully loaded
- Some complex LaTeX expressions may not convert perfectly
- Icons are placeholders (SVG needs to be converted to PNG for production)

## Future Enhancements

- Support for more complex mathematical notations
- Direct integration with Desmos page (no popup needed)
- Export to multiple formats (PDF, LaTeX, Markdown)
- Customizable notation preferences
- Support for graphs and tables

## Contributing

Feel free to submit issues or pull requests to improve the extension!

## License

MIT License - feel free to use and modify as needed.