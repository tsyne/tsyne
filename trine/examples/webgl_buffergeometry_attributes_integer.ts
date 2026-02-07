/**
 * three.js webgl - buffergeometry attributes integer
 *
 * Tests:
 * - Integer buffer attributes
 * - Uint32BufferAttribute for indices
 * - Int32BufferAttribute for data
 * - Integer uniforms in shader
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

const vertexShader = `#version 300 es
precision highp float;
precision highp int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;

in vec3 position;
in vec3 color;
in int cellIndex;

out vec3 vColor;
flat out int vCellIndex;

void main() {
  vColor = color;
  vCellIndex = cellIndex;

  // Offset position based on cell index
  vec3 pos = position;
  float offset = float(cellIndex) * 0.1;
  pos.y += sin(time + offset) * 10.0;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;

uniform float time;

in vec3 vColor;
flat in int vCellIndex;

out vec4 fragColor;

void main() {
  // Modulate color based on cell index
  float cellMod = float(vCellIndex % 10) / 10.0;
  vec3 color = vColor * (0.5 + 0.5 * sin(time + cellMod * 6.28));
  fragColor = vec4(color, 1.0);
}
`;

export interface WebGLBufferGeometryAttributesIntegerParams {
  width?: number;
  height?: number;
}

export interface WebGLBufferGeometryAttributesIntegerDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildWebGLBufferGeometryAttributesInteger(
  a: App,
  win: ITsyneWindow,
  params: WebGLBufferGeometryAttributesIntegerParams = {}
): Promise<WebGLBufferGeometryAttributesIntegerDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101020);

  // Create grid of boxes using indexed geometry
  const gridSize = 20;
  const cellSize = 15;
  const spacing = 20;

  const positions: number[] = [];
  const colors: number[] = [];
  const cellIndices: number[] = [];
  const indices: number[] = [];

  let vertexIndex = 0;
  const color = new THREE.Color();

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const cellIndex = i * gridSize + j;

      const x = (i - gridSize / 2) * spacing;
      const z = (j - gridSize / 2) * spacing;

      // Create a quad (2 triangles)
      const half = cellSize / 2;

      // 4 vertices for the quad
      const baseVertex = vertexIndex;

      positions.push(x - half, 0, z - half);
      positions.push(x + half, 0, z - half);
      positions.push(x + half, 0, z + half);
      positions.push(x - half, 0, z + half);

      // Color based on grid position
      color.setHSL((i / gridSize) * 0.5 + (j / gridSize) * 0.3, 0.8, 0.5);
      for (let v = 0; v < 4; v++) {
        color.toArray(colors, (baseVertex + v) * 3);
        cellIndices.push(cellIndex);
      }

      // Two triangles
      indices.push(baseVertex, baseVertex + 1, baseVertex + 2);
      indices.push(baseVertex, baseVertex + 2, baseVertex + 3);

      vertexIndex += 4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('cellIndex', new THREE.Int32BufferAttribute(cellIndices, 1));
  geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
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
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      material.uniforms.time.value = time;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.3) * 400;
      camera.position.z = Math.cos(time * 0.3) * 400;
      camera.position.y = 200 + Math.sin(time * 0.2) * 100;
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
    { title: 'three.js webgl - buffergeometry attributes integer' },
    (a) => {
      a.window({ title: 'three.js webgl - buffergeometry attributes integer', width: WIDTH, height: HEIGHT }, (win) => {
        win.setContent(() => { a.label('Initializing three.js...'); });
        win.show();
        setTimeout(async () => {
          await buildWebGLBufferGeometryAttributesInteger(a, win, { width: WIDTH, height: HEIGHT });
        }, 100);
      });
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
