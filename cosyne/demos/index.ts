/**
 * Cosyne Demos Launcher
 *
 * Dynamically discovers and launches all demo applications in this directory.
 * Run: npx tsx cosyne/demos/index.ts
 */

import { app, resolveTransport, createAppLauncher } from 'tsyne';

// Create launcher for both demos and tests
const createDemosLauncher = createAppLauncher('Cosyne Demos', __dirname, {
  patterns: [
    {
      pattern: '*.ts',
      label: 'Launch',
      buttonFormat: '▶ Launch',
      command: 'npx',
      args: ['tsx', '{filepath}']
    },
    {
      pattern: '*.test.ts',
      label: 'Test',
      buttonFormat: 'run tests',
      command: 'npx',
      args: ['jest', '{filepath}', '--maxWorkers=1'],
      captureOutput: true
    },
    {
      pattern: '*.ts',
      label: 'Source',
      buttonFormat: 'show source',
      command: 'node',
      args: [require.resolve('tsyne/dist/src/show-source'), '{filepath}'],
      excludePattern: '*.test.ts',  // Only show source for production code
      captureOutput: true
    }
  ],
  exclude: ['index.ts', 'index.test.ts'],
  instructions: 'Click any demo to launch in a new window.'
});

if (require.main === module) {
  // Handle Ctrl-C gracefully
  process.on('SIGINT', () => {
    process.exit(0);
  });

  app(resolveTransport(), { title: 'Cosyne Demos Launcher' }, createDemosLauncher);
}

export { createDemosLauncher };
