/**
 * three.js webgl - lights - physical
 *
 * Port of: three/examples/webgl_lights_physical.html
 *
 * Tests:
 * - PointLight with physically based lighting (power in lumens)
 * - HemisphereLight for ambient illumination
 * - MeshStandardMaterial with textures (diffuse, bump, roughness)
 * - Reinhard tone mapping
 * - Real-world scale scene (50cm objects)
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Uses loadTexture for texture loading from disk
 * - Disables shadows (FBOs not yet supported)
 * - Removes Stats, GUI, OrbitControls
 * - Uses while(running) animation loop with await gl.flush()
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLightsPhysicalParams {
  width?: number;
  height?: number;
  bulbPower?: number;
  hemiIrradiance?: number;
  exposure?: number;
}

export interface WebGLLightsPhysicalDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Luminous power / irradiance reference tables
// ═══════════════════════════════════════════════════════════════════════════

// ref for lumens: http://www.power-sure.com/lumens.htm
const bulbLuminousPowers: Record<string, number> = {
  '110000 lm (1000W)': 110000,
  '3500 lm (300W)': 3500,
  '1700 lm (100W)': 1700,
  '800 lm (60W)': 800,
  '400 lm (40W)': 400,
  '180 lm (25W)': 180,
  '20 lm (4W)': 20,
  'Off': 0,
};

// ref for solar irradiances: https://en.wikipedia.org/wiki/Lux
const hemiLuminousIrradiances: Record<string, number> = {
  '0.0001 lx (Moonless Night)': 0.0001,
  '0.002 lx (Night Airglow)': 0.002,
  '0.5 lx (Full Moon)': 0.5,
  '3.4 lx (City Twilight)': 3.4,
  '50 lx (Living Room)': 50,
  '100 lx (Very Overcast)': 100,
  '350 lx (Office Room)': 350,
  '400 lx (Sunrise/Sunset)': 400,
  '1000 lx (Overcast)': 1000,
  '18000 lx (Daylight)': 18000,
  '50000 lx (Direct Sun)': 50000,
};

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Lights Physical demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height, lighting overrides)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLLightsPhysical(
  a: App,
  win: ITsyneWindow,
  params: WebGLLightsPhysicalParams = {}
): Promise<WebGLLightsPhysicalDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  // Lighting parameters (defaults match original: 400 lm bulb, moonless night hemi)
  const bulbPower = params.bulbPower ?? 400;
  const hemiIrradiance = params.hemiIrradiance ?? 0.0001;
  const exposure = params.exposure ?? 0.68;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.x = -4;
  camera.position.z = 4;
  camera.position.y = 2;

  const scene = new THREE.Scene();

  // ─── Bulb light (PointLight) ───────────────────────────────────────────

  const bulbGeometry = new THREE.SphereGeometry(0.02, 16, 8);
  const bulbLight = new THREE.PointLight(0xffee88, 1, 100, 2);

  const bulbMat = new THREE.MeshStandardMaterial({
    emissive: 0xffffee,
    emissiveIntensity: 1,
    color: 0x000000,
  });
  bulbLight.add(new THREE.Mesh(bulbGeometry, bulbMat));
  bulbLight.position.set(0, 2, 0);
  bulbLight.castShadow = false; // Shadows disabled (FBOs not supported)
  scene.add(bulbLight);

  // ─── Hemisphere light ──────────────────────────────────────────────────

  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x0f0e0d, 0.02);
  scene.add(hemiLight);

  // ─── Floor material (hardwood textures) ────────────────────────────────

  const floorMat = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    color: 0xffffff,
    metalness: 0.2,
    bumpScale: 1,
  });

  const texturesDir = path.resolve(__dirname, '../../three/examples/textures');

  // Load floor textures
  console.log('[webgl_lights_physical] Loading floor textures...');
  const floorDiffuse = await loadTexture(THREE, path.join(texturesDir, 'hardwood2_diffuse.jpg'));
  floorDiffuse.wrapS = THREE.RepeatWrapping;
  floorDiffuse.wrapT = THREE.RepeatWrapping;
  floorDiffuse.repeat.set(10, 24);
  floorDiffuse.colorSpace = THREE.SRGBColorSpace;
  floorMat.map = floorDiffuse;

  const floorBump = await loadTexture(THREE, path.join(texturesDir, 'hardwood2_bump.jpg'));
  floorBump.wrapS = THREE.RepeatWrapping;
  floorBump.wrapT = THREE.RepeatWrapping;
  floorBump.repeat.set(10, 24);
  floorMat.bumpMap = floorBump;

  const floorRoughness = await loadTexture(THREE, path.join(texturesDir, 'hardwood2_roughness.jpg'));
  floorRoughness.wrapS = THREE.RepeatWrapping;
  floorRoughness.wrapT = THREE.RepeatWrapping;
  floorRoughness.repeat.set(10, 24);
  floorMat.roughnessMap = floorRoughness;

  floorMat.needsUpdate = true;

  // ─── Cube material (brick textures) ────────────────────────────────────

  const cubeMat = new THREE.MeshStandardMaterial({
    roughness: 0.7,
    color: 0xffffff,
    bumpScale: 1,
    metalness: 0.2,
  });

  console.log('[webgl_lights_physical] Loading brick textures...');
  const brickDiffuse = await loadTexture(THREE, path.join(texturesDir, 'brick_diffuse.jpg'));
  brickDiffuse.wrapS = THREE.RepeatWrapping;
  brickDiffuse.wrapT = THREE.RepeatWrapping;
  brickDiffuse.repeat.set(1, 1);
  brickDiffuse.colorSpace = THREE.SRGBColorSpace;
  cubeMat.map = brickDiffuse;

  const brickBump = await loadTexture(THREE, path.join(texturesDir, 'brick_bump.jpg'));
  brickBump.wrapS = THREE.RepeatWrapping;
  brickBump.wrapT = THREE.RepeatWrapping;
  brickBump.repeat.set(1, 1);
  cubeMat.bumpMap = brickBump;

  cubeMat.needsUpdate = true;

  // ─── Ball material (earth textures) ────────────────────────────────────

  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 1.0,
  });

  console.log('[webgl_lights_physical] Loading earth textures...');
  const earthDiffuse = await loadTexture(THREE, path.join(texturesDir, 'planets/earth_atmos_2048.jpg'));
  earthDiffuse.colorSpace = THREE.SRGBColorSpace;
  ballMat.map = earthDiffuse;

  const earthSpecular = await loadTexture(THREE, path.join(texturesDir, 'planets/earth_specular_2048.jpg'));
  earthSpecular.colorSpace = THREE.SRGBColorSpace;
  ballMat.metalnessMap = earthSpecular;

  ballMat.needsUpdate = true;

  // ─── Geometry ──────────────────────────────────────────────────────────

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMesh = new THREE.Mesh(floorGeometry, floorMat);
  floorMesh.receiveShadow = false; // Shadows disabled
  floorMesh.rotation.x = -Math.PI / 2.0;
  scene.add(floorMesh);

  // Ball (globe)
  const ballGeometry = new THREE.SphereGeometry(0.25, 32, 32);
  const ballMesh = new THREE.Mesh(ballGeometry, ballMat);
  ballMesh.position.set(1, 0.25, 1);
  ballMesh.rotation.y = Math.PI;
  ballMesh.castShadow = false; // Shadows disabled
  scene.add(ballMesh);

  // Boxes (brick cubes)
  const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

  const boxMesh = new THREE.Mesh(boxGeometry, cubeMat);
  boxMesh.position.set(-0.5, 0.25, -1);
  boxMesh.castShadow = false; // Shadows disabled
  scene.add(boxMesh);

  const boxMesh2 = new THREE.Mesh(boxGeometry, cubeMat);
  boxMesh2.position.set(0, 0.25, -5);
  boxMesh2.castShadow = false;
  scene.add(boxMesh2);

  const boxMesh3 = new THREE.Mesh(boxGeometry, cubeMat);
  boxMesh3.position.set(7, 0.25, 0);
  boxMesh3.castShadow = false;
  scene.add(boxMesh3);

  // ─── Renderer ──────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });
  renderer.shadowMap.enabled = false; // Shadows disabled (FBOs not supported)
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = Math.pow(exposure, 5.0);

  // Enable physically correct lights if available
  if (renderer.useLegacyLights !== undefined) {
    renderer.useLegacyLights = false;
  }
  if (renderer.physicallyCorrectLights !== undefined) {
    renderer.physicallyCorrectLights = true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  // Apply initial light power
  bulbLight.power = bulbPower;
  bulbMat.emissiveIntensity = bulbLight.intensity / Math.pow(0.02, 2.0);
  hemiLight.intensity = hemiIrradiance;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = Date.now() * 0.0005;

      // Animate bulb light position (bobbing up and down)
      bulbLight.position.y = Math.cos(time) * 0.75 + 1.25;

      // Update bulb emissive to match light intensity
      bulbMat.emissiveIntensity = bulbLight.intensity / Math.pow(0.02, 2.0);

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
    { title: 'three.js webgl - lights - physical' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lights - physical', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLightsPhysical(a, win, { width: WIDTH, height: HEIGHT });
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
