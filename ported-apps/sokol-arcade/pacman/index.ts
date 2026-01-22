/**
 * Pacman Game
 *
 * Classic maze chase game with ghosts.
 * Ported from floooh/pacman.zig
 *
 * @see https://github.com/floooh/pacman.zig
 *
 * Portions copyright (c) 2020 Andre Weissflog (floooh)
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

export enum Direction { Right, Down, Left, Up }
export enum GhostState { Chase, Scatter, Frightened, Eaten }

const PACMAN_MAP = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

export interface Entity {
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
}

export class PacmanGame {
  map: string[] = [...PACMAN_MAP];
  pacman: Entity = { x: 14, y: 23, dir: Direction.Left, nextDir: Direction.Left };
  ghosts: Entity[] = [
    { x: 14, y: 11, dir: Direction.Left, nextDir: Direction.Left },
    { x: 12, y: 14, dir: Direction.Up, nextDir: Direction.Up },
    { x: 14, y: 14, dir: Direction.Down, nextDir: Direction.Down },
    { x: 16, y: 14, dir: Direction.Up, nextDir: Direction.Up },
  ];
  ghostStates: GhostState[] = [GhostState.Scatter, GhostState.Scatter, GhostState.Scatter, GhostState.Scatter];
  score = 0;
  lives = 3;
  dots = 0;
  frightenedTimer = 0;
  running = false;
  intervalId: ReturnType<typeof setInterval> | null = null;
  tickCount = 0;
  onUpdate?: () => void;

  constructor() {
    this.countDots();
  }

  countDots(): void {
    this.dots = 0;
    for (const row of this.map) {
      for (const c of row) {
        if (c === '.' || c === 'o') this.dots++;
      }
    }
  }

  reset(): void {
    this.map = [...PACMAN_MAP];
    this.pacman = { x: 14, y: 23, dir: Direction.Left, nextDir: Direction.Left };
    this.ghosts = [
      { x: 14, y: 11, dir: Direction.Left, nextDir: Direction.Left },
      { x: 12, y: 14, dir: Direction.Up, nextDir: Direction.Up },
      { x: 14, y: 14, dir: Direction.Down, nextDir: Direction.Down },
      { x: 16, y: 14, dir: Direction.Up, nextDir: Direction.Up },
    ];
    this.ghostStates = [GhostState.Scatter, GhostState.Scatter, GhostState.Scatter, GhostState.Scatter];
    this.score = 0;
    this.lives = 3;
    this.frightenedTimer = 0;
    this.countDots();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => {
      this.tick();
      this.onUpdate?.();
    }, 150);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.running = false;
  }

  setDirection(dir: Direction): void {
    this.pacman.nextDir = dir;
  }

  private canMove(x: number, y: number, dir: Direction): boolean {
    const dx = dir === Direction.Right ? 1 : dir === Direction.Left ? -1 : 0;
    const dy = dir === Direction.Down ? 1 : dir === Direction.Up ? -1 : 0;
    const nx = (x + dx + 28) % 28;
    const ny = y + dy;
    if (ny < 0 || ny >= 31) return false;
    const c = this.map[ny]?.[nx];
    return c !== '#' && c !== '-' && c !== undefined;
  }

  private move(entity: Entity): void {
    if (this.canMove(entity.x, entity.y, entity.nextDir)) {
      entity.dir = entity.nextDir;
    }
    if (this.canMove(entity.x, entity.y, entity.dir)) {
      const dx = entity.dir === Direction.Right ? 1 : entity.dir === Direction.Left ? -1 : 0;
      const dy = entity.dir === Direction.Down ? 1 : entity.dir === Direction.Up ? -1 : 0;
      entity.x = (entity.x + dx + 28) % 28;
      entity.y = entity.y + dy;
    }
  }

  tick(): void {
    this.tickCount++;

    // Update frightened timer
    if (this.frightenedTimer > 0) {
      this.frightenedTimer--;
      if (this.frightenedTimer === 0) {
        for (let i = 0; i < 4; i++) {
          if (this.ghostStates[i] === GhostState.Frightened) {
            this.ghostStates[i] = GhostState.Chase;
          }
        }
      }
    }

    // Move pacman
    this.move(this.pacman);

    // Eat dots
    const c = this.map[this.pacman.y]?.[this.pacman.x];
    if (c === '.') {
      this.map[this.pacman.y] = this.map[this.pacman.y].substring(0, this.pacman.x) + ' ' +
        this.map[this.pacman.y].substring(this.pacman.x + 1);
      this.score += 10;
      this.dots--;
    } else if (c === 'o') {
      this.map[this.pacman.y] = this.map[this.pacman.y].substring(0, this.pacman.x) + ' ' +
        this.map[this.pacman.y].substring(this.pacman.x + 1);
      this.score += 50;
      this.dots--;
      this.frightenedTimer = 40;
      for (let i = 0; i < 4; i++) {
        if (this.ghostStates[i] !== GhostState.Eaten) {
          this.ghostStates[i] = GhostState.Frightened;
        }
      }
    }

    // Move ghosts (every other tick for slower movement)
    if (this.tickCount % 2 === 0) {
      for (let i = 0; i < 4; i++) {
        if (this.ghostStates[i] === GhostState.Eaten) continue;

        // Simple AI: move towards/away from pacman
        const ghost = this.ghosts[i];
        const dirs = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
        let bestDir = ghost.dir;
        let bestDist = this.ghostStates[i] === GhostState.Frightened ? -Infinity : Infinity;

        for (const dir of dirs) {
          // Don't reverse direction
          if ((dir === Direction.Up && ghost.dir === Direction.Down) ||
              (dir === Direction.Down && ghost.dir === Direction.Up) ||
              (dir === Direction.Left && ghost.dir === Direction.Right) ||
              (dir === Direction.Right && ghost.dir === Direction.Left)) continue;

          if (!this.canMove(ghost.x, ghost.y, dir)) continue;

          const dx = dir === Direction.Right ? 1 : dir === Direction.Left ? -1 : 0;
          const dy = dir === Direction.Down ? 1 : dir === Direction.Up ? -1 : 0;
          const nx = ghost.x + dx, ny = ghost.y + dy;
          const dist = Math.abs(nx - this.pacman.x) + Math.abs(ny - this.pacman.y);

          if (this.ghostStates[i] === GhostState.Frightened) {
            if (dist > bestDist) { bestDist = dist; bestDir = dir; }
          } else {
            if (dist < bestDist) { bestDist = dist; bestDir = dir; }
          }
        }
        ghost.nextDir = bestDir;
        this.move(ghost);
      }
    }

    // Check ghost collisions
    for (let i = 0; i < 4; i++) {
      if (this.ghosts[i].x === this.pacman.x && this.ghosts[i].y === this.pacman.y) {
        if (this.ghostStates[i] === GhostState.Frightened) {
          this.ghostStates[i] = GhostState.Eaten;
          this.score += 200;
          this.ghosts[i] = { x: 14, y: 14, dir: Direction.Up, nextDir: Direction.Up };
        } else if (this.ghostStates[i] !== GhostState.Eaten) {
          this.lives--;
          if (this.lives > 0) {
            this.pacman = { x: 14, y: 23, dir: Direction.Left, nextDir: Direction.Left };
          }
        }
      }
    }
  }

  render(buffer: Uint8Array, width: number, height: number): void {
    const cellW = Math.floor(width / 28);
    const cellH = Math.floor(height / 31);

    // Clear to black
    buffer.fill(0);
    for (let i = 3; i < buffer.length; i += 4) buffer[i] = 255;

    // Draw map
    for (let y = 0; y < 31; y++) {
      for (let x = 0; x < 28; x++) {
        const c = this.map[y]?.[x] || ' ';
        let color = [0, 0, 0];
        if (c === '#') color = [33, 33, 222];
        else if (c === '.') color = [255, 184, 174];
        else if (c === 'o') color = [255, 184, 174];
        else if (c === '-') color = [255, 184, 222];

        const px = x * cellW, py = y * cellH;
        for (let dy = 0; dy < cellH; dy++) {
          for (let dx = 0; dx < cellW; dx++) {
            const idx = ((py + dy) * width + px + dx) * 4;
            if (c === '.' && (dx < cellW / 3 || dx > cellW * 2 / 3 || dy < cellH / 3 || dy > cellH * 2 / 3)) continue;
            if (c === 'o' && Math.sqrt((dx - cellW / 2) ** 2 + (dy - cellH / 2) ** 2) > cellW / 2) continue;
            buffer[idx] = color[0];
            buffer[idx + 1] = color[1];
            buffer[idx + 2] = color[2];
          }
        }
      }
    }

    // Draw pacman
    const px = this.pacman.x * cellW, py = this.pacman.y * cellH;
    for (let dy = 0; dy < cellH; dy++) {
      for (let dx = 0; dx < cellW; dx++) {
        const dist = Math.sqrt((dx - cellW / 2) ** 2 + (dy - cellH / 2) ** 2);
        if (dist < cellW / 2) {
          const idx = ((py + dy) * width + px + dx) * 4;
          buffer[idx] = 255;
          buffer[idx + 1] = 255;
          buffer[idx + 2] = 0;
        }
      }
    }

    // Draw ghosts
    const ghostColors = [[255, 0, 0], [255, 184, 255], [0, 255, 255], [255, 184, 82]];
    for (let i = 0; i < 4; i++) {
      const g = this.ghosts[i];
      const gx = g.x * cellW, gy = g.y * cellH;
      const color = this.ghostStates[i] === GhostState.Frightened ? [33, 33, 255] :
                    this.ghostStates[i] === GhostState.Eaten ? [255, 255, 255] : ghostColors[i];
      for (let dy = 0; dy < cellH; dy++) {
        for (let dx = 0; dx < cellW; dx++) {
          if (dy < cellH / 2 || (dx + dy) % 4 < 2) {
            const idx = ((gy + dy) * width + gx + dx) * 4;
            buffer[idx] = color[0];
            buffer[idx + 1] = color[1];
            buffer[idx + 2] = color[2];
          }
        }
      }
    }
  }
}
