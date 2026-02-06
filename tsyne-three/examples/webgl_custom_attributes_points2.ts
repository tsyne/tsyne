/**
 * three.js webgl - custom attributes points 2
 *
 * Tests:
 * - ShaderMaterial with animated uniforms
 * - Per-vertex displacement
 * - Procedural noise-based animation
 * - Point cloud visualization
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
in float customSize;

out vec3 vColor;

void main() {
  vColor = customColor;

  // Animate position based on time
  vec3 pos = position;
  float wave = sin(pos.x * 0.05 + time) * cos(pos.z * 0.05 + time * 0.7);
  pos.y += wave * 30.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = customSize * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec3 vColor;

out vec4 fragColor;

void main() {
  // Soft circular point
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);
  if (dist > 0.5) discard;

  float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
  fragColor = vec4(vColor, alpha);
}
`;

export interface WebGLCustomAttributesPoints2Params {
  width?: number;
  height?: number;
}

export interface WebGLCustomAttributesPoints2Demo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLCustomAttributesPoints2(
  a: App,
  win: ITsyneWindow,
  params: WebGLCustomAttributesPoints2Params = {}
): Promise<WebGLCustomAttributesPoints2Demo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 10000);
  camera.position.set(0, 200, 400);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);

  // Create grid of points
  const gridSize = 50;
  const spacing = 10;
  const particleCount = gridSize * gridSize;

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const color = new THREE.Color();

  let idx = 0;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = (i - gridSize / 2) * spacing;
      const z = (j - gridSize / 2) * spacing;
      const y = 0;

      positions[idx * 3 + 0] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      // Color based on grid position
      const u = i / gridSize;
      const v = j / gridSize;
      color.setHSL(u * 0.3 + v * 0.3, 0.8, 0.5);
      color.toArray(colors, idx * 3);

      sizes[idx] = 8 + Math.random() * 8;

      idx++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('customSize', new THREE.BufferAttribute(sizes, 1));

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

  const points = new THREE.Points(geometry, material);
  scene.add(points);

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

      // Orbit camera
      camera.position.x = Math.sin(time * 0.3) * 400;
      camera.position.z = Math.cos(time * 0.3) * 400;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - custom attributes points 2' },
    (a) => {
      a.window({ title: 'three.js webgl - custom attributes points 2', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLCustomAttributesPoints2(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
