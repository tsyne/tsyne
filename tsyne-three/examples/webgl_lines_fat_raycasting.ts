/**
 * three.js webgl - fat lines raycasting
 *
 * Port of: three/examples/webgl_lines_fat_raycasting.html
 *
 * Tests:
 * - Line2 with LineGeometry (fat lines)
 * - LineSegments2 with LineSegmentsGeometry
 * - LineMaterial with linewidth and vertex colors
 * - Raycasting against fat lines
 * - Line2.threshold parameter for raycasting
 * - Mouse interaction with lines
 *
 * Adaptations for Tsyne:
 * - Uses fixed raycast position instead of mouse tracking
 * - Removes GUI controls
 * - Removes OrbitControls
 * - Removes Stats
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLLinesFatRaycastingParams {
  width?: number;
  height?: number;
}

export interface WebGLLinesFatRaycastingDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLLinesFatRaycasting(
  a: App,
  win: ITsyneWindow,
  params: WebGLLinesFatRaycastingParams = {}
): Promise<WebGLLinesFatRaycastingDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height, interactive: true });

  // Import Line2/LineMaterial/LineGeometry from examples/jsm/lines
  const { Line2 } = await import('../../three/examples/jsm/lines/Line2.js');
  const { LineMaterial } = await import('../../three/examples/jsm/lines/LineMaterial.js');
  const { LineGeometry } = await import('../../three/examples/jsm/lines/LineGeometry.js');
  const { LineSegments2 } = await import('../../three/examples/jsm/lines/LineSegments2.js');
  const { LineSegmentsGeometry } = await import('../../three/examples/jsm/lines/LineSegmentsGeometry.js');

  // ─────────────────────────────────────────────────────────────────────────
  // Scene setup
  // ─────────────────────────────────────────────────────────────────────────

  const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
  camera.position.set(-40, 0, 60);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Configure raycaster for Line2
  const raycaster = new THREE.Raycaster();
  raycaster.params.Line2 = {};
  raycaster.params.Line2.threshold = 5; // Increased threshold for easier clicking

  // Create materials
  const matLine = new LineMaterial({
    color: 0xffffff,
    linewidth: 1, // in world units with size attenuation
    worldUnits: true,
    vertexColors: true,
    alphaToCoverage: true,
  });

  const matThresholdLine = new LineMaterial({
    color: 0xffffff,
    linewidth: matLine.linewidth + raycaster.params.Line2.threshold, // Show threshold zone
    worldUnits: true,
    transparent: true,
    opacity: 0.2,
    depthTest: false,
    visible: true, // Show threshold visualization
  });

  // Update material resolution
  matLine.resolution.set(width, height);
  matThresholdLine.resolution.set(width, height);

  // Create spheres for intersection visualization
  const sphereGeometry = new THREE.SphereGeometry(0.25, 8, 4);
  const sphereInterMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
  const sphereOnLineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });

  const sphereInter = new THREE.Mesh(sphereGeometry, sphereInterMaterial);
  const sphereOnLine = new THREE.Mesh(sphereGeometry, sphereOnLineMaterial);
  sphereInter.visible = false;
  sphereOnLine.visible = false;
  sphereInter.renderOrder = 10;
  sphereOnLine.renderOrder = 10;
  scene.add(sphereInter);
  scene.add(sphereOnLine);

  // Position and Color Data - create a spiral curve
  const positions: number[] = [];
  const colors: number[] = [];
  const points: THREE.Vector3[] = [];

  for (let i = -50; i < 50; i++) {
    const t = i / 3;
    points.push(new THREE.Vector3(t * Math.sin(2 * t), t, t * Math.cos(2 * t)));
  }

  const spline = new THREE.CatmullRomCurve3(points);
  const divisions = Math.round(3 * points.length);
  const point = new THREE.Vector3();
  const color = new THREE.Color();

  for (let i = 0, l = divisions; i < l; i++) {
    const t = i / l;

    spline.getPoint(t, point);
    positions.push(point.x, point.y, point.z);

    color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace);
    colors.push(color.r, color.g, color.b);
  }

  // Create LineGeometry for continuous line
  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions(positions);
  lineGeometry.setColors(colors);

  const line = new Line2(lineGeometry, matLine);
  line.computeLineDistances();
  line.scale.set(1, 1, 1);
  scene.add(line);

  const thresholdLine = new Line2(lineGeometry, matThresholdLine);
  thresholdLine.computeLineDistances();
  thresholdLine.scale.set(1, 1, 1);
  scene.add(thresholdLine);

  // Create LineSegmentsGeometry for segmented line (hidden by default)
  const segmentsGeometry = new LineSegmentsGeometry();
  segmentsGeometry.setPositions(positions);
  segmentsGeometry.setColors(colors);

  const segments = new LineSegments2(segmentsGeometry, matLine.clone());
  segments.computeLineDistances();
  segments.scale.set(1, 1, 1);
  segments.visible = false; // Hidden - we'll use line instead
  scene.add(segments);

  const thresholdSegments = new LineSegments2(segmentsGeometry, matThresholdLine.clone());
  thresholdSegments.computeLineDistances();
  thresholdSegments.scale.set(1, 1, 1);
  thresholdSegments.visible = false;
  scene.add(thresholdSegments);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera,
  });
  renderer.setClearColor(0x000000, 1.0);

  // ─────────────────────────────────────────────────────────────────────────
  // Mouse tracking for raycasting
  // ─────────────────────────────────────────────────────────────────────────

  const pointer = new THREE.Vector2(0, 0); // Center of screen initially
  let pointerMoved = false;

  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (event: any) => {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    pointer.x = (event.clientX / width) * 2 - 1;
    pointer.y = -(event.clientY / height) * 2 + 1;
    pointerMoved = true;
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.x = Infinity;
    pointer.y = Infinity;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Animation loop
  // ─────────────────────────────────────────────────────────────────────────

  let running = true;
  const startTime = Date.now();
  let currentTime = 0;

  const animate = async () => {
    while (running) {
      currentTime = Date.now() - startTime;
      const time = currentTime * 0.001; // seconds

      // Animate lines - rotate them
      line.rotation.y = time * 0.1;
      segments.rotation.y = line.rotation.y;

      // Sync threshold lines with main lines
      thresholdLine.position.copy(line.position);
      thresholdLine.quaternion.copy(line.quaternion);
      thresholdLine.rotation.y = line.rotation.y;
      thresholdSegments.position.copy(segments.position);
      thresholdSegments.quaternion.copy(segments.quaternion);
      thresholdSegments.rotation.y = segments.rotation.y;

      // Determine which object to raycast against
      const obj = line.visible ? line : segments;

      // Perform raycasting
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(obj);

      if (intersects.length > 0) {
        sphereInter.visible = true;
        sphereOnLine.visible = true;

        sphereInter.position.copy(intersects[0].point);
        sphereOnLine.position.copy(intersects[0].pointOnLine);

        const index = intersects[0].faceIndex;
        const colors = obj.geometry.getAttribute('instanceColorStart');

        color.fromBufferAttribute(colors, index);

        sphereInter.material.color.copy(color).offsetHSL(0.3, 0, 0);
        sphereOnLine.material.color.copy(color).offsetHSL(0.7, 0, 0);
      } else {
        sphereInter.visible = false;
        sphereOnLine.visible = false;
      }

      renderer.render(scene, camera);

      // Flush GL commands
      const gl = renderer.getContext();
      if (gl?.flush) {
        await gl.flush();
      }

      // No delay - paint sync handled on Go side
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
    { title: 'three.js webgl - fat lines raycasting' },
    (a) => {
      a.window(
        { title: 'three.js webgl - fat lines raycasting', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLLinesFatRaycasting(a, win, { width: WIDTH, height: HEIGHT });
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
