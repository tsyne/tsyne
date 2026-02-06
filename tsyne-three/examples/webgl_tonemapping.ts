/**
 * three.js webgl - tone mapping
 *
 * Port of: three/examples/webgl_tonemapping.html
 *
 * Tests:
 * - Tone mapping modes (Linear, Reinhard, Cineon, ACESFilmic, AgX, Neutral)
 * - Tone mapping exposure control
 * - MeshStandardMaterial with metalness and roughness
 * - MeshPhysicalMaterial
 * - DirectionalLight, AmbientLight, PointLight
 * - Multiple geometries (spheres, boxes, torus knots)
 *
 * Adaptations for Tsyne:
 * - Replaces GLTF model loading with procedural geometry
 * - Replaces HDR environment with solid background + multiple lights
 * - Removes OrbitControls (skip per porting rules)
 * - Removes GUI panel (skip per porting rules)
 * - No DOM/browser APIs
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLTonemappingParams {
  width?: number;
  height?: number;
  toneMapping?: string;
  exposure?: number;
}

export interface WebGLTonemappingDemo {
  stop: () => void;
  setToneMapping: (mapping: number) => void;
  setExposure: (value: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Tone Mapping demo
 *
 * Creates a scene with multiple objects using various materials to
 * demonstrate how different tone mapping modes affect rendering.
 * The original example loads a GLTF model and HDR environment; this port
 * replaces those with procedural geometry and multiple lights.
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters
 * @returns Demo controller with stop(), setToneMapping(), setExposure()
 */
export async function buildWebGLTonemapping(
  a: App,
  win: ITsyneWindow,
  params: WebGLTonemappingParams = {}
): Promise<WebGLTonemappingDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Tone mapping options (matching the original example)
  // ─────────────────────────────────────────────────────────────────────────

  const toneMappingOptions: Record<string, number> = {
    None: THREE.NoToneMapping,
    Linear: THREE.LinearToneMapping,
    Reinhard: THREE.ReinhardToneMapping,
    Cineon: THREE.CineonToneMapping,
    ACESFilmic: THREE.ACESFilmicToneMapping,
    AgX: THREE.AgXToneMapping,
    Neutral: THREE.NeutralToneMapping,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Camera (similar framing to original, but scaled for procedural scene)
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 2, 8);
  camera.lookAt(0, 0, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Lighting (simulate the HDR environment + directional sun from original)
  // ─────────────────────────────────────────────────────────────────────────

  // Directional light (simulates sun, matching original)
  const sunLight = new THREE.DirectionalLight(0xfff3ee, 3);
  sunLight.position.set(5, 5, 5);
  scene.add(sunLight);

  // Ambient light (simulates environment fill)
  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);

  // Warm point light (adds specular highlights for tone mapping to act on)
  const pointLight1 = new THREE.PointLight(0xff8844, 2, 20);
  pointLight1.position.set(-3, 3, 2);
  scene.add(pointLight1);

  // Cool point light
  const pointLight2 = new THREE.PointLight(0x4488ff, 1.5, 20);
  pointLight2.position.set(3, 1, -2);
  scene.add(pointLight2);

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry and materials (replace GLTF model with procedural objects)
  // Different materials to showcase tone mapping across material types
  // ─────────────────────────────────────────────────────────────────────────

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(20, 20);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.5;
  scene.add(ground);

  // Shiny metallic sphere (high metalness, low roughness -- strong specular)
  const sphere1Geometry = new THREE.SphereGeometry(0.8, 32, 32);
  const sphere1Material = new THREE.MeshStandardMaterial({
    color: 0xcc8833,
    metalness: 1.0,
    roughness: 0.1,
  });
  const sphere1 = new THREE.Mesh(sphere1Geometry, sphere1Material);
  sphere1.position.set(-3, 0, 0);
  scene.add(sphere1);

  // Matte sphere (low metalness, high roughness -- diffuse)
  const sphere2Geometry = new THREE.SphereGeometry(0.8, 32, 32);
  const sphere2Material = new THREE.MeshStandardMaterial({
    color: 0x3388cc,
    metalness: 0.0,
    roughness: 0.9,
  });
  const sphere2 = new THREE.Mesh(sphere2Geometry, sphere2Material);
  sphere2.position.set(-1, 0, 0);
  scene.add(sphere2);

  // Semi-rough metallic sphere
  const sphere3Geometry = new THREE.SphereGeometry(0.8, 32, 32);
  const sphere3Material = new THREE.MeshStandardMaterial({
    color: 0xcc3333,
    metalness: 0.8,
    roughness: 0.4,
  });
  const sphere3 = new THREE.Mesh(sphere3Geometry, sphere3Material);
  sphere3.position.set(1, 0, 0);
  scene.add(sphere3);

  // Bright emissive-ish white sphere (tests HDR clamping via tone mapping)
  const sphere4Geometry = new THREE.SphereGeometry(0.8, 32, 32);
  const sphere4Material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.5,
    roughness: 0.3,
  });
  const sphere4 = new THREE.Mesh(sphere4Geometry, sphere4Material);
  sphere4.position.set(3, 0, 0);
  scene.add(sphere4);

  // Torus knot (complex geometry, tests specular highlights from many angles)
  const torusKnotGeometry = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16);
  const torusKnotMaterial = new THREE.MeshStandardMaterial({
    color: 0x88cc44,
    metalness: 0.6,
    roughness: 0.25,
  });
  const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
  torusKnot.position.set(0, 1.5, -2);
  scene.add(torusKnot);

  // Box with high metalness (another geometry type)
  const boxGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: 0xaa44cc,
    metalness: 0.9,
    roughness: 0.15,
  });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(-2, 1.5, -2);
  box.rotation.y = Math.PI / 4;
  scene.add(box);

  // Another box with different properties
  const box2Geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const box2Material = new THREE.MeshStandardMaterial({
    color: 0xeecc55,
    metalness: 0.3,
    roughness: 0.6,
  });
  const box2 = new THREE.Mesh(box2Geometry, box2Material);
  box2.position.set(2, 1.5, -2);
  box2.rotation.y = -Math.PI / 6;
  scene.add(box2);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer setup with tone mapping
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // Default tone mapping (matching original: Neutral)
  const initialMapping = params.toneMapping ?? 'Neutral';
  renderer.toneMapping = toneMappingOptions[initialMapping] ?? THREE.NeutralToneMapping;
  renderer.toneMappingExposure = params.exposure ?? 1.0;

  console.log(`[webgl_tonemapping] Initial tone mapping: ${initialMapping} (${renderer.toneMapping})`);
  console.log(`[webgl_tonemapping] Initial exposure: ${renderer.toneMappingExposure}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;

  const animate = async () => {
    while (running) {
      // Slowly rotate objects to show specular highlights from different angles
      torusKnot.rotation.x += 0.005;
      torusKnot.rotation.y += 0.01;

      box.rotation.y += 0.003;
      box2.rotation.y -= 0.004;

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  };

  // Start animation
  animate();

  return {
    stop: () => {
      running = false;
    },
    setToneMapping: (mapping: number) => {
      renderer.toneMapping = mapping;
      console.log(`[webgl_tonemapping] Tone mapping set to: ${mapping}`);
    },
    setExposure: (value: number) => {
      renderer.toneMappingExposure = value;
      console.log(`[webgl_tonemapping] Exposure set to: ${value}`);
    },
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
    { title: 'three.js webgl - tone mapping' },
    (a) => {
      a.window(
        { title: 'three.js webgl - tone mapping', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLTonemapping(a, win, { width: WIDTH, height: HEIGHT });
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
