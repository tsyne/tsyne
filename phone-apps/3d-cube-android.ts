/**
 * Standalone 3D Cube for Android - Debug Build
 *
 * This bypasses phonetop completely to test if the crash is in
 * phonetop's navigation or the 3D cube app itself.
 */

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import { create3DCubeApp } from '../ported-apps/3d-cube/3d-cube';

// Re-export for the bundle
export { app } from 'tsyne';

export async function start3DCube(a: App) {
  console.log('[3D-Cube] Creating app...');
  const ui = create3DCubeApp(a, 390, 650);
  console.log('[3D-Cube] UI created, running...');
  await a.run();
  console.log('[3D-Cube] a.run() done, initializing...');
  await ui.initialize();
  console.log('[3D-Cube] Ready!');
}
