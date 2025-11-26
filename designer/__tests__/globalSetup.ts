/**
 * Global Jest Setup
 *
 * Starts the designer server before all tests run.
 * Stores the server PID in a temp file for teardown to use.
 */

import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PID_FILE = path.join(__dirname, '.server-pid');
const PORT = 3000;
const MAX_WAIT_TIME = 30000; // 30 seconds
const CHECK_INTERVAL = 500; // Check every 500ms

/**
 * Check if server is responding at the given URL
 */
function isServerReady(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for server to be ready
 */
async function waitForServer(url: string, maxWaitTime: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    if (await isServerReady(url)) {
      console.log(`✓ Designer server is ready at ${url}`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }

  throw new Error(`Designer server failed to start within ${maxWaitTime}ms`);
}

export default async function globalSetup() {
  console.log('🚀 Starting designer server for tests...');

  // Build the designer first
  const designerDir = path.join(__dirname, '..');
  console.log('📦 Building designer...');

  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: designerDir,
    stdio: 'inherit'
  });

  await new Promise<void>((resolve, reject) => {
    buildProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Designer build failed with code ${code}`));
      }
    });
  });

  console.log('✓ Designer built successfully');

  // Start the server
  const serverProcess = spawn('node', ['dist/server.js'], {
    cwd: designerDir,
    detached: true,
    stdio: 'ignore'
  });

  // Unref so the parent process can exit
  serverProcess.unref();

  // Store PID for teardown
  fs.writeFileSync(PID_FILE, serverProcess.pid!.toString());
  console.log(`✓ Designer server started (PID: ${serverProcess.pid})`);

  // Wait for server to be ready
  await waitForServer(`http://localhost:${PORT}`, MAX_WAIT_TIME);
}
