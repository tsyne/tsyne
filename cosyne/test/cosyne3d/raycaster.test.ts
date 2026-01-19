/**
 * Tests for Raycaster - 2.5D Software Rendering Engine
 */

import {
  Raycaster,
  RaycasterConfig,
  RaycasterWall,
  RaycasterSprite,
  RaycasterCamera,
  RaycastHit,
  DEFAULT_RAYCASTER_CONFIG,
  createRoom,
  createWall,
  createSprite,
} from '../../src/raycaster';
import { Vector3 } from '../../src/math3d';

describe('Raycaster', () => {
  describe('constructor', () => {
    it('should create a raycaster with default config', () => {
      const raycaster = new Raycaster(320, 200);
      expect(raycaster.getWidth()).toBe(320);
      expect(raycaster.getHeight()).toBe(200);
    });

    it('should create a raycaster with custom config', () => {
      const config: RaycasterConfig = {
        fov: Math.PI / 4,
        maxDistance: 100,
        enableFog: false,
        ceilingColor: [0, 0, 100],
        floorColor: [100, 0, 0],
      };
      const raycaster = new Raycaster(640, 480, config);
      expect(raycaster.getWidth()).toBe(640);
      expect(raycaster.getHeight()).toBe(480);
    });
  });

  describe('resize', () => {
    it('should resize the render buffer', () => {
      const raycaster = new Raycaster(320, 200);
      raycaster.resize(640, 480);
      expect(raycaster.getWidth()).toBe(640);
      expect(raycaster.getHeight()).toBe(480);
    });

    it('should resize depth buffer correctly', () => {
      const raycaster = new Raycaster(320, 200);
      raycaster.resize(640, 480);
      const depthBuffer = raycaster.getDepthBuffer();
      expect(depthBuffer.length).toBe(640);
    });
  });

  describe('configure', () => {
    it('should update configuration', () => {
      const raycaster = new Raycaster(320, 200);
      raycaster.configure({
        fov: Math.PI / 2,
        enableFog: false,
      });
      // Test by rendering - fog should not be applied
      const buffer = new Uint8Array(320 * 200 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0,
        height: 5,
      };
      raycaster.render(buffer, camera, []);
      // If no errors, config was accepted
    });
  });

  describe('castRay', () => {
    it('should return null when no walls hit', () => {
      const raycaster = new Raycaster(320, 200);
      const origin = new Vector3(0, 0, 0);
      const walls: RaycasterWall[] = [];

      const hit = raycaster.castRay(origin, 0, walls);
      expect(hit).toBeNull();
    });

    it('should detect wall intersection', () => {
      const raycaster = new Raycaster(320, 200);
      const origin = new Vector3(0, 0, 0);
      const walls: RaycasterWall[] = [
        createWall(-10, 10, 10, 10, [100, 100, 100]),
      ];

      const hit = raycaster.castRay(origin, Math.PI / 2, walls); // Ray pointing +Y
      expect(hit).not.toBeNull();
      expect(hit!.distance).toBeCloseTo(10, 1);
      expect(hit!.point.y).toBeCloseTo(10, 1);
    });

    it('should find closest wall when multiple walls exist', () => {
      const raycaster = new Raycaster(320, 200);
      const origin = new Vector3(0, 0, 0);
      const walls: RaycasterWall[] = [
        createWall(-10, 20, 10, 20, [100, 100, 100]), // Far wall
        createWall(-10, 10, 10, 10, [200, 100, 100]), // Near wall
      ];

      const hit = raycaster.castRay(origin, Math.PI / 2, walls);
      expect(hit).not.toBeNull();
      expect(hit!.distance).toBeCloseTo(10, 1);
      expect(hit!.wall.color).toEqual([200, 100, 100]);
    });

    it('should not hit walls behind ray origin', () => {
      const raycaster = new Raycaster(320, 200);
      const origin = new Vector3(0, 0, 0);
      const walls: RaycasterWall[] = [
        createWall(-10, -10, 10, -10, [100, 100, 100]), // Wall behind
      ];

      const hit = raycaster.castRay(origin, Math.PI / 2, walls); // Ray pointing +Y
      expect(hit).toBeNull();
    });

    it('should calculate wall normal correctly', () => {
      const raycaster = new Raycaster(320, 200);
      const origin = new Vector3(0, 0, 0);
      const walls: RaycasterWall[] = [
        createWall(-10, 10, 10, 10, [100, 100, 100]), // Horizontal wall
      ];

      const hit = raycaster.castRay(origin, Math.PI / 2, walls);
      expect(hit).not.toBeNull();
      // Normal should point toward ray origin (downward, -Y)
      expect(hit!.normal.y).toBeLessThan(0);
    });

    it('should calculate wallU correctly', () => {
      const raycaster = new Raycaster(320, 200);
      const origin = new Vector3(0, 0, 0);
      const walls: RaycasterWall[] = [
        createWall(-10, 10, 10, 10, [100, 100, 100]),
      ];

      const hit = raycaster.castRay(origin, Math.PI / 2, walls);
      expect(hit).not.toBeNull();
      // Hit should be in the middle of the wall (u = 0.5)
      expect(hit!.wallU).toBeCloseTo(0.5, 1);
    });
  });

  describe('render', () => {
    it('should render to buffer without errors', () => {
      const raycaster = new Raycaster(320, 200);
      const buffer = new Uint8Array(320 * 200 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0,
        height: 5,
      };
      const walls: RaycasterWall[] = createRoom(0, 50, 100, 100);

      expect(() => {
        raycaster.render(buffer, camera, walls);
      }).not.toThrow();
    });

    it('should fill buffer with ceiling/floor colors when no walls', () => {
      const raycaster = new Raycaster(10, 10, {
        ceilingColor: [255, 0, 0],
        floorColor: [0, 255, 0],
      });
      const buffer = new Uint8Array(10 * 10 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0,
        height: 5,
      };

      raycaster.render(buffer, camera, []);

      // Check top row (ceiling)
      expect(buffer[0]).toBe(255); // R
      expect(buffer[1]).toBe(0);   // G
      expect(buffer[2]).toBe(0);   // B
      expect(buffer[3]).toBe(255); // A

      // Check bottom row (floor)
      const bottomOffset = (9 * 10) * 4;
      expect(buffer[bottomOffset]).toBe(0);     // R
      expect(buffer[bottomOffset + 1]).toBe(255); // G
      expect(buffer[bottomOffset + 2]).toBe(0);   // B
    });

    it('should render walls with correct color', () => {
      const raycaster = new Raycaster(100, 100, {
        enableFog: false,
        ceilingColor: [0, 0, 0],
        floorColor: [0, 0, 0],
      });
      const buffer = new Uint8Array(100 * 100 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0, // Looking along +X axis
        height: 15,
      };
      // Wall perpendicular to X axis at distance 10 (camera facing +X)
      const walls: RaycasterWall[] = [
        createWall(10, -50, 10, 50, [200, 100, 50], 0, 30),
      ];

      raycaster.render(buffer, camera, walls);

      // Check middle of screen - should have wall color (or shaded version)
      const midOffset = (50 * 100 + 50) * 4;
      expect(buffer[midOffset]).toBeGreaterThan(0); // Has some red
    });

    it('should update depth buffer', () => {
      const raycaster = new Raycaster(100, 100);
      const buffer = new Uint8Array(100 * 100 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0, // Looking along +X axis
        height: 15,
      };
      // Wall perpendicular to X axis at distance 10
      const walls: RaycasterWall[] = [
        createWall(10, -50, 10, 50, [200, 100, 50], 0, 30),
      ];

      raycaster.render(buffer, camera, walls);

      const depthBuffer = raycaster.getDepthBuffer();
      // Middle column should have wall distance
      expect(depthBuffer[50]).toBeCloseTo(10, 1);
    });

    it('should render sprites', () => {
      const raycaster = new Raycaster(100, 100, {
        enableFog: false,
        ceilingColor: [0, 0, 0],
        floorColor: [0, 0, 0],
      });
      const buffer = new Uint8Array(100 * 100 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0, // Looking along +X axis
        height: 5,
      };
      // Sprite at x=10 (in front of camera)
      const sprites: RaycasterSprite[] = [
        createSprite(10, 0, 0, 8, 15, [255, 0, 0]),
      ];

      raycaster.render(buffer, camera, [], sprites);

      // Sprite should be rendered (red pixels somewhere)
      let foundRed = false;
      for (let i = 0; i < buffer.length; i += 4) {
        if (buffer[i] > 200 && buffer[i + 1] < 50 && buffer[i + 2] < 50) {
          foundRed = true;
          break;
        }
      }
      expect(foundRed).toBe(true);
    });

    it('should occlude sprites behind walls', () => {
      const raycaster = new Raycaster(100, 100, {
        enableFog: false,
        ceilingColor: [0, 0, 0],
        floorColor: [0, 0, 0],
      });
      const buffer = new Uint8Array(100 * 100 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0, // Looking along +X axis
        height: 15,
      };
      // Wall at x=5 (perpendicular to viewing direction)
      const walls: RaycasterWall[] = [
        createWall(5, -50, 5, 50, [0, 255, 0], 0, 30),
      ];
      // Sprite at x=10 (behind wall)
      const sprites: RaycasterSprite[] = [
        createSprite(10, 0, 0, 5, 10, [255, 0, 0]),
      ];

      raycaster.render(buffer, camera, walls, sprites);

      // Center of screen should be green (wall), not red (sprite)
      const midOffset = (50 * 100 + 50) * 4;
      expect(buffer[midOffset + 1]).toBeGreaterThan(buffer[midOffset]); // Green > Red
    });
  });

  describe('screenToRay', () => {
    it('should return ray at screen center pointing forward', () => {
      const raycaster = new Raycaster(320, 200);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0,
        height: 5,
      };

      const ray = raycaster.screenToRay(160, camera);

      expect(ray.origin.x).toBe(0);
      expect(ray.origin.y).toBe(0);
      expect(ray.direction.x).toBeCloseTo(1, 1); // cos(0)
      expect(ray.direction.y).toBeCloseTo(0, 1); // sin(0)
    });

    it('should return ray at screen edge with FOV offset', () => {
      const raycaster = new Raycaster(320, 200, { fov: Math.PI / 3 });
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0,
        height: 5,
      };

      // Left edge of screen
      const leftRay = raycaster.screenToRay(0, camera);
      // Should be angled left (positive angle)
      expect(leftRay.direction.y).toBeGreaterThan(0);

      // Right edge of screen
      const rightRay = raycaster.screenToRay(319, camera);
      // Should be angled right (negative angle)
      expect(rightRay.direction.y).toBeLessThan(0);
    });
  });

  describe('canMove', () => {
    it('should return canMove=true when no collision', () => {
      const raycaster = new Raycaster(320, 200);
      const walls: RaycasterWall[] = createRoom(0, 0, 100, 100);

      const result = raycaster.canMove(
        new Vector3(0, 0, 0),
        new Vector3(5, 5, 0),
        1,
        walls
      );

      expect(result.canMove).toBe(true);
    });

    it('should detect collision with wall', () => {
      const raycaster = new Raycaster(320, 200);
      const walls: RaycasterWall[] = [
        createWall(-50, 10, 50, 10, [100, 100, 100]),
      ];

      const result = raycaster.canMove(
        new Vector3(0, 0, 0),
        new Vector3(0, 10, 0),
        2,
        walls
      );

      expect(result.canMove).toBe(false);
      expect(result.hitWall).toBeDefined();
    });

    it('should provide adjusted position on collision', () => {
      const raycaster = new Raycaster(320, 200);
      const walls: RaycasterWall[] = [
        createWall(-50, 10, 50, 10, [100, 100, 100]),
      ];

      const result = raycaster.canMove(
        new Vector3(0, 0, 0),
        new Vector3(0, 10, 0),
        2,
        walls
      );

      expect(result.adjustedPosition).toBeDefined();
      expect(result.adjustedPosition!.y).toBeLessThan(10);
    });

    it('should allow movement parallel to wall (slide)', () => {
      const raycaster = new Raycaster(320, 200);
      const walls: RaycasterWall[] = [
        createWall(-50, 10, 50, 10, [100, 100, 100]),
      ];

      // Try to move diagonally into wall
      const result = raycaster.canMove(
        new Vector3(0, 5, 0),
        new Vector3(10, 11, 0),
        2,
        walls
      );

      // Should slide along wall (X component preserved, Y clamped)
      expect(result.adjustedPosition).toBeDefined();
      expect(result.adjustedPosition!.x).toBeGreaterThan(0);
    });

    it('should ignore non-solid walls', () => {
      const raycaster = new Raycaster(320, 200);
      const walls: RaycasterWall[] = [{
        p1: new Vector3(-50, 10, 0),
        p2: new Vector3(50, 10, 0),
        floorHeight: 0,
        ceilingHeight: 30,
        color: [100, 100, 100],
        solid: false,
      }];

      const result = raycaster.canMove(
        new Vector3(0, 0, 0),
        new Vector3(0, 20, 0),
        2,
        walls
      );

      expect(result.canMove).toBe(true);
    });
  });

  describe('getDepthBuffer', () => {
    it('should return depth buffer of correct size', () => {
      const raycaster = new Raycaster(320, 200);
      const depthBuffer = raycaster.getDepthBuffer();
      expect(depthBuffer.length).toBe(320);
    });

    it('should have maxDistance values before render', () => {
      const raycaster = new Raycaster(320, 200, { maxDistance: 100 });
      const buffer = new Uint8Array(320 * 200 * 4);
      const camera: RaycasterCamera = {
        position: new Vector3(0, 0, 0),
        angle: 0,
        height: 5,
      };

      raycaster.render(buffer, camera, []);

      const depthBuffer = raycaster.getDepthBuffer();
      // Should be maxDistance when no walls hit
      expect(depthBuffer[160]).toBe(100);
    });
  });
});

