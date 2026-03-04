/**
 * Charon Jr. White Patch Visual Elimination Test
 *
 * Each test shows a headed window for visual observation.
 * The user watches each test to see if white patches appear.
 *
 * Run ALL tests (sequential, ~5 min total):
 *   npx jest --config ported-apps/roblouie_charonir/jest.config.js \
 *     --testPathPatterns white-patch --runInBand
 *
 * Run ONE test by name:
 *   npx jest --config ported-apps/roblouie_charonir/jest.config.js \
 *     -t "baseline" --testPathPatterns white-patch --runInBand
 *
 * Test names: baseline, magenta-clear, red-material, force-layer0, floor-only
 */

import { TsyneTest } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';

import { buildCharonJr, WIDTH, HEIGHT } from './src/main';

const INIT_WAIT = 35_000;    // Time for game to fully load
const OBSERVE_WAIT = 20_000; // Time for user to observe each phase
const TEST_TIMEOUT = 120_000;

const screenshotsDir = path.join(__dirname, 'screenshots');

interface EliminationTest {
  name: string;
  description: string;
  /** Set globals before game starts */
  preStart?: () => void;
  /** Called after game loads to modify state */
  modify?: () => void;
  /** Cleanup globals */
  cleanup?: () => void;
}

async function runVisualTest(config: EliminationTest): Promise<string[]> {
  // Pre-start globals
  (globalThis as any).__CHARON_AUTO_LEVEL = 0;
  (globalThis as any).__CHARON_AUTO_DRIVE = true;
  if (config.preStart) config.preStart();

  const tsyneTest = new TsyneTest({ headed: true, timeout: TEST_TIMEOUT });
  let game: { stop: () => Promise<void> } | undefined;
  const screenshots: string[] = [];

  try {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: `WhitePatch [${config.name}] — ${config.description}`, width: WIDTH, height: HEIGHT },
        (win) => {
          win.show();
          setTimeout(async () => {
            try {
              game = await buildCharonJr(app, win);
            } catch (e) {
              console.error(`[WP] buildCharonJr failed:`, e);
            }
          }, 100);
        },
      );
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for full initialization
    console.log(`\n[WP] ═══ ${config.name}: ${config.description} ═══`);
    console.log(`[WP] Waiting ${INIT_WAIT / 1000}s for game to load...`);
    await ctx.wait(INIT_WAIT);

    // Apply modification if any
    if (config.modify) {
      console.log(`[WP] Applying modification: ${config.name}`);
      config.modify();
    }

    // Wait and take screenshots at intervals
    console.log(`[WP] ▶ OBSERVE NOW — look for white patches (${OBSERVE_WAIT / 1000}s)`);
    for (let i = 0; i < 4; i++) {
      await ctx.wait(OBSERVE_WAIT / 4);
      const shotPath = path.join(screenshotsDir, `wp-${config.name}-${i}.png`);
      await tsyneTest.screenshot(shotPath);
      screenshots.push(shotPath);
      console.log(`[WP] Screenshot ${i}: ${path.basename(shotPath)}`);
    }

  } finally {
    if (game) await game.stop();
    delete (globalThis as any).__CHARON_AUTO_LEVEL;
    delete (globalThis as any).__CHARON_AUTO_DRIVE;
    delete (globalThis as any).__CHARON_SKIP;
    if (config.cleanup) config.cleanup();
    await tsyneTest.cleanup();
  }

  return screenshots;
}

// ─── Modification helpers ───

function setMagentaClear() {
  const { gl } = require('./src/engine/renderer/lil-gl');
  // Magenta clear color — if white patches turn magenta, it's a compositing/clear issue
  gl.clearColor(1, 0, 1, 1);
  console.log('[WP] clearColor set to MAGENTA [1,0,1,1]');
}

function setRedMaterial() {
  const { gameStates } = require('./src/index');
  const gs = gameStates.gameState;
  if (!gs?.currentLevel?.floorMesh?.material) {
    console.log('[WP] WARNING: floor mesh not found');
    return;
  }
  gs.currentLevel.floorMesh.material.color = [1.0, 0.0, 0.0, 1.0];
  console.log('[WP] Floor material color → RED [1,0,0,1]');
}

function forceTextureLayer0() {
  const { gameStates } = require('./src/index');
  const gs = gameStates.gameState;
  if (!gs?.currentLevel?.floorMesh?.geometry) {
    console.log('[WP] WARNING: floor geometry not found');
    return;
  }
  const geom = gs.currentLevel.floorMesh.geometry;
  const buffers = geom.buffers as Map<number, { data: Float32Array; size: number }>;
  const texDepth = buffers.get(3); // TextureDepth location
  if (texDepth) {
    texDepth.data.fill(0); // Force all vertices to texture layer 0 (dirtPath)
    geom.bindGeometry();   // Re-upload to GPU
    console.log(`[WP] TextureDepth forced to 0 (dirtPath only), ${texDepth.data.length} vertices`);
  } else {
    console.log('[WP] WARNING: TextureDepth buffer not found');
  }
}

// ─── Test definitions ───

const TESTS: EliminationTest[] = [
  {
    name: 'baseline',
    description: 'Unmodified — do you see white patches?',
  },
  {
    name: 'magenta-clear',
    description: 'Clear=MAGENTA — if white turns magenta, it is compositing bleed-through',
    modify: setMagentaClear,
  },
  {
    name: 'red-material',
    description: 'Floor material=RED — if white turns red, texture is not reaching those triangles',
    modify: setRedMaterial,
  },
  {
    name: 'force-layer0',
    description: 'All TextureDepth=0 — if white disappears, it is a texture layer issue',
    modify: forceTextureLayer0,
  },
  {
    name: 'floor-only',
    description: 'Only floor mesh rendered — if white disappears, another object causes it',
    preStart: () => {
      (globalThis as any).__CHARON_SKIP = [
        'lake', 'skybox', 'plants', 'trees', 'treeLeaves', 'rocks',
        'tombstone', 'truck', 'dynamicBody', 'spirit', 'dropoff', 'arrowGuide',
      ];
    },
  },
];

// ─── Jest tests ───

describe('Charon Jr. white patch elimination', () => {
  for (const config of TESTS) {
    test(`${config.name}: ${config.description}`, async () => {
      const screenshots = await runVisualTest(config);
      expect(screenshots.length).toBeGreaterThan(0);
      for (const p of screenshots) {
        expect(fs.existsSync(p)).toBe(true);
        const stat = fs.statSync(p);
        expect(stat.size).toBeGreaterThan(1000);
        console.log(`  ${path.basename(p)}: ${(stat.size / 1024).toFixed(0)} KB`);
      }
    }, TEST_TIMEOUT);
  }
});
