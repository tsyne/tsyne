/**
 * three.js webgl - interactive cubes (gpu picking)
 *
 * Port of: three/examples/webgl_interactive_cubes_gpu.html
 *
 * Tests:
 * - BoxGeometry with merged geometries (BufferGeometryUtils)
 * - MeshPhongMaterial with vertex colors
 * - ShaderMaterial for GPU picking pass
 * - WebGLRenderTarget for off-screen rendering
 * - AmbientLight + DirectionalLight
 * - Camera orbit animation
 *
 * Adaptations for Tsyne:
 * - Removes TrackballControls (uses camera orbit animation)
 * - Removes Stats
 * - Reduces cube count for performance
 * - GPU picking may be limited depending on render target support
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLInteractiveCubesGpuParams {
  width?: number;
  height?: number;
  cubeCount?: number;
}

export interface WebGLInteractiveCubesGpuDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLInteractiveCubesGpu(
  a: App,
  win: Window,
  params: WebGLInteractiveCubesGpuParams = {}
): Promise<WebGLInteractiveCubesGpuDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const cubeCount = params.cubeCount ?? 500; // Reduced for Tsyne performance (original: 5000)

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
    interactive: true,
    coreBridge: bridge,
  });

  // Import BufferGeometryUtils
  const BufferGeometryUtils = await import('../../three/examples/jsm/utils/BufferGeometryUtils.js');

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 10000);
  camera.position.z = 1000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  scene.add(new THREE.AmbientLight(0xcccccc));

  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(0, 500, 2000);
  scene.add(light);

  const defaultMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    vertexColors: true,
    shininess: 0,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GPU Picking setup
  // ─────────────────────────────────────────────────────────────────────────

  const pickingScene = new THREE.Scene();
  const pickingTexture = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.IntType,
    format: THREE.RGBAIntegerFormat,
    internalFormat: 'RGBA32I',
  });

  const pickingMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: /* glsl */`
      attribute int id;
      flat varying int vid;
      void main() {
        vid = id;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */`
      layout(location = 0) out int out_id;
      flat varying int vid;
      void main() {
        out_id = vid;
      }
    `,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Helper functions
  // ─────────────────────────────────────────────────────────────────────────

  function applyId(geometry: any, id: number) {
    const position = geometry.attributes.position;
    const array = new Int16Array(position.count);
    array.fill(id);

    const bufferAttribute = new THREE.Int16BufferAttribute(array, 1, false);
    bufferAttribute.gpuType = THREE.IntType;
    geometry.setAttribute('id', bufferAttribute);
  }

  function applyVertexColors(geometry: any, color: any) {
    const position = geometry.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < position.count; i++) {
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Build merged geometry
  // ─────────────────────────────────────────────────────────────────────────

  const pickingData: Array<{ position: any; rotation: any; scale: any }> = [];
  const geometries: any[] = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const color = new THREE.Color();

  for (let i = 0; i < cubeCount; i++) {
    const geometry = new THREE.BoxGeometry();

    const position = new THREE.Vector3();
    position.x = Math.random() * 10000 - 5000;
    position.y = Math.random() * 6000 - 3000;
    position.z = Math.random() * 8000 - 4000;

    const rotation = new THREE.Euler();
    rotation.x = Math.random() * 2 * Math.PI;
    rotation.y = Math.random() * 2 * Math.PI;
    rotation.z = Math.random() * 2 * Math.PI;

    const scale = new THREE.Vector3();
    scale.x = Math.random() * 200 + 100;
    scale.y = Math.random() * 200 + 100;
    scale.z = Math.random() * 200 + 100;

    quaternion.setFromEuler(rotation);
    matrix.compose(position, quaternion, scale);

    geometry.applyMatrix4(matrix);

    // Give the geometry's vertices a random color and an integer id
    applyVertexColors(geometry, color.setHex(Math.random() * 0xffffff));
    applyId(geometry, i);

    geometries.push(geometry);

    pickingData[i] = {
      position: position,
      rotation: rotation,
      scale: scale,
    };
  }

  const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
  scene.add(new THREE.Mesh(mergedGeometry, defaultMaterial));
  pickingScene.add(new THREE.Mesh(mergedGeometry, pickingMaterial));

  // Highlight box to surround picked object
  const offset = new THREE.Vector3(10, 10, 10);
  const highlightBox = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshLambertMaterial({ color: 0xffff00 })
  );
  highlightBox.visible = false;
  scene.add(highlightBox);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Pointer tracking
  // ─────────────────────────────────────────────────────────────────────────

  const pointer = new THREE.Vector2(-1, -1);
  const clearColor = new THREE.Color();

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (event: any) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GPU Picking function
  // ─────────────────────────────────────────────────────────────────────────

  function pick() {
    // Render the picking scene off-screen
    // Set the view offset to represent just a single pixel under the mouse
    camera.setViewOffset(
      width, height,
      Math.floor(pointer.x), Math.floor(pointer.y),
      1, 1
    );

    // Render to picking texture
    renderer.setRenderTarget(pickingTexture);

    // Clear to -1 meaning no item was hit
    clearColor.setRGB(-1, -1, -1);
    renderer.setClearColor(clearColor);
    renderer.render(pickingScene, camera);

    // Restore active render target to canvas
    renderer.setRenderTarget(null);

    // Clear the view offset so rendering returns to normal
    camera.clearViewOffset();

    // Read the pixel
    const pixelBuffer = new Int32Array(4);

    try {
      renderer
        .readRenderTargetPixelsAsync(pickingTexture, 0, 0, 1, 1, pixelBuffer)
        .then(() => {
          const id = pixelBuffer[0];
          if (id !== -1 && id >= 0 && id < pickingData.length) {
            // Move highlightBox to surround picked object
            const data = pickingData[id];
            highlightBox.position.copy(data.position);
            highlightBox.rotation.copy(data.rotation);
            highlightBox.scale.copy(data.scale).add(offset);
            highlightBox.visible = true;
          } else {
            highlightBox.visible = false;
          }
        })
        .catch(() => {
          // readRenderTargetPixelsAsync may not be supported through bridge
          highlightBox.visible = false;
        });
    } catch {
      // GPU picking not available - this is expected when render targets
      // are not fully supported through the Tsyne bridge
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let theta = 0;

  // FPS tracking (optional - set TSYNE_FPS=1 to enable)
  const showFps = process.env.TSYNE_FPS === '1';
  let frameCount = 0;
  let lastFpsTime = Date.now();

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;

      // Orbit camera (replaces TrackballControls)
      theta += 0.1;
      camera.position.x = 2000 * Math.sin(THREE.MathUtils.degToRad(theta));
      camera.position.y = 2000 * Math.sin(THREE.MathUtils.degToRad(theta));
      camera.position.z = 2000 * Math.cos(THREE.MathUtils.degToRad(theta));
      camera.lookAt(scene.position);
      camera.updateMatrixWorld();

      // Attempt GPU picking
      pick();

      // Render main scene
      renderer.render(scene, camera);

      // Flush GL commands synchronously
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // FPS tracking (optional)
      if (showFps) {
        frameCount++;
        const now = Date.now();
        if (now - lastFpsTime >= 2000) {
          const fps = (frameCount * 1000) / (now - lastFpsTime);
          console.log(`[FPS] ${fps.toFixed(1)} fps`);
          frameCount = 0;
          lastFpsTime = now;
        }
      }
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
    { title: 'three.js webgl - interactive cubes (gpu)' },
    (a) => {
      a.window(
        { title: 'three.js webgl - interactive cubes (gpu)', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLInteractiveCubesGpu(a, win, { width: WIDTH, height: HEIGHT });
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
