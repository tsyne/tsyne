/**
 * Minimal mouse event test
 *
 * Tests whether mouse events flow through:
 * 1. Fyne (HoverableShader) receives mouse
 * 2. Bridge sends to JS
 * 3. TsyneCanvas receives event
 * 4. Canvas dispatches to addEventListener
 */

import { app, resolveTransport, standaloneShutdownStrategy } from 'tsyne';
import type { App, ITsyneWindow } from 'tsyne';
import { initThreeJS } from '../integration/init';

export async function buildMouseTest(a: App, win: ITsyneWindow) {
  const width = 400;
  const height = 300;

  const { THREE, canvasId } = await initThreeJS(a, win, { width, height, interactive: true });
  console.log('[MOUSE TEST] Canvas ID:', canvasId);

  // Simple scene: one red cube
  const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.z = 3;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  scene.add(cube);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);

  // ═══════════════════════════════════════════════════════════════════════════
  // MOUSE EVENT DEBUGGING
  // ═══════════════════════════════════════════════════════════════════════════

  const canvas = renderer.domElement;
  console.log('[MOUSE TEST] Canvas type:', canvas.constructor.name);
  console.log('[MOUSE TEST] Canvas has addEventListener:', typeof canvas.addEventListener);

  // Test 1: Standard DOM event listeners
  canvas.addEventListener('pointermove', (e: any) => {
    console.log('[MOUSE TEST] pointermove:', e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerdown', (e: any) => {
    console.log('[MOUSE TEST] pointerdown:', e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerup', (e: any) => {
    console.log('[MOUSE TEST] pointerup:', e.clientX, e.clientY);
  });

  canvas.addEventListener('mousemove', (e: any) => {
    console.log('[MOUSE TEST] mousemove:', e.clientX, e.clientY);
  });

  canvas.addEventListener('click', (e: any) => {
    console.log('[MOUSE TEST] click:', e.clientX, e.clientY);
  });

  // Test 2: Direct property assignment
  canvas.onmousemove = (e: any) => {
    console.log('[MOUSE TEST] onmousemove:', e?.clientX, e?.clientY);
  };

  canvas.onclick = (e: any) => {
    console.log('[MOUSE TEST] onclick:', e?.clientX, e?.clientY);
  };

  console.log('[MOUSE TEST] Event listeners attached. Move mouse over the red cube.');

  // Animation loop
  let running = true;
  const animate = async () => {
    while (running) {
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (gl?.flush) await gl.flush();

      await new Promise(r => setTimeout(r, 16));
    }
  };
  animate();

  return { stop: () => { running = false; } };
}

async function main() {
  const appInstance = app(
    resolveTransport(),
    { title: 'Mouse Event Test' },
    (a) => {
      a.window({ title: 'Mouse Event Test', width: 400, height: 300 }, (win) => {
        win.setContent(() => { a.label('Loading...'); });
        win.show();
        setTimeout(() => buildMouseTest(a, win), 100);
      });
    }
  );
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}

if (require.main === module) main().catch(console.error);