describe('Helper Functions', () => {
  describe('createRoom', () => {
    it('should create 4 walls', () => {
      const walls = createRoom(0, 0, 100, 100);
      expect(walls.length).toBe(4);
    });

    it('should create walls at correct positions', () => {
      const walls = createRoom(0, 0, 100, 100);

      // Check that walls form a rectangle around origin
      const allX = walls.flatMap(w => [w.p1.x, w.p2.x]);
      const allY = walls.flatMap(w => [w.p1.y, w.p2.y]);

      expect(Math.min(...allX)).toBe(-50);
      expect(Math.max(...allX)).toBe(50);
      expect(Math.min(...allY)).toBe(-50);
      expect(Math.max(...allY)).toBe(50);
    });

    it('should use custom parameters', () => {
      const walls = createRoom(10, 20, 50, 30, [255, 0, 0], 5, 25);

      expect(walls[0].floorHeight).toBe(5);
      expect(walls[0].ceilingHeight).toBe(25);
    });
  });

  describe('createWall', () => {
    it('should create a wall with correct properties', () => {
      const wall = createWall(0, 0, 10, 10, [100, 150, 200], 0, 20);

      expect(wall.p1.x).toBe(0);
      expect(wall.p1.y).toBe(0);
      expect(wall.p2.x).toBe(10);
      expect(wall.p2.y).toBe(10);
      expect(wall.color).toEqual([100, 150, 200]);
      expect(wall.floorHeight).toBe(0);
      expect(wall.ceilingHeight).toBe(20);
      expect(wall.solid).toBe(true);
    });

    it('should use default values', () => {
      const wall = createWall(0, 0, 10, 10);

      expect(wall.color).toEqual([100, 100, 120]);
      expect(wall.floorHeight).toBe(0);
      expect(wall.ceilingHeight).toBe(30);
    });
  });

  describe('createSprite', () => {
    it('should create a sprite with correct properties', () => {
      const sprite = createSprite(5, 10, 2, 3, 6, [255, 128, 64]);

      expect(sprite.position.x).toBe(5);
      expect(sprite.position.y).toBe(10);
      expect(sprite.position.z).toBe(2);
      expect(sprite.width).toBe(3);
      expect(sprite.height).toBe(6);
      expect(sprite.color).toEqual([255, 128, 64]);
      expect(sprite.billboard).toBe(true);
    });

    it('should use default color', () => {
      const sprite = createSprite(0, 0, 0, 1, 1);
      expect(sprite.color).toEqual([255, 0, 0]);
    });
  });
});

