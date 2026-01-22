/**
 * Arcade Store and Launcher
 *
 * Multi-game launcher with state management.
 *
 * Copyright (c) 2025 Paul Hammant
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

import { FPSVoxelGame } from './fps-voxel/index';
import { PacmanGame, Direction } from './pacman/index';
import { Chip8 } from './chip8/index';

export type GameType = 'launcher' | 'fps-voxel' | 'pacman' | 'chip8';

export interface GameInfo {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const GAMES: GameInfo[] = [
  {
    id: 'fps-voxel',
    name: 'FPS Voxel',
    description: 'Simple voxel first-person shooter',
    icon: '[]',
    color: '#4CAF50'
  },
  {
    id: 'pacman',
    name: 'Pacman',
    description: 'Classic maze chase game',
    icon: 'C<',
    color: '#FFEB3B'
  },
  {
    id: 'chip8',
    name: 'Chip-8',
    description: '8-bit game emulator',
    icon: '><',
    color: '#2196F3'
  }
];

type ChangeListener = () => void;

export class ArcadeStore {
  private changeListeners: ChangeListener[] = [];
  currentGame: GameType = 'launcher';

  // Game instances
  fpsVoxel: FPSVoxelGame | null = null;
  pacman: PacmanGame | null = null;
  chip8: Chip8 | null = null;

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach(l => l());
  }

  launchGame(game: GameType): void {
    this.stopCurrentGame();
    this.currentGame = game;

    switch (game) {
      case 'fps-voxel':
        this.fpsVoxel = new FPSVoxelGame();
        this.fpsVoxel.onUpdate = () => this.notifyChange();
        this.fpsVoxel.start();
        break;
      case 'pacman':
        this.pacman = new PacmanGame();
        this.pacman.onUpdate = () => this.notifyChange();
        this.pacman.start();
        break;
      case 'chip8':
        this.chip8 = new Chip8();
        this.chip8.onUpdate = () => this.notifyChange();
        this.chip8.start();
        break;
    }
    this.notifyChange();
  }

  backToLauncher(): void {
    this.stopCurrentGame();
    this.currentGame = 'launcher';
    this.notifyChange();
  }

  private stopCurrentGame(): void {
    this.fpsVoxel?.stop();
    this.pacman?.stop();
    this.chip8?.stop();
    this.fpsVoxel = null;
    this.pacman = null;
    this.chip8 = null;
  }
}

export function buildSokolArcadeApp(a: any): void {
  const store = new ArcadeStore();
  let contentContainer: any;
  let canvas: any;
  const canvasWidth = 448;
  const canvasHeight = 320;
  let renderInterval: ReturnType<typeof setInterval> | undefined;

  function renderCurrentGame(): void {
    if (!canvas) return;
    const buffer = new Uint8Array(canvasWidth * canvasHeight * 4);

    if (store.currentGame === 'fps-voxel' && store.fpsVoxel) {
      store.fpsVoxel.render(buffer, canvasWidth, canvasHeight);
    } else if (store.currentGame === 'pacman' && store.pacman) {
      store.pacman.render(buffer, canvasWidth, canvasHeight);
    } else if (store.currentGame === 'chip8' && store.chip8) {
      store.chip8.render(buffer, canvasWidth, canvasHeight);
    }

    canvas.setPixelBuffer(buffer).catch(() => {});
  }

  a.window({ title: 'Sokol Arcade', width: 520, height: 480 }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.hbox(() => {
          a.label('Sokol Arcade').withId('title');
          a.spacer();
          a.button('Back')
            .withId('btn-back')
            .onClick(() => store.backToLauncher())
            .when(() => store.currentGame !== 'launcher');
        });

        a.separator();

        // Content area - either launcher or game
        contentContainer = a.vbox(() => {
          // Launcher view
          a.vbox(() => {
            a.label('Choose a Game:').withId('choose-label');
            a.hbox(() => {
              for (const game of GAMES) {
                a.vbox(() => {
                  a.button(game.icon)
                    .withId(`btn-${game.id}`)
                    .onClick(() => store.launchGame(game.id));
                  a.label(game.name).withId(`label-${game.id}`);
                });
              }
            });
            a.separator();
            a.label('FPS Voxel: WASD + Arrow keys').withId('help-fps');
            a.label('Pacman: Arrow keys to move').withId('help-pacman');
            a.label('Chip-8: Keys 0-F for input').withId('help-chip8');
          }).when(() => store.currentGame === 'launcher');

          // FPS Voxel game view
          a.vbox(() => {
            canvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, {
              onKeyDown: (key: string) => {
                if (store.fpsVoxel) store.fpsVoxel.setKey(key, true);
              },
              onKeyUp: (key: string) => {
                if (store.fpsVoxel) store.fpsVoxel.setKey(key, false);
              }
            }).withId('fps-canvas');
            a.hbox(() => {
              a.button('Look L').onClick(() => store.fpsVoxel?.addMouseDelta(-30, 0));
              a.button('Look R').onClick(() => store.fpsVoxel?.addMouseDelta(30, 0));
              a.button('Look Up').onClick(() => store.fpsVoxel?.addMouseDelta(0, -20));
              a.button('Look Dn').onClick(() => store.fpsVoxel?.addMouseDelta(0, 20));
            });
            a.label('WASD: Move | Space: Jump').withId('fps-help');
          }).when(() => store.currentGame === 'fps-voxel');

          // Pacman game view
          a.vbox(() => {
            canvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, {}).withId('pacman-canvas');
            a.hbox(() => {
              a.label('Score:').withId('pm-score-label');
              a.label('0').withId('pm-score').bindTo({
                text: () => store.pacman?.score.toString() || '0'
              });
              a.spacer();
              a.label('Lives:').withId('pm-lives-label');
              a.label('3').withId('pm-lives').bindTo({
                text: () => store.pacman?.lives.toString() || '3'
              });
            });
            a.hbox(() => {
              a.button('Up').onClick(() => store.pacman?.setDirection(Direction.Up)).withId('pm-up');
              a.button('Down').onClick(() => store.pacman?.setDirection(Direction.Down)).withId('pm-down');
              a.button('Left').onClick(() => store.pacman?.setDirection(Direction.Left)).withId('pm-left');
              a.button('Right').onClick(() => store.pacman?.setDirection(Direction.Right)).withId('pm-right');
            });
          }).when(() => store.currentGame === 'pacman');

          // Chip-8 emulator view
          a.vbox(() => {
            canvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, {}).withId('chip8-canvas');
            a.hbox(() => {
              a.button('Reset').onClick(() => {
                store.chip8?.reset();
                store.chip8?.loadDefaultProgram();
              }).withId('c8-reset');
              a.label('Bouncing Ball Demo').withId('c8-program');
            });
          }).when(() => store.currentGame === 'chip8');
        });
      });
    });

    // Subscribe to store changes
    store.subscribe(async () => {
      await contentContainer?.refresh?.();
    });

    // Start render loop
    setTimeout(() => {
      renderInterval = setInterval(() => {
        if (store.currentGame !== 'launcher') {
          renderCurrentGame();
        }
      }, 1000 / 30);
    }, 100);

    // Handle keyboard
    win.onKeyDown?.((key: string) => {
      if (store.currentGame === 'fps-voxel' && store.fpsVoxel) {
        if (key === 'ArrowLeft') store.fpsVoxel.addMouseDelta(-20, 0);
        else if (key === 'ArrowRight') store.fpsVoxel.addMouseDelta(20, 0);
        else if (key === 'ArrowUp') store.fpsVoxel.addMouseDelta(0, -15);
        else if (key === 'ArrowDown') store.fpsVoxel.addMouseDelta(0, 15);
        else store.fpsVoxel.setKey(key, true);
      } else if (store.currentGame === 'pacman' && store.pacman) {
        if (key === 'ArrowUp') store.pacman.setDirection(Direction.Up);
        else if (key === 'ArrowDown') store.pacman.setDirection(Direction.Down);
        else if (key === 'ArrowLeft') store.pacman.setDirection(Direction.Left);
        else if (key === 'ArrowRight') store.pacman.setDirection(Direction.Right);
      } else if (store.currentGame === 'chip8' && store.chip8) {
        const keyMap: Record<string, number> = {
          '1': 1, '2': 2, '3': 3, '4': 0xC,
          'q': 4, 'w': 5, 'e': 6, 'r': 0xD,
          'a': 7, 's': 8, 'd': 9, 'f': 0xE,
          'z': 0xA, 'x': 0, 'c': 0xB, 'v': 0xF,
        };
        const k = keyMap[key.toLowerCase()];
        if (k !== undefined) store.chip8.setKey(k, true);
      }
    });

    win.onKeyUp?.((key: string) => {
      if (store.currentGame === 'fps-voxel' && store.fpsVoxel) {
        store.fpsVoxel.setKey(key, false);
      } else if (store.currentGame === 'chip8' && store.chip8) {
        const keyMap: Record<string, number> = {
          '1': 1, '2': 2, '3': 3, '4': 0xC,
          'q': 4, 'w': 5, 'e': 6, 'r': 0xD,
          'a': 7, 's': 8, 'd': 9, 'f': 0xE,
          'z': 0xA, 'x': 0, 'c': 0xB, 'v': 0xF,
        };
        const k = keyMap[key.toLowerCase()];
        if (k !== undefined) store.chip8.setKey(k, false);
      }
    });

    // Cleanup
    win.setCloseIntercept?.(async () => {
      store.backToLauncher();
      if (renderInterval) clearInterval(renderInterval);
      return true;
    });

    win.show();
  });
}
