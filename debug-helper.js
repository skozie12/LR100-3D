/**
 * Debug helper functions for LR100-3D project
 * Include this script in your HTML to get enhanced debugging capabilities
 */

// Enable more detailed console error reporting
window.addEventListener('error', function(event) {
  console.error('Script error detected:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Check if Three.js is loaded properly
function checkThreeJsStatus() {
  console.log('Checking Three.js status...');
  if (typeof THREE === 'undefined') {
    console.error('THREE is not defined. Check your import statements and module loading.');
    return false;
  }
  console.log('Three.js version:', THREE.REVISION);
  return true;
}

// Check if DOM elements exist
function checkDomElements() {
  const elements = [
    'lr100-canvas',
    'canvas-overlay',
    'playBtn',
    'pauseBtn',
    'price-display',
    'reelStandSelect',
    'counterSelect',
    'coilerSelect',
    'cutterSelect'
  ];
  
  console.log('Checking DOM elements...');
  let allFound = true;
  
  elements.forEach(id => {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with ID "${id}" not found in the DOM`);
      allFound = false;
    }
  });
  
  if (allFound) {
    console.log('All required DOM elements found.');
  }
  
  return allFound;
}

// Add to window for access in console
window.debugLR100 = {
  checkThreeJsStatus,
  checkDomElements,
  
  // Force redraw function
  forceRedraw: () => {
    if (window.renderer && window.scene && window.camera) {
      console.log('Forcing redraw...');
      window.renderer.render(window.scene, window.camera);
      return true;
    }
    console.error('Renderer, scene, or camera not available globally.');
    return false;
  }
};

// Auto-run checks when script loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Running LR100-3D debug checks...');
  checkDomElements();
  
  // Wait a bit for scripts to load before checking Three.js
  setTimeout(checkThreeJsStatus, 500);
  
  console.log('Debug helper loaded. Access debugging tools via window.debugLR100 in console.');
});
