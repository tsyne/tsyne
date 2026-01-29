#!/usr/bin/env npx ts-node
/**
 * Integration test for OpenGL blend modes
 *
 * Run with: pnpm exec ts-node cosyne/test/blend-modes-integration.ts
 * Or: ./scripts/tsyne cosyne/test/blend-modes-integration.ts
 *
 * Verifies that additive blending produces the expected color mixing:
 * - Red + Green = Yellow (#ffff00)
 * - Red + Blue = Magenta (#ff00ff)
 * - Red + Green + Blue = White (#ffffff)
 */

import { TsyneTest } from 'tsyne';
import { asRenderTarget } from 'tsyne';
import type { ITsyneWindow } from 'tsyne';
import { buildComparisonApp } from '../demos/blend-mode-comparison';
import * as fs from 'fs';
import * as path from 'path';

const PNG = require('pngjs').PNG;

interface ImageData {
  width: number;
  height: number;
  data: Buffer;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function decodePNG(buffer: Buffer): ImageData {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: png.data };
}

function getPixel(imageData: ImageData, x: number, y: number): RGB {
  const idx = (y * imageData.width + x) * 4;
  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2],
  };
}

function hexColor(p: RGB): string {
  return `#${p.r.toString(16).padStart(2, '0')}${p.g.toString(16).padStart(2, '0')}${p.b.toString(16).padStart(2, '0')}`;
}

// Find the first pixel matching a specific color (with tolerance)
function findColor(
  imageData: ImageData,
  targetColor: RGB,
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  tolerance: number = 20
): { x: number; y: number } | null {
  for (let y = startY; y < endY; y += 2) {
    for (let x = startX; x < endX; x += 2) {
      const p = getPixel(imageData, x, y);
      if (
        Math.abs(p.r - targetColor.r) <= tolerance &&
        Math.abs(p.g - targetColor.g) <= tolerance &&
        Math.abs(p.b - targetColor.b) <= tolerance
      ) {
        return { x, y };
      }
    }
  }
  return null;
}

// Check if a color exists in a region
function hasColor(
  imageData: ImageData,
  targetColor: RGB,
  startX: number,
  endX: number,
  startY: number,
  endY: number,
  tolerance: number = 20
): boolean {
  return findColor(imageData, targetColor, startX, endX, startY, endY, tolerance) !== null;
}

