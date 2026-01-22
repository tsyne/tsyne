/**
 * FPS Advanced - Tsyne Port
 *
 * A first-person shooter engine featuring brush-based geometry
 * and BVH accelerated swept point-based collision detection with
 * Quake-style movement including surfing.
 *
 * @tsyne-app:name FPS Advanced
 * @tsyne-app:icon mediaPlay
 * @tsyne-app:category Games
 * @tsyne-app:args (a: App) => void
 *
 * Original: https://github.com/lizard-demon/fps-advanced
 * Portions copyright Spyware (lizard-demon) and portions copyright Paul Hammant 2025
 */

import { Vector3, Matrix4, Box3, Ray, degToRad } from '../../cosyne/src/math3d';

// ============================================================================
// MATH UTILITIES
// ============================================================================

/**
 * Extended AABB class for collision detection
 */
export class AABB {
  constructor(
    public min: Vector3 = new Vector3(Infinity, Infinity, Infinity),
    public max: Vector3 = new Vector3(-Infinity, -Infinity, -Infinity)
  ) {}

  static fromCenterSize(center: Vector3, size: Vector3): AABB {
    const half = size.multiplyScalar(0.5);
    return new AABB(center.sub(half), center.add(half));
  }

  intersects(other: AABB): boolean {
    return !(
      this.min.x > other.max.x || this.max.x < other.min.x ||
      this.min.y > other.max.y || this.max.y < other.min.y ||
      this.min.z > other.max.z || this.max.z < other.min.z
    );
  }

  unionWith(other: AABB): AABB {
    return new AABB(
      new Vector3(
        Math.min(this.min.x, other.min.x),
        Math.min(this.min.y, other.min.y),
        Math.min(this.min.z, other.min.z)
      ),
      new Vector3(
        Math.max(this.max.x, other.max.x),
        Math.max(this.max.y, other.max.y),
        Math.max(this.max.z, other.max.z)
      )
    );
  }

  containsPoint(point: Vector3): boolean {
    return (
      point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z
    );
  }

  surfaceArea(): number {
    const d = this.max.sub(this.min);
    return 2.0 * (d.x * d.y + d.y * d.z + d.z * d.x);
  }

  expand(radius: number): AABB {
    const radiusVec = new Vector3(radius, radius, radius);
    return new AABB(this.min.sub(radiusVec), this.max.add(radiusVec));
  }

  clone(): AABB {
    return new AABB(this.min.clone(), this.max.clone());
  }
}

/**
 * Calculate wish direction from input and yaw
 */
export function wishDir(fwd: number, right: number, yaw: number): Vector3 {
  const fwdVec = new Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  const sideVec = new Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  return fwdVec.multiplyScalar(fwd).add(sideVec.multiplyScalar(right));
}

/**
 * Create view matrix from position, yaw, pitch, and eye height
 */
export function viewMatrix(pos: Vector3, yaw: number, pitch: number, eyeHeight: number): Matrix4 {
  const eye = pos.add(new Vector3(0, eyeHeight, 0));
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);

  const m = new Matrix4();
  m.elements[0] = cy;
  m.elements[1] = sy * sp;
  m.elements[2] = -sy * cp;
  m.elements[3] = 0;
  m.elements[4] = 0;
  m.elements[5] = cp;
  m.elements[6] = sp;
  m.elements[7] = 0;
  m.elements[8] = sy;
  m.elements[9] = -cy * sp;
  m.elements[10] = cy * cp;
  m.elements[11] = 0;
  m.elements[12] = -eye.x * cy - eye.z * sy;
  m.elements[13] = -eye.x * sy * sp - eye.y * cp + eye.z * cy * sp;
  m.elements[14] = eye.x * sy * cp - eye.y * sp - eye.z * cy * cp;
  m.elements[15] = 1;

  return m;
}

// ============================================================================
// PLANE AND BRUSH GEOMETRY
// ============================================================================

export interface Plane {
  normal: Vector3;
  distance: number;
}

/**
 * Collection of planes defining a convex brush
 */
export class Planes {
  constructor(
    public normals: Vector3[],
    public distances: number[]
  ) {}

  len(): number {
    return this.normals.length;
  }

  distanceToPoint(index: number, point: Vector3): number {
    return this.normals[index].dot(point) + this.distances[index];
  }

