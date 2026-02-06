/**
 * three.js webgl - custom attributes points 3
 *
 * Tests:
 * - Spherical point distribution
 * - Per-point phase offset for animation
 * - Pulsating size animation
 * - Color shifting based on depth
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

const vertexShader = `#version 300 es
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

in vec3 position;
in vec3 customColor;
in float phase;

out vec3 vColor;
out float vDepth;

void main() {
  vColor = customColor;

  // Pulsate position outward
  float pulse = 1.0 + 0.1 * sin(time * 3.0 + phase);
  vec3 pos = position * pulse;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vDepth = -mvPosition.z;

  // Size based on phase
  float size = 8.0 + 4.0 * sin(time * 2.0 + phase * 2.0);
  gl_PointSize = size * (150.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

uniform float time;

in vec3 vColor;
in float vDepth;

out vec4 fragColor;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);
  if (dist > 0.5) discard;

  // Glow effect
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  glow = pow(glow, 1.5);

  // Shift color hue based on depth and time
  vec3 color = vColor;
  float hueShift = sin(time + vDepth * 0.01) * 0.1;

  fragColor = vec4(color * glow, glow);
}
`;

export interface WebGLCustomAttributesPoints3Params {
  width?: number;
  height?: number;
}

export interface WebGLCustomAttributesPoints3Demo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLCustomAttributesPoints3(
  a: App,
  win: ITsyneWindow,
  params: WebGLCustomAttributesPoints3Params = {}
): Promise<WebGLCustomAttributesPoints3Demo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
  camera.position.z = 400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Create spherical point distribution
  const particleCount = 5000;
  const radius = 150;

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const phases = new Float32Array(particleCount);

  const color = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    // Fibonacci sphere distribution
    const y = 1 - (i / (particleCount - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = ((i % particleCount) + 0.5) / particleCount * Math.PI * (1 + Math.sqrt(5));

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    positions[i * 3 + 0] = x * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = z * radius;

    // Color based on position on sphere
    color.setHSL((y + 1) * 0.25, 0.9, 0.6);
    color.toArray(colors, i * 3);

    // Random phase for animation offset
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
  });

  const sphere = new THREE.Points(geometry, material);
  scene.add(sphere);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      material.uniforms.time.value = time;

      sphere.rotation.y = time * 0.2;
      sphere.rotation.x = Math.sin(time * 0.3) * 0.3;

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) await gl.flush();

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  animate();

  return {
    stop: () => { running = false; },
    getTime: () => currentTime,
  };
}

async function main() {
  const WIDTH = 800, HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - custom attributes points 3' },
    (a) => {
      a.window({ title: 'three.js webgl - custom attributes points 3', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLCustomAttributesPoints3(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
