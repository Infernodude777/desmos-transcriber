// Load and display equations
document.addEventListener('DOMContentLoaded', async function() {
  const container = document.getElementById('equationsContainer');
  const sourceUrl = document.getElementById('sourceUrl');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const newExtractionBtn = document.getElementById('newExtractionBtn');
  const urlInputSection = document.getElementById('urlInputSection');
  const urlInput = document.getElementById('desmosUrlInput');
  const extractBtn = document.getElementById('extractBtn');
  const controls = document.getElementById('controls');
  
  // Handle new extraction button
  newExtractionBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['equations', 'sourceUrl', 'error']);
    location.reload();
  });
  
  // Handle extract button
  extractBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    
    if (!url) {
      showError('Please enter a Desmos URL');
      return;
    }
    
    if (!url.includes('desmos.com/calculator')) {
      showError('Invalid Desmos calculator URL');
      return;
    }
    
    urlInputSection.style.display = 'none';
    container.innerHTML = '<div class="loading">Opening Desmos page and extracting equations...</div>';
    
    try {
      // Send message to background script to extract from URL
      chrome.runtime.sendMessage({
        action: 'extractFromUrl',
        url: url
      }, async (response) => {
        if (chrome.runtime.lastError) {
          showError('Error communicating with extension: ' + chrome.runtime.lastError.message);
          urlInputSection.style.display = 'block';
        } else if (response && response.success) {
          // Wait a moment for storage to be updated
          await new Promise(resolve => setTimeout(resolve, 500));
          // Start progressive transcription
          startProgressiveTranscription();
        } else {
          showError(response?.error || 'Unknown error occurred');
          urlInputSection.style.display = 'block';
        }
      });
    } catch (error) {
      showError('Error: ' + error.message);
      urlInputSection.style.display = 'block';
    }
  });
  
  try {
    // Get stored equation data
    const data = await chrome.storage.local.get(['equations', 'sourceUrl', 'error', 'debugLog']);
    
    // Show debug log if available
    if (data.debugLog) {
      const debugPanel = document.getElementById('debugPanel');
      const debugLog = document.getElementById('debugLog');
      debugLog.textContent = data.debugLog;
      debugPanel.style.display = 'block';
    }
    
    // Check if there was an error during extraction
    if (data.error) {
      container.innerHTML = `
        <div class="empty-state error-state">
          <h2>⚠️ Error</h2>
          <p>${data.error}</p>
          <br>
          <p><strong>Tips:</strong></p>
          <ul style="text-align: left; display: inline-block;">
            <li>Make sure the Desmos page is fully loaded (wait 3-5 seconds)</li>
            <li>Try entering the URL below instead of clicking from the page</li>
            <li>Refresh the Desmos page and try again</li>
            <li>Check the browser console (F12) for more details</li>
          </ul>
        </div>
      `;
      
      urlInputSection.style.display = 'block';
      if (data.sourceUrl) {
        urlInput.value = data.sourceUrl;
      }
      
      // Clear the error for next time
      chrome.storage.local.remove(['error']);
      return;
    }
    
    if (!data.equations || data.equations.length === 0) {
      // Show input form
      urlInputSection.style.display = 'block';
      container.innerHTML = '<div class="empty-state"><p>Enter a Desmos calculator URL above to extract equations</p></div>';
      return;
    }
    
    // We have equations! Show them
    sourceUrl.textContent = `Source: ${data.sourceUrl || 'Unknown'}`;
    controls.style.display = 'flex';
    
    console.log('Processing equations:', data.equations);
    
    // Process and display equations
    const transcribedEquations = processEquations(data.equations);
    displayEquations(transcribedEquations);
    
    // Set up copy all button
    copyAllBtn.addEventListener('click', () => {
      const allText = transcribedEquations
        .map(eq => eq.text)
        .join('\n\n');
      copyToClipboard(allText);
      showNotification('All equations copied!');
    });
    
    // Set up download button
    downloadBtn.addEventListener('click', () => {
      const allText = transcribedEquations
        .map(eq => eq.text)
        .join('\n\n');
      downloadAsText(allText, 'desmos-equations.txt');
      showNotification('Downloaded!');
    });
    
  } catch (error) {
    console.error('Error loading equations:', error);
    container.innerHTML = `
      <div class="empty-state error-state">
        <h2>Error</h2>
        <p>${error.message}</p>
        <br>
        <p>Check the browser console for more details.</p>
      </div>
    `;
    urlInputSection.style.display = 'block';
  }
});

