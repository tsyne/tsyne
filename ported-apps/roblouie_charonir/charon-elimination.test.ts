/**
 * Charon Jr. GPU Hang Elimination Test
 *
 * Systematically removes scene objects to identify which one causes the GPU hang.
 * Each test runs the game for DURATION ms with one object category skipped.
 * If the test completes without timeout, that object isn't the cause.
 * If it hangs (Jest timeout), that object is a suspect.
 *
 * Run individual tests:
 *   npx jest --config ported-apps/roblouie_charonir/jest.config.js -t "without floor" --runInBand
 *
 * Run all:
 *   npx jest --config ported-apps/roblouie_charonir/jest.config.js --runInBand
 *
 * Or use env var for manual testing (no Jest):
 *   CHARON_SKIP=floor ./scripts/tsyne ported-apps/roblouie_charonir/src/main.ts
 *   CHARON_SKIP=floor,plants,trees ./scripts/tsyne ported-apps/roblouie_charonir/src/main.ts
 */

import { TsyneTest } from 'tsyne';

// Import sets up the @/ path alias hook as a side effect
import { buildCharonJr, WIDTH, HEIGHT } from './src/main';

const DURATION = 90_000; // 90 seconds — hang manifests at ~60s
const TEST_TIMEOUT = DURATION + 30_000;

// All tagged object categories in the scene.
// These match the _drawTag values set in level.ts and game.state.ts.
// Prefix matching: 'spirit' skips spirit_0_body, spirit_0_icon, spirit_1_body, etc.
const OBJECT_CATEGORIES = [
  'floor',       // 2047×2047 heightmap terrain (255×255 = 65K vertices)
  'lake',        // Water plane (4 vertices)
  'skybox',      // 6-face skybox
  'plants',      // Instanced grass
  'trees',       // Instanced tree trunks
  'treeLeaves',  // Instanced tree leaves
  'rocks',       // Instanced rocks
  'tombstone',   // Ramp tombstones
  'truck',       // Player truck (multiple child meshes)
  'dynamicBody', // Carried spirit body parts
  'spirit',      // All spirit meshes (body + icon per spirit)
  'dropoff',     // All dropoff cylinders (transparent)
  'arrowGuide',  // Direction arrow
];

async function runCharonFor(duration: number, skip?: string[]): Promise<void> {
  // Set skip list before game code runs
  if (skip) {
    (globalThis as any).__CHARON_SKIP = skip;
    console.log(`[ELIM] Skipping: ${skip.join(', ')}`);
  }

  // Auto-start level 0 (Earth) — bypasses the menu
  (globalThis as any).__CHARON_AUTO_LEVEL = 0;

  // Simulate driving: hold W (accelerate) + alternate A/D (steer)
  // This ensures the truck moves around and the GPU processes varying geometry.
  (globalThis as any).__CHARON_AUTO_DRIVE = true;

  const tsyneTest = new TsyneTest({ headed: true });
  let game: { stop: () => Promise<void> } | undefined;

  try {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: `Charon Elim [skip: ${skip?.join(',') ?? 'none'}]`, width: WIDTH, height: HEIGHT }, (win) => {
        win.show();
        setTimeout(async () => {
          try {
            game = await buildCharonJr(app, win);
          } catch (e) {
            console.error('[ELIM] buildCharonJr failed:', e);
          }
        }, 100);
      });
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(duration);

    console.log(`[ELIM] Completed ${duration}ms without hang — skip=[${skip?.join(',') ?? 'none'}]`);
  } finally {
    if (game) await game.stop();
    delete (globalThis as any).__CHARON_SKIP;
    delete (globalThis as any).__CHARON_AUTO_LEVEL;
    delete (globalThis as any).__CHARON_AUTO_DRIVE;
    await tsyneTest.cleanup();
  }
}

describe('Charon Jr. GPU hang elimination', () => {
  // Baseline — full scene, expect hang
  test('full scene (baseline)', async () => {
    await runCharonFor(DURATION);
  }, TEST_TIMEOUT);

  // Test each object category individually
  for (const skip of OBJECT_CATEGORIES) {
    test(`without ${skip}`, async () => {
      await runCharonFor(DURATION, [skip]);
    }, TEST_TIMEOUT);
  }

  // Binary search: skip half the heavy objects
  test('without heavy geometry (floor+plants+trees+rocks)', async () => {
    await runCharonFor(DURATION, ['floor', 'plants', 'trees', 'treeLeaves', 'rocks']);
  }, TEST_TIMEOUT);

  test('without all instanced (plants+trees+treeLeaves+rocks)', async () => {
    await runCharonFor(DURATION, ['plants', 'trees', 'treeLeaves', 'rocks']);
  }, TEST_TIMEOUT);

  test('without all spirits and dropoffs', async () => {
    await runCharonFor(DURATION, ['spirit', 'dropoff']);
  }, TEST_TIMEOUT);
});
