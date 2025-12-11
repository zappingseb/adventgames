/**
 * Puzzle Wrapper
 * Loads and adapts the original puzzle.js to work with our React app
 */

let puzzleLoaded = false;
let puzzleInitialized = false;

// Expose puzzle functions globally so puzzle.js can access them
window.initPuzzleGame = function(imageUrl, rows, cols, onComplete) {
  if (!window.Kinetic) {
    throw new Error('Kinetic.js not loaded');
  }

  // Set up the puzzle state that puzzle.js expects
  // We'll override the loadPuzzle function to use our image
  window.g_own_image = imageUrl;
  window.g_sliderPos = 0; // Use "own image" mode
  window.g_rows = rows;
  window.g_cols = cols;
  window.g_ready = false;
  window.g_buildPuzzle = false;
  window.g_set = 0;
  window.puzzleOnComplete = onComplete;

  // Set canvas dimensions
  const container = document.getElementById('container');
  if (container) {
    window.g_windows_width = container.clientWidth || window.innerWidth - 40;
    window.g_windows_height = container.clientHeight || window.innerHeight - 200;
    window.g_canvas_width = window.g_windows_width;
    window.g_canvas_height = window.g_windows_height;
    
    container.width = window.g_windows_width;
    container.height = window.g_windows_height;
  }

  // Call the original loadPuzzle function
  if (window.loadPuzzle) {
    window.loadPuzzle();
  }
};

// Load puzzle.js script
export function loadPuzzleScript() {
  return new Promise((resolve, reject) => {
    if (puzzleLoaded) {
      resolve();
      return;
    }

    // Load dependencies first
    const scripts = [
      '/puzzle/kinetic-v4.7.4.min.js',
      '/puzzle/exif.js',
      '/puzzle/l10n.js',
      '/puzzle/swipe.js',
    ];

    let loadedCount = 0;
    const totalScripts = scripts.length;

    scripts.forEach((src) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === totalScripts) {
          // Now load puzzle.js
          loadPuzzleJs(resolve, reject);
        }
      };
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    });
  });
}

function loadPuzzleJs(resolve, reject) {
  // Load the puzzle-original.js (which has all the fixes)
  const script = document.createElement('script');
  script.src = '/puzzle/puzzle-original.js';
  script.onload = () => {
    adaptPuzzleJs();
    puzzleLoaded = true;
    resolve();
  };
  script.onerror = () => {
    reject(new Error('Failed to load puzzle-original.js'));
  };
  document.head.appendChild(script);
}

function adaptPuzzleJs() {
  // Mock webL10n if not available (puzzle-original.js expects it)
  if (!window.document || !window.document.webL10n) {
    window.document = window.document || {};
    window.document.webL10n = {
      ready: function(cb) { if (cb) cb(); },
      get: function(key) { return key; },
      getLanguage: function() { return 'en'; },
      setLanguage: function(lang) {}
    };
  }

  // Override the back function to call our onComplete callback
  if (window.back) {
    const originalBack = window.back;
    window.back = function(success) {
      if (success && window.puzzleOnComplete) {
        // Pass final score instead of time
        const finalScore = window.puzzleFinalScore || 0;
        window.puzzleOnComplete(finalScore);
      }
      // Don't call original back - we handle navigation ourselves
    };
  }

  // Override displayPuzzle to track start time and log when pieces are spread
  if (window.displayPuzzle) {
    const originalDisplayPuzzle = window.displayPuzzle;
    window.displayPuzzle = function() {
      window.puzzleStartTime = Date.now();
      originalDisplayPuzzle.apply(this, arguments);
      // Log after pieces are spread (displayPuzzle has a setTimeout of 2000ms, so we wait a bit longer)
      setTimeout(() => {
        // Trigger callback to start score timer
        if (window.puzzleOnStart) {
          window.puzzleOnStart();
        }
      }, 2500);
    };
  }

  // Note: puzzle-original.js already has logging for:
  // - "Puzzle app loaded" (in window.onload)
  // - "Puzzle level correctly chosen" (in easyClick/mediumClick/hardClick)
  // - "Puzzle image correctly loaded" (in loadPuzzle)
  // - "Puzzle image correctly split into pieces" (in buildPuzzle)
  // - "pieces are draggable" (in drawPiece_2 dragend handler)
  
  // We just need to ensure the monitoring works for the React version
  // The puzzle-original.js already logs these, so we don't need to duplicate
}

