/**
 * Visual Debug Test for Endless Nights
 *
 * Step-by-step screenshots to diagnose rendering issues.
 */

import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { buildEndlessNights, EndlessNightsDemo } from '../../ported-apps/endless-nights/src/endless-nights-app';

describe('Endless Nights - visual debug', () => {
    let tsyneTest: TsyneTest;
    let ctx: TestContext;
    let demo: EndlessNightsDemo | null = null;

    beforeAll(async () => {
        tsyneTest = new TsyneTest({ headed: true });
    });

    afterAll(async () => {
        if (demo) demo.stop();
        await tsyneTest?.cleanup();
    });

    it('renders terrain, character, and torches', async () => {
        const WIDTH = 900;
        const HEIGHT = 600;

        const testApp = await tsyneTest.createApp(async (app) => {
            await app.window(
                { title: 'Endless Nights Debug', width: WIDTH, height: HEIGHT },
                async (win) => {
                    demo = await buildEndlessNights(app, win, { width: WIDTH, height: HEIGHT });
                    win.show();
                }
            );
        });

        ctx = tsyneTest.getContext();
        await testApp.run();

        const screenshotsDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

        // Step 1: Right after init (500ms)
        await ctx.wait(500);
        await tsyneTest.screenshot(path.join(screenshotsDir, 'endless_nights-t500.png'));
        console.log('Screenshot: endless_nights-t500.png');

        // Step 2: After 2 seconds of rendering
        await ctx.wait(1500);
        await tsyneTest.screenshot(path.join(screenshotsDir, 'endless_nights-t2000.png'));
        console.log('Screenshot: endless_nights-t2000.png');

        // Step 3: After 4 seconds
        await ctx.wait(2000);
        await tsyneTest.screenshot(path.join(screenshotsDir, 'endless_nights-t4000.png'));
        console.log('Screenshot: endless_nights-t4000.png');
    }, 30000);
});
