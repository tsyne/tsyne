/**
 * three.js webgl - custom line attributes
 *
 * Port of: three/examples/webgl_custom_attributes_lines.html
 *
 * Tests:
 * - Line geometry with custom attributes
 * - ShaderMaterial for lines
 * - Per-vertex colors on lines
 *
 * Adaptations for Tsyne:
 * - Uses procedural line generation
 * - Custom shader for line coloring
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLCustomAttributesLinesParams {
  width?: number;
  height?: number;
}

export interface WebGLCustomAttributesLinesDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLCustomAttributesLines(
  a: App,
  win: ITsyneWindow,
  params: WebGLCustomAttributesLinesParams = {}
): Promise<WebGLCustomAttributesLinesDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(30, width / height, 1, 10000);
  camera.position.z = 400;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // Create custom line geometry
  const segments = 1000;
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(segments * 3);
  const colors = new Float32Array(segments * 3);
  const displacement = new Float32Array(segments);

  const color = new THREE.Color();

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 20;
    const radius = 50 + t * 100;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (t - 0.5) * 200;

    color.setHSL(t, 1.0, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    displacement[i] = Math.sin(t * Math.PI * 4);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('displacement', new THREE.BufferAttribute(displacement, 1));

  // Custom shader material for lines
  const vertexShader = `
    attribute vec3 customColor;
    attribute float displacement;

    uniform float amplitude;
    uniform float time;

    varying vec3 vColor;

    void main() {
      vColor = customColor;

      vec3 newPosition = position;
      newPosition.x += sin(time + displacement * 10.0) * amplitude;
      newPosition.y += cos(time + displacement * 10.0) * amplitude;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;

    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `;

  const uniforms = {
    amplitude: { value: 10.0 },
    time: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  });

  const line = new THREE.Line(geometry, material);
  scene.add(line);

  // Add a second spiral line
  const geometry2 = new THREE.BufferGeometry();
  const positions2 = new Float32Array(segments * 3);
  const colors2 = new Float32Array(segments * 3);

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 20 + Math.PI;
    const radius = 50 + t * 100;

    positions2[i * 3] = Math.cos(angle) * radius;
    positions2[i * 3 + 1] = Math.sin(angle) * radius;
    positions2[i * 3 + 2] = (t - 0.5) * 200;

    color.setHSL(1 - t, 1.0, 0.5);
    colors2[i * 3] = color.r;
    colors2[i * 3 + 1] = color.g;
    colors2[i * 3 + 2] = color.b;
  }

  geometry2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));
  geometry2.setAttribute('customColor', new THREE.BufferAttribute(colors2, 3));
  geometry2.setAttribute('displacement', new THREE.BufferAttribute(displacement, 1));

  const line2 = new THREE.Line(geometry2, material);
  scene.add(line2);

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

      uniforms.time.value = time;
      uniforms.amplitude.value = 10 + 5 * Math.sin(time * 0.5);

      line.rotation.z = time * 0.1;
      line2.rotation.z = time * 0.1;

      camera.position.x = Math.sin(time * 0.3) * 100;
      camera.position.y = Math.cos(time * 0.3) * 100;
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
    { title: 'three.js webgl - custom line attributes' },
    (a) => {
      a.window(
        { title: 'three.js webgl - custom line attributes', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLCustomAttributesLines(a, win, { width: WIDTH, height: HEIGHT });
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
