/**
 * Tests for SVG drag, scroll, and keyboard events
 *
 * Run with SLOWER_TESTS=1 to add pauses for visual inspection:
 *   TSYNE_HEADED=1 SLOWER_TESTS=1 pnpm test test/svg-drag-scroll-keys.test.ts
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, cvg, TestJournal, CvgContext, CvgEvent, CvgElement } from '../src';

const slow = process.env.SLOWER_TESTS === '1';
const pause = slow ? 500 : 50;

describe('SVG rect drag, scroll, and key events', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('onDrag fires on correct element with deltas', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    const dragEvents: Array<{ x: number; y: number; deltaX: number; deltaY: number }> = [];
    let leftDragCount = 0;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Drag Test', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              // Left rect — should NOT receive drags targeted at right rect
              s.rect({
                x: 10, y: 10, width: 180, height: 180,
                fill: '#4488cc',
                onDrag: () => { leftDragCount++; },
              }).name('left');

              // Right rect — drag target
              s.rect({
                x: 210, y: 10, width: 180, height: 180,
                fill: '#cc4488',
                onDrag: (e) => { dragEvents.push(e); },
              }).name('right');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 480, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Drag on the right rect
    await journal.log('Drag on right rect (300, 100)');
    svgCtx.dispatchDrag(300, 100, 5, 3);
    svgCtx.dispatchDrag(305, 103, 5, 3);
    await ctx.wait(pause);

    expect(dragEvents.length).toBe(2);
    expect(dragEvents[0]).toEqual({ x: 300, y: 100, deltaX: 5, deltaY: 3 });
    expect(dragEvents[1]).toEqual({ x: 305, y: 103, deltaX: 5, deltaY: 3 });
    expect(leftDragCount).toBe(0);
    await journal.log(`  ✓ ${dragEvents.length} drags on right, ${leftDragCount} on left`);

    svgCtx.dispatchDragEnd();
    await journal.log('── onDrag test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('drag sticks to initial element', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    let rightDragCount = 0;
    let leftDragCount = 0;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Drag Sticky', width: 400, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 200', width: 400, height: 200 }, (s) => {
              s.rect({
                x: 10, y: 10, width: 180, height: 180,
                fill: '#4488cc',
                onDrag: () => { leftDragCount++; },
              }).name('left');

              s.rect({
                x: 210, y: 10, width: 180, height: 180,
                fill: '#cc4488',
                onDrag: () => { rightDragCount++; },
              }).name('right');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 480, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Start drag on right rect, then move cursor into left rect area
    await journal.log('Start drag on right (300, 100)');
    svgCtx.dispatchDrag(300, 100, 5, 0);
    await ctx.wait(pause);

    await journal.log('Continue drag into left area (100, 100)');
    svgCtx.dispatchDrag(100, 100, -200, 0);
    await ctx.wait(pause);

    // Should still be on right rect (sticky)
    expect(rightDragCount).toBe(2);
    expect(leftDragCount).toBe(0);
    await journal.log(`  ✓ right=${rightDragCount}, left=${leftDragCount} (sticky)`);

    svgCtx.dispatchDragEnd();

    // After dragEnd, a new drag on left should go to left
    await journal.log('New drag on left (100, 100)');
    svgCtx.dispatchDrag(100, 100, 3, 0);
    await ctx.wait(pause);
    expect(leftDragCount).toBe(1);
    await journal.log(`  ✓ left=${leftDragCount} (new drag target)`);

    svgCtx.dispatchDragEnd();
    await journal.log('── Drag sticky test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('onScroll fires on topmost element', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    const scrollEvents: Array<{ name: string; deltaY: number }> = [];
    let bottomEl: CvgElement, topEl: CvgElement;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Scroll Test', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              // Bottom rect (rendered first)
              bottomEl = s.rect({
                x: 50, y: 50, width: 200, height: 200,
                fill: '#aaddaa',
                onScroll: (e) => {
                  scrollEvents.push({ name: 'bottom', deltaY: e.deltaY });
                  bottomEl.fill(e.deltaY > 0 ? '#66ff66' : '#227722');
                },
              }).name('bottom');

              // Top rect (overlapping, rendered last — topmost)
              topEl = s.rect({
                x: 100, y: 100, width: 150, height: 150,
                fill: '#aaaadd',
                onScroll: (e) => {
                  scrollEvents.push({ name: 'top', deltaY: e.deltaY });
                  topEl.fill(e.deltaY > 0 ? '#8888ff' : '#444488');
                },
              }).name('top');
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

    // Scroll in overlap area — should hit topmost (top)
    await journal.log('Scroll in overlap area (150, 150)');
    svgCtx.dispatchScroll(0, 10, 150, 150);
    await ctx.wait(pause);

    expect(scrollEvents.length).toBe(1);
    expect(scrollEvents[0].name).toBe('top');
    expect(scrollEvents[0].deltaY).toBe(10);
    await journal.log(`  ✓ hit top, deltaY=${scrollEvents[0].deltaY}`);

    // Scroll on bottom-only area
    await journal.log('Scroll on bottom-only area (60, 60)');
    svgCtx.dispatchScroll(0, -5, 60, 60);
    await ctx.wait(pause);

    expect(scrollEvents.length).toBe(2);
    expect(scrollEvents[1].name).toBe('bottom');
    await journal.log(`  ✓ hit bottom, deltaY=${scrollEvents[1].deltaY}`);

    await journal.log('── onScroll topmost test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('onScroll falls back to scene-wide handler', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    let sceneScrollFired = false;
    let sceneScrollData: any = null;
    let bgEl: CvgElement;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Scene Scroll', width: 300, height: 300, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 300', width: 300, height: 300 }, (s) => {
              bgEl = s.rect({ x: 0, y: 0, width: 300, height: 300, fill: '#f8f8f8' }).name('bg');
              // A rect with NO scroll handler
              s.rect({
                x: 100, y: 100, width: 100, height: 100,
                fill: '#ddaaaa',
              }).name('no-scroll');
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

    // Register scene-wide scroll (visual: tint bg on scroll)
    svgCtx.onScroll((e) => {
      sceneScrollFired = true;
      sceneScrollData = e;
      bgEl.fill('#ddeeff');
    });

    // Scroll outside all elements — should fall back to scene-wide
    await journal.log('Scroll outside elements (10, 10)');
    svgCtx.dispatchScroll(0, 20, 10, 10);
    await ctx.wait(pause);

    expect(sceneScrollFired).toBe(true);
    expect(sceneScrollData.deltaY).toBe(20);
    await journal.log(`  ✓ scene scroll fired, deltaY=${sceneScrollData.deltaY}`);

    await journal.log('── Scene scroll fallback passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('onKeyDown/onKeyUp fire on CvgContext', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;

    const keysDown: string[] = [];
    const keysUp: string[] = [];
    const events: CvgEvent[] = [];
    let bgEl: CvgElement;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Keys Test', width: 200, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
              bgEl = s.rect({ x: 0, y: 0, width: 200, height: 200, fill: '#eeeeee' }).name('bg');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 280, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    svgCtx.onKeyDown((key) => {
      keysDown.push(key);
      bgEl.fill('#ccddff'); // visual: flash on key down
    });
    svgCtx.onKeyUp((key) => {
      keysUp.push(key);
      bgEl.fill('#eeeeee'); // visual: restore on key up
    });
    // Chain event collector after journal.monitor() to preserve both
    const prevCb = (svgCtx as any).eventCallback;
    svgCtx.onEvent((e) => { prevCb?.(e); events.push(e); });

    await journal.log('Key: ArrowUp down');
    svgCtx.dispatchKeyDown('ArrowUp');
    await ctx.wait(pause);
    await journal.log('Key: ArrowUp up');
    svgCtx.dispatchKeyUp('ArrowUp');
    await ctx.wait(pause);
    await journal.log('Key: Space down');
    svgCtx.dispatchKeyDown('Space');
    await ctx.wait(pause);

    expect(keysDown).toEqual(['ArrowUp', 'Space']);
    expect(keysUp).toEqual(['ArrowUp']);
    await journal.log(`  ✓ down=${keysDown.join(',')}, up=${keysUp.join(',')}`);

    const keyDownEvents = events.filter(e => e.type === 'key-down');
    const keyUpEvents = events.filter(e => e.type === 'key-up');
    expect(keyDownEvents.length).toBe(2);
    expect(keyUpEvents.length).toBe(1);
    expect(keyDownEvents[0].key).toBe('ArrowUp');
    expect(keyUpEvents[0].key).toBe('ArrowUp');

    await journal.log('── Key events test passed ──');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);

  it('visual: draggable rect', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let svgCtx: CvgContext = null as any;
    let journal: TestJournal = null as any;
    let dragRect: CvgElement;

    // Track rect position in viewBox space
    let rectX = 100, rectY = 100;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Draggable Rect', width: 400, height: 400, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 400 400', width: 400, height: 400 }, (s) => {
              // Background
              s.rect({ x: 0, y: 0, width: 400, height: 400, fill: '#f0f0f0' });

              // Draggable rect
              dragRect = s.rect({
                x: rectX, y: rectY, width: 80, height: 80,
                fill: '#ff6644',
                onDrag: (e) => {
                  rectX += e.deltaX;
                  rectY += e.deltaY;
                  // Move the underlying widget
                  const u = dragRect.getUnderlying();
                  if (u?.update) {
                    u.update({ x: rectX, y: rectY, x2: rectX + 80, y2: rectY + 80 });
                  }
                },
                onDragEnd: () => {
                  journal?.log(`Dropped at (${rectX.toFixed(0)}, ${rectY.toFixed(0)})`);
                },
              }).name('draggable');
            });
            svgCtx.enableEvents();
          });
        });
        win.show();
      });
      journal = cosyneTest.createJournal(a, svgCtx!, { x: 480, y: 50 });
    });

    ctx = cosyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Simulate drag: move right and down
    await journal.log('Start drag on rect');
    svgCtx.dispatchDrag(140, 140, 10, 5);
    await ctx.wait(pause);
    svgCtx.dispatchDrag(150, 145, 10, 5);
    await ctx.wait(pause);
    svgCtx.dispatchDrag(160, 150, 10, 5);
    await ctx.wait(pause);
    svgCtx.dispatchDragEnd();
    await ctx.wait(pause);

    expect(rectX).toBe(130);  // 100 + 10 + 10 + 10
    expect(rectY).toBe(115);  // 100 + 5 + 5 + 5
    await journal.log(`  ✓ Final pos: (${rectX}, ${rectY})`);

    await journal.log('── Visual drag test passed ──');
    await ctx.captureScreenshot('svg-drag-rect.png');
    await ctx.wait(pause);
  }, slow ? 30000 : 10000);
});
