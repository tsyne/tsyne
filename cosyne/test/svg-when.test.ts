/**
 * Tests for SVG .when() reactive visibility
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-when.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, svg, TestJournal, SvgContext, SvgEvent, SvgElement } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG .when() reactive visibility', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('.when(false) hides element, .when(true) shows it', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;
    const events: SvgEvent[] = [];

    let showRect = false;
    let rectEl: SvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG When Show/Hide', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              // Background — always visible
              s.rect({ x: 0, y: 0, width: 300, height: 300, fill: '#ddd' }).name('bg');
              // Conditional rect — starts hidden (showRect = false)
              rectEl = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#4488cc',
                when: () => showRect,
              }).name('conditional');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
      svgCtx.onEvent((e) => events.push(e));
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Initially hidden (showRect = false)
    await journal.log('Initial: showRect=false → element should be hidden');
    expect(rectEl.isVisible()).toBe(false);
    await journal.log(`  isVisible: ${rectEl.isVisible()}`);
    await ctx.wait(pause);

    // Show it
    showRect = true;
    await journal.log('\nSet showRect=true → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    expect(rectEl.isVisible()).toBe(true);
    await journal.log(`  isVisible: ${rectEl.isVisible()}`);

    const showEvents = events.filter(e => e.type === 'when-show');
    expect(showEvents.length).toBe(1);
    expect(showEvents[0].elementName).toBe('conditional');
    await journal.log(`  when-show events: ${showEvents.length}`);

    // Hide it again
    showRect = false;
    await journal.log('\nSet showRect=false → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    expect(rectEl.isVisible()).toBe(false);

    const hideEvents = events.filter(e => e.type === 'when-hide');
    expect(hideEvents.length).toBe(1);
    expect(hideEvents[0].elementName).toBe('conditional');
    await journal.log(`  isVisible: ${rectEl.isVisible()}`);
    await journal.log(`  when-hide events: ${hideEvents.length}`);

    await journal.log('\n── Show/hide test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('hidden element excluded from hit-testing (click falls through)', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let clicked = '';
    let showTop = true;
    let topEl: SvgElement = null as any;
    let bottomEl: SvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG When Hit-Test', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              bottomEl = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#cc4444',
                onClick: () => { clicked = 'bottom'; bottomEl.fill('#ff8800'); },
              }).name('bottom');
              topEl = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#4488cc',
                onClick: () => { clicked = 'top'; topEl.fill('#00cc88'); },
                when: () => showTop,
              }).name('top');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Click when top is visible → top wins
    await journal.log('Click (150,150) → top is visible');
    svgCtx.dispatchTap(150, 150);
    await ctx.wait(pause);
    expect(clicked).toBe('top');
    await journal.log(`  clicked: ${clicked}`);

    // Hide top, click again → bottom wins
    clicked = '';
    showTop = false;
    await journal.log('\nHide top → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    await journal.log('Click (150,150) → top is hidden');
    svgCtx.dispatchTap(150, 150);
    await ctx.wait(pause);
    expect(clicked).toBe('bottom');
    await journal.log(`  clicked: ${clicked}`);

    // Re-show top, click again → top wins again
    clicked = '';
    showTop = true;
    await journal.log('\nShow top → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    await journal.log('Click (150,150) → top is visible again');
    svgCtx.dispatchTap(150, 150);
    await ctx.wait(pause);
    expect(clicked).toBe('top');
    await journal.log(`  clicked: ${clicked}`);

    await journal.log('\n── Hit-test fallthrough test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('multiple elements with different .when() conditions', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let tab = 'A';
    let rectA: SvgElement = null as any, rectB: SvgElement = null as any, rectC: SvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG When Tabs', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              rectA = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#cc4444',
                when: () => tab === 'A',
              }).name('tabA');
              rectB = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#44cc44',
                when: () => tab === 'B',
              }).name('tabB');
              rectC = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#4444cc',
                when: () => tab === 'C',
              }).name('tabC');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Tab A selected initially
    await journal.log('Tab A selected');
    expect(rectA.isVisible()).toBe(true);
    expect(rectB.isVisible()).toBe(false);
    expect(rectC.isVisible()).toBe(false);
    await journal.log(`  A:${rectA.isVisible()} B:${rectB.isVisible()} C:${rectC.isVisible()}`);

    // Switch to tab B
    tab = 'B';
    await journal.log('\nSwitch to tab B → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    expect(rectA.isVisible()).toBe(false);
    expect(rectB.isVisible()).toBe(true);
    expect(rectC.isVisible()).toBe(false);
    await journal.log(`  A:${rectA.isVisible()} B:${rectB.isVisible()} C:${rectC.isVisible()}`);

    // Switch to tab C
    tab = 'C';
    await journal.log('\nSwitch to tab C → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    expect(rectA.isVisible()).toBe(false);
    expect(rectB.isVisible()).toBe(false);
    expect(rectC.isVisible()).toBe(true);
    await journal.log(`  A:${rectA.isVisible()} B:${rectB.isVisible()} C:${rectC.isVisible()}`);

    // Back to A
    tab = 'A';
    await journal.log('\nSwitch back to tab A → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    expect(rectA.isVisible()).toBe(true);
    expect(rectB.isVisible()).toBe(false);
    expect(rectC.isVisible()).toBe(false);
    await journal.log(`  A:${rectA.isVisible()} B:${rectB.isVisible()} C:${rectC.isVisible()}`);

    await journal.log('\n── Multi-condition tabs test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('.when() with click toggles visibility interactively', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let detailsVisible = false;
    let toggleBtn: SvgElement = null as any, detailsRect: SvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG When Toggle', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              // Background
              s.rect({ x: 0, y: 0, width: 300, height: 300, fill: '#eee' }).name('bg');

              // Details panel — conditional
              detailsRect = s.rect({
                x: 50, y: 80, width: 200, height: 180,
                fill: '#44cc88',
                when: () => detailsVisible,
              }).name('details');

              // Toggle button — always visible, on top
              toggleBtn = s.rect({
                x: 100, y: 10, width: 100, height: 50,
                fill: '#4488cc',
                onClick: async () => {
                  detailsVisible = !detailsVisible;
                  toggleBtn.fill(detailsVisible ? '#cc8844' : '#4488cc');
                  await svgCtx.refresh();
                },
              }).name('toggle');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Initially hidden
    await journal.log('Initial: details hidden');
    expect(detailsVisible).toBe(false);
    expect(detailsRect.isVisible()).toBe(false);
    await journal.log(`  detailsVisible=${detailsVisible} isVisible=${detailsRect.isVisible()}`);
    await ctx.wait(pause);

    // Click toggle button (center at 150, 35)
    await journal.log('\nClick toggle button');
    svgCtx.dispatchTap(150, 35);
    await ctx.wait(pause);

    expect(detailsVisible).toBe(true);
    expect(detailsRect.isVisible()).toBe(true);
    await journal.log(`  detailsVisible=${detailsVisible} isVisible=${detailsRect.isVisible()}`);

    // Click toggle again to hide
    await journal.log('\nClick toggle again');
    svgCtx.dispatchTap(150, 35);
    await ctx.wait(pause);

    expect(detailsVisible).toBe(false);
    expect(detailsRect.isVisible()).toBe(false);
    await journal.log(`  detailsVisible=${detailsVisible} isVisible=${detailsRect.isVisible()}`);

    // Click once more to show
    await journal.log('\nClick toggle once more');
    svgCtx.dispatchTap(150, 35);
    await ctx.wait(pause);

    expect(detailsVisible).toBe(true);
    expect(detailsRect.isVisible()).toBe(true);
    await journal.log(`  detailsVisible=${detailsVisible} isVisible=${detailsRect.isVisible()}`);

    await journal.log('\n── Interactive toggle test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('fluent .when() method works same as options pattern', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let show1 = true;
    let show2 = false;
    let el1: SvgElement = null as any, el2: SvgElement = null as any;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG When Fluent', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              // Options pattern
              el1 = s.rect({
                x: 20, y: 50, width: 120, height: 200,
                fill: '#cc4444',
                when: () => show1,
              }).name('options');
              // Fluent pattern
              el2 = s.rect({
                x: 160, y: 50, width: 120, height: 200,
                fill: '#4444cc',
              }).name('fluent').when(() => show2);
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 380, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Initial state: el1 visible, el2 hidden
    await journal.log('Initial: show1=true, show2=false');
    expect(el1.isVisible()).toBe(true);
    expect(el2.isVisible()).toBe(false);
    await journal.log(`  el1:${el1.isVisible()} el2:${el2.isVisible()}`);

    // Swap
    show1 = false;
    show2 = true;
    await journal.log('\nSwap: show1=false, show2=true → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    expect(el1.isVisible()).toBe(false);
    expect(el2.isVisible()).toBe(true);
    await journal.log(`  el1:${el1.isVisible()} el2:${el2.isVisible()}`);

    // Both visible
    show1 = true;
    await journal.log('\nBoth: show1=true, show2=true → refresh');
    await svgCtx.refresh();
    await ctx.wait(pause);

    expect(el1.isVisible()).toBe(true);
    expect(el2.isVisible()).toBe(true);
    await journal.log(`  el1:${el1.isVisible()} el2:${el2.isVisible()}`);

    await journal.log('\n── Fluent vs options test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
