/**
 * three.js webgl - portal
 *
 * Port of: three/examples/webgl_portal.html
 *
 * Tests:
 * - MeshPhongMaterial with colored walls (Cornell box style)
 * - MeshBasicMaterial with texture mapping (portal surfaces)
 * - IcosahedronGeometry with clipping planes
 * - PointLight lighting (multiple colored lights)
 * - CameraUtils.frameCorners for off-axis projection
 * - WebGLRenderTarget for render-to-texture portal views
 * - Animated bouncing icospheres
 *
 * Adaptations for Tsyne:
 * - Uses initThreeJS for bridge initialization
 * - Replaces DOM/document/window APIs with Tsyne equivalents
 * - No OrbitControls (non-interactive)
 * - Portal render-to-texture via WebGLRenderTarget
 *   (if FBOs are not supported in the bridge, portals will appear blank)
 * - localClippingEnabled and toneMapping set on renderer
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';
import * as CameraUtils from '../../three/examples/jsm/utils/CameraUtils.js';

// =============================================================================
// Types
// =============================================================================

export interface WebGLPortalParams {
  width?: number;
  height?: number;
}

export interface WebGLPortalDemo {
  stop: () => void;
  getTime: () => number;
}

// =============================================================================
// Demo Builder
// =============================================================================

export async function buildWebGLPortal(
  a: App,
  win: ITsyneWindow,
  params: WebGLPortalParams = {}
): Promise<WebGLPortalDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ---------------------------------------------------------------------------
  // Scene setup
  // ---------------------------------------------------------------------------

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
  camera.position.set(0, 75, 160);
  camera.lookAt(0, 40, 0);

  // ---------------------------------------------------------------------------
  // Bouncing icospheres
  // ---------------------------------------------------------------------------

  const planeGeo = new THREE.PlaneGeometry(100.1, 100.1);

  const portalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.0);
  const geometry = new THREE.IcosahedronGeometry(5, 0);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x333333,
    flatShading: true,
    clippingPlanes: [portalPlane],
    clipShadows: true,
  });
  const smallSphereOne = new THREE.Mesh(geometry, material);
  scene.add(smallSphereOne);
  const smallSphereTwo = new THREE.Mesh(geometry, material);
  scene.add(smallSphereTwo);

  // ---------------------------------------------------------------------------
  // Portals
  // ---------------------------------------------------------------------------

  const portalCamera = new THREE.PerspectiveCamera(45, 1.0, 0.1, 500.0);
  scene.add(portalCamera);

  const bottomLeftCorner = new THREE.Vector3();
  const bottomRightCorner = new THREE.Vector3();
  const topLeftCorner = new THREE.Vector3();
  const reflectedPosition = new THREE.Vector3();

  const leftPortalTexture = new THREE.WebGLRenderTarget(256, 256);
  const leftPortal = new THREE.Mesh(
    planeGeo,
    new THREE.MeshBasicMaterial({ map: leftPortalTexture.texture })
  );
  leftPortal.position.x = -30;
  leftPortal.position.y = 20;
  leftPortal.scale.set(0.35, 0.35, 0.35);
  scene.add(leftPortal);

  const rightPortalTexture = new THREE.WebGLRenderTarget(256, 256);
  const rightPortal = new THREE.Mesh(
    planeGeo,
    new THREE.MeshBasicMaterial({ map: rightPortalTexture.texture })
  );
  rightPortal.position.x = 30;
  rightPortal.position.y = 20;
  rightPortal.scale.set(0.35, 0.35, 0.35);
  scene.add(rightPortal);

  // ---------------------------------------------------------------------------
  // Walls (Cornell box style)
  // ---------------------------------------------------------------------------

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

  const planeFront = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0x7f7fff })
  );
  planeFront.position.z = 50;
  planeFront.position.y = 50;
  planeFront.rotateY(Math.PI);
  scene.add(planeFront);

  const planeBack = new THREE.Mesh(
    planeGeo,
    new THREE.MeshPhongMaterial({ color: 0xff7fff })
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

  // ---------------------------------------------------------------------------
  // Lights
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Renderer
  // ---------------------------------------------------------------------------

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.localClippingEnabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // ---------------------------------------------------------------------------
  // Portal rendering helper
  // ---------------------------------------------------------------------------

  function renderPortal(
    thisPortalMesh: any,
    otherPortalMesh: any,
    thisPortalTexture: any
  ) {
    // Set the portal camera position to be reflected about the portal plane
    thisPortalMesh.worldToLocal(reflectedPosition.copy(camera.position));
    reflectedPosition.x *= -1.0;
    reflectedPosition.z *= -1.0;
    otherPortalMesh.localToWorld(reflectedPosition);
    portalCamera.position.copy(reflectedPosition);

    // Grab the corners of the other portal
    // Note: the portal is viewed backwards; flip the left/right coordinates
    otherPortalMesh.localToWorld(bottomLeftCorner.set(50.05, -50.05, 0.0));
    otherPortalMesh.localToWorld(bottomRightCorner.set(-50.05, -50.05, 0.0));
    otherPortalMesh.localToWorld(topLeftCorner.set(50.05, 50.05, 0.0));

    // Set the projection matrix to encompass the portal's frame
    CameraUtils.frameCorners(
      portalCamera,
      bottomLeftCorner,
      bottomRightCorner,
      topLeftCorner,
      false
    );

    // Render the portal
    thisPortalTexture.texture.colorSpace = renderer.outputColorSpace;
    renderer.setRenderTarget(thisPortalTexture);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    thisPortalMesh.visible = false;
    renderer.render(scene, portalCamera);
    thisPortalMesh.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;

      // Move the bouncing spheres
      const timerOne = Date.now() * 0.01;
      const timerTwo = timerOne + Math.PI * 10.0;

      smallSphereOne.position.set(
        Math.cos(timerOne * 0.1) * 30,
        Math.abs(Math.cos(timerOne * 0.2)) * 20 + 5,
        Math.sin(timerOne * 0.1) * 30
      );
      smallSphereOne.rotation.y = Math.PI / 2 - timerOne * 0.1;
      smallSphereOne.rotation.z = timerOne * 0.8;

      smallSphereTwo.position.set(
        Math.cos(timerTwo * 0.1) * 30,
        Math.abs(Math.cos(timerTwo * 0.2)) * 20 + 5,
        Math.sin(timerTwo * 0.1) * 30
      );
      smallSphereTwo.rotation.y = Math.PI / 2 - timerTwo * 0.1;
      smallSphereTwo.rotation.z = timerTwo * 0.8;

      // Save the original camera properties
      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;

      // Render the portal effect
      renderPortal(leftPortal, rightPortal, leftPortalTexture);
      renderPortal(rightPortal, leftPortal, rightPortalTexture);

      // Restore the original rendering properties
      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.setRenderTarget(currentRenderTarget);

      // Render the main scene
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

// =============================================================================
// Main
// =============================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - portal' },
    (a) => {
      a.window(
        { title: 'three.js webgl - portal', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPortal(a, win, { width: WIDTH, height: HEIGHT });
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
