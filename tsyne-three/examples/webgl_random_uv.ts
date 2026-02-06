/**
 * three.js webgl - random UV
 *
 * Simplified port of three.js example: three/examples/webgl_random_uv.html
 *
 * This example demonstrates a technique to break texture repetition by
 * randomly offsetting UV coordinates. The "textureNoTile" algorithm samples
 * the texture multiple times with different offsets and blends them together,
 * eliminating visible tiling patterns.
 *
 * Adaptations for Tsyne:
 * - Uses RawShaderMaterial instead of onBeforeCompile for custom shaders
 * - Simplified to use plane geometry instead of GLTF models
 * - No HDR environment mapping or GUI controls
 * - Uses available jade.jpg and noise.png textures
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLRandomUVParams {
  width?: number;
  height?: number;
}

export interface WebGLRandomUVDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Shader Code
// ═══════════════════════════════════════════════════════════════════════════

// GLSL 300 ES syntax for converter compatibility
const vertexShader = `#version 300 es
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision mediump float;
precision mediump int;

uniform sampler2D map;
uniform sampler2D noiseMap;
uniform float enableRandom;
uniform float useNoiseMap;

in vec2 vUv;

out vec4 fragColor;

// Simple hash function for random values
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Noise function using direct calculation
float directNoise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);

  float res = mix(
    mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
    mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
    u.y
  );
  return res * res;
}

float sum(vec4 v) {
  return v.x + v.y + v.z;
}

// Random UV tiling algorithm (simplified version without derivatives)
vec4 textureNoTile(sampler2D mapper, vec2 uv) {
  // Sample variation pattern
  float k = 0.0;
  if (useNoiseMap == 1.0) {
    k = texture(noiseMap, 0.005 * uv).x;
  } else {
    k = directNoise(uv);
  }

  // Compute index
  float index = k * 8.0;
  float f = fract(index);
  float ia = floor(index);
  float ib = ia + 1.0;

  // Offsets for the different virtual patterns
  vec2 offa = sin(vec2(3.0, 7.0) * ia);
  vec2 offb = sin(vec2(3.0, 7.0) * ib);

  // Sample the two closest virtual patterns
  vec4 cola = texture(mapper, uv + offa);
  vec4 colb = texture(mapper, uv + offb);

  // Interpolate between the two virtual patterns
  return mix(cola, colb, smoothstep(0.2, 0.8, f - 0.1 * sum(cola - colb)));
}

void main() {
  vec4 texColor;

  if (enableRandom == 1.0) {
    // Use random UV sampling
    texColor = textureNoTile(map, vUv * 20.0);
  } else {
    // Regular tiled texture
    texColor = texture(map, vUv * 20.0);
  }

  fragColor = texColor;
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Random UV demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLRandomUV(
  a: App,
  win: ITsyneWindow,
  params: WebGLRandomUVParams = {}
): Promise<WebGLRandomUVDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 2, 5);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x444444);

  // Load textures
  const jadePath = path.resolve(__dirname, '../../three/examples/textures/jade.jpg');
  const noisePath = path.resolve(__dirname, '../../three/examples/textures/noise.png');

  console.log('[webgl_random_uv] Loading jade texture from:', jadePath);
  console.log('[webgl_random_uv] Loading noise texture from:', noisePath);

  const jadeTexture = await loadTexture(THREE, jadePath);
  jadeTexture.wrapS = jadeTexture.wrapT = THREE.RepeatWrapping;

  const noiseTexture = await loadTexture(THREE, noisePath);

  // ─────────────────────────────────────────────────────────────────────────
  // Left plane: Regular tiled texture (enableRandom = 0)
  // ─────────────────────────────────────────────────────────────────────────

  const planeGeometryLeft = new THREE.PlaneGeometry(3, 3);
  const materialLeft = new THREE.RawShaderMaterial({
    uniforms: {
      map: { value: jadeTexture },
      noiseMap: { value: noiseTexture },
      enableRandom: { value: 0.0 }, // Disabled
      useNoiseMap: { value: 1.0 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  const meshLeft = new THREE.Mesh(planeGeometryLeft, materialLeft);
  meshLeft.position.set(-2, 0, 0);
  scene.add(meshLeft);

  // ─────────────────────────────────────────────────────────────────────────
  // Right plane: Random UV tiling (enableRandom = 1)
  // ─────────────────────────────────────────────────────────────────────────

  const planeGeometryRight = new THREE.PlaneGeometry(3, 3);
  const materialRight = new THREE.RawShaderMaterial({
    uniforms: {
      map: { value: jadeTexture },
      noiseMap: { value: noiseTexture },
      enableRandom: { value: 1.0 }, // Enabled
      useNoiseMap: { value: 1.0 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  const meshRight = new THREE.Mesh(planeGeometryRight, materialRight);
  meshRight.position.set(2, 0, 0);
  scene.add(meshRight);

  // Add directional light for visual context
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);

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

  const animate = async () => {
    while (running) {
      // Slowly rotate both planes
      meshLeft.rotation.y += 0.002;
      meshRight.rotation.y += 0.002;

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
    { title: 'three.js webgl - random UV' },
    (a) => {
      a.window(
        { title: 'three.js webgl - random UV', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLRandomUV(a, win, { width: WIDTH, height: HEIGHT });
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
