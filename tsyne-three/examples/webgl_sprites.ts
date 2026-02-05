/**
 * three.js webgl - sprites
 *
 * Tests:
 * - Sprite objects with billboard behavior
 * - Sprite material properties
 * - Multiple sprites with different colors
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLSpritesParams {
  width?: number;
  height?: number;
}

export interface WebGLSpritesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLSprites(
  a: App,
  win: Window,
  params: WebGLSpritesParams = {}
): Promise<WebGLSpritesDemo> {
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

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.set(0, 0, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000033);

  // Create sprites in various arrangements
  const sprites: THREE.Sprite[] = [];

  // Spherical distribution
  const sphereRadius = 200;
  const sphereCount = 100;

  for (let i = 0; i < sphereCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / sphereCount);
    const theta = Math.sqrt(sphereCount * Math.PI) * phi;

    const material = new THREE.SpriteMaterial({
      color: new THREE.Color().setHSL(i / sphereCount, 1, 0.5),
      transparent: true,
      opacity: 0.8,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.x = sphereRadius * Math.cos(theta) * Math.sin(phi);
    sprite.position.y = sphereRadius * Math.sin(theta) * Math.sin(phi);
    sprite.position.z = sphereRadius * Math.cos(phi);
    sprite.scale.set(20, 20, 1);

    scene.add(sprite);
    sprites.push(sprite);
  }

  // Ring of larger sprites
  const ringCount = 20;
  const ringRadius = 350;

  for (let i = 0; i < ringCount; i++) {
    const angle = (i / ringCount) * Math.PI * 2;

    const material = new THREE.SpriteMaterial({
      color: new THREE.Color().setHSL(i / ringCount, 0.8, 0.6),
      transparent: true,
      opacity: 0.9,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.x = Math.cos(angle) * ringRadius;
    sprite.position.y = Math.sin(angle) * ringRadius;
    sprite.position.z = 0;
    sprite.scale.set(40, 40, 1);

    scene.add(sprite);
    sprites.push(sprite);
  }

  // Central large sprite
  const centralMaterial = new THREE.SpriteMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
  });
  const centralSprite = new THREE.Sprite(centralMaterial);
  centralSprite.scale.set(60, 60, 1);
  scene.add(centralSprite);
  sprites.push(centralSprite);

  // Add some reference geometry
  const torusGeometry = new THREE.TorusKnotGeometry(80, 20, 64, 16);
  const torusMaterial = new THREE.MeshBasicMaterial({ color: 0x333366, wireframe: true });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  scene.add(torus);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate the sphere of sprites
      for (let i = 0; i < sphereCount; i++) {
        const sprite = sprites[i];
        const angle = time * 0.5 + (i / sphereCount) * Math.PI * 2;
        const currentRadius = sphereRadius + Math.sin(time * 2 + i) * 20;
        
        const phi = Math.acos(-1 + (2 * i) / sphereCount);
        const theta = Math.sqrt(sphereCount * Math.PI) * phi + time * 0.3;

        sprite.position.x = currentRadius * Math.cos(theta) * Math.sin(phi);
        sprite.position.y = currentRadius * Math.sin(theta) * Math.sin(phi);
        sprite.position.z = currentRadius * Math.cos(phi);
      }

      // Rotate ring sprites
      for (let i = 0; i < ringCount; i++) {
        const sprite = sprites[sphereCount + i];
        const angle = (i / ringCount) * Math.PI * 2 + time * 0.5;
        sprite.position.x = Math.cos(angle) * ringRadius;
        sprite.position.y = Math.sin(angle) * ringRadius;
        sprite.position.z = Math.sin(time * 2 + i) * 50;
      }

      // Pulse central sprite
      const scale = 60 + Math.sin(time * 3) * 20;
      centralSprite.scale.set(scale, scale, 1);

      // Rotate torus
      torus.rotation.x = time * 0.3;
      torus.rotation.y = time * 0.4;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 600;
      camera.position.z = Math.cos(time * 0.2) * 600;
      camera.position.y = Math.sin(time * 0.15) * 200;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - sprites' },
    (a) => {
      a.window(
        { title: 'three.js webgl - sprites', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLSprites(a, win, { width: WIDTH, height: HEIGHT });
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