function showError(message) {
  const container = document.getElementById('equationsContainer');
  container.innerHTML = `
    <div class="empty-state error-state">
      <h2>⚠️ Error</h2>
      <p>${message}</p>
    </div>
  `;
}

function processEquations(equations) {
  const processed = [];
  const folderMap = new Map(); // Track folders by ID
  
  // First pass - identify all folders
  equations.forEach(eq => {
    if (eq.type === 'folder') {
      folderMap.set(eq.id, eq);
    }
  });
  
  console.log('Found folders:', folderMap);
  
  // Second pass - process all equations
  equations.forEach(eq => {
    if (eq.type === 'folder') {
      processed.push({
        type: 'folder',
        text: `📁 ${eq.title}`,
        raw: eq
      });
    } else if (eq.latex) {
      const transcribed = transcribeLatex(eq.latex);
      const inFolder = eq.folderId && folderMap.has(eq.folderId);
      
      console.log('Processing equation:', eq.latex, '-> inFolder:', inFolder, 'folderId:', eq.folderId);
      
      processed.push({
        type: 'equation',
        text: transcribed,
        raw: eq,
        inFolder: inFolder
      });
    }
  });
  
  console.log('Processed equations:', processed);
  return processed;
}

function transcribeLatex(latex) {
  if (!latex) return '';
  
  let result = latex;
  
  // Handle piecewise functions
  // Format: f\left(x\right)=\left\{condition:value,condition:value\right\}
  result = result.replace(
    /([^=]+)=\\left\\{([^}]+)\\right\\}/g,
    (match, funcPart, piecewise) => {
      // Clean up the function part
      funcPart = cleanLatex(funcPart);
      
      // Split the piecewise conditions
      const pieces = piecewise.split(',').map(p => p.trim());
      const formattedPieces = pieces.map(piece => {
        const [condition, value] = piece.split(':').map(p => cleanLatex(p.trim()));
        return `    ${value} when ${condition}`;
      });
      
      return `${funcPart} = {\n${formattedPieces.join('\n')}\n}`;
    }
  );
  
  // Handle vectors - replace parentheses with angle brackets for vectors
  // Pattern: \left(a,b,c\right) or similar
  result = result.replace(
    /\\left\(([^)]+)\)\\right\)/g,
    (match, content) => {
      // Check if it looks like a vector (has commas)
      if (content.includes(',')) {
        const components = content.split(',').map(c => cleanLatex(c.trim()));
        return `⟨${components.join(', ')}⟩`;
      }
      return `(${cleanLatex(content)})`;
    }
  );
  
  // Clean up remaining LaTeX
  result = cleanLatex(result);
  
  return result;
}