  rayIntersect(index: number, rayStart: Vector3, rayDir: Vector3): number | null {
    const normal = this.normals[index];
    const distance = this.distances[index];

    const denom = normal.dot(rayDir);
    if (Math.abs(denom) < 1e-7) return null; // Ray parallel to plane

    const t = -(normal.dot(rayStart) + distance) / denom;
    return t >= 0 ? t : null;
  }
}

/**
 * Brush - convex polyhedron defined by planes
 */
export class Brush {
  constructor(
    public planes: Planes,
    public bounds: AABB
  ) {}

  expand(radius: number): Brush {
    // Expand each plane outward by the radius
    const expandedNormals = this.planes.normals.map(n => n.clone());
    const expandedDistances = this.planes.distances.map(d => d - radius);

    return new Brush(
      new Planes(expandedNormals, expandedDistances),
      this.bounds.expand(radius)
    );
  }

  rayIntersect(rayStart: Vector3, rayDir: Vector3, maxDistance: number): Plane | null {
    let entryTime = 0;
    let exitTime = maxDistance;
    let hitNormal = Vector3.zero();

    for (let i = 0; i < this.planes.len(); i++) {
      const normal = this.planes.normals[i];
      const t = this.planes.rayIntersect(i, rayStart, rayDir);

      if (t !== null) {
        const dot = normal.dot(rayDir);
        if (dot < 0) { // Entering
          if (t > entryTime) {
            entryTime = t;
            hitNormal = normal;
          }
        } else { // Exiting
          if (t < exitTime) {
            exitTime = t;
          }
        }
      } else {
        // Ray parallel to plane - check if we're on the wrong side
        if (this.planes.distanceToPoint(i, rayStart) > 0) return null;
      }
    }

    if (entryTime <= exitTime && entryTime <= maxDistance && entryTime >= 1e-7) {
      return { normal: hitNormal, distance: entryTime };
    }

    return null;
  }
}

// ============================================================================
// BVH (Bounding Volume Hierarchy)
// ============================================================================

enum NodeType {
  XAxis = 0,
  YAxis = 1,
  ZAxis = 2,
  Leaf = 3
}

interface BVHNode {
  first: number;
  count: number;
  nodeType: NodeType;
  bounds: AABB;
}

const BVH_CONFIG = {
  traversalCost: 0.3,
  maxLeafSize: 4,
  splitCandidates: 8,
  maxStackDepth: 64
};

/**
 * BVH for spatial acceleration of collision queries
 */
export class BVH<T> {
  items: T[];
  nodes: BVHNode[] = [];
  indices: number[] = [];
  getBounds: (item: T) => AABB;

  constructor(items: T[], getBounds: (item: T) => AABB) {
    this.items = items;
    this.getBounds = getBounds;

    if (items.length === 0) return;

    this.indices = items.map((_, i) => i);
    this.build();
  }

  query(queryBounds: AABB, testFn: (item: T) => boolean): boolean {
    if (this.nodes.length === 0) {
      for (const item of this.items) {
        if (testFn(item)) return true;
      }
      return false;
    }

    const stack: number[] = [0];

    while (stack.length > 0) {
      const nodeIdx = stack.pop()!;
      if (nodeIdx >= this.nodes.length) continue;

      const node = this.nodes[nodeIdx];
      if (!node.bounds.intersects(queryBounds)) continue;

      if (node.nodeType === NodeType.Leaf) {
        const end = Math.min(node.first + node.count, this.indices.length);
        for (let i = node.first; i < end; i++) {
          if (testFn(this.items[this.indices[i]])) return true;
        }
      } else {
        const leftChild = node.first;
        const rightChild = leftChild + 1;
        if (rightChild < this.nodes.length) stack.push(rightChild);
        if (leftChild < this.nodes.length) stack.push(leftChild);
      }
    }
    return false;
  }

  private build(): void {
    const tempNodes: BVHNode[] = [];
    this.buildRecursive(0, this.items.length, tempNodes);
    this.flatten(tempNodes);
  }

  private buildRecursive(start: number, count: number, nodes: BVHNode[]): number {
    const nodeIdx = nodes.length;
    let bounds = this.getBounds(this.items[this.indices[start]]);

    for (let i = start + 1; i < start + count; i++) {
      bounds = bounds.unionWith(this.getBounds(this.items[this.indices[i]]));
    }

    nodes.push({
      first: start,
      count: count,
      nodeType: NodeType.Leaf,
      bounds: bounds
    });

    if (count <= BVH_CONFIG.maxLeafSize) return nodeIdx;

    const bestSplit = this.findBestSplit(start, count, bounds);
    if (bestSplit.cost >= count) return nodeIdx;

    const splitIdx = this.partition(start, count, bestSplit.axis, bestSplit.pos);
    const leftCount = splitIdx - start;
    const rightCount = (start + count) - splitIdx;
    if (leftCount === 0 || rightCount === 0) return nodeIdx;

    const leftChild = this.buildRecursive(start, leftCount, nodes);
    this.buildRecursive(splitIdx, rightCount, nodes);

    nodes[nodeIdx] = {
      first: leftChild,
      count: 0,
      nodeType: bestSplit.axis as NodeType,
      bounds: bounds
    };

    return nodeIdx;
  }

