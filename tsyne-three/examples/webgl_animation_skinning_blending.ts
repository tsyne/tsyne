/**
 * three.js webgl - animation skinning blending
 *
 * Port of: three/examples/webgl_animation_skinning_blending.html
 *
 * Tests:
 * - Procedural skinned mesh creation
 * - Skeleton with bones
 * - Animation blending between clips
 * - Skinned mesh deformation
 *
 * Adaptations for Tsyne:
 * - Fully procedural skeleton and mesh
 * - No external model loading
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLAnimationSkinningBlendingParams {
  width?: number;
  height?: number;
}

export interface WebGLAnimationSkinningBlendingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLAnimationSkinningBlending(
  a: App,
  win: Window,
  params: WebGLAnimationSkinningBlendingParams = {}
): Promise<WebGLAnimationSkinningBlendingDemo> {
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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
  camera.position.set(0, 100, 300);
  camera.lookAt(0, 50, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 100, 500);

  // Lights
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(0, 200, 100);
  scene.add(dirLight);

  // Ground
  const groundGeom = new THREE.PlaneGeometry(500, 500);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  const ground = new THREE.Mesh(groundGeom, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ─────────────────────────────────────────────────────────────────────────
  // Create procedural skinned mesh
  // ─────────────────────────────────────────────────────────────────────────

  // Create a simple cylindrical character with bones
  const segmentHeight = 20;
  const segmentCount = 5;
  const cylinderHeight = segmentHeight * segmentCount;
  const halfHeight = cylinderHeight / 2;

  // Create geometry
  const geometry = new THREE.CylinderGeometry(10, 10, cylinderHeight, 8, segmentCount * 4);
  geometry.translate(0, halfHeight, 0);

  // Create bones
  const bones: THREE.Bone[] = [];
  let prevBone = new THREE.Bone();
  bones.push(prevBone);
  prevBone.position.y = 0;

  for (let i = 0; i < segmentCount; i++) {
    const bone = new THREE.Bone();
    bone.position.y = segmentHeight;
    bones.push(bone);
    prevBone.add(bone);
    prevBone = bone;
  }

  // Create skeleton
  const skeleton = new THREE.Skeleton(bones);

  // Create skinning indices and weights
  const position = geometry.getAttribute('position');
  const vertex = new THREE.Vector3();

  const skinIndices: number[] = [];
  const skinWeights: number[] = [];

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    // Determine which bone(s) this vertex belongs to
    const y = vertex.y;
    const skinIndex = Math.floor(y / segmentHeight);
    const skinWeight = (y % segmentHeight) / segmentHeight;

    const index0 = Math.min(skinIndex, segmentCount);
    const index1 = Math.min(skinIndex + 1, segmentCount);

    skinIndices.push(index0, index1, 0, 0);
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  // Create material and mesh
  const material = new THREE.MeshLambertMaterial({
    color: 0x4ecdc4,
    skinning: true,
  });

  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  scene.add(mesh);

  // Add skeleton helper
  const skeletonHelper = new THREE.SkeletonHelper(mesh);
  scene.add(skeletonHelper);

  // ─────────────────────────────────────────────────────────────────────────
  // Create animations
  // ─────────────────────────────────────────────────────────────────────────

  const mixer = new THREE.AnimationMixer(mesh);

  // Wave animation - bones sway side to side
  function createWaveClip(): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];

    for (let i = 1; i <= segmentCount; i++) {
      const boneName = '.skeleton.bones[' + i + ']';
      const times = [0, 0.5, 1];
      const values = [
        0, 0, Math.sin(i * 0.5) * 0.1, 1,
        0, 0, Math.sin(i * 0.5) * -0.1, 1,
        0, 0, Math.sin(i * 0.5) * 0.1, 1
      ];

      const track = new THREE.QuaternionKeyframeTrack(
        boneName + '.quaternion',
        times,
        values
      );
      tracks.push(track);
    }

    return new THREE.AnimationClip('wave', 1, tracks);
  }

  // Twist animation - bones rotate around Y axis
  function createTwistClip(): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];

    for (let i = 1; i <= segmentCount; i++) {
      const boneName = '.skeleton.bones[' + i + ']';
      const angle = i * 0.2;
      const times = [0, 0.5, 1];
      const values = [
        0, Math.sin(0), 0, Math.cos(0),
        0, Math.sin(angle), 0, Math.cos(angle),
        0, Math.sin(0), 0, Math.cos(0)
      ];

      const track = new THREE.QuaternionKeyframeTrack(
        boneName + '.quaternion',
        times,
        values
      );
      tracks.push(track);
    }

    return new THREE.AnimationClip('twist', 1, tracks);
  }

  // Bend animation - bones tilt forward
  function createBendClip(): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = [];

    for (let i = 1; i <= segmentCount; i++) {
      const boneName = '.skeleton.bones[' + i + ']';
      const angle = i * 0.1;
      const times = [0, 0.5, 1];

      // Create quaternion for X-axis rotation
      const q1 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);
      const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);

      const values = [
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q1.x, q1.y, q1.z, q1.w
      ];

      const track = new THREE.QuaternionKeyframeTrack(
        boneName + '.quaternion',
        times,
        values
      );
      tracks.push(track);
    }

    return new THREE.AnimationClip('bend', 1, tracks);
  }

  const waveClip = createWaveClip();
  const twistClip = createTwistClip();
  const bendClip = createBendClip();

  const waveAction = mixer.clipAction(waveClip);
  const twistAction = mixer.clipAction(twistClip);
  const bendAction = mixer.clipAction(bendClip);

  // Start all actions with different weights
  waveAction.play();
  twistAction.play();
  bendAction.play();

  const clock = new THREE.Clock();

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
      const time = currentTime * 0.001;

      // Blend between animations over time
      waveAction.setEffectiveWeight((Math.sin(time * 0.5) + 1) / 2);
      twistAction.setEffectiveWeight((Math.sin(time * 0.7) + 1) / 2);
      bendAction.setEffectiveWeight((Math.sin(time * 0.3) + 1) / 2);

      mixer.update(delta);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.3) * 200;
      camera.position.z = Math.cos(time * 0.3) * 200;
      camera.lookAt(0, 50, 0);

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
    { title: 'three.js webgl - animation skinning blending' },
    (a) => {
      a.window(
        { title: 'three.js webgl - animation skinning blending', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLAnimationSkinningBlending(a, win, { width: WIDTH, height: HEIGHT });
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
