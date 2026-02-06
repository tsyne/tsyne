/**
 * three.js webgl - physics ammo rope
 *
 * Port of: three/examples/webgl_physics_ammo_rope.html
 *
 * Tests:
 * - Rope/chain physics simulation
 * - Verlet integration for rope segments
 * - Distance constraints
 * - Swinging motion
 *
 * Adaptations for Tsyne:
 * - Simple Verlet integration
 * - No Ammo.js physics engine
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPhysicsAmmoRopeParams {
  width?: number;
  height?: number;
}

export interface WebGLPhysicsAmmoRopeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPhysicsAmmoRope(
  a: App,
  win: ITsyneWindow,
  params: WebGLPhysicsAmmoRopeParams = {}
): Promise<WebGLPhysicsAmmoRopeDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 10, 30);
  camera.lookAt(0, 5, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(50, 50);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // ─────────────────────────────────────────────────────────────────────────
  // Rope physics
  // ─────────────────────────────────────────────────────────────────────────

  interface RopeNode {
    position: THREE.Vector3;
    previousPosition: THREE.Vector3;
    pinned: boolean;
  }

  interface Rope {
    nodes: RopeNode[];
    segmentLength: number;
    line: THREE.Line;
    endMesh: THREE.Mesh | null;
  }

  const ropes: Rope[] = [];
  const gravity = new THREE.Vector3(0, -0.008, 0);
  const damping = 0.99;

  function createRope(
    startPos: THREE.Vector3,
    nodeCount: number,
    segmentLength: number,
    color: number,
    hasWeight: boolean
  ): Rope {
    const nodes: RopeNode[] = [];

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      const position = new THREE.Vector3(
        startPos.x,
        startPos.y - i * segmentLength,
        startPos.z
      );
      nodes.push({
        position: position.clone(),
        previousPosition: position.clone(),
        pinned: i === 0, // Pin the first node
      });
    }

    // Create line geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(nodeCount * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    // Create weight at the end
    let endMesh: THREE.Mesh | null = null;
    if (hasWeight) {
      const weightGeometry = new THREE.SphereGeometry(0.5, 16, 8);
      const weightMaterial = new THREE.MeshPhongMaterial({ color });
      endMesh = new THREE.Mesh(weightGeometry, weightMaterial);
      scene.add(endMesh);
    }

    return { nodes, segmentLength, line, endMesh };
  }

  // Create multiple ropes
  const ropeColors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff];
  for (let i = 0; i < 5; i++) {
    const startPos = new THREE.Vector3(i * 4 - 8, 15, 0);
    const rope = createRope(startPos, 20, 0.5, ropeColors[i], true);
    ropes.push(rope);
  }

  // Create a longer rope without weight
  const longRope = createRope(new THREE.Vector3(0, 18, -5), 40, 0.3, 0xffffff, false);
  ropes.push(longRope);

  // Create anchor points
  const anchorGeometry = new THREE.BoxGeometry(1, 0.5, 1);
  const anchorMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });

  for (let i = 0; i < 5; i++) {
    const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
    anchor.position.set(i * 4 - 8, 15, 0);
    scene.add(anchor);
  }

  // Cross beam for long rope
  const beamGeometry = new THREE.BoxGeometry(0.5, 0.5, 12);
  const beam = new THREE.Mesh(beamGeometry, anchorMaterial);
  beam.position.set(0, 18, -5);
  scene.add(beam);

  function simulateRope(rope: Rope, time: number) {
    const { nodes, segmentLength } = rope;

    // Apply wind
    const wind = new THREE.Vector3(
      Math.sin(time * 0.5) * 0.002,
      0,
      Math.cos(time * 0.3) * 0.001
    );

    // Verlet integration
    for (const node of nodes) {
      if (!node.pinned) {
        const velocity = node.position.clone().sub(node.previousPosition).multiplyScalar(damping);
        node.previousPosition.copy(node.position);
        node.position.add(velocity);
        node.position.add(gravity);
        node.position.add(wind);
      }
    }

    // Constraint satisfaction (multiple iterations)
    for (let iteration = 0; iteration < 20; iteration++) {
      for (let i = 0; i < nodes.length - 1; i++) {
        const node1 = nodes[i];
        const node2 = nodes[i + 1];

        const diff = node2.position.clone().sub(node1.position);
        const currentLength = diff.length();
        const correction = diff.multiplyScalar((currentLength - segmentLength) / currentLength);

        if (!node1.pinned && !node2.pinned) {
          node1.position.add(correction.clone().multiplyScalar(0.5));
          node2.position.sub(correction.clone().multiplyScalar(0.5));
        } else if (!node1.pinned) {
          node1.position.add(correction);
        } else if (!node2.pinned) {
          node2.position.sub(correction);
        }
      }
    }

    // Update line geometry
    const positions = rope.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < nodes.length; i++) {
      positions.setXYZ(i, nodes[i].position.x, nodes[i].position.y, nodes[i].position.z);
    }
    positions.needsUpdate = true;

    // Update end mesh position
    if (rope.endMesh) {
      rope.endMesh.position.copy(nodes[nodes.length - 1].position);
    }
  }

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

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Simulate all ropes
      for (const rope of ropes) {
        simulateRope(rope, time);
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.15) * 30;
      camera.position.z = Math.cos(time * 0.15) * 30;
      camera.lookAt(0, 8, 0);

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
    { title: 'three.js webgl - physics ammo rope' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physics ammo rope', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPhysicsAmmoRope(a, win, { width: WIDTH, height: HEIGHT });
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