  private findBestSplit(start: number, count: number, bounds: AABB): { axis: number; pos: number; cost: number } {
    let best = { axis: 0, pos: 0, cost: Infinity };
    const parentArea = bounds.surfaceArea();
    if (parentArea <= 0) return best;

    for (let axis = 0; axis < 3; axis++) {
      const axisMin = axis === 0 ? bounds.min.x : axis === 1 ? bounds.min.y : bounds.min.z;
      const axisMax = axis === 0 ? bounds.max.x : axis === 1 ? bounds.max.y : bounds.max.z;
      const axisRange = axisMax - axisMin;
      if (axisRange <= 1e-7) continue;

      const step = axisRange / BVH_CONFIG.splitCandidates;
      for (let candidate = 0; candidate < BVH_CONFIG.splitCandidates; candidate++) {
        const splitPos = axisMin + step * (candidate + 0.5);

        let leftBounds: AABB | null = null;
        let rightBounds: AABB | null = null;
        let leftCount = 0;
        let rightCount = 0;

        for (let j = start; j < start + count; j++) {
          const primBounds = this.getBounds(this.items[this.indices[j]]);
          const primMin = axis === 0 ? primBounds.min.x : axis === 1 ? primBounds.min.y : primBounds.min.z;
          const primMax = axis === 0 ? primBounds.max.x : axis === 1 ? primBounds.max.y : primBounds.max.z;
          const centroid = (primMin + primMax) * 0.5;

          if (centroid < splitPos) {
            leftCount++;
            leftBounds = leftBounds ? leftBounds.unionWith(primBounds) : primBounds.clone();
          } else {
            rightCount++;
            rightBounds = rightBounds ? rightBounds.unionWith(primBounds) : primBounds.clone();
          }
        }

        if (leftCount === 0 || rightCount === 0) continue;

        const leftArea = leftBounds ? leftBounds.surfaceArea() : 0;
        const rightArea = rightBounds ? rightBounds.surfaceArea() : 0;
        const cost = BVH_CONFIG.traversalCost +
          (leftArea / parentArea) * leftCount +
          (rightArea / parentArea) * rightCount;

        if (cost < best.cost) {
          best = { axis, pos: splitPos, cost };
        }
      }
    }
    return best;
  }

  private partition(start: number, count: number, axis: number, splitPos: number): number {
    let left = start;
    let right = start + count - 1;

    while (left <= right) {
      const primBounds = this.getBounds(this.items[this.indices[left]]);
      const primMin = axis === 0 ? primBounds.min.x : axis === 1 ? primBounds.min.y : primBounds.min.z;
      const primMax = axis === 0 ? primBounds.max.x : axis === 1 ? primBounds.max.y : primBounds.max.z;
      const centroid = (primMin + primMax) * 0.5;

      if (centroid < splitPos) {
        left++;
      } else {
        const temp = this.indices[left];
        this.indices[left] = this.indices[right];
        this.indices[right] = temp;
        if (right === 0) break;
        right--;
      }
    }
    return left;
  }

  private flatten(treeNodes: BVHNode[]): void {
    if (treeNodes.length === 0) return;

    const queue: number[] = [0];
    let queueHead = 0;
    let writeIdx = 0;

    while (queueHead < queue.length && writeIdx < treeNodes.length) {
      const treeIdx = queue[queueHead++];
      if (treeIdx >= treeNodes.length) continue;

      const treeNode = treeNodes[treeIdx];
      this.nodes.push({ ...treeNode });

      if (treeNode.nodeType !== NodeType.Leaf) {
        const leftTreeIdx = treeNode.first;
        const rightTreeIdx = leftTreeIdx + 1;

        const leftBfIdx = writeIdx + (queue.length - queueHead) + 1;
        this.nodes[writeIdx] = {
          first: leftBfIdx,
          count: treeNode.count,
          nodeType: treeNode.nodeType,
          bounds: treeNode.bounds
        };

        if (leftTreeIdx < treeNodes.length) queue.push(leftTreeIdx);
        if (rightTreeIdx < treeNodes.length) queue.push(rightTreeIdx);
      }
      writeIdx++;
    }
  }
}

