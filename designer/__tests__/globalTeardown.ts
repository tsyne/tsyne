/**
 * Global Jest Teardown
 *
 * Stops the designer server after all tests complete.
 * Reads the server PID from the temp file and kills the process.
 */

import * as fs from 'fs';
import * as path from 'path';

const PID_FILE = path.join(__dirname, '.server-pid');

export default async function globalTeardown() {
  console.log('🛑 Stopping designer server...');

  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);

      if (pid && !isNaN(pid)) {
        try {
          // Kill the process
          process.kill(pid, 'SIGTERM');
          console.log(`✓ Designer server stopped (PID: ${pid})`);

          // Give it a moment to shut down gracefully
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Force kill if still running
          try {
            process.kill(pid, 0); // Check if process exists
            process.kill(pid, 'SIGKILL');
            console.log(`✓ Designer server force-killed (PID: ${pid})`);
          } catch (e) {
            // Process already exited, which is good
          }
        } catch (err: any) {
          if (err.code !== 'ESRCH') {
            // ESRCH means process doesn't exist, which is fine
            console.warn(`Warning: Failed to kill process ${pid}:`, err.message);
          }
        }
      }

      // Clean up PID file
      fs.unlinkSync(PID_FILE);
    } else {
      console.warn('Warning: PID file not found, server may not have started properly');
    }
  } catch (err) {
    console.error('Error during teardown:', err);
  }
}
