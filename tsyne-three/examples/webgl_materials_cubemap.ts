/**
 * three.js webgl - cubemap materials
 *
 * Port of: three/examples/webgl_materials_cubemap.html
 *
 * Tests:
 * - Procedural cubemap generation
 * - Environment mapping on reflective surfaces
 * - CubeTextureLoader alternative using procedural textures
 *
 * Adaptations for Tsyne:
 * - Uses procedurally generated cubemap textures
 * - No external image files required
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsCubemapParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsCubemapDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsCubemap(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsCubemapParams = {}
): Promise<WebGLMaterialsCubemapDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Create procedural cubemap
  // ─────────────────────────────────────────────────────────────────────────

  const cubeSize = 128;

  // Generate procedural cubemap faces
  function generateCubeFace(faceIndex: number): THREE.DataTexture {
    const data = new Uint8Array(cubeSize * cubeSize * 4);

    // Different color for each face
    const colors = [
      [255, 100, 100], // +X red
      [100, 255, 100], // -X green
      [100, 100, 255], // +Y blue
      [255, 255, 100], // -Y yellow
      [255, 100, 255], // +Z magenta
      [100, 255, 255], // -Z cyan
    ];

    const baseColor = colors[faceIndex];

    for (let y = 0; y < cubeSize; y++) {
      for (let x = 0; x < cubeSize; x++) {
        const i = (y * cubeSize + x) * 4;

        // Create a gradient pattern
        const fx = x / cubeSize;
        const fy = y / cubeSize;

        // Add some procedural pattern
        const pattern =
          Math.sin(fx * Math.PI * 4) * 0.2 +
          Math.cos(fy * Math.PI * 4) * 0.2 +
          0.6;

        data[i] = Math.floor(baseColor[0] * pattern);
        data[i + 1] = Math.floor(baseColor[1] * pattern);
        data[i + 2] = Math.floor(baseColor[2] * pattern);
        data[i + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, cubeSize, cubeSize);
    texture.needsUpdate = true;
    return texture;
  }

  // Create cubemap using individual textures for simulation
  // Since CubeTexture requires image loading, we'll use a simple environment
  const cubeTextures = [];
  for (let i = 0; i < 6; i++) {
    cubeTextures.push(generateCubeFace(i));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
  camera.position.z = 2000;

  const scene = new THREE.Scene();

  // Create a gradient background
  scene.background = new THREE.Color(0x000020);

  // Add lighting
  const light1 = new THREE.DirectionalLight(0xffffff, 2);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 1);
  light2.position.set(-1, -1, -1);
  scene.add(light2);

  scene.add(new THREE.AmbientLight(0x404040));

  // Create reflective sphere with environment map approximation
  // Using MeshPhongMaterial with high shininess to simulate reflection
  const sphereGeometry = new THREE.SphereGeometry(400, 64, 32);

  // Create a custom shader for environment mapping simulation
  const envMapMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalMatrix * normal;
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float time;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(-vPosition);
        vec3 reflectDir = reflect(-viewDir, normal);

        // Simulate cubemap lookup with procedural colors
        float r = 0.5 + 0.5 * reflectDir.x + 0.2 * sin(reflectDir.y * 10.0 + time);
        float g = 0.5 + 0.5 * reflectDir.y + 0.2 * sin(reflectDir.z * 10.0 + time);
        float b = 0.5 + 0.5 * reflectDir.z + 0.2 * sin(reflectDir.x * 10.0 + time);

        // Add fresnel effect
        float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
        vec3 color = mix(vec3(r, g, b), vec3(1.0), fresnel * 0.5);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const sphere = new THREE.Mesh(sphereGeometry, envMapMaterial);
  scene.add(sphere);

  // Add reflective torus
  const torusGeometry = new THREE.TorusGeometry(200, 60, 32, 64);
  const torus = new THREE.Mesh(torusGeometry, envMapMaterial.clone());
  torus.position.x = -600;
  scene.add(torus);

  // Add reflective box
  const boxGeometry = new THREE.BoxGeometry(400, 400, 400);
  const box = new THREE.Mesh(boxGeometry, envMapMaterial.clone());
  box.position.x = 600;
  scene.add(box);

  // Add environment background spheres
  const bgMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  const bgSphere = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), bgMaterial);
  scene.add(bgSphere);

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

      // Update shader uniforms
      (envMapMaterial.uniforms.time as any).value = time;
      ((torus.material as THREE.ShaderMaterial).uniforms.time as any).value = time;
      ((box.material as THREE.ShaderMaterial).uniforms.time as any).value = time;

      // Rotate objects
      sphere.rotation.y = time * 0.2;
      torus.rotation.x = time * 0.3;
      torus.rotation.y = time * 0.2;
      box.rotation.x = time * 0.1;
      box.rotation.y = time * 0.15;

      // Update background color
      const hue = (time * 0.05) % 1;
      bgMaterial.color.setHSL(hue, 0.5, 0.1);

      // Camera orbit
      camera.position.x = Math.sin(time * 0.1) * 1500;
      camera.position.z = Math.cos(time * 0.1) * 1500;
      camera.lookAt(scene.position);

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
    { title: 'three.js webgl - cubemap materials' },
    (a) => {
      a.window(
        { title: 'three.js webgl - cubemap materials', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsCubemap(a, win, { width: WIDTH, height: HEIGHT });
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
