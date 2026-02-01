/**
 * Cosyne Demos Launcher
 *
 * Dynamically discovers and launches all demo applications in this directory.
 * Run: npx tsx cosyne/demos/index.ts
 */

console.log('[STARTUP] Module loading...');

import { app, resolveTransport } from 'tsyne';
import type { App } from 'tsyne';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

console.log('[STARTUP] Imports complete');

function createDemosLauncher(a: App): void {
  console.log('[STARTUP] createDemosLauncher called');
  const demosDir = __dirname;

  // Read all .ts files except index.ts
  const demoFiles = fs.readdirSync(demosDir)
    .filter(file => file.endsWith('.ts') && file !== 'index.ts')
    .sort();

  console.log(`[LAUNCHER] Found ${demoFiles.length} demos:`, demoFiles);
  console.log(`[LAUNCHER] Demos directory: ${demosDir}`);

  const runningDemos = new Set<string>();

  a.window({ title: 'Cosyne Demos', width: 500, height: 600 }, (win: any) => {
    console.log(`[LAUNCHER] Window created, setting content`);
    win.setContent(() => {
      console.log(`[LAUNCHER] setContent builder called`);
      a.border({
        top: () => {
          a.vbox(() => {
            a.label('Available Demos').when(() => demoFiles.length > 0);
            a.separator();
          });
        },
        center: () => {
          a.scroll(() => {
            a.vbox(() => {
              for (const file of demoFiles) {
                const demoName = file.replace('.ts', '');
                const demoPath = path.join(demosDir, file);

                console.log(`[LAUNCHER] Creating button for demo: ${demoName}`);

                // Create handler with proper closure
                const makeClickHandler = (name: string, filePath: string) => {
                  return async () => {
                    console.log(`[DEBUG] Button clicked for: ${name}`);
                    console.log(`[DEBUG] Running demos set size: ${runningDemos.size}`);
                    console.log(`[DEBUG] Is ${name} already running? ${runningDemos.has(name)}`);

                    // Prevent launching same demo multiple times
                    if (runningDemos.has(name)) {
                      console.log(`[DEBUG] ${name} is already running, ignoring click`);
                      return;
                    }

                    runningDemos.add(name);
                    console.log(`[DEBUG] Added ${name} to running set`);
                    console.log(`[DEBUG] Demo path: ${filePath}`);
                    console.log(`[DEBUG] Demo path exists: ${fs.existsSync(filePath)}`);
                    console.log(`[DEBUG] Current working directory: ${process.cwd()}`);
                    console.log(`[DEBUG] Launching demo: ${name}`);

                    try {
                      // Spawn the demo as a separate process with inherited stdio
                      console.log(`[DEBUG] About to spawn: npx tsx ${filePath}`);
                      const child = spawn('npx', ['tsx', filePath], {
                        cwd: process.cwd(),
                        stdio: 'inherit' // Show all output from demo
                      });

                      console.log(`[DEBUG] Child process spawned with PID: ${child.pid}`);

                      child.on('error', (error) => {
                        console.error(`[ERROR] Failed to launch ${name}:`, error);
                        runningDemos.delete(name);
                      });

                      child.on('exit', (code) => {
                        console.log(`[DEBUG] Demo ${name} exited with code ${code}`);
                        runningDemos.delete(name);
                      });
                    } catch (error) {
                      console.error(`[ERROR] Exception spawning ${name}:`, error);
                      runningDemos.delete(name);
                    }
                  };
                };

                a.button(`▶ ${demoName}`)
                  .onClick(makeClickHandler(demoName, demoPath))
                  .withId(`demo-btn-${demoName}`);

                console.log(`[LAUNCHER] Button created for: ${demoName}`);
              }
            });
          });
        },
        bottom: () => {
          a.vbox(() => {
            a.separator();
            a.label('No demos found in this directory').when(() => demoFiles.length === 0);
            a.label('Click any demo to launch in a new window.').when(() => demoFiles.length > 0);
          });
        }
      });
      console.log(`[LAUNCHER] Content setup complete`);
    });

    console.log(`[LAUNCHER] Calling win.show()`);
    win.show();
    console.log(`[LAUNCHER] Window shown`);
  });
}

console.log('[STARTUP] Checking if main module...');
console.log('[STARTUP] require.main === module:', require.main === module);

if (require.main === module) {
  console.log('[STARTUP] This is the main module, creating app');
  app(resolveTransport(), { title: 'Cosyne Demos Launcher' }, createDemosLauncher);
} else {
  console.log('[STARTUP] This is being imported as a module');
}

export { createDemosLauncher };
