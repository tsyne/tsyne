/**
 * GameMap class for Yet Another Doom Clone
 * Handles level loading, wall generation, and spatial queries
 */

import { Vector3, urandom, isInRegion as isInPolygon } from '../../cosyne/src/math3d';
import { IGameMap } from './enemy';

const ZERO = Vector3.zero();

// ============================================================================
// Map Polygon System
// ============================================================================

export interface MapPolygon {
  vertices: Vector3[];
  floorHeight: number;
  ceilHeight: number;
  lines: [Vector3, Vector3][];
}

function createMapPolygon(
  vertices: Vector3[],
  floorHeight: number,
  ceilHeight: number
): MapPolygon {
  const lines: [Vector3, Vector3][] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    lines.push([a, b]);
  }
  return { vertices, floorHeight, ceilHeight, lines };
}

// ============================================================================
// Game Map - Turtle Graphics Language
// ============================================================================

/**
 * Turtle Graphics Language Specification:
 *
 * The turtle graphics system compresses complex maze layouts into compact strings.
 * Each command is encoded in a single byte:
 *
 * Byte format: [high 3 bits: opcode] [low 5 bits: argument]
 *
 * Opcodes:
 *   0 (000): CREATE_POLYGON - Create polygon with 'arg' vertices, followed by coordinate bytes
 *   1 (001): GOTO - Move turtle without creating polygon (used for starting new areas)
 *   2 (010): SPAWN_POINT - Mark spawn point for enemies/items (arg = type)
 *   3 (011): OBJECT - Place object (arg = object type), followed by 2 bytes for position offset
 *   4 (100): SET_FLOOR - Adjust floor height: floor += 2 * (arg - 15)
 *   5 (101): SET_CEILING - Adjust ceiling height: ceiling += 4 * (arg - 15)
 *   6 (110): BACKTRACK - Pop 'arg' positions from turtle stack
 *   7 (111): RESERVED
 *
 * Coordinate bytes (following CREATE_POLYGON/GOTO):
 *   High 4 bits: X delta = (value - 7) * 8
 *   Low 4 bits: Y delta = (value - 7) * 8
 *
 * This allows positions ranging from -56 to +64 units in each axis per step.
 */

// Level data encoded in turtle graphics format
const LEVEL_DATA: string[] = [];

// ============================================================================
// Turtle Graphics Primitives for Level Building
// ============================================================================

/**
 * TurtleBuilder - Programmatic level construction using turtle graphics
 * This allows building complex maze levels with varying heights
 */
export class TurtleBuilder {
  private commands: number[] = [];
  private floor: number = 4;
  private ceiling: number = 40;

  /**
   * Encode a coordinate delta into a single byte
   * IMPORTANT: Valid range is -56 to +56 units only!
   * Values outside this range will overflow and decode incorrectly.
   * (Each axis uses 4 bits: 0-14 map to -56 to +56 via (n-7)*8)
   */
  private encodeCoord(dx: number, dy: number): number {
    const nx = Math.round(dx / 8) + 7;
    const ny = Math.round(dy / 8) + 7;
    return ((nx & 0xF) << 4) | (ny & 0xF);
  }

  /**
   * Create a polygon from relative coordinate offsets
   * @param offsets Array of [dx, dy] pairs relative to previous point
   */
  polygon(offsets: [number, number][]): this {
    // Opcode 0 (CREATE_POLYGON) with vertex count
    this.commands.push((0 << 5) | (offsets.length & 31));
    for (const [dx, dy] of offsets) {
      this.commands.push(this.encodeCoord(dx, dy));
    }
    return this;
  }

  /**
   * Move turtle without creating polygon
   */
  goto(offsets: [number, number][]): this {
    this.commands.push((1 << 5) | (offsets.length & 31));
    for (const [dx, dy] of offsets) {
      this.commands.push(this.encodeCoord(dx, dy));
    }
    return this;
  }

