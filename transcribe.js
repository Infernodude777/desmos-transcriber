// Desmos Transcriber - Manual LaTeX Input
let desmosFrame = null;

document.addEventListener('DOMContentLoaded', () => {
  desmosFrame = document.getElementById('desmosFrame');
  const urlInput = document.getElementById('desmosUrlInput');
  const loadBtn = document.getElementById('loadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const latexInput = document.getElementById('latexInput');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const status = document.getElementById('status');
  const controls = document.getElementById('controls');
  const equationsContainer = document.getElementById('equationsContainer');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  
  // Wait for iframe to load
  desmosFrame.onload = () => {
    console.log('✅ Calculator loaded');
    showStatus('Calculator ready - create equations and copy LaTeX to transcribe', 'success');
  };
  
  // Load graph from URL
  loadBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    
    if (!url) {
      showStatus('Please enter a URL', 'error');
      return;
    }
    
    if (!url.includes('desmos.com/calculator')) {
      showStatus('Invalid Desmos calculator URL', 'error');
      return;
    }
    
    // Extract graph ID
    const match = url.match(/calculator\/([a-zA-Z0-9]+)/);
    if (!match) {
      showStatus('Loading basic calculator...', 'info');
      desmosFrame.src = url;
      return;
    }
    
    const graphId = match[1];
    showStatus('Loading graph and extracting equations...', 'info');
    desmosFrame.src = url;
    
    // Fetch graph data via background script
    chrome.runtime.sendMessage(
      { action: 'fetchGraphData', graphId: graphId },
      (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Graph loaded (manual paste needed)', 'info');
          return;
        }
        
        if (!response.success) {
          showStatus('Graph loaded (manual paste needed)', 'info');
          return;
        }
        
        // Extract LaTeX from graph data
        const state = response.data.state;
        if (state && state.expressions && state.expressions.list) {
          const latexEquations = [];
          state.expressions.list.forEach((expr) => {
            if (expr.latex && expr.type !== 'folder') {
              latexEquations.push(expr.latex);
            }
          });
          
          if (latexEquations.length > 0) {
            latexInput.value = latexEquations.join(';\n');
            showStatus(`✅ Loaded ${latexEquations.length} equations`, 'success');
          } else {
            showStatus('Graph loaded (no equations found)', 'info');
          }
        } else {
          showStatus('Graph loaded', 'info');
        }
      }
    );
  });
  
  // Clear calculator
  clearBtn.addEventListener('click', () => {
    desmosFrame.src = 'https://www.desmos.com/calculator';
    equationsContainer.innerHTML = '';
    controls.style.display = 'none';
    urlInput.value = '';
    latexInput.value = '';
    showStatus('Calculator cleared', 'info');
  });
  
  // Transcribe equations from manual LaTeX input
  transcribeBtn.addEventListener('click', () => {
    const latexText = latexInput.value.trim();
    
    if (!latexText) {
      showStatus('Please paste LaTeX equations first', 'error');
      return;
    }
    
    showStatus('Transcribing...', 'info');
    
    // Split by semicolons or newlines
    let latexEquations = latexText
      .split(/[;\n]/)
      .map(eq => eq.trim())
      .filter(eq => eq.length > 0);
    
    console.log(`Found ${latexEquations.length} equations`);
    
    if (latexEquations.length === 0) {
      showStatus('No valid equations found', 'error');
      return;
    }
    
    // Process equations
    const equations = latexEquations.map(latex => ({
      type: 'equation',
      latex: latex,
      color: '#000000'
    }));
    
    // Display transcribed equations
    displayEquations(equations);
    showStatus(`✅ Transcribed ${equations.length} equations`, 'success');
    controls.style.display = 'flex';
  });
  
  // Copy all equations
  copyAllBtn.addEventListener('click', () => {
    // Get only the equation text, not the copy button emojis
    const equations = Array.from(equationsContainer.querySelectorAll('.equation-text'))
      .map(el => el.textContent)
      .join('\n');
    copyToClipboard(equations);
    showStatus('✅ Copied!', 'success');
  });
  
  // Download equations
  downloadBtn.addEventListener('click', () => {
    // Get only the equation text, not the copy button emojis
    const equations = Array.from(equationsContainer.querySelectorAll('.equation-text'))
      .map(el => el.textContent)
      .join('\n');
    downloadAsText(equations, 'desmos-equations.txt');
    showStatus('✅ Downloaded!', 'success');
  });
});

