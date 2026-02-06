/**
 * three.js webgl - animation groups
 *
 * Port of: three/examples/webgl_animation_groups.html
 *
 * Tests:
 * - AnimationObjectGroup for synchronized animations
 * - Multiple objects sharing animation clips
 * - Procedural animated objects
 *
 * Adaptations for Tsyne:
 * - Procedural geometry
 * - Simple animation clips
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLAnimationGroupsParams {
  width?: number;
  height?: number;
  objectCount?: number;
}

export interface WebGLAnimationGroupsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLAnimationGroups(
  a: App,
  win: ITsyneWindow,
  params: WebGLAnimationGroupsParams = {}
): Promise<WebGLAnimationGroupsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const objectCount = params.objectCount ?? 20;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  camera.position.set(0, 150, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Grid helper
  const gridHelper = new THREE.GridHelper(200, 10, 0x444444, 0x333333);
  scene.add(gridHelper);

  // ─────────────────────────────────────────────────────────────────────────
  // Create animated objects
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.BoxGeometry(20, 20, 20);
  const objects: THREE.Mesh[] = [];

  for (let i = 0; i < objectCount; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / objectCount, 0.8, 0.5),
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Arrange in a circle
    const angle = (i / objectCount) * Math.PI * 2;
    mesh.position.x = Math.cos(angle) * 100;
    mesh.position.z = Math.sin(angle) * 100;

    scene.add(mesh);
    objects.push(mesh);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create animation group and shared animation
  // ─────────────────────────────────────────────────────────────────────────

  const animationGroup = new THREE.AnimationObjectGroup(...objects);
  const mixer = new THREE.AnimationMixer(animationGroup as any);

  // Create shared animation clip - scale oscillation
  const scaleTrack = new THREE.VectorKeyframeTrack(
    '.scale',
    [0, 0.5, 1],
    [
      1, 1, 1,
      1.5, 1.5, 1.5,
      1, 1, 1
    ]
  );

  // Create rotation track
  const rotationTrack = new THREE.VectorKeyframeTrack(
    '.rotation[y]',
    [0, 0.5, 1],
    [0, Math.PI, Math.PI * 2]
  );

  // Create position Y track (bounce)
  const posYTrack = new THREE.NumberKeyframeTrack(
    '.position[y]',
    [0, 0.25, 0.5, 0.75, 1],
    [0, 30, 0, 30, 0]
  );

  const clip = new THREE.AnimationClip('shared', 1, [scaleTrack, rotationTrack, posYTrack]);
  const action = mixer.clipAction(clip);
  action.play();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let lastTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const deltaTime = (currentTime - lastTime) * 0.001;
      lastTime = currentTime;
      const time = currentTime * 0.001;

      // Update animation mixer
      mixer.update(deltaTime);

      // Rotate the entire group arrangement
      for (let i = 0; i < objects.length; i++) {
        const angle = (i / objects.length) * Math.PI * 2 + time * 0.3;
        objects[i].position.x = Math.cos(angle) * 100;
        objects[i].position.z = Math.sin(angle) * 100;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.z = Math.cos(time * 0.2) * 400;
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
    { title: 'three.js webgl - animation groups' },
    (a) => {
      a.window(
        { title: 'three.js webgl - animation groups', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLAnimationGroups(a, win, { width: WIDTH, height: HEIGHT });
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
