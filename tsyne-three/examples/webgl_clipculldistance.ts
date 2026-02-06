/**
 * three.js webgl - clip cull distance
 *
 * Port of: three/examples/webgl_clipculldistance.html
 *
 * Tests:
 * - ShaderMaterial with WEBGL_clip_cull_distance extension
 * - gl_ClipDistance vertex shader clipping
 * - Uint8BufferAttribute with normalized vertex colors
 * - Dynamic uniform updates (time-based oscillating clip plane)
 * - BufferGeometry with random triangles
 *
 * Adaptations for Tsyne:
 * - Removes OrbitControls, Stats, and resize handler
 * - Inlines shader source (no DOM script tags)
 * - Skips WEBGL_clip_cull_distance extension check (desktop GL has native support)
 * - Uses Tsyne rendering pipeline
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ===============================================================================
// Shaders (inlined from HTML script tags)
// ===============================================================================

const vertexShaderSource = `
uniform float time;

varying vec4 vColor;

void main() {

  vColor = color;

  #ifdef USE_CLIP_DISTANCE
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    gl_ClipDistance[ 0 ] = worldPosition.x - sin( time ) * ( 0.5 );
  #endif

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
`;

const fragmentShaderSource = `
varying vec4 vColor;

void main() {

  gl_FragColor = vColor;

}
`;

// ===============================================================================
// Types
// ===============================================================================

export interface WebGLClipCullDistanceParams {
  width?: number;
  height?: number;
}

export interface WebGLClipCullDistanceDemo {
  stop: () => void;
}

// ===============================================================================
// Demo Builder
// ===============================================================================

/**
 * Build the WebGL Clip Cull Distance demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLClipCullDistance(
  a: App,
  win: Window,
  params: WebGLClipCullDistanceParams = {}
): Promise<WebGLClipCullDistanceDemo> {
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

  // ---------------------------------------------------------------------------
  // Scene setup
  // ---------------------------------------------------------------------------

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 10);
  camera.position.z = 2;

  const scene = new THREE.Scene();

  // ---------------------------------------------------------------------------
  // Renderer setup
  // ---------------------------------------------------------------------------

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // Enable clip distance in the GL context
  // In desktop OpenGL, GL_CLIP_DISTANCE0 = 0x3000
  // In WebGL, WEBGL_clip_cull_distance extension provides CLIP_DISTANCE0_WEBGL = 0x3000
  const gl = renderer.getContext();
  if (gl?.enable) {
    gl.enable(0x3000); // GL_CLIP_DISTANCE0
  }

  // ---------------------------------------------------------------------------
  // Geometry - random triangles
  // ---------------------------------------------------------------------------

  const vertexCount = 200 * 3;

  const geometry = new THREE.BufferGeometry();

  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < vertexCount; i++) {
    // Adding x, y, z
    positions.push(Math.random() - 0.5);
    positions.push(Math.random() - 0.5);
    positions.push(Math.random() - 0.5);

    // Adding r, g, b, a
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
    colors.push(Math.random() * 255);
  }

  const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
  const colorAttribute = new THREE.Uint8BufferAttribute(colors, 4);
  colorAttribute.normalized = true;

  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('color', colorAttribute);

  // ---------------------------------------------------------------------------
  // Material - ShaderMaterial with clip distance support
  // ---------------------------------------------------------------------------

  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 1.0 },
    },
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    side: THREE.DoubleSide,
    transparent: true,
    vertexColors: true,
  });

  material.extensions.clipCullDistance = true;

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  let running = true;
  const startTime = Date.now();

  const animate = async () => {
    while (running) {
      const elapsed = (Date.now() - startTime) / 1000;

      // Update time uniform for clip plane oscillation
      material.uniforms.time.value = elapsed;

      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const glCtx = renderer.getContext();
      if (glCtx?.flush) {
        await glCtx.flush();
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

// ===============================================================================
// Main
// ===============================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - clip cull distance' },
    (a) => {
      a.window(
        { title: 'three.js webgl - clip cull distance', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLClipCullDistance(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

// ===============================================================================
// Entry Point
// ===============================================================================

if (require.main === module) {
  main().catch(console.error);
}
