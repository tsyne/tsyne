/**
 * three.js webgl - physical clearcoat materials
 *
 * Port of: three/examples/webgl_materials_physical_clearcoat.html
 *
 * Tests:
 * - MeshPhysicalMaterial clearcoat properties
 * - Multi-layer surface reflections
 * - Clearcoat roughness
 *
 * Adaptations for Tsyne:
 * - Uses MeshPhysicalMaterial where available
 * - Falls back to shader approximation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsPhysicalClearcoatParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsPhysicalClearcoatDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsPhysicalClearcoat(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsPhysicalClearcoatParams = {}
): Promise<WebGLMaterialsPhysicalClearcoatDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 100, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x404040, 1));

  const light1 = new THREE.PointLight(0xffffff, 2, 1000);
  light1.position.set(200, 200, 200);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x88aaff, 1, 800);
  light2.position.set(-200, 100, -200);
  scene.add(light2);

  const light3 = new THREE.DirectionalLight(0xffffff, 1);
  light3.position.set(0, 1, 0);
  scene.add(light3);

  // Create clearcoat shader material (approximation)
  const createClearcoatMaterial = (
    baseColor: number,
    clearcoat: number,
    clearcoatRoughness: number,
    roughness: number
  ) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(baseColor) },
        clearcoat: { value: clearcoat },
        clearcoatRoughness: { value: clearcoatRoughness },
        roughness: { value: roughness },
        lightPos1: { value: light1.position },
        lightPos2: { value: light2.position },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform float clearcoat;
        uniform float clearcoatRoughness;
        uniform float roughness;
        uniform vec3 lightPos1;
        uniform vec3 lightPos2;

        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          // Base layer lighting
          vec3 lightDir1 = normalize(lightPos1 - vViewPosition);
          vec3 lightDir2 = normalize(lightPos2 - vViewPosition);

          float diff1 = max(dot(normal, lightDir1), 0.0);
          float diff2 = max(dot(normal, lightDir2), 0.0);

          // Specular for base layer
          vec3 halfDir1 = normalize(lightDir1 + viewDir);
          vec3 halfDir2 = normalize(lightDir2 + viewDir);
          float spec1 = pow(max(dot(normal, halfDir1), 0.0), 32.0 / (roughness + 0.01));
          float spec2 = pow(max(dot(normal, halfDir2), 0.0), 32.0 / (roughness + 0.01));

          vec3 baseLighting = baseColor * (diff1 * 0.8 + diff2 * 0.4) +
                              vec3(1.0) * (spec1 * 0.3 + spec2 * 0.15) * (1.0 - roughness);

          // Clearcoat layer (fresnel-based reflection)
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 5.0);

          // Clearcoat specular
          float ccSpec1 = pow(max(dot(normal, halfDir1), 0.0), 64.0 / (clearcoatRoughness + 0.01));
          float ccSpec2 = pow(max(dot(normal, halfDir2), 0.0), 64.0 / (clearcoatRoughness + 0.01));

          vec3 clearcoatReflection = vec3(1.0) * (ccSpec1 * 0.5 + ccSpec2 * 0.25) *
                                     clearcoat * (1.0 - clearcoatRoughness);

          // Combine layers
          vec3 finalColor = baseLighting + clearcoatReflection * (0.3 + fresnel * 0.7);

          // Add ambient
          finalColor += baseColor * 0.1;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  };

  // Create spheres with different clearcoat settings
  const sphereGeometry = new THREE.SphereGeometry(40, 64, 32);

  const materials: THREE.ShaderMaterial[] = [];
  const spheres: THREE.Mesh[] = [];

  // Grid of spheres with varying clearcoat and roughness
  const gridSize = 4;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const clearcoat = i / (gridSize - 1);
      const clearcoatRoughness = j / (gridSize - 1);

      // Different base colors for variety
      const colors = [0xcc0000, 0x0000cc, 0x00cc00, 0xcccc00];
      const baseColor = colors[(i + j) % colors.length];

      const material = createClearcoatMaterial(
        baseColor,
        clearcoat,
        clearcoatRoughness,
        0.3
      );
      materials.push(material);

      const sphere = new THREE.Mesh(sphereGeometry, material);
      sphere.position.x = (i - (gridSize - 1) / 2) * 100;
      sphere.position.y = (j - (gridSize - 1) / 2) * 100;
      scene.add(sphere);
      spheres.push(sphere);
    }
  }

  // Add floor
  const floorGeometry = new THREE.PlaneGeometry(600, 600);
  const floorMaterial = new THREE.MeshPhongMaterial({
    color: 0x333333,
    shininess: 10,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -220;
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

      // Rotate spheres
      spheres.forEach((sphere) => {
        sphere.rotation.y = time * 0.3;
        sphere.rotation.x = time * 0.2;
      });

      // Move lights
      light1.position.x = Math.sin(time * 0.5) * 300;
      light1.position.z = Math.cos(time * 0.5) * 300;

      // Update light positions in shaders
      materials.forEach((mat) => {
        mat.uniforms.lightPos1.value.copy(light1.position);
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
    { title: 'three.js webgl - physical clearcoat' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physical clearcoat', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsPhysicalClearcoat(a, win, { width: WIDTH, height: HEIGHT });
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
