/**
 * Tsyne TabletTop
 *
 * A tablet-style launcher environment for Tsyne apps.
 * Reuses the PhoneTop implementation but with tablet-optimized grid settings
 * and app filtering (no phone-specific apps like Dialer).
 *
 * Run with: ./scripts/tsyne launchers/tablettop/index.ts
 */

import { App } from 'tsyne';
import { PhoneTop, buildPhoneTop, PhoneTopOptions } from '../phonetop/index';
import { MockContactsService, MockTelephonyService, MockSMSService } from '../../phone-apps/services';
import * as fs from 'fs';
import { initWasm } from '@resvg/resvg-wasm';

// Tablet grid configuration
// Landscape-first orientation typical for tablets
const TABLET_COLS = 6;
const TABLET_ROWS = 4;

// Apps to exclude from TabletTop (phone-specific)
const EXCLUDED_APPS = new Set([
  'Dialer',
  'Messages', // SMS
  'Camera',   // Often different on tablets, but maybe keep it? User said "no dialer".
]);

// Track if WASM is initialized
let wasmInitialized = false;

/**
 * Build TabletTop
 */
export async function buildTabletTop(a: App, options?: Partial<PhoneTopOptions>) {
  // Initialize resvg WASM if not already done
  if (!wasmInitialized) {
    try {
      const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
      const wasmBuffer = fs.readFileSync(wasmPath);
      await initWasm(wasmBuffer);
      wasmInitialized = true;
    } catch (e) {
      console.warn('[tablettop] WASM init failed, icons may not render:', e);
    }
  }

  const tabletOptions: PhoneTopOptions = {
    ...options,
    columns: TABLET_COLS,
    rows: TABLET_ROWS,
    // Use Mock services, but we could provide Tablet-specific ones if needed
    services: options?.services || {
      contacts: new MockContactsService(),
      telephony: new MockTelephonyService(), // Not used if Dialer is filtered
      sms: new MockSMSService(),             // Not used if Messages is filtered
    },
    appFilter: (metadata) => !EXCLUDED_APPS.has(metadata.name),
    fontSize: 16, // Slightly larger font for tablet
  };

  // Reuse PhoneTop logic
  const launcher = new PhoneTop(a, tabletOptions);
  await launcher.init();
  await launcher.build();
}

// Entry point
if (require.main === module) {
  const { app, resolveTransport } = require('tsyne');

  // Check for debug port via environment variable
  const debugPort = process.env.TSYNE_DEBUG_PORT ? parseInt(process.env.TSYNE_DEBUG_PORT, 10) : undefined;

  app(resolveTransport(), { title: 'Tsyne Tablet' }, async (a: App) => {
    await buildTabletTop(a, { debugPort });
  });
}
