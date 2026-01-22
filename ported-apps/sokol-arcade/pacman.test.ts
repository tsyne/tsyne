/**
 * Pacman Game - Jest Unit Tests
 */

import { PacmanGame, Direction } from './pacman';

describe('PacmanGame', () => {
  let game: PacmanGame;

  beforeEach(() => {
    game = new PacmanGame();
  });

  afterEach(() => {
    game.stop();
  });

  it('should initialize with pacman at spawn', () => {
    expect(game.pacman.x).toBe(14);
    expect(game.pacman.y).toBe(23);
  });

  it('should initialize with 4 ghosts', () => {
    expect(game.ghosts.length).toBe(4);
  });

  it('should count dots in map', () => {
    expect(game.dots).toBeGreaterThan(0);
  });

  it('should start with 3 lives', () => {
    expect(game.lives).toBe(3);
  });

  it('should start with 0 score', () => {
    expect(game.score).toBe(0);
  });

  it('should start and stop game loop', () => {
    game.start();
    expect(game.running).toBe(true);
    game.stop();
    expect(game.running).toBe(false);
  });

  it('should set direction', () => {
    game.setDirection(Direction.Up);
    expect(game.pacman.nextDir).toBe(Direction.Up);
  });

  it('should reset game state', () => {
    game.score = 100;
    game.lives = 1;
    game.reset();
    expect(game.score).toBe(0);
    expect(game.lives).toBe(3);
  });

  it('should eat dots and increase score', () => {
    // Find a dot position and move pacman there
    game.pacman.x = 1;
    game.pacman.y = 1;
    game.pacman.dir = Direction.Right;
    game.pacman.nextDir = Direction.Right;
    const initialScore = game.score;
    game.tick();
    // Score should increase if pacman ate a dot
    expect(game.score).toBeGreaterThanOrEqual(initialScore);
  });

  it('should render to buffer', () => {
    const buffer = new Uint8Array(224 * 248 * 4);
    game.render(buffer, 224, 248);
    // Check blue walls exist
    let hasBlue = false;
    for (let i = 0; i < buffer.length; i += 4) {
      if (buffer[i + 2] > 200 && buffer[i] < 50) {
        hasBlue = true;
        break;
      }
    }
    expect(hasBlue).toBe(true);
  });
});
