/**
 * Chess Logic Unit Tests
 *
 * Fast unit tests for pure functions and business logic.
 * No UI interaction, no bridge communication.
 * Target: < 100ms total execution time
 */

import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';

describe('Chess Logic (Unit Tests)', () => {
  describe('coordinate conversion utilities', () => {
    function coordsToSquare(file: number, rank: number): Square {
      const files = 'abcdefgh';
      const ranks = '87654321'; // Rank 0 is 8, rank 7 is 1
      return `${files[file]}${ranks[rank]}` as Square;
    }

    function squareToCoords(square: Square): { file: number; rank: number } {
      const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
      const rank = 8 - parseInt(square[1]);
      return { file, rank };
    }

    test('coordsToSquare converts top-left to a8', () => {
      expect(coordsToSquare(0, 0)).toBe('a8');
    });

    test('coordsToSquare converts top-right to h8', () => {
      expect(coordsToSquare(7, 0)).toBe('h8');
    });

    test('coordsToSquare converts bottom-left to a1', () => {
      expect(coordsToSquare(0, 7)).toBe('a1');
    });

    test('coordsToSquare converts bottom-right to h1', () => {
      expect(coordsToSquare(7, 7)).toBe('h1');
    });

    test('coordsToSquare converts center squares correctly', () => {
      expect(coordsToSquare(4, 4)).toBe('e4'); // King's pawn opening
      expect(coordsToSquare(3, 3)).toBe('d5');
    });

    test('squareToCoords converts a8 to (0, 0)', () => {
      expect(squareToCoords('a8' as Square)).toEqual({ file: 0, rank: 0 });
    });

    test('squareToCoords converts h1 to (7, 7)', () => {
      expect(squareToCoords('h1' as Square)).toEqual({ file: 7, rank: 7 });
    });

    test('squareToCoords converts e4 correctly', () => {
      expect(squareToCoords('e4' as Square)).toEqual({ file: 4, rank: 4 });
    });

    test('coordinate conversion is reversible', () => {
      const testSquares: Square[] = ['a1', 'a8', 'h1', 'h8', 'e4', 'd5', 'c3'];

      for (const square of testSquares) {
        const coords = squareToCoords(square);
        const backToSquare = coordsToSquare(coords.file, coords.rank);
        expect(backToSquare).toBe(square);
      }
    });
  });

  describe('square color calculation', () => {
    function getSquareColor(file: number, rank: number): 'light' | 'dark' {
      return (file + rank) % 2 === 0 ? 'dark' : 'light';
    }

    test('a1 is light square', () => {
      expect(getSquareColor(0, 7)).toBe('light');
    });

    test('a8 is dark square', () => {
      expect(getSquareColor(0, 0)).toBe('dark');
    });

    test('h1 is dark square', () => {
      expect(getSquareColor(7, 7)).toBe('dark');
    });

    test('h8 is light square', () => {
      expect(getSquareColor(7, 0)).toBe('light');
    });

    test('e4 (classic opening square) is dark', () => {
      expect(getSquareColor(4, 4)).toBe('dark');
    });

    test('d4 (classic opening square) is light', () => {
      expect(getSquareColor(3, 4)).toBe('light');
    });

    test('alternating pattern in rank 1', () => {
      expect(getSquareColor(0, 7)).toBe('light'); // a1
      expect(getSquareColor(1, 7)).toBe('dark');  // b1
      expect(getSquareColor(2, 7)).toBe('light'); // c1
      expect(getSquareColor(3, 7)).toBe('dark');  // d1
      expect(getSquareColor(4, 7)).toBe('light'); // e1
      expect(getSquareColor(5, 7)).toBe('dark');  // f1
      expect(getSquareColor(6, 7)).toBe('light'); // g1
      expect(getSquareColor(7, 7)).toBe('dark');  // h1
    });
  });

  describe('piece name formatting', () => {
    function getPieceName(piece: PieceSymbol): string {
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

    test('converts k to King', () => {
      expect(getPieceName('k')).toBe('King');
    });

    test('converts q to Queen', () => {
      expect(getPieceName('q')).toBe('Queen');
    });

    test('converts r to Rook', () => {
      expect(getPieceName('r')).toBe('Rook');
    });

    test('converts b to Bishop', () => {
      expect(getPieceName('b')).toBe('Bishop');
    });

    test('converts n to Knight', () => {
      expect(getPieceName('n')).toBe('Knight');
    });

    test('converts p to Pawn', () => {
      expect(getPieceName('p')).toBe('Pawn');
    });
  });

  describe('chess.js game logic', () => {
    let game: Chess;

    beforeEach(() => {
      game = new Chess();
    });

    test('new game starts with white to move', () => {
      expect(game.turn()).toBe('w');
    });

    test('new game has 20 possible opening moves', () => {
      // 16 pawn moves (8 pawns × 2 squares each) + 4 knight moves (2 knights × 2 squares each)
      expect(game.moves().length).toBe(20);
    });

    test('pawn can move one square forward', () => {
      const move = game.move({ from: 'e2', to: 'e3' });
      expect(move).not.toBeNull();
      expect(move?.piece).toBe('p');
    });

    test('pawn can move two squares forward on first move', () => {
      const move = game.move({ from: 'e2', to: 'e4' });
      expect(move).not.toBeNull();
      expect(move?.piece).toBe('p');
    });

    test('pawn cannot move three squares', () => {
      expect(() => game.move({ from: 'e2', to: 'e5' })).toThrow();
    });

    test('knight can jump over pawns', () => {
      const move = game.move({ from: 'b1', to: 'c3' });
      expect(move).not.toBeNull();
      expect(move?.piece).toBe('n');
    });

    test('bishop cannot move through pawns', () => {
      expect(() => game.move({ from: 'c1', to: 'a3' })).toThrow();
    });

    test('cannot move opponent pieces', () => {
      expect(() => game.move({ from: 'e7', to: 'e5' })).toThrow();
    });

    test('turn switches after valid move', () => {
      expect(game.turn()).toBe('w');
      game.move({ from: 'e2', to: 'e4' });
      expect(game.turn()).toBe('b');
    });

    test('game is not over at start', () => {
      expect(game.isGameOver()).toBe(false);
      expect(game.isCheckmate()).toBe(false);
      expect(game.isStalemate()).toBe(false);
      expect(game.isDraw()).toBe(false);
    });

    test('game detects check', () => {
      // Fool's mate setup
      game.move({ from: 'f2', to: 'f3' });
      game.move({ from: 'e7', to: 'e5' });
      game.move({ from: 'g2', to: 'g4' });
      game.move({ from: 'd8', to: 'h4' }); // Check!

      expect(game.isCheck()).toBe(true);
    });

    test('game detects checkmate (Fool\'s Mate)', () => {
      game.move({ from: 'f2', to: 'f3' });
      game.move({ from: 'e7', to: 'e5' });
      game.move({ from: 'g2', to: 'g4' });
      game.move({ from: 'd8', to: 'h4' }); // Checkmate!

      expect(game.isCheckmate()).toBe(true);
      expect(game.isGameOver()).toBe(true);
    });

    test('reset restores initial position', () => {
      game.move({ from: 'e2', to: 'e4' });
      game.move({ from: 'e7', to: 'e5' });

      expect(game.turn()).toBe('w');
      expect(game.history().length).toBe(2);

      game.reset();

      expect(game.turn()).toBe('w');
      expect(game.history().length).toBe(0);
      expect(game.get('e2' as Square)?.type).toBe('p');
      expect(game.get('e4' as Square)).toBeUndefined();
    });
  });

  describe('computer move selection', () => {
    test('selects valid move from available options', () => {
      const game = new Chess();
      const moves = game.moves({ verbose: true });

      expect(moves.length).toBeGreaterThan(0);

      // Simulate computer picking random move
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const result = game.move({ from: randomMove.from, to: randomMove.to });

      expect(result).not.toBeNull();
      expect(result?.from).toBe(randomMove.from);
      expect(result?.to).toBe(randomMove.to);
    });

    test('has no valid moves when in checkmate', () => {
      const game = new Chess();

      // Set up checkmate position
      game.move({ from: 'f2', to: 'f3' });
      game.move({ from: 'e7', to: 'e5' });
      game.move({ from: 'g2', to: 'g4' });
      game.move({ from: 'd8', to: 'h4' });

      const moves = game.moves();
      expect(moves.length).toBe(0);
    });

    test('returns different moves on multiple calls (randomness)', () => {
      const game = new Chess();
      const moves = game.moves({ verbose: true });

      const selections = new Set();
      for (let i = 0; i < 10; i++) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        selections.add(`${randomMove.from}-${randomMove.to}`);
      }

      // With 20 possible moves, getting variety in 10 selections is expected
      expect(selections.size).toBeGreaterThan(1);
    });
  });

  describe('game status messages', () => {
    function getGameStatus(game: Chess): string {
      if (game.isCheck()) {
        return `${game.turn() === 'w' ? 'White' : 'Black'} to move (Check!)`;
      }
      return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
    }

    test('shows white to move at start', () => {
      const game = new Chess();
      expect(getGameStatus(game)).toBe('White to move');
    });

    test('shows black to move after white moves', () => {
      const game = new Chess();
      game.move({ from: 'e2', to: 'e4' });
      expect(getGameStatus(game)).toBe('Black to move');
    });

    test('shows check indicator when in check', () => {
      const game = new Chess();
      game.move({ from: 'f2', to: 'f3' });
      game.move({ from: 'e7', to: 'e5' });
      game.move({ from: 'g2', to: 'g4' });
      game.move({ from: 'd8', to: 'h4' });

      expect(getGameStatus(game)).toBe('White to move (Check!)');
    });
  });

  describe('board state queries', () => {
    test('get returns piece at square', () => {
      const game = new Chess();

      expect(game.get('e2' as Square)?.type).toBe('p');
      expect(game.get('e2' as Square)?.color).toBe('w');
      expect(game.get('e1' as Square)?.type).toBe('k');
      expect(game.get('d8' as Square)?.type).toBe('q');
    });

    test('get returns undefined for empty square', () => {
      const game = new Chess();
      expect(game.get('e4' as Square)).toBeUndefined();
    });

    test('board returns 8x8 array', () => {
      const game = new Chess();
      const board = game.board();

      expect(board.length).toBe(8);
      expect(board[0].length).toBe(8);
    });

    test('history tracks move sequence', () => {
      const game = new Chess();

      expect(game.history().length).toBe(0);

      game.move({ from: 'e2', to: 'e4' });
      expect(game.history()).toEqual(['e4']);

      game.move({ from: 'e7', to: 'e5' });
      expect(game.history()).toEqual(['e4', 'e5']);
    });
  });
});
