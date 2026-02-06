/**
 * three.js webgl - buffergeometry attributes none
 *
 * Tests:
 * - BufferGeometry without position attribute
 * - RawShaderMaterial generating positions in vertex shader
 * - gl_VertexID based positioning
 * - Procedural geometry generation in shader
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

const vertexShader = `#version 300 es
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform float count;

out vec3 vColor;

// Simple hash function for pseudo-random
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  float id = float(gl_VertexID);

  // Generate position from vertex ID
  float angle = id / count * 3.14159265 * 2.0 * 10.0;
  float radius = 50.0 + 30.0 * sin(id * 0.1 + time);
  float height = (id / count - 0.5) * 200.0;

  vec3 position;
  position.x = cos(angle + time * 0.5) * radius;
  position.y = height + sin(time + id * 0.05) * 20.0;
  position.z = sin(angle + time * 0.5) * radius;

  // Color based on position
  vColor = vec3(
    0.5 + 0.5 * sin(id * 0.1),
    0.5 + 0.5 * cos(id * 0.15 + 2.0),
    0.5 + 0.5 * sin(id * 0.2 + 4.0)
  );

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = 4.0 * (300.0 / -mvPosition.z);
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec3 vColor;

out vec4 fragColor;

void main() {
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);
  if (dist > 0.5) discard;

  float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
  fragColor = vec4(vColor, alpha);
}
`;

export interface WebGLBufferGeometryAttributesNoneParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryAttributesNoneDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLBufferGeometryAttributesNone(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryAttributesNoneParams = {}
): Promise<WebGLBufferGeometryAttributesNoneDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  const pointCount = 10000;

  // Create geometry with just a draw range, no actual attributes
  // We'll use a dummy position attribute since three.js requires it
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pointCount * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, pointCount);

  const material = new THREE.RawShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      count: { value: pointCount },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending,
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
      camera.position.x = Math.sin(time * 0.2) * 350;
      camera.position.z = Math.cos(time * 0.2) * 350;
      camera.position.y = Math.sin(time * 0.15) * 100;
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
    { title: 'three.js webgl - buffergeometry attributes none' },
    (a) => {
      a.window({ title: 'three.js webgl - buffergeometry attributes none', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLBufferGeometryAttributesNone(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
