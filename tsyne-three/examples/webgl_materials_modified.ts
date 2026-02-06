/**
 * three.js webgl - materials - modified
 *
 * Port of the canonical three.js example: three/examples/webgl_materials_modified.html
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Uses procedural geometry (torus) instead of GLTF model to demonstrate
 *   material shader modification with twist effect
 * - Skips OrbitControls and Stats
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsModifiedParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsModifiedDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Materials Modified demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLMaterialsModified(
  a: App,
  win: Window,
  params: WebGLMaterialsModifiedParams = {}
): Promise<WebGLMaterialsModifiedDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  // Set up three.js with Tsyne bridge
  const bridge = (a as any).getBridge();
  const windowId = (win as any).id;

  const sendFn = async (msg: any) => {
    return await bridge.send(msg.type, msg.payload || {});
  };

  const { THREE } = await setupTsyneThreeJS(sendFn, {
    width,
    height,
    windowId,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(27, width / height, 0.1, 100);
  camera.position.z = 20;

  const scene = new THREE.Scene();

  // Create a function that builds a twisted material
  // This uses onBeforeCompile to inject custom vertex shader code
  function buildTwistMaterial(amount: number) {
    const material = new THREE.MeshNormalMaterial();

    material.onBeforeCompile = function (shader: any) {
      shader.uniforms.time = { value: 0 };

      shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          `float theta = sin( time + position.y ) / ${amount.toFixed(1)};`,
          'float c = cos( theta );',
          'float s = sin( theta );',
          'mat3 m = mat3( c, 0, s, 0, 1, 0, -s, 0, c );',
          'vec3 transformed = vec3( position ) * m;',
          'vNormal = vNormal * m;'
        ].join('\n')
      );

      material.userData.shader = shader;
    };

    // Make sure WebGLRenderer doesn't reuse a single program
    material.customProgramCacheKey = function () {
      return amount.toFixed(1);
    };

    return material;
  }

  // Use a torus geometry to showcase the twist effect
  // (original example loads a GLTF head model)
  const geometry = new THREE.TorusGeometry(1.5, 0.6, 32, 100);

  // Create two meshes with different twist amounts
  const mesh1 = new THREE.Mesh(geometry, buildTwistMaterial(2.0));
  mesh1.position.x = -3.5;
  mesh1.position.y = -0.5;
  scene.add(mesh1);

  const mesh2 = new THREE.Mesh(geometry, buildTwistMaterial(-2.0));
  mesh2.position.x = 3.5;
  mesh2.position.y = -0.5;
  scene.add(mesh2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1); // No window.devicePixelRatio in Node
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  let startTime = Date.now();

  const animate = async () => {
    while (running) {
      // Update time uniform for twist animation
      const time = (Date.now() - startTime) / 1000;

      scene.traverse((child: any) => {
        if (child.isMesh) {
          const shader = child.material.userData.shader;
          if (shader) {
            shader.uniforms.time.value = time;
          }
        }
      });

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  };

  // Start animation
  animate();

  return {
    stop: () => {
      running = false;
    },
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
    { title: 'three.js webgl - materials - modified' },
    (a) => {
      a.window(
        { title: 'three.js webgl - materials - modified', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLMaterialsModified(a, win, { width: WIDTH, height: HEIGHT });
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
