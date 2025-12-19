/**
 * TsyneTest tests for Image Resizer App
 * Tests UI interactions and image resizing functionality
 */

import { TsyneTest, TestContext } from './index-test';
import { buildImageResizerApp } from './image-resizer';
import type { App } from './app';
import type { Window } from './window';

describe('Image Resizer UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Image Resizer', width: 900, height: 700 }, (win: Window) => {
        buildImageResizerApp(app, win);
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render initial UI with title', async () => {
    // Verify title
    const title = await ctx.getByID('imageResizerTitle').getText();
    expect(title).toBe('Image Resizer - Batch Image Resizing');
  }, 30000);

  test('should display control buttons', async () => {
    // Verify add image button
    const addBtn = await ctx.getByID('imageResizerAddBtn').getText();
    expect(addBtn).toBe('Add Image');

    // Verify clear button
    const clearBtn = await ctx.getByID('imageResizerClearBtn').getText();
    expect(clearBtn).toBe('Clear All');

    // Verify process button
    const processBtn = await ctx.getByID('imageResizerProcessBtn').getText();
    expect(processBtn).toBe('Process All');

    // Verify reset button
    const resetBtn = await ctx.getByID('imageResizerResetBtn').getText();
    expect(resetBtn).toBe('Reset');
  }, 30000);

  test('should display resize settings inputs', async () => {
    // Verify labels
    const widthLabel = await ctx.getByID('imageResizerWidthLabel').getText();
    expect(widthLabel).toBe('Width:');

    const heightLabel = await ctx.getByID('imageResizerHeightLabel').getText();
    expect(heightLabel).toBe('Height:');

    const qualityLabel = await ctx.getByID('imageResizerQualityLabel').getText();
    expect(qualityLabel).toBe('Quality:');

    // Verify units
    const widthUnit = await ctx.getByID('imageResizerWidthUnit').getText();
    expect(widthUnit).toBe('px');

    const heightUnit = await ctx.getByID('imageResizerHeightUnit').getText();
    expect(heightUnit).toBe('px');

    const qualityUnit = await ctx.getByID('imageResizerQualityUnit').getText();
    expect(qualityUnit).toBe('%');
  }, 30000);

  test('should display settings inputs', async () => {
    // Verify input fields exist
    await ctx.getByID('imageResizerWidthInput').within(500).shouldExist();
    await ctx.getByID('imageResizerHeightInput').within(500).shouldExist();
    await ctx.getByID('imageResizerQualityInput').within(500).shouldExist();
    await ctx.getByID('imageResizerAspectRatio').within(500).shouldExist();
  }, 30000);

  test('should display status information', async () => {
    // Verify status label exists
    const status = await ctx.getByID('imageResizerStatus').getText();
    expect(status).toBe('Jobs: 0/0');

    // Verify jobs list label
    const jobsLabel = await ctx.getByID('imageResizerJobsLabel').getText();
    expect(jobsLabel).toBe('Jobs');

    // Verify jobs list placeholder
    const jobsList = await ctx.getByID('imageResizerJobsList').getText();
    expect(jobsList).toBe('No jobs yet');
  }, 30000);

  test('should have all required UI sections', async () => {
    // Check all main UI elements exist
    await ctx.getByID('imageResizerTitle').within(500).shouldExist();
    await ctx.getByID('imageResizerFilesLabel').within(500).shouldExist();
    await ctx.getByID('imageResizerAddBtn').within(500).shouldExist();
    await ctx.getByID('imageResizerClearBtn').within(500).shouldExist();
    await ctx.getByID('imageResizerSettingsLabel').within(500).shouldExist();
    await ctx.getByID('imageResizerStatus').within(500).shouldExist();
    await ctx.getByID('imageResizerProcessBtn').within(500).shouldExist();
  }, 30000);
});
