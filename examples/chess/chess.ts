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
  private squareImages: Map<Square, any> = new Map(); // Image widget references for all 64 squares

  // Light and dark square colors (in RGB hex)
  private readonly LIGHT_SQUARE_COLOR = '#f0d9b5';
  private readonly DARK_SQUARE_COLOR = '#b58863';
  private readonly SELECTED_COLOR = '#7fc97f';
  private readonly VALID_MOVE_COLOR = '#9fdf9f';

  constructor(private a: App) {
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
   * Update a single square's image
   */
  private async updateSquare(square: Square): Promise<void> {
    const imageWidget = this.squareImages.get(square);
    if (!imageWidget) {
      return;
    }

    const coords = this.squareToCoords(square);
    const board = this.game.board();
    const squareData = board[coords.rank][coords.file];
    const baseColor = this.getSquareColor(coords.file, coords.rank);

    // Highlight selected square
    let squareColor = baseColor;
    if (this.selectedSquare === square) {
      squareColor = this.SELECTED_COLOR;
    }

    // Get piece image if there's a piece on this square
    let pieceImage: string | undefined;
    if (squareData) {
      pieceImage = this.getPieceImage(squareData.color, squareData.type);
    }

    // Create the square image
    const squareImage = this.createSquareImage(squareColor, pieceImage);

    // Update the image widget
    await imageWidget.updateImage(squareImage);
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
    this.window = win;

    // Clear old widget references before rebuild
    this.squareImages.clear();

    const board = this.game.board();

    this.a.vbox(() => {
      // Action buttons
      this.a.hbox(() => {
        this.a.button('New Game', () => this.newGame());
      });

      // Status
      this.statusLabel = this.a.label(this.currentStatus);

      // Chess board - 8x8 grid
      for (let rank = 0; rank < 8; rank++) {
        this.a.hbox(() => {
          for (let file = 0; file < 8; file++) {
            const square = this.coordsToSquare(file, rank);
            const squareData = board[rank][file];
            const baseColor = this.getSquareColor(file, rank);

            // Highlight selected square
            let squareColor = baseColor;
            if (this.selectedSquare === square) {
              squareColor = this.SELECTED_COLOR;
            }

            // Get piece image if there's a piece on this square
            let pieceImage: string | undefined;
            if (squareData) {
              pieceImage = this.getPieceImage(squareData.color, squareData.type);
            }

            // Create the square image
            const squareImage = this.createSquareImage(squareColor, pieceImage);

            // Make square clickable and draggable if it has a piece
            let imageWidget;
            if (squareData && squareData.color === this.playerColor) {
              imageWidget = this.a.image(
                squareImage,
                'original',
                () => this.handleSquareClick(file, rank),
                (x: number, y: number) => this.handleSquareDrag(file, rank, x, y),
                (x: number, y: number) => this.handleSquareDragEnd(x, y)
              ).withId(`square-${square}`);
            } else {
              // Empty square or opponent's piece - still clickable for moves
              imageWidget = this.a.image(
                squareImage,
                'original',
                () => this.handleSquareClick(file, rank)
              ).withId(`square-${square}`);
            }

            // Store reference to the image widget for incremental updates
            this.squareImages.set(square, imageWidget);
          }
        });
      }
    });
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
export function createChessApp(a: App): ChessUI {
  const ui = new ChessUI(a);

  a.window({ title: 'Chess', width: 800, height: 880 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Chess' }, (a: App) => {
    createChessApp(a);
  });
}
