/**
 * three.js webgl - environment maps
 *
 * Port of: three/examples/webgl_materials_envmaps.html
 *
 * Tests:
 * - Different environment mapping modes (reflection, refraction)
 * - Procedural environment generation
 * - Material reflectivity settings
 *
 * Adaptations for Tsyne:
 * - Uses procedural environment textures
 * - Multiple objects with different env map settings
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsEnvmapsParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsEnvmapsDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsEnvmaps(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsEnvmapsParams = {}
): Promise<WebGLMaterialsEnvmapsDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
  camera.position.z = 1200;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Add lighting
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(1, 1, 1);
  scene.add(light);

  scene.add(new THREE.AmbientLight(0x444444));

  // Create shader materials for different environment mapping effects

  // Reflection shader
  const reflectionMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      reflectivity: { value: 0.9 },
    },
    vertexShader: `
      varying vec3 vReflect;
      varying vec3 vNormal;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 cameraToVertex = normalize(worldPos.xyz - cameraPosition);
        vReflect = reflect(cameraToVertex, normalize(normalMatrix * normal));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vReflect;
      varying vec3 vNormal;
      uniform float time;
      uniform float reflectivity;

      void main() {
        vec3 r = normalize(vReflect);

        // Procedural environment color based on reflection direction
        float red = 0.5 + 0.5 * sin(r.x * 3.14159 + time);
        float green = 0.5 + 0.5 * sin(r.y * 3.14159 + time * 1.3);
        float blue = 0.5 + 0.5 * sin(r.z * 3.14159 + time * 0.7);

        // Add some pattern
        float pattern = 0.5 + 0.5 * sin(r.x * 10.0 + r.y * 10.0 + time);
        vec3 envColor = vec3(red, green, blue) * (0.7 + 0.3 * pattern);

        // Mix with base color based on reflectivity
        vec3 baseColor = vec3(0.1, 0.1, 0.1);
        vec3 finalColor = mix(baseColor, envColor, reflectivity);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });

  // Refraction shader
  const refractionMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      refractionRatio: { value: 0.98 },
    },
    vertexShader: `
      varying vec3 vRefract;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vec3 cameraToVertex = normalize(worldPos.xyz - cameraPosition);
        vRefract = refract(cameraToVertex, worldNormal, 0.9);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vRefract;
      uniform float time;

      void main() {
        vec3 r = normalize(vRefract);

        // Procedural environment with chromatic aberration
        float red = 0.5 + 0.5 * sin(r.x * 5.0 + time);
        float green = 0.5 + 0.5 * sin(r.y * 5.0 + time * 1.1 + 0.5);
        float blue = 0.5 + 0.5 * sin(r.z * 5.0 + time * 0.9 + 1.0);

        // Add glass-like tint
        vec3 envColor = vec3(red * 0.8, green, blue * 0.9);

        gl_FragColor = vec4(envColor, 1.0);
      }
    `,
  });

  // Fresnel reflection shader
  const fresnelMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vReflect;
      varying float vFresnel;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vec3 cameraToVertex = normalize(worldPos.xyz - cameraPosition);
        vReflect = reflect(cameraToVertex, worldNormal);

        // Calculate fresnel
        vFresnel = pow(1.0 + dot(cameraToVertex, worldNormal), 3.0);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vReflect;
      varying float vFresnel;
      uniform float time;

      void main() {
        vec3 r = normalize(vReflect);

        // Procedural environment
        float red = 0.5 + 0.5 * sin(r.x * 4.0 + time);
        float green = 0.5 + 0.5 * sin(r.y * 4.0 + time);
        float blue = 0.5 + 0.5 * sin(r.z * 4.0 + time);

        vec3 envColor = vec3(red, green, blue);
        vec3 baseColor = vec3(0.0, 0.0, 0.2);

        // Apply fresnel
        vec3 finalColor = mix(baseColor, envColor, vFresnel);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });

  // Create spheres with different materials
  const sphereGeometry = new THREE.SphereGeometry(120, 64, 32);

  // Reflection sphere
  const reflectionSphere = new THREE.Mesh(sphereGeometry, reflectionMaterial);
  reflectionSphere.position.set(-300, 100, 0);
  scene.add(reflectionSphere);

  // Refraction sphere
  const refractionSphere = new THREE.Mesh(sphereGeometry, refractionMaterial);
  refractionSphere.position.set(0, 100, 0);
  scene.add(refractionSphere);

  // Fresnel sphere
  const fresnelSphere = new THREE.Mesh(sphereGeometry, fresnelMaterial);
  fresnelSphere.position.set(300, 100, 0);
  scene.add(fresnelSphere);

  // Add torus knots with same materials
  const torusGeometry = new THREE.TorusKnotGeometry(60, 20, 128, 32);

  const reflectionTorus = new THREE.Mesh(torusGeometry, reflectionMaterial.clone());
  reflectionTorus.position.set(-300, -150, 0);
  scene.add(reflectionTorus);

  const refractionTorus = new THREE.Mesh(torusGeometry, refractionMaterial.clone());
  refractionTorus.position.set(0, -150, 0);
  scene.add(refractionTorus);

  const fresnelTorus = new THREE.Mesh(torusGeometry, fresnelMaterial.clone());
  fresnelTorus.position.set(300, -150, 0);
  scene.add(fresnelTorus);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const meshes = [
    reflectionSphere,
    refractionSphere,
    fresnelSphere,
    reflectionTorus,
    refractionTorus,
    fresnelTorus,
  ];

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Update uniforms
      meshes.forEach((mesh) => {
        const mat = mesh.material as THREE.ShaderMaterial;
        if (mat.uniforms.time) {
          mat.uniforms.time.value = time;
        }
      });

      // Rotate objects
      meshes.forEach((mesh, i) => {
        mesh.rotation.y = time * 0.3 * (i % 2 === 0 ? 1 : -1);
        mesh.rotation.x = time * 0.2;
      });

      // Camera animation
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.y = Math.cos(time * 0.15) * 200;
      camera.lookAt(scene.position);

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
    { title: 'three.js webgl - environment maps' },
    (a) => {
      a.window(
        { title: 'three.js webgl - environment maps', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsEnvmaps(a, win, { width: WIDTH, height: HEIGHT });
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