  /**
   * Set floor height (absolute)
   */
  setFloor(height: number): this {
    const delta = Math.round((height - this.floor) / 2);
    const arg = Math.max(0, Math.min(30, delta + 15));
    this.floor = this.floor + 2 * (arg - 15);
    this.commands.push((4 << 5) | arg);
    return this;
  }

  /**
   * Set ceiling height (absolute)
   */
  setCeiling(height: number): this {
    const delta = Math.round((height - this.ceiling) / 4);
    const arg = Math.max(0, Math.min(30, delta + 15));
    this.ceiling = this.ceiling + 4 * (arg - 15);
    this.commands.push((5 << 5) | arg);
    return this;
  }

  /**
   * Backtrack turtle position
   */
  backtrack(count: number = 1): this {
    this.commands.push((6 << 5) | (count & 31));
    return this;
  }

  /**
   * Build and return the command buffer
   */
  build(): number[] {
    return [...this.commands];
  }

  /**
   * Encode to base64 string (for compact storage)
   */
  encode(): string {
    return btoa(String.fromCharCode(...this.commands));
  }
}

// ============================================================================
// Predefined Levels
// ============================================================================

/**
 * Level 1: Training Ground
 * Simple cross-shaped layout with interconnected rooms
 *
 * Regions must share EXACT edges at connection points for wall generation to detect portals.
 * Each rectangle is [x1, y1, x2, y2, floor, ceil].
 */
function buildLevel1Regions(): MapPolygon[] {
  // Define rooms as [x1, y1, x2, y2, floorHeight, ceilHeight]
  // Connections are made by sharing exact edge coordinates
  const rooms: [number, number, number, number, number, number][] = [
    // Central room - hub with 4 doorways
    [0, 0, 80, 80, 0, 50],

    // North corridor - connects at y=80, x=24 to x=56
    [24, 80, 56, 120, 0, 40],
    // North room
    [8, 120, 72, 180, 8, 48],

    // East corridor - connects at x=80, y=24 to y=56
    [80, 24, 120, 56, 0, 40],
    // East room (sunken)
    [120, 8, 180, 72, -8, 35],

    // West corridor - connects at x=0, y=24 to y=56
    [-40, 24, 0, 56, 0, 45],
    // West room (tall)
    [-100, 8, -40, 72, 0, 56],

    // South corridor - connects at y=0, x=24 to x=56
    [24, -40, 56, 0, 0, 40],
    // South room
    [8, -100, 72, -40, 4, 44],
  ];

  return rooms.map(([x1, y1, x2, y2, floor, ceil]) => {
    const vertices = [
      new Vector3(x1, y1, 0),
      new Vector3(x2, y1, 0),
      new Vector3(x2, y2, 0),
      new Vector3(x1, y2, 0),
      new Vector3(x1, y1, 0),  // Close the polygon
    ];
    return createMapPolygon(vertices, floor, ceil);
  });
}

// Wrapper to match expected interface (returns empty turtle commands)
function buildLevel1(): number[] {
  return [];  // Level uses buildLevel1Regions() directly
}

/**
 * Level 2: The Maze
 * Complex interconnected corridors with varying heights
 * Uses direct region definition for proper portal detection.
 */