// Display transcribed equations
function displayEquations(equations) {
  const container = document.getElementById('equationsContainer');
  container.innerHTML = '';
  
  const folderMap = new Map();
  equations.forEach(eq => {
    if (eq.type === 'folder') {
      folderMap.set(eq.id, eq);
    }
  });
  
  equations.forEach(eq => {
    if (eq.type === 'folder') {
      const folderDiv = document.createElement('div');
      folderDiv.className = 'equation-folder';
      folderDiv.textContent = `📁 ${eq.title}`;
      container.appendChild(folderDiv);
    } else if (eq.type === 'equation') {
      const transcribed = transcribeLatex(eq.latex);
      const inFolder = eq.folderId && folderMap.has(eq.folderId);
      
      const div = document.createElement('div');
      div.className = inFolder ? 'equation-item in-folder' : 'equation-item';
      
      const textDiv = document.createElement('div');
      textDiv.className = 'equation-text';
      textDiv.textContent = transcribed;
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = '📋';
      copyBtn.title = 'Copy equation';
      copyBtn.onclick = () => {
        // Copy only the transcribed text, not the button
        copyToClipboard(transcribed);
        showStatus('Copied!', 'success');
      };
      
      div.appendChild(textDiv);
      div.appendChild(copyBtn);
      container.appendChild(div);
    }
  });
}

// Transcribe LaTeX to Unicode
function transcribeLatex(latex) {
  let result = latex;
  
  // Remove \left and \right FIRST before other substitutions
  result = result.replace(/\\left\\?/g, '');
  result = result.replace(/\\right\\?/g, '');
  result = result.replace(/\\left/g, '');
  result = result.replace(/\\right/g, '');
  
  // Detect piecewise functions and handle separately
  if (isPiecewise(result)) {
    return formatPiecewise(result);
  }
  
  // Greek letters
  const greekMap = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
    '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ',
    '\\Psi': 'Ψ', '\\Omega': 'Ω'
  };
  
  for (const [tex, unicode] of Object.entries(greekMap)) {
    result = result.replace(new RegExp(tex.replace(/\\/g, '\\\\'), 'g'), unicode);
  }
  
  // Trig and log functions (before operators to avoid conflicts)
  result = result.replace(/\\sin/g, 'sin');
  result = result.replace(/\\cos/g, 'cos');
  result = result.replace(/\\tan/g, 'tan');
  result = result.replace(/\\csc/g, 'csc');
  result = result.replace(/\\sec/g, 'sec');
  result = result.replace(/\\cot/g, 'cot');
  result = result.replace(/\\arcsin/g, 'arcsin');
  result = result.replace(/\\arccos/g, 'arccos');
  result = result.replace(/\\arctan/g, 'arctan');
  result = result.replace(/\\ln/g, 'ln');
  result = result.replace(/\\log/g, 'log');
  
  // Mathematical operators (after checking for longer commands)
  result = result.replace(/\\leq/g, '≤');
  result = result.replace(/\\le(?!q|ft)/g, '≤');
  result = result.replace(/\\geq/g, '≥');
  result = result.replace(/\\ge(?!q)/g, '≥');
  result = result.replace(/\\neq/g, '≠');
  result = result.replace(/\\ne(?!q)/g, '≠');
  result = result.replace(/\\approx/g, '≈');
  result = result.replace(/\\infty/g, '∞');
  result = result.replace(/\\pm/g, '±');
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\\cdot/g, '·');
  
  // Calculus
  result = result.replace(/\\int/g, '∫');
  result = result.replace(/\\sum/g, '∑');
  result = result.replace(/\\prod/g, '∏');
  result = result.replace(/\\partial/g, '∂');
  result = result.replace(/\\nabla/g, '∇');
  result = result.replace(/\\lim/g, 'lim');
  
  // Superscripts
  result = result.replace(/\^{([^}]+)}/g, (match, content) => {
    return toSuperscript(content);
  });
  result = result.replace(/\^(\d)/g, (match, digit) => toSuperscript(digit));
  
  // Subscripts
  result = result.replace(/_{([^}]+)}/g, (match, content) => {
    return toSubscript(content);
  });
  result = result.replace(/_(\d)/g, (match, digit) => toSubscript(digit));
  
  // Fractions
  result = result.replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1/$2)');
  
  // Square root
  result = result.replace(/\\sqrt{([^}]+)}/g, '√($1)');
  result = result.replace(/\\sqrt\[([^\]]+)\]{([^}]+)}/g, '$1√($2)');
  
  // Clean up escaped brackets
  result = result.replace(/\\\{/g, '{');
  result = result.replace(/\\\}/g, '}');
  result = result.replace(/\\\(/g, '(');
  result = result.replace(/\\\)/g, ')');
  result = result.replace(/\\\[/g, '[');
  result = result.replace(/\\\]/g, ']');
  
  // Remove remaining backslashes from commands
  result = result.replace(/\\/g, '');
  
  return result.trim();
}