// ============================================================================
// PHYSICS ENGINE
// ============================================================================

export const PHYSICS_CONFIG = {
  // Movement physics
  gravity: 6.0,
  jumpVelocity: 2.0,
  maxSpeed: 4.0,
  airSpeed: 0.7,
  acceleration: 70.0,
  friction: 5.0,

  // Collision detection
  margin: 0.02,
  slopeLimit: 0.707, // 45 degrees
  maxSlideIterations: 3,

  // Player dimensions
  playerRadius: 0.3,

  // View
  eyeHeight: 0.6,
  mouseSensitivity: 0.002,
  pitchLimit: 1.5,

  // Thresholds
  frictionThreshold: 0.1
};

export interface PhysicsState {
  pos: Vector3;
  vel: Vector3;
  grounded: boolean;
  yaw: number;
  pitch: number;
}

/**
 * Physics world with BVH acceleration
 */
export class World {
  bvh: BVH<Brush>;
  brushes: Brush[];
  stack: number[] = [];

  constructor(originalBrushes: Brush[]) {
    if (originalBrushes.length === 0) {
      throw new Error('World requires at least one brush');
    }

    // Expand brushes by player radius for point-based collision
    this.brushes = originalBrushes.map(b => b.expand(PHYSICS_CONFIG.playerRadius));
    this.bvh = new BVH(this.brushes, b => b.bounds);
  }

  raycast(rayStart: Vector3, rayDir: Vector3, maxDistance: number): Plane | null {
    let bestHit: Plane | null = null;
    let bestDistance = maxDistance;

    // Create ray AABB for BVH traversal
    const rayEnd = rayStart.add(rayDir.multiplyScalar(maxDistance));
    const rayBounds = new AABB(
      new Vector3(
        Math.min(rayStart.x, rayEnd.x),
        Math.min(rayStart.y, rayEnd.y),
        Math.min(rayStart.z, rayEnd.z)
      ),
      new Vector3(
        Math.max(rayStart.x, rayEnd.x),
        Math.max(rayStart.y, rayEnd.y),
        Math.max(rayStart.z, rayEnd.z)
      )
    );

    this.stack.length = 0;
    this.stack.push(0);

    while (this.stack.length > 0) {
      const nodeIdx = this.stack.pop()!;
      if (nodeIdx >= this.bvh.nodes.length) continue;

      const node = this.bvh.nodes[nodeIdx];
      if (!node.bounds.intersects(rayBounds)) continue;

      if (node.nodeType === NodeType.Leaf) {
        const end = Math.min(node.first + node.count, this.bvh.indices.length);
        for (let i = node.first; i < end; i++) {
          const hit = this.bvh.items[this.bvh.indices[i]].rayIntersect(rayStart, rayDir, bestDistance);
          if (hit && hit.distance < bestDistance) {
            bestDistance = hit.distance;
            bestHit = hit;
          }
        }
      } else {
        const left = node.first;
        if (left + 1 < this.bvh.nodes.length) this.stack.push(left + 1);
        if (left < this.bvh.nodes.length) this.stack.push(left);
      }
    }

    return bestHit;
  }
}

/**
 * Physics engine with Quake-style movement
 */
export class Physics {
  state: PhysicsState = {
    pos: Vector3.zero(),
    vel: Vector3.zero(),
    grounded: false,
    yaw: 0,
    pitch: 0
  };

  update(world: World, wishDir: Vector3, jump: boolean, dt: number): void {
    // Apply friction before acceleration
    if (this.state.grounded) this.friction(dt);

    // Apply gravity
    if (!this.state.grounded) {
      this.state.vel = new Vector3(
        this.state.vel.x,
        this.state.vel.y - PHYSICS_CONFIG.gravity * dt,
        this.state.vel.z
      );
    }

    // Jump
    if (jump && this.state.grounded) {
      this.state.vel = new Vector3(
        this.state.vel.x,
        PHYSICS_CONFIG.jumpVelocity,
        this.state.vel.z
      );
    }

    this.accelerate(wishDir, dt);

    // Move and handle collision
    this.move(world, this.state.vel.multiplyScalar(dt));
  }

