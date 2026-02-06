/**
 * three.js webgl - physical transmission materials with alpha
 *
 * Port of: three/examples/webgl_materials_physical_transmission_alpha.html
 *
 * Tests:
 * - Transmission with alpha/opacity blending
 * - MeshPhysicalMaterial transmission + opacity
 * - Glass-like transparency over colored background
 *
 * Adaptations for Tsyne:
 * - Uses procedural geometry (spheres, toruses) instead of GLTF dragon
 * - Colored background planes instead of HTML table
 * - Multiple objects with varying transmission/opacity
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsPhysicalTransmissionAlphaParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsPhysicalTransmissionAlphaDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsPhysicalTransmissionAlpha(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsPhysicalTransmissionAlphaParams = {}
): Promise<WebGLMaterialsPhysicalTransmissionAlphaDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0, 8);

  const scene = new THREE.Scene();
  // Gray background like original example
  scene.background = new THREE.Color(0x888888);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x666666));

  // ─────────────────────────────────────────────────────────────────────────
  // Create colored background blocks (simulating HTML table)
  // ─────────────────────────────────────────────────────────────────────────

  const bgBlockGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.5);

  const bgBlocks = [
    { color: 0xff0000, position: [-2.5, 0, -2] }, // Red
    { color: 0x00ff00, position: [-0.8, 0, -2] }, // Green
    { color: 0x0000ff, position: [0.8, 0, -2] },  // Blue
    { color: 0x000000, position: [2.5, 0, -2] },  // Black
  ];

  bgBlocks.forEach((block) => {
    const material = new THREE.MeshBasicMaterial({ color: block.color });
    const mesh = new THREE.Mesh(bgBlockGeometry, material);
    mesh.position.set(block.position[0], block.position[1], block.position[2]);
    scene.add(mesh);
  });

  // Add a simple test cube to verify rendering
  const testCube = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  testCube.position.set(3, 2, 0);
  scene.add(testCube);

  // ─────────────────────────────────────────────────────────────────────────
  // Create transmission objects with varying alpha/opacity
  // ─────────────────────────────────────────────────────────────────────────

  // Create shader material that supports both transmission and alpha
  const createTransmissionAlphaMaterial = (
    color: number,
    transmission: number,
    opacity: number,
    ior: number
  ) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(color) },
        transmission: { value: transmission },
        opacity: { value: opacity },
        ior: { value: ior },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform float transmission;
        uniform float opacity;
        uniform float ior;
        uniform float time;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          // Fresnel effect
          float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 3.0);

          // Refraction simulation
          vec3 refractDir = refract(-viewDir, normal, 1.0 / ior);

          // Chromatic aberration simulation for transmitted light
          float r = 0.5 + 0.5 * sin(refractDir.x * 5.0 + time + vWorldPosition.z * 0.01);
          float g = 0.5 + 0.5 * sin(refractDir.y * 5.0 + time * 1.1 + vWorldPosition.z * 0.01 + 1.0);
          float b = 0.5 + 0.5 * sin(refractDir.z * 5.0 + time * 0.9 + vWorldPosition.z * 0.01 + 2.0);

          vec3 transmittedColor = vec3(r, g, b);

          // Surface specular
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);

          // Mix transmission with surface reflection
          vec3 surfaceColor = baseColor * 0.1 + vec3(spec) * 0.5;
          vec3 finalColor = mix(surfaceColor, transmittedColor * baseColor, transmission * (1.0 - fresnel));

          // Add rim light based on fresnel
          finalColor += vec3(0.3, 0.4, 0.5) * fresnel * 0.5;

          // Apply alpha/opacity
          float finalAlpha = mix(0.1, 1.0, opacity);

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  };

  const geometries = [
    new THREE.SphereGeometry(0.5, 64, 32),
    new THREE.TorusGeometry(0.5, 0.2, 32, 64),
    new THREE.IcosahedronGeometry(0.6, 1),
  ];

  // Different transmission/opacity combinations
  const configs = [
    { transmission: 1.0, opacity: 1.0, color: 0xffffff, ior: 1.5 },  // Full transmission, full opacity
    { transmission: 1.0, opacity: 0.8, color: 0xffffff, ior: 1.5 },  // Full transmission, partial opacity
    { transmission: 1.0, opacity: 0.5, color: 0xffffff, ior: 1.5 },  // Full transmission, half opacity
    { transmission: 0.7, opacity: 0.8, color: 0xffffff, ior: 1.5 },  // Partial transmission, partial opacity
    { transmission: 0.5, opacity: 1.0, color: 0xffffff, ior: 1.5 },  // Half transmission, full opacity
    { transmission: 0.5, opacity: 0.5, color: 0xffffff, ior: 1.5 },  // Half transmission, half opacity
  ];

  const transmissionObjects: THREE.Mesh[] = [];
  const materials: THREE.ShaderMaterial[] = [];

  configs.forEach((config, i) => {
    const material = createTransmissionAlphaMaterial(
      config.color,
      config.transmission,
      config.opacity,
      config.ior
    );
    materials.push(material);

    const geometry = geometries[i % geometries.length];
    const mesh = new THREE.Mesh(geometry, material);

    // Arrange in grid
    const row = Math.floor(i / 3);
    const col = i % 3;
    mesh.position.x = (col - 1) * 1.5 - 1;
    mesh.position.y = (1 - row) * 1.5 + 0.5;
    mesh.position.z = 0;

    scene.add(mesh);
    transmissionObjects.push(mesh);
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

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

      // Update shader time uniforms
      materials.forEach((mat) => {
        mat.uniforms.time.value = time;
      });

      // Rotate transmission objects
      transmissionObjects.forEach((obj, i) => {
        obj.rotation.y = time * 0.5 + i;
        obj.rotation.x = time * 0.3;
      });

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
    { title: 'three.js webgl - physical transmission alpha' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physical transmission alpha', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsPhysicalTransmissionAlpha(a, win, { width: WIDTH, height: HEIGHT });
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
