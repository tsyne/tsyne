/**
 * three.js webgl - effects - parallax barrier
 *
 * Port of: three/examples/webgl_effects_parallaxbarrier.html
 *
 * Tests:
 * - Parallax barrier 3D effect (autostereoscopic)
 * - Alternating column rendering for stereo
 * - No glasses required 3D display simulation
 *
 * Adaptations for Tsyne:
 * - Custom shader for parallax barrier effect
 * - Procedural geometry scene
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLEffectsParallaxBarrierParams {
  width?: number;
  height?: number;
  eyeSeparation?: number;
}

export interface WebGLEffectsParallaxBarrierDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLEffectsParallaxBarrier(
  a: App,
  win: ITsyneWindow,
  params: WebGLEffectsParallaxBarrierParams = {}
): Promise<WebGLEffectsParallaxBarrierDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const eyeSeparation = params.eyeSeparation ?? 0.5;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 100;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222233);

  // Create stereo cameras
  const cameraLeft = camera.clone();
  const cameraRight = camera.clone();

  // Lights
  const light1 = new THREE.DirectionalLight(0xffffff, 2);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0x8888ff, 1);
  light2.position.set(-1, -1, 1);
  scene.add(light2);

  const ambientLight = new THREE.AmbientLight(0x333344);
  scene.add(ambientLight);

  // ─────────────────────────────────────────────────────────────────────────
  // Create scene objects at different depths
  // ─────────────────────────────────────────────────────────────────────────

  const objects: THREE.Mesh[] = [];

  // Background grid of cubes
  const cubeGeometry = new THREE.BoxGeometry(8, 8, 8);
  for (let x = -4; x <= 4; x++) {
    for (let y = -3; y <= 3; y++) {
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL((x + 4) / 9, 0.7, 0.5),
        shininess: 50,
      });
      const cube = new THREE.Mesh(cubeGeometry, material);
      cube.position.set(x * 25, y * 25, -100);
      scene.add(cube);
      objects.push(cube);
    }
  }

  // Middle layer - spheres
  const sphereGeometry = new THREE.SphereGeometry(10, 32, 16);
  for (let i = 0; i < 5; i++) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(i / 5, 0.9, 0.6),
      shininess: 100,
    });
    const sphere = new THREE.Mesh(sphereGeometry, material);
    const angle = (i / 5) * Math.PI * 2;
    sphere.position.set(Math.cos(angle) * 40, Math.sin(angle) * 40, 0);
    scene.add(sphere);
    objects.push(sphere);
  }

  // Foreground - torus knot
  const torusKnotGeometry = new THREE.TorusKnotGeometry(15, 5, 100, 16);
  const torusKnotMaterial = new THREE.MeshPhongMaterial({
    color: 0xff6600,
    shininess: 150,
  });
  const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
  torusKnot.position.z = 50;
  scene.add(torusKnot);
  objects.push(torusKnot);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });
  renderer.autoClear = false;

  // Create render targets for left and right eye
  const renderTargetLeft = new THREE.WebGLRenderTarget(width, height);
  const renderTargetRight = new THREE.WebGLRenderTarget(width, height);

  // Create parallax barrier compositing scene
  const barrierScene = new THREE.Scene();
  const barrierCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const barrierMaterial = new THREE.ShaderMaterial({
    uniforms: {
      mapLeft: { value: renderTargetLeft.texture },
      mapRight: { value: renderTargetRight.texture },
      resolution: { value: new THREE.Vector2(width, height) },
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
      uniform vec2 resolution;
      varying vec2 vUv;

      void main() {
        // Parallax barrier effect: alternate columns between left and right eye
        float col = floor(vUv.x * resolution.x);
        float isLeftEye = mod(col, 2.0);

        vec4 colorLeft = texture2D(mapLeft, vUv);
        vec4 colorRight = texture2D(mapRight, vUv);

        // Mix based on column parity
        gl_FragColor = mix(colorRight, colorLeft, isLeftEye);
      }
    `,
  });

  const barrierQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    barrierMaterial
  );
  barrierScene.add(barrierQuad);

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
      torusKnot.rotation.x = time * 0.5;
      torusKnot.rotation.y = time * 0.3;

      // Animate background cubes
      for (let i = 0; i < 63; i++) {
        objects[i].rotation.x = time * 0.2 + i * 0.1;
        objects[i].rotation.y = time * 0.3 + i * 0.05;
      }

      // Animate middle spheres
      for (let i = 63; i < 68; i++) {
        const j = i - 63;
        const angle = (j / 5) * Math.PI * 2 + time * 0.5;
        objects[i].position.x = Math.cos(angle) * 40;
        objects[i].position.y = Math.sin(angle) * 40;
        objects[i].position.z = Math.sin(time + j) * 20;
      }

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 50;
      camera.position.y = Math.sin(time * 0.15) * 30;
      camera.position.z = 100 + Math.cos(time * 0.2) * 30;
      camera.lookAt(scene.position);

      // Update stereo cameras
      const halfSeparation = eyeSeparation;

      // Get camera's right vector
      const rightVec = new THREE.Vector3();
      camera.getWorldDirection(rightVec);
      rightVec.cross(camera.up).normalize();

      // Left camera
      cameraLeft.position.copy(camera.position);
      cameraLeft.position.add(rightVec.clone().multiplyScalar(-halfSeparation));
      cameraLeft.quaternion.copy(camera.quaternion);

      // Right camera
      cameraRight.position.copy(camera.position);
      cameraRight.position.add(rightVec.clone().multiplyScalar(halfSeparation));
      cameraRight.quaternion.copy(camera.quaternion);

      // Render left eye to render target
      renderer.setRenderTarget(renderTargetLeft);
      renderer.clear();
      renderer.render(scene, cameraLeft);

      // Render right eye to render target
      renderer.setRenderTarget(renderTargetRight);
      renderer.clear();
      renderer.render(scene, cameraRight);

      // Composite parallax barrier effect
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(barrierScene, barrierCamera);

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
    { title: 'three.js webgl - effects - parallax barrier' },
    (a) => {
      a.window(
        { title: 'three.js webgl - effects - parallax barrier', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLEffectsParallaxBarrier(a, win, { width: WIDTH, height: HEIGHT });
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
