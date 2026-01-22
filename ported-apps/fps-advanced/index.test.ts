/**
 * FPS Advanced - Jest Unit Tests
 *
 * Tests for the FPS engine: math utilities, BVH, brush geometry,
 * physics engine, and map system.
 */

import {
  AABB,
  wishDir,
  viewMatrix,
  Planes,
  Brush,
  BVH,
  Physics,
  World,
  PHYSICS_CONFIG,
  createBoxBrush,
  createSlopeBrush,
  GameMap,
  DEFAULT_MAP,
  FPSStore,
} from './index';
import { Vector3 } from '../../cosyne/src/math3d';

// ============================================================================
// AABB TESTS
// ============================================================================

describe('AABB', () => {
  describe('construction', () => {
    it('should create AABB from center and size', () => {
      const aabb = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      expect(aabb.min.x).toBe(-1);
      expect(aabb.min.y).toBe(-1);
      expect(aabb.min.z).toBe(-1);
      expect(aabb.max.x).toBe(1);
      expect(aabb.max.y).toBe(1);
      expect(aabb.max.z).toBe(1);
    });

    it('should create AABB with offset center', () => {
      const aabb = AABB.fromCenterSize(new Vector3(5, 5, 5), new Vector3(4, 4, 4));
      expect(aabb.min.x).toBe(3);
      expect(aabb.max.x).toBe(7);
    });
  });

  describe('intersects', () => {
    it('should detect overlapping AABBs', () => {
      const a = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const b = AABB.fromCenterSize(new Vector3(1, 1, 1), new Vector3(2, 2, 2));
      expect(a.intersects(b)).toBe(true);
    });

    it('should detect non-overlapping AABBs', () => {
      const a = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const b = AABB.fromCenterSize(new Vector3(5, 5, 5), new Vector3(2, 2, 2));
      expect(a.intersects(b)).toBe(false);
    });

    it('should detect touching AABBs', () => {
      const a = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const b = AABB.fromCenterSize(new Vector3(2, 0, 0), new Vector3(2, 2, 2));
      expect(a.intersects(b)).toBe(true);
    });
  });

  describe('unionWith', () => {
    it('should create union of two AABBs', () => {
      const a = new AABB(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
      const b = new AABB(new Vector3(2, 2, 2), new Vector3(3, 3, 3));
      const u = a.unionWith(b);
      expect(u.min.x).toBe(0);
      expect(u.max.x).toBe(3);
    });
  });

  describe('containsPoint', () => {
    it('should detect point inside AABB', () => {
      const aabb = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      expect(aabb.containsPoint(new Vector3(0, 0, 0))).toBe(true);
      expect(aabb.containsPoint(new Vector3(0.5, 0.5, 0.5))).toBe(true);
    });

    it('should detect point outside AABB', () => {
      const aabb = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      expect(aabb.containsPoint(new Vector3(5, 5, 5))).toBe(false);
    });
  });

  describe('surfaceArea', () => {
    it('should calculate surface area of unit cube', () => {
      const aabb = new AABB(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
      expect(aabb.surfaceArea()).toBe(6);
    });

    it('should calculate surface area of 2x3x4 box', () => {
      const aabb = new AABB(new Vector3(0, 0, 0), new Vector3(2, 3, 4));
      // 2*(2*3 + 3*4 + 4*2) = 2*(6 + 12 + 8) = 52
      expect(aabb.surfaceArea()).toBe(52);
    });
  });

  describe('expand', () => {
    it('should expand AABB by radius', () => {
      const aabb = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const expanded = aabb.expand(1);
      expect(expanded.min.x).toBe(-2);
      expect(expanded.max.x).toBe(2);
    });
  });
});

// ============================================================================
// WISH DIR TESTS
// ============================================================================

describe('wishDir', () => {
  it('should return zero for no input', () => {
    const dir = wishDir(0, 0, 0);
    expect(dir.length()).toBeCloseTo(0, 5);
  });

  it('should return forward direction for W key at yaw=0', () => {
    const dir = wishDir(1, 0, 0);
    expect(dir.x).toBeCloseTo(0, 5);
    expect(dir.z).toBeCloseTo(-1, 5);
  });

  it('should return right direction for D key at yaw=0', () => {
    const dir = wishDir(0, 1, 0);
    expect(dir.x).toBeCloseTo(1, 5);
    expect(dir.z).toBeCloseTo(0, 5);
  });

  it('should rotate direction with yaw', () => {
    const dir = wishDir(1, 0, Math.PI / 2);
    expect(dir.x).toBeCloseTo(1, 5);
    expect(dir.z).toBeCloseTo(0, 5);
  });
});

// ============================================================================
// PLANES TESTS
// ============================================================================

describe('Planes', () => {
  describe('distanceToPoint', () => {
    it('should calculate distance to plane', () => {
      const planes = new Planes(
        [new Vector3(0, 1, 0)],
        [0]
      );
      expect(planes.distanceToPoint(0, new Vector3(0, 5, 0))).toBe(5);
      expect(planes.distanceToPoint(0, new Vector3(0, -3, 0))).toBe(-3);
    });
  });

  describe('rayIntersect', () => {
    it('should find intersection with plane', () => {
      const planes = new Planes(
        [new Vector3(0, 1, 0)],
        [0]
      );
      const t = planes.rayIntersect(0, new Vector3(0, 5, 0), new Vector3(0, -1, 0));
      expect(t).toBe(5);
    });

    it('should return null for parallel ray', () => {
      const planes = new Planes(
        [new Vector3(0, 1, 0)],
        [0]
      );
      const t = planes.rayIntersect(0, new Vector3(0, 5, 0), new Vector3(1, 0, 0));
      expect(t).toBeNull();
    });

    it('should return null for ray pointing away', () => {
      const planes = new Planes(
        [new Vector3(0, 1, 0)],
        [0]
      );
      const t = planes.rayIntersect(0, new Vector3(0, 5, 0), new Vector3(0, 1, 0));
      expect(t).toBeNull();
    });
  });
});

// ============================================================================
// BRUSH TESTS
// ============================================================================

describe('Brush', () => {
  describe('createBoxBrush', () => {
    it('should create a box brush', () => {
      const brush = createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      expect(brush.planes.len()).toBe(6);
      expect(brush.bounds.min.x).toBe(-1);
      expect(brush.bounds.max.x).toBe(1);
    });
  });

  describe('expand', () => {
    it('should expand brush by radius', () => {
      const brush = createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const expanded = brush.expand(0.5);
      expect(expanded.bounds.min.x).toBe(-1.5);
      expect(expanded.bounds.max.x).toBe(1.5);
    });
  });

  describe('rayIntersect', () => {
    it('should detect ray hitting box', () => {
      const brush = createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const hit = brush.rayIntersect(new Vector3(0, 5, 0), new Vector3(0, -1, 0), 10);
      expect(hit).not.toBeNull();
      expect(hit!.distance).toBeCloseTo(4, 1);
      expect(hit!.normal.y).toBeCloseTo(1, 5);
    });

    it('should return null for ray missing box', () => {
      const brush = createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const hit = brush.rayIntersect(new Vector3(10, 5, 0), new Vector3(0, -1, 0), 10);
      expect(hit).toBeNull();
    });

    it('should respect maxDistance', () => {
      const brush = createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2));
      const hit = brush.rayIntersect(new Vector3(0, 5, 0), new Vector3(0, -1, 0), 2);
      expect(hit).toBeNull();
    });
  });
});

