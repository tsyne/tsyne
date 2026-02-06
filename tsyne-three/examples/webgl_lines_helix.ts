/**
 * three.js webgl - lines helix
 *
 * Tests:
 * - DNA-like double helix line geometry
 * - Connecting rungs between helices
 * - Animated rotation and movement
 * - Vertex colors for visual appeal
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesHelixParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesHelixDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesHelix(
  a: App,
  win: ITsyneWindow,
  params: WebGLLinesHelixParams = {}
): Promise<WebGLLinesHelixDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(60, width / height, 1, 2000);
  camera.position.z = 500;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // ─────────────────────────────────────────────────────────────────────────
  // Create double helix
  // ─────────────────────────────────────────────────────────────────────────

  const helixGroup = new THREE.Group();
  scene.add(helixGroup);

  const helixHeight = 400;
  const helixRadius = 50;
  const turns = 4;
  const segments = turns * 32;
  const rungInterval = 8;

  // Create first helix strand
  function createHelixStrand(phaseOffset: number, hue: number): THREE.Line {
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * turns * Math.PI * 2 + phaseOffset;
      const y = t * helixHeight - helixHeight / 2;

      positions.push(
        Math.cos(angle) * helixRadius,
        y,
        Math.sin(angle) * helixRadius
      );

      color.setHSL(hue + t * 0.2, 0.9, 0.6);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });

    return new THREE.Line(geometry, material);
  }

  // Create connecting rungs
  function createRungs(): THREE.LineSegments {
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i <= segments; i += rungInterval) {
      const t = i / segments;
      const angle = t * turns * Math.PI * 2;
      const y = t * helixHeight - helixHeight / 2;

      // Points on both strands
      const x1 = Math.cos(angle) * helixRadius;
      const z1 = Math.sin(angle) * helixRadius;
      const x2 = Math.cos(angle + Math.PI) * helixRadius;
      const z2 = Math.sin(angle + Math.PI) * helixRadius;

      positions.push(x1, y, z1, x2, y, z2);

      // Yellow/orange for rungs
      color.setHSL(0.1 + t * 0.1, 1.0, 0.5);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
    });

    return new THREE.LineSegments(geometry, material);
  }

  const strand1 = createHelixStrand(0, 0.6);
  const strand2 = createHelixStrand(Math.PI, 0.0);
  const rungs = createRungs();

  helixGroup.add(strand1);
  helixGroup.add(strand2);
  helixGroup.add(rungs);

  // Add multiple helices at different positions
  const helix2Group = helixGroup.clone();
  helix2Group.position.x = 200;
  helix2Group.scale.setScalar(0.7);
  scene.add(helix2Group);

  const helix3Group = helixGroup.clone();
  helix3Group.position.x = -200;
  helix3Group.scale.setScalar(0.7);
  scene.add(helix3Group);

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
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001;

      // Rotate helices
      helixGroup.rotation.y = time * 0.5;
      helix2Group.rotation.y = -time * 0.5;
      helix3Group.rotation.y = time * 0.5 + Math.PI;

      // Gentle wobble
      helixGroup.rotation.x = Math.sin(time * 0.3) * 0.1;
      helix2Group.rotation.x = Math.sin(time * 0.3 + 1) * 0.1;
      helix3Group.rotation.x = Math.sin(time * 0.3 + 2) * 0.1;

      // Move secondary helices
      helix2Group.position.y = Math.sin(time) * 30;
      helix3Group.position.y = Math.sin(time + Math.PI) * 30;

      // Orbit camera
      camera.position.x = Math.sin(time * 0.2) * 400;
      camera.position.z = Math.cos(time * 0.2) * 400;
      camera.position.y = Math.sin(time * 0.1) * 100;
      camera.lookAt(0, 0, 0);

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
    { title: 'three.js webgl - lines helix' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lines helix', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesHelix(a, win, { width: WIDTH, height: HEIGHT });
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
