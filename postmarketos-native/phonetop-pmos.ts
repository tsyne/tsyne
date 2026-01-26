/**
 * PhoneTop for postmarketOS
 * Uses static app definitions from generated manifest
 */
import { app, resolveTransport } from 'tsyne';
import { buildPhoneTopAndroid } from '../launchers/phonetop/phonetop-android';

// Run phonetop with static apps
// Pixel 3a XL: 1080x2160 display needs ~2x scaling for readable UI
app(resolveTransport(), { title: 'Tsyne Phone', fullscreen: true }, async (a) => {
  await buildPhoneTopAndroid(a, {
    debugPort: 9230,
    debugToken: process.env.TSYNE_DEBUG_TOKEN || 'test123',
    iconScale: 2.0,   // 64 * 2 = 128px icons
    fontSize: 28,     // 2x default for high-DPI
  });
});
