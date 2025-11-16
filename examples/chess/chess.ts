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

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
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
  console.time('[PERF] preRenderAllPieces');

  // Return cached pieces if already rendered
  if (pieceFacesCache) {
    console.log('[PERF] Using cached pieces');
    console.timeEnd('[PERF] preRenderAllPieces');
    return pieceFacesCache;
  }

  const renderedPieces = new Map<string, string>();

  // Get all SVG files
  const files = fs.readdirSync(piecesDir).filter(f => f.endsWith('.svg'));
  console.log(`[PERF] Rendering ${files.length} SVG files...`);

  for (const file of files) {
    console.time(`[PERF]   ${file}`);
    const svgPath = path.join(piecesDir, file);
    const base64 = renderSVGToBase64(svgPath, pieceSize, pieceSize);
    renderedPieces.set(file, base64);
    console.timeEnd(`[PERF]   ${file}`);
  }

  // Cache for future instances
  pieceFacesCache = renderedPieces;

  console.timeEnd('[PERF] preRenderAllPieces');
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

  private resourcesRegistered: boolean = false;

  constructor(private a: App) {
    console.time('[PERF] ChessUI constructor');
    this.game = new Chess();

    // Pre-render all piece SVGs to PNG
    const possiblePaths = [
      path.join(process.cwd(), 'pieces'),
      path.join(process.cwd(), 'examples/chess/pieces'),
      path.join(process.cwd(), '../examples/chess/pieces'),
      path.join(__dirname, 'pieces')
    ];

    const piecesDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[3];

    this.renderedPieces = preRenderAllPieces(piecesDir, 80);
    console.timeEnd('[PERF] ChessUI constructor');
  }

  /**
   * Register all chess resources (squares and pieces) with the app
   * This should be called once before building the UI
   */
  private async registerChessResources(): Promise<void> {
    if (this.resourcesRegistered) {
      return; // Already registered
    }

    console.time('[PERF] registerChessResources');
    console.log('Registering chess resources...');

    // Register empty light and dark squares (100x100px)
    console.time('[PERF] Create square images');
    const lightSquare = this.createSquareImage(this.LIGHT_SQUARE_COLOR);
    const darkSquare = this.createSquareImage(this.DARK_SQUARE_COLOR);
    console.timeEnd('[PERF] Create square images');

    console.time('[PERF] Register square resources');
    await this.a.resources.registerResource('chess-square-light', lightSquare);
    await this.a.resources.registerResource('chess-square-dark', darkSquare);
    console.timeEnd('[PERF] Register square resources');

    // Register all 12 piece types (white and black)
    const pieceTypes: Array<{ color: Color; type: PieceSymbol }> = [
      { color: 'w', type: 'k' }, { color: 'w', type: 'q' }, { color: 'w', type: 'r' },
      { color: 'w', type: 'b' }, { color: 'w', type: 'n' }, { color: 'w', type: 'p' },
      { color: 'b', type: 'k' }, { color: 'b', type: 'q' }, { color: 'b', type: 'r' },
      { color: 'b', type: 'b' }, { color: 'b', type: 'n' }, { color: 'b', type: 'p' },
    ];

    console.time('[PERF] Register 12 piece resources');
    for (const { color, type } of pieceTypes) {
      const pieceImage = this.getPieceImage(color, type);
      const resourceName = `chess-piece-${color}-${type}`;
      await this.a.resources.registerResource(resourceName, pieceImage);
    }
    console.timeEnd('[PERF] Register 12 piece resources');

    this.resourcesRegistered = true;
    console.log('Chess resources registered (14 total: 2 squares + 12 pieces)');
    console.timeEnd('[PERF] registerChessResources');
  }

  /**
   * Get the base64 PNG data for a piece
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
    // Window is 800x800, board starts at y=80 (after buttons/status)
    // Each square is 100x100
    const boardStartY = 80;
    const squareSize = 100;

    const boardX = x;
    const boardY = y - boardStartY;

    if (boardX < 0 || boardX >= 800 || boardY < 0 || boardY >= 800) {
      await this.updateStatus('Invalid drop location');
      // No board update needed - nothing changed
      return;
    }

    const file = Math.floor(boardX / squareSize);
    const rank = Math.floor(boardY / squareSize);
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

    // Small delay to make it feel more natural (much faster in test mode)
    // Detect test mode by checking for Jest or explicit test mode env var
    const isTestMode = process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';
    const delay = isTestMode ? 10 : 500;
    await new Promise(resolve => setTimeout(resolve, delay));

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
   * Create a colored square image
   */
  private createSquareImage(color: string, pieceImage?: string): string {
    const size = 100;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="${color}"/>`;

    if (pieceImage) {
      // Embed the piece image
      svg += `<image href="${pieceImage}" x="10" y="10" width="80" height="80"/>`;
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
   */
  private rebuildUI(): void {
    if (!this.window) return;

    this.window.setContent(() => {
      this.buildUI(this.window!);
    });
  }

  buildUI(win: Window): void {
    console.time('[PERF] buildUI');
    this.window = win;

    // Clear old widget references before rebuild
    this.squareImages.clear();
    this.squareBackgrounds.clear();
    this.pieceForegrounds.clear();

    const board = this.game.board();

    let squareImageCreations = 0;
    console.time('[PERF] buildUI - vbox creation');

    this.a.vbox(() => {
      // Action buttons
      this.a.hbox(() => {
        this.a.button('New Game', () => this.newGame());
      });

      // Status
      this.statusLabel = this.a.label(this.currentStatus);

      console.timeEnd('[PERF] buildUI - vbox creation');
      console.time('[PERF] buildUI - board squares');

      // Chess board - 8x8 grid
      for (let rank = 0; rank < 8; rank++) {
        this.a.hbox(() => {
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
        });
      }
      console.timeEnd('[PERF] buildUI - board squares');
    });
    console.log(`[PERF] buildUI created ${squareImageCreations} square+piece composite images`);
    console.timeEnd('[PERF] buildUI');
  }

  private async newGame(): Promise<void> {
    this.game.reset();
    this.selectedSquare = null;
    this.draggedSquare = null;
    this.isComputerThinking = false;
    this.currentStatus = 'White to move';

    // Use rebuildUI for new game (happens infrequently, very fast)
    // Incremental updates are only used for individual moves
    this.rebuildUI();
    await this.updateStatus('New game started');
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
 */
export async function createChessApp(a: App): Promise<ChessUI> {
  console.time('[PERF] createChessApp TOTAL');

  console.time('[PERF] ChessUI instantiation');
  const ui = new ChessUI(a);
  console.timeEnd('[PERF] ChessUI instantiation');

  // Register chess resources before building UI
  await ui['registerChessResources']();

  console.time('[PERF] Create window and build UI');
  a.window({ title: 'Chess', width: 800, height: 880 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });
  console.timeEnd('[PERF] Create window and build UI');

  console.timeEnd('[PERF] createChessApp TOTAL');
  return ui;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Chess' }, async (a: App) => {
    await createChessApp(a);
  });
}
