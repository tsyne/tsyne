/**
 * TsyneTest tests for Image Resizer App
 * Tests UI interactions and image resizing functionality
 */

import { TsyneTest, TestContext } from 'tsyne';
import { buildImageResizerApp } from './image-resizer';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';

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
    const title = await ctx.getById('imageResizerTitle').getText();
    expect(title).toBe('Image Resizer - Batch Image Resizing');
  }, 30000);

  test('should display control buttons', async () => {
    // Verify add image button
    const addBtn = await ctx.getById('imageResizerAddBtn').getText();
    expect(addBtn).toBe('Add Image');

    // Verify clear button
    const clearBtn = await ctx.getById('imageResizerClearBtn').getText();
    expect(clearBtn).toBe('Clear All');

    // Verify process button
    const processBtn = await ctx.getById('imageResizerProcessBtn').getText();
    expect(processBtn).toBe('Process All');

    // Verify reset button
    const resetBtn = await ctx.getById('imageResizerResetBtn').getText();
    expect(resetBtn).toBe('Reset');
  }, 30000);

  test('should display resize settings inputs', async () => {
    // Verify labels
    const widthLabel = await ctx.getById('imageResizerWidthLabel').getText();
    expect(widthLabel).toBe('Width:');

    const heightLabel = await ctx.getById('imageResizerHeightLabel').getText();
    expect(heightLabel).toBe('Height:');

    const qualityLabel = await ctx.getById('imageResizerQualityLabel').getText();
    expect(qualityLabel).toBe('Quality:');

    // Verify units
    const widthUnit = await ctx.getById('imageResizerWidthUnit').getText();
    expect(widthUnit).toBe('px');

    const heightUnit = await ctx.getById('imageResizerHeightUnit').getText();
    expect(heightUnit).toBe('px');

    const qualityUnit = await ctx.getById('imageResizerQualityUnit').getText();
    expect(qualityUnit).toBe('%');
  }, 30000);

  test('should display settings inputs', async () => {
    // Verify input fields exist
    await ctx.getById('imageResizerWidthInput').within(500).shouldExist();
    await ctx.getById('imageResizerHeightInput').within(500).shouldExist();
    await ctx.getById('imageResizerQualityInput').within(500).shouldExist();
    await ctx.getById('imageResizerAspectRatio').within(500).shouldExist();
  }, 30000);

  test('should display status information', async () => {
    // Verify status label exists
    const status = await ctx.getById('imageResizerStatus').getText();
    expect(status).toBe('Jobs: 0/0');

    // Verify jobs list label
    const jobsLabel = await ctx.getById('imageResizerJobsLabel').getText();
    expect(jobsLabel).toBe('Jobs');

    // Verify jobs list placeholder
    const jobsList = await ctx.getById('imageResizerJobsList').getText();
    expect(jobsList).toBe('No jobs yet');
  }, 30000);

  test('should have all required UI sections', async () => {
    // Check all main UI elements exist
    await ctx.getById('imageResizerTitle').within(500).shouldExist();
    await ctx.getById('imageResizerFilesLabel').within(500).shouldExist();
    await ctx.getById('imageResizerAddBtn').within(500).shouldExist();
    await ctx.getById('imageResizerClearBtn').within(500).shouldExist();
    await ctx.getById('imageResizerSettingsLabel').within(500).shouldExist();
    await ctx.getById('imageResizerStatus').within(500).shouldExist();
    await ctx.getById('imageResizerProcessBtn').within(500).shouldExist();
  }, 30000);
});
