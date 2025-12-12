#!/bin/bash

# Desmos Transcriber - Installation Verification Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        Desmos Transcriber - Installation Check            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if all required files exist
echo "Checking required files..."
required_files=(
  "manifest.json"
  "popup.html"
  "popup.js"
  "transcribe.html"
  "transcribe.js"
  "styles.css"
  "icon.svg"
  "icon16.png"
  "icon48.png"
  "icon128.png"
)

all_present=true
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file - MISSING!"
    all_present=false
  fi
done

echo ""

if [ "$all_present" = true ]; then
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  ✅ All files present! Extension is ready to install.     ║"
  echo "╚════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Next steps:"
  echo "1. Open Chrome and go to: chrome://extensions/"
  echo "2. Enable 'Developer mode' (toggle in top right)"
  echo "3. Click 'Load unpacked'"
  echo "4. Select this folder: $(pwd)"
  echo "5. Test on: https://www.desmos.com/calculator"
  echo ""
  echo "📖 See QUICKSTART.md for detailed instructions"
  echo "📖 See README.md for full documentation"
else
  echo "╔════════════════════════════════════════════════════════════╗"
  echo "║  ❌ Some files are missing. Please check the output above.║"
  echo "╚════════════════════════════════════════════════════════════╝"
  exit 1
fi

echo ""
echo "Current directory contents:"
ls -lh *.html *.js *.css *.json *.svg *.png 2>/dev/null