function buildLevel2Regions(): MapPolygon[] {
  // Define rooms as [x1, y1, x2, y2, floorHeight, ceilHeight]
  // Rooms connect by sharing exact edge coordinates
  const rooms: [number, number, number, number, number, number][] = [
    // Central hub room
    [0, 0, 60, 60, 0, 35],

    // === WEST PATH (descending) ===
    // West corridor from hub - connects at x=0, y=20 to y=40
    [-40, 20, 0, 40, -4, 30],
    // West room 1 (slightly lower)
    [-100, 10, -40, 50, -8, 28],
    // Southwest descent corridor - connects at y=10, x=-80 to x=-60
    [-80, -30, -60, 10, -12, 24],
    // Underground chamber (lowest point)
    [-110, -80, -30, -30, -16, 30],

    // === EAST PATH (ascending) ===
    // East corridor from hub - connects at x=60, y=20 to y=40
    [60, 20, 100, 40, 4, 38],
    // East room 1 (raised)
    [100, 10, 160, 50, 8, 42],
    // Northeast ascent corridor - connects at y=50, x=120 to x=140
    [120, 50, 140, 90, 12, 46],
    // High chamber (highest point)
    [90, 90, 170, 150, 16, 55],

    // === CONNECTING CORRIDOR (bridges high and low) ===
    // Vertical corridor south of hub - connects at y=0, x=20 to x=40
    [20, -40, 40, 0, 0, 35],
    // Mid section going southwest
    [-20, -80, 40, -40, -4, 32],
    // Connect to underground chamber - connects at x=-30, y=-70 to y=-50
    [-30, -70, 20, -50, -10, 28],

    // === NORTH WING ===
    // North corridor from hub - connects at y=60, x=20 to x=40
    [20, 60, 40, 100, 2, 38],
    // North room
    [0, 100, 60, 150, 6, 45],
  ];

  return rooms.map(([x1, y1, x2, y2, floor, ceil]) => {
    const vertices = [
      new Vector3(x1, y1, 0),
      new Vector3(x2, y1, 0),
      new Vector3(x2, y2, 0),
      new Vector3(x1, y2, 0),
      new Vector3(x1, y1, 0),  // Close the polygon
    ];
    return createMapPolygon(vertices, floor, ceil);
  });
}

// Legacy function - kept for API compatibility but no longer used
function buildLevel2(): number[] {
  return [];  // Level now uses buildLevel2Regions() directly
}

/**
 * Level 3: The Fortress
 * Large arena with multiple height tiers and defensive positions
 * Note: Coordinate deltas must be in range [-56, +56] due to encoding limits
 */
function buildLevel3(): number[] {
  const t = new TurtleBuilder();

  // Central arena (ground level) - use max size 56
  t.setFloor(0).setCeiling(56);
  t.polygon([[56, 0], [0, 56], [-56, 0], [0, -56]]);

  // North raised platform
  t.backtrack(2);
  t.setFloor(12).setCeiling(55);
  t.polygon([[56, 0], [0, 40], [-56, 0], [0, -40]]);

  // Sniper tower (very high)
  t.backtrack(2);
  t.setFloor(24).setCeiling(56);
  t.polygon([[24, 0], [0, 24], [-24, 0], [0, -24]]);

  // Return to arena, go East
  t.backtrack(6);
  t.goto([[56, 0]]);

  // East corridor
  t.setFloor(0).setCeiling(40);
  t.polygon([[30, 0], [0, 56], [-30, 0], [0, -56]]);

  // East bunker (sunken)
  t.backtrack(2);
  t.setFloor(-8).setCeiling(30);
  t.polygon([[48, 0], [0, 48], [-48, 0], [0, -48]]);

  // Return to arena, go South
  t.backtrack(6);
  t.goto([[0, -56]]);

  // South entrance hall
  t.setFloor(0).setCeiling(45);
  t.polygon([[48, 0], [0, -48], [-48, 0], [0, 48]]);

  // South guard rooms (flanking)
  t.backtrack(2);
  t.setFloor(4).setCeiling(35);
  t.polygon([[30, 0], [0, -30], [-30, 0], [0, 30]]);

  t.backtrack(4);
  t.goto([[-48, 0]]);
  t.setFloor(4).setCeiling(35);
  t.polygon([[-30, 0], [0, -30], [30, 0], [0, 30]]);

  // Return to arena, go West
  t.backtrack(6);
  t.goto([[-56, 0]]);

  // West wing
  t.setFloor(0).setCeiling(50);
  t.polygon([[-40, 0], [0, 56], [40, 0], [0, -56]]);

  // West storage (low ceiling)
  t.backtrack(2);
  t.setFloor(0).setCeiling(25);
  t.polygon([[-48, 0], [0, 40], [48, 0], [0, -40]]);

  return t.build();
}

