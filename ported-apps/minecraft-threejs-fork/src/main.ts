// Minecraft Three.js Clone — Tsyne fork
//
// TSYNE: Modified in-place from original main.ts.
// Original created Core/Control/Player/Terrain/UI/Audio and ran requestAnimationFrame.
// Now: trine entrypoint with app()/window()/initThreeJS() and async game loop.
//
// Controls:
//   Drag:              Camera rotation (yaw/pitch)
//   Left-click:        Destroy target block
//   Right-click:       Place block
//   WASD:              Move (relative to camera)
//   Space:             Jump / fly up
//   Shift:             Fly down
//   Q:                 Toggle walk/fly mode
//   1-9:               Select block type
//   Scroll wheel:      Cycle block type
//   Escape:            Pause / show menu

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../../../trine/integration/init';
import { TsyneCanvas } from '../../../trine/integration/canvas';
import { cvg } from '../../../cosyne/src';

// Original imports (unchanged)
import Control from './control'
import Player from './player'
import { Mode } from './player'
import Terrain, { BlockType } from './terrain'
import Materials from './terrain/mesh/materials'
import UI from './ui'
import Audio from './audio'

// TSYNE: Original CSS import removed — no DOM
// import './style.css'

export async function buildMinecraftFork(a: App, win: ITsyneWindow, params: { width?: number; height?: number } = {}) {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // --- Phase 1: One-time setup (patches THREE, creates scene/terrain/etc.) ---
  // interactive: false — we create our own canvases per state transition
  const { THREE, bridge } = await initThreeJS(a, win, { width, height, interactive: false });

  // --- Scene setup (done here instead of Core, using patched THREE) ---
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 500);
  camera.position.set(8, 50, 8);
  camera.lookAt(100, 30, 100);

  const scene = new THREE.Scene();
  const skyColor = 0x87ceeb;
  scene.fog = new THREE.Fog(skyColor, 1, 96);
  scene.background = new THREE.Color(skyColor);

  // TSYNE: DirectionalLight instead of PointLight (PointLight at distance 500 gives no illumination)
  const sun1 = new THREE.DirectionalLight(0xffffff, 0.8);
  sun1.position.set(1, 1.5, 1).normalize();
  scene.add(sun1);

  const sun2 = new THREE.DirectionalLight(0xffffff, 0.3);
  sun2.position.set(-1, 1.2, -0.5).normalize();
  scene.add(sun2);

  const ambient = new THREE.AmbientLight(0x606060);
  scene.add(ambient);

  // Crosshair (small sprite at screen center)
  const crosshairGeo = new THREE.PlaneGeometry(0.02, 0.02);
  const crosshairMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.7 });
  const crosshair = new THREE.Mesh(crosshairGeo, crosshairMat);
  crosshair.renderOrder = 999;
  camera.add(crosshair);
  crosshair.position.set(0, 0, -0.5);
  scene.add(camera);

  // Load materials asynchronously (trine loadTexture instead of Vite imports)
  // TSYNE: Pass patched THREE to ensure textures use the right classes
  console.log('[Minecraft-Fork] Loading textures...');
  const materials = await Materials.create(THREE);
  console.log('[Minecraft-Fork] Textures loaded, generating terrain...');

  // Create game objects using original classes
  const player = new Player();
  const audio = new Audio(camera);
  const terrain = new Terrain(scene, camera, materials);
  terrain.initBlocks();
  terrain.generate();

  const control = new Control(scene, camera, player, terrain, audio);
  const ui = new UI(terrain, control);

  // Player starts in walking mode (default) — drops to ground with gravity

  // Set initial camera rotation
  control.yaw = Math.atan2(100 - 8, 100 - 8); // ~π/4, towards terrain center
  control.pitch = -0.3; // slight downward look
  control.handleDrag(0, 0); // apply rotation
  camera.updateMatrixWorld(true); // ensure matrix is ready for first render

  // --- State management ---
  let running = false;  // true while game loop is active
  let gameMode = false; // true = gameplay, false = menu

  // --- HUD via window title ---
  let frameCount = 0;
  let fpsTimer = performance.now();
  let fps = 0;
  let lastHudUpdate = 0;

  const BLOCK_NAMES = ['grass', 'sand', 'tree', 'leaf', 'dirt', 'stone', 'coal', 'wood', 'diamond', 'quartz', 'glass', 'bedrock'];

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

    const pos = camera.position;
    const modeStr = player.mode === Mode.flying ? 'FLY' : player.mode === Mode.sneaking ? 'SNK' : 'WALK';
    const blockName = BLOCK_NAMES[control.holdingBlock] ?? 'grass';
    win.setTitle(
      `Minecraft [${fps} FPS] pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)} | ${modeStr} | Block: ${blockName} [${control.holdingIndex + 1}]`
    );
  }

  // --- Helper: create TsyneCanvas bound to a GLCanvas widget ---
  function createBoundCanvas(widget: any, interactive: boolean): TsyneCanvas {
    const canvas = new TsyneCanvas(bridge, { interactive });
    canvas.width = width;
    canvas.height = height;
    canvas.setPredefinedId(widget.id);
    return canvas;
  }

  // --- Phase 2: State transitions (menu ↔ game) ---

  // Menu overlay — CVG buttons over a non-interactive GL canvas showing terrain
  async function showMenu(isResume: boolean) {
    running = false;
    gameMode = false;

    let glWidget: any;

    await win.setContent(() => {
      a.stack(() => {
        // Background: non-interactive GL canvas (terrain renders underneath)
        glWidget = a.glCanvas(width, height, { interactive: false });

        // Foreground: CVG menu overlay
        a.canvasStack(() => {
          const ctx = cvg(a, { viewBox: `0 0 ${width} ${height}`, width, height }, (s: any) => {
            // Dark overlay
            s.rect({ x: 0, y: 0, width, height, fill: '#000000', 'fill-opacity': 0.6 });

            // Title
            s.text(
              { x: width / 2, y: 80, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 36 },
              'Minecraft'
            );

            // Button layout
            const btnW = 200, btnH = 50, btnX = width / 2 - 100;
            let btnY = 160;

            // Play / Resume
            s.rect({ x: btnX, y: btnY, width: btnW, height: btnH, fill: '#27ae60', rx: 6,
              onClick: () => startGame() });
            s.text({ x: width / 2, y: btnY + 33, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 24,
              onClick: () => startGame() },
              isResume ? 'Resume' : 'Play');
            btnY += 70;

            // Load Game (stub)
            s.rect({ x: btnX, y: btnY, width: btnW, height: btnH, fill: '#2980b9', rx: 6 });
            s.text({ x: width / 2, y: btnY + 33, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 24 },
              'Load Game');
            btnY += 70;

            // Settings (stub)
            s.rect({ x: btnX, y: btnY, width: btnW, height: btnH, fill: '#8e44ad', rx: 6 });
            s.text({ x: width / 2, y: btnY + 33, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 24 },
              'Settings');
            btnY += 70;

            // Guide (stub)
            s.rect({ x: btnX, y: btnY, width: btnW, height: btnH, fill: '#7f8c8d', rx: 6 });
            s.text({ x: width / 2, y: btnY + 33, 'text-anchor': 'middle', fill: '#ffffff', 'font-size': 24 },
              'Guide');

            // Control hints
            s.text(
              { x: width / 2, y: height - 50, 'text-anchor': 'middle', fill: '#aaaaaa', 'font-size': 14 },
              'WASD move \u00b7 Drag look'
            );
            s.text(
              { x: width / 2, y: height - 30, 'text-anchor': 'middle', fill: '#aaaaaa', 'font-size': 14 },
              'LMB destroy \u00b7 RMB place'
            );
          });
          ctx.enableEvents();
        });
      });
    });

    // Passive render loop — terrain visible behind menu overlay
    const canvas = createBoundCanvas(glWidget, false);
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas as any });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const gl = renderer.getContext();

    while (!gameMode) {
      renderer.render(scene, camera);
      if (gl?.flush) await gl.flush();
      await new Promise(r => setTimeout(r, 33)); // ~30fps for menu background
    }
  }

  // Active gameplay — interactive GL canvas with pointer lock
  async function startGame() {
    gameMode = true;
    running = true;

    let glWidget: any;

    await win.setContent(() => {
      a.stack(() => {
        glWidget = a.glCanvas(width, height, { interactive: true });
      });
    });

    // Create renderer bound to the interactive GL widget
    const canvas = createBoundCanvas(glWidget, true);
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas as any });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const gl = renderer.getContext();
    canvas.requestPointerLock();

    // --- Wire up input events → Control handlers ---
    canvas.addEventListener('drag', (e: any) => {
      control.handleDrag(e.dx, e.dy);
    });

    canvas.addEventListener('keydown', (e: any) => {
      if (e.key === 'Escape') {
        showMenu(true); // pause → menu with "Resume"
        return;
      }
      const keyEvent = { key: e.key, repeat: false } as KeyboardEvent;
      control.setMovementHandler(keyEvent);
      control.changeHoldingBlockHandler(keyEvent);
    });
    canvas.addEventListener('keyup', (e: any) => {
      const keyEvent = { key: e.key, repeat: false } as KeyboardEvent;
      control.resetMovementHandler(keyEvent);
    });

    // Mouse buttons for block interaction
    canvas.addEventListener('mousedown', (e: any) => {
      const mouseEvent = { button: e.button, preventDefault: () => {} } as MouseEvent;
      control.mousedownHandler(mouseEvent);
    });
    canvas.addEventListener('mouseup', () => {
      control.mouseupHandler();
    });

    // Scroll for block selection
    canvas.addEventListener('wheel', (e: any) => {
      const wheelEvent = { deltaY: e.deltaY } as WheelEvent;
      control.wheelHandler(wheelEvent);
    });

    // --- Game loop ---
    console.log('[Minecraft-Fork] Starting game loop...');

    while (running) {
      control.update();
      terrain.update();
      ui.update();
      updateHUD();

      renderer.render(scene, camera);

      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise(resolve => setTimeout(resolve, 16));
    }
  }

  // --- Show initial menu (runs in background, like original animate()) ---
  console.log('[Minecraft-Fork] Showing menu...');
  console.log('[Minecraft-Fork] Camera pos:', camera.position.x, camera.position.y, camera.position.z);
  console.log('[Minecraft-Fork] Scene children:', scene.children.length);
  console.log('[Minecraft-Fork] Terrain blocks:', terrain.blocks.length, 'counts:', terrain.blocksCount);
  showMenu(false);

  return {
    stop: () => { running = false; gameMode = true; },
    control,
    player,
    terrain,
    ui,
  };
}

// --- Standalone entry point (only runs when executed directly, not when imported by tests) ---
if (require.main === module) {
  const WIDTH = 800;
  const HEIGHT = 600;

  process.on('unhandledRejection', (reason) => {
    console.warn('[Minecraft-Fork] Unhandled rejection:', reason);
  });

  const appInstance = app(
    resolveTransport(),
    { title: 'Minecraft' },
    (a) => {
      a.window(
        { title: 'Minecraft', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Loading Minecraft...');
          });
          win.show();

          setTimeout(async () => {
            try {
              await buildMinecraftFork(a, win, { width: WIDTH, height: HEIGHT });
            } catch (e) {
              console.error('[Minecraft-Fork] Failed to start:', e);
            }
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
