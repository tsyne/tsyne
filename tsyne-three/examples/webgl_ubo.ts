/**
 * three.js WebGL 2 - Uniform Buffer Objects
 *
 * Port of: three/examples/webgl_ubo.html
 *
 * Tests:
 * - UniformsGroup (UBO) for shared camera and lighting data
 * - RawShaderMaterial with GLSL3 Phong shading
 * - Two material types: solid color and textured
 * - TetrahedronGeometry and BoxGeometry
 * - 200 animated meshes sharing UBO data
 *
 * Adaptations for Tsyne:
 * - Removes DOM container, Stats, resize handler
 * - Inlines shader source (no DOM script tags)
 * - Uses TsyneTextureLoader for crate.gif
 * - Uses manual delta time instead of THREE.Timer (no document to connect)
 */

import * as path from 'path';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';
import { loadTexture } from '../integration/texture-loader';

// ═══════════════════════════════════════════════════════════════════════════
// Shaders
// ═══════════════════════════════════════════════════════════════════════════

// Vertex shader 1: solid color objects (tetrahedra)
const vertexShader1 = /* glsl */ `
uniform ViewData {
  mat4 projectionMatrix;
  mat4 viewMatrix;
};

uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

in vec3 position;
in vec3 normal;

out vec3 vPositionEye;
out vec3 vNormalEye;

void main() {
  vec4 vertexPositionEye = viewMatrix * modelMatrix * vec4( position, 1.0 );

  vPositionEye = vertexPositionEye.xyz;
  vNormalEye = normalMatrix * normal;

  gl_Position = projectionMatrix * vertexPositionEye;
}
`;

// Fragment shader 1: Phong shading with solid color
const fragmentShader1 = /* glsl */ `
precision highp float;

vec4 LinearTosRGB( in vec4 value ) {
  return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

uniform LightingData {
  vec3 position;
  vec3 ambientColor;
  vec3 diffuseColor;
  vec3 specularColor;
  float shininess;
} Light;

uniform vec3 color;

in vec3 vPositionEye;
in vec3 vNormalEye;

out vec4 fragColor;

void main() {
  // Phong reflection model
  vec3 l = normalize( Light.position - vPositionEye );
  vec3 n = normalize( vNormalEye );
  vec3 e = - normalize( vPositionEye );
  vec3 r = normalize( reflect( - l, n ) );

  float diffuseLightWeighting = max( dot( n, l ), 0.0 );
  float specularLightWeighting = max( dot( r, e ), 0.0 );

  specularLightWeighting = pow( specularLightWeighting, Light.shininess );

  vec3 lightWeighting = Light.ambientColor +
    Light.diffuseColor * diffuseLightWeighting +
    Light.specularColor * specularLightWeighting;

  fragColor = vec4( color.rgb * lightWeighting.rgb, 1.0 );
  fragColor = LinearTosRGB( fragColor );
}
`;

// Vertex shader 2: textured objects (boxes)
const vertexShader2 = /* glsl */ `
layout(std140) uniform ViewData {
  mat4 projectionMatrix;
  mat4 viewMatrix;
};

uniform mat4 modelMatrix;
uniform mat3 normalMatrix;

in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 vPositionEye;
out vec3 vNormalEye;
out vec2 vUv;

void main() {
  vec4 vertexPositionEye = viewMatrix * modelMatrix * vec4( position, 1.0 );

  vPositionEye = vertexPositionEye.xyz;
  vNormalEye = normalMatrix * normal;
  vUv = uv;
  gl_Position = projectionMatrix * vertexPositionEye;
}
`;

// Fragment shader 2: Phong shading with texture
const fragmentShader2 = /* glsl */ `
precision highp float;

vec4 LinearTosRGB( in vec4 value ) {
  return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

uniform sampler2D diffuseMap;

in vec2 vUv;
in vec3 vPositionEye;
in vec3 vNormalEye;
out vec4 fragColor;

uniform LightingData {
  vec3 position;
  vec3 ambientColor;
  vec3 diffuseColor;
  vec3 specularColor;
  float shininess;
} Light;

void main() {
  // Phong reflection model
  vec3 l = normalize( Light.position - vPositionEye );
  vec3 n = normalize( vNormalEye );
  vec3 e = - normalize( vPositionEye );
  vec3 r = normalize( reflect( - l, n ) );

  float diffuseLightWeighting = max( dot( n, l ), 0.0 );
  float specularLightWeighting = max( dot( r, e ), 0.0 );

  specularLightWeighting = pow( specularLightWeighting, Light.shininess );

  vec3 lightWeighting = Light.ambientColor +
    Light.diffuseColor * diffuseLightWeighting +
    Light.specularColor * specularLightWeighting;

  fragColor = vec4( texture( diffuseMap, vUv ).rgb * lightWeighting.rgb, 1.0 );
  fragColor = LinearTosRGB( fragColor );
}
`;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLUBOParams {
  width?: number;
  height?: number;
}

