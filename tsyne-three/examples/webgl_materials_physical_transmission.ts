/**
 * three.js webgl - physical transmission materials
 *
 * Port of: three/examples/webgl_materials_physical_transmission.html
 *
 * Tests:
 * - Transmission / refraction effect
 * - Glass-like materials
 * - IOR (Index of Refraction) simulation
 *
 * Adaptations for Tsyne:
 * - Uses shader-based transmission approximation
 * - Multiple transmission levels
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsPhysicalTransmissionParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsPhysicalTransmissionDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsPhysicalTransmission(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsPhysicalTransmissionParams = {}
): Promise<WebGLMaterialsPhysicalTransmissionDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 0, 600);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111133);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x444444));

  const light1 = new THREE.PointLight(0xffffff, 2, 1000);
  light1.position.set(200, 200, 300);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x88ccff, 1, 800);
  light2.position.set(-200, -100, 200);
  scene.add(light2);

  // Create background objects to see through
  const bgGeometry = new THREE.BoxGeometry(30, 30, 30);
  const bgMaterials = [
    new THREE.MeshPhongMaterial({ color: 0xff0000 }),
    new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
    new THREE.MeshPhongMaterial({ color: 0x0000ff }),
    new THREE.MeshPhongMaterial({ color: 0xffff00 }),
    new THREE.MeshPhongMaterial({ color: 0xff00ff }),
    new THREE.MeshPhongMaterial({ color: 0x00ffff }),
  ];

  const bgObjects: THREE.Mesh[] = [];
  for (let i = 0; i < 30; i++) {
    const mesh = new THREE.Mesh(bgGeometry, bgMaterials[i % bgMaterials.length]);
    mesh.position.x = (Math.random() - 0.5) * 600;
    mesh.position.y = (Math.random() - 0.5) * 400;
    mesh.position.z = -200 - Math.random() * 200;
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    scene.add(mesh);
    bgObjects.push(mesh);
  }

  // Create transmission shader material
  const createTransmissionMaterial = (
    color: number,
    transmission: number,
    ior: number,
    thickness: number
  ) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(color) },
        transmission: { value: transmission },
        ior: { value: ior },
        thickness: { value: thickness },
        time: { value: 0 },
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
        uniform float transmission;
        uniform float ior;
        uniform float thickness;
        uniform float time;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          // Fresnel effect
          float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 3.0);

          // Refraction simulation
          vec3 refractDir = refract(-viewDir, normal, 1.0 / ior);

          // Chromatic aberration simulation
          float r = 0.5 + 0.5 * sin(refractDir.x * 5.0 + time + vWorldPosition.z * 0.01);
          float g = 0.5 + 0.5 * sin(refractDir.y * 5.0 + time * 1.1 + vWorldPosition.z * 0.01 + 1.0);
          float b = 0.5 + 0.5 * sin(refractDir.z * 5.0 + time * 0.9 + vWorldPosition.z * 0.01 + 2.0);

          vec3 transmittedColor = vec3(r, g, b);

          // Surface specular
          vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);

          // Mix transmission with surface reflection
          vec3 surfaceColor = baseColor * 0.1 + vec3(spec) * 0.5;
          vec3 finalColor = mix(surfaceColor, transmittedColor * baseColor, transmission * (1.0 - fresnel));

          // Add rim light
          finalColor += vec3(0.3, 0.4, 0.5) * fresnel * 0.5;

          gl_FragColor = vec4(finalColor, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  };

  // Create glass-like objects
  const sphereGeometry = new THREE.SphereGeometry(50, 64, 32);
  const torusGeometry = new THREE.TorusGeometry(50, 20, 32, 64);

  const transmissionMaterials: THREE.ShaderMaterial[] = [];

  // Different transmission settings
  const configs = [
    { color: 0xffffff, transmission: 0.9, ior: 1.5, thickness: 0.5 }, // Clear glass
    { color: 0x88ff88, transmission: 0.7, ior: 1.3, thickness: 0.3 }, // Green tinted
    { color: 0x8888ff, transmission: 0.8, ior: 1.7, thickness: 0.4 }, // Blue tinted, high IOR
    { color: 0xff8888, transmission: 0.6, ior: 1.2, thickness: 0.6 }, // Red tinted, low IOR
  ];

  const glassObjects: THREE.Mesh[] = [];

  configs.forEach((config, i) => {
    const material = createTransmissionMaterial(
      config.color,
      config.transmission,
      config.ior,
      config.thickness
    );
    transmissionMaterials.push(material);

    const geometry = i % 2 === 0 ? sphereGeometry : torusGeometry;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = ((i % 2) - 0.5) * 200;
    mesh.position.y = (Math.floor(i / 2) - 0.5) * 150;
    scene.add(mesh);
    glassObjects.push(mesh);
  });

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

      // Update shader time uniforms
      transmissionMaterials.forEach((mat) => {
        mat.uniforms.time.value = time;
      });

      // Rotate glass objects
      glassObjects.forEach((obj, i) => {
        obj.rotation.y = time * 0.3 * (i % 2 === 0 ? 1 : -1);
        obj.rotation.x = time * 0.2;
      });

      // Animate background objects
      bgObjects.forEach((obj, i) => {
        obj.rotation.x += 0.01;
        obj.rotation.y += 0.015;
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
    { title: 'three.js webgl - physical transmission' },
    (a) => {
      a.window(
        { title: 'three.js webgl - physical transmission', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsPhysicalTransmission(a, win, { width: WIDTH, height: HEIGHT });
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
