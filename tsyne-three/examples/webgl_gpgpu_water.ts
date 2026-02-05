/**
 * three.js webgl - gpgpu - water
 *
 * Port of: three/examples/webgl_gpgpu_water.html
 *
 * Tests:
 * - Water surface simulation
 * - Wave propagation physics
 * - Height field rendering
 * - Dynamic vertex displacement
 *
 * Adaptations for Tsyne:
 * - CPU-based wave simulation
 * - Procedural water mesh
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGPGPUWaterParams {
  width?: number;
  height?: number;
  resolution?: number;
}

export interface WebGLGPGPUWaterDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLGPGPUWater(
  a: App,
  win: Window,
  params: WebGLGPGPUWaterParams = {}
): Promise<WebGLGPGPUWaterDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const resolution = params.resolution ?? 64; // Grid resolution

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

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 100, 150);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Lights
  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(50, 100, 50);
  scene.add(dirLight);

  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create water simulation
  // ─────────────────────────────────────────────────────────────────────────

  // Height fields for simulation (ping-pong buffers)
  const heightCurrent = new Float32Array(resolution * resolution);
  const heightPrevious = new Float32Array(resolution * resolution);

  // Initialize flat
  for (let i = 0; i < resolution * resolution; i++) {
    heightCurrent[i] = 0;
    heightPrevious[i] = 0;
  }

  // Create water geometry
  const waterSize = 200;
  const geometry = new THREE.PlaneGeometry(waterSize, waterSize, resolution - 1, resolution - 1);
  geometry.rotateX(-Math.PI / 2);

  // Water material with custom shader
  const material = new THREE.ShaderMaterial({
    uniforms: {
      lightPosition: { value: new THREE.Vector3(50, 100, 50) },
      waterColor: { value: new THREE.Color(0x0066cc) },
      deepColor: { value: new THREE.Color(0x001133) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vHeight;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vHeight = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 lightPosition;
      uniform vec3 waterColor;
      uniform vec3 deepColor;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying float vHeight;

      void main() {
        vec3 lightDir = normalize(lightPosition - vPosition);
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 halfDir = normalize(lightDir + viewDir);

        // Diffuse
        float diff = max(dot(vNormal, lightDir), 0.0);

        // Specular
        float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);

        // Fresnel
        float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

        // Color based on height
        float heightFactor = clamp((vHeight + 5.0) / 10.0, 0.0, 1.0);
        vec3 baseColor = mix(deepColor, waterColor, heightFactor);

        // Final color
        vec3 finalColor = baseColor * (0.3 + diff * 0.7);
        finalColor += vec3(1.0) * spec * 0.5;
        finalColor += vec3(0.5, 0.7, 1.0) * fresnel * 0.3;

        gl_FragColor = vec4(finalColor, 0.9);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const waterMesh = new THREE.Mesh(geometry, material);
  scene.add(waterMesh);

  // Add wireframe overlay
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x004488,
    wireframe: true,
    transparent: true,
    opacity: 0.2,
  });
  const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
  scene.add(wireframe);

  // Simulation parameters
  const waveSpeed = 10;
  const damping = 0.98;

  function getIndex(x: number, z: number): number {
    const xx = Math.max(0, Math.min(resolution - 1, x));
    const zz = Math.max(0, Math.min(resolution - 1, z));
    return zz * resolution + xx;
  }

  function updateWaterSimulation(deltaTime: number) {
    const dt = Math.min(deltaTime, 0.033);
    const c = waveSpeed * dt;
    const c2 = c * c;

    // Wave equation: h_new = 2*h_current - h_previous + c^2 * laplacian(h_current)
    const newHeight = new Float32Array(resolution * resolution);

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const i = getIndex(x, z);

        // Laplacian (neighbors - 4 * center)
        const hCenter = heightCurrent[i];
        const hLeft = heightCurrent[getIndex(x - 1, z)];
        const hRight = heightCurrent[getIndex(x + 1, z)];
        const hUp = heightCurrent[getIndex(x, z - 1)];
        const hDown = heightCurrent[getIndex(x, z + 1)];

        const laplacian = hLeft + hRight + hUp + hDown - 4 * hCenter;

        // Wave equation
        newHeight[i] = (2 * hCenter - heightPrevious[i] + c2 * laplacian) * damping;
      }
    }

    // Swap buffers
    heightPrevious.set(heightCurrent);
    heightCurrent.set(newHeight);

    // Update geometry
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < resolution * resolution; i++) {
      posArray[i * 3 + 1] = heightCurrent[i];
    }

    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    // Update wireframe geometry
    const wireframePosAttr = wireframe.geometry.getAttribute('position') as THREE.BufferAttribute;
    (wireframePosAttr.array as Float32Array).set(posArray);
    wireframePosAttr.needsUpdate = true;
  }

  function addDrop(x: number, z: number, amplitude: number, radius: number) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radius) {
          const gx = x + dx;
          const gz = z + dz;
          if (gx >= 0 && gx < resolution && gz >= 0 && gz < resolution) {
            const falloff = (1 - dist / radius);
            heightCurrent[getIndex(gx, gz)] += amplitude * falloff * falloff;
          }
        }
      }
    }
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
  let lastTime = 0;
  let lastDropTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const deltaTime = (currentTime - lastTime) * 0.001;
      lastTime = currentTime;
      const time = currentTime * 0.001;

      // Add periodic rain drops
      if (currentTime - lastDropTime > 500) {
        const dropX = Math.floor(Math.random() * (resolution - 10)) + 5;
        const dropZ = Math.floor(Math.random() * (resolution - 10)) + 5;
        addDrop(dropX, dropZ, 8, 4);
        lastDropTime = currentTime;
      }

      // Update water simulation
      updateWaterSimulation(deltaTime);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 150;
      camera.position.z = Math.cos(time * 0.2) * 150;
      camera.position.y = 80 + Math.sin(time * 0.1) * 20;
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
    { title: 'three.js webgl - gpgpu - water' },
    (a) => {
      a.window(
        { title: 'three.js webgl - gpgpu - water', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLGPGPUWater(a, win, { width: WIDTH, height: HEIGHT });
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