  private accelerate(wishDir: Vector3, dt: number): void {
    const len = Math.sqrt(wishDir.x * wishDir.x + wishDir.z * wishDir.z);
    if (len < 1e-7) return;

    const wish = wishDir.multiplyScalar(1.0 / len);
    const maxVel = this.state.grounded
      ? PHYSICS_CONFIG.maxSpeed * len
      : Math.min(PHYSICS_CONFIG.maxSpeed * len, PHYSICS_CONFIG.airSpeed);
    const currentVel = new Vector3(this.state.vel.x, 0, this.state.vel.z).dot(wish);
    const accel = Math.min(PHYSICS_CONFIG.acceleration * dt, Math.max(0, maxVel - currentVel));

    this.state.vel = new Vector3(
      this.state.vel.x + wish.x * accel,
      this.state.vel.y,
      this.state.vel.z + wish.z * accel
    );
  }

  private friction(dt: number): void {
    const speed = Math.sqrt(this.state.vel.x * this.state.vel.x + this.state.vel.z * this.state.vel.z);
    if (speed <= PHYSICS_CONFIG.frictionThreshold) {
      this.state.vel = new Vector3(0, this.state.vel.y, 0);
    } else {
      const factor = Math.max(0, speed - speed * PHYSICS_CONFIG.friction * dt) / speed;
      this.state.vel = new Vector3(
        this.state.vel.x * factor,
        this.state.vel.y,
        this.state.vel.z * factor
      );
    }
  }

  private move(world: World, delta: Vector3): void {
    let vel = delta.clone();
    this.state.grounded = false;

    for (let i = 0; i < PHYSICS_CONFIG.maxSlideIterations; i++) {
      const len = vel.length();
      if (len < 1e-7) break;

      // Prevent tunneling
      const minRaycastDist = PHYSICS_CONFIG.margin * 2.0;
      const raycastLen = Math.max(len, minRaycastDist);

      const hit = world.raycast(this.state.pos, vel.multiplyScalar(1.0 / len), raycastLen);

      if (hit) {
        this.state.pos = this.state.pos.add(vel.multiplyScalar(Math.max(0, hit.distance - PHYSICS_CONFIG.margin) / len));

        const dotVel = vel.dot(hit.normal);
        if (dotVel >= 0) break;

        if (hit.normal.y > PHYSICS_CONFIG.slopeLimit) {
          this.state.grounded = true;
        }

        vel = vel.sub(hit.normal.multiplyScalar(dotVel));

        const dotState = this.state.vel.dot(hit.normal);
        if (dotState < 0) {
          this.state.vel = this.state.vel.sub(hit.normal.multiplyScalar(dotState));
        }
      } else {
        this.state.pos = this.state.pos.add(vel);
        break;
      }
    }
  }
}

// ============================================================================
// MAP SYSTEM
// ============================================================================

export interface BrushDataBox {
  type: 'box';
  position: [number, number, number];
  size: [number, number, number];
}

export interface BrushDataSlope {
  type: 'slope';
  position: [number, number, number];
  width: number;
  height: number;
  angle: number;
}

export type BrushData = BrushDataBox | BrushDataSlope;

export interface MapData {
  name: string;
  spawn_position: [number, number, number];
  brushes: BrushData[];
}

/**
 * Create a box brush from position and size
 */
export function createBoxBrush(center: Vector3, size: Vector3): Brush {
  const halfSize = size.multiplyScalar(0.5);

  const normals = [
    new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
    new Vector3(0, 1, 0), new Vector3(0, -1, 0),
    new Vector3(0, 0, 1), new Vector3(0, 0, -1)
  ];

  const distances = [
    -(center.x + halfSize.x), center.x - halfSize.x,
    -(center.y + halfSize.y), center.y - halfSize.y,
    -(center.z + halfSize.z), center.z - halfSize.z
  ];

  const bounds = new AABB(center.sub(halfSize), center.add(halfSize));

  return new Brush(new Planes(normals, distances), bounds);
}

/**
 * Create a slope brush
 */
