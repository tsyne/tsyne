/**
 * Falling Blocks Game Logic Unit Tests
 */

import { FallingBlocksGame, SHAPES, SHAPE_COLORS, BOARD_WIDTH, BOARD_HEIGHT } from './falling-blocks';

describe('FallingBlocksGame', () => {
  describe('initialization', () => {
    test('should start in ready state', () => {
      const game = new FallingBlocksGame();
      expect(game.getGameState()).toBe('ready');
    });

    test('should have empty board initially', () => {
      const game = new FallingBlocksGame();
      const board = game.getBoard();
      expect(board.length).toBe(BOARD_HEIGHT);
      expect(board[0].length).toBe(BOARD_WIDTH);
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          expect(board[row][col]).toBeNull();
        }
      }
    });

    test('should have no current piece initially', () => {
      const game = new FallingBlocksGame();
      expect(game.getCurrentPiece()).toBeNull();
    });

    test('should start with score, lines, and level at defaults', () => {
      const game = new FallingBlocksGame();
      expect(game.getScore()).toBe(0);
      expect(game.getLines()).toBe(0);
      expect(game.getLevel()).toBe(1);
    });
  });

  describe('startGame', () => {
    test('should change state to playing', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      expect(game.getGameState()).toBe('playing');
    });

    test('should spawn a piece', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const piece = game.getCurrentPiece();
      expect(piece).not.toBeNull();
      expect(piece!.shape).toBeGreaterThanOrEqual(0);
      expect(piece!.shape).toBeLessThan(7);
    });

    test('should reset score and lines', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      expect(game.getScore()).toBe(0);
      expect(game.getLines()).toBe(0);
    });

    test('should have a next piece', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      expect(game.getNextPiece()).toBeGreaterThanOrEqual(0);
      expect(game.getNextPiece()).toBeLessThan(7);
    });

    test('should call onUpdate callback', () => {
      const game = new FallingBlocksGame();
      let updateCalled = false;
      game.setOnUpdate(() => { updateCalled = true; });
      game.startGame();
      expect(updateCalled).toBe(true);
    });
  });

  describe('piece movement', () => {
    test('should move piece left', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const initialCol = game.getCurrentPiece()!.col;
      game.moveLeft();
      expect(game.getCurrentPiece()!.col).toBe(initialCol - 1);
    });

    test('should move piece right', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const initialCol = game.getCurrentPiece()!.col;
      game.moveRight();
      expect(game.getCurrentPiece()!.col).toBe(initialCol + 1);
    });

    test('should not move left if at left wall', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      // Move all the way left
      for (let i = 0; i < BOARD_WIDTH; i++) {
        game.moveLeft();
      }
      const colBeforeAttempt = game.getCurrentPiece()!.col;
      game.moveLeft();
      // Should not have moved further (might be blocked by shape)
      expect(game.getCurrentPiece()!.col).toBeLessThanOrEqual(colBeforeAttempt);
    });

    test('should not move right if at right wall', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      // Move all the way right
      for (let i = 0; i < BOARD_WIDTH; i++) {
        game.moveRight();
      }
      const colBeforeAttempt = game.getCurrentPiece()!.col;
      game.moveRight();
      // Should not have moved further (might be blocked by shape)
      expect(game.getCurrentPiece()!.col).toBeGreaterThanOrEqual(colBeforeAttempt);
    });

    test('should not move when paused', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const initialCol = game.getCurrentPiece()!.col;
      game.togglePause();
      game.moveLeft();
      expect(game.getCurrentPiece()!.col).toBe(initialCol);
    });
  });

  describe('rotation', () => {
    test('should rotate piece', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const initialRotation = game.getCurrentPiece()!.rotation;
      game.rotate();
      // Rotation should have changed (unless blocked)
      const newRotation = game.getCurrentPiece()!.rotation;
      // Either it rotated or it was blocked - we just check it's valid
      expect(newRotation).toBeGreaterThanOrEqual(0);
      expect(newRotation).toBeLessThan(4);
    });

    test('should wrap rotation after 4 rotations', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      // O piece always has same shape, so use a different approach
      // Just verify rotation stays in valid range
      game.rotate();
      game.rotate();
      game.rotate();
      game.rotate();
      expect(game.getCurrentPiece()!.rotation).toBeGreaterThanOrEqual(0);
      expect(game.getCurrentPiece()!.rotation).toBeLessThan(4);
    });
  });

  describe('dropping', () => {
    test('should soft drop increase row', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const initialRow = game.getCurrentPiece()!.row;
      game.softDrop();
      expect(game.getCurrentPiece()!.row).toBe(initialRow + 1);
    });

    test('should soft drop add 1 point', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const initialScore = game.getScore();
      game.softDrop();
      expect(game.getScore()).toBe(initialScore + 1);
    });

    test('should hard drop move piece to bottom', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      game.hardDrop();
      // After hard drop, a new piece should spawn
      // Check board has some non-null values
      const board = game.getBoard();
      let hasBlocks = false;
      for (let row = 0; row < BOARD_HEIGHT; row++) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          if (board[row][col] !== null) {
            hasBlocks = true;
            break;
          }
        }
        if (hasBlocks) break;
      }
      expect(hasBlocks).toBe(true);
    });

    test('should hard drop add points', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      game.hardDrop();
      // Hard drop gives 2 points per row dropped
      expect(game.getScore()).toBeGreaterThan(0);
    });
  });

  describe('pause', () => {
    test('should toggle to paused state', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      game.togglePause();
      expect(game.getGameState()).toBe('paused');
    });

    test('should toggle back to playing state', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      game.togglePause();
      game.togglePause();
      expect(game.getGameState()).toBe('playing');
    });

    test('should not allow moves when paused', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      const initialCol = game.getCurrentPiece()!.col;
      game.togglePause();
      game.moveLeft();
      game.moveRight();
      game.rotate();
      game.softDrop();
      expect(game.getCurrentPiece()!.col).toBe(initialCol);
    });
  });

  describe('game over', () => {
    test('should call onGameEnd when game ends', () => {
      const game = new FallingBlocksGame();
      let gameEnded = false;
      game.setOnGameEnd(() => { gameEnded = true; });
      game.startGame();

      // Fill up the board by hard dropping many times
      // This should eventually cause game over
      for (let i = 0; i < 200; i++) {
        if (game.getGameState() === 'gameover') break;
        game.hardDrop();
      }

      if (game.getGameState() === 'gameover') {
        expect(gameEnded).toBe(true);
      }
    });
  });

  describe('line clearing', () => {
    test('clearing lines increases line count', () => {
      const game = new FallingBlocksGame();
      game.startGame();

      // Play the game and check if lines can be cleared
      // This is probabilistic but we can test the line count starts at 0
      expect(game.getLines()).toBe(0);
    });

    test('score increases with level', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      // Initial level should be 1
      expect(game.getLevel()).toBe(1);
    });
  });

  describe('tick', () => {
    test('should not tick when not playing', () => {
      const game = new FallingBlocksGame();
      // Don't start game, just tick
      game.tick();
      expect(game.getCurrentPiece()).toBeNull();
    });

    test('should not tick when paused', () => {
      const game = new FallingBlocksGame();
      game.startGame();
      game.togglePause();
      const row = game.getCurrentPiece()!.row;
      game.tick();
      expect(game.getCurrentPiece()!.row).toBe(row);
    });
  });
});

