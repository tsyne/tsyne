/**
 * three.js webgl - custom attributes points
 *
 * Port of: three/examples/webgl_custom_attributes_points.html
 *
 * Tests:
 * - ShaderMaterial with custom attributes
 * - Per-particle size attribute
 * - Per-particle customColor attribute
 * - Dynamic size animation
 * - gl_PointSize in vertex shader
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

const vertexShader = `#version 300 es
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 position;
in float size;
in vec3 customColor;

out vec3 vColor;

void main() {
  vColor = customColor;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

uniform vec3 color;

in vec3 vColor;

out vec4 fragColor;

void main() {
  // Draw circular point
  vec2 centered = gl_PointCoord - 0.5;
  float dist = length(centered);
  if (dist > 0.5) discard;

  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  fragColor = vec4(color * vColor, alpha);
}
`;

export interface WebGLCustomAttributesPointsParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLCustomAttributesPointsDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLCustomAttributesPoints(
  a: App,
  win: ITsyneWindow,
  params: WebGLCustomAttributesPointsParams = {}
): Promise<WebGLCustomAttributesPointsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const particleCount = params.particleCount ?? 10000; // Reduced from 100k

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 10000);
  camera.position.z = 300;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const radius = 200;

  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const vertex = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    vertex.x = (Math.random() * 2 - 1) * radius;
    vertex.y = (Math.random() * 2 - 1) * radius;
    vertex.z = (Math.random() * 2 - 1) * radius;
    vertex.toArray(positions, i * 3);

    // Color based on position
    if (vertex.x < 0) {
      color.setHSL(0.5 + 0.1 * (i / particleCount), 0.7, 0.5);
    } else {
      color.setHSL(0.0 + 0.1 * (i / particleCount), 0.9, 0.5);
    }
    color.toArray(colors, i * 3);

    sizes[i] = 10;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0xffffff) },
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
      const time = (Date.now() - startTime) * 0.005;
      currentTime = Date.now() - startTime;

      sphere.rotation.z = 0.01 * time;

      // Animate particle sizes
      const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
      for (let i = 0; i < sizeAttr.array.length; i++) {
        (sizeAttr.array as Float32Array)[i] = 14 + 13 * Math.sin(0.1 * i + time);
      }
      sizeAttr.needsUpdate = true;

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
    { title: 'three.js webgl - custom attributes points' },
    (a) => {
      a.window({ title: 'three.js webgl - custom attributes points', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLCustomAttributesPoints(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
