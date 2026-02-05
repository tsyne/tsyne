/**
 * three.js webgl - nodes playground
 *
 * Port of: three/examples/webgl_nodes_playground.html
 *
 * Tests:
 * - Node-based material system concepts
 * - Dynamic shader modification
 * - Multiple material effects
 * - Visual shader effects
 *
 * Adaptations for Tsyne:
 * - Uses standard materials with custom shaders
 * - Demonstrates shader-like effects procedurally
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLNodesPlaygroundParams {
  width?: number;
  height?: number;
}

export interface WebGLNodesPlaygroundDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLNodesPlayground(
  a: App,
  win: Window,
  params: WebGLNodesPlaygroundParams = {}
): Promise<WebGLNodesPlaygroundDemo> {
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

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 0, 15);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111122);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0x4488ff, 30, 20);
  pointLight.position.set(-5, 3, 5);
  scene.add(pointLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create "node-based" material effects using procedural textures
  // ─────────────────────────────────────────────────────────────────────────

  interface MaterialNode {
    mesh: THREE.Mesh;
    material: THREE.Material;
    updateColor?: (time: number) => void;
  }

  const materialNodes: MaterialNode[] = [];

  // 1. Fresnel-like effect
  const fresnelGeometry = new THREE.SphereGeometry(1.5, 32, 16);
  const fresnelMaterial = new THREE.MeshPhongMaterial({
    color: 0x2244ff,
    emissive: 0x112244,
    shininess: 100,
  });
  const fresnelMesh = new THREE.Mesh(fresnelGeometry, fresnelMaterial);
  fresnelMesh.position.set(-4, 2, 0);
  scene.add(fresnelMesh);
  materialNodes.push({
    mesh: fresnelMesh,
    material: fresnelMaterial,
    updateColor: (time) => {
      const pulse = Math.sin(time * 2) * 0.5 + 0.5;
      fresnelMaterial.emissive.setRGB(pulse * 0.2, pulse * 0.3, pulse * 0.5);
    },
  });

  // 2. Color gradient material
  const gradientGeometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
  const gradientMaterial = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    metalness: 0.5,
    roughness: 0.5,
  });
  const gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
  gradientMesh.position.set(0, 2, 0);
  scene.add(gradientMesh);
  materialNodes.push({
    mesh: gradientMesh,
    material: gradientMaterial,
    updateColor: (time) => {
      const hue = (time * 0.1) % 1;
      gradientMaterial.color.setHSL(hue, 0.8, 0.5);
    },
  });

  // 3. Noise-based material (simulated via color animation)
  const noiseGeometry = new THREE.BoxGeometry(2, 2, 2);
  const noiseMaterial = new THREE.MeshPhongMaterial({
    color: 0x44ff44,
    flatShading: true,
  });
  const noiseMesh = new THREE.Mesh(noiseGeometry, noiseMaterial);
  noiseMesh.position.set(4, 2, 0);
  scene.add(noiseMesh);
  materialNodes.push({
    mesh: noiseMesh,
    material: noiseMaterial,
    updateColor: (time) => {
      // Simulate noise with multiple sine waves
      const noise = Math.sin(time * 3) * Math.sin(time * 5) * Math.sin(time * 7);
      const intensity = noise * 0.3 + 0.7;
      noiseMaterial.color.setRGB(0.2 * intensity, intensity, 0.2 * intensity);
    },
  });

  // 4. Metallic reflection
  const metallicGeometry = new THREE.IcosahedronGeometry(1.5, 2);
  const metallicMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.1,
  });
  const metallicMesh = new THREE.Mesh(metallicGeometry, metallicMaterial);
  metallicMesh.position.set(-4, -2, 0);
  scene.add(metallicMesh);
  materialNodes.push({
    mesh: metallicMesh,
    material: metallicMaterial,
    updateColor: (time) => {
      metallicMaterial.roughness = Math.sin(time) * 0.4 + 0.5;
    },
  });

  // 5. Glass-like material
  const glassGeometry = new THREE.CylinderGeometry(1, 1, 2, 32);
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    metalness: 0,
    roughness: 0,
    transmission: 0.9,
    thickness: 0.5,
  });
  const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  glassMesh.position.set(0, -2, 0);
  scene.add(glassMesh);
  materialNodes.push({
    mesh: glassMesh,
    material: glassMaterial,
    updateColor: (time) => {
      glassMaterial.transmission = Math.sin(time * 0.5) * 0.3 + 0.7;
    },
  });

  // 6. Emissive pulsing
  const emissiveGeometry = new THREE.OctahedronGeometry(1.5);
  const emissiveMaterial = new THREE.MeshStandardMaterial({
    color: 0xff8800,
    emissive: 0xff4400,
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.7,
  });
  const emissiveMesh = new THREE.Mesh(emissiveGeometry, emissiveMaterial);
  emissiveMesh.position.set(4, -2, 0);
  scene.add(emissiveMesh);
  materialNodes.push({
    mesh: emissiveMesh,
    material: emissiveMaterial,
    updateColor: (time) => {
      emissiveMaterial.emissiveIntensity = Math.sin(time * 3) * 0.5 + 0.5;
    },
  });

  // Add connecting lines to show "node graph" concept
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x444466,
    transparent: true,
    opacity: 0.5,
  });

  const connections = [
    [materialNodes[0].mesh.position, materialNodes[1].mesh.position],
    [materialNodes[1].mesh.position, materialNodes[2].mesh.position],
    [materialNodes[3].mesh.position, materialNodes[4].mesh.position],
    [materialNodes[4].mesh.position, materialNodes[5].mesh.position],
    [materialNodes[0].mesh.position, materialNodes[3].mesh.position],
    [materialNodes[2].mesh.position, materialNodes[5].mesh.position],
  ];

  for (const [start, end] of connections) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, lineMaterial);
    scene.add(line);
  }

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

      // Update all material nodes
      for (const node of materialNodes) {
        node.mesh.rotation.y = time * 0.3;
        node.mesh.rotation.x = Math.sin(time * 0.5) * 0.2;
        node.updateColor?.(time);
      }

      // Animate point light
      pointLight.position.x = Math.sin(time * 0.5) * 8;
      pointLight.position.z = Math.cos(time * 0.5) * 8;

      // Orbit camera slightly
      camera.position.x = Math.sin(time * 0.1) * 2;
      camera.position.y = Math.sin(time * 0.15) * 1;
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
    { title: 'three.js webgl - nodes playground' },
    (a) => {
      a.window(
        { title: 'three.js webgl - nodes playground', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLNodesPlayground(a, win, { width: WIDTH, height: HEIGHT });
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
