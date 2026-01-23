#!/usr/bin/env npx tsx
/**
 * Debug script for PhoneTop folder view layout
 *
 * Opens the Games folder and dumps widget tree to debug scroll height issue.
 * Run with: npx tsx phone-apps/debug-folder-layout.ts
 */

import { TsyneTest, TestContext, WidgetInfo } from 'tsyne';
import { buildPhoneTop } from '../launchers/phonetop/index';
import type { App } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Format widget tree as indented text with size info
 */
function formatWidgetTree(widgets: WidgetInfo[]): string {
  const lines: string[] = [];

  // Sort by position to group visually
  const sorted = [...widgets].sort((a, b) => {
    const ay = a.absoluteY ?? a.y ?? 0;
    const by = b.absoluteY ?? b.y ?? 0;
    if (ay !== by) return ay - by;
    const ax = a.absoluteX ?? a.x ?? 0;
    const bx = b.absoluteX ?? b.x ?? 0;
    return ax - bx;
  });

  for (const w of sorted) {
    const typeStr = w.type.padEnd(20);
    const sizeStr = `${w.width ?? '?'}x${w.height ?? '?'}`.padEnd(12);
    const posStr = `@(${w.absoluteX ?? w.x ?? '?'},${w.absoluteY ?? w.y ?? '?'})`.padEnd(15);
    const textStr = w.text ? ` "${w.text.substring(0, 30)}${w.text.length > 30 ? '...' : ''}"` : '';
    const idStr = w.id ? ` [${w.id}]` : '';

    lines.push(`${typeStr} ${sizeStr} ${posStr}${textStr}${idStr}`);
  }

  return lines.join('\n');
}

/**
 * Group widgets by type and summarize sizes
 */
function summarizeWidgetSizes(widgets: WidgetInfo[]): string {
  const byType = new Map<string, WidgetInfo[]>();

  for (const w of widgets) {
    const type = w.type;
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(w);
  }

  const lines: string[] = ['=== Widget Size Summary by Type ==='];

  for (const [type, typeWidgets] of byType) {
    lines.push(`\n${type} (${typeWidgets.length} widgets):`);
    for (const w of typeWidgets) {
      const size = `${w.width ?? '?'}x${w.height ?? '?'}`;
      const pos = `@(${w.absoluteX ?? w.x ?? '?'},${w.absoluteY ?? w.y ?? '?'})`;
      const text = w.text ? ` "${w.text.substring(0, 20)}"` : '';
      lines.push(`  ${size.padEnd(12)} ${pos.padEnd(15)}${text}`);
    }
  }

  return lines.join('\n');
}

async function main() {
  console.log('=== PhoneTop Folder View Debug ===\n');

  // Use headed mode to get real rendered sizes
  const tsyneTest = new TsyneTest({ headed: true });

  try {
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    console.log('Waiting for initial render...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Find and click Games folder
    console.log('\n=== Opening Games folder ===');
    let foundGames = false;
    try {
      await ctx.getById('folder-games').within(2000).click();
      foundGames = true;
    } catch (e) {
      console.log('Games folder not on first page, trying other pages...');
      // Try navigating pages to find it
      for (let i = 0; i < 3; i++) {
        try {
          await ctx.getById('swipeRight').click();
          await new Promise(resolve => setTimeout(resolve, 400));
          await ctx.getById('folder-games').within(500).click();
          foundGames = true;
          break;
        } catch {
          continue;
        }
      }
    }

    if (!foundGames) {
      console.log('Could not find Games folder!');
    } else {
      console.log('Games folder opened!');
    }

    // Wait for folder view to render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    const screenshotDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'games-folder-view.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`\nScreenshot saved: ${screenshotPath}`);

    // Get all widgets and dump
    const widgets = await ctx.getAllWidgets();

    console.log('\n=== All Widgets ===');
    console.log(`Total widgets: ${widgets.length}`);
    console.log(formatWidgetTree(widgets));

    console.log('\n' + summarizeWidgetSizes(widgets));

    // Look specifically for scroll containers
    const scrolls = widgets.filter(w => w.type.toLowerCase().includes('scroll'));
    if (scrolls.length > 0) {
      console.log('\n=== Scroll Containers ===');
      for (const s of scrolls) {
        console.log(`  ${s.type}: ${s.width}x${s.height} @(${s.absoluteX ?? s.x},${s.absoluteY ?? s.y})`);
      }
    } else {
      console.log('\n=== No Scroll Containers Found ===');
    }

    // Look for grids
    const grids = widgets.filter(w => w.type.toLowerCase().includes('grid'));
    if (grids.length > 0) {
      console.log('\n=== Grid Containers ===');
      for (const g of grids) {
        console.log(`  ${g.type}: ${g.width}x${g.height} @(${g.absoluteX ?? g.x},${g.absoluteY ?? g.y})`);
      }
    }

    // Look for vbox/hbox
    const boxes = widgets.filter(w => w.type.toLowerCase().includes('box'));
    if (boxes.length > 0) {
      console.log('\n=== Box Containers ===');
      for (const b of boxes) {
        console.log(`  ${b.type}: ${b.width}x${b.height} @(${b.absoluteX ?? b.x},${b.absoluteY ?? b.y})`);
      }
    }

    // Look for borders
    const borders = widgets.filter(w => w.type.toLowerCase().includes('border'));
    if (borders.length > 0) {
      console.log('\n=== Border Layouts ===');
      for (const b of borders) {
        console.log(`  ${b.type}: ${b.width}x${b.height} @(${b.absoluteX ?? b.x},${b.absoluteY ?? b.y})`);
      }
    }

    // Keep window open briefly to inspect visually
    console.log('\n=== Keeping window open for 5 seconds ===');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } finally {
    await tsyneTest.cleanup();
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
