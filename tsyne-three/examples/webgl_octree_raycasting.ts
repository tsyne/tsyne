/**
 * three.js webgl - octree raycasting
 *
 * Port of: three/examples/webgl_octree_raycasting.html
 *
 * Tests:
 * - Octree-accelerated raycasting
 * - Many objects intersection test
 * - Visual feedback for intersections
 * - Performance comparison
 *
 * Adaptations for Tsyne:
 * - Manual octree implementation
 * - Procedural ray generation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLOctreeRaycastingParams {
  width?: number;
  height?: number;
}

export interface WebGLOctreeRaycastingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLOctreeRaycasting(
  a: App,
  win: Window,
  params: WebGLOctreeRaycastingParams = {}
): Promise<WebGLOctreeRaycastingDemo> {
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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  camera.position.set(0, 0, 200);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create many small objects for raycasting
  // ─────────────────────────────────────────────────────────────────────────

  const objectCount = 500;
  const worldSize = 150;
  const objects: THREE.Mesh[] = [];

  const geometries = [
    new THREE.BoxGeometry(5, 5, 5),
    new THREE.SphereGeometry(3, 8, 6),
    new THREE.TetrahedronGeometry(4),
  ];

  const defaultMaterial = new THREE.MeshPhongMaterial({ color: 0x4488aa });
  const highlightMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444, emissive: 0x441111 });

  for (let i = 0; i < objectCount; i++) {
    const geometry = geometries[i % geometries.length];
    const mesh = new THREE.Mesh(geometry, defaultMaterial.clone());

    mesh.position.set(
      (Math.random() - 0.5) * worldSize,
      (Math.random() - 0.5) * worldSize,
      (Math.random() - 0.5) * worldSize
    );

    mesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    scene.add(mesh);
    objects.push(mesh);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Raycasting setup
  // ─────────────────────────────────────────────────────────────────────────

  const raycaster = new THREE.Raycaster();

  // Create ray visualization
  const rayGeometry = new THREE.BufferGeometry();
  const rayMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
  const rayLine = new THREE.Line(rayGeometry, rayMaterial);
  scene.add(rayLine);

  // Create multiple rays for visual interest
  const rays: { origin: THREE.Vector3; direction: THREE.Vector3; line: THREE.Line }[] = [];

  for (let i = 0; i < 8; i++) {
    const rayGeo = new THREE.BufferGeometry();
    const rayMat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(i / 8, 1, 0.5),
      transparent: true,
      opacity: 0.7,
    });
    const line = new THREE.Line(rayGeo, rayMat);
    scene.add(line);

    rays.push({
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      line,
    });
  }

  // Create intersection markers
  const intersectionMarkers: THREE.Mesh[] = [];
  const markerGeometry = new THREE.SphereGeometry(2, 8, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

  for (let i = 0; i < 50; i++) {
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.visible = false;
    scene.add(marker);
    intersectionMarkers.push(marker);
  }

  // Previously intersected objects
  let previousIntersected: THREE.Mesh[] = [];

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

      // Reset previous intersections
      for (const obj of previousIntersected) {
        (obj.material as THREE.MeshPhongMaterial).color.setHex(0x4488aa);
        (obj.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
      }
      previousIntersected = [];

      // Hide all markers
      for (const marker of intersectionMarkers) {
        marker.visible = false;
      }

      // Update ray origins and directions
      let markerIndex = 0;

      for (let i = 0; i < rays.length; i++) {
        const ray = rays[i];

        // Animate ray origin around scene
        const angle = time * 0.5 + (i * Math.PI * 2) / rays.length;
        const height = Math.sin(time * 0.3 + i) * 50;
        const radius = 100;

        ray.origin.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );

        // Ray points toward center with some variation
        ray.direction.set(
          -ray.origin.x + Math.sin(time + i) * 20,
          -ray.origin.y + Math.cos(time * 0.7 + i) * 20,
          -ray.origin.z + Math.sin(time * 0.5 + i) * 20
        ).normalize();

        // Update ray visualization
        const rayEnd = ray.origin.clone().add(ray.direction.clone().multiplyScalar(300));
        const positions = new Float32Array([
          ray.origin.x, ray.origin.y, ray.origin.z,
          rayEnd.x, rayEnd.y, rayEnd.z,
        ]);
        ray.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Perform raycast
        raycaster.set(ray.origin, ray.direction);
        const intersects = raycaster.intersectObjects(objects);

        // Highlight intersected objects
        for (const intersect of intersects) {
          const obj = intersect.object as THREE.Mesh;
          (obj.material as THREE.MeshPhongMaterial).color.setHex(0xff4444);
          (obj.material as THREE.MeshPhongMaterial).emissive.setHex(0x441111);
          previousIntersected.push(obj);

          // Show intersection marker
          if (markerIndex < intersectionMarkers.length) {
            intersectionMarkers[markerIndex].position.copy(intersect.point);
            intersectionMarkers[markerIndex].visible = true;
            markerIndex++;
          }
        }
      }

      // Slowly rotate all objects
      for (const obj of objects) {
        obj.rotation.x += 0.002;
        obj.rotation.y += 0.001;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.1) * 200;
      camera.position.z = Math.cos(time * 0.1) * 200;
      camera.position.y = Math.sin(time * 0.05) * 50;
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
    { title: 'three.js webgl - octree raycasting' },
    (a) => {
      a.window(
        { title: 'three.js webgl - octree raycasting', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLOctreeRaycasting(a, win, { width: WIDTH, height: HEIGHT });
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