/**
 * Level 4: The Labyrinth
 * Tight winding corridors with many turns
 */
function buildLevel4(): number[] {
  const t = new TurtleBuilder();

  // Start room
  t.setFloor(0).setCeiling(35);
  t.polygon([[35, 0], [0, 35], [-35, 0], [0, -35]]);

  // Winding corridor 1
  t.backtrack(2);
  t.polygon([[20, 0], [0, 50], [-20, 0], [0, -50]]);
  t.backtrack(2);
  t.polygon([[50, 0], [0, 20], [-50, 0], [0, -20]]);
  t.backtrack(2);
  t.polygon([[20, 0], [0, 50], [-20, 0], [0, -50]]);

  // Junction room
  t.backtrack(2);
  t.setFloor(4).setCeiling(40);
  t.polygon([[40, 0], [0, 40], [-40, 0], [0, -40]]);

  // Branch East
  t.backtrack(2);
  t.setFloor(4).setCeiling(32);
  t.polygon([[50, 0], [0, 20], [-50, 0], [0, -20]]);
  t.backtrack(2);
  t.polygon([[20, 0], [0, -40], [-20, 0], [0, 40]]);
  t.backtrack(2);
  t.setFloor(0).setCeiling(30);
  t.polygon([[40, 0], [0, 40], [-40, 0], [0, -40]]);

  // Return to junction, go West
  t.backtrack(8);
  t.goto([[-40, 0]]);
  t.setFloor(4).setCeiling(32);
  t.polygon([[-50, 0], [0, 20], [50, 0], [0, -20]]);
  t.backtrack(2);
  t.polygon([[-20, 0], [0, 40], [20, 0], [0, -40]]);
  t.backtrack(2);
  t.setFloor(8).setCeiling(38);
  t.polygon([[-40, 0], [0, 40], [40, 0], [0, -40]]);

  // Secret chamber (very low ceiling)
  t.backtrack(2);
  t.setFloor(8).setCeiling(22);
  t.polygon([[-30, 0], [0, -30], [30, 0], [0, 30]]);

  return t.build();
}

/**
 * Level 5: The Pit
 * Vertical level with many height changes
 * Note: Coordinate deltas must be in range [-56, +56] due to encoding limits
 */
function buildLevel5(): number[] {
  const t = new TurtleBuilder();

  // Top platform (starting point)
  t.setFloor(30).setCeiling(56);
  t.polygon([[48, 0], [0, 48], [-48, 0], [0, -48]]);

  // Stairs down - step 1
  t.backtrack(2);
  t.setFloor(24).setCeiling(56);
  t.polygon([[30, 0], [0, 30], [-30, 0], [0, -30]]);

  // Step 2
  t.backtrack(2);
  t.setFloor(18).setCeiling(55);
  t.polygon([[30, 0], [0, 30], [-30, 0], [0, -30]]);

  // Step 3
  t.backtrack(2);
  t.setFloor(12).setCeiling(50);
  t.polygon([[30, 0], [0, 30], [-30, 0], [0, -30]]);

  // Step 4
  t.backtrack(2);
  t.setFloor(6).setCeiling(45);
  t.polygon([[30, 0], [0, 30], [-30, 0], [0, -30]]);

  // Bottom of the pit
  t.backtrack(2);
  t.setFloor(-10).setCeiling(56);
  t.polygon([[56, 0], [0, 56], [-56, 0], [0, -56]]);

  // Alcoves around the pit
  t.backtrack(2);
  t.setFloor(-10).setCeiling(30);
  t.polygon([[40, 0], [0, 20], [-40, 0], [0, -20]]);

  t.backtrack(4);
  t.goto([[0, 56]]);
  t.setFloor(-10).setCeiling(30);
  t.polygon([[20, 0], [0, 40], [-20, 0], [0, -40]]);

  t.backtrack(4);
  t.goto([[-56, 0]]);
  t.setFloor(-10).setCeiling(30);
  t.polygon([[-40, 0], [0, 20], [40, 0], [0, -20]]);

  return t.build();
}

