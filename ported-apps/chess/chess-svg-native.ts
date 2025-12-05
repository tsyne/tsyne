/**
 * Chess Game for Tsyne (Simplified)
 *
 * Ported from https://github.com/andydotxyz/chess
 * Original author: Andy Williams
 * License: See original repository
 *
 * This version uses Fyne's native SVG support instead of runtime rendering.
 * Much simpler and faster than the original SVG→PNG conversion approach.
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import * as path from 'path';
import * as fs from 'fs';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Color } from 'chess.js';

/**
 * Chess UI class
 */
class ChessUI {
  private game: Chess;
  private statusLabel: any = null;
  private currentStatus: string = 'White to move';
  private selectedSquare: Square | null = null;
  private draggedSquare: Square | null = null;
  private window: Window | null = null;
  private playerColor: Color = 'w'; // Player plays white, computer plays black
  private isComputerThinking: boolean = false;
  private squareImages: Map<Square, any> = new Map(); // Max container references for all 64 squares
  private squareBackgrounds: Map<Square, any> = new Map(); // Background image widgets
  private pieceForegrounds: Map<Square, any> = new Map(); // Piece image widgets
  private piecesDir: string;

  constructor(private a: App) {
    this.game = new Chess();

    // Find pieces directory
    const possiblePaths = [
      path.join(process.cwd(), 'pieces'),
      path.join(process.cwd(), 'examples/chess/pieces'),
      path.join(process.cwd(), '../examples/chess/pieces'),
      path.join(__dirname, 'pieces')
    ];

    this.piecesDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[3];
  }

  /**
   * Get the SVG file path for a piece
   */
  private getPiecePath(color: Color, piece: PieceSymbol): string {
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
    return path.join(this.piecesDir, `${colorName}${pieceName}.svg`);
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
      return;
    }

    const square = this.coordsToSquare(file, rank);
    const piece = this.game.get(square);

    if (!this.selectedSquare) {
      if (piece && piece.color === this.playerColor) {
        this.selectedSquare = square;
        await this.updateStatus(`Selected ${this.getPieceName(piece.type)} at ${square}`);
        await this.updateSquare(square);
      }
      return;
    }

    if (this.selectedSquare === square) {
      const previouslySelected = this.selectedSquare;
      this.selectedSquare = null;
      await this.updateStatus(this.getGameStatus());
      await this.updateSquare(previouslySelected);
      return;
    }

    const from = this.selectedSquare;
    const to = square;

