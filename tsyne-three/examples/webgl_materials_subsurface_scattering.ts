/**
 * three.js webgl - subsurface scattering
 *
 * Port of: three/examples/webgl_materials_subsurface_scattering.html
 *
 * Tests:
 * - Subsurface scattering effect (SSS)
 * - Skin, wax, marble-like materials
 * - Light transmission through translucent materials
 *
 * Adaptations for Tsyne:
 * - Uses shader-based SSS approximation
 * - Multiple SSS profiles
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsSubsurfaceScatteringParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsSubsurfaceScatteringDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsSubsurfaceScattering(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsSubsurfaceScatteringParams = {}
): Promise<WebGLMaterialsSubsurfaceScatteringDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 50, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  // Add strong backlight for SSS effect
  const backLight = new THREE.PointLight(0xffaa44, 3, 1000);
  backLight.position.set(0, 0, -200);
  scene.add(backLight);

  const frontLight = new THREE.DirectionalLight(0xffffff, 1);
  frontLight.position.set(1, 1, 1);
  scene.add(frontLight);

  scene.add(new THREE.AmbientLight(0x222222));

  // Create SSS shader material
  const createSSSMaterial = (
    baseColor: number,
    sssColor: number,
    sssIntensity: number,
    thickness: number
  ) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(baseColor) },
        sssColor: { value: new THREE.Color(sssColor) },
        sssIntensity: { value: sssIntensity },
        thickness: { value: thickness },
        lightPos: { value: backLight.position },
        frontLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 sssColor;
        uniform float sssIntensity;
        uniform float thickness;
        uniform vec3 lightPos;
        uniform vec3 frontLightDir;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          // Front lighting (standard diffuse + specular)
          float frontDiff = max(dot(normal, frontLightDir), 0.0);
          vec3 halfDir = normalize(frontLightDir + viewDir);
          float frontSpec = pow(max(dot(normal, halfDir), 0.0), 32.0);

          // Back lighting for SSS
          vec3 lightDir = normalize(lightPos - vWorldPosition);
          float backDiff = max(dot(-normal, lightDir), 0.0);

          // SSS approximation - light wrapping around the surface
          float wrap = 0.5;
          float wrappedDiff = max(0.0, (dot(normal, -lightDir) + wrap) / (1.0 + wrap));

          // Distance-based attenuation for SSS
          float dist = length(lightPos - vWorldPosition);
          float attenuation = 1.0 / (1.0 + dist * 0.005);

          // Translucency effect
          float translucency = pow(max(dot(viewDir, -lightDir), 0.0), 2.0 / thickness);

          // Combine SSS contributions
          vec3 sssContrib = sssColor * sssIntensity * (
            backDiff * attenuation * 0.5 +
            wrappedDiff * attenuation * 0.3 +
            translucency * attenuation * 0.5
          );

          // Front lighting contribution
          vec3 frontContrib = baseColor * (frontDiff * 0.6 + 0.2) + vec3(1.0) * frontSpec * 0.3;

          // Rim lighting effect
          float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
          vec3 rimContrib = sssColor * rim * sssIntensity * 0.3;

          vec3 finalColor = frontContrib + sssContrib + rimContrib;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  };

  // Create spheres with different SSS settings
  const sphereGeometry = new THREE.SphereGeometry(50, 64, 32);

  const materials: THREE.ShaderMaterial[] = [];
  const meshes: THREE.Mesh[] = [];

  // Different SSS profiles
  const configs = [
    // Skin-like
    { baseColor: 0xd4a574, sssColor: 0xff6644, intensity: 1.2, thickness: 0.5 },
    // Wax/candle
    { baseColor: 0xffeecc, sssColor: 0xffaa44, intensity: 1.5, thickness: 0.3 },
    // Marble
    { baseColor: 0xeeeeff, sssColor: 0xff8866, intensity: 0.8, thickness: 0.7 },
    // Jade
    { baseColor: 0x88bb88, sssColor: 0xaaffaa, intensity: 1.0, thickness: 0.4 },
  ];

  configs.forEach((config, i) => {
    const material = createSSSMaterial(
      config.baseColor,
      config.sssColor,
      config.intensity,
      config.thickness
    );
    materials.push(material);

    const mesh = new THREE.Mesh(sphereGeometry, material);
    mesh.position.x = ((i % 2) - 0.5) * 150;
    mesh.position.y = (Math.floor(i / 2) - 0.5) * 150;
    scene.add(mesh);
    meshes.push(mesh);
  });

  // Add a torus knot with SSS
  const torusKnotGeometry = new THREE.TorusKnotGeometry(40, 15, 128, 32);
  const torusSSS = createSSSMaterial(0xffccaa, 0xff4422, 1.3, 0.4);
  materials.push(torusSSS);

  const torusKnot = new THREE.Mesh(torusKnotGeometry, torusSSS);
  torusKnot.position.z = -150;
  scene.add(torusKnot);
  meshes.push(torusKnot);

  // Add light helper
  const lightHelper = new THREE.Mesh(
    new THREE.SphereGeometry(10, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0xffaa44 })
  );
  lightHelper.position.copy(backLight.position);
  scene.add(lightHelper);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

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

      // Animate backlight position
      backLight.position.x = Math.sin(time * 0.5) * 200;
      backLight.position.y = Math.cos(time * 0.3) * 100;
      backLight.position.z = -150 + Math.sin(time * 0.4) * 50;
      lightHelper.position.copy(backLight.position);

      // Update light position in materials
      materials.forEach((mat) => {
        mat.uniforms.lightPos.value.copy(backLight.position);
      });

      // Rotate meshes slowly
      meshes.forEach((mesh, i) => {
        mesh.rotation.y = time * 0.2 * (i % 2 === 0 ? 1 : -1);
        mesh.rotation.x = time * 0.15;
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
    { title: 'three.js webgl - subsurface scattering' },
    (a) => {
      a.window(
        { title: 'three.js webgl - subsurface scattering', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsSubsurfaceScattering(a, win, { width: WIDTH, height: HEIGHT });
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
