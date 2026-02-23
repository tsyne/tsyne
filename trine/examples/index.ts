/**
 * Tsyne Three.js Examples Launcher
 *
 * Dynamically discovers and launches all three.js example applications in this directory.
 * - Regular examples run with `npx tsx`
 * - Test files run with `npm test` (jest)
 *
 * Run: npx tsx trine/examples/index.ts
 *
 * @tsyne-app:name Three.js Examples
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24">
 *   <polygon points="12,2 22,20 2,20" fill="none" stroke="#049EF4" stroke-width="2"/>
 *   <polygon points="12,6 18,18 6,18" fill="#049EF4" stroke="none"/>
 * </svg>
 * SVG
 * @tsyne-app:category demos
 * @tsyne-app:builder createExamplesLauncher
 * @tsyne-app:args app
 */

import { app, resolveTransport, createAppLauncher } from 'tsyne';

// Create launcher for both examples and tests
const createExamplesLauncher = createAppLauncher('Three.js Examples', __dirname, {
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
      args: [(() => { try { return require.resolve('tsyne/dist/src/show-source'); } catch { return 'show-source'; } })(), '{filepath}'],
      excludePattern: '*.test.ts',  // Only show source for production code
      captureOutput: true
    },
    {
      pattern: '*.ts',
      label: 'Original',
      buttonFormat: 'threejs.org',
      command: '', args: [],
      excludePattern: '*.test.ts',
      openUrl: 'https://threejs.org/examples/#{name}'
    }
  ],
  exclude: ['index.ts', 'index.test.ts'],
  instructions: 'Click any three.js example or test to launch in a new window.'
});

if (require.main === module) {
  // Handle Ctrl-C gracefully
  process.on('SIGINT', () => {
    process.exit(0);
  });

  app(resolveTransport(), { title: 'Three.js Examples Launcher' }, createExamplesLauncher);
}

export { createExamplesLauncher };
