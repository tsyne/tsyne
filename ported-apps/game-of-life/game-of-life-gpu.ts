/**
 * Conway's Game of Life - GPU-Accelerated Version
 *
 * Keeps the CPU simulation (Board class) but renders via a GPU fragment shader
 * with visual effects: rounded cells, green glow, grid lines, bloom halos.
 *
 * @tsyne-app:name Game of Life GPU
 * @tsyne-app:category games
 * @tsyne-app:builder createGameOfLifeGPUApp
 * @tsyne-app:args app
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, CanvasShader, Label, Window } from 'tsyne';
import { Board } from './game-of-life';

const GRID_WIDTH = 50;
const GRID_HEIGHT = 40;
const DEFAULT_SPEED = 166;
const MIN_SPEED = 10;
const MAX_SPEED = 1000;

const gameOfLifeShader = `
#version 110
uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_grid;
uniform float u_gridWidth;
uniform float u_gridHeight;
varying vec2 v_texCoord;

// Hash for background noise
float hash12(vec2 p) {
  float h = sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453;
  return fract(h);
}

void main() {
  vec2 uv = v_texCoord;

  // Map UV to grid coordinates
  float cellX = uv.x * u_gridWidth;
  float cellY = (1.0 - uv.y) * u_gridHeight; // flip Y so row 0 is top

  // Integer cell coordinates
  float ix = floor(cellX);
  float iy = floor(cellY);

  // Position within the cell [0,1]
  vec2 cellUV = vec2(cellX - ix, cellY - iy);

  // Dark background with subtle noise
  vec2 noiseCoord = floor(uv * u_resolution / 4.0);
  float noise = hash12(noiseCoord) * 0.03;
  vec3 bgColor = vec3(0.02, 0.03, 0.06) + noise;

  // Grid lines (thin dark lines between cells)
  float gridLine = 0.0;
  float lineWidth = 0.06;
  if (cellUV.x < lineWidth || cellUV.x > 1.0 - lineWidth ||
      cellUV.y < lineWidth || cellUV.y > 1.0 - lineWidth) {
    gridLine = 0.15;
  }
  vec3 gridColor = vec3(0.05, 0.1, 0.12);
  bgColor = mix(bgColor, gridColor, gridLine);

  // Sample this cell's state
  vec2 texCoord = vec2((ix + 0.5) / u_gridWidth, (iy + 0.5) / u_gridHeight);
  float alive = texture2D(u_grid, texCoord).g;
  bool isAlive = alive > 0.5;

  // Rounded cell shape (SDF-based soft edges)
  vec2 d = abs(cellUV - 0.5) * 2.0; // distance from center, [0,1]
  float cellDist = length(max(d - 0.5, 0.0)); // rounded rect SDF
  float cellMask = 1.0 - smoothstep(0.0, 0.25, cellDist);

  // Alive cell color: bright green core with subtle time variation
  float pulse = 0.9 + 0.1 * sin(u_time * 2.0 + ix * 0.5 + iy * 0.3);
  vec3 aliveColor = vec3(0.1, 0.9, 0.2) * pulse;

  // Glow / bloom halo from neighboring live cells
  float glow = 0.0;
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      if (dx == 0 && dy == 0) continue;
      float nx = ix + float(dx);
      float ny = iy + float(dy);
      if (nx < 0.0 || nx >= u_gridWidth || ny < 0.0 || ny >= u_gridHeight) continue;
      vec2 neighborCoord = vec2((nx + 0.5) / u_gridWidth, (ny + 0.5) / u_gridHeight);
      float neighborAlive = texture2D(u_grid, neighborCoord).g;
      if (neighborAlive > 0.5) {
        float dist = length(vec2(float(dx), float(dy)));
        glow += 0.15 / (dist * dist + 0.5);
      }
    }
  }

  // Compose final color
  vec3 color = bgColor;

  // Add glow halo (soft green around live cells)
  color += vec3(0.02, 0.12, 0.03) * glow;

  // Draw alive cells with rounded shape
  if (isAlive) {
    color = mix(color, aliveColor, cellMask);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

class GameOfLifeGPUUI {
  private a: App;
  private board: Board;
  private shader: CanvasShader | null = null;
  private generationLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private cellCountLabel: Label | null = null;
  private speedLabel: Label | null = null;

  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private speed = DEFAULT_SPEED;
  private generation = 0;

  constructor(a: App) {
    this.a = a;
    this.board = new Board(GRID_WIDTH, GRID_HEIGHT);
    this.board.loadGliderGun();
  }

  build(): void {
    this.a.window({ title: 'Game of Life (GPU)', width: 900, height: 750 }, (win: Window) => {
      win.setContent(() => {
        this.a.border({
          top: () => {
            this.a.vbox(() => {
              // Control buttons
              this.a.hbox(() => {
                this.a.button('Start', { onClick: () => this.start() }).withId('startBtn');
                this.a.button('Pause', { onClick: () => this.pause() }).withId('pauseBtn');
                this.a.button('Step', { onClick: () => this.step() }).withId('stepBtn');
                this.a.button('Reset', { onClick: () => this.reset() }).withId('resetBtn');
                this.a.button('Clear', { onClick: () => this.clear() }).withId('clearBtn');
              });

              // Pattern selector
              this.a.hbox(() => {
                this.a.label('Pattern: ');
                this.a.select(
                  ['Glider Gun', 'Glider', 'Blinker', 'Pulsar', 'Random'],
                  (value: string) => {
                    this.loadPattern(value);
                  }
                );
              });
            });
          },
          center: () => {
            this.shader = this.a.canvasShader(700, 560, gameOfLifeShader, {
              uniforms: {
                u_gridWidth: GRID_WIDTH,
                u_gridHeight: GRID_HEIGHT,
              },
              onMouseDown: (e) => {
                // Convert click position to cell coordinates
                const cellX = Math.floor((e.position.x / 700) * GRID_WIDTH);
                const cellY = Math.floor((e.position.y / 560) * GRID_HEIGHT);
                if (cellX >= 0 && cellX < GRID_WIDTH && cellY >= 0 && cellY < GRID_HEIGHT) {
                  this.board.toggleCell(cellX, cellY);
                  this.uploadGrid();
                  this.updateLabels();
                }
              },
            });
          },
          bottom: () => {
            this.a.vbox(() => {
              // Status bar
              this.a.hbox(() => {
                this.a.label('Gen: ');
                this.generationLabel = this.a.label('0');
                this.a.label(' | ');
                this.statusLabel = this.a.label('Paused');
                this.a.label(' | ');
                this.cellCountLabel = this.a.label('Cells: 0');
                this.a.label(' | ');
                this.speedLabel = this.a.label(`Speed: ${Math.round(1000 / this.speed)} gen/s`);
              });

              // Speed controls
              this.a.hbox(() => {
                this.a.label('Speed:');
                this.a.button('<<', { onClick: () => this.changeSpeed(100) });
                this.a.button('<', { onClick: () => this.changeSpeed(25) });
                this.a.button('Reset', { onClick: () => this.setSpeed(DEFAULT_SPEED) });
                this.a.button('>', { onClick: () => this.changeSpeed(-25) });
                this.a.button('>>', { onClick: () => this.changeSpeed(-100) });
              });

              this.a.separator();
              this.a.label('GPU-rendered Conway\'s Game of Life | Click cells to toggle');
            });
          },
        });
      });

      win.show();

      // Upload initial grid state after a short delay
      setTimeout(() => {
        this.uploadGrid();
        this.updateLabels();
        if (this.shader) {
          this.shader.setAutoAnimate(true);
        }
      }, 100);
    });
  }

  private async uploadGrid(): Promise<void> {
    if (!this.shader) return;

    const data = new Uint8Array(GRID_WIDTH * GRID_HEIGHT * 4);
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const idx = (y * GRID_WIDTH + x) * 4;
        const alive = this.board.getCell(x, y);
        data[idx] = 0;                     // R
        data[idx + 1] = alive ? 255 : 0;   // G
        data[idx + 2] = 0;                 // B
        data[idx + 3] = 255;               // A
      }
    }

    await this.shader.setTextureData('u_grid', data, GRID_WIDTH, GRID_HEIGHT);
  }

  private async updateLabels(): Promise<void> {
    if (this.generationLabel) {
      await this.generationLabel.setText(`${this.board.getGeneration()}`);
    }
    if (this.cellCountLabel) {
      await this.cellCountLabel.setText(`Cells: ${this.board.getLiveCellCount()}`);
    }
    if (this.statusLabel) {
      await this.statusLabel.setText(this.running ? 'Running' : 'Paused');
    }
  }

  private async updateSpeedLabel(): Promise<void> {
    if (this.speedLabel) {
      await this.speedLabel.setText(`Speed: ${Math.round(1000 / this.speed)} gen/s`);
    }
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => {
      this.board.advance();
      this.uploadGrid();
      this.updateLabels();
    }, this.speed);
    this.updateLabels();
  }

  private pause(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.updateLabels();
  }

  private step(): void {
    this.board.advance();
    this.uploadGrid();
    this.updateLabels();
  }

  private reset(): void {
    this.pause();
    this.board = new Board(GRID_WIDTH, GRID_HEIGHT);
    this.board.loadGliderGun();
    this.uploadGrid();
    this.updateLabels();
  }

  private clear(): void {
    this.pause();
    this.board.clear();
    this.uploadGrid();
    this.updateLabels();
  }

  private loadPattern(name: string): void {
    this.pause();
    switch (name) {
      case 'Glider Gun':
        this.board.loadGliderGun();
        break;
      case 'Glider':
        this.board.loadGlider();
        break;
      case 'Blinker':
        this.board.loadBlinker();
        break;
      case 'Pulsar':
        this.board.loadPulsar();
        break;
      case 'Random':
        this.board.randomize();
        break;
    }
    this.uploadGrid();
    this.updateLabels();
  }

  private changeSpeed(delta: number): void {
    this.setSpeed(this.speed + delta);
  }

  private setSpeed(newSpeed: number): void {
    this.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed));
    if (this.running) {
      this.pause();
      this.start();
    }
    this.updateSpeedLabel();
  }
}

export function createGameOfLifeGPUApp(a: App): void {
  new GameOfLifeGPUUI(a).build();
}

if (require.main === module) {
  const appInstance = app(resolveTransport(), { title: 'Game of Life GPU' }, createGameOfLifeGPUApp);
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
