/**
 * three.js webgl - read float buffer
 *
 * Port of: three/examples/webgl_read_float_buffer.html
 *
 * Tests:
 * - Render-to-texture with WebGLRenderTarget (FloatType)
 * - ShaderMaterial with custom vertex and fragment shaders
 * - MeshPhongMaterial on TorusGeometry
 * - Multi-scene rendering (sceneRTT + sceneScreen)
 * - OrthographicCamera
 * - readRenderTargetPixels for float buffer readback
 * - renderer.autoClear = false with manual clear/setRenderTarget
 *
 * Adaptations for Tsyne:
 * - Removes Stats, DOM elements
 * - Inlines shader source (no DOM script tags)
 * - Uses Tsyne rendering pipeline
 * - Mouse-based pixel readback replaced with center-pixel readback
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Shaders (inlined from HTML script tags)
// ═══════════════════════════════════════════════════════════════════════════

const vertexShaderSource = `
varying vec2 vUv;

void main() {

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
`;

const fragmentShaderPass1 = `
varying vec2 vUv;
uniform float time;

void main() {

  float r = vUv.x;
  if( vUv.y < 0.5 ) r = 0.0;
  float g = vUv.y;
  if( vUv.x < 0.5 ) g = 0.0;

  gl_FragColor = vec4( r, g, time, 1.0 );

}
`;

const fragmentShaderScreen = `
varying vec2 vUv;
uniform sampler2D tDiffuse;

void main() {

  gl_FragColor = texture2D( tDiffuse, vUv );
  #include <colorspace_fragment>

}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLReadFloatBufferParams {
  width?: number;
  height?: number;
}

export interface WebGLReadFloatBufferDemo {
  stop: () => void;
  getReadValues: () => Float32Array;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Read Float Buffer demo
 *
 * Renders a scene with torus meshes and a shader background into a float
 * render target, then displays the result via a full-screen quad. Reads
 * back float pixel values from the center of the render target each frame.
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() and getReadValues()
 */
export async function buildWebGLReadFloatBuffer(
  a: App,
  win: ITsyneWindow,
  params: WebGLReadFloatBufferParams = {}
): Promise<WebGLReadFloatBufferDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Camera
  // ─────────────────────────────────────────────────────────────────────────

  const cameraRTT = new THREE.OrthographicCamera(
    width / -2, width / 2,
    height / 2, height / -2,
    1, 1000
  );
  cameraRTT.position.z = 500;

  // ─────────────────────────────────────────────────────────────────────────
  // Scenes
  // ─────────────────────────────────────────────────────────────────────────

  const sceneRTT = new THREE.Scene();
  const sceneScreen = new THREE.Scene();

  // ─────────────────────────────────────────────────────────────────────────
  // Lights
  // ─────────────────────────────────────────────────────────────────────────

  let light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(0, 0, 1).normalize();
  sceneRTT.add(light);

  light = new THREE.DirectionalLight(0xffd5d5, 4.5);
  light.position.set(0, 0, -1).normalize();
  sceneRTT.add(light);

  // ─────────────────────────────────────────────────────────────────────────
  // Render target (float)
  // ─────────────────────────────────────────────────────────────────────────

  const rtTexture = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Materials
  // ─────────────────────────────────────────────────────────────────────────

  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0.0 } },
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderPass1,
  });

  const materialScreen = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rtTexture.texture } },
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderScreen,
    depthWrite: false,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry
  // ─────────────────────────────────────────────────────────────────────────

  const plane = new THREE.PlaneGeometry(width, height);

  // Background quad for RTT scene
  const quad = new THREE.Mesh(plane, material);
  quad.position.z = -100;
  sceneRTT.add(quad);

  // Torus meshes
  const geometry = new THREE.TorusGeometry(100, 25, 15, 30);

  const mat1 = new THREE.MeshPhongMaterial({
    color: 0x9c9c9c,
    specular: 0xffaa00,
    shininess: 5,
  });
  const mat2 = new THREE.MeshPhongMaterial({
    color: 0x9c0000,
    specular: 0xff2200,
    shininess: 5,
  });

  const zmesh1 = new THREE.Mesh(geometry, mat1);
  zmesh1.position.set(0, 0, 100);
  zmesh1.scale.set(1.5, 1.5, 1.5);
  sceneRTT.add(zmesh1);

  const zmesh2 = new THREE.Mesh(geometry, mat2);
  zmesh2.position.set(0, 150, 100);
  zmesh2.scale.set(0.75, 0.75, 0.75);
  sceneRTT.add(zmesh2);

  // Screen quad to display the RTT result
  const screenQuad = new THREE.Mesh(plane, materialScreen);
  screenQuad.position.z = -100;
  sceneScreen.add(screenQuad);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer setup
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera: cameraRTT,
  });
  renderer.autoClear = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  let delta = 0.01;
  const readValues = new Float32Array(4);

  const animate = async () => {
    while (running) {
      const time = Date.now() * 0.0015;

      // Rotate torus meshes
      zmesh1.rotation.y = -time;
      zmesh2.rotation.y = -time + Math.PI / 2;

      // Oscillate time uniform between 0 and 1
      if (material.uniforms['time'].value > 1 || material.uniforms['time'].value < 0) {
        delta *= -1;
      }
      material.uniforms['time'].value += delta;

      // Clear and render
      renderer.clear();

      // Render first scene into float texture
      renderer.setRenderTarget(rtTexture);
      renderer.clear();
      renderer.render(sceneRTT, cameraRTT);

      // Render full screen quad with generated texture
      renderer.setRenderTarget(null);
      renderer.render(sceneScreen, cameraRTT);

      // Read float pixels from center of render target
      try {
        renderer.readRenderTargetPixels(
          rtTexture,
          Math.floor(width / 2), Math.floor(height / 2),
          1, 1,
          readValues
        );
      } catch (_e) {
        // readRenderTargetPixels may not be supported through the bridge
      }

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
    getReadValues: () => new Float32Array(readValues),
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
    { title: 'three.js webgl - read float buffer' },
    (a) => {
      a.window(
        { title: 'three.js webgl - read float buffer', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            const demo = await buildWebGLReadFloatBuffer(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
            console.log('Demo started. Read values:', demo.getReadValues());
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
