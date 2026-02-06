/**
 * three.js webgl2 - volume - cloud (partial 3D texture update)
 *
 * Port of: three/examples/webgl_texture3d_partialupdate.html
 *
 * Tests:
 * - Data3DTexture (3D volume texture)
 * - RawShaderMaterial with GLSL3 shaders
 * - Volume raymarching in fragment shader
 * - Partial 3D texture updates via copyTextureToTexture
 * - sampler3D uniform
 * - BoxGeometry rendered from BackSide for volume rendering
 * - ImprovedNoise (Perlin noise) for cloud generation
 *
 * Adaptations for Tsyne:
 * - Removes OrbitControls (no DOM interaction)
 * - Removes GUI
 * - Replaces sky sphere (CanvasTexture gradient) with solid background color
 * - Removes window resize handler
 * - Removes Stats
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';
import { ImprovedNoise } from '../../three/examples/jsm/math/ImprovedNoise.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const INITIAL_CLOUD_SIZE = 128;

// ═══════════════════════════════════════════════════════════════════════════
// Shaders (inlined from original, GLSL 300 ES / GLSL3)
// ═══════════════════════════════════════════════════════════════════════════

const vertexShader = /* glsl */ `
in vec3 position;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPos;

out vec3 vOrigin;
out vec3 vDirection;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

  vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
  vDirection = position - vOrigin;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
precision highp sampler3D;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 vOrigin;
in vec3 vDirection;

out vec4 color;

uniform vec3 base;
uniform sampler3D map;

uniform float threshold;
uniform float range;
uniform float opacity;
uniform float steps;
uniform float frame;

uint wang_hash(uint seed)
{
    seed = (seed ^ 61u) ^ (seed >> 16u);
    seed *= 9u;
    seed = seed ^ (seed >> 4u);
    seed *= 0x27d4eb2du;
    seed = seed ^ (seed >> 15u);
    return seed;
}

float randomFloat(inout uint seed)
{
    return float(wang_hash(seed)) / 4294967296.;
}

vec2 hitBox( vec3 orig, vec3 dir ) {
  const vec3 box_min = vec3( - 0.5 );
  const vec3 box_max = vec3( 0.5 );
  vec3 inv_dir = 1.0 / dir;
  vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
  vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
  vec3 tmin = min( tmin_tmp, tmax_tmp );
  vec3 tmax = max( tmin_tmp, tmax_tmp );
  float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
  float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
  return vec2( t0, t1 );
}

float sample1( vec3 p ) {
  return texture( map, p ).r;
}

float shading( vec3 coord ) {
  float step = 0.01;
  return sample1( coord + vec3( - step ) ) - sample1( coord + vec3( step ) );
}

vec4 linearToSRGB( in vec4 value ) {
  return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

void main(){
  vec3 rayDir = normalize( vDirection );
  vec2 bounds = hitBox( vOrigin, rayDir );

  if ( bounds.x > bounds.y ) discard;

  bounds.x = max( bounds.x, 0.0 );

  vec3 p = vOrigin + bounds.x * rayDir;
  vec3 inc = 1.0 / abs( rayDir );
  float delta = min( inc.x, min( inc.y, inc.z ) );
  delta /= steps;

  // Jitter
  uint seed = uint( gl_FragCoord.x ) * uint( 1973 ) + uint( gl_FragCoord.y ) * uint( 9277 ) + uint( frame ) * uint( 26699 );
  vec3 size = vec3( textureSize( map, 0 ) );
  float randNum = randomFloat( seed ) * 2.0 - 1.0;
  p += rayDir * randNum * ( 1.0 / size );

  //

  vec4 ac = vec4( base, 0.0 );

  for ( float t = bounds.x; t < bounds.y; t += delta ) {

    float d = sample1( p + 0.5 );

    d = smoothstep( threshold - range, threshold + range, d ) * opacity;

    float col = shading( p + 0.5 ) * 3.0 + ( ( p.x + p.y ) * 0.25 ) + 0.2;

    ac.rgb += ( 1.0 - ac.a ) * d * col;

    ac.a += ( 1.0 - ac.a ) * d;

    if ( ac.a >= 0.95 ) break;

    p += rayDir * delta;

  }

  color = linearToSRGB( ac );

  if ( color.a == 0.0 ) discard;

}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLTexture3dPartialupdateParams {
  width?: number;
  height?: number;
}

export interface WebGLTexture3dPartialupdateDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Cloud Texture Generator
// ═══════════════════════════════════════════════════════════════════════════

function generateCloudTexture(THREE: any, size: number, scaleFactor = 1.0) {
  const data = new Uint8Array(size * size * size);
  const scale = (scaleFactor * 10.0) / size;

  let i = 0;
  const perlin = new ImprovedNoise();
  const vector = new THREE.Vector3();

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dist = vector
          .set(x, y, z)
          .subScalar(size / 2)
          .divideScalar(size)
          .length();
        const fadingFactor = (1.0 - dist) * (1.0 - dist);
        data[i] =
          (128 +
            128 *
              perlin.noise(
                (x * scale) / 1.5,
                y * scale,
                (z * scale) / 1.5
              )) *
          fadingFactor;

        i++;
      }
    }
  }

  return new THREE.Data3DTexture(data, size, size, size);
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLTexture3dPartialupdate(
  a: App,
  win: Window,
  params: WebGLTexture3dPartialupdateParams = {}
): Promise<WebGLTexture3dPartialupdateDemo> {
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
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
  camera.position.set(0, 0, 1.5);

  // Sky background - replace CanvasTexture gradient with a simple sky-colored
  // sphere using MeshBasicMaterial with a solid color
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10),
    new THREE.MeshBasicMaterial({ color: 0x0561a0, side: THREE.BackSide })
  );
  scene.add(sky);

  // ─────────────────────────────────────────────────────────────────────────
  // 3D Texture - initially empty
  // ─────────────────────────────────────────────────────────────────────────

  const texture = new THREE.Data3DTexture(
    new Uint8Array(
      INITIAL_CLOUD_SIZE * INITIAL_CLOUD_SIZE * INITIAL_CLOUD_SIZE
    ).fill(0),
    INITIAL_CLOUD_SIZE,
    INITIAL_CLOUD_SIZE,
    INITIAL_CLOUD_SIZE
  );
  texture.format = THREE.RedFormat;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;

  // ─────────────────────────────────────────────────────────────────────────
  // Material - RawShaderMaterial with GLSL3 volume raymarcher
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      base: { value: new THREE.Color(0x798aa0) },
      map: { value: texture },
      cameraPos: { value: new THREE.Vector3() },
      threshold: { value: 0.25 },
      opacity: { value: 0.25 },
      range: { value: 0.1 },
      steps: { value: 100 },
      frame: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ─────────────────────────────────────────────────────────────────────────
  // Partial update parameters
  // ─────────────────────────────────────────────────────────────────────────

  const countPerRow = 4;
  const countPerSlice = countPerRow * countPerRow;
  const sliceCount = 4;
  const totalCount = sliceCount * countPerSlice;
  const margins = 8;

  const perElementPaddedSize =
    (INITIAL_CLOUD_SIZE - margins) / countPerRow;
  const perElementSize = Math.floor((INITIAL_CLOUD_SIZE - 1) / countPerRow);

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer setup
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;
  let prevTime = Date.now();
  let curr = 0;

  const animate = async () => {
    while (running) {
      const now = Date.now();
      currentTime = now - startTime;

      // Partial texture update: fill in cloud sub-blocks over time
      if (now - prevTime > 1500.0 && curr < totalCount) {
        const position = new THREE.Vector3(
          Math.floor(curr % countPerRow) * perElementSize + margins * 0.5,
          Math.floor((curr % countPerSlice) / countPerRow) * perElementSize +
            margins * 0.5,
          Math.floor(curr / countPerSlice) * perElementSize + margins * 0.5
        ).floor();

        const maxDimension = perElementPaddedSize - 1;
        const box = new THREE.Box3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(maxDimension, maxDimension, maxDimension)
        );
        const scaleFactor = (Math.random() + 0.5) * 0.5;
        const source = generateCloudTexture(THREE, perElementPaddedSize, scaleFactor);

        renderer.copyTextureToTexture(source, texture, box, position);

        prevTime = now;
        curr++;
      }

      // Update uniforms
      mesh.material.uniforms.cameraPos.value.copy(camera.position);
      mesh.material.uniforms.frame.value++;

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
    { title: 'three.js webgl2 - volume - cloud' },
    (a) => {
      a.window(
        {
          title: 'three.js webgl2 - volume - cloud',
          width: WIDTH,
          height: HEIGHT,
        },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLTexture3dPartialupdate(a, win, {
              width: WIDTH,
              height: HEIGHT,
            });
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
