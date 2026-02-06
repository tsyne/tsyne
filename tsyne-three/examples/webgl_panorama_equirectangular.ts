/**
 * three.js webgl - panorama equirectangular
 *
 * Port of: three/examples/webgl_panorama_equirectangular.html
 *
 * Tests:
 * - Equirectangular panorama (procedurally generated)
 * - Sphere-based panoramic viewing
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLPanoramaEquirectangularParams {
  width?: number;
  height?: number;
}

export interface WebGLPanoramaEquirectangularDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLPanoramaEquirectangular(
  a: App,
  win: ITsyneWindow,
  params: WebGLPanoramaEquirectangularParams = {}
): Promise<WebGLPanoramaEquirectangularDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);

  const scene = new THREE.Scene();

  // Create procedural equirectangular texture
  function createEquirectangularTexture(): THREE.DataTexture {
    const texWidth = 512;
    const texHeight = 256;
    const data = new Uint8Array(texWidth * texHeight * 4);

    for (let y = 0; y < texHeight; y++) {
      for (let x = 0; x < texWidth; x++) {
        const i = (y * texWidth + x) * 4;

        // Convert to spherical coordinates
        const phi = (y / texHeight) * Math.PI;  // 0 to PI (top to bottom)
        const theta = (x / texWidth) * Math.PI * 2;  // 0 to 2*PI (around)

        // Create a procedural landscape/sky pattern
        const elevation = Math.sin(phi);  // 0 at poles, 1 at equator

        // Sky gradient (top half)
        if (phi < Math.PI * 0.4) {
          const t = phi / (Math.PI * 0.4);
          // Deep blue to light blue
          data[i] = Math.floor(50 + t * 100);
          data[i + 1] = Math.floor(100 + t * 100);
          data[i + 2] = Math.floor(200 + t * 55);
        }
        // Horizon band
        else if (phi < Math.PI * 0.55) {
          const t = (phi - Math.PI * 0.4) / (Math.PI * 0.15);
          // Add some mountains/terrain
          const mountainNoise = Math.sin(theta * 8) * 0.3 + Math.sin(theta * 13) * 0.2;
          if (t < 0.3 + mountainNoise) {
            // Mountain silhouette
            data[i] = 40;
            data[i + 1] = 60;
            data[i + 2] = 40;
          } else {
            // Horizon glow
            data[i] = Math.floor(200 + (1 - t) * 55);
            data[i + 1] = Math.floor(150 + (1 - t) * 80);
            data[i + 2] = Math.floor(100 + (1 - t) * 50);
          }
        }
        // Ground (bottom half)
        else {
          const t = (phi - Math.PI * 0.55) / (Math.PI * 0.45);
          // Create ground pattern with some variation
          const groundNoise = Math.sin(theta * 20 + y * 0.1) * 0.1 + Math.sin(theta * 7) * 0.1;
          const green = 80 + Math.floor(groundNoise * 50) - t * 30;
          const brown = 60 + Math.floor(groundNoise * 30) - t * 20;

          data[i] = Math.max(30, Math.floor(brown));
          data[i + 1] = Math.max(50, Math.floor(green));
          data[i + 2] = Math.max(20, Math.floor(brown * 0.5));
        }

        // Add some clouds in the sky
        if (phi < Math.PI * 0.35) {
          const cloudNoise = Math.sin(theta * 5 + phi * 3) * Math.sin(theta * 8 - phi * 5);
          if (cloudNoise > 0.3) {
            const cloudIntensity = (cloudNoise - 0.3) * 200;
            data[i] = Math.min(255, data[i] + cloudIntensity);
            data[i + 1] = Math.min(255, data[i + 1] + cloudIntensity);
            data[i + 2] = Math.min(255, data[i + 2] + cloudIntensity);
          }
        }

        data[i + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, texWidth, texHeight, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  // Create panoramic sphere
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);  // Invert the sphere so we see inside

  const texture = createEquirectangularTexture();
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // Add some floating objects for reference
  const objectGeometry = new THREE.IcosahedronGeometry(5);

  for (let i = 0; i < 30; i++) {
    const objectMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
    });
    const object = new THREE.Mesh(objectGeometry, objectMaterial);

    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() * 0.5 + 0.25) * Math.PI;  // Keep in middle band
    const radius = 100 + Math.random() * 200;

    object.position.x = radius * Math.sin(phi) * Math.cos(theta);
    object.position.y = radius * Math.cos(phi);
    object.position.z = radius * Math.sin(phi) * Math.sin(theta);

    scene.add(object);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // Camera rotation state
  let lon = 0;
  let lat = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Auto-rotate camera
      lon += 0.1;
      lat = Math.sin(time * 0.15) * 30;

      // Convert spherical to Cartesian
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);

      const target = new THREE.Vector3();
      target.x = 500 * Math.sin(phi) * Math.cos(theta);
      target.y = 500 * Math.cos(phi);
      target.z = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(target);

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  };

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
    { title: 'three.js webgl - panorama equirectangular' },
    (a) => {
      a.window(
        { title: 'three.js webgl - panorama equirectangular', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLPanoramaEquirectangular(a, win, { width: WIDTH, height: HEIGHT });
          }, 100);
        }
      );
    }
  );

  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) {
  main().catch(console.error);
}