async function runTest(): Promise<boolean> {
  console.log('=== Blend Modes Integration Test ===\n');

  const tsyneTest = new TsyneTest({ headed: process.env.TSYNE_HEADED === '1' });
  let passed = true;

  try {
    // Create the comparison app
    await tsyneTest.createApp(async (a) => {
      a.window({ title: 'Blend Test', width: 680, height: 400 }, (win) => {
        const target = asRenderTarget(win as ITsyneWindow);
        buildComparisonApp(a, target);
        win.show();
      });
    });

    // Wait for rendering
    console.log('Waiting for render...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take screenshot
    const screenshotPath = '/tmp/blend-modes-test.png';
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved to ${screenshotPath}\n`);

    // Load and analyze the screenshot
    const pngBuffer = fs.readFileSync(screenshotPath);
    const imageData = decodePNG(pngBuffer);

    // Define expected colors
    const YELLOW: RGB = { r: 255, g: 255, b: 0 };   // Red + Green
    const MAGENTA: RGB = { r: 255, g: 0, b: 255 };  // Red + Blue
    const WHITE: RGB = { r: 255, g: 255, b: 255 };  // Red + Green + Blue
    const RED: RGB = { r: 255, g: 0, b: 0 };
    const GREEN: RGB = { r: 0, g: 255, b: 0 };
    const BLUE: RGB = { r: 0, g: 0, b: 255 };

    // Image is ~680px wide, left panel is 0-320, right panel is 360-680
    const leftPanel = { startX: 0, endX: 320, startY: 50, endY: 350 };
    const rightPanel = { startX: 360, endX: 680, startY: 50, endY: 350 };

    // LEFT PANEL (normal blending): Should have pure R, G, B but NO yellow/magenta/white
    const leftHasRed = hasColor(imageData, RED, leftPanel.startX, leftPanel.endX, leftPanel.startY, leftPanel.endY);
    const leftHasGreen = hasColor(imageData, GREEN, leftPanel.startX, leftPanel.endX, leftPanel.startY, leftPanel.endY);
    const leftHasBlue = hasColor(imageData, BLUE, leftPanel.startX, leftPanel.endX, leftPanel.startY, leftPanel.endY);
    const leftHasYellow = hasColor(imageData, YELLOW, leftPanel.startX, leftPanel.endX, leftPanel.startY, leftPanel.endY);
    const leftHasMagenta = hasColor(imageData, MAGENTA, leftPanel.startX, leftPanel.endX, leftPanel.startY, leftPanel.endY);
    const leftHasWhite = hasColor(imageData, WHITE, leftPanel.startX, leftPanel.endX, leftPanel.startY, leftPanel.endY);

    // RIGHT PANEL (additive blending): Should have yellow, magenta, and white from overlaps
    const rightHasYellow = hasColor(imageData, YELLOW, rightPanel.startX, rightPanel.endX, rightPanel.startY, rightPanel.endY);
    const rightHasMagenta = hasColor(imageData, MAGENTA, rightPanel.startX, rightPanel.endX, rightPanel.startY, rightPanel.endY);
    const rightHasWhite = hasColor(imageData, WHITE, rightPanel.startX, rightPanel.endX, rightPanel.startY, rightPanel.endY);

    // Print results
    console.log('=== LEFT PANEL (Normal Blending) ===');
    console.log(`  Red:     ${leftHasRed ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  Green:   ${leftHasGreen ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  Blue:    ${leftHasBlue ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  Yellow:  ${leftHasYellow ? 'FOUND (unexpected!)' : 'not found (correct)'}`);
    console.log(`  Magenta: ${leftHasMagenta ? 'FOUND (unexpected!)' : 'not found (correct)'}`);
    console.log(`  White:   ${leftHasWhite ? 'FOUND (may be label)' : 'not found'}`);

    console.log('\n=== RIGHT PANEL (Additive Blending) ===');
    console.log(`  Yellow:  ${rightHasYellow ? 'FOUND (R+G works!)' : 'NOT FOUND'}`);
    console.log(`  Magenta: ${rightHasMagenta ? 'FOUND (R+B works!)' : 'NOT FOUND'}`);
    console.log(`  White:   ${rightHasWhite ? 'FOUND (R+G+B works!)' : 'NOT FOUND'}`);

    // Assertions
    console.log('\n=== ASSERTIONS ===');

    const assertions = [
      { name: 'Left has red', value: leftHasRed, expected: true },
      { name: 'Left has green', value: leftHasGreen, expected: true },
      { name: 'Left has blue', value: leftHasBlue, expected: true },
      { name: 'Left has NO yellow', value: leftHasYellow, expected: false },
      { name: 'Left has NO magenta', value: leftHasMagenta, expected: false },
      { name: 'Right has yellow (R+G)', value: rightHasYellow, expected: true },
      { name: 'Right has magenta (R+B)', value: rightHasMagenta, expected: true },
      { name: 'Right has white (R+G+B)', value: rightHasWhite, expected: true },
    ];

    for (const { name, value, expected } of assertions) {
      const pass = value === expected;
      console.log(`  ${pass ? '✓' : '✗'} ${name}: ${value} (expected: ${expected})`);
      if (!pass) passed = false;
    }

    console.log(`\n=== ${passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} ===`);

  } catch (err) {
    console.error('Error:', err);
    passed = false;
  } finally {
    await tsyneTest.cleanup();
  }

  return passed;
}

runTest().then(passed => {
  process.exit(passed ? 0 : 1);
});
