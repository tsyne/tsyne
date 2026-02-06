/**
 * three.js WebGL 2 - Uniform Buffer Objects Arrays
 *
 * Port of: three/examples/webgl_ubo_arrays.html
 *
 * Tests:
 * - UniformsGroup (UBO) with array uniforms for multiple point lights
 * - RawShaderMaterial with GLSL3 and distance attenuation
 * - Grid of 100 spheres + ground plane sharing UBO data
 * - 200 animated point lights (up to 300 max) orbiting via UBO arrays
 *
 * Adaptations for Tsyne:
 * - Removes DOM container, Stats, OrbitControls, GUI, resize handler
 * - Inlines shader source (no DOM script tags)
 * - Inlines #include <common> helpers (saturate, pow2, pow4)
 * - Uses manual elapsed time instead of THREE.Timer (no document to connect)
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Shaders
// ═══════════════════════════════════════════════════════════════════════════

const vertexShader = /* glsl */ `
uniform ViewData {
  mat4 projectionMatrix;
  mat4 viewMatrix;
};

uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

in vec3 position;
in vec3 normal;
in vec2 uv;
out vec2 vUv;

out vec3 vPositionEye;
out vec3 vNormalEye;

void main() {
  vec4 vertexPositionEye = viewMatrix * modelMatrix * vec4( position, 1.0 );

  vPositionEye = (modelMatrix * vec4( position, 1.0 )).xyz;
  vNormalEye = (vec4(normal, 1.0)).xyz;

  vUv = uv;

  gl_Position = projectionMatrix * vertexPositionEye;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;
precision highp int;

uniform LightingData {
  vec4 lightPosition[POINTLIGHTS_MAX];
  vec4 lightColor[POINTLIGHTS_MAX];
  float pointLightsCount;
};

// Inlined from three.js common.glsl (needed for distance attenuation)
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
float pow2( const in float x ) { return x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }

float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
  float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );

  if ( cutoffDistance > 0.0 ) {
    distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
  }

  return distanceFalloff;
}

in vec2 vUv;
in vec3 vPositionEye;
in vec3 vNormalEye;
out vec4 fragColor;

void main() {
  vec4 color = vec4(vec3(0.), 1.);
  for (int x = 0; x < int(pointLightsCount); x++) {
    vec3 offset = lightPosition[x].xyz - vPositionEye;
    vec3 dirToLight = normalize( offset );
    float distance = length( offset );

    float diffuse = max(0.0, dot(vNormalEye, dirToLight));
    float attenuation = 1.0 / (distance * distance);

    vec3 lightWeighting = lightColor[x].xyz * getDistanceAttenuation( distance, 4., .7 );
    color.rgb += lightWeighting;
  }
  fragColor = color;
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLUBOArraysParams {
  width?: number;
  height?: number;
}

export interface WebGLUBOArraysDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL UBO Arrays demo
 *
 * Creates a 10x10 grid of spheres and a ground plane, lit by up to 300
 * animated point lights whose positions and colors are passed via UBO
 * arrays (Vector4 arrays in a UniformsGroup).
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLUBOArrays(
  a: App,
  win: ITsyneWindow,
  params: WebGLUBOArraysParams = {}
): Promise<WebGLUBOArraysDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 50, 50);

  const scene = new THREE.Scene();
  camera.lookAt(scene.position);

  // ─────────────────────────────────────────────────────────────────────────
  // Constants
  // ─────────────────────────────────────────────────────────────────────────

  const pointLightsMax = 300;
  const pointLightsCount = 200;

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry
  // ─────────────────────────────────────────────────────────────────────────

  const geometry = new THREE.SphereGeometry();

  // ─────────────────────────────────────────────────────────────────────────
  // Uniform Buffer Objects (shared across all materials)
  // ─────────────────────────────────────────────────────────────────────────

  // Lighting UBO - arrays of point light positions and colors
  const lightingUniformsGroup = new THREE.UniformsGroup();
  lightingUniformsGroup.setName('LightingData');

  const data: any[] = [];
  const dataColors: any[] = [];
  const lightCenters: { x: number; z: number }[] = [];

  for (let i = 0; i < pointLightsMax; i++) {
    const col = new THREE.Color(0xffffff * Math.random()).toArray();
    const x = Math.random() * 50 - 25;
    const z = Math.random() * 50 - 25;

    data.push(new THREE.Uniform(new THREE.Vector4(x, 1, z, 0)));
    dataColors.push(new THREE.Uniform(new THREE.Vector4(col[0], col[1], col[2], 0)));

    lightCenters.push({ x, z });
  }

  lightingUniformsGroup.add(data);       // light positions array
  lightingUniformsGroup.add(dataColors); // light colors array
  lightingUniformsGroup.add(new THREE.Uniform(pointLightsCount)); // active light count

  // Camera UBO - shared projection and view matrices
  const cameraUniformsGroup = new THREE.UniformsGroup();
  cameraUniformsGroup.setName('ViewData');
  cameraUniformsGroup.add(new THREE.Uniform(camera.projectionMatrix));
  cameraUniformsGroup.add(new THREE.Uniform(camera.matrixWorldInverse));

  // ─────────────────────────────────────────────────────────────────────────
  // Material template
  // ─────────────────────────────────────────────────────────────────────────

  const material = new THREE.RawShaderMaterial({
    uniforms: {
      modelMatrix: { value: null },
      normalMatrix: { value: null },
    },
    name: 'UBOArrays',
    defines: {
      POINTLIGHTS_MAX: pointLightsMax,
    },
    vertexShader,
    fragmentShader,
    glslVersion: THREE.GLSL3,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Ground plane
  // ─────────────────────────────────────────────────────────────────────────

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material.clone());
  plane.material.uniformsGroups = [cameraUniformsGroup, lightingUniformsGroup];
  plane.material.uniforms.modelMatrix.value = plane.matrixWorld;
  plane.material.uniforms.normalMatrix.value = plane.normalMatrix;
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  scene.add(plane);

  // ─────────────────────────────────────────────────────────────────────────
  // Sphere grid - 10x10 grid of spheres
  // ─────────────────────────────────────────────────────────────────────────

  const gridSize = { x: 10, y: 1, z: 10 };
  const spacing = 6;

  for (let i = 0; i < gridSize.x; i++) {
    for (let j = 0; j < gridSize.y; j++) {
      for (let k = 0; k < gridSize.z; k++) {
        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.name = 'Sphere';
        mesh.material.uniformsGroups = [cameraUniformsGroup, lightingUniformsGroup];
        mesh.material.uniforms.modelMatrix.value = mesh.matrixWorld;
        mesh.material.uniforms.normalMatrix.value = mesh.normalMatrix;
        scene.add(mesh);

        mesh.position.x = i * spacing - (gridSize.x * spacing) / 2;
        mesh.position.y = 0;
        mesh.position.z = k * spacing - (gridSize.z * spacing) / 2;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer
  // ─────────────────────────────────────────────────────────────────────────

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

  const animate = async () => {
    while (running) {
      const elapsedTime = (Date.now() - startTime) / 1000;

      const lights = lightingUniformsGroup.uniforms[0];

      // Parameters for circular movement
      const radius = 5;
      const speed = 0.5;

      // Update each light's position
      for (let i = 0; i < lights.length; i++) {
        const light = lights[i];
        const center = lightCenters[i];

        const angle = speed * elapsedTime + i * 0.5;
        const x = center.x + Math.sin(angle) * radius;
        const z = center.z + Math.cos(angle) * radius;

        light.value.set(x, 1, z, 0);
      }

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
    { title: 'three.js WebGL 2 - Uniform Buffer Objects Arrays' },
    (a) => {
      a.window(
        { title: 'three.js WebGL 2 - Uniform Buffer Objects Arrays', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLUBOArrays(a, win, { width: WIDTH, height: HEIGHT });
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
