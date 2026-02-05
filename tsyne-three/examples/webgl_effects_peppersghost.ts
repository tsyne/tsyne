/**
 * three.js webgl - effects - pepper's ghost
 *
 * Port of: three/examples/webgl_effects_peppersghost.html
 *
 * Tests:
 * - Pepper's ghost illusion (4-way reflection)
 * - Multiple viewport rendering
 * - Holographic display simulation
 *
 * Adaptations for Tsyne:
 * - Custom multi-view rendering
 * - Procedural geometry scene
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLEffectsPeppersGhostParams {
  width?: number;
  height?: number;
}

export interface WebGLEffectsPeppersGhostDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLEffectsPeppersGhost(
  a: App,
  win: Window,
  params: WebGLEffectsPeppersGhostParams = {}
): Promise<WebGLEffectsPeppersGhostDemo> {
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

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 10;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Lights
  const light1 = new THREE.PointLight(0xff6666, 2, 50);
  light1.position.set(5, 5, 5);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x6666ff, 2, 50);
  light2.position.set(-5, 5, -5);
  scene.add(light2);

  const light3 = new THREE.PointLight(0x66ff66, 2, 50);
  light3.position.set(0, -5, 0);
  scene.add(light3);

  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create holographic-looking content
  // ─────────────────────────────────────────────────────────────────────────

  const group = new THREE.Group();
  scene.add(group);

  // Central icosahedron
  const icoGeometry = new THREE.IcosahedronGeometry(2, 1);
  const icoMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ffff,
    emissive: 0x004444,
    shininess: 100,
    wireframe: true,
  });
  const icosahedron = new THREE.Mesh(icoGeometry, icoMaterial);
  group.add(icosahedron);

  // Inner sphere
  const innerSphereGeometry = new THREE.SphereGeometry(1.2, 16, 12);
  const innerSphereMaterial = new THREE.MeshPhongMaterial({
    color: 0xff00ff,
    emissive: 0x440044,
    transparent: true,
    opacity: 0.7,
    shininess: 100,
  });
  const innerSphere = new THREE.Mesh(innerSphereGeometry, innerSphereMaterial);
  group.add(innerSphere);

  // Orbiting small spheres
  const orbitingSpheres: THREE.Mesh[] = [];
  const smallSphereGeometry = new THREE.SphereGeometry(0.3, 16, 12);

  for (let i = 0; i < 6; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(i / 6, 1, 0.5),
      emissive: new THREE.Color().setHSL(i / 6, 1, 0.2),
      shininess: 100,
    });
    const sphere = new THREE.Mesh(smallSphereGeometry, material);
    group.add(sphere);
    orbitingSpheres.push(sphere);
  }

  // Add ring around the center
  const ringGeometry = new THREE.TorusGeometry(3, 0.1, 8, 32);
  const ringMaterial = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    emissive: 0x444400,
    shininess: 100,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.autoClear = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Pepper's ghost effect - render 4 views
  // ─────────────────────────────────────────────────────────────────────────

  // Calculate viewport sizes for pyramid arrangement
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);

  // Create cameras for each view (top, bottom, left, right)
  const cameraTop = camera.clone();
  const cameraBottom = camera.clone();
  const cameraLeft = camera.clone();
  const cameraRight = camera.clone();

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

      // Animate the holographic content
      icosahedron.rotation.x = time * 0.5;
      icosahedron.rotation.y = time * 0.3;

      innerSphere.rotation.x = -time * 0.3;
      innerSphere.rotation.y = -time * 0.5;

      // Animate orbiting spheres
      for (let i = 0; i < orbitingSpheres.length; i++) {
        const angle = (i / 6) * Math.PI * 2 + time;
        const radius = 2.5;
        const sphere = orbitingSpheres[i];

        sphere.position.x = Math.cos(angle) * radius;
        sphere.position.y = Math.sin(angle * 1.5) * 0.5;
        sphere.position.z = Math.sin(angle) * radius;
      }

      // Animate ring
      ring.rotation.z = time * 0.2;

      // Animate lights
      light1.position.x = Math.sin(time) * 8;
      light1.position.z = Math.cos(time) * 8;

      light2.position.x = Math.cos(time * 0.7) * 8;
      light2.position.z = Math.sin(time * 0.7) * 8;

      // Update camera positions for each view
      // Top view - looking down
      cameraTop.position.set(0, 10, 0);
      cameraTop.lookAt(0, 0, 0);
      cameraTop.up.set(0, 0, -1);

      // Bottom view - looking up (flipped for reflection)
      cameraBottom.position.set(0, -10, 0);
      cameraBottom.lookAt(0, 0, 0);
      cameraBottom.up.set(0, 0, 1);

      // Left view - looking right
      cameraLeft.position.set(-10, 0, 0);
      cameraLeft.lookAt(0, 0, 0);
      cameraLeft.up.set(0, 1, 0);

      // Right view - looking left
      cameraRight.position.set(10, 0, 0);
      cameraRight.lookAt(0, 0, 0);
      cameraRight.up.set(0, 1, 0);

      renderer.clear();

      // Render top view (upper middle)
      renderer.setViewport(halfWidth / 2, halfHeight, halfWidth, halfHeight);
      renderer.setScissor(halfWidth / 2, halfHeight, halfWidth, halfHeight);
      renderer.setScissorTest(true);
      renderer.render(scene, cameraTop);

      // Render bottom view (lower middle)
      renderer.setViewport(halfWidth / 2, 0, halfWidth, halfHeight);
      renderer.setScissor(halfWidth / 2, 0, halfWidth, halfHeight);
      renderer.render(scene, cameraBottom);

      // Render left view (left middle)
      renderer.setViewport(0, halfHeight / 2, halfWidth, halfHeight);
      renderer.setScissor(0, halfHeight / 2, halfWidth, halfHeight);
      renderer.render(scene, cameraLeft);

      // Render right view (right middle)
      renderer.setViewport(halfWidth, halfHeight / 2, halfWidth, halfHeight);
      renderer.setScissor(halfWidth, halfHeight / 2, halfWidth, halfHeight);
      renderer.render(scene, cameraRight);

      renderer.setScissorTest(false);

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
    { title: "three.js webgl - effects - pepper's ghost" },
    (a) => {
      a.window(
        { title: "three.js webgl - effects - pepper's ghost", width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLEffectsPeppersGhost(a, win, { width: WIDTH, height: HEIGHT });
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
