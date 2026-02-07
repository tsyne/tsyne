/**
 * three.js webgl - shader material [lava]
 *
 * Port of: three/examples/webgl_shader_lava.html
 *
 * Tests:
 * - ShaderMaterial with custom GLSL shaders
 * - Two sampler2D texture uniforms (cloud noise + lava tile)
 * - Dynamic time uniform for animated UV distortion
 * - Fog density/color uniforms
 * - TorusGeometry
 * - Texture wrapping (RepeatWrapping)
 *
 * Adaptations for Tsyne:
 * - Removes EffectComposer / post-processing (BloomPass, OutputPass)
 * - Renders directly with renderer.render() instead of composer.render()
 * - Inlines shader source (no DOM script tags)
 * - Removes Stats, GUI, and resize handler
 * - Uses loadTexture helper for disk-based image loading
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ==========================================================================
// Shaders (inlined from HTML script tags)
// ==========================================================================

const vertexShader = `
uniform vec2 uvScale;
varying vec2 vUv;

void main()
{
  vUv = uvScale * uv;
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform float time;

uniform float fogDensity;
uniform vec3 fogColor;

uniform sampler2D texture1;
uniform sampler2D texture2;

varying vec2 vUv;

void main( void ) {

  vec2 position = - 1.0 + 2.0 * vUv;

  vec4 noise = texture2D( texture1, vUv );
  vec2 T1 = vUv + vec2( 1.5, - 1.5 ) * time * 0.02;
  vec2 T2 = vUv + vec2( - 0.5, 2.0 ) * time * 0.01;

  T1.x += noise.x * 2.0;
  T1.y += noise.y * 2.0;
  T2.x -= noise.y * 0.2;
  T2.y += noise.z * 0.2;

  float p = texture2D( texture1, T1 * 2.0 ).a;

  vec4 color = texture2D( texture2, T2 * 2.0 );
  vec4 temp = color * ( vec4( p, p, p, p ) * 2.0 ) + ( color * color - 0.1 );

  if( temp.r > 1.0 ) { temp.bg += clamp( temp.r - 2.0, 0.0, 100.0 ); }
  if( temp.g > 1.0 ) { temp.rb += temp.g - 1.0; }
  if( temp.b > 1.0 ) { temp.rg += temp.b - 1.0; }

  gl_FragColor = temp;

  float depth = gl_FragCoord.z / gl_FragCoord.w;
  const float LOG2 = 1.442695;
  float fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );
  fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );

  gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );

}
`;

// ==========================================================================
// Types
// ==========================================================================

export interface WebGLShaderLavaParams {
  width?: number;
  height?: number;
}

export interface WebGLShaderLavaDemo {
  stop: () => void;
}

// ==========================================================================
// Demo Builder
// ==========================================================================

/**
 * Build the WebGL Shader Lava demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLShaderLava(
  a: App,
  win: ITsyneWindow,
  params: WebGLShaderLavaParams = {}
): Promise<WebGLShaderLavaDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // --------------------------------------------------------------------------
  // Scene setup (matches canonical three.js example)
  // --------------------------------------------------------------------------

  const camera = new THREE.PerspectiveCamera(35, width / height, 1, 3000);
  camera.position.z = 4;

  const scene = new THREE.Scene();

  // --------------------------------------------------------------------------
  // Load textures
  // --------------------------------------------------------------------------

  const cloudTexturePath = path.resolve(__dirname, '../../three/examples/textures/lava/cloud.png');
  const lavaTexturePath = path.resolve(__dirname, '../../three/examples/textures/lava/lavatile.jpg');

  console.log('[webgl_shader_lava] Loading cloud texture from:', cloudTexturePath);
  console.log('[webgl_shader_lava] Loading lava texture from:', lavaTexturePath);

  const cloudTexture = await loadTexture(THREE, cloudTexturePath);
  const lavaTexture = await loadTexture(THREE, lavaTexturePath);

  // Set color space on lava texture (matches original)
  lavaTexture.colorSpace = THREE.SRGBColorSpace;

  // Both textures use RepeatWrapping
  cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping;
  lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping;

  // --------------------------------------------------------------------------
  // Uniforms
  // --------------------------------------------------------------------------

  const uniforms = {
    'fogDensity': { value: 0.45 },
    'fogColor': { value: new THREE.Vector3(0, 0, 0) },
    'time': { value: 1.0 },
    'uvScale': { value: new THREE.Vector2(3.0, 1.0) },
    'texture1': { value: cloudTexture },
    'texture2': { value: lavaTexture },
  };

  // --------------------------------------------------------------------------
  // Geometry + Material
  // --------------------------------------------------------------------------

  const size = 0.65;

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
  });

  const mesh = new THREE.Mesh(new THREE.TorusGeometry(size, 0.3, 30, 30), material);
  mesh.rotation.x = 0.3;
  scene.add(mesh);

  // --------------------------------------------------------------------------
  // Renderer setup
  // --------------------------------------------------------------------------

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });
  renderer.autoClear = false;

  // --------------------------------------------------------------------------
  // Animation loop
  // --------------------------------------------------------------------------

  let running = true;
  let lastTime = Date.now();

  const animate = async () => {
    while (running) {
      const now = Date.now();
      const delta = (now - lastTime) / 1000; // seconds
      lastTime = now;

      // Scale delta the same way the original does: 5 * timer.getDelta()
      const scaledDelta = 5 * delta;

      uniforms['time'].value += 0.2 * scaledDelta;

      mesh.rotation.y += 0.0125 * scaledDelta;
      mesh.rotation.x += 0.05 * scaledDelta;

      renderer.clear();
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

// ==========================================================================
// Main
// ==========================================================================

async function main() {
  const WIDTH = 800;
  const HEIGHT = 600;

  const appInstance = app(
    resolveTransport(),
    { title: 'three.js webgl - shader material [lava]' },
    (a) => {
      a.window(
        { title: 'three.js webgl - shader material [lava]', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLShaderLava(a, win, { width: WIDTH, height: HEIGHT });
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