function uncompress(b64: string): number[] {
  const binary = atob(b64);
  return binary.split('').map((c) => c.charCodeAt(0));
}

export function runTurtle(commands: number[]): MapPolygon[] {
  const regions: MapPolygon[] = [];
  const turtleLocation: Vector3[] = [ZERO.clone()];
  let floorHeight = 4;
  let ceilHeight = 40;

  let i = 0;
  while (i < commands.length) {
    const cmd = commands[i++];
    const low = cmd & 31;
    const high = cmd >> 5;

    if (high <= 1) {
      // Create new region with [low] vertices
      const vertices: Vector3[] = [turtleLocation[0].clone()];
      for (let j = 0; j < low; j++) {
        if (i >= commands.length) break;
        const dx = ((commands[i] >> 4) - 7) * 8;
        const dy = ((commands[i] & 15) - 7) * 8;
        i++;
        const newPos = turtleLocation[0].add(new Vector3(dx, dy, 0));
        turtleLocation.unshift(newPos);
        vertices.push(newPos.clone());
      }

      if (high === 0) {
        // Create region
        regions.push(createMapPolygon(vertices, floorHeight, ceilHeight));
      }
      // high === 1 means goto, don't create region
    } else if (high === 3) {
      // Object placement - skip for now
      i += 2;
    } else if (high === 4) {
      // Adjust floor height
      floorHeight += 2 * (low - 15);
    } else if (high === 5) {
      // Adjust ceiling height
      ceilHeight += 4 * (low - 15);
    } else if (high === 6) {
      // Backtrack turtle location
      turtleLocation.splice(0, low);
    }
  }

  return regions;
}

// ============================================================================
// Wall Segment Class
// ============================================================================

/**
 * WallSegment - a wall defined by two endpoints
 * Simpler representation for raycasting
 */
export class WallSegment {
  p1: Vector3;  // First endpoint
  p2: Vector3;  // Second endpoint
  floorZ: number;  // Z position of wall bottom
  height: number;  // Wall height

  constructor(p1: Vector3, p2: Vector3, floorZ: number, height: number) {
    this.p1 = p1;
    this.p2 = p2;
    this.floorZ = floorZ;
    this.height = Math.abs(height);
  }
}

// Alias for compatibility
export type Wall = WallSegment;

// ============================================================================
// Level Metadata
// ============================================================================

export interface LevelInfo {
  name: string;
  description: string;
  startPosition: Vector3;
  enemySpawnPoints: { walking: Vector3[]; flying: Vector3[] };
}

/**
 * Level registry with metadata and builder functions
 */