// ============================================================================
// BVH TESTS
// ============================================================================

describe('BVH', () => {
  it('should build BVH from brushes', () => {
    const brushes = [
      createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2)),
      createBoxBrush(new Vector3(10, 0, 0), new Vector3(2, 2, 2)),
      createBoxBrush(new Vector3(-10, 0, 0), new Vector3(2, 2, 2)),
    ];
    const bvh = new BVH(brushes, b => b.bounds);
    expect(bvh.nodes.length).toBeGreaterThan(0);
  });

  it('should query BVH for intersecting brushes', () => {
    const brushes = [
      createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2)),
      createBoxBrush(new Vector3(10, 0, 0), new Vector3(2, 2, 2)),
      createBoxBrush(new Vector3(-10, 0, 0), new Vector3(2, 2, 2)),
    ];
    const bvh = new BVH(brushes, b => b.bounds);

    const queryBounds = AABB.fromCenterSize(new Vector3(0, 0, 0), new Vector3(1, 1, 1));
    let found = false;
    bvh.query(queryBounds, (brush) => {
      if (brush.bounds.intersects(queryBounds)) {
        found = true;
        return true;
      }
      return false;
    });
    expect(found).toBe(true);
  });

  it('should not find brushes in empty region', () => {
    const brushes = [
      createBoxBrush(new Vector3(0, 0, 0), new Vector3(2, 2, 2)),
      createBoxBrush(new Vector3(10, 0, 0), new Vector3(2, 2, 2)),
    ];
    const bvh = new BVH(brushes, b => b.bounds);

    const queryBounds = AABB.fromCenterSize(new Vector3(100, 100, 100), new Vector3(1, 1, 1));
    let found = false;
    bvh.query(queryBounds, () => {
      found = true;
      return true;
    });
    expect(found).toBe(false);
  });
});