function cleanLatex(latex) {
  let result = latex;
  
  // Remove \left and \right
  result = result.replace(/\\left|\\right/g, '');
  
  // Replace common LaTeX commands
  result = result.replace(/\\cdot/g, '·');
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\\pm/g, '±');
  result = result.replace(/\\le/g, '≤');
  result = result.replace(/\\ge/g, '≥');
  result = result.replace(/\\ne/g, '≠');
  result = result.replace(/\\approx/g, '≈');
  result = result.replace(/\\infty/g, '∞');
  result = result.replace(/\\pi/g, 'π');
  result = result.replace(/\\theta/g, 'θ');
  result = result.replace(/\\alpha/g, 'α');
  result = result.replace(/\\beta/g, 'β');
  result = result.replace(/\\gamma/g, 'γ');
  result = result.replace(/\\delta/g, 'δ');
  result = result.replace(/\\epsilon/g, 'ε');
  result = result.replace(/\\lambda/g, 'λ');
  result = result.replace(/\\mu/g, 'μ');
  result = result.replace(/\\sigma/g, 'σ');
  result = result.replace(/\\Sigma/g, 'Σ');
  result = result.replace(/\\omega/g, 'ω');
  result = result.replace(/\\Omega/g, 'Ω');
  
  // Handle fractions \frac{a}{b} -> a/b or (a)/(b) for complex expressions
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (match, num, den) => {
    const numerator = cleanLatex(num);
    const denominator = cleanLatex(den);
    
    // Use parentheses if expressions are complex
    if (num.length > 3 || den.length > 3) {
      return `(${numerator})/(${denominator})`;
    }
    return `${numerator}/${denominator}`;
  });
  
  // Handle square roots \sqrt{x} -> √(x)
  result = result.replace(/\\sqrt\{([^}]+)\}/g, (match, content) => {
    return `√(${cleanLatex(content)})`;
  });
  
  // Handle nth roots \sqrt[n]{x} -> ⁿ√(x)
  result = result.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, (match, n, content) => {
    return `${superscript(n)}√(${cleanLatex(content)})`;
  });
  
  // Handle superscripts ^{x} -> use Unicode superscripts where possible
  result = result.replace(/\^\\?\{([^}]+)\}/g, (match, exp) => {
    return `^(${cleanLatex(exp)})`;
  });
  
  // Handle simple superscripts ^x
  result = result.replace(/\^([a-zA-Z0-9])/g, (match, exp) => {
    const sup = superscript(exp);
    return sup !== exp ? sup : `^${exp}`;
  });
  
  // Handle subscripts _{x}
  result = result.replace(/_\\?\{([^}]+)\}/g, (match, sub) => {
    return `_(${cleanLatex(sub)})`;
  });
  
  // Handle simple subscripts _x
  result = result.replace(/_([a-zA-Z0-9])/g, (match, sub) => {
    const subscr = subscript(sub);
    return subscr !== sub ? subscr : `_${sub}`;
  });
  
  // Handle absolute value |x|
  result = result.replace(/\\left\|([^|]+)\\right\|/g, '|$1|');
  
  // Handle integrals
  result = result.replace(/\\int/g, '∫');
  result = result.replace(/\\sum/g, '∑');
  result = result.replace(/\\prod/g, '∏');
  
  // Handle limits
  result = result.replace(/\\lim/g, 'lim');
  
  // Handle trigonometric functions
  result = result.replace(/\\sin/g, 'sin');
  result = result.replace(/\\cos/g, 'cos');
  result = result.replace(/\\tan/g, 'tan');
  result = result.replace(/\\sec/g, 'sec');
  result = result.replace(/\\csc/g, 'csc');
  result = result.replace(/\\cot/g, 'cot');
  
  // Handle logarithms
  result = result.replace(/\\log/g, 'log');
  result = result.replace(/\\ln/g, 'ln');
  
  // Clean up extra backslashes and braces
  result = result.replace(/\\/g, '');
  result = result.replace(/[{}]/g, '');
  
  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

function superscript(text) {
  const superscripts = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ'
  };
  return text.split('').map(c => superscripts[c] || c).join('');
}

function subscript(text) {
  const subscripts = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎'
  };
  return text.split('').map(c => subscripts[c] || c).join('');
}

function displayEquations(equations) {
  const container = document.getElementById('equationsContainer');
  container.innerHTML = '';
  
  equations.forEach((eq, index) => {
    const div = document.createElement('div');
    div.className = 'equation-item';
    
    if (eq.type === 'folder') {
      div.classList.add('folder');
      div.innerHTML = `<div class="equation-text">${eq.text}</div>`;
    } else {
      if (eq.inFolder) {
        div.classList.add('in-folder');
      }
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'equation-content';
      
      const textDiv = document.createElement('div');
      textDiv.className = 'equation-text';
      textDiv.textContent = eq.text;
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.onclick = () => {
        copyToClipboard(eq.text);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      };
      
      contentDiv.appendChild(textDiv);
      contentDiv.appendChild(copyBtn);
      div.appendChild(contentDiv);
    }
    
    container.appendChild(div);
  });
}