export function createSlopeBrush(center: Vector3, width: number, height: number, angleDegrees: number): Brush {
  const angle = angleDegrees * (Math.PI / 180.0);
  const slopeNormal = new Vector3(0, Math.cos(angle), -Math.sin(angle)).normalize();
  const slopePoint = new Vector3(0, height, center.z + width / 2);

  const normals = [
    new Vector3(0, -1, 0), new Vector3(-1, 0, 0), new Vector3(1, 0, 0),
    new Vector3(0, 0, -1), new Vector3(0, 0, 1), slopeNormal
  ];

  const distances = [
    0.0, -width / 2, -width / 2,
    center.z - width / 2, -(center.z + width / 2),
    -slopeNormal.dot(slopePoint)
  ];

  const bounds = new AABB(
    new Vector3(-width / 2, 0.0, center.z - width / 2),
    new Vector3(width / 2, height, center.z + width / 2)
  );

  return new Brush(new Planes(normals, distances), bounds);
}

/**
 * Map loader and container
 */
export class GameMap {
  data: MapData;
  brushes: Brush[];
  world: World;

  constructor(data: MapData) {
    this.data = data;
    this.brushes = data.brushes.map(bd => {
      if (bd.type === 'box') {
        return createBoxBrush(
          new Vector3(bd.position[0], bd.position[1], bd.position[2]),
          new Vector3(bd.size[0], bd.size[1], bd.size[2])
        );
      } else {
        return createSlopeBrush(
          new Vector3(bd.position[0], bd.position[1], bd.position[2]),
          bd.width,
          bd.height,
          bd.angle
        );
      }
    });
    this.world = new World(this.brushes);
  }

  getSpawnPosition(): Vector3 {
    return new Vector3(
      this.data.spawn_position[0],
      this.data.spawn_position[1],
      this.data.spawn_position[2]
    );
  }
}

// Default test map (from original fps-advanced)
export const DEFAULT_MAP: MapData = {
  name: 'Test Map',
  spawn_position: [0.0, 3.0, -20.0],
  brushes: [
    { type: 'box', position: [0.0, -2.25, 0.0], size: [100.0, 4.5, 100.0] },
    { type: 'slope', position: [0.0, 0.0, 20.0], width: 30.0, height: 20.0, angle: 46.0 },
    { type: 'box', position: [25.0, 3.0, 0.0], size: [4.0, 6.0, 4.0] },
    { type: 'box', position: [-25.0, 2.0, 15.0], size: [6.0, 4.0, 6.0] },
    { type: 'box', position: [0.0, 1.0, -30.0], size: [8.0, 2.0, 3.0] },
    { type: 'box', position: [-15.0, 4.0, -15.0], size: [3.0, 8.0, 3.0] },
    { type: 'box', position: [30.0, 1.5, 25.0], size: [5.0, 3.0, 5.0] }
  ]
};

// ============================================================================
// GAME STORE (Observable)
// ============================================================================

type ChangeListener = () => void;

export interface InputState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
  mouseDx: number;
  mouseDy: number;
}

export class FPSStore {
  private changeListeners: ChangeListener[] = [];
  private map: GameMap;
  private physics: Physics;
  private lastTime: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Input state
  input: InputState = {
    w: false, a: false, s: false, d: false, space: false,
    mouseDx: 0, mouseDy: 0
  };

  constructor(mapData: MapData = DEFAULT_MAP) {
    this.map = new GameMap(mapData);
    this.physics = new Physics();
    this.physics.state.pos = this.map.getSpawnPosition();
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(l => l());
  }

  getPosition(): Vector3 {
    return this.physics.state.pos.clone();
  }

  getVelocity(): Vector3 {
    return this.physics.state.vel.clone();
  }

  getYaw(): number {
    return this.physics.state.yaw;
  }

  getPitch(): number {
    return this.physics.state.pitch;
  }

  isGrounded(): boolean {
    return this.physics.state.grounded;
  }

  getMapName(): string {
    return this.map.data.name;
  }

  getBrushes(): Brush[] {
    return this.map.brushes;
  }

  setKey(key: string, pressed: boolean): void {
    switch (key.toLowerCase()) {
      case 'w': this.input.w = pressed; break;
      case 'a': this.input.a = pressed; break;
      case 's': this.input.s = pressed; break;
      case 'd': this.input.d = pressed; break;
      case ' ': this.input.space = pressed; break;
    }
  }

  addMouseDelta(dx: number, dy: number): void {
    this.input.mouseDx += dx;
    this.input.mouseDy += dy;
  }

