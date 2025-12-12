// Desmos Transcriber - Embedded Calculator Version
// Initialize Desmos calculator
let calculator = null;

document.addEventListener('DOMContentLoaded', () => {
  const calculatorContainer = document.getElementById('calculatorContainer');
  const urlInput = document.getElementById('desmosUrlInput');
  const loadBtn = document.getElementById('loadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const status = document.getElementById('status');
  const controls = document.getElementById('controls');
  const equationsContainer = document.getElementById('equationsContainer');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  
  // Initialize Desmos Calculator
  console.log('Initializing Desmos calculator...');
  calculator = Desmos.GraphingCalculator(calculatorContainer, {
    expressionsCollapsed: false,
    settingsMenu: false,
    zoomButtons: true,
    expressions: true,
    keypad: true,
    graphpaper: true,
    showResetButtonOnGraphpaper: true
  });
  
  console.log('✅ Calculator initialized');
  
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
    
    // Extract graph ID from URL
    const match = url.match(/calculator\/([a-zA-Z0-9]+)/);
    if (!match) {
      showStatus('Could not extract graph ID from URL', 'error');
      return;
    }
    
    const graphId = match[1];
    showStatus('Loading graph...', 'info');
    
    try {
      // Fetch the graph state from Desmos API
      const response = await fetch(`https://www.desmos.com/calculator/${graphId}`);
      const html = await response.text();
      
      // Extract state from the HTML (it's embedded in a script tag)
      const stateMatch = html.match(/Calc\.setState\((\{.+?\})\);?/s);
      
      if (stateMatch) {
        const state = JSON.parse(stateMatch[1]);
        calculator.setState(state);
        showStatus('✅ Graph loaded successfully!', 'success');
        console.log('Loaded graph:', graphId);
      } else {
        showStatus('Could not load graph from URL', 'error');
      }
    } catch (error) {
      console.error('Error loading graph:', error);
      showStatus('Error loading graph: ' + error.message, 'error');
    }
  });
  
  // Clear calculator
  clearBtn.addEventListener('click', () => {
    calculator.setBlank();
    equationsContainer.innerHTML = '';
    controls.style.display = 'none';
    showStatus('Calculator cleared', 'info');
  });
  
  // Transcribe equations
  transcribeBtn.addEventListener('click', () => {
    showStatus('Extracting equations...', 'info');
    
    try {
      // Get current state from calculator
      const state = calculator.getState();
      
      if (!state || !state.expressions || !state.expressions.list) {
        showStatus('No equations found', 'error');
        return;
      }
      
      const list = state.expressions.list;
      console.log(`Found ${list.length} expressions`);
      
      if (list.length === 0) {
        showStatus('No equations in calculator', 'error');
        equationsContainer.innerHTML = '<div class=\"empty-state\">The calculator is empty. Add some equations first!</div>';
        return;
      }
      
      // Process equations
      const equations = [];
      list.forEach((expr, i) => {
        if (expr.type === 'folder') {
          equations.push({
            type: 'folder',
            title: expr.title || 'Folder',
            id: expr.id
          });
        } else if (expr.latex) {
          equations.push({
            type: 'equation',
            latex: expr.latex,
            color: expr.color || '#000000',
            folderId: expr.folderId || null
          });
        }
      });
      
      // Display transcribed equations
      displayEquations(equations);
      showStatus(`✅ Transcribed ${equations.length} items`, 'success');
      controls.style.display = 'flex';
      
    } catch (error) {
      console.error('Error transcribing:', error);
      showStatus('Error: ' + error.message, 'error');
    }
  });
  
  // Copy all equations
  copyAllBtn.addEventListener('click', () => {
    const text = equationsContainer.innerText;
    copyToClipboard(text);
    showStatus('✅ Copied to clipboard!', 'success');
  });
  
  // Download equations
  downloadBtn.addEventListener('click', () => {
    const text = equationsContainer.innerText;
    downloadAsText(text, 'desmos-equations.txt');
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
      copyBtn.onclick = () => {
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
  
  // Remove extra whitespace
  result = result.replace(/\s+/g, ' ');
  
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
  
  for (const [latex, unicode] of Object.entries(greekMap)) {
    result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode);
  }
  
  // Mathematical operators and symbols
  result = result.replace(/\\le(?:q)?/g, '≤');
  result = result.replace(/\\ge(?:q)?/g, '≥');
  result = result.replace(/\\ne(?:q)?/g, '≠');
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
  
  // Superscripts
  result = result.replace(/\^{([^}]+)}/g, (match, content) => {
    return toSuperscript(content);
  });
  
  // Subscripts
  result = result.replace(/_{([^}]+)}/g, (match, content) => {
    return toSubscript(content);
  });
  
  // Fractions
  result = result.replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1/$2)');
  
  // Square root
  result = result.replace(/\\sqrt{([^}]+)}/g, '√($1)');
  result = result.replace(/\\sqrt\[([^\]]+)\]{([^}]+)}/g, '$1√($2)');
  
  // Trig functions
  result = result.replace(/\\sin/g, 'sin');
  result = result.replace(/\\cos/g, 'cos');
  result = result.replace(/\\tan/g, 'tan');
  result = result.replace(/\\csc/g, 'csc');
  result = result.replace(/\\sec/g, 'sec');
  result = result.replace(/\\cot/g, 'cot');
  
  // Remove \left and \right
  result = result.replace(/\\left|\\right/g, '');
  
  // Clean up parentheses and brackets
  result = result.replace(/\\[()\[\]{}]/g, match => match.slice(1));
  
  // Piecewise functions
  if (result.includes('{') && result.includes(':')) {
    result = formatPiecewise(result);
  }
  
  // Vectors - convert (a,b,c) to ⟨a,b,c⟩ when it's clearly a vector
  result = result.replace(/\(([^)]+,[^)]+)\)/g, '⟨$1⟩');
  
  return result.trim();
}

// Format piecewise functions
function formatPiecewise(latex) {
  const match = latex.match(/\{(.+)\}/);
  if (!match) return latex;
  
  const content = match[1];
  const pieces = content.split(',').map(p => p.trim());
  
  if (pieces.length === 0) return latex;
  
  let result = 'f(x) = {\n';
  pieces.forEach(piece => {
    const parts = piece.split(':');
    if (parts.length === 2) {
      const condition = parts[0].trim();
      const value = parts[1].trim();
      result += `  ${transcribeLatex(value)}  when ${transcribeLatex(condition)}\n`;
    }
  });
  result += '}';
  
  return result;
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
