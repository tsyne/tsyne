/**
 * Charon Jr. Texture Elimination Test
 *
 * Tests hypotheses for white terrain patches by modifying TextureDepth
 * per-vertex data and analyzing the rendered output.
 *
 * Run: npx jest --config ported-apps/roblouie_charonir/jest.config.js \
 *        --testPathPatterns texture-elim --runInBand
 */

import { TsyneTest } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';

import { buildCharonJr, WIDTH, HEIGHT } from './src/main';

const INIT_WAIT = 30_000;
const RENDER_WAIT = 5_000;
const TEST_TIMEOUT = 90_000;

const screenshotsDir = path.join(__dirname, 'screenshots');

// Attribute location for TextureDepth in the game's shader
const TEXTURE_DEPTH_LOC = 3;

interface TestConfig {
  name: string;
  description: string;
  // Called after game is loaded to modify state before screenshots
  modify?: () => void;
}

async function runElimTest(config: TestConfig): Promise<{ screenshots: string[]; whitePixels: number[] }> {
  // Auto-start level 0 (Earth)
  (globalThis as any).__CHARON_AUTO_LEVEL = 0;
  (globalThis as any).__CHARON_AUTO_DRIVE = true;

  const tsyneTest = new TsyneTest({ headed: true, timeout: TEST_TIMEOUT });
  let game: { stop: () => Promise<void> } | undefined;
  const screenshots: string[] = [];
  const whitePixels: number[] = [];

  try {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const testApp = await tsyneTest.createApp((app) => {
      app.window(
        { title: `TexElim [${config.name}]`, width: WIDTH, height: HEIGHT },
        (win) => {
          win.show();
          setTimeout(async () => {
            try {
              game = await buildCharonJr(app, win);
            } catch (e) {
              console.error('[TEXELIM] buildCharonJr failed:', e);
            }
          }, 100);
        },
      );
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    console.log(`[TEXELIM] ${config.name}: waiting ${INIT_WAIT / 1000}s for init...`);
    await ctx.wait(INIT_WAIT);

    // Inspect + modify game state
    inspectTextureDepth(config.name);
    if (config.modify) {
      console.log(`[TEXELIM] ${config.name}: applying modification...`);
      config.modify();
    }

    // Wait for modified rendering to take effect
    await ctx.wait(RENDER_WAIT);

    // Take screenshots
    for (let i = 0; i < 3; i++) {
      const shotPath = path.join(screenshotsDir, `texelim-${config.name}-${i}.png`);
      await tsyneTest.screenshot(shotPath);
      screenshots.push(shotPath);
      console.log(`[TEXELIM] Screenshot: ${path.basename(shotPath)}`);
      if (i < 2) await ctx.wait(2000);
    }

  } finally {
    if (game) await game.stop();
    delete (globalThis as any).__CHARON_AUTO_LEVEL;
    delete (globalThis as any).__CHARON_AUTO_DRIVE;
    await tsyneTest.cleanup();
  }

  return { screenshots, whitePixels };
}

/** Inspect the floor mesh's TextureDepth buffer and log statistics */
function inspectTextureDepth(testName: string) {
  try {
    const { gameStates } = require('./src/index');
    const gameState = gameStates.gameState;
    if (!gameState?.currentLevel) {
      console.log(`[TEXELIM] ${testName}: no level loaded`);
      return;
    }

    const floorMesh = gameState.currentLevel.floorMesh;
    if (!floorMesh?.geometry) {
      console.log(`[TEXELIM] ${testName}: no floorMesh geometry`);
      return;
    }

    const geom = floorMesh.geometry;
    const buffers = geom.buffers as Map<number, { data: Float32Array; size: number }>;

    console.log(`[TEXELIM] ${testName}: buffers in geometry:`);
    buffers.forEach((buf, loc) => {
      console.log(`  location ${loc}: ${buf.data.length} floats, size=${buf.size}, vertices=${buf.data.length / buf.size}`);
    });

    const texDepth = buffers.get(TEXTURE_DEPTH_LOC);
    if (!texDepth) {
      console.log(`[TEXELIM] ${testName}: NO TextureDepth buffer at location ${TEXTURE_DEPTH_LOC}`);
      return;
    }

    const data = texDepth.data;
    let min = Infinity, max = -Infinity;
    let nanCount = 0, negCount = 0, zeroCount = 0, oneCount = 0;
    const histogram = new Map<string, number>();

    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (isNaN(v)) { nanCount++; continue; }
      if (v < 0) negCount++;
      if (v < min) min = v;
      if (v > max) max = v;

      // Bucket to 2 decimal places
      const bucket = v.toFixed(2);
      histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    }

    // Which GL layers would be sampled: floor(v + 0.5)
    const layerHits = new Map<number, number>();
    for (let i = 0; i < data.length; i++) {
      const layer = Math.floor(data[i] + 0.5);
      layerHits.set(layer, (layerHits.get(layer) || 0) + 1);
    }

    console.log(`[TEXELIM] ${testName}: TextureDepth stats:`);
    console.log(`  count=${data.length} min=${min.toFixed(4)} max=${max.toFixed(4)}`);
    console.log(`  NaN=${nanCount} negative=${negCount}`);
    console.log(`  Layer hits: ${[...layerHits.entries()].map(([k, v]) => `layer${k}=${v}`).join(' ')}`);

    // Top 10 histogram buckets
    const sorted = [...histogram.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(`  Top values: ${sorted.map(([k, v]) => `${k}(${v})`).join(' ')}`);

    // Check floor material
    const mat = floorMesh.material;
    console.log(`[TEXELIM] ${testName}: floor material texture id=${mat?.texture?.id ?? 'none'}`);
    console.log(`  color=${JSON.stringify(mat?.color)}`);

  } catch (e) {
    console.error(`[TEXELIM] ${testName}: inspection error:`, e);
  }
}

/** Modify TextureDepth: round all values to nearest integer (0 or 1) */
function roundTextureDepth() {
  const { gameStates } = require('./src/index');
  const geom = gameStates.gameState.currentLevel.floorMesh.geometry;
  const buf = (geom.buffers as Map<number, any>).get(TEXTURE_DEPTH_LOC);
  if (!buf) return;
  for (let i = 0; i < buf.data.length; i++) {
    buf.data[i] = Math.round(buf.data[i]);
  }
  // Re-bind geometry to upload modified data to GPU
  geom.bindGeometry();
  console.log('[TEXELIM] TextureDepth rounded to integers');
}

/** Modify TextureDepth: set all to -1 (use material color only, no texture sampling) */
function forceNoTexture() {
  const { gameStates } = require('./src/index');
  const geom = gameStates.gameState.currentLevel.floorMesh.geometry;
  const buf = (geom.buffers as Map<number, any>).get(TEXTURE_DEPTH_LOC);
  if (!buf) return;
  buf.data.fill(-1);
  geom.bindGeometry();
  console.log('[TEXELIM] TextureDepth set to -1 (material color only)');
}

/** Modify TextureDepth: set all to 0 (force layer 0 = dirtPath only) */
function forceLayer0() {
  const { gameStates } = require('./src/index');
  const geom = gameStates.gameState.currentLevel.floorMesh.geometry;
  const buf = (geom.buffers as Map<number, any>).get(TEXTURE_DEPTH_LOC);
  if (!buf) return;
  buf.data.fill(0);
  geom.bindGeometry();
  console.log('[TEXELIM] TextureDepth set to 0 (layer 0 only)');
}

/** Modify TextureDepth: set all to 1 (force layer 1 = earthGrass only) */
function forceLayer1() {
  const { gameStates } = require('./src/index');
  const geom = gameStates.gameState.currentLevel.floorMesh.geometry;
  const buf = (geom.buffers as Map<number, any>).get(TEXTURE_DEPTH_LOC);
  if (!buf) return;
  buf.data.fill(1);
  geom.bindGeometry();
  console.log('[TEXELIM] TextureDepth set to 1 (layer 1 only)');
}

/** Set floor material color to red — any white from material will turn red */
function forceRedMaterial() {
  const { gameStates } = require('./src/index');
  const floorMesh = gameStates.gameState.currentLevel.floorMesh;
  if (!floorMesh?.material) return;
  floorMesh.material.color = [1.0, 0.0, 0.0, 1.0]; // RED
  console.log('[TEXELIM] Floor material color set to RED [1,0,0,1]');
}

/** Remove TextureDepth buffer entirely — fall back to vertexAttrib1f scalar */
function removeTextureDepthBuffer() {
  const { gameStates } = require('./src/index');
  const geom = gameStates.gameState.currentLevel.floorMesh.geometry;
  (geom.buffers as Map<number, any>).delete(TEXTURE_DEPTH_LOC);
  geom.bindGeometry();
  console.log('[TEXELIM] TextureDepth buffer removed (scalar fallback)');
}

const TESTS: TestConfig[] = [
  {
    name: 'baseline',
    description: 'Unmodified — original TextureDepth values',
  },
  {
    name: 'no-texture',
    description: 'TextureDepth=-1 — material color only, no texture sampling',
    modify: forceNoTexture,
  },
  {
    name: 'layer0-only',
    description: 'TextureDepth=0 — force dirtPath texture for all vertices',
    modify: forceLayer0,
  },
  {
    name: 'layer1-only',
    description: 'TextureDepth=1 — force earthGrass texture for all vertices',
    modify: forceLayer1,
  },
  {
    name: 'rounded',
    description: 'TextureDepth rounded to 0 or 1 — integer layers only',
    modify: roundTextureDepth,
  },
  {
    name: 'no-buffer',
    description: 'TextureDepth buffer removed — uses vertexAttrib1f scalar',
    modify: removeTextureDepthBuffer,
  },
  {
    name: 'red-material',
    description: 'Floor material color set to red — diagnose where white comes from',
    modify: forceRedMaterial,
  },
];

describe('Charon Jr. texture elimination', () => {
  for (const config of TESTS) {
    test(`${config.name}: ${config.description}`, async () => {
      const result = await runElimTest(config);
      expect(result.screenshots.length).toBeGreaterThan(0);
      for (const p of result.screenshots) {
        expect(fs.existsSync(p)).toBe(true);
        const stat = fs.statSync(p);
        expect(stat.size).toBeGreaterThan(1000);
        console.log(`  ${path.basename(p)}: ${stat.size} bytes`);
      }
    }, TEST_TIMEOUT);
  }
});
