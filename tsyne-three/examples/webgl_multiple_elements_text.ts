/**
 * three.js webgl - multiple elements text
 *
 * Port of: three/examples/webgl_multiple_elements_text.html
 *
 * Tests:
 * - Multiple elements with 3D shapes representing letters
 * - Procedural "text" using 3D geometry
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS, enableThreeJSResize } from '../integration/init';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface WebGLMultipleElementsTextParams {
  width?: number;
  height?: number;
}

export interface WebGLMultipleElementsTextDemo {
  stop: () => void;
  getTime: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Demo Builder
// ═══════════════════════════════════════════════════════════════════════════

export async function buildWebGLMultipleElementsText(
  a: App,
  win: ITsyneWindow,
  params: WebGLMultipleElementsTextParams = {}
): Promise<WebGLMultipleElementsTextDemo> {
  let width = params.width ?? 800;
  let height = params.height ?? 600;

  const { THREE } = await initThreeJS(a, win, { width, height });

  // ─────────────────────────────────────────────────────────────────────────
  // Create letter-like shapes using primitives
  // ─────────────────────────────────────────────────────────────────────────

  function createLetterShape(letter: string): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({
      color: 0x00aaff,
      flatShading: true,
    });

    // Create simple representations of letters using boxes
    switch (letter) {
      case 'T':
        // Top bar
        const tTop = new THREE.Mesh(new THREE.BoxGeometry(30, 6, 6), material);
        tTop.position.y = 15;
        group.add(tTop);
        // Vertical bar
        const tVert = new THREE.Mesh(new THREE.BoxGeometry(6, 30, 6), material);
        group.add(tVert);
        break;
      case 'H':
        // Left bar
        const hLeft = new THREE.Mesh(new THREE.BoxGeometry(6, 30, 6), material);
        hLeft.position.x = -10;
        group.add(hLeft);
        // Right bar
        const hRight = new THREE.Mesh(new THREE.BoxGeometry(6, 30, 6), material);
        hRight.position.x = 10;
        group.add(hRight);
        // Middle bar
        const hMid = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 6), material);
        group.add(hMid);
        break;
      case 'R':
        // Vertical bar
        const rVert = new THREE.Mesh(new THREE.BoxGeometry(6, 30, 6), material);
        rVert.position.x = -8;
        group.add(rVert);
        // Top curve (simplified as box)
        const rTop = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 6), material);
        rTop.position.set(0, 12, 0);
        group.add(rTop);
        const rMid = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 6), material);
        group.add(rMid);
        const rSide = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 6), material);
        rSide.position.set(8, 6, 0);
        group.add(rSide);
        // Leg
        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(6, 15, 6), material.clone());
        (rLeg.material as any).color.setHex(0x0088cc);
        rLeg.position.set(8, -8, 0);
        rLeg.rotation.z = -0.3;
        group.add(rLeg);
        break;
      case 'E':
        // Vertical bar
        const eVert = new THREE.Mesh(new THREE.BoxGeometry(6, 30, 6), material);
        eVert.position.x = -8;
        group.add(eVert);
        // Top bar
        const eTop = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 6), material);
        eTop.position.set(2, 12, 0);
        group.add(eTop);
        // Middle bar
        const eMid = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 6), material);
        eMid.position.set(0, 0, 0);
        group.add(eMid);
        // Bottom bar
        const eBot = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 6), material);
        eBot.position.set(2, -12, 0);
        group.add(eBot);
        break;
      default:
        // Default: simple box
        group.add(new THREE.Mesh(new THREE.BoxGeometry(20, 30, 6), material));
    }

    return group;
  }

  // Spell "THREE" using shapes
  const letters = ['T', 'H', 'R', 'E', 'E'];
  const elements: any[] = [];

  for (let i = 0; i < letters.length; i++) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);

    const ambientLight = new THREE.AmbientLight(0x444444);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xff4400, 1, 200);
    pointLight.position.set(-50, 50, 50);
    scene.add(pointLight);

    const letterGroup = createLetterShape(letters[i]);
    scene.add(letterGroup);

    const camera = new THREE.PerspectiveCamera(50, 1, 1, 500);
    camera.position.z = 80;

    elements.push({ scene, camera, letterGroup });
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  await enableThreeJSResize(win, {
    preferredWidth: width,
    preferredHeight: height,
    renderer,
    camera: elements[0].camera,
  });
  renderer.setScissorTest(true);

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

      // Animate each letter
      elements.forEach((element, i) => {
        element.letterGroup.rotation.y = Math.sin(time + i * 0.5) * 0.5;
        element.letterGroup.rotation.x = Math.sin(time * 0.7 + i * 0.3) * 0.2;
        element.letterGroup.position.y = Math.sin(time * 2 + i) * 5;
      });

      // Clear entire canvas
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.setClearColor(0x000000);
      renderer.clear();

      // Render letters horizontally
      const cellWidth = width / letters.length;
      const cellHeight = height;

      for (let i = 0; i < letters.length; i++) {
        const element = elements[i];

        const left = Math.floor(i * cellWidth);
        const bottom = 0;
        const w = Math.floor(cellWidth);
        const h = Math.floor(cellHeight);

        element.camera.aspect = w / h;
        element.camera.updateProjectionMatrix();

        renderer.setScissor(left, bottom, w, h);
        renderer.setViewport(left, bottom, w, h);
        renderer.render(element.scene, element.camera);
      }

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
    { title: 'three.js webgl - multiple elements text' },
    (a) => {
      a.window(
        { title: 'three.js webgl - multiple elements text', width: WIDTH, height: HEIGHT },
        (win) => {
          win.setContent(() => {
            a.label('Initializing three.js...');
          });
          win.show();

          setTimeout(async () => {
            await buildWebGLMultipleElementsText(a, win, { width: WIDTH, height: HEIGHT });
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
