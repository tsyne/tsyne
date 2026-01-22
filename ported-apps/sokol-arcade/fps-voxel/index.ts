/**
 * FPS Voxel Game
 *
 * A simple voxel first-person shooter with 16x16x16 world.
 * Ported from lizard-demon/fps (256 lines Zig)
 *
 * @see https://github.com/lizard-demon/fps
 *
 * Portions copyright (c) 2024 Spyware (lizard-demon)
 * Portions copyright (c) 2025 Paul Hammant
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Vector3 } from '../../../cosyne/src/math3d';

export class VoxelWorld {
  blocks: boolean[] = new Array(4096).fill(false);

  get(x: number, y: number, z: number): boolean {
    if (x < 0 || x >= 16 || y < 0 || y >= 16 || z < 0 || z >= 16) return false;
    return this.blocks[x + y * 16 + z * 256];
  }

  set(x: number, y: number, z: number, value: boolean): void {
    if (x >= 0 && x < 16 && y >= 0 && y < 16 && z >= 0 && z < 16) {
      this.blocks[x + y * 16 + z * 256] = value;
    }
  }

  collision(min: Vector3, max: Vector3): boolean {
    const minX = Math.max(0, Math.floor(min.x));
    const minY = Math.max(0, Math.floor(min.y));
    const minZ = Math.max(0, Math.floor(min.z));
    const maxX = Math.min(16, Math.floor(max.x) + 1);
    const maxY = Math.min(16, Math.floor(max.y) + 1);
    const maxZ = Math.min(16, Math.floor(max.z) + 1);

    for (let x = minX; x < maxX; x++) {
      for (let y = minY; y < maxY; y++) {
        for (let z = minZ; z < maxZ; z++) {
          if (this.get(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  generateDefault(): void {
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          // Floor, walls, and pillars
          if (y === 0 || x === 0 || x === 15 || z === 0 || z === 15 ||
              (x % 4 === 0 && z % 4 === 0 && y < 3)) {
            this.set(x, y, z, true);
          }
        }
      }
    }
  }
}

export class VoxelPlayer {
  pos = new Vector3(2, 3, 2);
  vel = Vector3.zero();
  yaw = 0;
  pitch = 0;
  mouseDx = 0;
  mouseDy = 0;
  keys = { w: false, a: false, s: false, d: false, space: false };

  update(world: VoxelWorld, dt: number): void {
    // Mouse look
    this.yaw += this.mouseDx * 0.002;
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch + this.mouseDy * 0.002));
    this.mouseDx = 0;
    this.mouseDy = 0;

    // Movement
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const forward = this.keys.w ? 1 : this.keys.s ? -1 : 0;
    const strafe = this.keys.d ? 1 : this.keys.a ? -1 : 0;

    this.vel = new Vector3(
      (sinYaw * forward + cosYaw * strafe) * 6.0,
      this.vel.y - 15.0 * dt,
      (-cosYaw * forward + sinYaw * strafe) * 6.0
    );

    // Collision detection
    const oldPos = this.pos.clone();
    const hull = new Vector3(0.4, 0.8, 0.4);

    // Move on each axis separately
    for (const axis of [0, 2, 1]) {
      const newPos = this.pos.clone();
      if (axis === 0) newPos.x += this.vel.x * dt;
      else if (axis === 1) newPos.y += this.vel.y * dt;
      else newPos.z += this.vel.z * dt;

      const minBounds = newPos.sub(hull);
      const maxBounds = newPos.add(hull);

      if (world.collision(minBounds, maxBounds)) {
        if (axis === 0) this.pos.x = oldPos.x;
        else if (axis === 2) this.pos.z = oldPos.z;
        else {
          this.pos.y = oldPos.y;
          if (this.keys.space && this.vel.y <= 0) {
            this.vel = new Vector3(this.vel.x, 8.0, this.vel.z);
          } else {
            this.vel = new Vector3(this.vel.x, 0, this.vel.z);
          }
        }
      } else {
        this.pos = newPos;
      }
    }
  }

  getViewMatrix(): number[] {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    return [
      cy, sy * sp, -sy * cp, 0,
      0, cp, sp, 0,
      sy, -cy * sp, cy * cp, 0,
      -this.pos.x * cy - this.pos.z * sy,
      -this.pos.x * sy * sp - this.pos.y * cp + this.pos.z * cy * sp,
      this.pos.x * sy * cp - this.pos.y * sp - this.pos.z * cy * cp,
      1
    ];
  }
}

export class FPSVoxelGame {
  world = new VoxelWorld();
  player = new VoxelPlayer();
  running = false;
  intervalId: ReturnType<typeof setInterval> | null = null;
  lastTime = 0;
  onUpdate?: () => void;

  constructor() {
    this.world.generateDefault();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = Date.now();
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.player.update(this.world, dt);
      this.onUpdate?.();
    }, 16);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  setKey(key: string, pressed: boolean): void {
    const k = key.toLowerCase();
    if (k === 'w') this.player.keys.w = pressed;
    else if (k === 'a') this.player.keys.a = pressed;
    else if (k === 's') this.player.keys.s = pressed;
    else if (k === 'd') this.player.keys.d = pressed;
    else if (k === ' ') this.player.keys.space = pressed;
  }

  addMouseDelta(dx: number, dy: number): void {
    this.player.mouseDx += dx;
    this.player.mouseDy += dy;
  }

  render(buffer: Uint8Array, width: number, height: number): void {
    // Clear to dark blue
    for (let i = 0; i < width * height; i++) {
      buffer[i * 4] = 25;
      buffer[i * 4 + 1] = 25;
      buffer[i * 4 + 2] = 51;
      buffer[i * 4 + 3] = 255;
    }

    const viewMat = this.player.getViewMatrix();
    const fov = Math.PI / 2;
    const aspect = width / height;

    // Render voxels as projected points
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        for (let z = 0; z < 16; z++) {
          if (!this.world.get(x, y, z)) continue;

          // Check if visible face
          const faces = [
            { check: !this.world.get(x + 1, y, z), color: [200, 200, 200] },
            { check: !this.world.get(x - 1, y, z), color: [150, 150, 150] },
            { check: !this.world.get(x, y + 1, z), color: [255, 255, 255] },
            { check: !this.world.get(x, y - 1, z), color: [100, 100, 100] },
            { check: !this.world.get(x, y, z + 1), color: [180, 180, 180] },
            { check: !this.world.get(x, y, z - 1), color: [120, 120, 120] },
          ];

          for (const face of faces) {
            if (!face.check) continue;

            // Project center of block
            const wx = x + 0.5, wy = y + 0.5, wz = z + 0.5;
            const vx = viewMat[0] * wx + viewMat[4] * wy + viewMat[8] * wz + viewMat[12];
            const vy = viewMat[1] * wx + viewMat[5] * wy + viewMat[9] * wz + viewMat[13];
            const vz = viewMat[2] * wx + viewMat[6] * wy + viewMat[10] * wz + viewMat[14];

            if (vz >= -0.1) continue; // Behind camera

            const f = 1.0 / Math.tan(fov / 2);
            const px = (f / aspect) * vx / (-vz);
            const py = f * vy / (-vz);

            const sx = Math.floor((px + 1) * width / 2);
            const sy = Math.floor((1 - py) * height / 2);

            // Draw block as small square based on distance
            const dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
            const size = Math.max(1, Math.floor(20 / dist));

            for (let dy = -size; dy <= size; dy++) {
              for (let dx = -size; dx <= size; dx++) {
                const px2 = sx + dx, py2 = sy + dy;
                if (px2 >= 0 && px2 < width && py2 >= 0 && py2 < height) {
                  const idx = (py2 * width + px2) * 4;
                  buffer[idx] = face.color[0];
                  buffer[idx + 1] = face.color[1];
                  buffer[idx + 2] = face.color[2];
                }
              }
            }
            break; // Only render one face per block
          }
        }
      }
    }

    // Draw crosshair
    const cx = Math.floor(width / 2), cy = Math.floor(height / 2);
    for (let i = -5; i <= 5; i++) {
      if (cx + i >= 0 && cx + i < width) {
        const idx = (cy * width + cx + i) * 4;
        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255;
      }
      if (cy + i >= 0 && cy + i < height) {
        const idx = ((cy + i) * width + cx) * 4;
        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255;
      }
    }
  }
}
