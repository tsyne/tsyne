/**
 * Simple test - MeshBasicMaterial with vertex colors
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

export interface VertexColorsTestDemo {
  stop: () => void;
  getTime: () => number;
}

export async function buildVertexColorsTest(
  a: App,
  win: ITsyneWindow,
  params: { width?: number; height?: number } = {}
): Promise<VertexColorsTestDemo> {
  const width = params.width ?? 400;
  const height = params.height ?? 300;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // Scene setup
  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.z = 2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  // Create box geometry
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  
  // Add vertex colors - red, green, blue, yellow, cyan, magenta for each face
  const colors = [];
  const faceColors = [
    [1, 0, 0], // red
    [0, 1, 0], // green
    [0, 0, 1], // blue
    [1, 1, 0], // yellow
    [0, 1, 1], // cyan
    [1, 0, 1], // magenta
  ];
  
  // BoxGeometry has 6 faces, 2 triangles each, 3 vertices each = 36 vertices
  const positionAttribute = geometry.attributes.position;
  for (let i = 0; i < positionAttribute.count; i++) {
    const faceIndex = Math.floor(i / 6); // 6 vertices per face
    const color = faceColors[faceIndex % 6];
    colors.push(color[0], color[1], color[2]);
  }
  
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  // MeshBasicMaterial with vertex colors
  const material = new THREE.MeshBasicMaterial({ 
    vertexColors: true,
  });

  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  let running = true;
  let time = 0;

  const animate = async () => {
    while (running) {
      time += 16;
      
      cube.rotation.x = time * 0.001;
      cube.rotation.y = time * 0.0015;

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

  animate();

  return {
    stop: () => { running = false; },
    getTime: () => time,
  };
}

// Standalone entry point
if (require.main === module) {
  app(resolveTransport(), { title: 'Vertex Colors Test', shutdownStrategy: standaloneShutdownStrategy() }, async (a) => {
    a.window({ title: 'Vertex Colors Test', width: 450, height: 350 }, async (win) => {
      await buildVertexColorsTest(a, win);
      win.show();
    });
  });
}
