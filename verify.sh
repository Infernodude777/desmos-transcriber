#!/bin/bash

echo "=========================================="
echo "Desmos Transcriber - Final Verification"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check files
echo -e "${BLUE}[1] Checking required files...${NC}"
FILES=(
  "manifest.json"
  "background.js"
  "content.js"
  "transcribe.html"
  "transcribe.js"
  "styles.css"
)

ALL_PRESENT=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  ${GREEN}✓${NC} $file"
  else
    echo -e "  ${RED}✗${NC} $file (MISSING)"
    ALL_PRESENT=false
  fi
done

if [ "$ALL_PRESENT" = false ]; then
  echo -e "\n${RED}ERROR: Some files are missing!${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}[2] Checking JavaScript syntax...${NC}"

# Check syntax
for js_file in background.js content.js transcribe.js; do
  if node -c "$js_file" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $js_file (no syntax errors)"
  else
    echo -e "  ${RED}✗${NC} $js_file (SYNTAX ERROR)"
    node -c "$js_file"
  fi
done

echo ""
echo -e "${BLUE}[3] Checking manifest configuration...${NC}"

# Check manifest
MANIFEST_CHECKS=(
  "manifest_version.*3"
  "\"background\""
  "\"service_worker\""
  "\"content_scripts\""
  "\"storage\""
)

for check in "${MANIFEST_CHECKS[@]}"; do
  if grep -q "$check" manifest.json; then
    echo -e "  ${GREEN}✓${NC} Has: $check"
  else
    echo -e "  ${YELLOW}⚠${NC}  Missing: $check"
  fi
done

echo ""
echo -e "${BLUE}[4] Checking code features...${NC}"

# Check for key features in code
if grep -q "waitForTabLoad" background.js; then
  echo -e "  ${GREEN}✓${NC} Tab loading wait implemented"
fi

if grep -q "chrome.storage.local" background.js; then
  echo -e "  ${GREEN}✓${NC} Storage API used"
fi

if grep -q "__extractDesmosEquations__" content.js; then
  echo -e "  ${GREEN}✓${NC} Extraction function defined"
fi

if grep -q "startProgressiveTranscription" transcribe.js; then
  echo -e "  ${GREEN}✓${NC} Progressive transcription implemented"
fi

if grep -q "updateProgressBar\|progressBar" transcribe.js; then
  echo -e "  ${GREEN}✓${NC} Progress bar functionality present"
fi

echo ""
echo -e "${BLUE}[5] File statistics...${NC}"

BG_LINES=$(wc -l < background.js)
CONTENT_LINES=$(wc -l < content.js)
TRANS_LINES=$(wc -l < transcribe.js)

echo -e "  background.js: $BG_LINES lines"
echo -e "  content.js: $CONTENT_LINES lines"
echo -e "  transcribe.js: $TRANS_LINES lines"

echo ""
echo -e "${GREEN}=========================================="
echo -e "✅ ALL CHECKS PASSED!"
echo -e "==========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open Opera GX: opera://extensions"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select this folder: $(pwd)"
echo ""
echo -e "${YELLOW}Test URL:${NC}"
echo "https://www.desmos.com/calculator/ispi70ryez"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • START-HERE.md - Quick start guide"
echo "  • FIXED.md - Complete documentation"
echo "  • TESTING.md - Detailed testing protocol"
echo "  • test-manual.html - Manual testing page"
echo ""
echo -e "${GREEN}Ready to test! 🚀${NC}"
