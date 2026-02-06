/**
 * three.js webgl - geometry - text
 *
 * Port of the canonical three.js example: three/examples/webgl_geometry_text.html
 *
 * Adaptations for Tsyne:
 * - Replaces web/document/window APIs with Tsyne equivalents
 * - Renders through Tsyne's native OpenGL backend via:
 *     three.js (patched) -> TsyneBridge -> Fyne canvas.Shader -> OpenGL
 * - Loads font from disk using fs.readFileSync instead of FontLoader.load
 * - Skips GUI controls (font/weight/bevel changes)
 * - Skips keyboard input for text editing
 * - Skips pointer drag interaction
 * - Uses time-based rotation animation instead
 */

import * as path from 'path';
import * as fs from 'fs';
import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';
import { FontLoader, Font } from '../../three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from '../../three/examples/jsm/geometries/TextGeometry.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLGeometryTextParams {
  width?: number;
  height?: number;
}

export interface WebGLGeometryTextDemo {
  stop: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the WebGL Geometry Text demo
 *
 * @param a - Tsyne App instance
 * @param win - Tsyne Window instance
 * @param params - Demo parameters (width, height)
 * @returns Demo controller with stop() method
 */
export async function buildWebGLGeometryText(
  a: App,
  win: ITsyneWindow,
  params: WebGLGeometryTextParams = {}
): Promise<WebGLGeometryTextDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup (matches canonical three.js example)
  // ─────────────────────────────────────────────────────────────────────────

  // Camera - positioned to see 3D text clearly
  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.set(0, 140, 250);

  const cameraTarget = new THREE.Vector3(0, 120, 0);

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 200, 900);

  // Lights
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(0, 0, 1).normalize();
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0xffffff, 4.5, 0, 0);
  pointLight.color.setHSL(Math.random(), 1, 0.5);
  pointLight.position.set(0, 100, 90);
  scene.add(pointLight);

  // Add ambient light for better visibility
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  // Materials - make text more visible with distinct colors
  const materials = [
    new THREE.MeshPhongMaterial({ color: 0xff6600, flatShading: true }), // front - orange
    new THREE.MeshPhongMaterial({ color: 0xffaa00 }) // side - yellow-orange
  ];

  // Group
  const group = new THREE.Group();
  group.position.y = 100;
  scene.add(group);

  // Floor plane
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(10000, 10000),
    new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true })
  );
  plane.position.y = 100;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);

  // ─────────────────────────────────────────────────────────────────────────
  // Font loading and text creation
  // ─────────────────────────────────────────────────────────────────────────

  // Load font from disk (optimer_bold.typeface.json)
  const fontPath = path.resolve(
    __dirname,
    '../../three/examples/fonts/optimer_bold.typeface.json'
  );
  console.log('[webgl_geometry_text] Loading font from:', fontPath);

  const fontData = fs.readFileSync(fontPath, 'utf8');
  const fontJson = JSON.parse(fontData);
  const font = new FontLoader().parse(fontJson);

  // Text parameters
  const text = 'three.js';
  const size = 70;
  const depth = 20;
  const curveSegments = 4;
  const bevelThickness = 2;
  const bevelSize = 1.5;
  const bevelEnabled = true;
  const hover = 30;
  const mirror = true;

  // Create text geometry
  const textGeo = new TextGeometry(text, {
    font: font,
    size: size,
    depth: depth,
    curveSegments: curveSegments,
    bevelThickness: bevelThickness,
    bevelSize: bevelSize,
    bevelEnabled: bevelEnabled
  });

  textGeo.computeBoundingBox();

  const centerOffset = -0.5 * (textGeo.boundingBox!.max.x - textGeo.boundingBox!.min.x);

  // Main text mesh
  const textMesh1 = new THREE.Mesh(textGeo, materials);
  textMesh1.position.x = centerOffset;
  textMesh1.position.y = hover;
  textMesh1.position.z = 0;
  textMesh1.rotation.x = 0;
  textMesh1.rotation.y = Math.PI * 2;
  group.add(textMesh1);

  // Mirror text mesh
  let textMesh2: THREE.Mesh | null = null;
  if (mirror) {
    textMesh2 = new THREE.Mesh(textGeo, materials);
    textMesh2.position.x = centerOffset;
    textMesh2.position.y = -hover;
    textMesh2.position.z = depth;
    textMesh2.rotation.x = Math.PI;
    textMesh2.rotation.y = Math.PI * 2;
    group.add(textMesh2);
  }

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1); // No window.devicePixelRatio in Node
  renderer.setSize(width, height);

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  let time = 0;

  const animate = async () => {
    while (running) {
      time += 0.016; // ~60fps

      // Rotate group slowly (replaces pointer drag interaction)
      group.rotation.y = Math.sin(time * 0.5) * 0.3;

      camera.lookAt(cameraTarget);

      renderer.clear();
      renderer.render(scene, camera);

      // Flush GL commands to Tsyne bridge
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // ~60fps
      await new Promise(resolve => setTimeout(resolve, 16));
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
    { title: 'three.js webgl - geometry - text' },
    (a) => {
      a.window(
        { title: 'three.js webgl - geometry - text', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          // Initialize three.js after window is shown
          setTimeout(async () => {
            await buildWebGLGeometryText(a, win, { width: WIDTH, height: HEIGHT });
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