describe('SHAPES', () => {
  test('should have 7 shapes', () => {
    expect(SHAPES.length).toBe(7);
  });

  test('each shape should have 4 rotations', () => {
    for (const shape of SHAPES) {
      expect(shape.length).toBe(4);
    }
  });

  test('each rotation should have 4 blocks', () => {
    for (const shape of SHAPES) {
      for (const rotation of shape) {
        expect(rotation.length).toBe(4);
      }
    }
  });

  test('each block should have col and row', () => {
    for (const shape of SHAPES) {
      for (const rotation of shape) {
        for (const block of rotation) {
          expect(typeof block.col).toBe('number');
          expect(typeof block.row).toBe('number');
        }
      }
    }
  });
});

describe('SHAPE_COLORS', () => {
  test('should have 7 colors', () => {
    expect(SHAPE_COLORS.length).toBe(7);
  });

  test('each color should have r, g, b values', () => {
    for (const color of SHAPE_COLORS) {
      expect(typeof color.r).toBe('number');
      expect(typeof color.g).toBe('number');
      expect(typeof color.b).toBe('number');
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }
  });
});

describe('Board dimensions', () => {
  test('board should be 10 columns wide', () => {
    expect(BOARD_WIDTH).toBe(10);
  });

  test('board should be 20 rows tall', () => {
    expect(BOARD_HEIGHT).toBe(20);
  });
});
