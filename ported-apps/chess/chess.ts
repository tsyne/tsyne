/**
 * Chess Game for Tsyne
 *
 * Ported from https://github.com/andydotxyz/chess
 * Original author: Andy Williams
 * License: See original repository
 *
 * This is a port to demonstrate chess game capabilities in Tsyne.
 * Uses chess.js for game logic and SVG rendering for pieces.
 */

/*
 * @tsyne-app:name Chess
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="#333333"><path d="M19 22H5v-2h14v2zm-3-4H8l-1-4 2-1v-2c0-1 1-3 2-4l-1-2 1-1 1 1c1-1 2-1 3 0l1-1 1 1-1 2c1 1 2 3 2 4v2l2 1-1 4z"/></svg>
 * @tsyne-app:category games
 * @tsyne-app:builder createChessApp
 * @tsyne-app:args app,resources,windowWidth,windowHeight
 * @tsyne-app:count many
 */

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { IResourceManager } from '../../core/src/resources';
import * as path from 'path';
import * as fs from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Color } from 'chess.js';

// ============================================================================
// SVG to PNG Rendering
// ============================================================================

/**
 * Cache for rendered piece images
 */
const imageCache = new Map<string, string>();

/**
 * Cache for pre-rendered piece faces (shared across all ChessUI instances)
 */
let pieceFacesCache: Map<string, string> | null = null;

/**
 * Cache for scaled piece images, keyed by "size:filename"
 */
const scaledPiecesCache: Map<string, string> = new Map();

/**
 * Render an SVG file to a base64-encoded PNG
 * @param svgPath Path to the SVG file
 * @param width Target width (optional, maintains aspect ratio)
 * @param height Target height (optional, maintains aspect ratio)
 * @returns Base64-encoded PNG data with data URI prefix
 */
