/**
 * three.js webgl - animation - keyframes
 *
 * Tests:
 * - AnimationMixer
 * - AnimationClip
 * - KeyframeTrack (position, rotation, scale)
 * - Procedural keyframe animation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLAnimationKeyframesParams {
  width?: number;
  height?: number;
}

export interface WebGLAnimationKeyframesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLAnimationKeyframes(
  a: App,
  win: Window,
  params: WebGLAnimationKeyframesParams = {}
): Promise<WebGLAnimationKeyframesDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 100, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16213e);

  const clock = new THREE.Clock();
  const mixers: THREE.AnimationMixer[] = [];

  // Object 1: Bouncing box with position animation
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(40, 40, 40),
    new THREE.MeshBasicMaterial({ color: 0xff6b6b, wireframe: true })
  );
  box.position.x = -150;
  scene.add(box);

  const boxPositionKF = new THREE.VectorKeyframeTrack(
    '.position',
    [0, 0.5, 1, 1.5, 2],
    [
      -150, 0, 0,
      -150, 80, 0,
      -150, 0, 0,
      -150, 50, 0,
      -150, 0, 0,
    ]
  );
  const boxClip = new THREE.AnimationClip('bounce', 2, [boxPositionKF]);
  const boxMixer = new THREE.AnimationMixer(box);
  boxMixer.clipAction(boxClip).play();
  mixers.push(boxMixer);

  // Object 2: Spinning sphere with rotation animation
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(30, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x4ecdc4, wireframe: true })
  );
  sphere.position.x = 0;
  scene.add(sphere);

  const sphereRotationKF = new THREE.VectorKeyframeTrack(
    '.rotation',
    [0, 1, 2, 3, 4],
    [
      0, 0, 0,
      Math.PI, Math.PI / 2, 0,
      Math.PI * 2, Math.PI, 0,
      Math.PI * 3, Math.PI * 1.5, 0,
      Math.PI * 4, Math.PI * 2, 0,
    ]
  );
  const sphereClip = new THREE.AnimationClip('spin', 4, [sphereRotationKF]);
  const sphereMixer = new THREE.AnimationMixer(sphere);
  sphereMixer.clipAction(sphereClip).play();
  mixers.push(sphereMixer);

  // Object 3: Pulsing torus with scale animation
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(25, 10, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe66d, wireframe: true })
  );
  torus.position.x = 150;
  scene.add(torus);

  const torusScaleKF = new THREE.VectorKeyframeTrack(
    '.scale',
    [0, 0.5, 1],
    [
      1, 1, 1,
      1.5, 1.5, 1.5,
      1, 1, 1,
    ]
  );
  const torusClip = new THREE.AnimationClip('pulse', 1, [torusScaleKF]);
  const torusMixer = new THREE.AnimationMixer(torus);
  torusMixer.clipAction(torusClip).play();
  mixers.push(torusMixer);

  // Object 4: Complex animation with multiple tracks
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(20, 6, 64, 8),
    new THREE.MeshBasicMaterial({ color: 0xa8e6cf, wireframe: true })
  );
  knot.position.y = -80;
  scene.add(knot);

  const knotPositionKF = new THREE.VectorKeyframeTrack(
    '.position',
    [0, 1, 2, 3, 4],
    [
      -100, -80, 0,
      0, -80, 50,
      100, -80, 0,
      0, -80, -50,
      -100, -80, 0,
    ]
  );
  const knotRotationKF = new THREE.VectorKeyframeTrack(
    '.rotation',
    [0, 2, 4],
    [
      0, 0, 0,
      Math.PI, Math.PI * 2, 0,
      Math.PI * 2, Math.PI * 4, 0,
    ]
  );
  const knotScaleKF = new THREE.VectorKeyframeTrack(
    '.scale',
    [0, 1, 2, 3, 4],
    [
      1, 1, 1,
      1.2, 0.8, 1,
      1, 1, 1,
      0.8, 1.2, 1,
      1, 1, 1,
    ]
  );
  const knotClip = new THREE.AnimationClip('complex', 4, [knotPositionKF, knotRotationKF, knotScaleKF]);
  const knotMixer = new THREE.AnimationMixer(knot);
  knotMixer.clipAction(knotClip).play();
  mixers.push(knotMixer);

  // Object 5: Color animation via material opacity cycling
  const icosahedron = new THREE.Mesh(
    new THREE.IcosahedronGeometry(25, 1),
    new THREE.MeshBasicMaterial({ color: 0xdcd6f7, wireframe: true, transparent: true })
  );
  icosahedron.position.set(0, 80, 0);
  scene.add(icosahedron);

  const icoRotationKF = new THREE.VectorKeyframeTrack(
    '.rotation',
    [0, 3],
    [0, 0, 0, Math.PI * 2, Math.PI * 2, Math.PI * 2]
  );
  const icoClip = new THREE.AnimationClip('icoSpin', 3, [icoRotationKF]);
  const icoMixer = new THREE.AnimationMixer(icosahedron);
  icoMixer.clipAction(icoClip).play();
  mixers.push(icoMixer);

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
      const delta = clock.getDelta();
      currentTime = Date.now() - startTime;

      // Update all animation mixers
      for (const mixer of mixers) {
        mixer.update(delta);
      }

      renderer.render(scene, camera);

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
    { title: 'three.js webgl - animation - keyframes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - animation - keyframes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLAnimationKeyframes(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
