/**
 * PhoneTop entry point for postmarketOS (Pixel 3a XL)
 *
 * This is the entry point that start-phonetop.sh runs via:
 *   npx tsx phone-apps/phonetop.ts
 */

import { app } from 'tsyne';
import { buildPhoneTopPostmarketOS } from '../launchers/phonetop/phonetop-postmarketos';

console.log('[phonetop.ts] Starting PhoneTop for postmarketOS');

app('fyne', { title: 'Tsyne Phone' }, async (a) => {
  console.log('[phonetop.ts] App instance created, building UI...');

  await buildPhoneTopPostmarketOS(a, {
    // Pixel 3a XL: 1080x2160, FYNE_SCALE=2.5 in start-phonetop.sh
    // So effective resolution is 432x864 in Fyne units
    iconScale: 1.0,  // 64px icons - Fyne scaling handles display size
    fontSize: 14,  // Smaller text under icons
    useImageButton: true,  // ImageButton works - needed for SVG icons
    debugPort: 9230,  // Remote debug/control API
  });

  console.log('[phonetop.ts] PhoneTop UI built!');
});