const LEVEL_BUILDERS: Array<{
  info: LevelInfo;
  build: () => number[];
}> = [
  {
    info: {
      name: 'Training Ground',
      description: 'A simple arena to learn the controls',
      startPosition: new Vector3(40, 40, 6),
      enemySpawnPoints: {
        walking: [
          new Vector3(40, 150, 0),  // North room (floor=8)
          new Vector3(150, 40, 0),   // East room (floor=-8)
          new Vector3(-70, 40, 0),   // West room (floor=0)
        ],
        flying: [
          new Vector3(40, -70, 25),  // South room (floor=4)
          new Vector3(60, 60, 20),   // Central room
        ],
      },
    },
    build: buildLevel1,
  },
  {
    info: {
      name: 'The Maze',
      description: 'Winding corridors with height variation',
      startPosition: new Vector3(30, 30, 6),  // Central hub
      enemySpawnPoints: {
        walking: [
          new Vector3(-70, 30, 0),   // West room 1 (floor=-8)
          new Vector3(130, 30, 0),   // East room 1 (floor=8)
          new Vector3(-70, -55, 0),  // Underground chamber (floor=-16)
          new Vector3(130, 120, 0),  // High chamber (floor=16)
          new Vector3(30, 125, 0),   // North room (floor=6)
        ],
        flying: [
          new Vector3(30, 125, 30),  // North room
          new Vector3(130, 120, 40), // High chamber
          new Vector3(-70, -55, 10), // Underground chamber
        ],
      },
    },
    build: buildLevel2,
  },
  {
    info: {
      name: 'The Fortress',
      description: 'A large arena with defensive positions',
      startPosition: new Vector3(20, -50, 6),
      enemySpawnPoints: {
        walking: [
          new Vector3(20, 20, 0),
          new Vector3(80, 20, 0),
          new Vector3(-80, 20, 0),
          new Vector3(20, 60, 0),
        ],
        flying: [
          new Vector3(20, 40, 35),
          new Vector3(-60, 20, 30),
          new Vector3(60, -40, 25),
        ],
      },
    },
    build: buildLevel3,
  },
  {
    info: {
      name: 'The Labyrinth',
      description: 'Tight corridors and hidden chambers',
      startPosition: new Vector3(15, 15, 6),
      enemySpawnPoints: {
        walking: [
          new Vector3(20, 100, 0),
          new Vector3(100, 100, 0),
          new Vector3(-100, 100, 0),
        ],
        flying: [
          new Vector3(70, 70, 20),
          new Vector3(-70, 60, 25),
        ],
      },
    },
    build: buildLevel4,
  },
  {
    info: {
      name: 'The Pit',
      description: 'Descend into the depths',
      startPosition: new Vector3(20, 20, 36),
      enemySpawnPoints: {
        walking: [
          new Vector3(20, 60, 0),
          new Vector3(50, 20, 0),
          new Vector3(-50, 20, 0),
        ],
        flying: [
          new Vector3(20, 20, 40),
          new Vector3(40, 40, 25),
          new Vector3(-30, -30, 30),
        ],
      },
    },
    build: buildLevel5,
  },
];

/**
 * Get total number of available levels
 */
export function getLevelCount(): number {
  return LEVEL_BUILDERS.length;
}

/**
 * Get level info by index
 */
export function getLevelInfo(levelIndex: number): LevelInfo | null {
  const level = LEVEL_BUILDERS[levelIndex];
  return level ? level.info : null;
}

/**
 * Get all level infos
 */