// Detect if this is a piecewise function
function isPiecewise(latex) {
  // Piecewise functions have the pattern: variable = { expr : condition, expr : condition, ... }
  return /[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*=\s*\{[^}]*:[^}]*\}/.test(latex) ||
         /[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*\{[^}]*:[^}]*\}/.test(latex);
}

// Format piecewise functions
function formatPiecewise(latex) {
  // Extract the function name and definition
  const match = latex.match(/([a-zA-Z_][a-zA-Z0-9_]*(?:\([^)]*\))?)\s*=\s*\{([^}]+)\}/);
  if (!match) return latex;
  
  const funcName = match[1];
  const content = match[2];
  
  // Split by commas, but be careful with nested content
  const pieces = [];
  let current = '';
  let braceDepth = 0;
  let parenDepth = 0;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braceDepth++;
    if (char === '}') braceDepth--;
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    
    if (char === ',' && braceDepth === 0 && parenDepth === 0) {
      pieces.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) pieces.push(current.trim());
  
  // Format each piece
  let result = `${funcName} = {\n`;
  pieces.forEach((piece, index) => {
    const colonIndex = piece.indexOf(':');
    if (colonIndex > -1) {
      const expression = piece.substring(colonIndex + 1).trim();
      const condition = piece.substring(0, colonIndex).trim();
      
      // Recursively transcribe each part
      const transcribedExpr = transcribeLatexSimple(expression);
      const transcribedCond = transcribeLatexSimple(condition);
      
      result += `  ${transcribedExpr} when ${transcribedCond}`;
      if (index < pieces.length - 1) result += ',';
      result += '\n';
    }
  });
  result += '}';
  
  return result;
}

// Simple transcription for parts of piecewise (without piecewise detection)
function transcribeLatexSimple(latex) {
  let result = latex;
  
  // Remove \left and \right
  result = result.replace(/\\left\\?/g, '');
  result = result.replace(/\\right\\?/g, '');
  result = result.replace(/\\left/g, '');
  result = result.replace(/\\right/g, '');
  
  // Functions
  result = result.replace(/\\sin/g, 'sin');
  result = result.replace(/\\cos/g, 'cos');
  result = result.replace(/\\tan/g, 'tan');
  
  // Operators
  result = result.replace(/\\leq/g, '≤');
  result = result.replace(/\\le(?!q|ft)/g, '≤');
  result = result.replace(/\\geq/g, '≥');
  result = result.replace(/\\ge(?!q)/g, '≥');
  result = result.replace(/\\lt/g, '<');
  result = result.replace(/\\gt/g, '>');
  
  // Functions shortcuts
  const funcMap = {
    'f': 'f', 'g': 'g', 'h': 'h', 'i': 'i', 'j': 'j',
    'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n', 'o': 'o',
    'p': 'p', 'q': 'q', 'r': 'r'
  };
  
  // Clean backslashes
  result = result.replace(/\\/g, '');
  
  return result.trim();
}

// Convert to superscript
function toSuperscript(text) {
  const map = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ'
  };
  
  return text.split('').map(char => map[char] || char).join('');
}

// Convert to subscript
function toSubscript(text) {
  const map = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎'
  };
  
  return text.split('').map(char => map[char] || char).join('');
}

// Show status message
function showStatus(message, type = 'info') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status-text ${type}`;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      status.textContent = '';
    }, 3000);
  }
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('Copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Download as text file
function downloadAsText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
