/**
 * three.js webgl - morph targets horse (skeletal animation version)
 *
 * Port of: three/examples/webgl_morphtargets_horse.html
 *
 * Tests:
 * - Animated horse gallop using skeletal/hierarchical animation
 * - Procedural horse-like geometry with separate parts
 * - Smooth animation blending via rotation
 *
 * Adaptations for Tsyne:
 * - Uses separate mesh parts instead of morph targets
 * - (Morph targets require gl.bindAttribLocation not supported in Tsyne)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMorphtargetsHorseParams {
  width?: number;
  height?: number;
}

export interface WebGLMorphtargetsHorseDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMorphtargetsHorse(
  a: App,
  win: Window,
  params: WebGLMorphtargetsHorseParams = {}
): Promise<WebGLMorphtargetsHorseDemo> {
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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 10000);
  camera.position.set(0, 100, 500);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);
  scene.fog = new THREE.Fog(0xf0f0f0, 500, 2000);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(200, 450, 500);
  scene.add(directionalLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create procedural horse using separate animated parts
  // ─────────────────────────────────────────────────────────────────────────

  interface HorseModel {
    group: THREE.Group;
    body: THREE.Mesh;
    neck: THREE.Mesh;
    head: THREE.Mesh;
    frontLeftLegUpper: THREE.Mesh;
    frontLeftLegLower: THREE.Mesh;
    frontRightLegUpper: THREE.Mesh;
    frontRightLegLower: THREE.Mesh;
    backLeftLegUpper: THREE.Mesh;
    backLeftLegLower: THREE.Mesh;
    backRightLegUpper: THREE.Mesh;
    backRightLegLower: THREE.Mesh;
    tail: THREE.Mesh;
  }

  function createHorse(color: number): HorseModel {
    const group = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({ color, flatShading: true });

    // Body
    const bodyGeom = new THREE.BoxGeometry(120, 60, 40);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.set(0, 50, 0);
    group.add(body);

    // Neck
    const neckGeom = new THREE.BoxGeometry(30, 60, 25);
    const neck = new THREE.Mesh(neckGeom, material);
    neck.position.set(70, 90, 0);
    group.add(neck);

    // Head
    const headGeom = new THREE.BoxGeometry(50, 25, 20);
    const head = new THREE.Mesh(headGeom, material);
    head.position.set(95, 120, 0);
    group.add(head);

    // Legs - each leg has upper and lower part for articulation
    const legUpperGeom = new THREE.BoxGeometry(15, 40, 12);
    const legLowerGeom = new THREE.BoxGeometry(10, 35, 10);

    // Front left leg
    const frontLeftLegUpper = new THREE.Mesh(legUpperGeom, material);
    frontLeftLegUpper.position.set(40, 25, -15);
    group.add(frontLeftLegUpper);

    const frontLeftLegLower = new THREE.Mesh(legLowerGeom, material);
    frontLeftLegLower.position.set(40, -12, -15);
    group.add(frontLeftLegLower);

    // Front right leg
    const frontRightLegUpper = new THREE.Mesh(legUpperGeom.clone(), material);
    frontRightLegUpper.position.set(40, 25, 15);
    group.add(frontRightLegUpper);

    const frontRightLegLower = new THREE.Mesh(legLowerGeom.clone(), material);
    frontRightLegLower.position.set(40, -12, 15);
    group.add(frontRightLegLower);

    // Back left leg
    const backLeftLegUpper = new THREE.Mesh(legUpperGeom.clone(), material);
    backLeftLegUpper.position.set(-40, 25, -15);
    group.add(backLeftLegUpper);

    const backLeftLegLower = new THREE.Mesh(legLowerGeom.clone(), material);
    backLeftLegLower.position.set(-40, -12, -15);
    group.add(backLeftLegLower);

    // Back right leg
    const backRightLegUpper = new THREE.Mesh(legUpperGeom.clone(), material);
    backRightLegUpper.position.set(-40, 25, 15);
    group.add(backRightLegUpper);

    const backRightLegLower = new THREE.Mesh(legLowerGeom.clone(), material);
    backRightLegLower.position.set(-40, -12, 15);
    group.add(backRightLegLower);

    // Tail
    const tailGeom = new THREE.BoxGeometry(30, 8, 8);
    const tail = new THREE.Mesh(tailGeom, material);
    tail.position.set(-75, 55, 0);
    group.add(tail);

    return {
      group,
      body,
      neck,
      head,
      frontLeftLegUpper,
      frontLeftLegLower,
      frontRightLegUpper,
      frontRightLegLower,
      backLeftLegUpper,
      backLeftLegLower,
      backRightLegUpper,
      backRightLegLower,
      tail,
    };
  }

  function animateHorse(horse: HorseModel, time: number, phase: number) {
    const gallopSpeed = 8;
    const t = time * gallopSpeed + phase;

    // Gallop animation - legs move in pairs
    const frontLegAngle = Math.sin(t) * 0.6;
    const backLegAngle = Math.sin(t + Math.PI) * 0.6;

    // Front legs
    horse.frontLeftLegUpper.rotation.z = frontLegAngle;
    horse.frontLeftLegLower.rotation.z = Math.max(0, frontLegAngle) * 0.8;
    horse.frontLeftLegLower.position.y = -12 + Math.sin(t) * 5;

    horse.frontRightLegUpper.rotation.z = -frontLegAngle;
    horse.frontRightLegLower.rotation.z = Math.max(0, -frontLegAngle) * 0.8;
    horse.frontRightLegLower.position.y = -12 + Math.sin(t + Math.PI) * 5;

    // Back legs
    horse.backLeftLegUpper.rotation.z = backLegAngle;
    horse.backLeftLegLower.rotation.z = Math.max(0, backLegAngle) * 0.8;
    horse.backLeftLegLower.position.y = -12 + Math.sin(t + Math.PI) * 5;

    horse.backRightLegUpper.rotation.z = -backLegAngle;
    horse.backRightLegLower.rotation.z = Math.max(0, -backLegAngle) * 0.8;
    horse.backRightLegLower.position.y = -12 + Math.sin(t) * 5;

    // Body bob
    horse.body.position.y = 50 + Math.abs(Math.sin(t * 2)) * 5;
    horse.neck.position.y = 90 + Math.abs(Math.sin(t * 2)) * 5;
    horse.head.position.y = 120 + Math.abs(Math.sin(t * 2)) * 5;

    // Head bob
    horse.neck.rotation.z = Math.sin(t) * 0.1;
    horse.head.rotation.z = Math.sin(t * 2) * 0.1;

    // Tail swish
    horse.tail.rotation.y = Math.sin(t * 3) * 0.3;
  }

  // Create multiple horses
  const horses: HorseModel[] = [];
  const horseColors = [0x8b4513, 0x654321, 0x2f1810, 0x3d2314, 0x1a0d00];

  for (let i = 0; i < 5; i++) {
    const horse = createHorse(horseColors[i]);
    horse.group.position.set((i - 2) * 200, 0, (i % 2) * 150 - 75);
    scene.add(horse.group);
    horses.push(horse);
  }

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(4000, 4000);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x8fbc8f });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -45;
  scene.add(ground);

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

      // Animate all horses
      for (let i = 0; i < horses.length; i++) {
        animateHorse(horses[i], time, i * 0.5);

        // Move horses forward
        horses[i].group.position.x += 2;
        if (horses[i].group.position.x > 600) {
          horses[i].group.position.x = -600;
        }
      }

      // Camera follows action
      camera.position.x = Math.sin(time * 0.1) * 100;
      camera.position.z = 400 + Math.cos(time * 0.1) * 100;
      camera.lookAt(0, 60, 0);

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
    { title: 'three.js webgl - morph targets horse' },
    (a) => {
      a.window(
        { title: 'three.js webgl - morph targets horse', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMorphtargetsHorse(a, win, { width: WIDTH, height: HEIGHT });
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
