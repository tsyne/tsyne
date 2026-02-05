/**
 * three.js webgl - lensflares
 *
 * Port of: three/examples/webgl_lensflares.html
 *
 * Tests:
 * - Lens flare effect simulation
 * - Light-based flare generation
 * - Procedural flare textures
 * - Screen-space effect rendering
 *
 * Adaptations for Tsyne:
 * - Procedural flare textures (no image loading)
 * - Custom lens flare implementation
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLensflaresParams {
  width?: number;
  height?: number;
}

export interface WebGLLensflaresDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLensflares(
  a: App,
  win: Window,
  params: WebGLLensflaresParams = {}
): Promise<WebGLLensflaresDemo> {
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

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 15000);
  camera.position.z = 250;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Add fog for atmosphere
  scene.fog = new THREE.Fog(0x000000, 2500, 15000);

  // ─────────────────────────────────────────────────────────────────────────
  // Create procedural flare texture
  // ─────────────────────────────────────────────────────────────────────────

  function createFlareTexture(size: number, type: 'main' | 'ring' | 'hex'): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const nx = (x / size) * 2 - 1;
        const ny = (y / size) * 2 - 1;
        const dist = Math.sqrt(nx * nx + ny * ny);

        let alpha = 0;

        if (type === 'main') {
          // Bright center with glow
          alpha = Math.max(0, 1 - dist) ** 2;
          alpha += Math.max(0, 1 - dist * 2) * 0.5;
        } else if (type === 'ring') {
          // Ring shape
          const ringDist = Math.abs(dist - 0.7);
          alpha = Math.max(0, 0.15 - ringDist) * 5;
        } else if (type === 'hex') {
          // Hexagonal pattern
          const angle = Math.atan2(ny, nx);
          const hex = Math.abs(Math.sin(angle * 3));
          alpha = Math.max(0, 1 - dist * 1.5) * hex * 0.5;
        }

        alpha = Math.min(1, alpha);
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        data[i + 3] = alpha * 255; // A
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Create lens flare sprites
  // ─────────────────────────────────────────────────────────────────────────

  interface FlareElement {
    sprite: THREE.Sprite;
    size: number;
    distance: number;
    color: THREE.Color;
  }

  interface LensFlare {
    light: THREE.PointLight;
    elements: FlareElement[];
    position: THREE.Vector3;
  }

  const lensFlares: LensFlare[] = [];

  function createLensFlare(lightColor: number, position: THREE.Vector3): LensFlare {
    // Create point light
    const light = new THREE.PointLight(lightColor, 3, 2000);
    light.position.copy(position);
    scene.add(light);

    // Create flare elements
    const elements: FlareElement[] = [];

    // Main flare
    const mainTexture = createFlareTexture(128, 'main');
    const mainMaterial = new THREE.SpriteMaterial({
      map: mainTexture,
      color: lightColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mainSprite = new THREE.Sprite(mainMaterial);
    scene.add(mainSprite);
    elements.push({ sprite: mainSprite, size: 200, distance: 0, color: new THREE.Color(lightColor) });

    // Secondary flares along the line to camera
    const ringTexture = createFlareTexture(64, 'ring');
    const hexTexture = createFlareTexture(64, 'hex');

    const flareConfigs = [
      { texture: ringTexture, size: 60, distance: 0.3, alpha: 0.5 },
      { texture: hexTexture, size: 80, distance: 0.5, alpha: 0.3 },
      { texture: ringTexture, size: 40, distance: 0.7, alpha: 0.4 },
      { texture: hexTexture, size: 120, distance: 0.9, alpha: 0.2 },
      { texture: ringTexture, size: 30, distance: 1.0, alpha: 0.5 },
      { texture: hexTexture, size: 60, distance: 1.3, alpha: 0.3 },
    ];

    for (const config of flareConfigs) {
      const material = new THREE.SpriteMaterial({
        map: config.texture,
        color: lightColor,
        transparent: true,
        opacity: config.alpha,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      scene.add(sprite);
      elements.push({
        sprite,
        size: config.size,
        distance: config.distance,
        color: new THREE.Color(lightColor),
      });
    }

    return { light, elements, position };
  }

  // Create multiple lens flares
  lensFlares.push(createLensFlare(0xffff00, new THREE.Vector3(150, 75, -100)));
  lensFlares.push(createLensFlare(0xff6600, new THREE.Vector3(-150, 50, -150)));
  lensFlares.push(createLensFlare(0x0066ff, new THREE.Vector3(0, 100, -200)));

  // ─────────────────────────────────────────────────────────────────────────
  // Create background stars
  // ─────────────────────────────────────────────────────────────────────────

  const starsGeometry = new THREE.BufferGeometry();
  const starsPositions = new Float32Array(3000 * 3);

  for (let i = 0; i < 3000; i++) {
    starsPositions[i * 3] = (Math.random() - 0.5) * 2000;
    starsPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
    starsPositions[i * 3 + 2] = (Math.random() - 0.5) * 2000 - 500;
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2,
    sizeAttenuation: false,
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // Add some floating cubes for reference
  const cubeGeometry = new THREE.BoxGeometry(20, 20, 20);
  for (let i = 0; i < 10; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.6, 0.4),
    });
    const cube = new THREE.Mesh(cubeGeometry, material);
    cube.position.set(
      (Math.random() - 0.5) * 400,
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 400 - 200
    );
    cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(cube);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const screenPosition = new THREE.Vector3();

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Animate light positions
      for (let i = 0; i < lensFlares.length; i++) {
        const flare = lensFlares[i];
        flare.light.position.x = flare.position.x + Math.sin(time + i) * 50;
        flare.light.position.y = flare.position.y + Math.cos(time * 0.7 + i) * 30;
      }

      // Update lens flare positions relative to camera
      for (const flare of lensFlares) {
        // Get screen position of light
        screenPosition.copy(flare.light.position);
        screenPosition.project(camera);

        // Calculate direction from center of screen
        const centerX = screenPosition.x;
        const centerY = screenPosition.y;

        // Update each flare element
        for (const element of flare.elements) {
          // Position along the line from light to screen center
          const posX = centerX * (1 - element.distance * 2);
          const posY = centerY * (1 - element.distance * 2);

          // Convert back to world position at a fixed distance
          element.sprite.position.set(
            posX * 500,
            posY * 500 * (height / width),
            -500
          );
          element.sprite.position.applyMatrix4(camera.matrixWorld);

          // Scale based on screen position
          const distFromCenter = Math.sqrt(posX * posX + posY * posY);
          const scale = element.size * (1 - distFromCenter * 0.5);
          element.sprite.scale.setScalar(Math.max(scale, element.size * 0.5));
        }
      }

      // Rotate camera
      camera.position.x = Math.sin(time * 0.2) * 200;
      camera.position.y = Math.cos(time * 0.15) * 100;
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
    { title: 'three.js webgl - lensflares' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lensflares', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLensflares(a, win, { width: WIDTH, height: HEIGHT });
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
