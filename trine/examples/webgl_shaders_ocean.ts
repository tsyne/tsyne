/**
 * three.js webgl - shaders - ocean
 *
 * Port of: three/examples/webgl_shaders_ocean.html
 *
 * Tests:
 * - Water shader (reflective flat water with normals-based distortion)
 * - Sky shader (Preetham atmospheric scattering model)
 * - PMREMGenerator for environment map generation
 * - MeshStandardMaterial with environment reflection (roughness: 0)
 * - ShaderMaterial with multiple uniforms (textures, vectors, floats)
 * - Render-to-texture (Water's mirror reflection pass)
 * - Tone mapping (ACESFilmic)
 * - Dynamic uniform updates (water time, sky time, sun position)
 * - PlaneGeometry, BoxGeometry
 *
 * Adaptations for Tsyne:
 * - Removes EffectComposer / post-processing (UnrealBloomPass)
 * - Removes OrbitControls, Stats, GUI, resize handler
 * - Renders directly with renderer.render()
 * - Uses loadTexture helper for disk-based image loading (waternormals.jpg)
 * - Adds slow camera orbit for visual interest
 * - Uses initThreeJS for three.js initialization
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// ==========================================================================
// Types
// ==========================================================================

export interface WebGLShadersOceanParams {
  width?: number;
  height?: number;
}

export interface WebGLShadersOceanDemo {
  stop: () => void;
}

// ==========================================================================
// Demo Builder
// ==========================================================================

/**
 * Build the WebGL Shaders Ocean demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLShadersOcean(
  a: App,
  win: ITsyneWindow,
  params: WebGLShadersOceanParams = {}
): Promise<WebGLShadersOceanDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // --------------------------------------------------------------------------
  // Renderer setup
  // --------------------------------------------------------------------------

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.1;

  // --------------------------------------------------------------------------
  // Scene setup (matches canonical three.js example)
  // --------------------------------------------------------------------------

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(55, width / height, 1, 20000);
  camera.position.set(30, 30, 100);

  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // --------------------------------------------------------------------------
  // Sun vector
  // --------------------------------------------------------------------------

  const sun = new THREE.Vector3();

  // --------------------------------------------------------------------------
  // Water
  // --------------------------------------------------------------------------

  const waterNormalsPath = path.resolve(__dirname, '../../three/examples/textures/waternormals.jpg');
  console.log('[webgl_shaders_ocean] Loading water normals texture from:', waterNormalsPath);

  const waterNormalsTexture = await loadTexture(THREE, waterNormalsPath);
  waterNormalsTexture.wrapS = waterNormalsTexture.wrapT = THREE.RepeatWrapping;

  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  const water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormalsTexture,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined,
    }
  );

  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // --------------------------------------------------------------------------
  // Sky
  // --------------------------------------------------------------------------

  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;

  // Cloud uniforms (may not exist in all Sky versions, set safely)
  if (skyUniforms['cloudCoverage']) skyUniforms['cloudCoverage'].value = 0.4;
  if (skyUniforms['cloudDensity']) skyUniforms['cloudDensity'].value = 0.5;
  if (skyUniforms['cloudElevation']) skyUniforms['cloudElevation'].value = 0.5;

  // --------------------------------------------------------------------------
  // Sun position + environment map
  // --------------------------------------------------------------------------

  const parameters = {
    elevation: 2,
    azimuth: 180,
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const sceneEnv = new THREE.Scene();

  let renderTarget: any;

  function updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
    const theta = THREE.MathUtils.degToRad(parameters.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    if (renderTarget !== undefined) renderTarget.dispose();

    sceneEnv.add(sky);
    renderTarget = pmremGenerator.fromScene(sceneEnv);
    scene.add(sky);

    scene.environment = renderTarget.texture;
  }

  updateSun();

  // --------------------------------------------------------------------------
  // Floating box (reflective)
  // --------------------------------------------------------------------------

  const geometry = new THREE.BoxGeometry(30, 30, 30);
  const material = new THREE.MeshStandardMaterial({ roughness: 0 });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // --------------------------------------------------------------------------
  // Set up camera look-at (replaces OrbitControls)
  // --------------------------------------------------------------------------

  camera.lookAt(0, 10, 0);

  // --------------------------------------------------------------------------
  // Animation loop
  // --------------------------------------------------------------------------

  let running = true;
  const startTime = Date.now();

  const animate = async () => {
    while (running) {
      const elapsed = (Date.now() - startTime) * 0.001; // seconds

      // Animate the floating box (matches original)
      mesh.position.y = Math.sin(elapsed) * 20 + 5;
      mesh.rotation.x = elapsed * 0.5;
      mesh.rotation.z = elapsed * 0.51;

      // Animate water time
      water.material.uniforms['time'].value += 1.0 / 60.0;

      // Animate sky time (if supported)
      if (sky.material.uniforms['time']) {
        sky.material.uniforms['time'].value = elapsed;
      }

      // Slow camera orbit for visual interest (replaces OrbitControls)
      const orbitRadius = 120;
      const orbitSpeed = 0.15;
      camera.position.x = Math.sin(elapsed * orbitSpeed) * orbitRadius;
      camera.position.z = Math.cos(elapsed * orbitSpeed) * orbitRadius;
      camera.position.y = 30 + Math.sin(elapsed * 0.1) * 10;
      camera.lookAt(0, 10, 0);

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
  };
}

// ==========================================================================
// Main
// ==========================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - shaders - ocean' },
    (a) => {
      a.window(
        { title: 'three.js webgl - shaders - ocean', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLShadersOcean(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ==========================================================================
// Entry Point
// ==========================================================================

if (require.main === module) {
  main().catch(console.error);
}
