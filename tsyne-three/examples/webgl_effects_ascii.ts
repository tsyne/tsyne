/**
 * three.js webgl - effects - ascii
 *
 * Port of: three/examples/webgl_effects_ascii.html
 *
 * Tests:
 * - ASCII art rendering effect
 * - Post-processing with character mapping
 * - Brightness to character conversion
 *
 * Adaptations for Tsyne:
 * - Custom shader-based ASCII rendering
 * - Procedural geometry scene
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLEffectsAsciiParams {
  width?: number;
  height?: number;
  resolution?: number;
}

export interface WebGLEffectsAsciiDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLEffectsAscii(
  a: App,
  win: ITsyneWindow,
  params: WebGLEffectsAsciiParams = {}
): Promise<WebGLEffectsAsciiDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const resolution = params.resolution ?? 0.15; // Lower = more ASCII-like

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Lights
  const light1 = new THREE.PointLight(0xffffff, 3, 1000);
  light1.position.set(500, 500, 500);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xffffff, 1, 1000);
  light2.position.set(-500, -500, -500);
  scene.add(light2);

  // ─────────────────────────────────────────────────────────────────────────
  // Create scene objects
  // ─────────────────────────────────────────────────────────────────────────

  // Central torus knot
  const torusKnotGeometry = new THREE.TorusKnotGeometry(100, 30, 200, 32);
  const torusKnotMaterial = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    shininess: 200,
  });
  const torusKnot = new THREE.Mesh(torusKnotGeometry, torusKnotMaterial);
  scene.add(torusKnot);

  // Surrounding spheres
  const spheres: THREE.Mesh[] = [];
  const sphereGeometry = new THREE.SphereGeometry(30, 32, 16);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(i / 8, 1, 0.5),
      shininess: 100,
    });

    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.x = Math.cos(angle) * 250;
    sphere.position.z = Math.sin(angle) * 250;

    scene.add(sphere);
    spheres.push(sphere);
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.autoClear = false;

  // Create low-resolution render target
  const lowResWidth = Math.floor(width * resolution);
  const lowResHeight = Math.floor(height * resolution);
  const renderTarget = new THREE.WebGLRenderTarget(lowResWidth, lowResHeight, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });

  // Create ASCII effect scene
  const asciiScene = new THREE.Scene();
  const asciiCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ASCII shader - converts brightness to character-like patterns
  const asciiMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: renderTarget.texture },
      resolution: { value: new THREE.Vector2(lowResWidth, lowResHeight) },
      charSize: { value: new THREE.Vector2(1.0 / lowResWidth, 1.0 / lowResHeight) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform vec2 charSize;
      varying vec2 vUv;

      // Simulate ASCII character patterns based on brightness
      float getPattern(float brightness, vec2 localUv) {
        // Create different patterns for different brightness levels
        float pattern = 0.0;

        if (brightness > 0.9) {
          // Solid block for very bright
          pattern = 1.0;
        } else if (brightness > 0.7) {
          // Dense pattern
          pattern = step(0.3, mod(localUv.x * 4.0, 1.0)) * step(0.3, mod(localUv.y * 4.0, 1.0));
        } else if (brightness > 0.5) {
          // Medium pattern - checkerboard
          pattern = step(0.5, mod(localUv.x * 2.0 + localUv.y * 2.0, 2.0));
        } else if (brightness > 0.3) {
          // Sparse dots
          float dotX = step(0.6, mod(localUv.x * 3.0, 1.0));
          float dotY = step(0.6, mod(localUv.y * 3.0, 1.0));
          pattern = dotX * dotY;
        } else if (brightness > 0.15) {
          // Single dot
          float dx = localUv.x - 0.5;
          float dy = localUv.y - 0.5;
          pattern = step(0.3, 1.0 - sqrt(dx*dx + dy*dy) * 2.0);
        } else if (brightness > 0.05) {
          // Tiny dot
          float dx = localUv.x - 0.5;
          float dy = localUv.y - 0.5;
          pattern = step(0.6, 1.0 - sqrt(dx*dx + dy*dy) * 3.0);
        }
        // else pattern stays 0 (space)

        return pattern;
      }

      void main() {
        // Get the cell coordinates
        vec2 cellUv = floor(vUv * resolution) / resolution;
        vec2 localUv = fract(vUv * resolution);

        // Sample the original color at cell center
        vec4 color = texture2D(tDiffuse, cellUv + charSize * 0.5);

        // Calculate brightness
        float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));

        // Get ASCII-like pattern
        float pattern = getPattern(brightness, localUv);

        // Output green on black (classic terminal look)
        vec3 charColor = color.rgb * pattern;

        gl_FragColor = vec4(charColor, 1.0);
      }
    `,
  });

  const asciiQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    asciiMaterial
  );
  asciiScene.add(asciiQuad);

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

      // Animate torus knot
      torusKnot.rotation.x = time * 0.5;
      torusKnot.rotation.y = time * 0.3;

      // Animate spheres
      for (let i = 0; i < spheres.length; i++) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.5;
        spheres[i].position.x = Math.cos(angle) * 250;
        spheres[i].position.z = Math.sin(angle) * 250;
        spheres[i].position.y = Math.sin(time + i) * 50;
      }

      // Render scene to low-res target
      renderer.setRenderTarget(renderTarget);
      renderer.clear();
      renderer.render(scene, camera);

      // Render ASCII effect to screen
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(asciiScene, asciiCamera);

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
    { title: 'three.js webgl - effects - ascii' },
    (a) => {
      a.window(
        { title: 'three.js webgl - effects - ascii', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLEffectsAscii(a, win, { width: WIDTH, height: HEIGHT });
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
