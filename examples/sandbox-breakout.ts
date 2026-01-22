/**
 * Sandbox Breakout Attacker
 *
 * @tsyne-app:name Sandbox Breakout
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="7"/><path d="M12 17v4"/><path d="M8 21h8"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><path d="M9 13c0 1 1.5 2 3 2s3-1 3-2"/></svg>
 * @tsyne-app:category Security
 * @tsyne-app:args app,windowWidth,windowHeight
 */
import { IApp } from '../core/src/sandboxed-app';

export function buildSandboxBreakoutApp(a: IApp) {
  a.window({ title: 'Sandbox Breakout Test', width: 600, height: 800 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Sandbox Breakout Attempts');
        a.label('Check the console for results.');

        // --- ATTEMPT 1: Direct require('fs') ---
        try {
          const fs = require('fs');
          console.log('[FAIL] Breakout Succeeded: require("fs") returned', fs);
        } catch (e: any) {
          console.log('[SUCCESS] Breakout Prevented: require("fs") threw an error:', e.message);
        }

        // --- ATTEMPT 2: Direct process.exit() ---
        try {
          // This will be transformed, so we expect it to fail.
          // Note: we can't actually call it or the app would exit if it succeeded.
          if (typeof (process as any).exit === 'function') {
             console.log('[FAIL] Breakout Succeeded: process.exit is a function.');
          } else {
             console.log('[SUCCESS] Breakout Prevented: process.exit is not a function.');
          }
        } catch (e: any) {
          console.log('[SUCCESS] Breakout Prevented: Accessing process threw an error:', e.message);
        }

        // --- ATTEMPT 3: Obfuscated global access ---
        try {
          const p = (global as any)['pro' + 'cess'];
          console.log('[FAIL] Breakout Succeeded: Obfuscated global access returned', p);
        } catch (e: any) {
          console.log('[SUCCESS] Breakout Prevented: Obfuscated global access threw an error:', e.message);
        }

        // --- ATTEMPT 4: Function constructor escape ---
        try {
          const evilFn = new Function('return process')();
          console.log('[FAIL] Breakout Succeeded: Function constructor returned', evilFn);
        } catch (e: any) {
          console.log('[SUCCESS] Breakout Prevented: Function constructor threw an error:', e.message);
        }

        // --- ATTEMPT 5: Dynamic import() ---
        try {
          import('fs').then(fs => {
            console.log('[FAIL] Breakout Succeeded: Dynamic import("fs") returned', fs);
          }).catch(e => {
            console.log('[SUCCESS] Breakout Prevented: Dynamic import("fs") was caught:', e.message);
          });
        } catch (e: any) {
             console.log('[SUCCESS] Breakout Prevented: Dynamic import("fs") threw a synchronous error:', e.message);
        }

        // --- ATTEMPT 6: Prototype Pollution ---
        try {
          (Object.prototype as any).polluted = 'POLLUTED';
          console.log('[SUCCESS] Prototype Pollution Attempted: Check host logs for evidence.');
        } catch (e: any) {
          console.log('[FAIL] Could not even attempt prototype pollution:', e.message);
        }

      });
    });
    win.show();
  });
}
