/**
 * Charon Jr. Terrain Rendering Glitch — Elimination Test
 *
 * Renders ONLY the terrain (floor) mesh with progressive additions to isolate
 * the source of white artifacts on the landscape.
 *
 * Run individual tests:
 *   npx jest --config ported-apps/roblouie_charonir/jest.config.js -t "floor only" --runInBand
 *
 * Run all:
 *   npx jest --config ported-apps/roblouie_charonir/jest.config.js --testPathPattern terrain-glitch --runInBand
 */

import { TsyneTest } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';

// Import sets up the @/ path alias hook as a side effect
import { buildCharonJr, WIDTH, HEIGHT } from './src/main';

const INIT_WAIT = 30_000;   // Time to let shaders compile + textures generate (onEnter ~23s)
const SETTLE_WAIT = 5_000;  // Extra settle time for rendering
const TEST_TIMEOUT = 90_000;

const screenshotsDir = path.join(__dirname, 'screenshots');

// Everything except the floor — skip all of these to get terrain only
const EVERYTHING_BUT_FLOOR = [
  'lake', 'skybox', 'plants', 'trees', 'treeLeaves', 'rocks',
  'tombstone', 'truck', 'dynamicBody', 'spirit', 'dropoff', 'arrowGuide',
];

// Progressive elimination: start with floor only, add objects back one at a time
const ELIMINATION_CONFIGS: Array<{ name: string; skip: string[] }> = [
  {
    name: 'floor-only',
    skip: EVERYTHING_BUT_FLOOR,
  },
  {
    name: 'floor-lake',
    skip: EVERYTHING_BUT_FLOOR.filter(s => s !== 'lake'),
  },
  {
    name: 'floor-skybox',
    skip: EVERYTHING_BUT_FLOOR.filter(s => s !== 'skybox'),
  },
  {
    name: 'floor-lake-skybox',
    skip: EVERYTHING_BUT_FLOOR.filter(s => s !== 'lake' && s !== 'skybox'),
  },
  {
    name: 'floor-plants-trees',
    skip: EVERYTHING_BUT_FLOOR.filter(s => !['plants', 'trees', 'treeLeaves'].includes(s)),
  },
  {
    name: 'full-scene',
    skip: [],  // no skip — full scene baseline
  },
];

async function runAndScreenshot(
  testName: string,
  skip: string[],
): Promise<string[]> {
  // Set skip list before game code runs
  (globalThis as any).__CHARON_SKIP = skip.length > 0 ? skip : undefined;
  (globalThis as any).__CHARON_AUTO_LEVEL = 0;
  // Drive forward to see terrain
  (globalThis as any).__CHARON_AUTO_DRIVE = true;

  if (skip.length > 0) {
    console.log(`[TERRAIN] Skipping: ${skip.join(', ')}`);
  } else {
    console.log('[TERRAIN] Full scene (no skip)');
  }

  const tsyneTest = new TsyneTest({ headed: true, timeout: TEST_TIMEOUT });
  let game: { stop: () => Promise<void> } | undefined;
  const savedScreenshots: string[] = [];

  try {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: `Terrain [${testName}]`, width: WIDTH, height: HEIGHT },
        (win) => {
          win.show();
          setTimeout(async () => {
            try {
              game = await buildCharonJr(app, win);
            } catch (e) {
              console.error('[TERRAIN] buildCharonJr failed:', e);
            }
          }, 100);
        },
      );
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for init (shader compile, texture generation, first frames)
    console.log(`[TERRAIN] Waiting ${INIT_WAIT / 1000}s for init...`);
    await ctx.wait(INIT_WAIT);

    // Take multiple screenshots over time to catch transient artifacts
    for (let i = 0; i < 5; i++) {
      const label = `${i * 3}s`;
      const shotPath = path.join(screenshotsDir, `terrain-${testName}-t${label}.png`);
      await tsyneTest.screenshot(shotPath);
      savedScreenshots.push(shotPath);
      console.log(`[TERRAIN] Screenshot: ${shotPath}`);
      if (i < 4) await ctx.wait(3000);
    }

  } finally {
    if (game) await game.stop();
    delete (globalThis as any).__CHARON_SKIP;
    delete (globalThis as any).__CHARON_AUTO_LEVEL;
    delete (globalThis as any).__CHARON_AUTO_DRIVE;
    await tsyneTest.cleanup();
  }

  return savedScreenshots;
}

describe('Charon Jr. terrain rendering glitch', () => {
  for (const config of ELIMINATION_CONFIGS) {
    test(`${config.name}`, async () => {
      const screenshots = await runAndScreenshot(config.name, config.skip);
      expect(screenshots.length).toBeGreaterThan(0);
      for (const p of screenshots) {
        expect(fs.existsSync(p)).toBe(true);
        const stat = fs.statSync(p);
        expect(stat.size).toBeGreaterThan(1000); // Not an empty/corrupt image
        console.log(`  ${path.basename(p)}: ${stat.size} bytes`);
      }
    }, TEST_TIMEOUT);
  }
});