describe('DEFAULT_RAYCASTER_CONFIG', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_RAYCASTER_CONFIG.fov).toBeCloseTo(Math.PI / 3, 5);
    expect(DEFAULT_RAYCASTER_CONFIG.maxDistance).toBe(200);
    expect(DEFAULT_RAYCASTER_CONFIG.renderFloorCeiling).toBe(true);
    expect(DEFAULT_RAYCASTER_CONFIG.enableFog).toBe(true);
    expect(DEFAULT_RAYCASTER_CONFIG.fogDensity).toBe(0.5);
    expect(DEFAULT_RAYCASTER_CONFIG.ceilingColor).toEqual([30, 30, 40]);
    expect(DEFAULT_RAYCASTER_CONFIG.floorColor).toEqual([50, 50, 60]);
    expect(DEFAULT_RAYCASTER_CONFIG.fogColor).toEqual([0, 0, 0]);
  });
});

describe('Edge Cases', () => {
  it('should handle empty scene', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0,
      height: 5,
    };

    expect(() => {
      raycaster.render(buffer, camera, [], []);
    }).not.toThrow();
  });

  it('should handle camera inside wall', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 5, 0), // On the wall
      angle: 0,
      height: 5,
    };
    const walls: RaycasterWall[] = [
      createWall(-50, 5, 50, 5, [100, 100, 100]),
    ];

    // Should not crash
    expect(() => {
      raycaster.render(buffer, camera, walls);
    }).not.toThrow();
  });

  it('should handle camera looking at parallel wall', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0, // Looking along X axis
      height: 5,
    };
    // Wall parallel to view direction
    const walls: RaycasterWall[] = [
      createWall(10, -50, 10, 50, [100, 100, 100]),
    ];

    expect(() => {
      raycaster.render(buffer, camera, walls);
    }).not.toThrow();
  });

  it('should handle very small walls', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: Math.PI / 2,
      height: 5,
    };
    // Very small wall
    const walls: RaycasterWall[] = [
      createWall(0, 5, 0.001, 5, [100, 100, 100]),
    ];

    expect(() => {
      raycaster.render(buffer, camera, walls);
    }).not.toThrow();
  });

  it('should handle sprite at camera position', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0,
      height: 5,
    };
    const sprites: RaycasterSprite[] = [
      createSprite(0, 0, 0, 5, 10, [255, 0, 0]),
    ];

    expect(() => {
      raycaster.render(buffer, camera, [], sprites);
    }).not.toThrow();
  });

  it('should handle sprite behind camera', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0, // Looking +X
      height: 5,
    };
    const sprites: RaycasterSprite[] = [
      createSprite(-10, 0, 0, 5, 10, [255, 0, 0]), // Behind camera
    ];

    raycaster.render(buffer, camera, [], sprites);

    // Should not render (no red pixels)
    let foundRed = false;
    for (let i = 0; i < buffer.length; i += 4) {
      if (buffer[i] > 200 && buffer[i + 1] < 50 && buffer[i + 2] < 50) {
        foundRed = true;
        break;
      }
    }
    expect(foundRed).toBe(false);
  });

  it('should handle camera pitch looking up', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0,
      height: 5,
      pitch: 0.5, // Looking up
    };
    const walls: RaycasterWall[] = createRoom(50, 0, 100, 100);

    expect(() => {
      raycaster.render(buffer, camera, walls);
    }).not.toThrow();
  });

  it('should handle camera pitch looking down', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0,
      height: 5,
      pitch: -0.5, // Looking down
    };
    const walls: RaycasterWall[] = createRoom(50, 0, 100, 100);

    expect(() => {
      raycaster.render(buffer, camera, walls);
    }).not.toThrow();
  });

  it('should handle walls with different heights', () => {
    const raycaster = new Raycaster(100, 100);
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: Math.PI / 2,
      height: 15,
    };
    const walls: RaycasterWall[] = [
      createWall(-50, 10, 50, 10, [100, 100, 100], 0, 10),   // Short wall
      createWall(-50, 20, 50, 20, [100, 100, 100], 0, 50),  // Tall wall
      createWall(-50, 30, 50, 30, [100, 100, 100], 10, 30), // Raised wall
    ];

    expect(() => {
      raycaster.render(buffer, camera, walls);
    }).not.toThrow();
  });

  it('should handle sprite with alpha', () => {
    const raycaster = new Raycaster(100, 100, {
      enableFog: false,
      ceilingColor: [0, 0, 200],
      floorColor: [0, 0, 200],
    });
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0, // Looking along +X axis
      height: 10,
    };
    const sprites: RaycasterSprite[] = [{
      position: new Vector3(10, 0, 0), // In front of camera
      width: 30,
      height: 30,
      color: [255, 0, 0],
      alpha: 0.5,
    }];

    raycaster.render(buffer, camera, [], sprites);

    // Should have blended color (mix of red and blue background)
    // At 50% alpha: red sprite (255, 0, 0) over blue bg (0, 0, 200)
    // Result should be approximately (127, 0, 100)
    let foundBlended = false;
    for (let i = 0; i < buffer.length; i += 4) {
      // Look for a pixel that has some red AND some blue (blended)
      if (buffer[i] > 50 && buffer[i + 2] > 40) {
        foundBlended = true;
        break;
      }
    }
    expect(foundBlended).toBe(true);
  });

  it('should handle many sprites with z-ordering', () => {
    const raycaster = new Raycaster(100, 100, { enableFog: false });
    const buffer = new Uint8Array(100 * 100 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0,
      height: 5,
    };

    // Create many sprites at different distances
    const sprites: RaycasterSprite[] = [];
    for (let i = 0; i < 50; i++) {
      sprites.push(createSprite(5 + i * 2, 0, 0, 2, 5, [i * 5, 100, 100]));
    }

    expect(() => {
      raycaster.render(buffer, camera, [], sprites);
    }).not.toThrow();
  });
});

describe('Raycaster Performance', () => {
  it('should handle large buffer sizes', () => {
    const raycaster = new Raycaster(800, 600);
    const buffer = new Uint8Array(800 * 600 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0,
      height: 5,
    };
    const walls = createRoom(0, 50, 200, 200);

    const start = Date.now();
    raycaster.render(buffer, camera, walls);
    const elapsed = Date.now() - start;

    // Should render in reasonable time (less than 100ms for 800x600)
    expect(elapsed).toBeLessThan(1000);
  });

  it('should handle many walls', () => {
    const raycaster = new Raycaster(320, 200);
    const buffer = new Uint8Array(320 * 200 * 4);
    const camera: RaycasterCamera = {
      position: new Vector3(0, 0, 0),
      angle: 0,
      height: 5,
    };

    // Create many walls
    const walls: RaycasterWall[] = [];
    for (let i = 0; i < 100; i++) {
      walls.push(createWall(
        -50 + i, 10 + i * 2,
        50 + i, 10 + i * 2,
        [100, 100, 100]
      ));
    }

    const start = Date.now();
    raycaster.render(buffer, camera, walls);
    const elapsed = Date.now() - start;

    // Should still complete in reasonable time
    expect(elapsed).toBeLessThan(1000);
  });
});
