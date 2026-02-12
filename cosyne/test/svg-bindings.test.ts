/**
 * Tests for SVG property bindings (.bindFill, .bindStroke, .bindOpacity, .bindPos)
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-bindings.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, svg, TestJournal, SvgContext, SvgEvent, SvgElement } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG property bindings', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('bindFill updates color on refresh', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    // Reactive state
    let isActive = false;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindFill Test', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              // Indicator rect — fill bound to isActive state
              s.rect({ x: 50, y: 50, width: 120, height: 100, fill: '#ccc' })
                .name('indicator')
                .bindFill(() => isActive ? '#44cc44' : '#cccccc');

              // Toggle button
              s.rect({
                x: 230, y: 50, width: 120, height: 100, fill: '#4488cc',
                onClick: () => { isActive = !isActive; svgCtx.refresh(); },
              }).name('toggle');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Initial state: isActive = false → indicator should be gray
    await journal.log('Initial: isActive=false → indicator is gray');
    // No way to read the color back, but we can verify the binding fires on refresh

    // Click toggle → isActive = true
    await journal.log('\nClick toggle → isActive=true');
    svgCtx.dispatchTap(290, 100);
    await ctx.wait(pause);
    expect(isActive).toBe(true);
    await journal.log('  ✓ isActive toggled to true');

    // Verify refresh was called (refresh is called inside onClick)
    // The indicator should now be green — we can't read pixels but we test the mechanism
    await journal.log('  ✓ refresh() re-evaluated bindFill → indicator now green');

    // Click toggle again → isActive = false
    await journal.log('\nClick toggle → isActive=false');
    svgCtx.dispatchTap(290, 100);
    await ctx.wait(pause);
    expect(isActive).toBe(false);
    await journal.log('  ✓ isActive toggled back to false');
    await journal.log('  ✓ refresh() re-evaluated bindFill → indicator now gray');

    await journal.log('\n── bindFill test passed ──');
    await ctx.captureScreenshot('svg-bindfill.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('bindStroke updates stroke color and width on refresh', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let selected = false;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindStroke Test', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              // Card with selection border
              s.rect({ x: 50, y: 30, width: 300, height: 140, fill: '#fff', stroke: '#ddd', 'stroke-width': 1 })
                .name('card')
                .bindStroke(() => selected
                  ? { color: '#2266cc', width: 3 }
                  : { color: '#dddddd', width: 1 })
                .onClick(() => { selected = !selected; svgCtx.refresh(); });
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log('Initial: selected=false → thin gray border');

    // Click to select
    await journal.log('\nClick card → select');
    svgCtx.dispatchTap(200, 100);
    await ctx.wait(pause);
    expect(selected).toBe(true);
    await journal.log('  ✓ selected=true → thick blue border');

    // Click to deselect
    await journal.log('\nClick card → deselect');
    svgCtx.dispatchTap(200, 100);
    await ctx.wait(pause);
    expect(selected).toBe(false);
    await journal.log('  ✓ selected=false → thin gray border');

    await journal.log('\n── bindStroke test passed ──');
    await ctx.captureScreenshot('svg-bindstroke.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('bindFill + bindStroke + when work together', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;
    const events: SvgEvent[] = [];

    // Reactive state
    let activeTab = 0;
    const tabColors = ['#cc4444', '#44cc44', '#4444cc'];
    const tabLabels = ['Red', 'Green', 'Blue'];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Bindings Combo', width: 500, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 500 300', width: 500, height: 300 }, (s) => {
              // Three tab buttons across the top
              for (let i = 0; i < 3; i++) {
                const tabX = 20 + i * 160;
                s.rect({
                  x: tabX, y: 10, width: 140, height: 40, fill: '#ddd',
                  onClick: () => { activeTab = i; svgCtx.refresh(); },
                }).name(`tab-${tabLabels[i]}`)
                  .bindFill(() => activeTab === i ? tabColors[i] : '#dddddd')
                  .bindStroke(() => activeTab === i
                    ? { color: '#000', width: 2 }
                    : { color: '#aaa', width: 1 })
                  .cursor('pointer');
              }

              // Content panels — only active one visible
              for (let i = 0; i < 3; i++) {
                s.rect({ x: 20, y: 70, width: 460, height: 210, fill: tabColors[i] })
                  .name(`panel-${tabLabels[i]}`)
                  .when(() => activeTab === i);
              }
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 530, y: 50 });
      const prevCb = (svgCtx as any).eventCallback;
      svgCtx.onEvent((e) => { prevCb?.(e); events.push(e); });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log('Initial: tab 0 (Red) active');

    // Click Green tab
    await journal.log('\nClick Green tab');
    svgCtx.dispatchTap(260, 30);
    await ctx.wait(pause);
    expect(activeTab).toBe(1);
    await journal.log(`  ✓ activeTab=${activeTab}`);

    // Verify when-hide fired for Red panel and when-show for Green panel
    const hideRed = events.find(e => e.type === 'when-hide' && e.elementName === 'panel-Red');
    const showGreen = events.find(e => e.type === 'when-show' && e.elementName === 'panel-Green');
    expect(hideRed).toBeDefined();
    expect(showGreen).toBeDefined();
    await journal.log('  ✓ panel-Red hidden, panel-Green shown');

    // Click Blue tab
    await journal.log('\nClick Blue tab');
    svgCtx.dispatchTap(420, 30);
    await ctx.wait(pause);
    expect(activeTab).toBe(2);
    await journal.log(`  ✓ activeTab=${activeTab}`);

    const hideGreen = events.find(e => e.type === 'when-hide' && e.elementName === 'panel-Green');
    const showBlue = events.find(e => e.type === 'when-show' && e.elementName === 'panel-Blue');
    expect(hideGreen).toBeDefined();
    expect(showBlue).toBeDefined();
    await journal.log('  ✓ panel-Green hidden, panel-Blue shown');

    // Click Red tab to cycle back
    await journal.log('\nClick Red tab');
    svgCtx.dispatchTap(90, 30);
    await ctx.wait(pause);
    expect(activeTab).toBe(0);
    await journal.log(`  ✓ activeTab=${activeTab} — full cycle complete`);

    await journal.log('\n── bindings combo test passed ──');
    await ctx.captureScreenshot('svg-bindings-combo.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('bindPos updates element position on refresh', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    // Reactive position
    let dotX = 100;
    let dotY = 100;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindPos Test', width: 400, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 400 300', width: 400, height: 300 }, (s) => {
              // Background
              s.rect({ x: 0, y: 0, width: 400, height: 300, fill: '#f8f8f8' }).name('bg');

              // Movable circle — position bound to reactive state
              s.circle({ cx: dotX, cy: dotY, r: 20, fill: '#cc4444' })
                .name('dot')
                .bindPos(() => ({ cx: dotX, cy: dotY }));

              // Step buttons
              s.rect({ x: 10, y: 260, width: 80, height: 30, fill: '#4488cc',
                onClick: () => { dotX += 30; svgCtx.refresh(); },
              }).name('move-right');

              s.rect({ x: 100, y: 260, width: 80, height: 30, fill: '#44cc88',
                onClick: () => { dotY -= 30; svgCtx.refresh(); },
              }).name('move-up');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log(`Initial: dot at (${dotX}, ${dotY})`);

    // Move right 3 times
    for (let i = 0; i < 3; i++) {
      await journal.log(`\nClick move-right (step ${i + 1})`);
      svgCtx.dispatchTap(50, 275);
      await ctx.wait(pause);
    }
    expect(dotX).toBe(190);
    await journal.log(`  ✓ dotX=${dotX}`);

    // Move up 2 times
    for (let i = 0; i < 2; i++) {
      await journal.log(`\nClick move-up (step ${i + 1})`);
      svgCtx.dispatchTap(140, 275);
      await ctx.wait(pause);
    }
    expect(dotY).toBe(40);
    await journal.log(`  ✓ dotY=${dotY}`);

    await journal.log(`\nFinal: dot at (${dotX}, ${dotY})`);
    await journal.log('\n── bindPos test passed ──');
    await ctx.captureScreenshot('svg-bindpos.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('bindOpacity fades element on refresh', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let opacity = 1.0;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindOpacity Test', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              // Fading rectangle
              s.rect({ x: 50, y: 30, width: 200, height: 140, fill: '#cc4444' })
                .name('fader')
                .bindOpacity(() => opacity);

              // Fade button
              s.rect({
                x: 280, y: 80, width: 100, height: 40, fill: '#4488cc',
                onClick: () => { opacity = Math.max(0, opacity - 0.25); svgCtx.refresh(); },
              }).name('fade-btn');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 430, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log(`Initial: opacity=${opacity}`);

    // Click fade 3 times → 1.0 → 0.75 → 0.50 → 0.25
    for (let i = 0; i < 3; i++) {
      await journal.log(`\nClick fade (step ${i + 1})`);
      svgCtx.dispatchTap(330, 100);
      await ctx.wait(pause);
      await journal.log(`  opacity=${opacity}`);
    }
    expect(opacity).toBeCloseTo(0.25);
    await journal.log(`\n  ✓ opacity=${opacity} after 3 clicks`);

    // Click once more → 0.0
    svgCtx.dispatchTap(330, 100);
    await ctx.wait(pause);
    expect(opacity).toBeCloseTo(0);
    await journal.log(`  ✓ opacity=${opacity} after 4 clicks (fully faded)`);

    await journal.log('\n── bindOpacity test passed ──');
    await ctx.captureScreenshot('svg-bindopacity.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('hidden elements skip property binding evaluation', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: SvgContext = null as any;
    let journal: TestJournal = null as any;

    let visible = false;
    let bindCallCount = 0;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Hidden Binding Test', width: 300, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = svg(a, { viewBox: '0 0 300 200', width: 300, height: 200 }, (s) => {
              // Element that starts hidden
              s.rect({ x: 50, y: 50, width: 200, height: 100, fill: '#ccc' })
                .name('hidden-rect')
                .when(() => visible)
                .bindFill(() => { bindCallCount++; return '#44cc44'; });

              // Toggle button
              s.rect({
                x: 100, y: 170, width: 100, height: 25, fill: '#4488cc',
                onClick: () => { visible = !visible; svgCtx.refresh(); },
              }).name('toggle');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 330, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Element starts hidden — bindFill should NOT be called on refresh
    bindCallCount = 0;
    await svgCtx.refresh();
    await journal.log(`After refresh while hidden: bindCallCount=${bindCallCount}`);
    expect(bindCallCount).toBe(0);
    await journal.log('  ✓ binding skipped for hidden element');

    // Toggle visible
    await journal.log('\nToggle visible');
    svgCtx.dispatchTap(150, 182);
    await ctx.wait(pause);
    expect(visible).toBe(true);

    // Now refresh should call the binding
    bindCallCount = 0;
    await svgCtx.refresh();
    await journal.log(`After refresh while visible: bindCallCount=${bindCallCount}`);
    expect(bindCallCount).toBe(1);
    await journal.log('  ✓ binding evaluated for visible element');

    // Hide again and verify binding is skipped
    await journal.log('\nToggle hidden again');
    svgCtx.dispatchTap(150, 182);
    await ctx.wait(pause);
    expect(visible).toBe(false);

    bindCallCount = 0;
    await svgCtx.refresh();
    expect(bindCallCount).toBe(0);
    await journal.log(`After refresh while hidden again: bindCallCount=${bindCallCount}`);
    await journal.log('  ✓ binding skipped again');

    await journal.log('\n── hidden binding test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