export function getAllLevelInfos(): LevelInfo[] {
  return LEVEL_BUILDERS.map((l) => l.info);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Subtract a range from a list of ranges.
 * E.g., [[0, 100]] - [20, 40] = [[0, 20], [40, 100]]
 */
function subtractRange(segments: [number, number][], removeStart: number, removeEnd: number): [number, number][] {
  const result: [number, number][] = [];
  for (const [start, end] of segments) {
    if (removeEnd <= start || removeStart >= end) {
      // No overlap, keep segment as-is
      result.push([start, end]);
    } else {
      // Overlap - split into up to two segments
      if (start < removeStart) {
        result.push([start, removeStart]);
      }
      if (removeEnd < end) {
        result.push([removeEnd, end]);
      }
    }
  }
  return result;
}

// ============================================================================
// Game Map Class
// ============================================================================

export class GameMap implements IGameMap {
  regions: MapPolygon[] = [];
  walls: WallSegment[] = [];
  currentLevel: number = 0;
  levelInfo: LevelInfo | null = null;

  constructor(levelIndex: number = 0) {
    this.loadLevel(levelIndex);
  }

  loadLevel(levelIndex: number): void {
    const levelBuilder = LEVEL_BUILDERS[levelIndex % LEVEL_BUILDERS.length];
    this.currentLevel = levelIndex % LEVEL_BUILDERS.length;
    this.levelInfo = levelBuilder.info;

    // Build level - levels 1 and 2 use direct region definition, others use turtle commands
    if (this.currentLevel === 0) {
      this.regions = buildLevel1Regions();
    } else if (this.currentLevel === 1) {
      this.regions = buildLevel2Regions();
    } else {
      this.regions = runTurtle(levelBuilder.build());
    }

    // Build walls from region edges, detecting portals (shared/overlapping edges)
    this.walls = [];

    // Collect all edges with their heights
    interface Edge {
      p1: Vector3;
      p2: Vector3;
      floor: number;
      ceil: number;
      isHorizontal: boolean;
      isVertical: boolean;
    }
    const edges: Edge[] = [];

    for (const region of this.regions) {
      for (const [p1, p2] of region.lines) {
        // Normalize edge direction (smaller coord first)
        const pt1 = p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y) ? p1 : p2;
        const pt2 = p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y) ? p2 : p1;
        edges.push({
          p1: pt1,
          p2: pt2,
          floor: region.floorHeight,
          ceil: region.ceilHeight,
          isHorizontal: pt1.y === pt2.y,
          isVertical: pt1.x === pt2.x,
        });
      }
    }

    // For each edge, find overlapping edges and create walls only for non-overlapping portions
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      let segments: [number, number][] = [];  // Ranges along the edge that need walls

      if (edge.isHorizontal) {
        segments = [[edge.p1.x, edge.p2.x]];
        // Find overlapping horizontal edges at same Y
        for (let j = 0; j < edges.length; j++) {
          if (i === j) continue;
          const other = edges[j];
          if (!other.isHorizontal || other.p1.y !== edge.p1.y) continue;
          // Check for overlap
          const overlapStart = Math.max(edge.p1.x, other.p1.x);
          const overlapEnd = Math.min(edge.p2.x, other.p2.x);
          if (overlapStart < overlapEnd) {
            // Remove overlapping portion from segments
            segments = subtractRange(segments, overlapStart, overlapEnd);
          }
        }
        // Create walls for remaining segments
        for (const [start, end] of segments) {
          if (end > start) {
            this.walls.push(new WallSegment(
              new Vector3(start, edge.p1.y, 0),
              new Vector3(end, edge.p1.y, 0),
              edge.floor,
              edge.ceil - edge.floor
            ));
          }
        }
      } else if (edge.isVertical) {
        segments = [[edge.p1.y, edge.p2.y]];
        // Find overlapping vertical edges at same X
        for (let j = 0; j < edges.length; j++) {
          if (i === j) continue;
          const other = edges[j];
          if (!other.isVertical || other.p1.x !== edge.p1.x) continue;
          // Check for overlap
          const overlapStart = Math.max(edge.p1.y, other.p1.y);
          const overlapEnd = Math.min(edge.p2.y, other.p2.y);
          if (overlapStart < overlapEnd) {
            segments = subtractRange(segments, overlapStart, overlapEnd);
          }
        }
        // Create walls for remaining segments
        for (const [start, end] of segments) {
          if (end > start) {
            this.walls.push(new WallSegment(
              new Vector3(edge.p1.x, start, 0),
              new Vector3(edge.p1.x, end, 0),
              edge.floor,
              edge.ceil - edge.floor
            ));
          }
        }
      }
    }

  }

  getFloorHeight(position: Vector3): number {
    const region = this.getRegionAt(position);
    return region ? region.floorHeight : -100;
  }

  isInRegion(region: MapPolygon, position: Vector3): boolean {
    // Use cosyne's point-in-polygon algorithm with slight jitter to avoid edge cases
    const jitteredPos = new Vector3(
      position.x + urandom() * 0.01,
      position.y + urandom() * 0.01,
      position.z
    );
    return isInPolygon(region.vertices, jitteredPos);
  }

  getRegionAt(position: Vector3): MapPolygon | null {
    for (const region of this.regions) {
      if (this.isInRegion(region, position)) {
        return region;
      }
    }
    return null;
  }
}
