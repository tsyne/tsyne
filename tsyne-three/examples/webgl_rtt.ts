/**
 * three.js webgl - render to texture
 *
 * Based on: https://threejs.org/examples/webgl_rtt.html
 *
 * Tests:
 * - WebGLRenderTarget (render to texture)
 * - Multiple scenes and cameras
 * - Using rendered texture as material map
 * - Shader uniforms for procedural patterns
 * - Orthographic camera for screen-space rendering
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLRTTParams {
  width?: number;
  height?: number;
}

export interface WebGLRTTDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLRTT(
  a: App,
  win: ITsyneWindow,
  params: WebGLRTTParams = {}
): Promise<WebGLRTTDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Shaders
  // ─────────────────────────────────────────────────────────────────────────

  const vertexShader = `#version 300 es
precision mediump float;

in vec3 position;
in vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

  const fragmentShaderPass1 = `#version 300 es
precision mediump float;

in vec2 vUv;

uniform float time;

out vec4 fragColor;

void main() {
  float r = vUv.x;
  if (vUv.y < 0.5) r = 0.0;
  float g = vUv.y;
  if (vUv.x < 0.5) g = 0.0;

  fragColor = vec4(r, g, time, 1.0);
}
`;

  const fragmentShaderScreen = `#version 300 es
precision mediump float;

in vec2 vUv;

uniform sampler2D tDiffuse;

out vec4 fragColor;

void main() {
  fragColor = texture(tDiffuse, vUv);
}
`;

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  // Main scene camera (for viewing the final result)
  const camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
  camera.position.z = 100;

  // RTT camera (orthographic for full-screen quad)
  const cameraRTT = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    1,
    1000
  );
  cameraRTT.position.z = 500;

  // Scenes
  const scene = new THREE.Scene();
  const sceneRTT = new THREE.Scene();
  const sceneScreen = new THREE.Scene();

  // Lights for RTT scene
  let light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(0, 0, 1).normalize();
  sceneRTT.add(light);

  light = new THREE.DirectionalLight(0xffd5d5, 4.5);
  light.position.set(0, 0, -1).normalize();
  sceneRTT.add(light);

  // Render target
  const rtTexture = new THREE.WebGLRenderTarget(width, height);

  // Procedural pattern material
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0.0 } },
    vertexShader: vertexShader,
    fragmentShader: fragmentShaderPass1,
  });

  // Screen material (displays render target texture)
  const materialScreen = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rtTexture.texture } },
    vertexShader: vertexShader,
    fragmentShader: fragmentShaderScreen,
    depthWrite: false,
  });

  // Full-screen quad for RTT
  const planeGeometry = new THREE.PlaneGeometry(width, height);
  const quad = new THREE.Mesh(planeGeometry, material);
  quad.position.z = -100;
  sceneRTT.add(quad);

  // Rotating torus meshes in RTT scene
  const torusGeometry = new THREE.TorusGeometry(100, 25, 15, 30);

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

  const zmesh1 = new THREE.Mesh(torusGeometry, mat1);
  zmesh1.position.set(0, 0, 100);
  zmesh1.scale.set(1.5, 1.5, 1.5);
  sceneRTT.add(zmesh1);

  const zmesh2 = new THREE.Mesh(torusGeometry, mat2);
  zmesh2.position.set(0, 150, 100);
  zmesh2.scale.set(0.75, 0.75, 0.75);
  sceneRTT.add(zmesh2);

  // Screen quad (displays RTT result)
  const quadScreen = new THREE.Mesh(planeGeometry, materialScreen);
  quadScreen.position.z = -100;
  sceneScreen.add(quadScreen);

  // Grid of spheres in main scene using RTT as texture
  const n = 5;
  const sphereGeometry = new THREE.SphereGeometry(10, 64, 32);
  const material2 = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: rtTexture.texture,
  });

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(sphereGeometry, material2);

      mesh.position.x = (i - (n - 1) / 2) * 20;
      mesh.position.y = (j - (n - 1) / 2) * 20;
      mesh.position.z = 0;

      mesh.rotation.y = -Math.PI / 2;

      scene.add(mesh);
    }
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.autoClear = false;

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let delta = 0.01;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.0015;
      currentTime = Date.now() - startTime;

      // Rotate torus meshes
      zmesh1.rotation.y = -time;
      zmesh2.rotation.y = -time + Math.PI / 2;

      // Oscillate time uniform
      if (material.uniforms['time'].value > 1 || material.uniforms['time'].value < 0) {
        delta *= -1;
      }
      material.uniforms['time'].value += delta;

      // Render first scene into texture
      renderer.setRenderTarget(rtTexture);
      renderer.clear();
      renderer.render(sceneRTT, cameraRTT);

      // Render full screen quad with generated texture
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(sceneScreen, cameraRTT);

      // Render second scene to screen (using RTT as texture)
      renderer.render(scene, camera);

      // Flush GL commands
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - render to texture' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl - render to texture',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLRTT(a, win, { width: WIDTH, height: HEIGHT });
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