function showEmptyState() {
  const container = document.getElementById('equationsContainer');
  container.innerHTML = `
    <div class="empty-state">
      <h2>No Equations Found</h2>
      <p>Please make sure the Desmos calculator has some equations.</p>
    </div>
  `;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function downloadAsText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}

// Progressive transcription - process equations one by one with live updates
async function startProgressiveTranscription() {
  const container = document.getElementById('equationsContainer');
  const progressSection = document.getElementById('progressSection');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressStatus = document.getElementById('progressStatus');
  const controls = document.getElementById('controls');
  const sourceUrl = document.getElementById('sourceUrl');
  
  try {
    // Get the equations from storage
    const data = await chrome.storage.local.get(['equations', 'sourceUrl', 'debugLog']);
    
    if (!data.equations || data.equations.length === 0) {
      showError('No equations found to transcribe');
      return;
    }
    
    const equations = data.equations;
    const totalCount = equations.length;
    
    // Show progress section
    progressSection.style.display = 'block';
    container.innerHTML = '';
    sourceUrl.textContent = `Source: ${data.sourceUrl || 'Unknown'}`;
    
    // Process folders first for folder map
    const folderMap = new Map();
    equations.forEach(eq => {
      if (eq.type === 'folder') {
        folderMap.set(eq.id, eq);
      }
    });
    
    // Process each equation one by one
    for (let i = 0; i < equations.length; i++) {
      const eq = equations[i];
      const progress = Math.round(((i + 1) / totalCount) * 100);
      
      // Update progress bar
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${progress}%`;
      
      // Update status message
      if (eq.type === 'folder') {
        progressStatus.textContent = `Processing folder "${eq.title}" (${i + 1}/${totalCount})`;
      } else {
        const previewText = eq.latex ? eq.latex.substring(0, 30) : 'equation';
        progressStatus.textContent = `Transcribing equation ${i + 1}/${totalCount}: ${previewText}...`;
      }
      
      // Create and display the transcribed item immediately
      if (eq.type === 'folder') {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'equation-folder';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'equation-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'equation-text';
        textDiv.textContent = `📁 ${eq.title}`;
        
        contentDiv.appendChild(textDiv);
        folderDiv.appendChild(contentDiv);
        container.appendChild(folderDiv);
      } else if (eq.latex) {
        const transcribed = transcribeLatex(eq.latex);
        const inFolder = eq.folderId && folderMap.has(eq.folderId);
        
        const div = document.createElement('div');
        div.className = inFolder ? 'equation-item in-folder' : 'equation-item';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'equation-content';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'equation-text';
        textDiv.textContent = transcribed;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = '📋 Copy';
        copyBtn.onclick = () => {
          copyToClipboard(transcribed);
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy';
          }, 2000);
        };
        
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(copyBtn);
        div.appendChild(contentDiv);
        container.appendChild(div);
      }
      
      // Small delay to show progress (like ChatGPT Bulk Delete does)
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Hide progress, show controls
    progressSection.style.display = 'none';
    controls.style.display = 'flex';
    
    // Set up copy all button
    const copyAllBtn = document.getElementById('copyAllBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Process all equations for copy/download
    const transcribedEquations = equations.map(eq => {
      if (eq.type === 'folder') {
        return `📁 ${eq.title}`;
      } else if (eq.latex) {
        return transcribeLatex(eq.latex);
      }
      return '';
    }).filter(t => t);
    
    copyAllBtn.onclick = () => {
      const allText = transcribedEquations.join('\n\n');
      copyToClipboard(allText);
      showNotification('All equations copied!');
    };
    
    downloadBtn.onclick = () => {
      const allText = transcribedEquations.join('\n\n');
      downloadAsText(allText, 'desmos-equations.txt');
      showNotification('Downloaded!');
    };
    
    showNotification(`✓ Transcribed ${totalCount} items successfully!`);
    
  } catch (error) {
    console.error('Error in progressive transcription:', error);
    progressSection.style.display = 'none';
    showError('Error during transcription: ' + error.message);
  }
}
