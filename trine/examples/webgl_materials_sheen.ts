/**
 * three.js webgl - sheen materials
 *
 * Port of: three/examples/webgl_materials_sheen.html
 *
 * Tests:
 * - Sheen effect for fabric-like materials
 * - Velvet / silk appearance simulation
 * - View-dependent coloring
 *
 * Adaptations for Tsyne:
 * - Uses shader-based sheen approximation
 * - Multiple sheen colors and intensities
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMaterialsSheenParams {
  width?: number;
  height?: number;
}

export interface WebGLMaterialsSheenDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMaterialsSheen(
  a: App,
  win: ITsyneWindow,
  params: WebGLMaterialsSheenParams = {}
): Promise<WebGLMaterialsSheenDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 2000);
  camera.position.set(0, 50, 400);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x333333));

  const light1 = new THREE.DirectionalLight(0xffffff, 1.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.DirectionalLight(0xffffff, 0.5);
  light2.position.set(-1, 0.5, -1);
  scene.add(light2);

  // Create sheen shader material
  const createSheenMaterial = (
    baseColor: number,
    sheenColor: number,
    sheenIntensity: number,
    roughness: number
  ) => {
    return new THREE.ShaderMaterial({
      uniforms: {
        baseColor: { value: new THREE.Color(baseColor) },
        sheenColor: { value: new THREE.Color(sheenColor) },
        sheenIntensity: { value: sheenIntensity },
        roughness: { value: roughness },
        lightDir1: { value: new THREE.Vector3(1, 1, 1).normalize() },
        lightDir2: { value: new THREE.Vector3(-1, 0.5, -1).normalize() },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 sheenColor;
        uniform float sheenIntensity;
        uniform float roughness;
        uniform vec3 lightDir1;
        uniform vec3 lightDir2;

        varying vec3 vNormal;
        varying vec3 vViewPosition;

        // Sheen BRDF approximation
        float sheenDistribution(float NdotH, float roughness) {
          float alpha = roughness * roughness;
          float invAlpha = 1.0 / alpha;
          float cos2h = NdotH * NdotH;
          float sin2h = 1.0 - cos2h;
          return (2.0 + invAlpha) * pow(sin2h, invAlpha * 0.5) / (2.0 * 3.14159);
        }

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          // Diffuse lighting
          float diff1 = max(dot(normal, lightDir1), 0.0);
          float diff2 = max(dot(normal, lightDir2), 0.0);
          vec3 diffuse = baseColor * (diff1 * 0.7 + diff2 * 0.3 + 0.2);

          // Sheen calculation
          vec3 halfDir1 = normalize(lightDir1 + viewDir);
          vec3 halfDir2 = normalize(lightDir2 + viewDir);

          float NdotH1 = max(dot(normal, halfDir1), 0.0);
          float NdotH2 = max(dot(normal, halfDir2), 0.0);

          float sheen1 = sheenDistribution(NdotH1, roughness);
          float sheen2 = sheenDistribution(NdotH2, roughness);

          // Grazing angle enhancement (fabric effect)
          float NdotV = max(dot(normal, viewDir), 0.0);
          float edgeFactor = pow(1.0 - NdotV, 3.0);

          vec3 sheenContrib = sheenColor * sheenIntensity * (sheen1 + sheen2 * 0.5);
          sheenContrib += sheenColor * edgeFactor * sheenIntensity * 0.5;

          vec3 finalColor = diffuse + sheenContrib;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  };

  // Create spheres with different sheen settings
  const sphereGeometry = new THREE.SphereGeometry(40, 64, 32);
  const torusGeometry = new THREE.TorusKnotGeometry(30, 10, 128, 32);

  const materials: THREE.ShaderMaterial[] = [];
  const meshes: THREE.Mesh[] = [];

  // Fabric-like materials
  const configs = [
    // Red velvet
    { baseColor: 0x660022, sheenColor: 0xff4444, intensity: 0.8, roughness: 0.8 },
    // Blue silk
    { baseColor: 0x112244, sheenColor: 0x88aaff, intensity: 0.6, roughness: 0.3 },
    // Green satin
    { baseColor: 0x224422, sheenColor: 0x88ff88, intensity: 0.5, roughness: 0.4 },
    // Gold fabric
    { baseColor: 0x443300, sheenColor: 0xffcc44, intensity: 0.7, roughness: 0.5 },
    // Purple velvet
    { baseColor: 0x330033, sheenColor: 0xff88ff, intensity: 0.9, roughness: 0.7 },
    // Cyan silk
    { baseColor: 0x003333, sheenColor: 0x88ffff, intensity: 0.5, roughness: 0.35 },
  ];

  configs.forEach((config, i) => {
    const material = createSheenMaterial(
      config.baseColor,
      config.sheenColor,
      config.intensity,
      config.roughness
    );
    materials.push(material);

    const geometry = i < 3 ? sphereGeometry : torusGeometry;
    const mesh = new THREE.Mesh(geometry, material);

    const col = i % 3;
    const row = Math.floor(i / 3);
    mesh.position.x = (col - 1) * 120;
    mesh.position.y = (row - 0.5) * 120;

    scene.add(mesh);
    meshes.push(mesh);
  });

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
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      const time = (Date.now() - startTime) * 0.001;
      currentTime = Date.now() - startTime;

      // Rotate meshes
      meshes.forEach((mesh, i) => {
        mesh.rotation.y = time * 0.3 * (i % 2 === 0 ? 1 : -1);
        mesh.rotation.x = time * 0.2;
      });

      // Animate light direction slightly
      const lightX = Math.sin(time * 0.5);
      const lightZ = Math.cos(time * 0.5);
      materials.forEach((mat) => {
        mat.uniforms.lightDir1.value.set(lightX, 1, lightZ).normalize();
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
    { title: 'three.js webgl - sheen materials' },
    (a) => {
      a.window(
        { title: 'three.js webgl - sheen materials', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMaterialsSheen(a, win, { width: WIDTH, height: HEIGHT });
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
