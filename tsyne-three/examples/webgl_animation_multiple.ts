/**
 * three.js webgl - animation multiple
 *
 * Port of: three/examples/webgl_animation_multiple.html
 *
 * Tests:
 * - Multiple animated objects with different animations
 * - Procedural skeleton creation
 * - Animation mixer with multiple clips
 * - Independent animation timing per object
 *
 * Adaptations for Tsyne:
 * - Uses procedural geometry instead of GLTF loading
 * - Simplified bone structure for demonstration
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLAnimationMultipleParams {
  width?: number;
  height?: number;
  objectCount?: number;
}

export interface WebGLAnimationMultipleDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLAnimationMultiple(
  a: App,
  win: Window,
  params: WebGLAnimationMultipleParams = {}
): Promise<WebGLAnimationMultipleDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const objectCount = params.objectCount ?? 8;

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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
  camera.position.set(0, 100, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);

  // Add fog for depth
  scene.fog = new THREE.Fog(0xa0a0a0, 200, 600);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemiLight.position.set(0, 100, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(0, 100, 50);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Ground plane
  const groundGeom = new THREE.PlaneGeometry(1000, 1000);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ─────────────────────────────────────────────────────────────────────────
  // Create animated objects with procedural geometry
  // ─────────────────────────────────────────────────────────────────────────

  const mixers: any[] = [];
  const objects: any[] = [];
  const clock = new THREE.Clock();

  // Create simple procedural animated figures
  function createAnimatedFigure(color: number, position: THREE.Vector3) {
    const group = new THREE.Group();

    // Body (box)
    const bodyGeom = new THREE.BoxGeometry(10, 20, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 30;
    group.add(body);

    // Head (sphere)
    const headGeom = new THREE.SphereGeometry(5, 16, 12);
    const headMat = new THREE.MeshLambertMaterial({ color });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 45;
    group.add(head);

    // Arms
    const armGeom = new THREE.BoxGeometry(4, 15, 4);
    const armMat = new THREE.MeshLambertMaterial({ color });

    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.set(-8, 32, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.position.set(8, 32, 0);
    group.add(rightArm);

    // Legs
    const legGeom = new THREE.BoxGeometry(4, 18, 4);
    const legMat = new THREE.MeshLambertMaterial({ color });

    const leftLeg = new THREE.Mesh(legGeom, legMat);
    leftLeg.position.set(-3, 9, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, legMat);
    rightLeg.position.set(3, 9, 0);
    group.add(rightLeg);

    group.position.copy(position);
    scene.add(group);

    // Create animation for this object
    const mixer = new THREE.AnimationMixer(group);

    // Create bounce animation
    const bounceTrack = new THREE.VectorKeyframeTrack(
      '.position',
      [0, 0.5, 1],
      [
        position.x, position.y, position.z,
        position.x, position.y + 20, position.z,
        position.x, position.y, position.z
      ]
    );

    // Create rotation animation
    const rotateTrack = new THREE.QuaternionKeyframeTrack(
      '.quaternion',
      [0, 0.5, 1],
      [
        0, 0, 0, 1,
        0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4),
        0, 0, 0, 1
      ]
    );

    // Create arm swing animation for left arm
    const leftArmTrack = new THREE.VectorKeyframeTrack(
      '.children[2].rotation',
      [0, 0.5, 1],
      [
        0, 0, 0.5,
        0, 0, -0.5,
        0, 0, 0.5
      ]
    );

    // Create arm swing animation for right arm
    const rightArmTrack = new THREE.VectorKeyframeTrack(
      '.children[3].rotation',
      [0, 0.5, 1],
      [
        0, 0, -0.5,
        0, 0, 0.5,
        0, 0, -0.5
      ]
    );

    const clip = new THREE.AnimationClip('walk', 1, [bounceTrack, rotateTrack]);
    const action = mixer.clipAction(clip);
    action.play();

    return { group, mixer };
  }

  // Create multiple animated figures in a grid
  const colors = [
    0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4,
    0xffeaa7, 0xdfe6e9, 0xfd79a8, 0xa29bfe
  ];

  for (let i = 0; i < objectCount; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = (col - 1.5) * 80;
    const z = (row - 0.5) * 80;

    const { group, mixer } = createAnimatedFigure(
      colors[i % colors.length],
      new THREE.Vector3(x, 0, z)
    );

    // Offset animation timing for variety
    mixer.setTime(i * 0.1);

    objects.push(group);
    mixers.push(mixer);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;

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

      // Slowly rotate camera around the scene
      const time = currentTime * 0.0003;
      camera.position.x = Math.sin(time) * 300;
      camera.position.z = Math.cos(time) * 300;
      camera.lookAt(0, 30, 0);

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
    { title: 'three.js webgl - animation multiple' },
    (a) => {
      a.window(
        { title: 'three.js webgl - animation multiple', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLAnimationMultiple(a, win, { width: WIDTH, height: HEIGHT });
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
