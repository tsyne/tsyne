/**
 * three.js webgl - raycaster texture
 *
 * Port of: three/examples/webgl_raycaster_texture.html
 *
 * Tests:
 * - Raycasting to find UV coordinates on mesh surfaces
 * - DataTexture as canvas-texture substitute (procedural UV grid + crosshair)
 * - Multiple meshes sharing a texture (cube, plane, circle)
 * - Texture wrapping modes, offset, repeat, rotation
 * - MeshBasicMaterial with mapped textures
 * - BoxGeometry, PlaneGeometry, CircleGeometry
 *
 * Adaptations for Tsyne:
 * - Replaces browser Canvas2D texture with DataTexture + procedural drawing
 * - Replaces image loading with a generated UV grid pattern
 * - Removes lil-gui; animates texture parameters instead
 * - Uses HoverableShader for mouse events / raycasting
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLRaycasterTextureParams {
  width?: number;
  height?: number;
}

export interface WebGLRaycasterTextureDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Procedural Texture Helpers
// ═══════════════════════════════════════════════════════════════════════════

const TEX_SIZE = 256;

/** Generate a UV-grid pattern reminiscent of textures/uv_grid_opengl.jpg */
function generateUVGrid(data: Uint8Array, size: number) {
  const gridCount = 8; // number of grid cells per axis
  const cellSize = size / gridCount;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      const cellX = Math.floor(x / cellSize);
      const cellY = Math.floor(y / cellSize);
      const onBorder =
        x % cellSize < 1 || y % cellSize < 1 ||
        x % cellSize > cellSize - 2 || y % cellSize > cellSize - 2;

      if (onBorder) {
        // Dark grid lines
        data[i] = 40;
        data[i + 1] = 40;
        data[i + 2] = 40;
      } else {
        // Color based on UV position
        const u = x / size;
        const v = y / size;
        const checker = (cellX + cellY) % 2 === 0;
        data[i] = Math.floor(u * 200 + (checker ? 55 : 0));
        data[i + 1] = Math.floor(v * 200 + (checker ? 0 : 55));
        data[i + 2] = Math.floor((1 - u) * 150 + 50);
      }

      data[i + 3] = 255;
    }
  }
}