// ============================================================================
// WORLD AND PHYSICS TESTS
// ============================================================================

describe('World', () => {
  it('should create world from brushes', () => {
    const brushes = [
      createBoxBrush(new Vector3(0, -1, 0), new Vector3(10, 2, 10)),
    ];
    const world = new World(brushes);
    expect(world.brushes.length).toBe(1);
  });

  it('should raycast against world', () => {
    const brushes = [
      createBoxBrush(new Vector3(0, -1, 0), new Vector3(10, 2, 10)),
    ];
    const world = new World(brushes);

    const hit = world.raycast(new Vector3(0, 5, 0), new Vector3(0, -1, 0), 10);
    expect(hit).not.toBeNull();
  });
});

describe('Physics', () => {
  let world: World;
  let physics: Physics;

  beforeEach(() => {
    const brushes = [
      createBoxBrush(new Vector3(0, -2, 0), new Vector3(100, 4, 100)),
    ];
    world = new World(brushes);
    physics = new Physics();
    physics.state.pos = new Vector3(0, 5, 0);
  });

  it('should apply gravity when not grounded', () => {
    const initialY = physics.state.pos.y;
    physics.update(world, Vector3.zero(), false, 0.1);
    expect(physics.state.vel.y).toBeLessThan(0);
  });

  it('should become grounded when landing', () => {
    // Let the player fall
    for (let i = 0; i < 100; i++) {
      physics.update(world, Vector3.zero(), false, 0.016);
    }
    expect(physics.state.grounded).toBe(true);
  });

  it('should jump when grounded', () => {
    // First get grounded
    physics.state.pos = new Vector3(0, 0.5, 0);
    physics.state.vel = new Vector3(0, -1, 0);
    physics.update(world, Vector3.zero(), false, 0.1);

    // Now jump
    const velBefore = physics.state.vel.y;
    physics.update(world, Vector3.zero(), true, 0.016);
    expect(physics.state.vel.y).toBeGreaterThanOrEqual(velBefore);
  });

  it('should accelerate in wish direction', () => {
    physics.state.grounded = true;
    physics.state.vel = Vector3.zero();

    const wish = new Vector3(1, 0, 0);
    physics.update(world, wish, false, 0.1);

    expect(physics.state.vel.x).toBeGreaterThan(0);
  });

  it('should apply friction when grounded', () => {
    physics.state.grounded = true;
    physics.state.vel = new Vector3(10, 0, 0);

    physics.update(world, Vector3.zero(), false, 0.1);

    expect(physics.state.vel.x).toBeLessThan(10);
  });
});

// ============================================================================
// MAP TESTS
// ============================================================================

describe('GameMap', () => {
  it('should load default map', () => {
    const map = new GameMap(DEFAULT_MAP);
    expect(map.data.name).toBe('Test Map');
    expect(map.brushes.length).toBe(7);
  });

  it('should return spawn position', () => {
    const map = new GameMap(DEFAULT_MAP);
    const spawn = map.getSpawnPosition();
    expect(spawn.x).toBe(0);
    expect(spawn.y).toBe(3);
    expect(spawn.z).toBe(-20);
  });

  it('should create world from map brushes', () => {
    const map = new GameMap(DEFAULT_MAP);
    expect(map.world).toBeDefined();
    expect(map.world.brushes.length).toBe(7);
  });

  it('should handle box brushes', () => {
    const mapData = {
      name: 'Test',
      spawn_position: [0, 0, 0] as [number, number, number],
      brushes: [
        { type: 'box' as const, position: [0, 0, 0] as [number, number, number], size: [2, 2, 2] as [number, number, number] }
      ]
    };
    const map = new GameMap(mapData);
    expect(map.brushes.length).toBe(1);
    expect(map.brushes[0].planes.len()).toBe(6);
  });

  it('should handle slope brushes', () => {
    const mapData = {
      name: 'Test',
      spawn_position: [0, 0, 0] as [number, number, number],
      brushes: [
        { type: 'slope' as const, position: [0, 0, 0] as [number, number, number], width: 10, height: 5, angle: 45 }
      ]
    };
    const map = new GameMap(mapData);
    expect(map.brushes.length).toBe(1);
    expect(map.brushes[0].planes.len()).toBe(6);
  });
});

