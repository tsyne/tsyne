// Charon Jr. — Ported to Tsyne
//
// 3D driving game where you pick up spirits and deliver them to dropoffs.
// Raw WebGL2 engine (LilGL) with DOMMatrix/DOMPoint math.
//
// Controls:
//   W / ArrowUp:    Accelerate
//   S / ArrowDown:  Brake / Reverse
//   A / ArrowLeft:  Steer left
//   D / ArrowRight: Steer right
//   Enter:          Select (menu)

import * as path from 'path';
import Module from 'module';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { TsyneBridge } from '../../../trine/integration/bridge';
import { TsyneCanvas } from '../../../trine/integration/canvas';
import { GLOverlayApp } from '../../../trine/integration/gl-overlay';
import { initTsyneGlobals, injectGlobals, setFetchBasePath } from '../../../trine/integration/globals';

const APP_DIR = path.resolve(__dirname, '..');

// Hook Module._resolveFilename to resolve @/ aliases to src/ directory
const srcDir = path.resolve(__dirname);
const originalResolveFilename = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function(request: string, parent: any, isMain: boolean, options: any) {
  if (request.startsWith('@/')) {
    request = path.join(srcDir, request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
setFetchBasePath(APP_DIR);

export const WIDTH = 960;
export const HEIGHT = 540;

// GPU hang elimination: skip specific draw calls by tag name
// Usage: CHARON_SKIP=floor,spirit ./scripts/tsyne ...
if (process.env.CHARON_SKIP) {
  (globalThis as any).__CHARON_SKIP = process.env.CHARON_SKIP.split(',');
  console.log('[Charon Jr.] Skipping objects:', (globalThis as any).__CHARON_SKIP);
}

export async function buildCharonJr(a: App, win: ITsyneWindow) {
  // 1. Create bridge and inject globals
  const coreBridge = (a as any).getBridge();
  const sendFn = async (msg: any) => coreBridge.send(msg.type, msg.payload || {});
  const bridge = new TsyneBridge(sendFn);
  initTsyneGlobals(bridge);
  injectGlobals();

  // 2. Create the 3D canvas (WebGL2) and set as global c3d
  const tsyneCanvas = new TsyneCanvas(bridge, { interactive: true });
  tsyneCanvas.width = WIDTH;
  tsyneCanvas.height = HEIGHT;
  tsyneCanvas.setWindowId(win.id);
  (globalThis as any).c3d = tsyneCanvas;

  // 3. Create 2D canvas for draw-2d.ts (stub — it's a no-op anyway)
  const canvas2d = new TsyneCanvas(bridge);
  canvas2d.width = 1280;
  canvas2d.height = 720;
  (globalThis as any).c2d = canvas2d;

  // Wire up interactive event handling
  coreBridge.on('glMouseEvent', (data: any) => {
    bridge.handleEvent({ type: 'glMouseEvent', widgetId: data.widgetId, data });
  });

  // 4. Initialize the GL context: LilGL + renderer setup
  //    These must happen before any game code is imported.
  //    Use require() so @/ alias resolves through Module._resolveFilename hook.
  const { initLilGl } = require('@/engine/renderer/lil-gl');
  initLilGl();
  const { setupRenderer } = require('@/engine/renderer/renderer');
  setupRenderer();

  // Get GL context early for intermediate flushes
  const gl = tsyneCanvas.getContext('webgl2') as any;

  // Flush shader compilation + GL state setup to GPU (avoids 10s stall on first frame)
  console.log('[Charon Jr.] Compiling shaders...');
  if (gl?.flush) await gl.flush();
  console.log('[Charon Jr.] Shaders ready.');

  // Create overlay app for 2D HUD elements (menu text, loading screen, etc.)
  // The canvas must be created on the bridge first (flush above triggers that).
  const overlayApp = new GLOverlayApp(bridge, tsyneCanvas.overlayId);

  // 5. Now import game code (safe because GL is initialized)
  const { populateMaterials } = require('@/texture-maker');
  const { controls } = require('@/controls');
  const { gameStates } = require('@/index');
  const { createGameStateMachine } = require('@/game-states/game-state-machine');

  // Bind controls to the canvas
  controls.bindTo(tsyneCanvas);

  // 6. Generate all procedural textures
  console.log('[Charon Jr.] Generating textures...');
  await populateMaterials();
  console.log('[Charon Jr.] Textures ready.');

  // Flush texture uploads to GPU
  if (gl?.flush) await gl.flush();

  // 7. Create game states and wire overlay to menu
  const { GameState, setGameOverlay } = require('@/game-states/game.state');
  const { MenuState, setMenuOverlay } = require('@/game-states/menu.state');
  const { LevelOverState } = require('@/game-states/level-over.state');

  gameStates.gameState = new GameState();
  gameStates.menuState = new MenuState();
  gameStates.levelOverState = new LevelOverState();

  // Wire overlay to menu and game states
  setMenuOverlay(overlayApp);
  setGameOverlay(overlayApp);

  // Flush game state constructor GL commands (truck geometry, etc.)
  console.log('[Charon Jr.] Game states created, flushing...');
  if (gl?.flush) await gl.flush();

  // 8. Start the game — menu renders 3D scene + overlay text
  createGameStateMachine(gameStates.menuState);
  const { gameStateMachine } = require('@/game-states/game-state-machine');

  // Flush menu scene creation
  if (gl?.flush) await gl.flush();

  // 9. Animation loop with adaptive frame pacing
  let running = true;
  let frameCount = 0;
  let fpsTimer = performance.now();
  let fps = 0;
  let lastHudUpdate = 0;
  let maxFlushMs = 0;
  let totalCmds = 0;
  const TARGET_FRAME_MS = 33; // ~30 FPS target (realistic for bridge overhead)
  const MIN_DELAY_MS = 8;     // Minimum delay to avoid starving the event loop
  const gc = (globalThis as any).gc; // Available with --expose-gc

  console.log('[Charon Jr.] Starting game loop...');

  // Resolve when loop actually exits
  let loopDone: () => void;
  const loopDonePromise = new Promise<void>(r => { loopDone = r; });

  // Run loop in background so buildCharonJr can return immediately
  (async () => {
    while (running) {
      const frameStart = performance.now();

      try {
        controls.queryController();
        gameStateMachine.getState().onUpdate(16);
      } catch (e) {
        console.error('[Charon Jr.] Game loop error:', e);
        break;
      }

      // Count commands before flush (commandBuffer is swapped during flush)
      const cmdCount = (gl as any).commandBuffer?.length ?? 0;
      totalCmds += cmdCount;

      // Flush GL commands to the bridge
      let flushMs = 0;
      if (gl?.flush) {
        try {
          const t0 = performance.now();
          await gl.flush();
          flushMs = performance.now() - t0;
        } catch (e) {
          console.error('[Charon Jr.] GL flush error:', e);
        }
      }

      // Update HUD in window title (every 500ms to reduce bridge chatter)
      frameCount++;
      const now = performance.now();
      maxFlushMs = Math.max(maxFlushMs, flushMs);
      if (now - fpsTimer >= 1000) {
        fps = frameCount;
        // Force GC before measuring to distinguish real leak from lazy GC
        if (gc) gc();
        const mem = process.memoryUsage();
        const avgCmds = fps > 0 ? Math.round(totalCmds / fps) : 0;
        console.log(`[MEM] heap: ${(mem.heapUsed/1024/1024).toFixed(1)}MB ext: ${(mem.external/1024/1024).toFixed(1)}MB rss: ${(mem.rss/1024/1024).toFixed(1)}MB | ${fps}fps ${avgCmds}cmds/f | flush: max=${maxFlushMs.toFixed(0)}ms last=${flushMs.toFixed(0)}ms`);
        frameCount = 0;
        totalCmds = 0;
        fpsTimer = now;
        maxFlushMs = 0;
      }
      if (now - lastHudUpdate >= 500) {
        lastHudUpdate = now;
        try {
          const { hud } = require('@/hud');
          const time = hud.timeRemaining.toFixed(1);
          const score = hud.score + (hud.isScoreBonusActive ? hud.currentScoreBonus : 0);
          win.setTitle(`Charon Jr. [${fps} FPS] Time: ${time} | Score: $${score}`);
        } catch {
          win.setTitle(`Charon Jr. [${fps} FPS]`);
        }
      }

      // Adaptive frame pacing: wait longer if frames are slow
      const elapsed = performance.now() - frameStart;
      const delay = Math.max(MIN_DELAY_MS, TARGET_FRAME_MS - elapsed);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    loopDone!();
  })();

  return {
    stop: async () => {
      running = false;
      await loopDonePromise;
    },
  };
}

// --- Standalone entry point (only when run directly, not when require()'d) ---
if (require.main === module) {
  process.on('unhandledRejection', (reason) => {
    console.warn('[Charon Jr.] Unhandled rejection:', reason);
  });

  // When CHARON_SKIP is set, auto-start level 0 (bypass menu)
  if (process.env.CHARON_SKIP) {
    (globalThis as any).__CHARON_AUTO_LEVEL = 0;
  }

  const appInstance = app(
    resolveTransport(),
    { title: 'Charon Jr.' },
    (a) => {
      a.window(
        { title: 'Charon Jr.', width: WIDTH, height: HEIGHT },
        (win) => {
          // Skip the story splash when doing elimination testing
          if (!process.env.CHARON_SKIP) {
            win.setContent(() => {
              a.vbox(() => {
                a.spacer();
                a.label('Charon Jr.', { textSize: 24, textStyle: { bold: true }, alignment: 'center' });
                a.label('');
                a.label(
                  'The river Styx has become overrun with monsters! As the new intern ferryman, ' +
                  'it\'s your job to transport souls across — but your boat broke down on day one.',
                  { wrapping: 'word', alignment: 'center' },
                );
                a.label('');
                a.label(
                  'So you did what anyone would do: you built a monster truck.',
                  { wrapping: 'word', alignment: 'center' },
                );
                a.label('');
                a.label(
                  'Drive across the underworld, dodge and smash through obstacles, ' +
                  'and deliver your passengers to the other side in one piece.',
                  { wrapping: 'word', alignment: 'center' },
                );
                a.label('');
                a.label(
                  'Collect coins to upgrade your truck. Hit ramps for big air. ' +
                  'Try not to flip — your passengers are already dead, but they can still complain.',
                  { wrapping: 'word', alignment: 'center' },
                );
                a.label('');
                a.label('Controls', { textSize: 18, textStyle: { bold: true }, alignment: 'center' });
                a.label('Arrow Keys / WASD — Drive and tilt', { alignment: 'center' });
                a.label('Space — Brake', { alignment: 'center' });
                a.label('');
                a.label('Loading...', { alignment: 'center' });
                a.spacer();
              });
            });
          }
          win.show();

          setTimeout(async () => {
            try {
              await buildCharonJr(a, win);
            } catch (e) {
              console.error('[Charon Jr.] Failed to start:', e);
            }
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