/** Draw a yellow crosshair at pixel coordinates (cx, cy) */
function drawCross(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  radius: number,
  thickness: number
) {
  const maxR = Math.ceil(0.70710678 * radius);
  const minR = Math.ceil(maxR / 10);

  // Four diagonal arms of the cross
  const arms = [
    { dx: -1, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
  ];

  for (const arm of arms) {
    for (let t = minR; t <= maxR + 2; t++) {
      const px = Math.round(cx + arm.dx * t);
      const py = Math.round(cy + arm.dy * t);

      // Draw a small filled square for thickness
      for (let oy = -thickness; oy <= thickness; oy++) {
        for (let ox = -thickness; ox <= thickness; ox++) {
          const fx = px + ox;
          const fy = py + oy;
          if (fx >= 0 && fx < size && fy >= 0 && fy < size) {
            const idx = (fy * size + fx) * 4;
            data[idx] = 255;     // R
            data[idx + 1] = 255; // G
            data[idx + 2] = 0;   // B (yellow)
            data[idx + 3] = 255;
          }
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLRaycasterTexture(
  a: App,
  win: Window,
  params: WebGLRaycasterTextureParams = {}
): Promise<WebGLRaycasterTextureDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    windowId,
    interactive: true,
    coreBridge: bridge,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Shared texture data (simulates CanvasTexture from the original)
  // ─────────────────────────────────────────────────────────────────────────

  // Base UV grid (generated once, redrawn each frame with crosshair)
  const baseGrid = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
  generateUVGrid(baseGrid, TEX_SIZE);

  // Working buffer for compositing grid + crosshair
  const textureData = new Uint8Array(TEX_SIZE * TEX_SIZE * 4);
  textureData.set(baseGrid);

  let crossX = 0;
  let crossY = 0;
  const crossRadius = Math.ceil(Math.min(TEX_SIZE, TEX_SIZE) / 30);

  function updateTextureWithCross(uX: number, uY: number) {
    crossX = Math.floor(uX * TEX_SIZE);
    crossY = Math.floor(uY * TEX_SIZE);

    // Redraw: copy base grid then overlay crosshair
    textureData.set(baseGrid);
    drawCross(textureData, TEX_SIZE, crossX, crossY, crossRadius, 2);

    // Mark all parent textures as needing update
    cubeTexture.needsUpdate = true;
    planeTexture.needsUpdate = true;
    circleTexture.needsUpdate = true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
  camera.position.x = -30;
  camera.position.y = 40;
  camera.position.z = 50;
  camera.lookAt(scene.position);

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ── Cube (center) ──────────────────────────────────────────────────────

  const cubeTexture = new THREE.DataTexture(textureData, TEX_SIZE, TEX_SIZE);
  cubeTexture.wrapS = THREE.RepeatWrapping;
  cubeTexture.wrapT = THREE.RepeatWrapping;
  cubeTexture.needsUpdate = true;

  const cubeMaterial = new THREE.MeshBasicMaterial({ map: cubeTexture });
  const cubeGeometry = new THREE.BoxGeometry(20, 20, 20);

  // Scale UVs x2 like the original
  const cubeUvs = cubeGeometry.attributes.uv.array;
  for (let i = 0; i < cubeUvs.length; i++) {
    cubeUvs[i] *= 2;
  }

  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.x = 4;
  cube.position.y = -5;
  cube.position.z = 0;
  scene.add(cube);

  // ── Plane (left) ──────────────────────────────────────────────────────

  const planeTexture = new THREE.DataTexture(textureData, TEX_SIZE, TEX_SIZE);
  planeTexture.wrapS = THREE.MirroredRepeatWrapping;
  planeTexture.wrapT = THREE.MirroredRepeatWrapping;
  planeTexture.needsUpdate = true;

  const planeMaterial = new THREE.MeshBasicMaterial({ map: planeTexture });
  const planeGeometry = new THREE.PlaneGeometry(25, 25, 1, 1);

  // Scale UVs x2 like the original
  const planeUvs = planeGeometry.attributes.uv.array;
  for (let i = 0; i < planeUvs.length; i++) {
    planeUvs[i] *= 2;
  }

  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.x = -16;
  plane.position.y = -5;
  plane.position.z = 0;
  scene.add(plane);

  // ── Circle (right) ────────────────────────────────────────────────────

  const circleTexture = new THREE.DataTexture(textureData, TEX_SIZE, TEX_SIZE);
  circleTexture.wrapS = THREE.RepeatWrapping;
  circleTexture.wrapT = THREE.RepeatWrapping;
  circleTexture.needsUpdate = true;

  const circleMaterial = new THREE.MeshBasicMaterial({ map: circleTexture });
  const circleGeometry = new THREE.CircleGeometry(25, 40, 0, Math.PI * 2);

  // Offset & scale UVs like the original
  const circleUvs = circleGeometry.attributes.uv.array;
  for (let i = 0; i < circleUvs.length; i++) {
    circleUvs[i] = (circleUvs[i] - 0.25) * 2;
  }

  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.position.x = 24;
  circle.position.y = -5;
  circle.position.z = 0;
  scene.add(circle);

  // ─────────────────────────────────────────────────────────────────────────
  // Raycasting setup
  // ─────────────────────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const onClickPosition = new THREE.Vector2();

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (event: any) => {
    const px = event.clientX / width;
    const py = event.clientY / height;
    onClickPosition.set(px, py);

    mouse.set(px * 2 - 1, -(py * 2) + 1);
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, false);

    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv;
      intersects[0].object.material.map.transformUv(uv);
      updateTextureWithCross(uv.x, uv.y);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Texture parameter animation (replaces GUI controls from original)
  // ─────────────────────────────────────────────────────────────────────────

  // Slowly animate circle texture parameters so the test captures variation
  let circleOffsetX = 0;
  let circleOffsetY = 0;
  let circleRepeatX = 1;
  let circleRepeatY = 1;
  let circleRotation = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const t = currentTime * 0.001;

      // Animate circle texture parameters
      circleOffsetX = Math.sin(t * 0.5) * 0.5;
      circleOffsetY = Math.cos(t * 0.5) * 0.5;
      circleRepeatX = 1 + Math.sin(t * 0.3) * 0.5;
      circleRepeatY = 1 + Math.cos(t * 0.3) * 0.5;
      circleRotation = t * 0.2;

      circleTexture.offset.x = circleOffsetX;
      circleTexture.offset.y = circleOffsetY;
      circleTexture.repeat.x = circleRepeatX;
      circleTexture.repeat.y = circleRepeatY;
      circleTexture.rotation = circleRotation;

      renderer.render(scene, camera);

      // Flush GL commands synchronously
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }
    }
  };

  // Start animation
  animate();

  return {
    stop: () => {
      running = false;
    },
    getTime: () => currentTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - raycaster texture' },
    (a) => {
      a.window(
        { title: 'three.js webgl - raycaster texture', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLRaycasterTexture(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ═══════════════════════════════════════════════════════════════════════════
// Entry Point
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  main().catch(console.error);
}
