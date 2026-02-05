/**
 * three.js webgl - framebuffer texture
 *
 * Based on: https://threejs.org/examples/webgl_framebuffer_texture.html
 *
 * Tests:
 * - FramebufferTexture
 * - copyFramebufferToTexture
 * - Dynamic vertex colors (rainbow animation)
 * - Sprite with captured texture
 * - Orthographic camera overlay
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLFramebufferTextureParams {
  width?: number;
  height?: number;
}

export interface WebGLFramebufferTextureDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Gosper Curve Generator
// ═══════════════════════════════════════════════════════════════════════════

function gosper(order: number): number[] {
  // Generate a Gosper curve (space-filling curve)
  const points: number[] = [];
  const scale = 0.025;

  let x = 0,
    y = 0,
    z = 0;
  let angle = 0;
  const step = 10;

  function forward() {
    x += Math.cos(angle) * step;
    y += Math.sin(angle) * step;
    points.push(x * scale, y * scale, z * scale);
  }

  function left() {
    angle += Math.PI / 3;
  }

  function right() {
    angle -= Math.PI / 3;
  }

  // L-system rules for Gosper curve
  let axiom = 'A';
  const rules: { [key: string]: string } = {
    A: 'A-B--B+A++AA+B-',
    B: '+A-BB--B-A++A+B',
  };

  // Generate iterations
  for (let i = 0; i < order; i++) {
    let next = '';
    for (const char of axiom) {
      next += rules[char] || char;
    }
    axiom = next;
  }

  // Execute commands
  points.push(x * scale, y * scale, z * scale);
  for (const char of axiom) {
    switch (char) {
      case 'A':
      case 'B':
        forward();
        break;
      case '+':
        left();
        break;
      case '-':
        right();
        break;
    }
  }

  return points;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLFramebufferTexture(
  a: App,
  win: Window,
  params: WebGLFramebufferTextureParams = {}
): Promise<WebGLFramebufferTextureDemo> {
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
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const textureSize = 128;

  // Main scene camera
  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.z = 20;

  // Orthographic camera for sprite overlay
  const cameraOrtho = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    height / 2,
    -height / 2,
    1,
    10
  );
  cameraOrtho.position.z = 10;

  const scene = new THREE.Scene();
  const sceneOrtho = new THREE.Scene();

  // Generate Gosper curve points
  const points = gosper(5); // Lower order for performance
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.Float32BufferAttribute(points, 3);
  geometry.setAttribute('position', positionAttribute);
  geometry.center();

  // Colors for rainbow animation
  const colorAttribute = new THREE.BufferAttribute(
    new Float32Array(positionAttribute.array.length),
    3
  );
  (colorAttribute as any).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('color', colorAttribute);

  const material = new THREE.LineBasicMaterial({ vertexColors: true });

  const line = new THREE.Line(geometry, material);
  line.scale.setScalar(0.05);
  scene.add(line);

  // Framebuffer texture for capturing
  const texture = new THREE.FramebufferTexture(textureSize, textureSize);

  // Sprite to display captured texture
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(textureSize, textureSize, 1);

  // Position sprite in corner
  sprite.position.set(
    -width / 2 + textureSize / 2 + 10,
    height / 2 - textureSize / 2 - 10,
    1
  );
  sceneOrtho.add(sprite);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.autoClear = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Color update
  // ─────────────────────────────────────────────────────────────────────────

  const color = new THREE.Color();
  let offset = 0;

  function updateColors() {
    const count = colorAttribute.count;

    for (let i = 0; i < count; i++) {
      const h = ((offset + i) % count) / count;
      color.setHSL(h, 1, 0.5);
      colorAttribute.setX(i, color.r);
      colorAttribute.setY(i, color.g);
      colorAttribute.setZ(i, color.b);
    }

    colorAttribute.needsUpdate = true;
    offset -= 25;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const vector = new THREE.Vector2();

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate line
      line.rotation.z = time * 0.5;

      // Update colors
      updateColors();

      // Render main scene
      renderer.clear();
      renderer.render(scene, camera);

      // Calculate capture position (center of screen)
      vector.x = (width / 2) - (textureSize / 2);
      vector.y = (height / 2) - (textureSize / 2);

      // Copy framebuffer to texture
      renderer.copyFramebufferToTexture(texture, vector);

      // Render overlay
      renderer.clearDepth();
      renderer.render(sceneOrtho, cameraOrtho);

      // Flush GL commands
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - framebuffer texture' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - framebuffer texture',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLFramebufferTexture(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
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
