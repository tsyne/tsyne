/**
 * three.js webgl - lightprobe
 *
 * Port of: three/examples/webgl_lightprobe.html
 *
 * Tests:
 * - LightProbe for environment lighting
 * - Spherical harmonics lighting
 * - Procedural environment simulation
 * - Ambient lighting from environment
 *
 * Adaptations for Tsyne:
 * - Procedural environment colors
 * - Manual light probe coefficients
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLightprobeParams {
  width?: number;
  height?: number;
}

export interface WebGLLightprobeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLightprobe(
  a: App,
  win: Window,
  params: WebGLLightprobeParams = {}
): Promise<WebGLLightprobeDemo> {
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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
  camera.position.set(0, 0, 100);

  const scene = new THREE.Scene();

  // ─────────────────────────────────────────────────────────────────────────
  // Create procedural gradient background
  // ─────────────────────────────────────────────────────────────────────────

  // Create a simple gradient sky sphere
  const skyGeometry = new THREE.SphereGeometry(400, 32, 16);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      horizonColor: { value: new THREE.Color(0xffaa00) },
      offset: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform vec3 horizonColor;
      uniform float offset;
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition + offset).y;
        vec3 color;
        if (h > 0.0) {
          color = mix(horizonColor, topColor, pow(h, 0.5));
        } else {
          color = mix(horizonColor, bottomColor, pow(-h, 0.5));
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
  });

  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  // ─────────────────────────────────────────────────────────────────────────
  // Create light probe with procedural coefficients
  // ─────────────────────────────────────────────────────────────────────────

  const lightProbe = new THREE.LightProbe();
  scene.add(lightProbe);

  // Set up spherical harmonics coefficients for a warm sky environment
  // These coefficients represent ambient lighting from different directions
  const sh = lightProbe.sh.coefficients;

  // L00 - ambient term (average light)
  sh[0].set(0.5, 0.5, 0.6); // Slightly blue ambient

  // L1-1, L10, L11 - directional terms
  sh[1].set(0.3, 0.3, 0.1); // Warm from below (ground bounce)
  sh[2].set(0.2, 0.3, 0.5); // Blue from above (sky)
  sh[3].set(0.1, 0.1, 0.0); // Side lighting

  // L2 terms - more detail
  sh[4].set(0.05, 0.05, 0.1);
  sh[5].set(0.05, 0.0, 0.0);
  sh[6].set(0.1, 0.1, 0.15);
  sh[7].set(0.0, 0.05, 0.05);
  sh[8].set(0.05, 0.05, 0.0);

  // Add a directional light for key lighting
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(10, 10, 10);
  scene.add(dirLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create test objects
  // ─────────────────────────────────────────────────────────────────────────

  // Central sphere with standard material
  const sphereGeometry = new THREE.SphereGeometry(20, 64, 32);
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.3,
  });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // Metallic sphere
  const metallicMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 1.0,
    roughness: 0.1,
  });
  const metallicSphere = new THREE.Mesh(sphereGeometry.clone(), metallicMaterial);
  metallicSphere.position.set(-50, 0, 0);
  metallicSphere.scale.setScalar(0.7);
  scene.add(metallicSphere);

  // Rough sphere
  const roughMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    metalness: 0.0,
    roughness: 1.0,
  });
  const roughSphere = new THREE.Mesh(sphereGeometry.clone(), roughMaterial);
  roughSphere.position.set(50, 0, 0);
  roughSphere.scale.setScalar(0.7);
  scene.add(roughSphere);

  // Torus knot
  const torusKnotGeometry = new THREE.TorusKnotGeometry(8, 3, 100, 16);
  const torusKnotMaterial = new THREE.MeshStandardMaterial({
    color: 0x4ecdc4,
    metalness: 0.5,
    roughness: 0.3,
  });
  const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
  torusKnot.position.set(0, -35, 0);
  scene.add(torusKnot);

  // Floor plane
  const floorGeometry = new THREE.PlaneGeometry(200, 200);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.0,
    roughness: 0.8,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -50;
  scene.add(floor);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

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

      // Animate objects
      sphere.rotation.y = time * 0.2;
      metallicSphere.rotation.y = time * 0.3;
      roughSphere.rotation.y = time * 0.25;
      torusKnot.rotation.x = time * 0.3;
      torusKnot.rotation.y = time * 0.2;

      // Animate light probe (shift colors over time)
      const hueShift = Math.sin(time * 0.2) * 0.1;
      sh[0].set(0.5 + hueShift, 0.5, 0.6 - hueShift);
      sh[2].set(0.2 + hueShift * 0.5, 0.3, 0.5 - hueShift * 0.5);

      // Update sky colors to match
      skyMaterial.uniforms.topColor.value.setHSL(0.6 + hueShift, 0.7, 0.5);
      skyMaterial.uniforms.horizonColor.value.setHSL(0.1 + hueShift, 0.8, 0.6);

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 80;
      camera.position.z = Math.cos(time * 0.2) * 80;
      camera.position.y = 20 + Math.sin(time * 0.1) * 20;
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
    { title: 'three.js webgl - lightprobe' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lightprobe', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLightprobe(a, win, { width: WIDTH, height: HEIGHT });
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
