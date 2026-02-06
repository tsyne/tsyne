/**
 * three.js webgl - matcap materials
 *
 * Port of: three/examples/webgl_materials_matcap.html
 *
 * Tests:
 * - Matcap material shading technique
 * - Procedural matcap texture generation
 * - View-dependent shading
 *
 * Adaptations for Tsyne:
 * - Uses procedurally generated matcap textures
 * - Multiple matcap styles demonstration
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsMatcapParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsMatcapDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsMatcap(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsMatcapParams = {}
): Promise<WebGLMaterialsMatcapDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Generate procedural matcap textures
  // ─────────────────────────────────────────────────────────────────────────

  function generateMatcap(
    colorTop: [number, number, number],
    colorBottom: [number, number, number],
    colorHighlight: [number, number, number],
    size: number = 256
  ): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;

        // Convert to -1 to 1 range (matcap coordinates)
        const nx = (x / size) * 2 - 1;
        const ny = (y / size) * 2 - 1;
        const d2 = nx * nx + ny * ny;

        if (d2 > 1) {
          // Outside the sphere
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        } else {
          // Calculate z (sphere surface)
          const nz = Math.sqrt(1 - d2);

          // Gradient based on y (top to bottom)
          const t = (ny + 1) * 0.5;

          // Highlight based on z (facing camera)
          const highlight = Math.pow(nz, 4);

          // Mix colors
          const r = colorBottom[0] + (colorTop[0] - colorBottom[0]) * t;
          const g = colorBottom[1] + (colorTop[1] - colorBottom[1]) * t;
          const b = colorBottom[2] + (colorTop[2] - colorBottom[2]) * t;

          // Add highlight
          data[i] = Math.min(255, r + (colorHighlight[0] - r) * highlight);
          data[i + 1] = Math.min(255, g + (colorHighlight[1] - g) * highlight);
          data[i + 2] = Math.min(255, b + (colorHighlight[2] - b) * highlight);
          data[i + 3] = 255;
        }
      }
    }

    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    return texture;
  }

  // Create different matcap textures
  const matcapGold = generateMatcap([255, 220, 100], [100, 60, 0], [255, 255, 200]);
  const matcapChrome = generateMatcap([200, 200, 210], [50, 50, 60], [255, 255, 255]);
  const matcapClay = generateMatcap([180, 140, 120], [80, 60, 50], [220, 200, 180]);
  const matcapPlastic = generateMatcap([255, 100, 100], [100, 20, 20], [255, 200, 200]);
  const matcapPearl = generateMatcap([220, 230, 255], [150, 160, 180], [255, 255, 255]);
  const matcapJade = generateMatcap([100, 200, 150], [20, 80, 50], [200, 255, 220]);

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
  camera.position.z = 600;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);

  // Custom matcap shader
  const createMatcapMaterial = (matcapTexture: THREE.DataTexture) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        matcap: { value: matcapTexture },
      },
      vertexShader: `
        varying vec2 vMatcapUV;

        void main() {
          vec3 viewNormal = normalize(normalMatrix * normal);
          vMatcapUV = viewNormal.xy * 0.5 + 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D matcap;
        varying vec2 vMatcapUV;

        void main() {
          vec4 matcapColor = texture2D(matcap, vMatcapUV);
          gl_FragColor = matcapColor;
        }
      `,
    });
  };

  // Create geometries
  const torusKnotGeometry = new THREE.TorusKnotGeometry(40, 15, 100, 32);
  const sphereGeometry = new THREE.SphereGeometry(50, 64, 32);

  // Row 1: Torus knots with different matcaps
  const matcaps = [matcapGold, matcapChrome, matcapClay];
  const matcapMaterials: THREE.ShaderMaterial[] = [];

  for (let i = 0; i < 3; i++) {
    const material = createMatcapMaterial(matcaps[i]);
    matcapMaterials.push(material);

    const mesh = new THREE.Mesh(torusKnotGeometry, material);
    mesh.position.x = (i - 1) * 200;
    mesh.position.y = 80;
    scene.add(mesh);
  }

  // Row 2: Spheres with different matcaps
  const matcaps2 = [matcapPlastic, matcapPearl, matcapJade];

  for (let i = 0; i < 3; i++) {
    const material = createMatcapMaterial(matcaps2[i]);
    matcapMaterials.push(material);

    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.x = (i - 1) * 200;
    mesh.position.y = -80;
    scene.add(mesh);
  }

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
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate all meshes
      scene.children.forEach((child, i) => {
        if ((child as any).isMesh) {
          child.rotation.y = time * 0.3;
          child.rotation.x = time * 0.2;
        }
      });

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
    { title: 'three.js webgl - matcap materials' },
    (a) => {
      a.window(
        { title: 'three.js webgl - matcap materials', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsMatcap(a, win, { width: WIDTH, height: HEIGHT });
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