  update(dt: number): void {
    // Handle mouse input
    this.physics.state.yaw += this.input.mouseDx * PHYSICS_CONFIG.mouseSensitivity;
    this.physics.state.pitch = Math.max(
      -PHYSICS_CONFIG.pitchLimit,
      Math.min(PHYSICS_CONFIG.pitchLimit, this.physics.state.pitch + this.input.mouseDy * PHYSICS_CONFIG.mouseSensitivity)
    );
    this.input.mouseDx = 0;
    this.input.mouseDy = 0;

    // Calculate wish direction
    const fwd = this.input.w ? 1 : this.input.s ? -1 : 0;
    const right = this.input.d ? 1 : this.input.a ? -1 : 0;
    const wish = wishDir(fwd, right, this.physics.state.yaw);

    // Update physics
    this.physics.update(this.map.world, wish, this.input.space, dt);

    this.notifyChange();
  }

  startGameLoop(): void {
    if (this.intervalId !== null) return;

    this.lastTime = Date.now();
    this.intervalId = setInterval(() => {
      const currentTime = Date.now();
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
      this.lastTime = currentTime;
      this.update(dt);
    }, 16); // ~60 FPS
  }

  stopGameLoop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(): void {
    this.physics.state.pos = this.map.getSpawnPosition();
    this.physics.state.vel = Vector3.zero();
    this.physics.state.grounded = false;
    this.physics.state.yaw = 0;
    this.physics.state.pitch = 0;
    this.notifyChange();
  }
}

// ============================================================================
// VIEW BUILDER
// ============================================================================

