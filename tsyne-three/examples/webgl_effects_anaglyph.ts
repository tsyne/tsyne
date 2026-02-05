/**
 * three.js webgl - effects - anaglyph
 *
 * Port of: three/examples/webgl_effects_anaglyph.html
 *
 * Tests:
 * - Anaglyph 3D effect (red/cyan glasses)
 * - Stereo camera rendering
 * - Post-processing effect simulation
 *
 * Adaptations for Tsyne:
 * - Manual anaglyph rendering with two cameras
 * - Procedural geometry scene
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLEffectsAnaglyphParams {
  width?: number;
  height?: number;
  eyeSeparation?: number;
}

export interface WebGLEffectsAnaglyphDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLEffectsAnaglyph(
  a: App,
  win: Window,
  params: WebGLEffectsAnaglyphParams = {}
): Promise<WebGLEffectsAnaglyphDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const eyeSeparation = params.eyeSeparation ?? 0.5;

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

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 100;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create stereo cameras
  const cameraLeft = camera.clone();
  const cameraRight = camera.clone();

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(1, 1, 1);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create spheres floating in space
  // ─────────────────────────────────────────────────────────────────────────

  const spheres: THREE.Mesh[] = [];
  const sphereGeometry = new THREE.SphereGeometry(5, 32, 16);

  for (let i = 0; i < 50; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
      shininess: 100,
    });

    const sphere = new THREE.Mesh(sphereGeometry, material);

    sphere.position.x = (Math.random() - 0.5) * 200;
    sphere.position.y = (Math.random() - 0.5) * 200;
    sphere.position.z = (Math.random() - 0.5) * 200;

    const scale = Math.random() * 2 + 0.5;
    sphere.scale.setScalar(scale);

    scene.add(sphere);
    spheres.push(sphere);
  }

  // Add some torus knots for variety
  const torusKnotGeometry = new THREE.TorusKnotGeometry(8, 3, 100, 16);

  for (let i = 0; i < 10; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      shininess: 80,
    });

    const torusKnot = new THREE.Mesh(torusKnotGeometry, material);

    torusKnot.position.x = (Math.random() - 0.5) * 150;
    torusKnot.position.y = (Math.random() - 0.5) * 150;
    torusKnot.position.z = (Math.random() - 0.5) * 150;

    const scale = Math.random() * 0.5 + 0.3;
    torusKnot.scale.setScalar(scale);

    scene.add(torusKnot);
    spheres.push(torusKnot);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.autoClear = false;

  // Create render targets for left and right eye
  const renderTargetLeft = new THREE.WebGLRenderTarget(width, height);
  const renderTargetRight = new THREE.WebGLRenderTarget(width, height);

  // Create anaglyph compositing scene
  const anaglyphScene = new THREE.Scene();
  const anaglyphCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const anaglyphMaterial = new THREE.ShaderMaterial({
    uniforms: {
      mapLeft: { value: renderTargetLeft.texture },
      mapRight: { value: renderTargetRight.texture },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D mapLeft;
      uniform sampler2D mapRight;
      varying vec2 vUv;

      void main() {
        vec4 colorLeft = texture2D(mapLeft, vUv);
        vec4 colorRight = texture2D(mapRight, vUv);

        // Anaglyph: red from left eye, cyan (green+blue) from right eye
        gl_FragColor = vec4(
          colorLeft.r,
          colorRight.g,
          colorRight.b,
          1.0
        );
      }
    `,
  });

  const anaglyphQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    anaglyphMaterial
  );
  anaglyphScene.add(anaglyphQuad);

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

      // Animate spheres
      for (let i = 0; i < spheres.length; i++) {
        const sphere = spheres[i];
        sphere.position.y += Math.sin(time + i) * 0.1;
        sphere.rotation.x = time * 0.5 + i;
        sphere.rotation.y = time * 0.3 + i;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.3) * 80;
      camera.position.z = Math.cos(time * 0.3) * 80;
      camera.position.y = Math.sin(time * 0.2) * 30;
      camera.lookAt(scene.position);

      // Update stereo cameras
      const halfSeparation = eyeSeparation;

      // Get camera's right vector
      const cameraRight_vec = new THREE.Vector3();
      camera.getWorldDirection(cameraRight_vec);
      cameraRight_vec.cross(camera.up).normalize();

      // Left camera
      cameraLeft.position.copy(camera.position);
      cameraLeft.position.add(cameraRight_vec.clone().multiplyScalar(-halfSeparation));
      cameraLeft.quaternion.copy(camera.quaternion);

      // Right camera
      cameraRight.position.copy(camera.position);
      cameraRight.position.add(cameraRight_vec.clone().multiplyScalar(halfSeparation));
      cameraRight.quaternion.copy(camera.quaternion);

      // Render left eye to render target
      renderer.setRenderTarget(renderTargetLeft);
      renderer.clear();
      renderer.render(scene, cameraLeft);

      // Render right eye to render target
      renderer.setRenderTarget(renderTargetRight);
      renderer.clear();
      renderer.render(scene, cameraRight);

      // Composite anaglyph
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(anaglyphScene, anaglyphCamera);

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
    { title: 'three.js webgl - effects - anaglyph' },
    (a) => {
      a.window(
        { title: 'three.js webgl - effects - anaglyph', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLEffectsAnaglyph(a, win, { width: WIDTH, height: HEIGHT });
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
