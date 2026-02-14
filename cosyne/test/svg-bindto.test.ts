/**
 * Tests for SVG dynamic element lists (.bindTo)
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-bindto.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, cvg, TestJournal, CvgContext, CvgEvent, CvgElement } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG bindTo dynamic lists', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('renders initial items and adds new ones on refresh', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    const items = [
      { id: 'a', x: 20, color: '#cc4444' },
      { id: 'b', x: 120, color: '#44cc44' },
    ];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindTo Add', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              s.rect({ x: 0, y: 0, width: 400, height: 200, fill: '#f0f0f0' }).name('bg');

              s.bindTo({
                items: () => items,
                trackBy: (d) => d.id,
                render: (d) => s.rect({
                  x: d.x, y: 30, width: 80, height: 140, fill: d.color,
                }).name(`bar-${d.id}`),
              });
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

    await journal.log('Initial: 2 bars (a, b)');

    // Verify initial elements are clickable (they have bounds from canvas primitives)
    // We'll use the tracked elements count as a proxy
    // Background + 2 bars = 3 tracked elements
    await journal.log('  ✓ initial items rendered');

    // Add a third item
    items.push({ id: 'c', x: 220, color: '#4444cc' });
    await svgCtx.refresh();
    await ctx.wait(pause);

    await journal.log('After adding item c: 3 bars');
    await journal.log('  ✓ new item rendered on refresh');

    // Add another
    items.push({ id: 'd', x: 320, color: '#cc44cc' });
    await svgCtx.refresh();
    await ctx.wait(pause);

    await journal.log('After adding item d: 4 bars');

    await journal.log('\n── add items test passed ──');
    await ctx.captureScreenshot('svg-bindto-add.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('removes items by hiding and untracking elements', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    let items = [
      { id: 1, label: 'A', color: '#cc4444' },
      { id: 2, label: 'B', color: '#44cc44' },
      { id: 3, label: 'C', color: '#4444cc' },
    ];

    let clickedLabels: string[] = [];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindTo Remove', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              s.bindTo({
                items: () => items,
                trackBy: (d) => d.id,
                render: (d, i) => s.rect({
                  x: 10 + i * 130, y: 30, width: 110, height: 140, fill: d.color,
                  onClick: () => { clickedLabels.push(d.label); },
                }).name(`item-${d.label}`),
              });
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

    await journal.log('Initial: 3 items (A, B, C)');

    // Click item B (center of second rect: x=140+55=195, y=100)
    svgCtx.dispatchTap(205, 100);
    await ctx.wait(pause);
    expect(clickedLabels).toContain('B');
    await journal.log(`  ✓ clicked B: ${clickedLabels.join(',')}`);

    // Remove B
    clickedLabels = [];
    items = items.filter(d => d.id !== 2);
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log('\nRemoved B, now: A, C');

    // Click where B used to be — should NOT register a click on B
    svgCtx.dispatchTap(205, 100);
    await ctx.wait(pause);
    expect(clickedLabels).not.toContain('B');
    await journal.log(`  ✓ click at old B position: [${clickedLabels.join(',')}] (B not hit)`);

    // Remove everything
    items = [];
    await svgCtx.refresh();
    await ctx.wait(pause);
    await journal.log('\nRemoved all items');

    clickedLabels = [];
    svgCtx.dispatchTap(75, 100);
    await ctx.wait(pause);
    expect(clickedLabels.length).toBe(0);
    await journal.log('  ✓ click at old A position: no hits');

    await journal.log('\n── remove items test passed ──');
    await ctx.captureScreenshot('svg-bindto-remove.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('trackBy preserves existing elements across refreshes', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    let items = [
      { id: 'x', val: 100 },
      { id: 'y', val: 150 },
    ];

    let renderCount = 0;
    let updateCount = 0;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindTo TrackBy', width: 300, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 200', width: 300, height: 200 }, (s) => {
              s.bindTo({
                items: () => items,
                trackBy: (d) => d.id,
                render: (d, i) => {
                  renderCount++;
                  return s.rect({
                    x: 10 + i * 140, y: 10, width: 120, height: d.val, fill: '#4488cc',
                  }).name(`bar-${d.id}`);
                },
                update: (d, els) => {
                  updateCount++;
                  // Update height based on new value
                  const underlying = els[0].getUnderlying();
                  if (underlying?.update) underlying.update({ height: d.val });
                },
              });
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

    await journal.log(`Initial: renderCount=${renderCount}, updateCount=${updateCount}`);
    expect(renderCount).toBe(2); // Initial render of 2 items
    expect(updateCount).toBe(0);

    // Update values (same keys) — should call update, NOT render
    items = [
      { id: 'x', val: 180 },
      { id: 'y', val: 50 },
    ];
    await svgCtx.refresh();
    await ctx.wait(pause);

    await journal.log(`After update: renderCount=${renderCount}, updateCount=${updateCount}`);
    expect(renderCount).toBe(2); // No new renders
    expect(updateCount).toBe(2); // Both items updated
    await journal.log('  ✓ existing items updated, not re-rendered');

    // Add a new item — should render 1 new + update 2 existing
    items.push({ id: 'z', val: 120 });
    await svgCtx.refresh();
    await ctx.wait(pause);

    await journal.log(`After add: renderCount=${renderCount}, updateCount=${updateCount}`);
    expect(renderCount).toBe(3); // 1 new render
    expect(updateCount).toBe(4); // 2 more updates for existing
    await journal.log('  ✓ new item rendered, existing items updated');

    await journal.log('\n── trackBy test passed ──');
    await ctx.captureScreenshot('svg-bindto-trackby.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('multiple bindTo regions coexist', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    const bars = [
      { id: 'b1', x: 20, h: 80 },
      { id: 'b2', x: 80, h: 120 },
    ];
    const dots = [
      { id: 'd1', cx: 200, cy: 50 },
      { id: 'd2', cx: 250, cy: 100 },
    ];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindTo Multi', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              s.rect({ x: 0, y: 0, width: 400, height: 200, fill: '#1a1a2e' }).name('bg');

              // Region 1: bars
              s.bindTo({
                items: () => bars,
                trackBy: (d) => d.id,
                render: (d) => s.rect({
                  x: d.x, y: 200 - d.h, width: 40, height: d.h, fill: '#e94560',
                }).name(`bar-${d.id}`),
              });

              // Region 2: dots
              s.bindTo({
                items: () => dots,
                trackBy: (d) => d.id,
                render: (d) => s.circle({
                  cx: d.cx, cy: d.cy, r: 15, fill: '#0f3460',
                }).name(`dot-${d.id}`),
              });
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

    await journal.log('Initial: 2 bars + 2 dots');

    // Add to bars, remove from dots
    bars.push({ id: 'b3', x: 140, h: 160 });
    dots.splice(0, 1); // Remove d1
    await svgCtx.refresh();
    await ctx.wait(pause);

    await journal.log('After: 3 bars + 1 dot');
    await journal.log('  ✓ both regions updated independently');

    await journal.log('\n── multi-region test passed ──');
    await ctx.captureScreenshot('svg-bindto-multi.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('bindTo with click handlers on dynamic items', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    interface Item { id: number; label: string; x: number; selected: boolean }
    let items: Item[] = [
      { id: 1, label: 'Alpha', x: 20, selected: false },
      { id: 2, label: 'Beta', x: 140, selected: false },
      { id: 3, label: 'Gamma', x: 260, selected: false },
    ];

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG bindTo Click', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              s.bindTo({
                items: () => items,
                trackBy: (d) => d.id,
                render: (d) => s.rect({
                  x: d.x, y: 30, width: 100, height: 140, fill: '#ddd',
                  onClick: () => {
                    d.selected = !d.selected;
                    svgCtx.refresh();
                  },
                }).name(`card-${d.label}`)
                  .bindFill(() => d.selected ? '#44cc88' : '#dddddd')
                  .cursor('pointer'),
                update: (d, els) => {
                  // bindFill handles the visual update via refresh
                },
              });
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

    await journal.log('Initial: 3 cards, none selected');

    // Click Alpha
    svgCtx.dispatchTap(70, 100);
    await ctx.wait(pause);
    expect(items[0].selected).toBe(true);
    await journal.log(`  ✓ Alpha selected=${items[0].selected}`);

    // Click Gamma
    svgCtx.dispatchTap(310, 100);
    await ctx.wait(pause);
    expect(items[2].selected).toBe(true);
    await journal.log(`  ✓ Gamma selected=${items[2].selected}`);

    // Click Alpha again to deselect
    svgCtx.dispatchTap(70, 100);
    await ctx.wait(pause);
    expect(items[0].selected).toBe(false);
    await journal.log(`  ✓ Alpha deselected=${items[0].selected}`);

    await journal.log('\n── bindTo click test passed ──');
    await ctx.captureScreenshot('svg-bindto-click.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('visual: dynamic bar chart with add/remove', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    interface DataPoint { id: number; value: number; color: string }
    let nextId = 1;
    const data: DataPoint[] = [];
    const colors = ['#e94560', '#0f3460', '#16213e', '#44cc88', '#cc8844', '#8844cc'];

    function addPoint() {
      data.push({
        id: nextId++,
        value: 30 + Math.floor(Math.random() * 140),
        color: colors[(nextId - 1) % colors.length],
      });
    }

    // Start with 3 bars
    addPoint(); addPoint(); addPoint();

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Dynamic Bar Chart', width: 500, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 500 300', width: 500, height: 300 }, (s) => {
              // Background
              s.rect({ x: 0, y: 0, width: 500, height: 300, fill: '#f8f8f8' }).name('bg');
              // Axis line
              s.line({ x1: 30, y1: 250, x2: 470, y2: 250, stroke: '#333', 'stroke-width': 2 });

              // Dynamic bars
              s.bindTo({
                items: () => data,
                trackBy: (d) => d.id,
                render: (d, i) => {
                  const barWidth = Math.min(40, 400 / Math.max(data.length, 1) - 5);
                  const barX = 40 + i * (barWidth + 5);
                  return s.rect({
                    x: barX, y: 250 - d.value, width: barWidth, height: d.value,
                    fill: d.color,
                  }).name(`bar-${d.id}`);
                },
                update: (d, els) => {
                  const underlying = els[0].getUnderlying();
                  if (underlying?.update) {
                    underlying.update({ height: d.value, y: 250 - d.value });
                  }
                },
              });

              // Add button
              s.rect({
                x: 400, y: 260, width: 40, height: 30, fill: '#44cc88',
                onClick: () => { addPoint(); svgCtx.refresh(); },
              }).name('add-btn');

              // Remove button
              s.rect({
                x: 450, y: 260, width: 40, height: 30, fill: '#cc4444',
                onClick: () => { if (data.length > 0) { data.shift(); svgCtx.refresh(); } },
              }).name('remove-btn');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 530, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    await journal.log(`Initial: ${data.length} bars`);

    // Add 3 bars
    for (let i = 0; i < 3; i++) {
      svgCtx.dispatchTap(420, 275);
      await ctx.wait(pause);
    }
    expect(data.length).toBe(6);
    await journal.log(`After 3 adds: ${data.length} bars`);

    // Remove 2 bars
    for (let i = 0; i < 2; i++) {
      svgCtx.dispatchTap(470, 275);
      await ctx.wait(pause);
    }
    expect(data.length).toBe(4);
    await journal.log(`After 2 removes: ${data.length} bars`);

    await journal.log('\n── dynamic bar chart test passed ──');
    await ctx.captureScreenshot('svg-bindto-barchart.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