export interface WebGLUBODemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL UBO demo
 *
 * Creates 200 meshes (alternating tetrahedra with solid Phong color and
 * boxes with textured Phong shading) sharing camera and lighting data
 * via Uniform Buffer Objects.
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLUBO(
  a: App,
  win: ITsyneWindow,
  params: WebGLUBOParams = {}
): Promise<WebGLUBODemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 25);

  const scene = new THREE.Scene();
  camera.lookAt(scene.position);

  // ─────────────────────────────────────────────────────────────────────────
  // Geometry
  // ─────────────────────────────────────────────────────────────────────────

  const geometry1 = new THREE.TetrahedronGeometry();
  const geometry2 = new THREE.BoxGeometry();

  // ─────────────────────────────────────────────────────────────────────────
  // Texture
  // ─────────────────────────────────────────────────────────────────────────

  const texturePath = path.resolve(__dirname, '../../three/examples/textures/crate.gif');
  console.log('[webgl_ubo] Loading texture from:', texturePath);

  const texture = await loadTexture(THREE, texturePath);
  texture.colorSpace = THREE.SRGBColorSpace;

  // ─────────────────────────────────────────────────────────────────────────
  // Uniform Buffer Objects (shared across all materials)
  // ─────────────────────────────────────────────────────────────────────────

  // Camera UBO - shared projection and view matrices
  const cameraUniformsGroup = new THREE.UniformsGroup();
  cameraUniformsGroup.setName('ViewData');
  cameraUniformsGroup.add(new THREE.Uniform(camera.projectionMatrix)); // projection matrix
  cameraUniformsGroup.add(new THREE.Uniform(camera.matrixWorldInverse)); // view matrix

  // Lighting UBO - shared Phong lighting parameters
  const lightingUniformsGroup = new THREE.UniformsGroup();
  lightingUniformsGroup.setName('LightingData');
  lightingUniformsGroup.add(new THREE.Uniform(new THREE.Vector3(0, 0, 10))); // light position
  lightingUniformsGroup.add(new THREE.Uniform(new THREE.Color(0x7c7c7c))); // ambient color
  lightingUniformsGroup.add(new THREE.Uniform(new THREE.Color(0xd5d5d5))); // diffuse color
  lightingUniformsGroup.add(new THREE.Uniform(new THREE.Color(0xe7e7e7))); // specular color
  lightingUniformsGroup.add(new THREE.Uniform(64)); // shininess

  // ─────────────────────────────────────────────────────────────────────────
  // Materials
  // ─────────────────────────────────────────────────────────────────────────

  // Material 1: solid color with Phong shading
  const material1 = new THREE.RawShaderMaterial({
    uniforms: {
      modelMatrix: { value: null },
      normalMatrix: { value: null },
      color: { value: null },
    },
    vertexShader: vertexShader1,
    fragmentShader: fragmentShader1,
    glslVersion: THREE.GLSL3,
  });

  // Material 2: textured with Phong shading
  const material2 = new THREE.RawShaderMaterial({
    uniforms: {
      modelMatrix: { value: null },
      diffuseMap: { value: null },
    },
    vertexShader: vertexShader2,
    fragmentShader: fragmentShader2,
    glslVersion: THREE.GLSL3,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Meshes - 200 randomly positioned and scaled objects
  // ─────────────────────────────────────────────────────────────────────────

  for (let i = 0; i < 200; i++) {
    let mesh;

    if (i % 2 === 0) {
      // Tetrahedron with solid color
      mesh = new THREE.Mesh(geometry1, material1.clone());

      mesh.material.uniformsGroups = [cameraUniformsGroup, lightingUniformsGroup];
      mesh.material.uniforms.modelMatrix.value = mesh.matrixWorld;
      mesh.material.uniforms.normalMatrix.value = mesh.normalMatrix;
      mesh.material.uniforms.color.value = new THREE.Color(0xffffff * Math.random());
    } else {
      // Box with crate texture
      mesh = new THREE.Mesh(geometry2, material2.clone());

      mesh.material.uniformsGroups = [cameraUniformsGroup, lightingUniformsGroup];
      mesh.material.uniforms.modelMatrix.value = mesh.matrixWorld;
      mesh.material.uniforms.diffuseMap.value = texture;
    }

    scene.add(mesh);

    const s = 1 + Math.random() * 0.5;

    mesh.scale.x = s;
    mesh.scale.y = s;
    mesh.scale.z = s;

    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.rotation.z = Math.random() * Math.PI;

    mesh.position.x = Math.random() * 40 - 20;
    mesh.position.y = Math.random() * 40 - 20;
    mesh.position.z = Math.random() * 20 - 10;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Renderer
  // ─────────────────────────────────────────────────────────────────────────

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  let lastTime = Date.now();

  const animate = async () => {
    while (running) {
      const now = Date.now();
      const delta = (now - lastTime) / 1000; // seconds
      lastTime = now;

      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.rotation.x += delta * 0.5;
          child.rotation.y += delta * 0.3;
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
    { title: 'three.js WebGL 2 - Uniform Buffer Objects' },
    (a) => {
      a.window(
        { title: 'three.js WebGL 2 - Uniform Buffer Objects', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLUBO(a, win, { width: WIDTH, height: HEIGHT });
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