    try {
      const move = this.game.move({ from, to });
      this.selectedSquare = null;

      if (move) {
        await this.updateStatus(`${this.getPieceName(move.piece)} ${from} → ${to}`);
        await this.updateSquare(from);
        await this.updateSquare(to);

        if (this.game.isGameOver()) {
          await this.handleGameOver();
        } else {
          await this.makeComputerMove();
        }
      }
    } catch (e) {
      const previouslySelected = this.selectedSquare;
      if (piece && piece.color === this.playerColor) {
        this.selectedSquare = square;
        await this.updateStatus(`Selected ${this.getPieceName(piece.type)} at ${square}`);
        if (previouslySelected) await this.updateSquare(previouslySelected);
        await this.updateSquare(square);
      } else {
        await this.updateStatus('Invalid move');
        this.selectedSquare = null;
        if (previouslySelected) await this.updateSquare(previouslySelected);
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
    const boardStartY = 20;  // Account for status label
    const squareSize = 100;
    const boardX = x;
    const boardY = y - boardStartY;

    if (boardX < 0 || boardX >= 800 || boardY < 0 || boardY >= 800) {
      await this.updateStatus('Invalid drop location');
      return;
    }

    const file = Math.floor(boardX / squareSize);
    const rank = Math.floor(boardY / squareSize);
    const to = this.coordsToSquare(file, rank);

    try {
      const move = this.game.move({ from, to });

      if (move) {
        await this.updateStatus(`${this.getPieceName(move.piece)} ${from} → ${to}`);
        await this.updateSquare(from);
        await this.updateSquare(to);

        if (this.game.isGameOver()) {
          await this.handleGameOver();
        } else {
          await this.makeComputerMove();
        }
      }
    } catch (e) {
      await this.updateStatus('Invalid move');
    }
  }

  /**
   * Make a computer move (random legal move)
   */
  private async makeComputerMove(): Promise<void> {
    this.isComputerThinking = true;
    await this.updateStatus('Computer is thinking...');

    const isTestMode = process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test';
    const delay = isTestMode ? 10 : 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    const moves = this.game.moves({ verbose: true });

    if (moves.length === 0) {
      this.isComputerThinking = false;
      return;
    }

    const randomMove = moves[Math.floor(Math.random() * moves.length)];

    try {
      this.game.move({ from: randomMove.from, to: randomMove.to });
      await this.updateStatus(`Computer: ${this.getPieceName(randomMove.piece)} ${randomMove.from} → ${randomMove.to}`);
      await this.updateSquare(randomMove.from as Square);
      await this.updateSquare(randomMove.to as Square);

      this.isComputerThinking = false;

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
   * Update a single square by updating the child widgets in the Max container
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

    // Update background square (highlighted or normal)
    const squarePath = this.getSquarePath(square);
    await squareBackground.updateImage({ path: squarePath });

    // Update foreground piece
    if (squareData) {
      const piecePath = this.getPiecePath(squareData.color, squareData.type);
      await pieceForeground.updateImage({ path: piecePath });
    } else {
      // Empty square - hide piece by making it transparent
      await pieceForeground.updateImage({ path: this.getTransparentSquarePath() });
    }
  }

  /**
   * Get the SVG file path for a colored square
   */
  private getSquarePath(square: Square): string {
    if (this.selectedSquare === square) {
      return path.join(this.piecesDir, 'square-selected.svg');
    }
    const coords = this.squareToCoords(square);
    const isLight = (coords.file + coords.rank) % 2 === 1;
    return path.join(this.piecesDir, isLight ? 'square-light.svg' : 'square-dark.svg');
  }

  /**
   * Get path to transparent square
   */
  private getTransparentSquarePath(): string {
    return path.join(this.piecesDir, 'square-transparent.svg');
  }

  /**
   * Rebuild the UI to reflect game state changes
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

      // Chess board - 8x8 grid
      for (let rank = 0; rank < 8; rank++) {
        this.a.hbox(() => {
          for (let file = 0; file < 8; file++) {
            const square = this.coordsToSquare(file, rank);
            const squareData = board[rank][file];

            let squareBackground: any;
            let pieceForeground: any;

            const imageWidget = this.a.max(() => {
              // Bottom layer: Square background (use pre-made colored square SVGs)
              const squarePath = this.getSquarePath(square);
              squareBackground = this.a.image({ path: squarePath, fillMode: 'original' }).withId(`bg-${square}`);

              // Top layer: Piece or transparent overlay
              const piecePath = squareData
                ? this.getPiecePath(squareData.color, squareData.type)
                : this.getTransparentSquarePath();

              if (squareData && squareData.color === this.playerColor) {
                // Player's piece - clickable and draggable
                pieceForeground = this.a.image({
                  path: piecePath,
                  fillMode: 'original',
                  onClick: () => this.handleSquareClick(file, rank),
                  onDrag: (x: number, y: number) => this.handleSquareDrag(file, rank, x, y),
                  onDragEnd: (x: number, y: number) => this.handleSquareDragEnd(x, y)
                }).withId(`piece-${square}`);
              } else {
                // Opponent's piece or empty square - clickable only
                pieceForeground = this.a.image({
                  path: piecePath,
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
    });
  }

  private async newGame(): Promise<void> {
    this.game.reset();
    this.selectedSquare = null;
    this.draggedSquare = null;
    this.isComputerThinking = false;
    this.currentStatus = 'White to move';

    this.rebuildUI();
    await this.updateStatus('New game started');
  }

  private async updateStatus(message: string): Promise<void> {
    this.currentStatus = message;
    if (this.statusLabel) {
      await this.statusLabel.setText(message);
    }
  }

  getGame(): Chess {
    return this.game;
  }

  refreshUI(): void {
    this.rebuildUI();
  }
}

/**
 * Create the chess app
 */
export async function createChessApp(a: App): Promise<ChessUI> {
  const ui = new ChessUI(a);

  a.window({ title: 'Chess', width: 800, height: 820 }, (win: Window) => {
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
  app({ title: 'Chess' }, async (a: App) => {
    await createChessApp(a);
  });
}
