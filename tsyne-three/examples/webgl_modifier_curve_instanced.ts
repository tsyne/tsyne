/**
 * three.js webgl - instanced curves
 *
 * Port of: three/examples/webgl_modifier_curve_instanced.html
 *
 * Tests:
 * - InstancedMesh with curve-based positioning
 * - Many instances following different curves
 * - Efficient curve-based animation
 *
 * Adaptations for Tsyne:
 * - Uses InstancedMesh for performance
 * - Multiple curve paths
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, Window } from 'tsyne';
import { setupTsyneThreeJS } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLModifierCurveInstancedParams {
  width?: number;
  height?: number;
  instanceCount?: number;
}

export interface WebGLModifierCurveInstancedDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLModifierCurveInstanced(
  a: App,
  win: Window,
  params: WebGLModifierCurveInstancedParams = {}
): Promise<WebGLModifierCurveInstancedDemo> {
  const width = params.width ?? 800;
  const height = params.height ?? 600;
  const instanceCount = params.instanceCount ?? 500;

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

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.set(0, 200, 500);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  // Add lighting
  scene.add(new THREE.AmbientLight(0x404040));

  const light1 = new THREE.DirectionalLight(0xffffff, 1);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xff8800, 1, 800);
  light2.position.set(-200, 100, 200);
  scene.add(light2);

  // Create multiple curves
  const curves: THREE.CatmullRomCurve3[] = [];
  const numCurves = 5;

  for (let c = 0; c < numCurves; c++) {
    const points: THREE.Vector3[] = [];
    const numPoints = 8;
    const radius = 150 + c * 30;
    const yOffset = (c - numCurves / 2) * 40;

    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      const angle = t * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          yOffset + Math.sin(angle * 3) * 30,
          Math.sin(angle) * radius
        )
      );
    }

    const curve = new THREE.CatmullRomCurve3(points, true);
    curves.push(curve);

    // Visualize curve
    const curveGeometry = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(100)
    );
    const curveMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(c / numCurves, 0.8, 0.5),
      transparent: true,
      opacity: 0.3,
    });
    const curveLine = new THREE.Line(curveGeometry, curveMaterial);
    scene.add(curveLine);
  }

  // Create instanced mesh
  const boxGeometry = new THREE.BoxGeometry(8, 8, 16);
  const material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
  });

  const instancedMesh = new THREE.InstancedMesh(boxGeometry, material, instanceCount);
  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  // Set up instance colors
  const colorArray = new Float32Array(instanceCount * 3);
  const color = new THREE.Color();

  for (let i = 0; i < instanceCount; i++) {
    color.setHSL(i / instanceCount, 0.9, 0.6);
    colorArray[i * 3] = color.r;
    colorArray[i * 3 + 1] = color.g;
    colorArray[i * 3 + 2] = color.b;
  }

  instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);
  scene.add(instancedMesh);

  // Store instance data
  const instanceData = [];
  for (let i = 0; i < instanceCount; i++) {
    instanceData.push({
      curveIndex: Math.floor(Math.random() * numCurves),
      offset: Math.random(),
      speed: 0.3 + Math.random() * 0.4,
      scale: 0.5 + Math.random() * 1.0,
    });
  }

  const dummy = new THREE.Object3D();

  // Add central object
  const centralGeometry = new THREE.IcosahedronGeometry(40, 2);
  const centralMaterial = new THREE.MeshPhongMaterial({
    color: 0xffaa00,
    emissive: 0x442200,
  });
  const centralMesh = new THREE.Mesh(centralGeometry, centralMaterial);
  scene.add(centralMesh);

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

      // Update instance positions
      for (let i = 0; i < instanceCount; i++) {
        const data = instanceData[i];
        const curve = curves[data.curveIndex];

        // Calculate position along curve
        const t = (data.offset + time * data.speed * 0.1) % 1;
        const position = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);

        dummy.position.copy(position);
        dummy.lookAt(position.clone().add(tangent));
        dummy.scale.setScalar(data.scale);
        dummy.updateMatrix();

        instancedMesh.setMatrixAt(i, dummy.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;

      // Animate central object
      centralMesh.rotation.y = time * 0.3;
      centralMesh.rotation.x = time * 0.2;

      // Move lights
      light2.position.x = Math.sin(time * 0.5) * 300;
      light2.position.z = Math.cos(time * 0.5) * 300;

      // Camera animation
      camera.position.x = Math.sin(time * 0.15) * 400;
      camera.position.z = Math.cos(time * 0.15) * 400;
      camera.position.y = 150 + Math.sin(time * 0.2) * 100;
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
    { title: 'three.js webgl - instanced curves' },
    (a) => {
      a.window(
        { title: 'three.js webgl - instanced curves', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLModifierCurveInstanced(a, win, { width: WIDTH, height: HEIGHT });
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
