/**
 * three.js webgl - Utah teapot
 *
 * Port of: three/examples/webgl_geometry_teapot.html
 *
 * Tests:
 * - Procedurally generated teapot-like geometry
 * - Multiple material types on same geometry
 * - Phong shading
 *
 * Adaptations for Tsyne:
 * - Creates a procedural teapot approximation using lathe and merged geometries
 * - Does not require external model files
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryTeapotParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryTeapotDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGeometryTeapot(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryTeapotParams = {}
): Promise<WebGLGeometryTeapotDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.set(0, 150, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 1, 2000);
  pointLight.position.set(-200, 200, 200);
  scene.add(pointLight);

  // Create procedural teapot approximation using lathe geometry for the body
  // Teapot body profile (simplified)
  const bodyPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = t * 80 - 40;
    // Bell-shaped profile
    let r: number;
    if (t < 0.1) {
      r = 20 + t * 200; // Bottom
    } else if (t < 0.5) {
      r = 40 + Math.sin((t - 0.1) * Math.PI / 0.4) * 25; // Lower body
    } else if (t < 0.9) {
      r = 65 - (t - 0.5) * 80; // Upper body narrowing
    } else {
      r = 33 - (t - 0.9) * 150; // Rim
    }
    bodyPoints.push(new THREE.Vector2(Math.max(r, 5), y));
  }

  const bodyGeometry = new THREE.LatheGeometry(bodyPoints, 32);

  // Create a torus for the spout (simplified)
  const spoutGeometry = new THREE.TorusGeometry(15, 5, 16, 32, Math.PI);

  // Create a torus for the handle
  const handleGeometry = new THREE.TorusGeometry(30, 6, 16, 32, Math.PI);

  // Create a sphere for the lid knob
  const knobGeometry = new THREE.SphereGeometry(10, 16, 16);

  // Create lid (flattened sphere)
  const lidGeometry = new THREE.SphereGeometry(35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

  // Materials
  const materials = [
    new THREE.MeshPhongMaterial({ color: 0xcc8800, shininess: 100 }),
    new THREE.MeshPhongMaterial({ color: 0x00cc88, shininess: 100 }),
    new THREE.MeshPhongMaterial({ color: 0x8800cc, shininess: 100 }),
    new THREE.MeshPhongMaterial({ color: 0xcc0088, shininess: 100 }),
  ];

  // Create teapot group
  const teapotGroup = new THREE.Group();

  // Body
  const body = new THREE.Mesh(bodyGeometry, materials[0]);
  teapotGroup.add(body);

  // Spout
  const spout = new THREE.Mesh(spoutGeometry, materials[0]);
  spout.position.set(65, 0, 0);
  spout.rotation.z = -Math.PI / 4;
  teapotGroup.add(spout);

  // Handle
  const handle = new THREE.Mesh(handleGeometry, materials[0]);
  handle.position.set(-60, 10, 0);
  handle.rotation.y = Math.PI / 2;
  teapotGroup.add(handle);

  // Lid
  const lid = new THREE.Mesh(lidGeometry, materials[0]);
  lid.position.set(0, 40, 0);
  lid.scale.y = 0.3;
  teapotGroup.add(lid);

  // Knob
  const knob = new THREE.Mesh(knobGeometry, materials[0]);
  knob.position.set(0, 52, 0);
  knob.scale.y = 0.6;
  teapotGroup.add(knob);

  scene.add(teapotGroup);

  // Create wireframe version
  const teapotWireframe = new THREE.Group();

  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
  });

  const body2 = new THREE.Mesh(bodyGeometry, wireframeMaterial);
  teapotWireframe.add(body2);

  const spout2 = new THREE.Mesh(spoutGeometry, wireframeMaterial);
  spout2.position.set(65, 0, 0);
  spout2.rotation.z = -Math.PI / 4;
  teapotWireframe.add(spout2);

  const handle2 = new THREE.Mesh(handleGeometry, wireframeMaterial);
  handle2.position.set(-60, 10, 0);
  handle2.rotation.y = Math.PI / 2;
  teapotWireframe.add(handle2);

  const lid2 = new THREE.Mesh(lidGeometry, wireframeMaterial);
  lid2.position.set(0, 40, 0);
  lid2.scale.y = 0.3;
  teapotWireframe.add(lid2);

  const knob2 = new THREE.Mesh(knobGeometry, wireframeMaterial);
  knob2.position.set(0, 52, 0);
  knob2.scale.y = 0.6;
  teapotWireframe.add(knob2);

  teapotWireframe.position.x = 200;
  scene.add(teapotWireframe);

  // Add a floor
  const floorGeometry = new THREE.PlaneGeometry(800, 800);
  const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -50;
  scene.add(floor);

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

      teapotGroup.rotation.y = time * 0.5;
      teapotWireframe.rotation.y = time * 0.5;

      // Change material color over time
      const hue = (time * 0.1) % 1;
      (materials[0] as THREE.MeshPhongMaterial).color.setHSL(hue, 0.7, 0.5);

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
    { title: 'three.js webgl - Utah teapot' },
    (a) => {
      a.window(
        { title: 'three.js webgl - Utah teapot', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGeometryTeapot(a, win, { width: WIDTH, height: HEIGHT });
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
