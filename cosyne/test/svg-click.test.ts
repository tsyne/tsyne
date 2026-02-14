/**
 * Tests for SVG click events using CosyneTest integration
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest, cvg, TestJournal, CvgContext } from '../src';

describe('SVG click events', () => {
  let cosyneTest: CosyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (cosyneTest) {
      await cosyneTest.cleanup();
    }
  });

  it('dispatches onClick to correct rect', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let clicked = '';
    let svgCtx: CvgContext;
    let journal: TestJournal;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Click Test', width: 300, height: 100, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 300 100', width: 300, height: 100 }, (s) => {
              s.rect({ x: '0', y: '0', width: '100', height: '100', fill: 'red' })
                .onClick(() => { clicked = 'red'; }).name('red');
              s.rect({ x: '100', y: '0', width: '100', height: '100', fill: 'green' })
                .onClick(() => { clicked = 'green'; }).name('green');
              s.rect({ x: '200', y: '0', width: '100', height: '100', fill: 'blue' })
                .onClick(() => { clicked = 'blue'; }).name('blue');
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

    await ctx.tapAt(50, 50);
    await ctx.wait(100);
    expect(clicked).toBe('red');

    await ctx.tapAt(150, 50);
    await ctx.wait(100);
    expect(clicked).toBe('green');

    await ctx.tapAt(250, 50);
    await ctx.wait(100);
    expect(clicked).toBe('blue');

    await ctx.captureScreenshot('svg-click-rects.png');
  });

  it('topmost element wins on overlap', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let clicked = '';
    let svgCtx: CvgContext;
    let journal: TestJournal;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Overlap Test', width: 200, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
              s.rect({ x: '0', y: '0', width: '200', height: '200', fill: 'red' })
                .onClick(() => { clicked = 'bottom'; }).name('bottom');
              s.rect({ x: '50', y: '50', width: '100', height: '100', fill: 'blue' })
                .onClick(() => { clicked = 'top'; }).name('top');
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

    await ctx.tapAt(100, 100);  // overlapping area
    await ctx.wait(100);
    expect(clicked).toBe('top');

    await ctx.tapAt(10, 10);    // only bottom rect
    await ctx.wait(100);
    expect(clicked).toBe('bottom');

    await ctx.captureScreenshot('svg-click-overlap.png');
  });

  it('no handler fires on miss', async () => {
    cosyneTest = new CosyneTest({ headed: true });
    let clicked = false;
    let svgCtx: CvgContext;
    let journal: TestJournal;

    const testApp = await cosyneTest.createApp((a: App) => {
      a.window({ title: 'SVG Miss Test', width: 200, height: 200, x: 50, y: 50, padded: false }, (win: any) => {
        win.setContent(() => {
          a.canvasStack(() => {
            svgCtx = cvg(a, { viewBox: '0 0 200 200', width: 200, height: 200 }, (s) => {
              s.rect({ x: '50', y: '50', width: '50', height: '50', fill: 'red' })
                .onClick(() => { clicked = true; }).name('target');
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

    await ctx.tapAt(10, 10);  // outside rect
    await ctx.wait(100);
    expect(clicked).toBe(false);

    await ctx.captureScreenshot('svg-click-miss.png');
  });
});
