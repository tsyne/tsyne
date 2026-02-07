/**
 * three.js webgl - instanced billboards
 *
 * Port of: three/examples/webgl_buffergeometry_instancing_billboards.html
 *
 * Tests:
 * - InstancedBufferGeometry
 * - InstancedBufferAttribute for per-instance data
 * - RawShaderMaterial with custom vertex/fragment shaders
 * - Billboard effect (geometry always faces camera)
 * - HSL color conversion in shader
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

const vertexShader = `#version 300 es
precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

in vec3 position;
in vec2 uv;
in vec3 translate;

out vec2 vUv;
out float vScale;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(translate, 1.0);
  vec3 trTime = vec3(translate.x + time, translate.y + time, translate.z + time);
  float scale = sin(trTime.x * 2.1) + sin(trTime.y * 3.2) + sin(trTime.z * 4.3);
  vScale = scale;
  scale = scale * 10.0 + 10.0;
  mvPosition.xyz += position * scale;
  vUv = uv;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
in float vScale;

out vec4 fragColor;

// HSL to RGB conversion
vec3 HUEtoRGB(float H) {
  H = mod(H, 1.0);
  float R = abs(H * 6.0 - 3.0) - 1.0;
  float G = 2.0 - abs(H * 6.0 - 2.0);
  float B = 2.0 - abs(H * 6.0 - 4.0);
  return clamp(vec3(R, G, B), 0.0, 1.0);
}

vec3 HSLtoRGB(vec3 HSL) {
  vec3 RGB = HUEtoRGB(HSL.x);
  float C = (1.0 - abs(2.0 * HSL.z - 1.0)) * HSL.y;
  return (RGB - 0.5) * C + HSL.z;
}

void main() {
  // Circle shape using UV coordinates
  vec2 centered = vUv - 0.5;
  float dist = length(centered);
  if (dist > 0.5) discard;

  // Soft edge
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

  vec3 color = HSLtoRGB(vec3(vScale / 5.0, 1.0, 0.5));
  fragColor = vec4(color, alpha);
}
`;

export interface WebGLBufferGeometryInstancingBillboardsParams {
  width?: number;
  height?: number;
  particleCount?: number;
}

export interface WebGLBufferGeometryInstancingBillboardsDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLBufferGeometryInstancingBillboards(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryInstancingBillboardsParams = {}
): Promise<WebGLBufferGeometryInstancingBillboardsDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;
  const particleCount = params.particleCount ?? 10000; // Reduced from 75k

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
  camera.position.z = 1400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // Base geometry - hexagon (circle approximation)
  const circleGeometry = new THREE.CircleGeometry(1, 6);

  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = circleGeometry.index;
  geometry.attributes = circleGeometry.attributes;

  // Per-instance translations
  const translateArray = new Float32Array(particleCount * 3);

  for (let i = 0, i3 = 0; i < particleCount; i++, i3 += 3) {
    translateArray[i3 + 0] = Math.random() * 2 - 1;
    translateArray[i3 + 1] = Math.random() * 2 - 1;
    translateArray[i3 + 2] = Math.random() * 2 - 1;
  }

  geometry.setAttribute('translate', new THREE.InstancedBufferAttribute(translateArray, 3));

  const material = new THREE.RawShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    depthTest: true,
    depthWrite: true,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(500, 500, 500);
  scene.add(mesh);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.0005;
      currentTime = Date.now() - startTime;

      material.uniforms.time.value = time;

      mesh.rotation.x = time * 0.2;
      mesh.rotation.y = time * 0.4;

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
    { title: 'three.js webgl - instancing billboards' },
    (a) => {
      a.window({ title: 'three.js webgl - instancing billboards', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLBufferGeometryInstancingBillboards(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
