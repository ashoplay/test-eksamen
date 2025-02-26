// Debug helper functions
function toggleDebug() {
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
      debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  function logDebugInfo(message, data) {
    console.log(message, data);
    
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
      const timestamp = new Date().toLocaleTimeString();
      let content = `<p><strong>${timestamp} - ${message}</strong></p>`;
      
      if (data) {
        content += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      }
      
      debugContent.innerHTML += content;
    }
  }
  
  // Add debug keyboard shortcut
  document.addEventListener('keydown', function(e) {
    // Ctrl+Shift+D to toggle debug info
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      toggleDebug();
    }
  });
  
  // Expose debug functions to window
  window.debugHelpers = {
    toggleDebug,
    logDebugInfo
  };
  
  // Add this script to the page
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Debug tools loaded. Press Ctrl+Shift+D to toggle debug panel.');
    
    // Adding debug button to page
    const footer = document.querySelector('footer');
    if (footer) {
      const debugButton = document.createElement('button');
      debugButton.className = 'btn btn-secondary';
      debugButton.style.position = 'fixed';
      debugButton.style.bottom = '10px';
      debugButton.style.right = '10px';
      debugButton.style.opacity = '0.7';
      debugButton.innerHTML = 'Debug';
      debugButton.addEventListener('click', toggleDebug);
      document.body.appendChild(debugButton);
    }
    
    // Add specific debug for reinsdyr loading
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const result = await originalFetch.apply(this, args);
      
      // Clone the response so we can read it and still return the original
      const clone = result.clone();
      
      // Only log specific API calls we're interested in
      if (args[0] && typeof args[0] === 'string' && args[0].includes('/api/reinsdyr')) {
        try {
          const data = await clone.json();
          logDebugInfo(`API Call: ${args[0]}`, data);
        } catch (error) {
          logDebugInfo(`Error parsing API response from ${args[0]}`, error);
        }
      }
      
      return result;
    };
  });