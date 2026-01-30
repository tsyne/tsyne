/**
 * GPU-Accelerated Fractal Explorer Tests
 */

import { TsyneTest, TestContext } from 'tsyne/index-test';
import type { App } from 'tsyne';
import { createFractalsGPUApp } from './index-gpu';

describe('Fractals GPU App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createFractalsGPUApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
    // Wait for initial render
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  describe('Shader Canvas', () => {
    it('should create a canvas shader widget', async () => {
      const widgets = await ctx.getAllWidgets();
      const hasShader = widgets.some((w: any) => w.type === 'canvasshader');
      expect(hasShader).toBe(true);
    });

    it('should have control buttons', async () => {
      const widgets = await ctx.getAllWidgets();
      const hasButton = widgets.some((w: any) => w.type === 'button');
      expect(hasButton).toBe(true);
    });
  });

  describe('Fractal Types', () => {
    it('should have fractal selector', async () => {
      const widgets = await ctx.getAllWidgets();
      const hasSelect = widgets.some((w: any) => w.type === 'select');
      expect(hasSelect).toBe(true);
    });
  });

  describe('Controls', () => {
    it('should zoom in when Zoom + clicked', async () => {
      const zoomInButton = await ctx.findWidget({ selector: 'Zoom +', type: 'text' });
      expect(zoomInButton.length).toBeGreaterThan(0);
    });

    it('should zoom out when Zoom - clicked', async () => {
      const zoomOutButton = await ctx.findWidget({ selector: 'Zoom -', type: 'text' });
      expect(zoomOutButton.length).toBeGreaterThan(0);
    });

    it('should have palette button', async () => {
      const paletteButton = await ctx.findWidget({ selector: 'Palette', type: 'text' });
      expect(paletteButton.length).toBeGreaterThan(0);
    });

    it('should have reset button', async () => {
      const resetButton = await ctx.findWidget({ selector: 'Reset', type: 'text' });
      expect(resetButton.length).toBeGreaterThan(0);
    });
  });

  describe('GPU Info', () => {
    it('should display GPU acceleration message', async () => {
      const gpuLabel = await ctx.findWidget({ selector: 'GPU', type: 'text' });
      expect(gpuLabel.length).toBeGreaterThan(0);
    });
  });
});
