/**
 * three.js webgl - raycaster sprite
 *
 * Based on: https://threejs.org/examples/webgl_raycaster_sprite.html
 *
 * Tests:
 * - Sprite objects and raycasting
 * - SpriteMaterial properties
 * - Sprite scaling and rotation
 * - sizeAttenuation option
 * - Group transforms affecting sprites
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLRaycasterSpriteParams {
  width?: number;
  height?: number;
}

export interface WebGLRaycasterSpriteDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLRaycasterSprite(
  a: App,
  win: ITsyneWindow,
  params: WebGLRaycasterSpriteParams = {}
): Promise<WebGLRaycasterSpriteDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const group = new THREE.Group();
  scene.add(group);

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  camera.position.set(15, 15, 15);
  camera.lookAt(scene.position);

  // Sprites with different configurations
  const sprite1 = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: '#69f' })
  );
  sprite1.position.set(6, 5, 5);
  sprite1.scale.set(2, 5, 1);
  group.add(sprite1);

  // Sprite without size attenuation
  const sprite2 = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: '#69f', sizeAttenuation: false })
  );
  sprite2.material.rotation = (Math.PI / 3) * 4;
  sprite2.position.set(8, -2, 2);
  sprite2.center.set(0.5, 0);
  sprite2.scale.set(0.1, 0.5, 0.1);
  group.add(sprite2);

  // Nested group with sprite
  const group2 = new THREE.Object3D();
  group2.scale.set(1, 2, 1);
  group2.position.set(-5, 0, 0);
  group2.rotation.set(Math.PI / 2, 0, 0);
  group.add(group2);

  const sprite3 = new THREE.Sprite(
    new THREE.SpriteMaterial({ color: '#69f' })
  );
  sprite3.position.set(0, 2, 5);
  sprite3.scale.set(10, 2, 3);
  sprite3.center.set(-0.1, 0);
  sprite3.material.rotation = Math.PI / 3;
  group2.add(sprite3);

  // Add some additional sprites for visual interest
  for (let i = 0; i < 10; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      })
    );
    sprite.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );
    sprite.scale.set(
      Math.random() * 2 + 0.5,
      Math.random() * 2 + 0.5,
      1
    );
    group.add(sprite);
  }

  // Reference geometry for orientation
  const axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let selectedObject: THREE.Sprite | null = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  // Simulate pointer movement
  let pointerAngle = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate camera around scene
      camera.position.x = Math.sin(time * 0.3) * 20;
      camera.position.z = Math.cos(time * 0.3) * 20;
      camera.lookAt(scene.position);

      // Simulate pointer movement
      pointerAngle += 0.03;
      pointer.x = Math.sin(pointerAngle) * 0.6;
      pointer.y = Math.cos(pointerAngle * 0.7) * 0.6;

      // Reset previous selection
      if (selectedObject) {
        selectedObject.material.color.set('#69f');
        selectedObject = null;
      }

      // Raycast
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(group, true);

      if (intersects.length > 0) {
        const res = intersects.filter(
          (res) => res && res.object && res.object instanceof THREE.Sprite
        )[0];

        if (res && res.object) {
          selectedObject = res.object as THREE.Sprite;
          selectedObject.material.color.set('#f00');
        }
      }

      renderer.render(scene, camera);

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
    { title: 'three.js webgl - raycaster sprite' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - raycaster sprite',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLRaycasterSprite(a, win, {
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
