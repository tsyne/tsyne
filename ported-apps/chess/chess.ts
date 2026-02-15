/**
 * Chess Game for Tsyne
 *
 * Ported from https://github.com/andydotxyz/chess
 * Original author: Andy Williams
 * License: See original repository
 *
 * This is a port to demonstrate chess game capabilities in Tsyne.
 * Uses chess.js for game logic and CVG for vector piece rendering.
 */

/*
 * @tsyne-app:name Chess
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="#333333"><path d="M19 22H5v-2h14v2zm-3-4H8l-1-4 2-1v-2c0-1 1-3 2-4l-1-2 1-1 1 1c1-1 2-1 3 0l1-1 1 1-1 2c1 1 2 3 2 4v2l2 1-1 4z"/></svg>
 * @tsyne-app:category games
 * @tsyne-app:builder createChessApp
 * @tsyne-app:args app
 * @tsyne-app:count many
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { cvg } from 'cosyne';
import type { CvgContext } from 'cosyne';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Color } from 'chess.js';
import {
  drawWhitePawn, drawBlackPawn,
  drawWhiteKnight, drawBlackKnight,
  drawWhiteBishop, drawBlackBishop,
  drawWhiteRook, drawBlackRook,
  drawWhiteQueen, drawBlackQueen,
  drawWhiteKing, drawBlackKing,
} from './chess-pieces-cvg';

// Piece type → draw function lookup
const PIECE_DRAW_MAP: Record<string, (s: CvgContext, when: () => boolean) => void> = {
  'w-k': drawWhiteKing,
  'w-q': drawWhiteQueen,
  'w-r': drawWhiteRook,
  'w-b': drawWhiteBishop,
  'w-n': drawWhiteKnight,
  'w-p': drawWhitePawn,
  'b-k': drawBlackKing,
  'b-q': drawBlackQueen,
  'b-r': drawBlackRook,
  'b-b': drawBlackBishop,
  'b-n': drawBlackKnight,
  'b-p': drawBlackPawn,
};

// SVG viewBox size for piece files
const SQUARE = 45;

// ============================================================================
// Chess UI
// ============================================================================

class ChessUI {
  private game: Chess;
  private currentStatus: string = 'White to move';
  private selectedSquare: Square | null = null;
  private window: Window | null = null;
  private playerColor: Color = 'w';
  private isComputerThinking: boolean = false;
  private cvgCtx: CvgContext = null as any;

  private readonly LIGHT_SQUARE_COLOR = '#f0d9b5';
  private readonly DARK_SQUARE_COLOR = '#b58863';
  private readonly SELECTED_COLOR = '#7fc97f';

  private readonly aiDelayMs: number;

  constructor(private a: App, aiDelayMs: number = 500) {
    this.aiDelayMs = aiDelayMs;
    this.game = new Chess();
  }

  /**
   * Convert board coordinates to square notation
   * rank: 0=top row (rank 8) to 7=bottom row (rank 1)
   */
  private coordsToSquare(file: number, rank: number): Square {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return `${files[file]}${ranks[rank]}` as Square;
  }

  /**
   * Get the fill color for a square, accounting for selection highlighting
   */
  private getSquareColor(sq: Square, isLight: boolean): string {
    if (this.selectedSquare === sq) {
      return this.SELECTED_COLOR;
    }
    return isLight ? this.LIGHT_SQUARE_COLOR : this.DARK_SQUARE_COLOR;
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
        await this.refreshBoard();
      }
      return;
    }

    if (this.selectedSquare === square) {
      this.selectedSquare = null;
      await this.updateStatus(this.getGameStatus());
      await this.refreshBoard();
      return;
    }

    const from = this.selectedSquare;
    const to = square;

    try {
      const move = this.game.move({ from, to });
      this.selectedSquare = null;

      if (move) {
        if (this.game.isGameOver()) {
          await this.setGameOverStatus();
        } else {
          await this.updateStatus(`${this.getPieceName(move.piece)} ${from} → ${to}`);
        }
        await this.refreshBoard();

        if (!this.game.isGameOver()) {
          await this.makeComputerMove();
        }
      }
    } catch (e) {
      if (piece && piece.color === this.playerColor) {
        this.selectedSquare = square;
        await this.updateStatus(`Selected ${this.getPieceName(piece.type)} at ${square}`);
      } else {
        await this.updateStatus('Invalid move');
        this.selectedSquare = null;
      }
      await this.refreshBoard();
    }
  }

  /**
   * Make a computer move (random legal move)
   */
  private async makeComputerMove(): Promise<void> {
    this.isComputerThinking = true;
    await this.updateStatus('Computer is thinking...');

    await new Promise(resolve => setTimeout(resolve, this.aiDelayMs));

    const moves = this.game.moves({ verbose: true });

    if (moves.length === 0) {
      this.isComputerThinking = false;
      return;
    }

    const randomMove = moves[Math.floor(Math.random() * moves.length)];

    try {
      this.game.move({ from: randomMove.from, to: randomMove.to });
      await this.updateStatus(`Computer: ${this.getPieceName(randomMove.piece)} ${randomMove.from} → ${randomMove.to}`);
      await this.refreshBoard();

      this.isComputerThinking = false;

      if (this.game.isGameOver()) {
        await this.setGameOverStatus();
      } else {
        await this.updateStatus(this.getGameStatus());
      }
    } catch (e) {
      this.isComputerThinking = false;
      await this.updateStatus('Computer move error');
    }
  }

  private async setGameOverStatus(): Promise<void> {
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

  private getGameStatus(): string {
    if (this.game.isCheck()) {
      return `${this.game.turn() === 'w' ? 'White' : 'Black'} to move (Check!)`;
    }
    return `${this.game.turn() === 'w' ? 'White' : 'Black'} to move`;
  }

  private getPieceName(piece: PieceSymbol): string {
    const names: Record<PieceSymbol, string> = {
      'k': 'King', 'q': 'Queen', 'r': 'Rook',
      'b': 'Bishop', 'n': 'Knight', 'p': 'Pawn'
    };
    return names[piece] || piece;
  }

  buildUI(win: Window): void {
    this.window = win;

    this.a.vbox(() => {
      this.a.label('').bindText(() => this.currentStatus).withId('status');

      this.cvgCtx = cvg(this.a, {
        viewBox: `0 0 ${8 * SQUARE} ${8 * SQUARE}`,
        width: 800, height: 800
      }, (s) => {
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const sq = this.coordsToSquare(file, rank) as Square;
            const x = file * SQUARE;
            const y = rank * SQUARE;
            const isLight = (file + rank) % 2 !== 0;

            s.rect({
              x, y, width: SQUARE, height: SQUARE,
              fill: isLight ? this.LIGHT_SQUARE_COLOR : this.DARK_SQUARE_COLOR,
              bindFill: () => this.getSquareColor(sq, isLight),
              onClick: () => this.handleSquareClick(file, rank),
            });

            s.g({ transform: { translate: [x, y] } }, () => {
              for (const [key, drawFn] of Object.entries(PIECE_DRAW_MAP)) {
                const [color, type] = key.split('-') as [Color, PieceSymbol];
                drawFn(s, () => {
                  const p = this.game.get(sq);
                  return !!p && p.color === color && p.type === type;
                });
              }
            });
          }
        }
        s.enableEvents();
      });
    }, { spacing: 0 });
  }

  private async refreshBoard(): Promise<void> {
    await this.cvgCtx.refresh();
  }

  /**
   * Simulate a click on a square (for tests)
   */
  public clickSquare(sq: Square): void {
    const file = sq.charCodeAt(0) - 97;
    const rank = 8 - parseInt(sq[1]);
    // Convert viewBox coords to canvas coords using the mapping
    const m = this.cvgCtx.getMapping();
    const vbX = file * SQUARE + SQUARE / 2;
    const vbY = rank * SQUARE + SQUARE / 2;
    const [cx, cy] = m.transform.apply(vbX, vbY);
    this.cvgCtx.dispatchTap(cx, cy);
  }

  public async newGame(): Promise<void> {
    this.game.reset();
    this.selectedSquare = null;
    this.isComputerThinking = false;
    await this.updateStatus('White to move');
    await this.refreshBoard();
  }

  // ============================================================================
  // Smart Board Query Methods (for testing)
  // ============================================================================

  public countPawnsInRow(row: number): number {
    return this.countPiecesInRow(row, undefined, 'p');
  }

  public countPiecesInRow(row: number, color?: Color, type?: PieceSymbol): number {
    const pieces = this.getPiecesInRow(row);
    return pieces.filter(p => {
      if (color && p.color !== color) return false;
      if (type && p.type !== type) return false;
      return true;
    }).length;
  }

  public getPiecesInRow(row: number): Array<{ square: Square; color: Color; type: PieceSymbol }> {
    const files = 'abcdefgh';
    const pieces: Array<{ square: Square; color: Color; type: PieceSymbol }> = [];

    for (const file of files) {
      const square = `${file}${row}` as Square;
      const piece = this.game.get(square);
      if (piece) {
        pieces.push({ square, color: piece.color, type: piece.type });
      }
    }

    return pieces;
  }

  public getBoard(): Array<Array<{ color: Color; type: PieceSymbol } | null>> {
    const board: Array<Array<{ color: Color; type: PieceSymbol } | null>> = [];
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

  public getPiece(square: Square): { color: Color; type: PieceSymbol } | null {
    const piece = this.game.get(square);
    return piece ? { color: piece.color, type: piece.type } : null;
  }

  public getFEN(): string {
    return this.game.fen();
  }

  private async updateStatus(message: string): Promise<void> {
    this.currentStatus = message;
    await this.a.refreshBindings('status');
  }

  getGame(): Chess {
    return this.game;
  }
}

/**
 * Create the chess app
 */
export async function createChessApp(a: App, aiDelayMs?: number): Promise<ChessUI> {
  const ui = new ChessUI(a, aiDelayMs);

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
  const appInstance = app(resolveTransport(), { title: 'Chess' }, async (a: App) => {
    await createChessApp(a);
    appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
  });
}