function renderSVGToBase64(svgPath: string, width?: number, height?: number): string {
  // Check cache first
  const cacheKey = `${svgPath}:${width}:${height}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }

  // Read SVG file
  const svgBuffer = fs.readFileSync(svgPath);

  // Render using resvg
  const opts: any = {
    fitTo: {
      mode: width && height ? 'width' : 'original',
      value: width || undefined,
    },
  };

  const resvg = new Resvg(svgBuffer, opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Convert to base64
  const base64 = pngBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  // Cache it
  imageCache.set(cacheKey, dataUri);

  return dataUri;
}

/**
 * Pre-render all chess piece SVGs to base64 PNG
 * @param piecesDir Directory containing the SVG files
 * @param pieceSize Size to render pieces at (default: 80)
 * @returns Map of filename to base64 PNG data
 */
function preRenderAllPieces(
  piecesDir: string,
  pieceSize: number = 80
): Map<string, string> {
  // Return cached pieces if already rendered
  if (pieceFacesCache) {
    return pieceFacesCache;
  }

  const renderedPieces = new Map<string, string>();

  // Get all SVG files
  const files = fs.readdirSync(piecesDir).filter(f => f.endsWith('.svg'));

  for (const file of files) {
    const svgPath = path.join(piecesDir, file);
    const base64 = renderSVGToBase64(svgPath, pieceSize, pieceSize);
    renderedPieces.set(file, base64);
  }

  // Cache for future instances
  pieceFacesCache = renderedPieces;

  return renderedPieces;
}

// ============================================================================
// Chess UI
// ============================================================================

/**
 * Chess UI class
 */
class ChessUI {
  private game: Chess;
  private statusLabel: any = null;
  private currentStatus: string = 'White to move';
  private renderedPieces: Map<string, string>;
  private selectedSquare: Square | null = null;
  private draggedSquare: Square | null = null;
  private window: Window | null = null;
  private playerColor: Color = 'w'; // Player plays white, computer plays black
  private isComputerThinking: boolean = false;
  private squareImages: Map<Square, any> = new Map(); // Max container references for all 64 squares
  private squareBackgrounds: Map<Square, any> = new Map(); // Background image widgets
  private pieceForegrounds: Map<Square, any> = new Map(); // Piece image widgets

  // Light and dark square colors (in RGB hex)
  private readonly LIGHT_SQUARE_COLOR = '#f0d9b5';
  private readonly DARK_SQUARE_COLOR = '#b58863';
  private readonly SELECTED_COLOR = '#7fc97f';
  private readonly VALID_MOVE_COLOR = '#9fdf9f';

  // Base square size (scales with layout context)
  private readonly BASE_SQUARE_SIZE = 100;

  // Captured scale factor at initialization (stored because PhoneTop may restore scale later)
  private scaleFactor: number = 1.0;

  // Configurable AI response delay (default 500ms for natural feel, tests can use 10ms)
  private readonly aiDelayMs: number;

  private resourcesRegistered: boolean = false;
  private resources: IResourceManager;

  constructor(private a: App, resources: IResourceManager, aiDelayMs: number = 500) {
    this.resources = resources;
    this.aiDelayMs = aiDelayMs;
    this.game = new Chess();

    // Pre-render all piece SVGs to PNG
    const possiblePaths = [
      path.join(process.cwd(), 'pieces'),
      path.join(process.cwd(), 'ported-apps/chess/pieces'),
      path.join(process.cwd(), 'examples/chess/pieces'),
      path.join(process.cwd(), '../examples/chess/pieces'),
      path.join(__dirname, 'pieces')
    ];

    const piecesDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[4];

    this.renderedPieces = preRenderAllPieces(piecesDir, 80);
  }

  /**
   * Get the scaled square size based on captured layout scale.
   * Returns BASE_SQUARE_SIZE * layout scale (e.g., 50 on phone, 100 on desktop)
   * Uses stored scaleFactor to ensure consistent sizing even after PhoneTop restores scale.
   */
  private get squareSize(): number {
    return Math.round(this.BASE_SQUARE_SIZE * this.scaleFactor);
  }

  /**
   * Register all chess resources (squares and pieces) with the injected resource manager
   * This should be called once before building the UI
   */
  private async registerChessResources(): Promise<void> {
    if (this.resourcesRegistered) {
      return; // Already registered
    }

    // Capture scale factor now (context is available after app initialization)
    // Store it for consistent sizing even after PhoneTop restores scale to 1.0
    if (this.a.getContext) {
      this.scaleFactor = this.a.getContext().getLayoutScale();
    }

    // Register empty light and dark squares (100x100px)
    const lightSquare = this.createSquareImage(this.LIGHT_SQUARE_COLOR);
    const darkSquare = this.createSquareImage(this.DARK_SQUARE_COLOR);

    await this.resources.registerResource('chess-square-light', lightSquare);
    await this.resources.registerResource('chess-square-dark', darkSquare);

    // Register all 12 piece types (white and black)
    const pieceTypes: Array<{ color: Color; type: PieceSymbol }> = [
      { color: 'w', type: 'k' }, { color: 'w', type: 'q' }, { color: 'w', type: 'r' },
      { color: 'w', type: 'b' }, { color: 'w', type: 'n' }, { color: 'w', type: 'p' },
      { color: 'b', type: 'k' }, { color: 'b', type: 'q' }, { color: 'b', type: 'r' },
      { color: 'b', type: 'b' }, { color: 'b', type: 'n' }, { color: 'b', type: 'p' },
    ];

    for (const { color, type } of pieceTypes) {
      // Render piece at current scale (not from 80px cache)
      const pieceImage = this.renderPieceAtScale(color, type);
      const resourceName = `chess-piece-${color}-${type}`;
      await this.resources.registerResource(resourceName, pieceImage);
    }

    this.resourcesRegistered = true;
  }

  /**
   * Get the base64 PNG data for a piece (from pre-rendered cache at 80px)
   */
  private getPieceImage(color: Color, piece: PieceSymbol): string {
    const colorName = color === 'w' ? 'white' : 'black';
    const pieceNames: Record<PieceSymbol, string> = {
      'k': 'King',
      'q': 'Queen',
      'r': 'Rook',
      'b': 'Bishop',
      'n': 'Knight',
      'p': 'Pawn'
    };
    const pieceName = pieceNames[piece];
    const filename = `${colorName}${pieceName}.svg`;

    const data = this.renderedPieces.get(filename);
    if (!data) {
      console.warn(`Piece image not found: ${filename}`);
      return '';
    }
    return data;
  }

  /**
   * Render a piece at the current scaled size (for resource registration)
   * Pieces are rendered at 80% of squareSize with 10% margin on each side
   * Results are cached globally by size+filename for performance
   */
  private renderPieceAtScale(color: Color, piece: PieceSymbol): string {
    const colorName = color === 'w' ? 'white' : 'black';
    const pieceNames: Record<PieceSymbol, string> = {
      'k': 'King',
      'q': 'Queen',
      'r': 'Rook',
      'b': 'Bishop',
      'n': 'Knight',
      'p': 'Pawn'
    };
    const pieceName = pieceNames[piece];
    const filename = `${colorName}${pieceName}.svg`;

    // Render at scaled size (80% of square size for piece with 10% margin)
    const pieceSize = Math.round(this.squareSize * 0.8);

    // Check cache first
    const cacheKey = `${pieceSize}:${filename}`;
    if (scaledPiecesCache.has(cacheKey)) {
      return scaledPiecesCache.get(cacheKey)!;
    }

    // Find the pieces directory
    const possiblePaths = [
      path.join(process.cwd(), 'pieces'),
      path.join(process.cwd(), 'ported-apps/chess/pieces'),
      path.join(process.cwd(), 'examples/chess/pieces'),
      path.join(process.cwd(), '../examples/chess/pieces'),
      path.join(__dirname, 'pieces')
    ];
    const piecesDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[4];
    const svgPath = path.join(piecesDir, filename);

    if (!fs.existsSync(svgPath)) {
      console.warn(`Piece SVG not found: ${svgPath}`);
      return '';
    }

    const svgBuffer = fs.readFileSync(svgPath);
    const resvg = new Resvg(svgBuffer, {
      fitTo: { mode: 'width', value: pieceSize }
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    const base64 = pngBuffer.toString('base64');
    const dataUri = `data:image/png;base64,${base64}`;

    // Cache for next time
    scaledPiecesCache.set(cacheKey, dataUri);

    return dataUri;
  }

  /**
   * Get square color
   */
  private getSquareColor(file: number, rank: number): string {
    return (file + rank) % 2 === 0 ? this.DARK_SQUARE_COLOR : this.LIGHT_SQUARE_COLOR;
  }

  /**
   * Convert board coordinates to square notation
   */
  private coordsToSquare(file: number, rank: number): Square {
    const files = 'abcdefgh';
    const ranks = '87654321'; // Rank 0 is 8, rank 7 is 1
    return `${files[file]}${ranks[rank]}` as Square;
  }

  /**
   * Convert square notation to board coordinates
   */
  private squareToCoords(square: Square): { file: number; rank: number } {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    return { file, rank };
  }

  /**
   * Handle clicking on a square
   */
  private async handleSquareClick(file: number, rank: number): Promise<void> {
    if (this.isComputerThinking) {
      return; // Ignore clicks during computer's turn
    }

    const square = this.coordsToSquare(file, rank);
    const piece = this.game.get(square);

    // If no square is selected
    if (!this.selectedSquare) {
      // Can only select own pieces
      if (piece && piece.color === this.playerColor) {
        this.selectedSquare = square;
        await this.updateStatus(`Selected ${this.getPieceName(piece.type)} at ${square}`);
        await this.updateSquare(square); // Highlight selected square
      }
      return;
    }

    // If clicking the same square, deselect
    if (this.selectedSquare === square) {
      const previouslySelected = this.selectedSquare;
      this.selectedSquare = null;
      await this.updateStatus(this.getGameStatus());
      await this.updateSquare(previouslySelected); // Unhighlight square
      return;
    }

    // Try to make a move
    const from = this.selectedSquare;
    const to = square;

    try {
      const move = this.game.move({ from, to });
      this.selectedSquare = null;

      if (move) {
        await this.updateStatus(`${this.getPieceName(move.piece)} ${from} → ${to}`);
        await this.updateSquare(from); // Update source square (now empty or different piece)
        await this.updateSquare(to);   // Update destination square (now has the piece)

        // Check game status
        if (this.game.isGameOver()) {
          await this.handleGameOver();
        } else {
          // Computer's turn
          await this.makeComputerMove();
        }
      }
    } catch (e) {
      // Invalid move - try selecting the clicked piece instead
      const previouslySelected = this.selectedSquare;
      if (piece && piece.color === this.playerColor) {
        this.selectedSquare = square;
        await this.updateStatus(`Selected ${this.getPieceName(piece.type)} at ${square}`);
        if (previouslySelected) await this.updateSquare(previouslySelected); // Unhighlight old square
        await this.updateSquare(square);                                      // Highlight new square
      } else {
        await this.updateStatus('Invalid move');
        this.selectedSquare = null;
        if (previouslySelected) await this.updateSquare(previouslySelected); // Unhighlight square
      }
    }
  }

  /**
   * Handle drag start on a square
   */
  private handleSquareDrag(file: number, rank: number, x: number, y: number): void {
    if (this.isComputerThinking) {
      return;
    }

    const square = this.coordsToSquare(file, rank);
    const piece = this.game.get(square);

    // Only allow dragging own pieces
    if (piece && piece.color === this.playerColor) {
      this.draggedSquare = square;
      this.updateStatus(`Dragging ${this.getPieceName(piece.type)} from ${square}...`);
    }
  }

  /**
   * Handle drag end - determine drop location and make move
   */
  private async handleSquareDragEnd(x: number, y: number): Promise<void> {
    if (!this.draggedSquare || this.isComputerThinking) {
      this.draggedSquare = null;
      return;
    }

    const from = this.draggedSquare;
    this.draggedSquare = null;

    // Determine which square was dropped on
    // Board starts after status label
    const boardStartY = this.a.getContext().scale(20);  // Account for status label (scaled)
    const sqSize = this.squareSize;
    const boardSize = sqSize * 8;

    const boardX = x;
    const boardY = y - boardStartY;

    if (boardX < 0 || boardX >= boardSize || boardY < 0 || boardY >= boardSize) {
      await this.updateStatus('Invalid drop location');
      // No board update needed - nothing changed
      return;
    }

    const file = Math.floor(boardX / sqSize);
    const rank = Math.floor(boardY / sqSize);
    const to = this.coordsToSquare(file, rank);

    try {
      const move = this.game.move({ from, to });

      if (move) {
        await this.updateStatus(`${this.getPieceName(move.piece)} ${from} → ${to}`);
        await this.updateSquare(from); // Update source square (now empty or different piece)
        await this.updateSquare(to);   // Update destination square (now has the piece)

        // Check game status
        if (this.game.isGameOver()) {
          await this.handleGameOver();
        } else {
          // Computer's turn
          await this.makeComputerMove();
        }
      }
    } catch (e) {
      await this.updateStatus('Invalid move');
      // No board update needed - invalid move, board state unchanged
    }
  }

  /**
   * Make a computer move (random legal move)
   */
  private async makeComputerMove(): Promise<void> {
    this.isComputerThinking = true;
    await this.updateStatus('Computer is thinking...');

    // Configurable delay to make it feel more natural
    await new Promise(resolve => setTimeout(resolve, this.aiDelayMs));

    const moves = this.game.moves({ verbose: true });

    if (moves.length === 0) {
      this.isComputerThinking = false;
      return;
    }

    // Select a random move
    const randomMove = moves[Math.floor(Math.random() * moves.length)];

    try {
      this.game.move({ from: randomMove.from, to: randomMove.to });
      await this.updateStatus(`Computer: ${this.getPieceName(randomMove.piece)} ${randomMove.from} → ${randomMove.to}`);
      await this.updateSquare(randomMove.from as Square); // Update source square
      await this.updateSquare(randomMove.to as Square);   // Update destination square

      this.isComputerThinking = false;

      // Check game status
      if (this.game.isGameOver()) {
        await this.handleGameOver();
      } else {
        await this.updateStatus(this.getGameStatus());
      }
    } catch (e) {
      this.isComputerThinking = false;
      await this.updateStatus('Computer move error');
    }
  }

  /**
   * Handle game over state
   */
  private async handleGameOver(): Promise<void> {
    let message = 'Game Over! ';

    if (this.game.isCheckmate()) {
      const winner = this.game.turn() === 'w' ? 'Black' : 'White';
      message += `Checkmate! ${winner} wins!`;
    } else if (this.game.isStalemate()) {
      message += 'Stalemate! Draw.';
    } else if (this.game.isDraw()) {
      message += 'Draw!';
    }

    await this.updateStatus(message);
  }

  /**
   * Get current game status message
   */
  private getGameStatus(): string {
    if (this.game.isCheck()) {
      return `${this.game.turn() === 'w' ? 'White' : 'Black'} to move (Check!)`;
    }
    return `${this.game.turn() === 'w' ? 'White' : 'Black'} to move`;
  }

  /**
   * Get human-readable piece name
   */
  private getPieceName(piece: PieceSymbol): string {
    const names: Record<PieceSymbol, string> = {
      'k': 'King',
      'q': 'Queen',
      'r': 'Rook',
      'b': 'Bishop',
      'n': 'Knight',
      'p': 'Pawn'
    };
    return names[piece] || piece;
  }

  /**
   * Create a colored square image at the scaled size
   */
  private createSquareImage(color: string, pieceImage?: string): string {
    const size = this.squareSize;
    const pieceSize = Math.round(size * 0.8);  // Piece is 80% of square
    const pieceOffset = Math.round(size * 0.1);  // 10% margin

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="${color}"/>`;

    if (pieceImage) {
      // Embed the piece image
      svg += `<image href="${pieceImage}" x="${pieceOffset}" y="${pieceOffset}" width="${pieceSize}" height="${pieceSize}"/>`;
    }

    svg += '</svg>';

    // Render to PNG
    const svgBuffer = Buffer.from(svg, 'utf-8');
    const resvg = new Resvg(svgBuffer, {
      fitTo: {
        mode: 'width',
        value: size,
      },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    const base64 = pngBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  }

  /**
   * Update a single square's image by updating the child widgets in the Max container
   * This updates the background and foreground images separately without rebuilding
   */
  private async updateSquare(square: Square): Promise<void> {
    const squareBackground = this.squareBackgrounds.get(square);
    const pieceForeground = this.pieceForegrounds.get(square);

    if (!squareBackground || !pieceForeground) {
      return;
    }

    const coords = this.squareToCoords(square);
    const board = this.game.board();
    const squareData = board[coords.rank][coords.file];
    const baseColor = this.getSquareColor(coords.file, coords.rank);
    const isLight = (coords.file + coords.rank) % 2 === 0;

    // Update background square
    let squareColor = baseColor;
    if (this.selectedSquare === square) {
      squareColor = this.SELECTED_COLOR;
      // Create highlighted square image
      const squareImage = this.createSquareImage(squareColor);
      await squareBackground.updateImage(squareImage);
    } else {
      // Use resource for normal square
      const resourceName = isLight ? 'chess-square-dark' : 'chess-square-light';
      await squareBackground.updateImage({ resource: resourceName });
    }

    // Update foreground piece
    if (squareData) {
      const resourceName = `chess-piece-${squareData.color}-${squareData.type}`;
      await pieceForeground.updateImage({ resource: resourceName });
    } else {
      // Empty square - make piece invisible by using transparent square
      const resourceName = isLight ? 'chess-square-dark' : 'chess-square-light';
      await pieceForeground.updateImage({ resource: resourceName });
    }
  }

  /**
   * Update all squares to reflect game state changes
   */
  private async updateAllSquares(): Promise<void> {
    const files = 'abcdefgh';
    const ranks = '12345678';

    // Update sequentially to avoid overwhelming the bridge
    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}` as Square;
        await this.updateSquare(square);
      }
    }
  }

  /**
   * Rebuild the UI to reflect game state changes
   * NOTE: This is only called once during initial setup.
   * Use updateSquare() or updateAllSquares() for incremental updates.
   *
   * TODO: rebuildUI() has fundamental timing issues with test framework
   * PROBLEM: Calling window.setContent() destroys entire widget tree and recreates it.
   *          During recreation, test context loses all widget references. Tests calling
   *          newGame() can't find widgets until rebuild completes, causing timeouts.
   * WHY SO SLOW: Complete widget tree destruction/recreation instead of selective updates.
   *              Creating 64 squares × 3 widgets each = 192+ widget operations.
   * WHY NOT INTELLIGENT: Historical architecture decision. Move updates already use
   *                      intelligent updateSquare()/updateAllSquares() which work perfectly.
   * FIX: Refactor newGame() to use updateAllSquares() instead of rebuildUI().
   *      This would update piece positions incrementally without destroying widget tree.
   *      See chess-e2e.test.ts for 3 skipped tests that would pass with this fix.
   */
  private rebuildUI(): void {
    if (!this.window) return;

    this.window.setContent(() => {
      this.buildUI(this.window!);
    });
  }

  buildUI(win: Window): void {
    this.window = win;

    // Clear old widget references before rebuild
    this.squareImages.clear();
    this.squareBackgrounds.clear();
    this.pieceForegrounds.clear();

    const board = this.game.board();

    this.a.vbox(() => {
        // Status
        this.statusLabel = this.a.label(this.currentStatus);

        // Chess board - 8x8 grid with zero spacing for tight square layout
        this.a.grid(8, () => {
          for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
            const square = this.coordsToSquare(file, rank);
            const squareData = board[rank][file];
            const isLight = (file + rank) % 2 === 0;

            // Make square clickable and draggable if it has a piece
            let imageWidget;

            // Use Max container for Z-layering square + piece
            // This avoids expensive SVG compositing (90ms per square)
            let squareBackground: any;
            let pieceForeground: any;

            imageWidget = this.a.max(() => {
              // Bottom layer: Square background
              const squareColor = this.selectedSquare === square ? this.SELECTED_COLOR : this.getSquareColor(file, rank);

              if (this.selectedSquare === square) {
                // Highlighted square - need inline image
                const squareImage = this.createSquareImage(squareColor);
                squareBackground = this.a.image(squareImage, 'original').withId(`bg-${square}`);
              } else {
                // Normal square - use resource
                const resourceName = isLight ? 'chess-square-dark' : 'chess-square-light';
                squareBackground = this.a.image({ resource: resourceName, fillMode: 'original' }).withId(`bg-${square}`);
              }

              // Top layer: Piece (if present)
              if (squareData) {
                const resourceName = `chess-piece-${squareData.color}-${squareData.type}`;

                // Add click and drag handlers to the piece layer
                if (squareData.color === this.playerColor) {
                  // Player's piece - clickable and draggable
                  pieceForeground = this.a.image({
                    resource: resourceName,
                    fillMode: 'original',
                    onClick: () => this.handleSquareClick(file, rank),
                    onDrag: (x: number, y: number) => this.handleSquareDrag(file, rank, x, y),
                    onDragEnd: (x: number, y: number) => this.handleSquareDragEnd(x, y)
                  }).withId(`piece-${square}`);
                } else {
                  // Opponent's piece - clickable only
                  pieceForeground = this.a.image({
                    resource: resourceName,
                    fillMode: 'original',
                    onClick: () => this.handleSquareClick(file, rank)
                  }).withId(`piece-${square}`);
                }
              } else {
                // Empty square - still need click handler, add invisible overlay
                pieceForeground = this.a.image({
                  resource: isLight ? 'chess-square-dark' : 'chess-square-light',
                  fillMode: 'original',
                  onClick: () => this.handleSquareClick(file, rank)
                }).withId(`piece-${square}`);
              }
            }).withId(`square-${square}`);

            // Store references for incremental updates
            this.squareImages.set(square, imageWidget);
            this.squareBackgrounds.set(square, squareBackground);
            this.pieceForegrounds.set(square, pieceForeground);
            }
          }
        }, { spacing: 0, cellSize: 100 });  // zero spacing, fixed 100px cells
    }, { spacing: 0 });  // zero spacing between status label and board
  }

  /**
   * Reset the game to initial state
   * Public to allow tests to reset game state via chessUI.newGame()
   */
  public async newGame(): Promise<void> {
    this.game.reset();
    this.selectedSquare = null;
    this.draggedSquare = null;
    this.isComputerThinking = false;
    this.currentStatus = 'White to move';

    // TODO: Replace rebuildUI() with updateAllSquares() to fix test timing issues
    // Currently using rebuildUI which destroys/recreates entire widget tree (slow, breaks tests)
    // Should use updateAllSquares() to intelligently update just piece positions (fast, test-safe)
    this.rebuildUI();
    await this.updateStatus('New game started');
  }

  // ============================================================================
  // Smart Board Query Methods (for testing)
  // ============================================================================

  /**
   * Count pawns in a specific row (1-8)
   * Example: countPawnsInRow(2) returns 8 at game start
   */
  public countPawnsInRow(row: number): number {
    return this.countPiecesInRow(row, undefined, 'p');
  }

  /**
   * Count pieces in a specific row with optional filters
   * @param row Row number (1-8, where 1 is white's back rank, 8 is black's back rank)
   * @param color Optional color filter ('w' or 'b')
   * @param type Optional piece type filter ('p', 'n', 'b', 'r', 'q', 'k')
   * @returns Count of matching pieces
   *
   * Examples:
   *   countPiecesInRow(2) - all pieces in row 2
   *   countPiecesInRow(2, 'w') - white pieces in row 2
   *   countPiecesInRow(2, 'w', 'p') - white pawns in row 2
   */
  public countPiecesInRow(row: number, color?: Color, type?: PieceSymbol): number {
    const pieces = this.getPiecesInRow(row);
    return pieces.filter(p => {
      if (color && p.color !== color) return false;
      if (type && p.type !== type) return false;
      return true;
    }).length;
  }

  /**
   * Get all pieces in a specific row
   * @param row Row number (1-8)
   * @returns Array of pieces with their positions
   *
   * Example:
   *   getPiecesInRow(2) returns all pieces in row 2
   */
  public getPiecesInRow(row: number): Array<{ square: Square; color: Color; type: PieceSymbol }> {
    const files = 'abcdefgh';
    const pieces: Array<{ square: Square; color: Color; type: PieceSymbol }> = [];

    for (const file of files) {
      const square = `${file}${row}` as Square;
      const piece = this.game.get(square);
      if (piece) {
        pieces.push({
          square,
          color: piece.color,
          type: piece.type
        });
      }
    }

    return pieces;
  }

  /**
   * Get the full board state as an 8x8 array
   * @returns 8x8 array where [0][0] is a8 and [7][7] is h1
   *
   * Example usage in tests:
   *   const board = chessUI.getBoard();
   *   expect(board[1][4]).toEqual({ color: 'w', type: 'p' }); // e7 has white pawn
   */
  public getBoard(): Array<Array<{ color: Color; type: PieceSymbol } | null>> {
    const board: Array<Array<{ color: Color; type: PieceSymbol } | null>> = [];

    // chess.js board() returns [rank8, rank7, ..., rank1]
    const chessBoard = this.game.board();

    for (let rank = 0; rank < 8; rank++) {
      const row: Array<{ color: Color; type: PieceSymbol } | null> = [];
      for (let file = 0; file < 8; file++) {
        const square = chessBoard[rank][file];
        if (square) {
          row.push({ color: square.color, type: square.type });
        } else {
          row.push(null);
        }
      }
      board.push(row);
    }

    return board;
  }

  /**
   * Get piece at a specific square
   * @param square Square notation (e.g., 'e2', 'e4')
   * @returns Piece object or null if empty
   *
   * Example:
   *   getPiece('e2') returns { color: 'w', type: 'p' } at game start
   */
  public getPiece(square: Square): { color: Color; type: PieceSymbol } | null {
    const piece = this.game.get(square);
    return piece ? { color: piece.color, type: piece.type } : null;
  }

  /**
   * Get current board position as FEN string
   * Useful for advanced board state assertions
   *
   * Example:
   *   expect(chessUI.getFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
   */
  public getFEN(): string {
    return this.game.fen();
  }

  private async updateStatus(message: string): Promise<void> {
    this.currentStatus = message;
    if (this.statusLabel) {
      await this.statusLabel.setText(message);
    }
  }

  /**
   * Get the game instance (for testing)
   */
  getGame(): Chess {
    return this.game;
  }

  /**
   * Refresh the UI to reflect game state changes (for testing)
   */
  refreshUI(): void {
    this.rebuildUI();
  }
}

/**
 * Create the chess app
 * @param a - The App instance
 * @param resources - Resource manager for registering chess piece images (IoC)
 * @param windowWidth - Optional window width from PhoneTop
 * @param windowHeight - Optional window height from PhoneTop
 * @param aiDelayMs - AI response delay in ms (default 500, use lower for tests)
 */
export async function createChessApp(a: App, resources: IResourceManager, windowWidth?: number, windowHeight?: number, aiDelayMs?: number): Promise<ChessUI> {
  const ui = new ChessUI(a, resources, aiDelayMs);

  // If window dimensions provided, calculate optimal scale factor
  // Chess board is 8x8 squares, plus some padding for status/controls
  if (windowWidth && windowHeight) {
    const overhead = 100; // Space for status bar, controls
    const availableSize = Math.min(windowWidth - 20, windowHeight - overhead);
    const optimalSquareSize = Math.floor(availableSize / 8);
    // Set scale factor based on optimal size vs BASE_SQUARE_SIZE (100)
    ui['scaleFactor'] = optimalSquareSize / 100;
    console.log(`[Chess] Window: ${windowWidth}x${windowHeight}, square size: ${optimalSquareSize}`);
  }

  // Register chess resources before building UI
  await ui['registerChessResources']();

  // No explicit size - window will size to fit content
  a.window({ title: 'Chess' }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

/**
 * Main application entry point - standalone execution
 */
if (require.main === module) {
  app(resolveTransport(), { title: 'Chess' }, async (a: App) => {
    // Standalone: create a dedicated resource manager (IoC - don't use a.resources)
    const resources = a.createResourceManager();
    await createChessApp(a, resources);
  });
}
