/**
 * three.js webgl - canvas textures
 *
 * Port of: three/examples/webgl_materials_texture_canvas.html
 *
 * Tests:
 * - Canvas-based texture generation
 * - Dynamic texture updates
 * - 2D drawing on 3D surfaces
 *
 * Adaptations for Tsyne:
 * - Uses DataTexture to simulate canvas rendering
 * - Procedural 2D drawing patterns
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsTextureCanvasParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsTextureCanvasDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsTextureCanvas(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsTextureCanvasParams = {}
): Promise<WebGLMaterialsTextureCanvasDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Procedural canvas texture simulation
  // ─────────────────────────────────────────────────────────────────────────

  const texSize = 256;
  const textureData = new Uint8Array(texSize * texSize * 4);

  // Create texture
  const canvasTexture = new THREE.DataTexture(textureData, texSize, texSize);
  canvasTexture.needsUpdate = true;

  // Function to "draw" on the texture
  function drawCircle(
    data: Uint8Array,
    size: number,
    cx: number,
    cy: number,
    radius: number,
    r: number,
    g: number,
    b: number
  ) {
    for (let y = Math.max(0, cy - radius); y < Math.min(size, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x < Math.min(size, cx + radius); x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;

        if (d2 < radius * radius) {
          const i = (y * size + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
    }
  }

  function drawLine(
    data: Uint8Array,
    size: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    thickness: number,
    r: number,
    g: number,
    b: number
  ) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(len);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = Math.floor(x0 + dx * t);
      const cy = Math.floor(y0 + dy * t);
      drawCircle(data, size, cx, cy, thickness, r, g, b);
    }
  }

  function clearTexture(data: Uint8Array, r: number, g: number, b: number) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 150, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x404040));

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

  // Create objects with canvas texture
  const boxGeometry = new THREE.BoxGeometry(100, 100, 100);
  const sphereGeometry = new THREE.SphereGeometry(60, 32, 16);
  const cylinderGeometry = new THREE.CylinderGeometry(40, 40, 100, 32);

  const material = new THREE.MeshPhongMaterial({
    map: canvasTexture,
  });

  const box = new THREE.Mesh(boxGeometry, material);
  box.position.x = -150;
  scene.add(box);

  const sphere = new THREE.Mesh(sphereGeometry, material);
  sphere.position.x = 0;
  scene.add(sphere);

  const cylinder = new THREE.Mesh(cylinderGeometry, material);
  cylinder.position.x = 150;
  scene.add(cylinder);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  let lastDrawTime = 0;
  const drawInterval = 50; // Update texture every 50ms

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Update texture periodically
      if (currentTime - lastDrawTime > drawInterval) {
        lastDrawTime = currentTime;

        // Clear with gradient background
        for (let y = 0; y < texSize; y++) {
          for (let x = 0; x < texSize; x++) {
            const i = (y * texSize + x) * 4;
            const t = y / texSize;
            textureData[i] = Math.floor(30 + t * 50);
            textureData[i + 1] = Math.floor(30 + t * 30);
            textureData[i + 2] = Math.floor(50 + t * 50);
            textureData[i + 3] = 255;
          }
        }

        // Draw animated circles
        const numCircles = 5;
        for (let i = 0; i < numCircles; i++) {
          const phase = (i / numCircles) * Math.PI * 2;
          const cx = Math.floor(texSize / 2 + Math.cos(time * 2 + phase) * 80);
          const cy = Math.floor(texSize / 2 + Math.sin(time * 2 + phase) * 80);
          const r = Math.floor(128 + 127 * Math.sin(time + i));
          const g = Math.floor(128 + 127 * Math.cos(time + i * 1.5));
          const b = Math.floor(128 + 127 * Math.sin(time * 1.5 + i));
          drawCircle(textureData, texSize, cx, cy, 20, r, g, b);
        }

        // Draw lines
        const lineCount = 3;
        for (let i = 0; i < lineCount; i++) {
          const phase = (i / lineCount) * Math.PI * 2;
          const x0 = Math.floor(texSize / 2);
          const y0 = Math.floor(texSize / 2);
          const x1 = Math.floor(texSize / 2 + Math.cos(time * 3 + phase) * 100);
          const y1 = Math.floor(texSize / 2 + Math.sin(time * 3 + phase) * 100);
          drawLine(textureData, texSize, x0, y0, x1, y1, 3, 255, 255, 255);
        }

        canvasTexture.needsUpdate = true;
      }

      // Rotate objects
      box.rotation.x = time * 0.5;
      box.rotation.y = time * 0.3;

      sphere.rotation.y = time * 0.4;

      cylinder.rotation.x = time * 0.3;
      cylinder.rotation.z = time * 0.5;

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise((resolve) => setTimeout(resolve, 16));
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
    { title: 'three.js webgl - canvas textures' },
    (a) => {
      a.window(
        { title: 'three.js webgl - canvas textures', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsTextureCanvas(a, win, { width: WIDTH, height: HEIGHT });
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
