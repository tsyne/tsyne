/**
 * three.js webgl - memory test II
 *
 * Port of: three/examples/webgl_test_memory2.html
 *
 * Tests:
 * - ShaderMaterial creation and disposal every frame
 * - Memory management: programs should be cleaned up after dispose()
 * - 100 spheres with random ShaderMaterial each frame
 * - Custom vertex and fragment shaders with random colors
 *
 * Adaptations for Tsyne:
 * - Removes DOM/browser APIs
 * - Inlines shader source (no DOM script tags)
 * - Uses Tsyne rendering pipeline
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ==========================================================================
// Shaders (inlined from HTML script tags)
// ==========================================================================

const vertexShaderSource = `
void main() {

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;

}
`;

const fragmentShaderTemplate = `
void main() {

  if ( mod ( gl_FragCoord.x, 4.0001 ) < 1.0 || mod ( gl_FragCoord.y, 4.0001 ) < 1.0 )

    gl_FragColor = vec4( XXX, 1.0 );

  else

    gl_FragColor = vec4( 1.0 );

}
`;

// ==========================================================================
// Types
// ==========================================================================

export interface WebGLTestMemory2Params {
  width?: number;
  height?: number;
}

export interface WebGLTestMemory2Demo {
  stop: () => void;
  getTime: () => number;
}

// ==========================================================================
// Demo Builder
// ==========================================================================

/**
 * Build the WebGL Memory Test II demo
 *
 * Creates 100 spheres with random positions. Each frame, every sphere gets
 * a new ShaderMaterial with a random color in the fragment shader. After
 * rendering, old materials are disposed. This tests WebGL program memory
 * management.
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() and getTime() methods
 */
export async function buildWebGLTestMemory2(
  a: App,
  win: ITsyneWindow,
  params: WebGLTestMemory2Params = {}
): Promise<WebGLTestMemory2Demo> {
  const N = 100;
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // --------------------------------------------------------------------------
  // Scene setup (matches canonical three.js example)
  // --------------------------------------------------------------------------

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 10000);
  camera.position.z = 2000;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const geometry = new THREE.SphereGeometry(15, 64, 32);

  const meshes: any[] = [];

  for (let i = 0; i < N; i++) {
    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShaderSource,
      fragmentShader: generateFragmentShader(),
    });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.x = (0.5 - Math.random()) * 1000;
    mesh.position.y = (0.5 - Math.random()) * 1000;
    mesh.position.z = (0.5 - Math.random()) * 1000;

    scene.add(mesh);
    meshes.push(mesh);
  }

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });

  // --------------------------------------------------------------------------
  // Helper
  // --------------------------------------------------------------------------

  function generateFragmentShader() {
    return fragmentShaderTemplate.replace(
      'XXX',
      Math.random() + ',' + Math.random() + ',' + Math.random()
    );
  }

  // --------------------------------------------------------------------------
  // Animation loop
  // --------------------------------------------------------------------------

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;

      // Replace all materials with new ShaderMaterials (random colors)
      for (let i = 0; i < N; i++) {
        const mesh = meshes[i];
        mesh.material = new THREE.ShaderMaterial({
          vertexShader: vertexShaderSource,
          fragmentShader: generateFragmentShader(),
        });
      }

      renderer.render(scene, camera);

      // Dispose old materials to test memory cleanup
      for (let i = 0; i < N; i++) {
        const mesh = meshes[i];
        mesh.material.dispose();
      }

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

// ==========================================================================
// Main
// ==========================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - memory test II' },
    (a) => {
      a.window(
        { title: 'three.js webgl - memory test II', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLTestMemory2(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ==========================================================================
// Entry Point
// ==========================================================================

if (require.main === module) {
  main().catch(console.error);
}
