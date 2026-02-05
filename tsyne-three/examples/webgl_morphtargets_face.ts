/**
 * three.js webgl - morphtargets face
 *
 * Port of: three/examples/webgl_morphtargets_face.html
 *
 * Tests:
 * - Morph targets for facial animation
 * - Simple face mesh with expression morphs
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMorphtargetsFaceParams {
  width?: number;
  height?: number;
}

export interface WebGLMorphtargetsFaceDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMorphtargetsFace(
  a: App,
  win: Window,
  params: WebGLMorphtargetsFaceParams = {}
): Promise<WebGLMorphtargetsFaceDemo> {
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

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 500);
  camera.position.z = 200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x666666);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // Create a simple stylized face geometry
  // Base face (sphere deformed into oval)
  const faceGeometry = new THREE.SphereGeometry(40, 32, 24);
  const positions = faceGeometry.attributes.position;

  // Store base positions
  const basePositions = new Float32Array(positions.array);

  // Create morph targets
  // Smile morph
  const smilePositions = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    smilePositions[i * 3] = x;
    // Lift corners of mouth area
    if (y < -10 && y > -25 && z > 20) {
      smilePositions[i * 3 + 1] = y + Math.abs(x) * 0.3;
    } else {
      smilePositions[i * 3 + 1] = y;
    }
    smilePositions[i * 3 + 2] = z;
  }

  // Surprise morph (eyes wide, mouth open)
  const surprisePositions = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    surprisePositions[i * 3] = x;
    // Raise eyebrow area
    if (y > 15 && y < 30 && z > 20) {
      surprisePositions[i * 3 + 1] = y + 5;
    }
    // Open mouth area
    else if (y < -15 && z > 20) {
      surprisePositions[i * 3 + 1] = y - 8;
    } else {
      surprisePositions[i * 3 + 1] = y;
    }
    surprisePositions[i * 3 + 2] = z;
  }

  // Squint morph
  const squintPositions = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    squintPositions[i * 3] = x;
    // Squint eye area
    if (y > 5 && y < 20 && z > 25) {
      squintPositions[i * 3 + 1] = y - 3;
      squintPositions[i * 3 + 2] = z - 2;
    } else {
      squintPositions[i * 3 + 1] = y;
      squintPositions[i * 3 + 2] = z;
    }
  }

  // Set up morph targets
  faceGeometry.morphAttributes.position = [
    new THREE.BufferAttribute(smilePositions, 3),
    new THREE.BufferAttribute(surprisePositions, 3),
    new THREE.BufferAttribute(squintPositions, 3),
  ];

  const faceMaterial = new THREE.MeshPhongMaterial({
    color: 0xffcc99,
    flatShading: false,
    morphTargets: true,
  });

  const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
  faceMesh.morphTargetInfluences = [0, 0, 0];
  scene.add(faceMesh);

  // Add simple eyes
  const eyeGeometry = new THREE.SphereGeometry(6, 16, 12);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-12, 10, 35);
  faceMesh.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(12, 10, 35);
  faceMesh.add(rightEye);

  // Add pupil highlights
  const pupilGeometry = new THREE.SphereGeometry(2, 8, 8);
  const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  leftPupil.position.set(-10, 12, 40);
  faceMesh.add(leftPupil);

  const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
  rightPupil.position.set(14, 12, 40);
  faceMesh.add(rightPupil);

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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Animate morph targets
      if (faceMesh.morphTargetInfluences) {
        // Smile cycles
        faceMesh.morphTargetInfluences[0] = (Math.sin(time * 0.8) + 1) * 0.5;
        // Surprise with different phase
        faceMesh.morphTargetInfluences[1] = (Math.sin(time * 0.5 + 2) + 1) * 0.3;
        // Squint occasionally
        faceMesh.morphTargetInfluences[2] = Math.max(0, Math.sin(time * 1.2));
      }

      // Slight head movement
      faceMesh.rotation.y = Math.sin(time * 0.3) * 0.2;
      faceMesh.rotation.x = Math.sin(time * 0.4) * 0.1;

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
    { title: 'three.js webgl - morphtargets face' },
    (a) => {
      a.window(
        { title: 'three.js webgl - morphtargets face', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMorphtargetsFace(a, win, { width: WIDTH, height: HEIGHT });
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