// Initialize puzzle game
export function initPuzzleGame(containerId, imageUrl, rows, cols, onComplete) {
  // Ensure container exists
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container ${containerId} not found`);
  }

  // Create div container (not canvas) - Kinetic.js expects a div
  let puzzleContainer = document.getElementById('container');
  if (!puzzleContainer) {
    puzzleContainer = document.createElement('div');
    puzzleContainer.id = 'container';
    container.appendChild(puzzleContainer);
    
    // Set up event listeners on the container div
    if (puzzleContainer && !puzzleContainer.hasAttribute('data-listeners-setup')) {
      puzzleContainer.addEventListener("mouseup", function () {
        if (window.g_currentPiece !== undefined && window.g_currentPiece.getParent && window.g_currentPiece.getParent().attrs.name !== "g_layer") {
          setTimeout(function () {
            window.g_currentPiece.fire("dragend");
          }, 350);
        }
      }, false);

      puzzleContainer.addEventListener("touchend", function () {
        if (window.g_currentPiece !== undefined && window.g_currentPiece.getParent && window.g_currentPiece.getParent().attrs.name !== "g_layer") {
          setTimeout(function () {
            window.g_currentPiece.fire("dragend");
          }, 350);
        }
      }, false);
      puzzleContainer.setAttribute('data-listeners-setup', 'true');
    }
  }

  // Set dimensions - use container's client dimensions
  const width = container.clientWidth || window.innerWidth - 40;
  const height = container.clientHeight || window.innerHeight - 200;
  
  // Set container div dimensions
  puzzleContainer.style.width = width + 'px';
  puzzleContainer.style.height = height + 'px';
  puzzleContainer.style.position = 'relative';
  puzzleContainer.style.display = 'block';

  // Set window dimensions for puzzle-original.js
  window.g_windows_width = width;
  window.g_windows_height = height;

  // Set up puzzle state BEFORE calling loadPuzzle
  // IMPORTANT: Always set g_own_image to ensure new image is used
  window.g_own_image = imageUrl;
  window.g_sliderPos = 0;
  window.g_rows = rows;
  window.g_cols = cols;
  window.g_canvas_width = width;
  window.g_canvas_height = height;
  window.g_ready = false;
  window.g_buildPuzzle = false; // Reset build flag to allow new puzzle to build
  window.g_set = 0;
  window.g_portrait = height > width ? 'p' : '';
  window.g_lock_portrait = window.g_portrait;
  
  window.puzzleOnComplete = onComplete;
  // Don't overwrite puzzleOnStart if it's already set (by PuzzleGame component)
  if (window.puzzleOnStart === undefined) {
    window.puzzleOnStart = null;
  }
  window.puzzleStartTime = null;
  window.puzzleFinalScore = null;

  // Set options
  window.g_back_g_grid = true;
  window.g_back_g_image = true;
  window.g_rotate = false;
  window.g_sound = false;
  window.g_shape = true;

  // Mock image_slider if not set
  if (!window.g_image_slider) {
    window.g_image_slider = {
      getPos: function() { return 0; },
      slide: function() {},
      prev: function() {},
      next: function() {}
    };
  }

  // Ensure initStage exists and is available (from puzzle-original.js)
  // The loadPuzzle function in puzzle-original.js will call initStage() internally
  
  // Call loadPuzzle which will initialize the stage via initStage()
  if (window.loadPuzzle) {
    // Give a small delay to ensure container is fully rendered
    setTimeout(() => {
      window.loadPuzzle();
    }, 50);
  }
}

// Cleanup function to properly destroy puzzle game
export function cleanupPuzzleGame() {
  // Stop score timer if running
  if (window.puzzleStopTimer) {
    window.puzzleStopTimer();
  }
  
  // Cleanup puzzle game (this destroys the Kinetic.js stage)
  if (window.cleanupPuzzle) {
    window.cleanupPuzzle();
  }
  
  // Clear global puzzle state completely
  window.g_rows = undefined;
  window.g_cols = undefined;
  window.g_own_image = undefined;
  window.g_sliderPos = undefined;
  window.g_windows_width = undefined;
  window.g_windows_height = undefined;
  window.g_canvas_width = undefined;
  window.g_canvas_height = undefined;
  window.g_ready = undefined;
  window.g_buildPuzzle = undefined;
  window.g_set = undefined;
  window.g_currentPiece = undefined;
  window.puzzleOnComplete = undefined;
  window.puzzleOnStart = undefined;
  window.puzzleStartTime = undefined;
  window.puzzleFinalScore = undefined;
  window.puzzleCurrentScore = undefined;
  window.g_stage = undefined;
  window.g_imageObj = undefined;
  
  // Remove container element if it exists
  const container = document.getElementById('container');
  if (container) {
    // Clear innerHTML first
    container.innerHTML = '';
    // Then remove if it has a parent
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

