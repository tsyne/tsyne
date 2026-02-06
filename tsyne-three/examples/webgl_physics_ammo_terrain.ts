/**
 * three.js webgl - physics ammo terrain
 *
 * Port of: three/examples/webgl_physics_ammo_terrain.html
 *
 * Tests:
 * - Procedural terrain generation
 * - Objects rolling on terrain
 * - Height-based collision
 * - Terrain following physics
 *
 * Adaptations for Tsyne:
 * - Simple terrain collision (no Ammo.js)
 * - Procedural height map
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPhysicsAmmoTerrainParams {
  width?: number;
  height?: number;
}

export interface WebGLPhysicsAmmoTerrainDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPhysicsAmmoTerrain(
  a: App,
  win: ITsyneWindow,
  params: WebGLPhysicsAmmoTerrainParams = {}
): Promise<WebGLPhysicsAmmoTerrainDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 40, 60);
  camera.lookAt(0, 10, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 100, 300);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(50, 100, 50);
  scene.add(directionalLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Terrain generation
  // ─────────────────────────────────────────────────────────────────────────

  const terrainWidth = 100;
  const terrainDepth = 100;
  const terrainSegments = 50;

  // Generate height data
  const heightData: number[][] = [];
  const maxHeight = 15;

  for (let z = 0; z <= terrainSegments; z++) {
    heightData[z] = [];
    for (let x = 0; x <= terrainSegments; x++) {
      const nx = x / terrainSegments;
      const nz = z / terrainSegments;

      // Multi-octave noise-like terrain
      let h = 0;
      h += Math.sin(nx * Math.PI * 2) * Math.cos(nz * Math.PI * 2) * 5;
      h += Math.sin(nx * Math.PI * 4 + 1) * Math.cos(nz * Math.PI * 4) * 2.5;
      h += Math.sin(nx * Math.PI * 8 + 2) * Math.cos(nz * Math.PI * 8 + 1) * 1;

      // Add some hills
      const hillX = 0.3, hillZ = 0.5, hillSize = 0.2;
      const hillDist = Math.sqrt((nx - hillX) ** 2 + (nz - hillZ) ** 2);
      if (hillDist < hillSize) {
        h += Math.cos((hillDist / hillSize) * Math.PI / 2) * 8;
      }

      const hillX2 = 0.7, hillZ2 = 0.3;
      const hillDist2 = Math.sqrt((nx - hillX2) ** 2 + (nz - hillZ2) ** 2);
      if (hillDist2 < hillSize) {
        h += Math.cos((hillDist2 / hillSize) * Math.PI / 2) * 6;
      }

      heightData[z][x] = h;
    }
  }

  // Create terrain geometry
  const terrainGeometry = new THREE.PlaneGeometry(
    terrainWidth,
    terrainDepth,
    terrainSegments,
    terrainSegments
  );
  terrainGeometry.rotateX(-Math.PI / 2);

  // Apply height data
  const positions = terrainGeometry.getAttribute('position');
  for (let z = 0; z <= terrainSegments; z++) {
    for (let x = 0; x <= terrainSegments; x++) {
      const index = z * (terrainSegments + 1) + x;
      positions.setY(index, heightData[z][x]);
    }
  }
  terrainGeometry.computeVertexNormals();

  // Color terrain by height
  const colors = new Float32Array(positions.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const t = (y + 5) / 20;
    if (t < 0.3) {
      color.setHex(0x228b22); // Green (low)
    } else if (t < 0.6) {
      color.setHex(0x8b4513); // Brown (mid)
    } else {
      color.setHex(0xcccccc); // Gray (high)
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrainMaterial = new THREE.MeshPhongMaterial({
    vertexColors: true,
    flatShading: true,
  });

  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  scene.add(terrain);

  // Function to get terrain height at world position
  function getTerrainHeight(x: number, z: number): number {
    const halfWidth = terrainWidth / 2;
    const halfDepth = terrainDepth / 2;

    // Convert world to terrain coordinates
    const tx = ((x + halfWidth) / terrainWidth) * terrainSegments;
    const tz = ((z + halfDepth) / terrainDepth) * terrainSegments;

    // Clamp
    const ix = Math.max(0, Math.min(terrainSegments - 1, Math.floor(tx)));
    const iz = Math.max(0, Math.min(terrainSegments - 1, Math.floor(tz)));

    // Bilinear interpolation
    const fx = tx - ix;
    const fz = tz - iz;

    const h00 = heightData[iz]?.[ix] ?? 0;
    const h10 = heightData[iz]?.[ix + 1] ?? 0;
    const h01 = heightData[iz + 1]?.[ix] ?? 0;
    const h11 = heightData[iz + 1]?.[ix + 1] ?? 0;

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rolling objects
  // ─────────────────────────────────────────────────────────────────────────

  interface RollingBall {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    radius: number;
  }

  const balls: RollingBall[] = [];
  const ballGeometry = new THREE.SphereGeometry(1, 16, 8);

  for (let i = 0; i < 20; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
    });
    const mesh = new THREE.Mesh(ballGeometry, material);

    // Start position on terrain
    const x = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60;
    const y = getTerrainHeight(x, z) + 1;

    mesh.position.set(x, y, z);
    scene.add(mesh);

    balls.push({
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.1
      ),
      radius: 1,
    });
  }

  // Physics simulation
  const gravity = -0.01;
  const friction = 0.98;
  const bounceDecay = 0.3;

  function simulateBalls() {
    for (const ball of balls) {
      // Get terrain height at ball position
      const terrainY = getTerrainHeight(ball.mesh.position.x, ball.mesh.position.z);
      const minY = terrainY + ball.radius;

      // Apply gravity
      ball.velocity.y += gravity;

      // Update position
      ball.mesh.position.add(ball.velocity);

      // Terrain collision
      if (ball.mesh.position.y < minY) {
        ball.mesh.position.y = minY;

        // Calculate terrain normal (gradient)
        const dx = 0.5;
        const hL = getTerrainHeight(ball.mesh.position.x - dx, ball.mesh.position.z);
        const hR = getTerrainHeight(ball.mesh.position.x + dx, ball.mesh.position.z);
        const hB = getTerrainHeight(ball.mesh.position.x, ball.mesh.position.z - dx);
        const hF = getTerrainHeight(ball.mesh.position.x, ball.mesh.position.z + dx);

        const slopeX = (hR - hL) / (dx * 2);
        const slopeZ = (hF - hB) / (dx * 2);

        // Roll down slope
        ball.velocity.x += slopeX * 0.01;
        ball.velocity.z += slopeZ * 0.01;

        // Bounce
        if (ball.velocity.y < 0) {
          ball.velocity.y = -ball.velocity.y * bounceDecay;
        }

        // Friction
        ball.velocity.x *= friction;
        ball.velocity.z *= friction;
      }

      // Wrap around boundaries
      const boundary = 45;
      if (ball.mesh.position.x > boundary) ball.mesh.position.x = -boundary;
      if (ball.mesh.position.x < -boundary) ball.mesh.position.x = boundary;
      if (ball.mesh.position.z > boundary) ball.mesh.position.z = -boundary;
      if (ball.mesh.position.z < -boundary) ball.mesh.position.z = boundary;

      // Visual rotation
      ball.mesh.rotation.x += ball.velocity.z * 0.5;
      ball.mesh.rotation.z -= ball.velocity.x * 0.5;
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

      // Simulate ball physics
      simulateBalls();

      // Orbit camera
      camera.position.x = Math.sin(time * 0.1) * 70;
      camera.position.z = Math.cos(time * 0.1) * 70;
      camera.position.y = 40 + Math.sin(time * 0.05) * 10;
      camera.lookAt(0, 5, 0);

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
    { title: 'three.js webgl - physics ammo terrain' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physics ammo terrain', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPhysicsAmmoTerrain(a, win, { width: WIDTH, height: HEIGHT });
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
