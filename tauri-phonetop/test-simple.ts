#!/usr/bin/env npx tsx
/**
 * Simple test for web-renderer mode
 * Creates a basic UI to verify the WebRendererBridge works
 */

// Force web-renderer mode
process.env.TSYNE_BRIDGE_MODE = 'web-renderer';

import { app, resolveTransport } from '../core/src/index';
import type { App } from '../core/src/app';

console.log('Starting simple web-renderer test...');
console.log(`Bridge mode: ${resolveTransport()}`);

app(resolveTransport(), { title: 'Web Renderer Test' }, async (a: App) => {
  a.window({ title: 'Test Window', width: 400, height: 300 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Hello from Tsyne Web Renderer!');
        a.separator();
        a.button('Click Me').onClick(() => {
          console.log('Button clicked!');
        });
        a.hbox(() => {
          a.label('Enter text:');
          a.entry('');
        });
      });
    });
    win.show();
  });
});
