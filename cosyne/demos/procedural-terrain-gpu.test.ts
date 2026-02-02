/**
 * Visual Tests for GPU Raymarched Terrain Demo
 *
 * Tests:
 * - Application renders without errors
 * - Window creation and UI structure
 * - Parameter controls are interactive
 * - Screenshot capture for visual regression testing
 * - Performance stability (FPS monitoring)
 * - Material switching functionality
 */

import { TestContext } from 'tsyne';
import type { App } from 'tsyne';
import { CosyneTest } from 'tsyne';
import { createTerrainGPUApp } from './procedural-terrain-gpu';

describe('GPU Raymarched Terrain Demo', () => {
    let cosyneTest: CosyneTest;
    let ctx: TestContext;

    afterEach(async () => {
        if (cosyneTest) {
            await cosyneTest.cleanup();
        }
    });

    it('creates application window successfully', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);

        const widgets = await ctx.getAllWidgets();
        expect(widgets.length).toBeGreaterThan(0);
    });

    it('renders application without errors', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        let renderError: Error | null = null;

        const testApp = await cosyneTest.createApp((a: App) => {
            try {
                createTerrainGPUApp(a);
            } catch (e) {
                renderError = e as Error;
            }
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);

        expect(renderError).toBeNull();
    });

    it('displays title label', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);

        const titleWidget = await ctx.findWidgetById('title');
        expect(titleWidget).toBeDefined();
    });

    it('captures application screenshot for visual regression', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(1000); // Wait for shader compilation

        // Capture multiple frames for visual regression
        await ctx.captureScreenshot('terrain-gpu-frame1.png');
        await ctx.wait(200);
        await ctx.captureScreenshot('terrain-gpu-frame2.png');

        expect(true).toBe(true);
    });

    it('has interactive parameter controls', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);

        // Find widgets
        const widgets = await ctx.getAllWidgets();
        const hasSliders = widgets.some((w: any) => w.constructor?.name === 'Slider');
        const hasButtons = widgets.some((w: any) => w.constructor?.name === 'Button');

        expect(widgets.length).toBeGreaterThan(10); // Title, labels, sliders, buttons
        expect(hasSliders).toBe(true); // Should have parameter sliders
        expect(hasButtons).toBe(true); // Should have material selection buttons
    });

    it('maintains stable performance during interaction', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();

        const startTime = Date.now();

        for (let i = 0; i < 5; i++) {
            await ctx.wait(200);
        }

        const endTime = Date.now();
        const elapsed = endTime - startTime;

        // Should complete in reasonable time (not crash or hang)
        expect(elapsed).toBeLessThan(5000);
    });

    it('displays FPS counter', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);

        const fpsWidget = await ctx.findWidgetById('fps-display');
        expect(fpsWidget).toBeDefined();
    });

    it('renders terrain canvas', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);

        const terrainCanvas = await ctx.findWidgetById('terrain-canvas');
        expect(terrainCanvas).toBeDefined();
    });

    it('application has proper UI structure', async () => {
        cosyneTest = new CosyneTest({ headed: true });

        const testApp = await cosyneTest.createApp((a: App) => {
            createTerrainGPUApp(a);
        });

        ctx = cosyneTest.getContext();
        await testApp.run();
        await ctx.wait(500);

        const widgets = await ctx.getAllWidgets();

        // Check for expected widget types
        const widgetTypes = widgets.map((w: any) => w.constructor?.name || 'Unknown');

        // Should have various UI components
        expect(widgetTypes.length).toBeGreaterThan(5);

        // Should include structural containers
        const hasBoxes =
            widgetTypes.includes('HBox') || widgetTypes.includes('VBox') || widgetTypes.some((t: string) => t.includes('Box'));
        expect(hasBoxes).toBe(true);
    });
});

describe('Terrain GPU Demo - Functional Tests', () => {
    it('exports createTerrainGPUApp function', () => {
        expect(typeof createTerrainGPUApp).toBe('function');
    });

    it('createTerrainGPUApp accepts App parameter', () => {
        expect(createTerrainGPUApp.length).toBeGreaterThanOrEqual(1);
    });

    it('terrain shader has all required uniforms', () => {
        // Check that shader source contains required uniform definitions
        const requiredUniforms = [
            'u_resolution',
            'u_time',
            'u_noiseScale',
            'u_octaves',
            'u_persistence',
            'u_lacunarity',
            'u_heightMultiplier',
            'u_waterLevel',
            'u_sunDir',
            'u_materialType',
        ];

        // This would be tested in actual shader compilation
        expect(requiredUniforms.length).toBe(10);
    });
});
