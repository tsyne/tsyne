/**
 * FPS Voxel Game - Jest Unit Tests
 */

import { VoxelWorld, VoxelPlayer, FPSVoxelGame } from './index';
import { Vector3 } from '../../../cosyne/src/math3d';

describe('VoxelWorld', () => {
  let world: VoxelWorld;

  beforeEach(() => {
    world = new VoxelWorld();
  });

  describe('get/set', () => {
    it('should set and get blocks', () => {
      world.set(5, 5, 5, true);
      expect(world.get(5, 5, 5)).toBe(true);
      expect(world.get(5, 5, 6)).toBe(false);
    });

    it('should return false for out of bounds', () => {
      expect(world.get(-1, 0, 0)).toBe(false);
      expect(world.get(16, 0, 0)).toBe(false);
      expect(world.get(0, -1, 0)).toBe(false);
      expect(world.get(0, 16, 0)).toBe(false);
    });
  });

  describe('collision', () => {
    it('should detect collision with block', () => {
      world.set(5, 5, 5, true);
      const min = new Vector3(4.5, 4.5, 4.5);
      const max = new Vector3(5.5, 5.5, 5.5);
      expect(world.collision(min, max)).toBe(true);
    });

    it('should not detect collision with empty space', () => {
      const min = new Vector3(4.5, 4.5, 4.5);
      const max = new Vector3(5.5, 5.5, 5.5);
      expect(world.collision(min, max)).toBe(false);
    });
  });

  describe('generateDefault', () => {
    it('should create floor and walls', () => {
      world.generateDefault();
      // Floor at y=0
      expect(world.get(8, 0, 8)).toBe(true);
      // Walls
      expect(world.get(0, 1, 8)).toBe(true);
      expect(world.get(15, 1, 8)).toBe(true);
      // Middle should be empty (not on pillar grid)
      expect(world.get(5, 1, 5)).toBe(false);
    });
  });
});

describe('VoxelPlayer', () => {
  let player: VoxelPlayer;
  let world: VoxelWorld;

  beforeEach(() => {
    player = new VoxelPlayer();
    world = new VoxelWorld();
    world.generateDefault();
  });

  it('should start at spawn position', () => {
    expect(player.pos.x).toBe(2);
    expect(player.pos.y).toBe(3);
    expect(player.pos.z).toBe(2);
  });

  it('should update yaw from mouse input', () => {
    player.mouseDx = 100;
    player.update(world, 0.016);
    expect(player.yaw).toBeCloseTo(0.2, 1);
  });

  it('should clamp pitch', () => {
    player.mouseDy = 10000;
    player.update(world, 0.016);
    expect(player.pitch).toBeLessThanOrEqual(1.5);

    player.mouseDy = -10000;
    player.update(world, 0.016);
    expect(player.pitch).toBeGreaterThanOrEqual(-1.5);
  });

  it('should apply gravity', () => {
    player.pos = new Vector3(8, 10, 8);
    player.vel = new Vector3(0, 0, 0);
    player.update(world, 0.1);
    expect(player.vel.y).toBeLessThan(0);
  });

  it('should generate view matrix', () => {
    const mat = player.getViewMatrix();
    expect(mat.length).toBe(16);
    expect(typeof mat[0]).toBe('number');
  });
});

describe('FPSVoxelGame', () => {
  let game: FPSVoxelGame;

  beforeEach(() => {
    game = new FPSVoxelGame();
  });

  afterEach(() => {
    game.stop();
  });

  it('should initialize with default world', () => {
    expect(game.world.get(0, 0, 0)).toBe(true); // Floor corner
  });

  it('should start and stop game loop', () => {
    game.start();
    expect(game.running).toBe(true);
    game.stop();
    expect(game.running).toBe(false);
  });

  it('should handle key input', () => {
    game.setKey('w', true);
    expect(game.player.keys.w).toBe(true);
    game.setKey('w', false);
    expect(game.player.keys.w).toBe(false);
  });

  it('should handle mouse input', () => {
    game.addMouseDelta(50, 30);
    expect(game.player.mouseDx).toBe(50);
    expect(game.player.mouseDy).toBe(30);
  });

  it('should render to buffer', () => {
    const buffer = new Uint8Array(100 * 100 * 4);
    game.render(buffer, 100, 100);
    // Check that buffer was modified (has non-zero values)
    let hasContent = false;
    for (let i = 0; i < buffer.length; i += 4) {
      if (buffer[i] > 0 || buffer[i + 1] > 0 || buffer[i + 2] > 0) {
        hasContent = true;
        break;
      }
    }
    expect(hasContent).toBe(true);
  });
});
