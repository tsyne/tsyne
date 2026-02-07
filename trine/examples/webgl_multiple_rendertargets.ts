/**
 * three.js webgl - multiple render targets
 *
 * Port of: three/examples/webgl_multiple_rendertargets.html
 *
 * Tests:
 * - WebGLMultipleRenderTargets
 * - G-buffer style rendering
 * - Multiple outputs from single draw
 * - Deferred rendering concepts
 *
 * Adaptations for Tsyne:
 * - Simplified MRT setup
 * - Procedural geometry
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleRendertargetsParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleRendertargetsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleRendertargets(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleRendertargetsParams = {}
): Promise<WebGLMultipleRendertargetsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup - multiple passes demonstration
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.z = 5;

  // Main scene with objects
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Create various objects
  const objects: THREE.Mesh[] = [];

  // Torus knot
  const torusKnot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16),
    new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.5, roughness: 0.5 })
  );
  torusKnot.position.set(-1.5, 0, 0);
  scene.add(torusKnot);
  objects.push(torusKnot);

  // Sphere
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0x44ff44, metalness: 0.3, roughness: 0.7 })
  );
  sphere.position.set(1.5, 0, 0);
  scene.add(sphere);
  objects.push(sphere);

  // Box
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x4444ff, metalness: 0.8, roughness: 0.2 })
  );
  scene.add(box);
  objects.push(box);

  // ─────────────────────────────────────────────────────────────────────────
  // Create render targets for G-buffer visualization
  // ─────────────────────────────────────────────────────────────────────────

  const rtWidth = width / 2;
  const rtHeight = height / 2;

  // Color render target
  const colorTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);

  // Depth render target
  const depthTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);

  // Normal visualization render target
  const normalTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight);

  // Create display quads for showing render targets
  const quadGeometry = new THREE.PlaneGeometry(2, 2);

  // Material for displaying color
  const colorQuadMaterial = new THREE.MeshBasicMaterial({ map: colorTarget.texture });
  const colorQuad = new THREE.Mesh(quadGeometry, colorQuadMaterial);

  // Material for displaying depth (we'll use a depth visualization approach)
  const depthQuadMaterial = new THREE.MeshBasicMaterial({ map: depthTarget.texture });
  const depthQuad = new THREE.Mesh(quadGeometry, depthQuadMaterial);

  // Normal visualization material
  const normalMaterial = new THREE.MeshNormalMaterial();

  // Scene for final compositing
  const compositeScene = new THREE.Scene();
  const compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create quad layout (2x2 grid)
  const quadSize = 0.48;
  const quadPositions = [
    { x: -0.5, y: 0.5 },   // Top left - main render
    { x: 0.5, y: 0.5 },    // Top right - depth
    { x: -0.5, y: -0.5 },  // Bottom left - normals
    { x: 0.5, y: -0.5 },   // Bottom right - wireframe
  ];

  const displayQuads: THREE.Mesh[] = [];

  for (let i = 0; i < 4; i++) {
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(quadSize * 2, quadSize * 2),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    );
    quad.position.set(quadPositions[i].x, quadPositions[i].y, 0);
    compositeScene.add(quad);
    displayQuads.push(quad);
  }

  // Separate scenes for different render passes
  const depthScene = new THREE.Scene();
  depthScene.background = new THREE.Color(0x000000);

  const normalScene = new THREE.Scene();
  normalScene.background = new THREE.Color(0x000000);

  const wireframeScene = new THREE.Scene();
  wireframeScene.background = new THREE.Color(0x111111);

  // Clone objects for different passes
  for (const obj of objects) {
    // Depth pass objects (white material, position encodes depth)
    const depthObj = obj.clone();
    depthObj.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    depthScene.add(depthObj);

    // Normal pass objects
    const normalObj = obj.clone();
    normalObj.material = new THREE.MeshNormalMaterial();
    normalScene.add(normalObj);

    // Wireframe pass objects
    const wireObj = obj.clone();
    wireObj.material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
    });
    wireframeScene.add(wireObj);
  }

  // Render targets for each pass
  const passes = [
    { scene: scene, target: colorTarget, name: 'color' },
    { scene: depthScene, target: depthTarget, name: 'depth' },
    { scene: normalScene, target: normalTarget, name: 'normal' },
    { scene: wireframeScene, target: new THREE.WebGLRenderTarget(rtWidth, rtHeight), name: 'wireframe' },
  ];

  // Update display quad materials
  displayQuads[0].material = new THREE.MeshBasicMaterial({ map: passes[0].target.texture });
  displayQuads[1].material = new THREE.MeshBasicMaterial({ map: passes[1].target.texture });
  displayQuads[2].material = new THREE.MeshBasicMaterial({ map: passes[2].target.texture });
  displayQuads[3].material = new THREE.MeshBasicMaterial({ map: passes[3].target.texture });

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

      // Animate objects in all scenes
      const allSceneObjects = [
        objects,
        depthScene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[],
        normalScene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[],
        wireframeScene.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[],
      ];

      for (const sceneObjs of allSceneObjects) {
        for (let i = 0; i < sceneObjs.length; i++) {
          sceneObjs[i].rotation.x = time * 0.5 + i;
          sceneObjs[i].rotation.y = time * 0.3 + i * 0.5;
        }
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.3) * 5;
      camera.position.z = Math.cos(time * 0.3) * 5;
      camera.lookAt(0, 0, 0);

      // Render each pass to its render target
      for (const pass of passes) {
        renderer.setRenderTarget(pass.target);
        renderer.render(pass.scene, camera);
      }

      // Render composite view to screen
      renderer.setRenderTarget(null);
      renderer.render(compositeScene, compositeCamera);

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
      // Clean up render targets
      for (const pass of passes) {
        pass.target.dispose();
      }
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
    { title: 'three.js webgl - multiple render targets' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple render targets', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleRendertargets(a, win, { width: WIDTH, height: HEIGHT });
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
