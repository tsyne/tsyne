/**
 * Debug test for PhoneTop folder view layout
 *
 * Opens the Games folder and dumps widget tree to debug scroll height issue.
 */

import { TsyneTest, TestContext, WidgetInfo } from 'tsyne';
import { buildPhoneTop } from './index';
import type { App } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

const TEST_TIMEOUT = 30000;

/**
 * Format widget tree as indented text with size info
 */
function formatWidgetTree(widgets: WidgetInfo[]): string {
  // Build parent-child relationships based on position containment
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

describe('PhoneTop Folder View Debug', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  test('should dump Games folder widget tree with sizes', async () => {
    // Use headed mode to get real rendered sizes
    tsyneTest = new TsyneTest({ headed: true });

    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find and click Games folder
    console.log('\n=== Opening Games folder ===');
    try {
      await ctx.getById('folder-games').within(2000).click();
    } catch (e) {
      // Try navigating pages to find it
      for (let i = 0; i < 3; i++) {
        try {
          await ctx.getById('swipeRight').click();
          await new Promise(resolve => setTimeout(resolve, 300));
          await ctx.getById('folder-games').within(500).click();
          break;
        } catch {
          continue;
        }
      }
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
    }

    // Look for grids
    const grids = widgets.filter(w => w.type.toLowerCase().includes('grid'));
    if (grids.length > 0) {
      console.log('\n=== Grid Containers ===');
      for (const g of grids) {
        console.log(`  ${g.type}: ${g.width}x${g.height} @(${g.absoluteX ?? g.x},${g.absoluteY ?? g.y})`);
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
    await new Promise(resolve => setTimeout(resolve, 2000));

  }, TEST_TIMEOUT);
});
