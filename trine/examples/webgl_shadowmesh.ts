/**
 * three.js webgl - ShadowMesh
 *
 * Port of the canonical three.js example: three/examples/webgl_shadowmesh.html
 *
 * Demonstrates ShadowMesh - a very performant shadow technique that projects
 * mesh geometry onto a flat plane using a shadow matrix, with stencil buffer
 * to avoid overlapping shadow artifacts.
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Skips lightButton toggle UI (browser-only DOM element)
 * - Skips window resize handler
 * - Uses manual delta time instead of THREE.Timer (requires document)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { ShadowMesh } from '../../three/examples/jsm/objects/ShadowMesh.js';

// =============================================================================
// Types
// =============================================================================

export interface WebGLShadowMeshParams {
  width?: number;
  height?: number;
}

export interface WebGLShadowMeshDemo {
  stop: () => void;
}

// =============================================================================
// Demo Builder
// =============================================================================

/**
 * Build the WebGL ShadowMesh demo
 *
 * Creates a scene with several animated meshes (cube, cylinder, torus, sphere,
 * pyramid) casting flat shadows onto a green ground plane via ShadowMesh.
 * A directional light illuminates the scene from above.
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLShadowMesh(
  a: App,
  win: ITsyneWindow,
  params: WebGLShadowMeshParams = {}
): Promise<WebGLShadowMeshDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ---------------------------------------------------------------------------
  // Scene setup (matches canonical three.js example)
  // ---------------------------------------------------------------------------

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0096ff);

  const camera = new THREE.PerspectiveCamera(55, width / height, 1, 3000);
  camera.position.set(0, 2.5, 10);
  scene.add(camera);

  // Directional light
  const sunLight = new THREE.DirectionalLight('rgb(255,255,255)', 3);
  sunLight.position.set(5, 7, -1);
  sunLight.lookAt(scene.position);
  scene.add(sunLight);

  // Light position as Vector4 for shadow projection
  // w component controls divergence: 0.001 = directional, 1.0 = point light
  const lightPosition4D = new THREE.Vector4(
    sunLight.position.x,
    sunLight.position.y,
    sunLight.position.z,
    0.001
  );

  // Shadow ground plane
  const normalVector = new THREE.Vector3(0, 1, 0);
  const planeConstant = 0.01; // slightly above ground y=0 to avoid z-fighting
  const groundPlane = new THREE.Plane(normalVector, planeConstant);

  const TWO_PI = Math.PI * 2;

  // YELLOW ARROW HELPERS (indicating light direction)
  const arrowDirection = new THREE.Vector3()
    .subVectors(scene.position, sunLight.position)
    .normalize();

  const arrowPosition1 = sunLight.position.clone();
  const arrowHelper1 = new THREE.ArrowHelper(arrowDirection, arrowPosition1, 0.9, 0xffff00, 0.25, 0.08);
  scene.add(arrowHelper1);

  const arrowPosition2 = sunLight.position.clone().add(new THREE.Vector3(0, 0.2, 0));
  const arrowHelper2 = new THREE.ArrowHelper(arrowDirection, arrowPosition2, 0.9, 0xffff00, 0.25, 0.08);
  scene.add(arrowHelper2);

  const arrowPosition3 = sunLight.position.clone().add(new THREE.Vector3(0, -0.2, 0));
  const arrowHelper3 = new THREE.ArrowHelper(arrowDirection, arrowPosition3, 0.9, 0xffff00, 0.25, 0.08);
  scene.add(arrowHelper3);

  // LIGHTBULB (hidden in directional light mode)
  const lightSphereGeometry = new THREE.SphereGeometry(0.09);
  const lightSphereMaterial = new THREE.MeshBasicMaterial({ color: 'rgb(255,255,255)' });
  const lightSphere = new THREE.Mesh(lightSphereGeometry, lightSphereMaterial);
  scene.add(lightSphere);
  lightSphere.visible = false;

  const lightHolderGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.13);
  const lightHolderMaterial = new THREE.MeshBasicMaterial({ color: 'rgb(75,75,75)' });
  const lightHolder = new THREE.Mesh(lightHolderGeometry, lightHolderMaterial);
  scene.add(lightHolder);
  lightHolder.visible = false;

  // GROUND
  const groundGeometry = new THREE.BoxGeometry(30, 0.01, 40);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(0,130,0)' });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.position.y = 0.0;
  scene.add(groundMesh);

  // RED CUBE and CUBE's SHADOW
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshLambertMaterial({ color: 'rgb(255,0,0)', emissive: 0x200000 });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.z = -1;
  scene.add(cube);

  const cubeShadow = new ShadowMesh(cube);
  scene.add(cubeShadow);

  // BLUE CYLINDER and CYLINDER's SHADOW
  const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2);
  const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 'rgb(0,0,255)', emissive: 0x000020 });
  const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
  cylinder.position.z = -2.5;
  scene.add(cylinder);

  const cylinderShadow = new ShadowMesh(cylinder);
  scene.add(cylinderShadow);

  // MAGENTA TORUS and TORUS' SHADOW
  const torusGeometry = new THREE.TorusGeometry(1, 0.2, 10, 16, TWO_PI);
  const torusMaterial = new THREE.MeshPhongMaterial({ color: 'rgb(255,0,255)', emissive: 0x200020 });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.position.z = -6;
  scene.add(torus);

  const torusShadow = new ShadowMesh(torus);
  scene.add(torusShadow);

  // WHITE SPHERE and SPHERE's SHADOW
  const sphereGeometry = new THREE.SphereGeometry(0.5, 20, 10);
  const sphereMaterial = new THREE.MeshPhongMaterial({ color: 'rgb(255,255,255)', emissive: 0x222222 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(4, 0.5, 2);
  scene.add(sphere);

  const sphereShadow = new ShadowMesh(sphere);
  scene.add(sphereShadow);

  // YELLOW PYRAMID and PYRAMID's SHADOW
  const pyramidGeometry = new THREE.CylinderGeometry(0, 0.5, 2, 4);
  const pyramidMaterial = new THREE.MeshPhongMaterial({
    color: 'rgb(255,255,0)',
    emissive: 0x440000,
    flatShading: true,
    shininess: 0,
  });
  const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
  pyramid.position.set(-4, 1, 2);
  scene.add(pyramid);

  const pyramidShadow = new ShadowMesh(pyramid);
  scene.add(pyramidShadow);

  // ---------------------------------------------------------------------------
  // Renderer
  // ---------------------------------------------------------------------------

  const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  let running = true;
  let verticalAngle = 0;
  let horizontalAngle = 0;
  let lastTime = Date.now();

  const animate = async () => {
    while (running) {
      const now = Date.now();
      const frameTime = (now - lastTime) * 0.001; // seconds
      lastTime = now;

      // Rotate objects
      cube.rotation.x += 1.0 * frameTime;
      cube.rotation.y += 1.0 * frameTime;

      cylinder.rotation.y += 1.0 * frameTime;
      cylinder.rotation.z -= 1.0 * frameTime;

      torus.rotation.x -= 1.0 * frameTime;
      torus.rotation.y -= 1.0 * frameTime;

      pyramid.rotation.y += 0.5 * frameTime;

      // Move objects in circular/sinusoidal paths
      horizontalAngle += 0.5 * frameTime;
      if (horizontalAngle > TWO_PI) horizontalAngle -= TWO_PI;
      cube.position.x = Math.sin(horizontalAngle) * 4;
      cylinder.position.x = Math.sin(horizontalAngle) * -4;
      torus.position.x = Math.cos(horizontalAngle) * 4;

      verticalAngle += 1.5 * frameTime;
      if (verticalAngle > TWO_PI) verticalAngle -= TWO_PI;
      cube.position.y = Math.sin(verticalAngle) * 2 + 2.9;
      cylinder.position.y = Math.sin(verticalAngle) * 2 + 3.1;
      torus.position.y = Math.cos(verticalAngle) * 2 + 3.3;

      // Update shadow meshes to follow their shadow-casting objects
      cubeShadow.update(groundPlane, lightPosition4D);
      cylinderShadow.update(groundPlane, lightPosition4D);
      torusShadow.update(groundPlane, lightPosition4D);
      sphereShadow.update(groundPlane, lightPosition4D);
      pyramidShadow.update(groundPlane, lightPosition4D);

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

// =============================================================================
// Main
// =============================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - ShadowMesh' },
    (a) => {
      a.window(
        { title: 'three.js webgl - ShadowMesh', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLShadowMesh(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// =============================================================================
// Entry Point
// =============================================================================

if (require.main === module) {
  main().catch(console.error);
}
