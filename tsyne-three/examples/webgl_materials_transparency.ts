/**
 * three.js webgl - transparency
 *
 * Port of: three/examples/webgl_materials_transparency.html
 *
 * Tests:
 * - Transparent materials
 * - Alpha blending
 * - Depth sorting for transparency
 *
 * Adaptations for Tsyne:
 * - Uses various transparent material settings
 * - Multiple overlapping transparent objects
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsTransparencyParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsTransparencyDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsTransparency(
  a: App,
  win: Window,
  params: WebGLMaterialsTransparencyParams = {}
): Promise<WebGLMaterialsTransparencyDemo> {
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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 150, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 1, 800);
  pointLight.position.set(-200, 200, 200);
  scene.add(pointLight);

  // Create opaque background objects
  const bgGeometry = new THREE.SphereGeometry(30, 32, 16);

  for (let i = 0; i < 20; i++) {
    const bgMesh = new THREE.Mesh(
      bgGeometry,
      new THREE.MeshPhongMaterial({
        color: Math.random() * 0xffffff,
      })
    );
    bgMesh.position.x = (Math.random() - 0.5) * 400;
    bgMesh.position.y = (Math.random() - 0.5) * 300;
    bgMesh.position.z = (Math.random() - 0.5) * 400 - 200;
    scene.add(bgMesh);
  }

  // Create transparent spheres
  const sphereGeometry = new THREE.SphereGeometry(50, 64, 32);

  const transparentMeshes: THREE.Mesh[] = [];

  // Red transparent sphere
  const redSphere = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshPhongMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  redSphere.position.set(-80, 0, 80);
  scene.add(redSphere);
  transparentMeshes.push(redSphere);

  // Green transparent sphere
  const greenSphere = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  greenSphere.position.set(0, 0, 0);
  scene.add(greenSphere);
  transparentMeshes.push(greenSphere);

  // Blue transparent sphere
  const blueSphere = new THREE.Mesh(
    sphereGeometry,
    new THREE.MeshPhongMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  blueSphere.position.set(80, 0, -80);
  scene.add(blueSphere);
  transparentMeshes.push(blueSphere);

  // Yellow transparent torus
  const torusGeometry = new THREE.TorusGeometry(80, 25, 32, 64);
  const yellowTorus = new THREE.Mesh(
    torusGeometry,
    new THREE.MeshPhongMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
  );
  yellowTorus.rotation.x = Math.PI / 2;
  scene.add(yellowTorus);
  transparentMeshes.push(yellowTorus);

  // Cyan transparent box
  const boxGeometry = new THREE.BoxGeometry(100, 100, 100);
  const cyanBox = new THREE.Mesh(
    boxGeometry,
    new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    })
  );
  cyanBox.position.set(0, 100, 0);
  scene.add(cyanBox);
  transparentMeshes.push(cyanBox);

  // Magenta transparent icosahedron
  const icoGeometry = new THREE.IcosahedronGeometry(40, 0);
  const magentaIco = new THREE.Mesh(
    icoGeometry,
    new THREE.MeshPhongMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    })
  );
  magentaIco.position.set(0, -80, 0);
  scene.add(magentaIco);
  transparentMeshes.push(magentaIco);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.sortObjects = true;

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

      // Animate transparent objects
      redSphere.position.x = -80 + Math.sin(time) * 30;
      greenSphere.position.y = Math.sin(time * 1.5) * 30;
      blueSphere.position.z = -80 + Math.cos(time) * 30;

      yellowTorus.rotation.z = time * 0.3;
      cyanBox.rotation.x = time * 0.2;
      cyanBox.rotation.y = time * 0.3;

      magentaIco.rotation.x = time * 0.5;
      magentaIco.rotation.y = time * 0.4;

      // Animate opacity
      transparentMeshes.forEach((mesh, i) => {
        const mat = mesh.material as THREE.MeshPhongMaterial;
        mat.opacity = 0.3 + 0.3 * Math.sin(time + i);
      });

      // Camera orbit
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
    { title: 'three.js webgl - transparency' },
    (a) => {
      a.window(
        { title: 'three.js webgl - transparency', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsTransparency(a, win, { width: WIDTH, height: HEIGHT });
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