// ============================================================================
// FPS STORE TESTS
// ============================================================================

describe('FPSStore', () => {
  it('should initialize with spawn position', () => {
    const store = new FPSStore();
    const pos = store.getPosition();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(3);
    expect(pos.z).toBe(-20);
  });

  it('should notify listeners on update', () => {
    const store = new FPSStore();
    let notified = false;
    store.subscribe(() => {
      notified = true;
    });
    store.update(0.016);
    expect(notified).toBe(true);
  });

  it('should unsubscribe listeners', () => {
    const store = new FPSStore();
    let count = 0;
    const unsub = store.subscribe(() => {
      count++;
    });
    store.update(0.016);
    expect(count).toBe(1);

    unsub();
    store.update(0.016);
    expect(count).toBe(1);
  });

  it('should handle key input', () => {
    const store = new FPSStore();
    store.setKey('w', true);
    expect(store.input.w).toBe(true);
    store.setKey('w', false);
    expect(store.input.w).toBe(false);
  });

  it('should handle mouse delta', () => {
    const store = new FPSStore();
    const initialYaw = store.getYaw();
    store.addMouseDelta(100, 0);
    store.update(0.016);
    expect(store.getYaw()).not.toBe(initialYaw);
  });

  it('should reset to spawn position', () => {
    const store = new FPSStore();
    store.update(0.1);
    store.update(0.1);
    store.reset();
    const pos = store.getPosition();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(3);
    expect(pos.z).toBe(-20);
  });

  it('should return map name', () => {
    const store = new FPSStore();
    expect(store.getMapName()).toBe('Test Map');
  });

  it('should return brushes', () => {
    const store = new FPSStore();
    expect(store.getBrushes().length).toBe(7);
  });

  it('should track grounded state', () => {
    const store = new FPSStore();
    // Initially not grounded (spawning above ground)
    expect(typeof store.isGrounded()).toBe('boolean');
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('FPS Integration', () => {
  it('should allow player to move across the map', () => {
    const store = new FPSStore();

    // Move forward for a few frames
    store.setKey('w', true);
    for (let i = 0; i < 60; i++) {
      store.update(0.016);
    }
    store.setKey('w', false);

    const pos = store.getPosition();
    // Should have moved from spawn z=-20
    expect(pos.z).not.toBe(-20);
  });

  it('should prevent falling through floor', () => {
    const store = new FPSStore();

    // Let player fall for a while
    for (let i = 0; i < 200; i++) {
      store.update(0.016);
    }

    const pos = store.getPosition();
    // Should not have fallen below the ground (y=0 is the ground surface)
    expect(pos.y).toBeGreaterThan(-1);
  });

  it('should allow looking around', () => {
    const store = new FPSStore();
    const initialYaw = store.getYaw();

    store.addMouseDelta(200, 0);
    store.update(0.016);

    expect(store.getYaw()).not.toBe(initialYaw);
  });

  it('should limit pitch', () => {
    const store = new FPSStore();

    // Look way up
    store.addMouseDelta(0, -10000);
    store.update(0.016);

    expect(store.getPitch()).toBeGreaterThanOrEqual(-PHYSICS_CONFIG.pitchLimit);
    expect(store.getPitch()).toBeLessThanOrEqual(PHYSICS_CONFIG.pitchLimit);

    // Look way down
    store.addMouseDelta(0, 10000);
    store.update(0.016);

    expect(store.getPitch()).toBeGreaterThanOrEqual(-PHYSICS_CONFIG.pitchLimit);
    expect(store.getPitch()).toBeLessThanOrEqual(PHYSICS_CONFIG.pitchLimit);
  });
});
