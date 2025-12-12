#!/bin/bash

# Test script for Desmos Transcriber

echo "=========================================="
echo "Desmos Transcriber - Installation Test"
echo "=========================================="
echo ""

echo "Checking for required files..."
echo ""

files_ok=true

# Core extension files
if [ -f "manifest.json" ]; then
    echo "✓ manifest.json"
else
    echo "✗ manifest.json MISSING"
    files_ok=false
fi

if [ -f "background.js" ]; then
    echo "✓ background.js"
else
    echo "✗ background.js MISSING"
    files_ok=false
fi

if [ -f "content.js" ]; then
    echo "✓ content.js"
else
    echo "✗ content.js MISSING"
    files_ok=false
fi

if [ -f "transcribe.html" ]; then
    echo "✓ transcribe.html"
else
    echo "✗ transcribe.html MISSING"
    files_ok=false
fi

if [ -f "transcribe.js" ]; then
    echo "✓ transcribe.js"
else
    echo "✗ transcribe.js MISSING"
    files_ok=false
fi

if [ -f "styles.css" ]; then
    echo "✓ styles.css"
else
    echo "✗ styles.css MISSING"
    files_ok=false
fi

echo ""

if [ "$files_ok" = true ]; then
    echo "=========================================="
    echo "✅ ALL FILES PRESENT"
    echo "=========================================="
    echo ""
    echo "To install in Opera GX:"
    echo "1. Go to: opera://extensions"
    echo "2. Enable 'Developer mode'"
    echo "3. Click 'Load unpacked'"
    echo "4. Select folder: $(pwd)"
    echo ""
    echo "To test:"
    echo "1. Go to: https://www.desmos.com/calculator/ispi70ryez"
    echo "2. Wait 3-5 seconds for page to load"
    echo "3. Click extension icon"
    echo "   OR"
    echo "4. Click extension from any page and enter the URL"
    echo ""
    echo "Recent changes:"
    echo "- Removed KaTeX (fixes CSP errors)"
    echo "- Improved console logging"
    echo "- Added URL input feature"
else
    echo "=========================================="
    echo "❌ SOME FILES MISSING"
    echo "=========================================="
    exit 1
fi
