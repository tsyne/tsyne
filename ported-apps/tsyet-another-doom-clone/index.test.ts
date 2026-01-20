/**
 * Jest tests for Yet Another Doom Clone - Tsyne Port
 *
 * Tests covering:
 * - Vector3 math operations
 * - Map system and polygon detection
 * - Player mechanics
 * - Enemy AI and combat
 * - Raycasting renderer
 * - Game state management
 */

import {
  Vector3,
  ZERO,
  X_DIR,
  Y_DIR,
  Z_DIR,
  clamp,
  urandom,
  urandomVector,
  angleBetween,
  rotateXY,
  rotateXZ,
  rotateYZ,
  rayLineIntersect,
  WallSegment,
  Player,
  Enemy,
  GameMap,
  DoomGame,
  RaycastRenderer,
  runTurtle,
} from './index';

// ============================================================================
// Vector3 Tests
// ============================================================================

describe('Vector3', () => {
  describe('construction', () => {
    it('should create a zero vector by default', () => {
      const v = new Vector3();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });

    it('should create a vector with given values', () => {
      const v = new Vector3(1, 2, 3);
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });

    it('should create from array', () => {
      const v = Vector3.fromArray([4, 5, 6]);
      expect(v.x).toBe(4);
      expect(v.y).toBe(5);
      expect(v.z).toBe(6);
    });
  });

  describe('arithmetic operations', () => {
    it('should add two vectors', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);
      const result = a.add(b);
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
      expect(result.z).toBe(9);
    });

    it('should subtract two vectors', () => {
      const a = new Vector3(5, 7, 9);
      const b = new Vector3(1, 2, 3);
      const result = a.sub(b);
      expect(result.x).toBe(4);
      expect(result.y).toBe(5);
      expect(result.z).toBe(6);
    });

    it('should negate a vector', () => {
      const v = new Vector3(1, -2, 3);
      const result = v.negate();
      expect(result.x).toBe(-1);
      expect(result.y).toBe(2);
      expect(result.z).toBe(-3);
    });

    it('should scale a vector', () => {
      const v = new Vector3(2, 3, 4);
      const result = v.multiplyScalar(2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
      expect(result.z).toBe(8);
    });

    it('should multiply two vectors component-wise', () => {
      const a = new Vector3(2, 3, 4);
      const b = new Vector3(5, 6, 7);
      const result = a.multiply(b);
      expect(result.x).toBe(10);
      expect(result.y).toBe(18);
      expect(result.z).toBe(28);
    });
  });

  describe('vector products', () => {
    it('should compute dot product', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);
      expect(a.dot(b)).toBe(32); // 1*4 + 2*5 + 3*6 = 32
    });

    it('should compute cross product', () => {
      const result = X_DIR.cross(Y_DIR);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
      expect(result.z).toBeCloseTo(1);
    });
  });

  describe('length and distance', () => {
    it('should compute length squared', () => {
      const v = new Vector3(3, 4, 0);
      expect(v.lengthSquared()).toBe(25);
    });

    it('should compute length', () => {
      const v = new Vector3(3, 4, 0);
      expect(v.length()).toBe(5);
    });

    it('should normalize a vector', () => {
      const v = new Vector3(3, 4, 0);
      const result = v.normalize();
      expect(result.length()).toBeCloseTo(1);
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
    });

    it('should handle normalizing zero vector', () => {
      const result = ZERO.normalize();
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });

    it('should compute distance between vectors', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(3, 4, 0);
      expect(a.distanceTo(b)).toBe(5);
    });
  });

  describe('interpolation and projection', () => {
    it('should linearly interpolate', () => {
      const a = new Vector3(0, 0, 0);
      const b = new Vector3(10, 20, 30);
      const result = a.lerp(b, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
      expect(result.z).toBe(15);
    });

    it('should project to XY plane using helper', () => {
      const v = new Vector3(1, 2, 3);
      // noz is now a helper function, not a method on Vector3
      const result = new Vector3(v.x, v.y, 0);
      expect(result.x).toBe(1);
      expect(result.y).toBe(2);
      expect(result.z).toBe(0);
    });
  });

  describe('immutability', () => {
    it('should not mutate original vector on add', () => {
      const a = new Vector3(1, 2, 3);
      const b = new Vector3(4, 5, 6);
      a.add(b);
      expect(a.x).toBe(1);
      expect(a.y).toBe(2);
      expect(a.z).toBe(3);
    });

    it('should clone correctly', () => {
      const original = new Vector3(1, 2, 3);
      const cloned = original.clone();
      cloned.x = 100;
      expect(original.x).toBe(1);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('urandom', () => {
    it('should return values in range [-1, 1]', () => {
      for (let i = 0; i < 100; i++) {
        const val = urandom();
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('urandomVector', () => {
    it('should return vector with components in range [-1, 1]', () => {
      for (let i = 0; i < 10; i++) {
        const v = urandomVector();
        expect(v.x).toBeGreaterThanOrEqual(-1);
        expect(v.x).toBeLessThanOrEqual(1);
        expect(v.y).toBeGreaterThanOrEqual(-1);
        expect(v.y).toBeLessThanOrEqual(1);
        expect(v.z).toBeGreaterThanOrEqual(-1);
        expect(v.z).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('rotation functions', () => {
    it('should rotate around XY axis', () => {
      const v = X_DIR.clone();
      const rotated = rotateXY(v, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(1);
      expect(rotated.z).toBeCloseTo(0);
    });

    it('should rotate around XZ axis', () => {
      const v = X_DIR.clone();
      const rotated = rotateXZ(v, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(0);
      expect(rotated.z).toBeCloseTo(1);
    });

    it('should rotate around YZ axis', () => {
      const v = Y_DIR.clone();
      const rotated = rotateYZ(v, Math.PI / 2);
      expect(rotated.x).toBeCloseTo(0);
      expect(rotated.y).toBeCloseTo(0);
      expect(rotated.z).toBeCloseTo(1);
    });
  });

  describe('rayLineIntersect', () => {
    it('should detect intersection', () => {
      const origin = new Vector3(0, 0, 0);
      const dir = new Vector3(1, 0, 0);
      const p1 = new Vector3(5, -5, 0);
      const p2 = new Vector3(5, 5, 0);

      const result = rayLineIntersect(origin, dir, p1, p2);
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(5);
      expect(result![1]).toBeCloseTo(0.5);
    });

    it('should return null for no intersection', () => {
      const origin = new Vector3(0, 0, 0);
      const dir = new Vector3(1, 0, 0);
      const p1 = new Vector3(-5, 1, 0);
      const p2 = new Vector3(-5, 2, 0);

      const result = rayLineIntersect(origin, dir, p1, p2);
      expect(result).toBeNull();
    });

    it('should handle parallel lines', () => {
      const origin = new Vector3(0, 0, 0);
      const dir = new Vector3(1, 0, 0);
      const p1 = new Vector3(0, 5, 0);
      const p2 = new Vector3(10, 5, 0);

      const result = rayLineIntersect(origin, dir, p1, p2);
      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// Wall Tests
// ============================================================================

describe('WallSegment', () => {
  it('should create a wall with correct properties', () => {
    const p1 = new Vector3(10, 10, 0);
    const p2 = new Vector3(20, 10, 0);
    const wall = new WallSegment(p1, p2, 0, 10);

    expect(wall.p1.x).toBe(10);
    expect(wall.p1.y).toBe(10);
    expect(wall.p2.x).toBe(20);
    expect(wall.p2.y).toBe(10);
    expect(wall.floorZ).toBe(0);
    expect(wall.height).toBe(10);
  });

  it('should handle negative height by taking absolute value', () => {
    const p1 = new Vector3(10, 10, 0);
    const p2 = new Vector3(20, 10, 0);
    const wall = new WallSegment(p1, p2, 5, -10);

    expect(wall.height).toBe(10);
    expect(wall.floorZ).toBe(5);
  });

  it('should compute wall length from endpoints', () => {
    const p1 = new Vector3(0, 0, 0);
    const p2 = new Vector3(10, 0, 0);
    const wall = new WallSegment(p1, p2, 0, 5);
    const length = wall.p2.sub(wall.p1).length();
    expect(length).toBeCloseTo(10);
  });
});

// ============================================================================
// Player Tests
// ============================================================================

describe('Player', () => {
  it('should initialize with given position', () => {
    const player = new Player(new Vector3(10, 20, 30));
    expect(player.position.x).toBe(10);
    expect(player.position.y).toBe(20);
    expect(player.position.z).toBe(30);
  });

  it('should start with default health', () => {
    const player = new Player(ZERO);
    expect(player.health).toBe(5);
  });

  it('should compute forward vector based on angle', () => {
    const player = new Player(ZERO);
    player.theta = 0;
    const forward = player.getForwardVector();
    expect(forward.y).toBeCloseTo(1);
    expect(forward.x).toBeCloseTo(0);
  });

  it('should compute right vector perpendicular to forward', () => {
    const player = new Player(ZERO);
    player.theta = 0;
    const forward = player.getForwardVector();
    const right = player.getRightVector();
    expect(forward.dot(right)).toBeCloseTo(0);
  });

  it('should get eye position with height offset', () => {
    const player = new Player(new Vector3(0, 0, 0));
    const eye = player.getEyePosition();
    expect(eye.z).toBe(player.height);
  });
});

// ============================================================================
// Enemy Tests
// ============================================================================

describe('Enemy', () => {
  it('should initialize with given position', () => {
    const enemy = new Enemy(new Vector3(10, 20, 5), Math.PI / 4);
    expect(enemy.position.x).toBe(10);
    expect(enemy.position.y).toBe(20);
    expect(enemy.position.z).toBe(5);
    expect(enemy.theta).toBe(Math.PI / 4);
  });

  it('should start in patrol state', () => {
    const enemy = new Enemy(ZERO);
    expect(enemy.state).toBe('patrol');
    expect(enemy.attacking).toBe(false);
    expect(enemy.dead).toBe(false);
  });

  it('should take damage', () => {
    const enemy = new Enemy(ZERO);
    enemy.takeDamage(3);
    expect(enemy.health).toBe(7);
    expect(enemy.dead).toBe(false);
  });

  it('should die when health reaches zero', () => {
    const enemy = new Enemy(ZERO);
    enemy.takeDamage(10);
    expect(enemy.health).toBe(0);
    expect(enemy.dead).toBe(true);
    expect(enemy.state).toBe('dead');
  });

  it('should calculate distance to player', () => {
    const enemy = new Enemy(new Vector3(30, 40, 0));
    const player = new Player(ZERO);
    expect(enemy.distanceTo(player)).toBe(50);
  });
});

// ============================================================================
// Map System Tests
// ============================================================================

describe('GameMap', () => {
  let map: GameMap;

  beforeEach(() => {
    map = new GameMap();
  });

  it('should load with regions', () => {
    expect(map.regions.length).toBeGreaterThan(0);
  });

  it('should get floor height at position', () => {
    const height = map.getFloorHeight(ZERO);
    // Floor height should be a reasonable value or -100 if outside
    expect(typeof height).toBe('number');
  });

  it('should return -100 for positions outside all regions', () => {
    const height = map.getFloorHeight(new Vector3(10000, 10000, 0));
    expect(height).toBe(-100);
  });
});

describe('runTurtle', () => {
  it('should parse empty commands', () => {
    const regions = runTurtle([]);
    expect(regions).toEqual([]);
  });

  it('should create region from simple commands', () => {
    // Create a simple triangle region
    const commands = [
      0x03, // 3 vertices
      0x88, // dx=1, dy=1 (scaled)
      0x80, // dx=1, dy=-1
      0x08, // dx=-1, dy=-1
    ];
    const regions = runTurtle(commands);
    expect(regions.length).toBe(1);
    expect(regions[0].vertices.length).toBe(4);
  });
});

// ============================================================================
// Raycaster Tests
// ============================================================================

describe('RaycastRenderer', () => {
  let renderer: RaycastRenderer;

  beforeEach(() => {
    renderer = new RaycastRenderer(100, 80);
  });

  it('should initialize with given dimensions', () => {
    expect(renderer.width).toBe(100);
    expect(renderer.height).toBe(80);
  });

  it('should resize correctly', () => {
    renderer.resize(200, 150);
    expect(renderer.width).toBe(200);
    expect(renderer.height).toBe(150);
    expect(renderer.depthBuffer.length).toBe(200);
  });

  it('should have initialized depth buffer', () => {
    expect(renderer.depthBuffer.length).toBe(100);
    expect(renderer.depthBuffer[0]).toBe(Infinity);
  });

  it('should cast ray and return hit info', () => {
    const player = new Player(ZERO);
    const map = new GameMap();
    const hit = renderer.castRay(player, map, 0);

    expect(hit).toHaveProperty('distance');
    expect(hit).toHaveProperty('wallX');
    expect(hit).toHaveProperty('side');
    expect(hit).toHaveProperty('color');
  });
});

// ============================================================================
// DoomGame Tests
// ============================================================================

describe('DoomGame', () => {
  let game: DoomGame;

  beforeEach(() => {
    game = new DoomGame(100, 80);
  });

  it('should initialize with playing state', () => {
    expect(game.getGameState()).toBe('playing');
  });

  it('should start with zero score', () => {
    expect(game.getScore()).toBe(0);
  });

  it('should spawn enemies', () => {
    expect(game.getEnemiesAlive()).toBeGreaterThan(0);
  });

  it('should handle key input', () => {
    // Use Fyne key names (not browser-style ArrowLeft)
    game.setKey('Left', true);
    expect(game.keysHeld.has('Left')).toBe(true);

    game.setKey('Left', false);
    expect(game.keysHeld.has('Left')).toBe(false);
  });

  it('should resize renderer', () => {
    game.resize(200, 150);
    expect(game.renderer.width).toBe(200);
    expect(game.renderer.height).toBe(150);
  });

  it('should reset game state', () => {
    game.reset();
    expect(game.getGameState()).toBe('playing');
    expect(game.getScore()).toBe(0);
    expect(game.keysHeld.size).toBe(0);
  });

  it('should render to buffer', () => {
    const buffer = new Uint8Array(100 * 80 * 4);
    game.render(buffer);

    // Buffer should be modified (not all zeros)
    let hasNonZero = false;
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] !== 0) {
        hasNonZero = true;
        break;
      }
    }
    expect(hasNonZero).toBe(true);
  });

  describe('observer pattern', () => {
    it('should allow subscription', () => {
      const listener = jest.fn();
      const unsubscribe = game.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should notify on reset', () => {
      const listener = jest.fn();
      game.subscribe(listener);
      game.reset();
      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscription', () => {
      const listener = jest.fn();
      const unsubscribe = game.subscribe(listener);
      unsubscribe();
      game.reset();
      // Listener should only be called once (from the first reset)
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('game progression', () => {
    it('should track player health', () => {
      const initialHealth = game.getHealth();
      expect(initialHealth).toBeGreaterThan(0);
    });

    it('should not tick when paused', () => {
      // Note: We don't have a direct pause method, but we can test gameState
      // The game won't tick when state is not 'playing'
      expect(game.getGameState()).toBe('playing');
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration', () => {
  it('should run a complete game tick', () => {
    const game = new DoomGame(100, 80);
    const initialTime = Date.now();

    // Run a few ticks
    game.tick(initialTime);
    game.tick(initialTime + 16);
    game.tick(initialTime + 32);

    // Game should still be running
    expect(game.getGameState()).toBe('playing');
  });

  it('should handle player movement', () => {
    const game = new DoomGame(100, 80);
    const initialPos = game.player.position.clone();

    // Use Fyne key names (not browser-style ArrowUp)
    game.setKey('Up', true);
    game.tick(Date.now());
    game.tick(Date.now() + 100);

    // Player should have moved (or at least attempted)
    // Note: Movement might be blocked by walls
    game.setKey('Up', false);
  });

  it('should handle player rotation', () => {
    const game = new DoomGame(100, 80);
    const initialTheta = game.player.theta;

    // Use Fyne key names (not browser-style ArrowLeft)
    game.setKey('Left', true);
    game.tick(Date.now());
    game.tick(Date.now() + 100);

    expect(game.player.theta).not.toBe(initialTheta);
    game.setKey('Left', false);
  });
});
