/**
 * three.js webgl - lightning strike
 *
 * Port of: three/examples/webgl_lightningstrike.html
 *
 * Tests:
 * - Procedural lightning bolt generation
 * - Line geometry with vertex colors
 * - Dynamic animation
 * - Glow/bloom effect simulation
 *
 * Adaptations for Tsyne:
 * - Uses procedural lightning generation (no LightningStrike addon)
 * - Simplified glow effect using multiple lines with transparency
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLightningStrikeParams {
  width?: number;
  height?: number;
}

export interface WebGLLightningStrikeDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLightningStrike(
  a: App,
  win: Window,
  params: WebGLLightningStrikeParams = {}
): Promise<WebGLLightningStrikeDemo> {
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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 1000);
  camera.position.set(0, 0, 200);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // ─────────────────────────────────────────────────────────────────────────
  // Lightning generation
  // ─────────────────────────────────────────────────────────────────────────

  interface LightningBolt {
    lines: THREE.Line[];
    startPoint: THREE.Vector3;
    endPoint: THREE.Vector3;
    lastUpdate: number;
  }

  const bolts: LightningBolt[] = [];

  function generateLightningPoints(
    start: THREE.Vector3,
    end: THREE.Vector3,
    depth: number,
    maxDepth: number,
    displacement: number
  ): THREE.Vector3[] {
    if (depth >= maxDepth) {
      return [start.clone(), end.clone()];
    }

    const midPoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);

    // Add random perpendicular displacement
    const direction = new THREE.Vector3().subVectors(end, start);
    const perpendicular = new THREE.Vector3(
      -direction.y + (Math.random() - 0.5) * direction.z,
      direction.x + (Math.random() - 0.5) * direction.z,
      (Math.random() - 0.5) * direction.length()
    ).normalize();

    midPoint.add(perpendicular.multiplyScalar((Math.random() - 0.5) * displacement));

    const left = generateLightningPoints(start, midPoint, depth + 1, maxDepth, displacement * 0.5);
    const right = generateLightningPoints(midPoint, end, depth + 1, maxDepth, displacement * 0.5);

    // Remove duplicate midpoint
    return [...left, ...right.slice(1)];
  }

  function createLightningBolt(start: THREE.Vector3, end: THREE.Vector3): LightningBolt {
    const lines: THREE.Line[] = [];
    const mainPoints = generateLightningPoints(start, end, 0, 6, 50);

    // Create main bolt (bright core)
    const coreGeometry = new THREE.BufferGeometry();
    const corePositions: number[] = [];
    const coreColors: number[] = [];
    const coreColor = new THREE.Color(0xffffff);

    for (const point of mainPoints) {
      corePositions.push(point.x, point.y, point.z);
      coreColors.push(coreColor.r, coreColor.g, coreColor.b);
    }

    coreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(corePositions, 3));
    coreGeometry.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));

    const coreMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2,
    });

    const coreLine = new THREE.Line(coreGeometry, coreMaterial);
    scene.add(coreLine);
    lines.push(coreLine);

    // Create glow layers
    const glowLayers = [
      { color: 0x8080ff, opacity: 0.6, scale: 1.02 },
      { color: 0x4040ff, opacity: 0.4, scale: 1.04 },
      { color: 0x2020aa, opacity: 0.2, scale: 1.06 },
    ];

    for (const layer of glowLayers) {
      const glowGeometry = new THREE.BufferGeometry();
      const glowPositions: number[] = [];
      const glowColors: number[] = [];
      const glowColor = new THREE.Color(layer.color);

      for (const point of mainPoints) {
        const scaledPoint = point.clone().multiplyScalar(layer.scale);
        glowPositions.push(scaledPoint.x, scaledPoint.y, scaledPoint.z);
        glowColors.push(glowColor.r, glowColor.g, glowColor.b);
      }

      glowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(glowPositions, 3));
      glowGeometry.setAttribute('color', new THREE.Float32BufferAttribute(glowColors, 3));

      const glowMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: layer.opacity,
      });

      const glowLine = new THREE.Line(glowGeometry, glowMaterial);
      scene.add(glowLine);
      lines.push(glowLine);
    }

    // Create some branches
    const branchCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < branchCount; i++) {
      const branchIndex = Math.floor(Math.random() * (mainPoints.length - 2)) + 1;
      const branchStart = mainPoints[branchIndex].clone();
      const branchEnd = branchStart.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 40
        )
      );

      const branchPoints = generateLightningPoints(branchStart, branchEnd, 0, 3, 20);

      const branchGeometry = new THREE.BufferGeometry();
      const branchPositions: number[] = [];
      const branchColors: number[] = [];
      const branchColor = new THREE.Color(0x8888ff);

      for (const point of branchPoints) {
        branchPositions.push(point.x, point.y, point.z);
        branchColors.push(branchColor.r, branchColor.g, branchColor.b);
      }

      branchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(branchPositions, 3));
      branchGeometry.setAttribute('color', new THREE.Float32BufferAttribute(branchColors, 3));

      const branchMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
      });

      const branchLine = new THREE.Line(branchGeometry, branchMaterial);
      scene.add(branchLine);
      lines.push(branchLine);
    }

    return {
      lines,
      startPoint: start,
      endPoint: end,
      lastUpdate: Date.now(),
    };
  }

  function removeBolt(bolt: LightningBolt) {
    for (const line of bolt.lines) {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
  }

  // Create initial bolts
  function createNewBolt() {
    const start = new THREE.Vector3(
      (Math.random() - 0.5) * 100,
      100,
      (Math.random() - 0.5) * 50
    );
    const end = new THREE.Vector3(
      start.x + (Math.random() - 0.5) * 80,
      -100,
      start.z + (Math.random() - 0.5) * 50
    );
    return createLightningBolt(start, end);
  }

  bolts.push(createNewBolt());
  bolts.push(createNewBolt());

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
      const time = Date.now();
      currentTime = time - startTime;

      // Update/regenerate bolts
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i];
        const age = time - bolt.lastUpdate;

        // Flicker effect - randomly show/hide lines
        for (const line of bolt.lines) {
          line.visible = Math.random() > 0.1;
        }

        // Regenerate bolt after a while
        if (age > 150 + Math.random() * 100) {
          removeBolt(bolt);
          bolts[i] = createNewBolt();
        }
      }

      // Slowly rotate scene
      scene.rotation.y = Math.sin(currentTime * 0.0003) * 0.3;

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
      for (const bolt of bolts) {
        removeBolt(bolt);
      }
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
    { title: 'three.js webgl - lightning strike' },
    (a) => {
      a.window(
        { title: 'three.js webgl - lightning strike', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLightningStrike(a, win, { width: WIDTH, height: HEIGHT });
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
