/**
 * three.js webgl - refraction
 *
 * Port of: three/examples/webgl_refraction.html
 *
 * Tests:
 * - Refractor object (render-to-texture refraction)
 * - WaterRefractionShader with dudv distortion map
 * - MeshPhongMaterial with colored walls
 * - PointLight lighting
 * - Animated sphere orbit
 *
 * Adaptations for Tsyne:
 * - Uses initThreeJS for bridge initialization
 * - Uses loadTexture for dudv map loading
 * - Imports Refractor and WaterRefractionShader from three.js addons
 * - No OrbitControls (non-interactive)
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';
import { Refractor } from '../../three/examples/jsm/objects/Refractor.js';
import { WaterRefractionShader } from '../../three/examples/jsm/shaders/WaterRefractionShader.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLRefractionParams {
  width?: number;
  height?: number;
}

export interface WebGLRefractionDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLRefraction(
  a: App,
  win: ITsyneWindow,
  params: WebGLRefractionParams = {}
): Promise<WebGLRefractionDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 500);
  camera.position.set(0, 75, 160);
  camera.lookAt(0, 40, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // Refractor
  // ─────────────────────────────────────────────────────────────────────────

  const refractorGeometry = new THREE.PlaneGeometry(90, 90);

  const refractor = new Refractor(refractorGeometry, {
    color: 0xcbcbcb,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: WaterRefractionShader,
  });

  refractor.position.set(0, 50, 0);
  scene.add(refractor);

  // Load dudv map for distortion effect
  const dudvPath = path.resolve(__dirname, '../../three/examples/textures/waterdudv.jpg');
  console.log('[webgl_refraction] Loading dudv texture from:', dudvPath);

  const dudvMap = await loadTexture(THREE, dudvPath);
  dudvMap.wrapS = THREE.RepeatWrapping;
  dudvMap.wrapT = THREE.RepeatWrapping;
  refractor.material.uniforms.tDudv.value = dudvMap;

  // ─────────────────────────────────────────────────────────────────────────
  // Small sphere (animated)
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.IcosahedronGeometry(5, 0);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x333333,
    flatShading: true,
  });
  const smallSphere = new THREE.Mesh(geometry, material);
  scene.add(smallSphere);

  // ─────────────────────────────────────────────────────────────────────────
  // Walls
  // ─────────────────────────────────────────────────────────────────────────

  const planeGeo = new THREE.PlaneGeometry(100.1, 100.1);

  const planeTop = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xffffff })
  );
  planeTop.position.y = 100;
  planeTop.rotateX(Math.PI / 2);
  scene.add(planeTop);

  const planeBottom = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xffffff })
  );
  planeBottom.rotateX(-Math.PI / 2);
  scene.add(planeBottom);

  const planeBack = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0x7f7fff })
  );
  planeBack.position.z = -50;
  planeBack.position.y = 50;
  scene.add(planeBack);

  const planeRight = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0x00ff00 })
  );
  planeRight.position.x = 50;
  planeRight.position.y = 50;
  planeRight.rotateY(-Math.PI / 2);
  scene.add(planeRight);

  const planeLeft = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xff0000 })
  );
  planeLeft.position.x = -50;
  planeLeft.position.y = 50;
  planeLeft.rotateY(Math.PI / 2);
  scene.add(planeLeft);

  // ─────────────────────────────────────────────────────────────────────────
  // Lights
  // ─────────────────────────────────────────────────────────────────────────

  const mainLight = new THREE.PointLight(0xe7e7e7, 2.5, 250, 0);
  mainLight.position.y = 60;
  scene.add(mainLight);

  const greenLight = new THREE.PointLight(0x00ff00, 0.5, 1000, 0);
  greenLight.position.set(550, 50, 0);
  scene.add(greenLight);

  const redLight = new THREE.PointLight(0xff0000, 0.5, 1000, 0);
  redLight.position.set(-550, 50, 0);
  scene.add(redLight);

  const blueLight = new THREE.PointLight(0xbbbbfe, 0.5, 1000, 0);
  blueLight.position.set(0, 50, 550);
  scene.add(blueLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer
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

      // Update refractor time uniform
      refractor.material.uniforms.time.value = time;

      // Animate the small sphere
      smallSphere.position.set(
        Math.cos(time) * 30,
        Math.abs(Math.cos(time * 2)) * 20 + 5,
        Math.sin(time) * 30
      );
      smallSphere.rotation.y = Math.PI / 2 - time;
      smallSphere.rotation.z = time * 8;

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
    { title: 'three.js webgl - refraction' },
    (a) => {
      a.window(
        { title: 'three.js webgl - refraction', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLRefraction(a, win, { width: WIDTH, height: HEIGHT });
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
