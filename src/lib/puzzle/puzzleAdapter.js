/**
 * Puzzle Game Adapter
 * Adapts the original puzzle.js to work as a React-compatible module
 * Based on grrd's Puzzle (https://github.com/grrd01/Puzzle)
 */

// This will be populated when puzzle.js loads
let puzzleModule = null;

// Initialize the puzzle module
export function initPuzzleModule() {
  return new Promise((resolve, reject) => {
    if (puzzleModule) {
      resolve();
      return;
    }

    // Load puzzle.js script
    const script = document.createElement('script');
    script.src = '/puzzle/puzzle.js';
    script.onload = () => {
      // The puzzle.js is an IIFE, so we need to extract what we need
      // We'll create a wrapper that exposes the functions we need
      puzzleModule = {
        initialized: true
      };
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load puzzle.js'));
    };
    document.head.appendChild(script);
  });
}

// Create an adapted puzzle initializer
export function createPuzzleGame(containerId, imageUrl, rows, cols, onComplete) {
  if (!window.Kinetic) {
    throw new Error('Kinetic.js not loaded');
  }

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container ${containerId} not found`);
  }

  // Set container dimensions
  const containerWidth = container.clientWidth || window.innerWidth - 40;
  const containerHeight = container.clientHeight || window.innerHeight - 200;
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'container';
  canvas.width = containerWidth;
  canvas.height = containerHeight;
  container.innerHTML = '';
  container.appendChild(canvas);

  // Initialize Kinetic.js stage and layers
  const stage = new window.Kinetic.Stage({
    container: containerId,
    width: containerWidth,
    height: containerHeight,
  });

  const layer = new window.Kinetic.Layer({ name: 'g_layer' });
  const backLayer = new window.Kinetic.Layer({ name: 'g_back_g_layer' });
  const tempLayer = new window.Kinetic.Layer({ name: 'temp_layer', visible: false }); // Hidden temp layer for shape conversion
  
  stage.add(backLayer);
  stage.add(layer);
  stage.add(tempLayer);
  backLayer.moveToBottom();

  // Calculate piece dimensions
  const pieceWidth = containerWidth / cols;
  const pieceHeight = containerHeight / rows;

  // Global state (mimicking original puzzle.js structure)
  const puzzleState = {
    stage,
    layer,
    backLayer,
    tempLayer,
    rows,
    cols,
    pieceWidth,
    pieceHeight,
    canvasWidth: containerWidth,
    canvasHeight: containerHeight,
    imageObj: new Image(),
    pieces: [],
    set: 0,
    ready: false,
    buildPuzzle: false,
    shape: true, // Use jigsaw shapes
    backGrid: true,
    backImage: true,
    rotate: false,
    sound: false,
    precision: 15,
    imgNoStroke: [],
    onComplete,
  };

  // Initialize imgNoStroke array
  for (let i = 0; i < rows; i++) {
    puzzleState.imgNoStroke[i] = [];
  }

  // Build background
  function buildBackground(img) {
    if (puzzleState.backImage) {
      const backImage = new window.Kinetic.Image({
        x: 0,
        y: 0,
        width: puzzleState.canvasWidth,
        height: puzzleState.canvasHeight,
        image: img,
        opacity: 0.1,
      });
      puzzleState.backLayer.add(backImage);
    }

    if (puzzleState.backGrid) {
      for (let n = 0; n < rows; n++) {
        for (let i = 0; i < cols; i++) {
          const gridRect = new window.Kinetic.Rect({
            x: i * pieceWidth,
            y: n * pieceHeight,
            width: pieceWidth,
            height: pieceHeight,
            stroke: '#333333',
            strokeWidth: 2,
          });
          puzzleState.backLayer.add(gridRect);
        }
      }
    }
    puzzleState.backLayer.draw();
  }

  // Draw puzzle piece with jigsaw shape
  function drawPiece(col, row, hvSwitch, img, onComplete) {
    const startX = col * pieceWidth;
    const startY = row * pieceHeight;
    const width = pieceWidth;
    const height = pieceHeight;

    if (puzzleState.shape) {
      // Create jigsaw piece shape
      const pieceShape = new window.Kinetic.Shape({
        drawFunc: function (context) {
          context.beginPath();
          context.moveTo(startX, startY);

          // Top edge
          if (row === 0) {
            context.lineTo(startX + width, startY);
          } else {
            context.bezierCurveTo(
              startX + width * 0.8,
              startY + height * 0.1 * hvSwitch,
              startX,
              startY - height * 0.25 * hvSwitch,
              startX + width / 2,
              startY - height * 0.25 * hvSwitch
            );
            context.bezierCurveTo(
              startX + width,
              startY - height * 0.25 * hvSwitch,
              startX + width * 0.2,
              startY + height * 0.1 * hvSwitch,
              startX + width,
              startY
            );
          }

          // Right edge
          if (col === cols - 1) {
            context.lineTo(startX + width, startY + height);
          } else {
            context.bezierCurveTo(
              startX + width + width * 0.1 * hvSwitch,
              startY + height * 0.8,
              startX + width - width * 0.25 * hvSwitch,
              startY,
              startX + width - width * 0.25 * hvSwitch,
              startY + height / 2
            );
            context.bezierCurveTo(
              startX + width - width * 0.25 * hvSwitch,
              startY + height,
              startX + width + width * 0.1 * hvSwitch,
              startY + height * 0.2,
              startX + width,
              startY + height
            );
          }

          // Bottom edge
          if (row === rows - 1) {
            context.lineTo(startX, startY + height);
          } else {
            context.bezierCurveTo(
              startX + width * 0.2,
              startY + height - height * 0.1 * hvSwitch,
              startX + width,
              startY + height + height * 0.25 * hvSwitch,
              startX + width / 2,
              startY + height + height * 0.25 * hvSwitch
            );
            context.bezierCurveTo(
              startX,
              startY + height + height * 0.25 * hvSwitch,
              startX + width * 0.8,
              startY + height - height * 0.1 * hvSwitch,
              startX,
              startY + height
            );
          }

          // Left edge
          if (col === 0) {
            context.lineTo(startX, startY);
          } else {
            context.bezierCurveTo(
              startX - width * 0.1 * hvSwitch,
              startY + height * 0.2,
              startX + width * 0.25 * hvSwitch,
              startY + height,
              startX + width * 0.25 * hvSwitch,
              startY + height / 2
            );
            context.bezierCurveTo(
              startX + width * 0.25 * hvSwitch,
              startY,
              startX - width * 0.1 * hvSwitch,
              startY + height * 0.8,
              startX,
              startY
            );
          }

          context.closePath();
          context.fillStrokeShape(this);
        },
        fillPatternImage: img,
        fillPatternOffset: [col * (img.width / cols), row * (img.height / rows)],
        stroke: 'black',
        strokeWidth: 4,
      });

      // Add shape to temp layer and draw it
      puzzleState.tempLayer.add(pieceShape);
      puzzleState.tempLayer.draw();

      // Create the piece with stroke first
      pieceShape.toImage({
        width: width + 0.6 * width,
        height: height + 0.6 * height,
        x: -width * 0.3,
        y: -height * 0.3,
        callback: function (pieceImg) {
          if (!pieceImg) {
            console.error('Failed to create piece image for row', row, 'col', col);
            if (onComplete) onComplete();
            return;
          }
          
          // Remove shape from temp layer
          pieceShape.destroy();
          
          const piece = new window.Kinetic.Image({
            image: pieceImg,
            x: col * width + width / 2,
            origX: col * width + width / 2,
            y: row * height + height / 2,
            origY: row * height + height / 2,
            row: row,
            col: col,
            offset: [width / 2 + width * 0.3, height / 2 + height * 0.3],
            draggable: true,
            dragBoundFunc: function (pos) {
              return {
                x: Math.max(0, Math.min(pos.x, puzzleState.canvasWidth)),
                y: Math.max(0, Math.min(pos.y, puzzleState.canvasHeight)),
              };
            },
            name: `part_z${row}_s${col}`,
          });

          setupPieceEvents(piece);
          puzzleState.layer.add(piece);
          puzzleState.pieces.push(piece);
          puzzleState.layer.draw();
          puzzleState.stage.draw();
          
          // Call onComplete when this piece is done
          if (onComplete) {
            onComplete();
          }
        },
      });

      // Create no-stroke version for when piece is placed (async, doesn't block)
      const noStrokeShape = new window.Kinetic.Shape({
        drawFunc: function (context) {
          context.beginPath();
          context.moveTo(startX, startY);

          // Top edge
          if (row === 0) {
            context.lineTo(startX + width, startY);
          } else {
            context.bezierCurveTo(
              startX + width * 0.8,
              startY + height * 0.1 * hvSwitch,
              startX,
              startY - height * 0.25 * hvSwitch,
              startX + width / 2,
              startY - height * 0.25 * hvSwitch
            );
            context.bezierCurveTo(
              startX + width,
              startY - height * 0.25 * hvSwitch,
              startX + width * 0.2,
              startY + height * 0.1 * hvSwitch,
              startX + width,
              startY
            );
          }

          // Right edge
          if (col === cols - 1) {
            context.lineTo(startX + width, startY + height);
          } else {
            context.bezierCurveTo(
              startX + width + width * 0.1 * hvSwitch,
              startY + height * 0.8,
              startX + width - width * 0.25 * hvSwitch,
              startY,
              startX + width - width * 0.25 * hvSwitch,
              startY + height / 2
            );
            context.bezierCurveTo(
              startX + width - width * 0.25 * hvSwitch,
              startY + height,
              startX + width + width * 0.1 * hvSwitch,
              startY + height * 0.2,
              startX + width,
              startY + height
            );
          }

          // Bottom edge
          if (row === rows - 1) {
            context.lineTo(startX, startY + height);
          } else {
            context.bezierCurveTo(
              startX + width * 0.2,
              startY + height - height * 0.1 * hvSwitch,
              startX + width,
              startY + height + height * 0.25 * hvSwitch,
              startX + width / 2,
              startY + height + height * 0.25 * hvSwitch
            );
            context.bezierCurveTo(
              startX,
              startY + height + height * 0.25 * hvSwitch,
              startX + width * 0.8,
              startY + height - height * 0.1 * hvSwitch,
              startX,
              startY + height
            );
          }

          // Left edge
          if (col === 0) {
            context.lineTo(startX, startY);
          } else {
            context.bezierCurveTo(
              startX - width * 0.1 * hvSwitch,
              startY + height * 0.2,
              startX + width * 0.25 * hvSwitch,
              startY + height,
              startX + width * 0.25 * hvSwitch,
              startY + height / 2
            );
            context.bezierCurveTo(
              startX + width * 0.25 * hvSwitch,
              startY,
              startX - width * 0.1 * hvSwitch,
              startY + height * 0.8,
              startX,
              startY
            );
          }

          context.closePath();
          context.fillStrokeShape(this);
        },
        fillPatternImage: img,
        fillPatternOffset: [col * (img.width / cols), row * (img.height / rows)],
        stroke: null,
        strokeWidth: null,
      });

      puzzleState.tempLayer.add(noStrokeShape);
      puzzleState.tempLayer.draw();
      
      noStrokeShape.toImage({
        width: width + 0.6 * width,
        height: height + 0.6 * height,
        x: -width * 0.3,
        y: -height * 0.3,
        callback: function (noStrokeImg) {
          noStrokeShape.destroy();
          puzzleState.imgNoStroke[row][col] = noStrokeImg;
        },
      });
    } else {
      // Simple rectangular pieces (fallback)
      const piece = new window.Kinetic.Image({
        x: col * width + width / 2,
        origX: col * width + width / 2,
        y: row * height + height / 2,
        origY: row * height + height / 2,
        row: row,
        col: col,
        width: width,
        height: height,
        offset: [width / 2, height / 2],
        crop: {
          x: (img.width / cols) * col,
          y: (img.height / rows) * row,
          width: img.width / cols,
          height: img.height / rows,
        },
        image: img,
        draggable: true,
        dragBoundFunc: function (pos) {
          return {
            x: Math.max(0, Math.min(pos.x, puzzleState.canvasWidth)),
            y: Math.max(0, Math.min(pos.y, puzzleState.canvasHeight)),
          };
        },
        name: `part_z${row}_s${col}`,
      });

      setupPieceEvents(piece);
      puzzleState.layer.add(piece);
      puzzleState.pieces.push(piece);
      
      if (onComplete) {
        onComplete();
      }
    }
  }

  // Setup piece event handlers (based on original drawPiece_2)
  let g_tap = false;
  let g_currentPiece = null;
  let g_zIndex = 0;

  function setupPieceEvents(piece) {
    piece.on('mouseover', function () {
      if ((piece.getDraggable() || (piece.getParent() && piece.getParent().getDraggable())) && puzzleState.ready) {
        document.body.style.cursor = 'pointer';
      }
    });

    piece.on('click tap', function () {
      if (g_tap === false) {
        return;
      }
      if ((piece.getDraggable() || (piece.getParent() && piece.getParent().getDraggable())) && puzzleState.ready && puzzleState.rotate && g_zIndex === puzzleState.layer.getChildren().length - 1) {
        // Rotation logic (if enabled)
        // For now, just fire dragend
        piece.fire('dragend');
      } else if (puzzleState.set === rows * cols) {
        puzzleState.ready = false;
        if (puzzleState.onComplete) {
          const timeSeconds = (Date.now() - puzzleState.startTime) / 1000;
          puzzleState.onComplete(timeSeconds);
        }
      } else {
        piece.fire('dragend');
      }
    });

    piece.on('mousedown touchstart', function () {
      g_tap = true;
      setTimeout(function () {
        g_tap = false;
      }, 500);
      g_currentPiece = piece;
      if ((piece.getDraggable() || (piece.getParent() && piece.getParent().getDraggable())) && puzzleState.ready) {
        if (!piece.getParent() || piece.getParent().attrs.name === 'g_layer') {
          g_zIndex = piece.getZIndex();
          piece.moveToTop();
        } else {
          g_zIndex = piece.getParent().getZIndex();
          piece.getParent().moveToTop();
        }
      }
    });

    piece.on('dragend', function () {
      if ((piece.getDraggable() || (piece.getParent() && piece.getParent().getDraggable())) && puzzleState.ready) {
        pieceTestTarget(piece);
      } else if (puzzleState.set === rows * cols) {
        puzzleState.ready = false;
        if (puzzleState.onComplete) {
          const timeSeconds = (Date.now() - puzzleState.startTime) / 1000;
          puzzleState.onComplete(timeSeconds);
        }
      }
    });

    piece.on('mouseout', function () {
      document.body.style.cursor = 'default';
    });

    // For jigsaw pieces, create hit region for better interaction
    if (puzzleState.shape) {
      piece.createImageHitRegion(function () {
        puzzleState.layer.drawHit();
      });
    }
  }

  // Test if piece is in correct position
  function pieceTestTarget(piece) {
    const precision = puzzleState.precision;
    let pieceAbsoluteRotation = 0;

    if (!piece.getParent() || piece.getParent().attrs.name === 'g_layer') {
      pieceAbsoluteRotation = piece.getRotationDeg();
    } else {
      pieceAbsoluteRotation = (piece.getRotationDeg() + piece.getParent().getRotationDeg()) % 360;
    }

    // Check if piece is in correct position
    if (
      Math.abs(piece.getAbsolutePosition().x - piece.attrs.origX) < precision &&
      Math.abs(piece.getAbsolutePosition().y - piece.attrs.origY) < precision &&
      pieceAbsoluteRotation === 0
    ) {
      // Place piece correctly
      setPiece(piece);
    } else {
      // Check for piece connections
      checkPieceConnections(piece);
    }
  }

  // Place piece in correct position
  function setPiece(piece) {
    piece.setX(piece.attrs.origX);
    piece.setY(piece.attrs.origY);
    piece.setRotationDeg(0);
    piece.moveToBottom();
    piece.setStrokeWidth(null);
    piece.setStroke(null);
    piece.setDraggable(false);

    if (puzzleState.shape && puzzleState.imgNoStroke[piece.attrs.row]?.[piece.attrs.col]) {
      piece.setImage(puzzleState.imgNoStroke[piece.attrs.row][piece.attrs.col]);
    }

    puzzleState.layer.draw();

    setTimeout(function () {
      puzzleState.set++;
      if (puzzleState.set === rows * cols) {
        puzzleState.ready = false;
        if (puzzleState.onComplete) {
          const timeSeconds = (Date.now() - puzzleState.startTime) / 1000;
          puzzleState.onComplete(timeSeconds);
        }
      }
    }, 500);
  }

  // Check piece connections with adjacent pieces
  function checkPieceConnections(piece) {
    // Simplified version - check if piece is close to correct position
    puzzleState.layer.draw();
  }

  // Display puzzle (scatter pieces)
  function displayPuzzle() {
    puzzleState.ready = false;
    
    // Randomize z-index
    puzzleState.pieces.forEach((piece) => {
      piece.setZIndex(Math.floor(Math.random() * rows * cols));
    });

    // Scatter pieces with animation
    setTimeout(() => {
      puzzleState.pieces.forEach((piece) => {
        const randomX = Math.random() * (puzzleState.canvasWidth - pieceWidth) + pieceWidth / 2;
        const randomY = Math.random() * (puzzleState.canvasHeight - pieceHeight) + pieceHeight / 2;

        const tween = new window.Kinetic.Tween({
          node: piece,
          x: randomX,
          y: randomY,
          duration: 1,
          onFinish: () => {
            puzzleState.ready = true;
            puzzleState.startTime = Date.now();
          },
        });
        tween.play();
      });
    }, 500);
  }

  // Build the puzzle
  function buildPuzzle() {
    puzzleState.buildPuzzle = true;
    puzzleState.layer.removeChildren();
    puzzleState.backLayer.removeChildren();
    puzzleState.stage.removeChildren();
    puzzleState.stage.add(puzzleState.backLayer);
    puzzleState.stage.add(puzzleState.layer);
    puzzleState.backLayer.moveToBottom();
    puzzleState.set = 0;
    puzzleState.pieces = [];

    const img = puzzleState.imageObj;
    const tempImage = new window.Kinetic.Image({
      width: puzzleState.canvasWidth,
      height: puzzleState.canvasHeight,
      crop: {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
      },
      image: img,
    });

    tempImage.toImage({
      width: puzzleState.canvasWidth,
      height: puzzleState.canvasHeight,
      callback: function (processedImg) {
        buildBackground(processedImg);

        if (puzzleState.shape) {
          tempImage.toImage({
            width: puzzleState.canvasWidth,
            height: puzzleState.canvasHeight,
            callback: function (shapeImg) {
              let piecesCreated = 0;
              const totalPieces = rows * cols;
              console.log('Starting to create', totalPieces, 'puzzle pieces');
              
              for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                  const hvSwitch = (row % 2 !== 0 && col % 2 !== 0) || (row % 2 === 0 && col % 2 === 0) ? 1 : -1;
                  drawPiece(col, row, hvSwitch, shapeImg, () => {
                    piecesCreated++;
                    console.log(`Piece ${piecesCreated}/${totalPieces} created (row ${row}, col ${col})`);
                    if (piecesCreated === totalPieces) {
                      console.log('All pieces created, displaying puzzle');
                      puzzleState.layer.draw();
                      displayPuzzle();
                    }
                  });
                }
              }
            },
          });
        } else {
          let piecesCreated = 0;
          const totalPieces = rows * cols;
          
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const hvSwitch = (row % 2 !== 0 && col % 2 !== 0) || (row % 2 === 0 && col % 2 === 0) ? 1 : -1;
              drawPiece(col, row, hvSwitch, processedImg, () => {
                piecesCreated++;
                if (piecesCreated === totalPieces) {
                  puzzleState.layer.draw();
                  displayPuzzle();
                }
              });
            }
          }
        }
      },
    });
  }

  // Load and build puzzle
  puzzleState.imageObj.crossOrigin = 'anonymous';
  puzzleState.imageObj.onload = buildPuzzle;
  puzzleState.imageObj.onerror = () => {
    throw new Error('Failed to load puzzle image');
  };
  puzzleState.imageObj.src = imageUrl;

  return {
    destroy: () => {
      if (puzzleState.stage) {
        puzzleState.stage.destroy();
      }
      if (container) {
        container.innerHTML = '';
      }
    },
  };
}

