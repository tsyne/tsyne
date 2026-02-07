/**
 * three.js webgl - buffergeometry selective draw
 *
 * Port of: three/examples/webgl_buffergeometry_selective_draw.html
 *
 * Tests:
 * - ShaderMaterial with custom visibility attribute
 * - Fragment shader discard for selective rendering
 * - Dynamic attribute updates
 * - LineSegments geometry
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// GLSL 300 ES shaders
const vertexShader = `#version 300 es
precision mediump float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 position;
in float visible;
in vec3 vertColor;

out float vVisible;
out vec3 vColor;

void main() {
  vColor = vertColor;
  vVisible = visible;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision mediump float;

in float vVisible;
in vec3 vColor;

out vec4 fragColor;

void main() {
  if (vVisible > 0.0) {
    fragColor = vec4(vColor, 1.0);
  } else {
    discard;
  }
}
`;

export interface WebGLBufferGeometrySelectiveDrawParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometrySelectiveDrawDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLBufferGeometrySelectiveDraw(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometrySelectiveDrawParams = {}
): Promise<WebGLBufferGeometrySelectiveDrawDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10);
  camera.position.z = 3.5;

  // Create line geometry radiating from center
  const numLat = 100;
  const numLng = 200;
  const radius = 1.0;

  const geometry = new THREE.BufferGeometry();
  const linePositions = new Float32Array(numLat * numLng * 3 * 2);
  const lineColors = new Float32Array(numLat * numLng * 3 * 2);
  const visible = new Float32Array(numLat * numLng * 2);

  for (let i = 0; i < numLat; ++i) {
    for (let j = 0; j < numLng; ++j) {
      const lat = (Math.random() * Math.PI) / 50.0 + (i / numLat) * Math.PI;
      const lng = (Math.random() * Math.PI) / 50.0 + (j / numLng) * 2 * Math.PI;

      const index = i * numLng + j;

      // Line from center to sphere surface
      linePositions[index * 6 + 0] = 0;
      linePositions[index * 6 + 1] = 0;
      linePositions[index * 6 + 2] = 0;
      linePositions[index * 6 + 3] = radius * Math.sin(lat) * Math.cos(lng);
      linePositions[index * 6 + 4] = radius * Math.cos(lat);
      linePositions[index * 6 + 5] = radius * Math.sin(lat) * Math.sin(lng);

      // Colors based on latitude
      const color = new THREE.Color();
      color.setHSL(lat / Math.PI, 1.0, 0.2);
      lineColors[index * 6 + 0] = color.r;
      lineColors[index * 6 + 1] = color.g;
      lineColors[index * 6 + 2] = color.b;

      color.setHSL(lat / Math.PI, 1.0, 0.7);
      lineColors[index * 6 + 3] = color.r;
      lineColors[index * 6 + 4] = color.g;
      lineColors[index * 6 + 5] = color.b;

      // All visible initially
      visible[index * 2 + 0] = 1.0;
      visible[index * 2 + 1] = 1.0;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  geometry.setAttribute('vertColor', new THREE.BufferAttribute(lineColors, 3));
  geometry.setAttribute('visible', new THREE.BufferAttribute(visible, 1));
  geometry.computeBoundingSphere();

  const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  const mesh = new THREE.LineSegments(geometry, shaderMaterial);
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
  let cullTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      mesh.rotation.x = time * 0.25;
      mesh.rotation.y = time * 0.5;

      // Periodically cull random lines
      cullTime += 0.016;
      if (cullTime > 2.0) {
        cullTime = 0;
        const visAttr = geometry.getAttribute('visible') as THREE.BufferAttribute;
        for (let i = 0; i < visAttr.array.length; i += 2) {
          if (Math.random() > 0.9) {
            (visAttr.array as Float32Array)[i + 0] = Math.random() > 0.5 ? 1 : 0;
            (visAttr.array as Float32Array)[i + 1] = (visAttr.array as Float32Array)[i + 0];
          }
        }
        visAttr.needsUpdate = true;
      }

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
    { title: 'three.js webgl - buffergeometry selective draw' },
    (a) => {
      a.window({ title: 'three.js webgl - buffergeometry selective draw', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLBufferGeometrySelectiveDraw(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
