// Space Racing Game — Ported to Trine/Tsyne
//
// Hover vehicles race on extruded track through space with stars and satellites.
// Based on leslieyip02/racing (Three.js browser game).
//
// Controls:
//   W:          Accelerate
//   S / Shift:  Brake
//   A / D:      Turn left / right
//   Arrow Up:   Increase thrust
//   Arrow Down: Decrease thrust
//   Scroll:     Thrust up/down

import * as path from "path";
import * as THREE from "three";
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../../../trine/integration/init';
import { setFetchBasePath } from '../../../trine/integration/globals';
import GameScene from "./scenes/GameScene";

// Set fetch base path so ./assets/models/*.glb resolves correctly
const APP_DIR = path.resolve(__dirname, "..");
setFetchBasePath(APP_DIR);

const WIDTH = 800;
const HEIGHT = 600;

async function buildRacing(a: App, win: ITsyneWindow, params: { width?: number; height?: number } = {}) {
  const width = params.width ?? WIDTH;
  const height = params.height ?? HEIGHT;

  // initThreeJS sets up the bridge, injects globals, and creates the GL canvas.
  // We don't use its THREE — we use the same THREE the game files import from "three"
  // so all objects share the same class prototypes.
  await initThreeJS(a, win, { width, height, interactive: true });

  // --- Scene setup using the game's own THREE module ---
  const camera = new THREE.PerspectiveCamera(80, width / height, 0.1, 3200);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, { preferredWidth: width, preferredHeight: height, renderer, camera });

  // Create game scene
  const gameScene = new GameScene(renderer, camera, width, height, 0, {
    onCountdown: (text: string) => {
      if (text) {
        win.setTitle(`Racing — ${text}`);
      } else {
        win.setTitle('Racing');
      }
    },
    onRaceFinish: (rank: number, time: string) => {
      const suffixes = ["st", "nd", "rd"];
      win.setTitle(`Racing — Finished ${rank}${suffixes[rank - 1]}! Time: ${time}`);
    },
  });

  // --- Get canvas for event handling ---
  const gl = renderer.getContext();
  const tsyneCanvas = (gl as any).canvas;

  // --- Wire up input events ---
  tsyneCanvas.addEventListener('keydown', (e: any) => {
    gameScene.keysPressed[e.key.toLowerCase()] = true;
  });
  tsyneCanvas.addEventListener('keyup', (e: any) => {
    gameScene.keysPressed[e.key.toLowerCase()] = false;
  });
  tsyneCanvas.addEventListener('wheel', (e: any) => {
    gameScene.keysPressed[`arrow${e.deltaY < 0 ? 'up' : 'down'}`] = true;
  });

  // --- HUD ---
  let frameCount = 0;
  let fpsTimer = performance.now();
  let fps = 0;
  let lastHudUpdate = 0;

  function updateHUD() {
    frameCount++;
    const now = performance.now();
    if (now - fpsTimer >= 1000) {
      fps = frameCount;
      frameCount = 0;
      fpsTimer = now;
    }
    if (now - lastHudUpdate < 250) return;
    lastHudUpdate = now;

    if (gameScene.finished) return;

    const player = gameScene.player;
    const track = gameScene.track;
    if (!player || !track) return;

    const lap = player.laps > 2 ? 2 : player.laps;
    const thrust = Math.round(player.thrust * 100);
    const time = track.getTimeString();
    const countdownActive = gameScene.countdown < 6000;

    if (countdownActive) return;

    win.setTitle(
      `Racing [${fps} FPS] Lap ${lap}/2 | ${time} | Thrust: ${thrust}%`
    );
  }

  // --- Animation loop ---
  let running = true;
  let lastTime = performance.now();

  const animate = async () => {
    while (running) {
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      gameScene.update(dt);
      updateHUD();

      renderer.render(gameScene, camera);

      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise(resolve => setTimeout(resolve, 16));
    }
  };

  console.log('[Racing] Starting game loop...');
  console.log('[Racing] Scene children:', gameScene.children.length);
  animate();

  return {
    stop: () => { running = false; },
    gameScene,
  };
}

// --- Standalone entry point ---
process.on('unhandledRejection', (reason) => {
  console.warn('[Racing] Unhandled rejection:', reason);
});

const appInstance = app(
  resolveTransport(),
  { title: 'Racing' },
  (a) => {
    a.window(
      { title: 'Racing', width: WIDTH, height: HEIGHT },
      (win) => {
        win.setContent(() => {
          a.label('Loading Racing...');
        });
        win.show();

        setTimeout(async () => {
          try {
            await buildRacing(a, win, { width: WIDTH, height: HEIGHT });
          } catch (e) {
            console.error('[Racing] Failed to start:', e);
          }
        }, 100);
      }
    );
  }
);

appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