export function buildFPSAdvancedApp(a: any): void {
  const store = new FPSStore();
  let posLabel: any;
  let velLabel: any;
  let groundedLabel: any;
  let instructionsLabel: any;

  // Simple 3D visualization using canvas
  async function render3DView(canvas: any, width: number, height: number): Promise<void> {
    const buffer = new Uint8Array(width * height * 4);
    const pos = store.getPosition();
    const yaw = store.getYaw();
    const pitch = store.getPitch();

    // Clear to dark background
    const bgR = 38, bgG = 38, bgB = 46;
    for (let i = 0; i < width * height; i++) {
      buffer[i * 4] = bgR;
      buffer[i * 4 + 1] = bgG;
      buffer[i * 4 + 2] = bgB;
      buffer[i * 4 + 3] = 255;
    }

    // Render ground grid
    const viewMat = viewMatrix(pos, yaw, pitch, PHYSICS_CONFIG.eyeHeight);
    const fov = 90 * Math.PI / 180;
    const aspect = width / height;
    const near = 0.1;
    const far = 500;

    // Simple grid rendering - project grid lines to screen
    const gridSize = 100;
    const gridStep = 5;

    for (let gx = -gridSize; gx <= gridSize; gx += gridStep) {
      for (let gz = -gridSize; gz <= gridSize; gz += gridStep) {
        // Grid point at y=0
        const worldPos = new Vector3(gx, 0, gz);

        // Transform to view space
        const vx = viewMat.elements[0] * worldPos.x + viewMat.elements[4] * worldPos.y + viewMat.elements[8] * worldPos.z + viewMat.elements[12];
        const vy = viewMat.elements[1] * worldPos.x + viewMat.elements[5] * worldPos.y + viewMat.elements[9] * worldPos.z + viewMat.elements[13];
        const vz = viewMat.elements[2] * worldPos.x + viewMat.elements[6] * worldPos.y + viewMat.elements[10] * worldPos.z + viewMat.elements[14];

        // Skip if behind camera
        if (vz >= -near) continue;

        // Project to screen
        const f = 1.0 / Math.tan(fov / 2);
        const nf = 1 / (near - far);
        const px = (f / aspect) * vx / (-vz);
        const py = f * vy / (-vz);

        // Convert to screen coordinates
        const sx = Math.floor((px + 1) * width / 2);
        const sy = Math.floor((1 - py) * height / 2);

        if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
          const idx = (sy * width + sx) * 4;
          // Grid color (darker further away)
          const dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
          const intensity = Math.max(0, Math.min(255, 255 - dist * 2));
          buffer[idx] = Math.floor(intensity * 0.4);
          buffer[idx + 1] = Math.floor(intensity * 0.4);
          buffer[idx + 2] = Math.floor(intensity * 0.4);
        }
      }
    }

    // Draw crosshair
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const crosshairSize = 8;
    const crosshairColor = [0, 255, 0, 255];

    for (let i = -crosshairSize; i <= crosshairSize; i++) {
      if (cx + i >= 0 && cx + i < width) {
        const idx = (cy * width + cx + i) * 4;
        buffer[idx] = crosshairColor[0];
        buffer[idx + 1] = crosshairColor[1];
        buffer[idx + 2] = crosshairColor[2];
        buffer[idx + 3] = crosshairColor[3];
      }
      if (cy + i >= 0 && cy + i < height) {
        const idx = ((cy + i) * width + cx) * 4;
        buffer[idx] = crosshairColor[0];
        buffer[idx + 1] = crosshairColor[1];
        buffer[idx + 2] = crosshairColor[2];
        buffer[idx + 3] = crosshairColor[3];
      }
    }

    await canvas.setPixelBuffer(buffer);
  }

  a.window({ title: 'FPS Advanced', width: 900, height: 700 }, (win: any) => {
    let canvas: any;
    let canvasWidth = 640;
    let canvasHeight = 480;
    let renderInterval: NodeJS.Timeout | undefined;

    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.hbox(() => {
          a.label('FPS Advanced - Quake-Style Movement Demo').withId('title');
          a.spacer();
          a.button('Reset')
            .withId('btn-reset')
            .onClick(() => store.reset());
        });

        a.separator();

        // Main content
        a.hbox(() => {
          // 3D viewport
          a.vbox(() => {
            canvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, {
              onTap: () => {
                // Could implement mouse lock here
              },
              onKeyDown: (key: string) => {
                store.setKey(key, true);
              },
              onKeyUp: (key: string) => {
                store.setKey(key, false);
              }
            }).withId('viewport');

            instructionsLabel = a.label('WASD: Move | Space: Jump | Arrow Keys: Look').withId('instructions');
          });

          // Stats panel
          a.vbox(() => {
            a.label('--- Stats ---').withId('stats-header');
            posLabel = a.label('Position: 0, 0, 0').withId('pos-label');
            velLabel = a.label('Velocity: 0, 0, 0').withId('vel-label');
            groundedLabel = a.label('Grounded: false').withId('grounded-label');
            a.label(`Map: ${store.getMapName()}`).withId('map-label');

            a.separator();

            a.label('--- Controls ---').withId('controls-header');
            a.label('W/S: Forward/Back').withId('ctrl-ws');
            a.label('A/D: Strafe').withId('ctrl-ad');
            a.label('Space: Jump').withId('ctrl-space');
            a.label('Arrows: Look').withId('ctrl-arrows');

            a.separator();

            a.hbox(() => {
              a.button('Look Left')
                .withId('btn-look-left')
                .onClick(() => store.addMouseDelta(-50, 0));
              a.button('Look Right')
                .withId('btn-look-right')
                .onClick(() => store.addMouseDelta(50, 0));
            });

            a.hbox(() => {
              a.button('Look Up')
                .withId('btn-look-up')
                .onClick(() => store.addMouseDelta(0, -30));
              a.button('Look Down')
                .withId('btn-look-down')
                .onClick(() => store.addMouseDelta(0, 30));
            });
          });
        });
      });
    });

    // Subscribe to store changes
    store.subscribe(async () => {
      const pos = store.getPosition();
      const vel = store.getVelocity();

      if (posLabel) {
        await posLabel.setText(`Position: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
      }
      if (velLabel) {
        await velLabel.setText(`Velocity: ${vel.x.toFixed(1)}, ${vel.y.toFixed(1)}, ${vel.z.toFixed(1)}`);
      }
      if (groundedLabel) {
        await groundedLabel.setText(`Grounded: ${store.isGrounded()}`);
      }
    });

    // Start render loop
    setTimeout(async () => {
      if (canvas) {
        await canvas.requestFocus();

        // Render loop (separate from physics)
        renderInterval = setInterval(async () => {
          try {
            await render3DView(canvas, canvasWidth, canvasHeight);
          } catch {
            // Ignore render errors
          }
        }, 1000 / 30); // 30 FPS rendering
      }

      // Start physics loop
      store.startGameLoop();
    }, 100);

    // Handle keyboard for movement
    win.onKeyDown?.((key: string) => {
      if (key === 'ArrowLeft') store.addMouseDelta(-20, 0);
      else if (key === 'ArrowRight') store.addMouseDelta(20, 0);
      else if (key === 'ArrowUp') store.addMouseDelta(0, -15);
      else if (key === 'ArrowDown') store.addMouseDelta(0, 15);
      else store.setKey(key, true);
    });

    win.onKeyUp?.((key: string) => {
      store.setKey(key, false);
    });

    // Cleanup on close
    win.setCloseIntercept?.(async () => {
      store.stopGameLoop();
      if (renderInterval) clearInterval(renderInterval);
      return true;
    });

    win.show();
  });
}

export default buildFPSAdvancedApp;
