import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildLightingLabApp,
  labState,
  cameraState,
  getLightPosition,
  getMaterialProperties,
  resetLabState,
} from './index';

describe('3D Lighting Lab App', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    resetLabState(); // Reset to defaults before each test
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('State Management', () => {
    test('initial state has correct defaults', () => {
      resetLabState();
      expect(labState.material).toBe('gold');
      expect(labState.lightColor).toBe('#ffffff');
      expect(labState.lightOrbitSpeed).toBe(0.02);
      expect(labState.lightAngle).toBe(0);
      expect(labState.lightHeight).toBe(5);
      expect(labState.lightOrbitRadius).toBe(8);
    });

    test('camera state has correct defaults', () => {
      resetLabState();
      expect(cameraState.radius).toBe(20);
      expect(cameraState.theta).toBeCloseTo(Math.PI / 4);
      expect(cameraState.phi).toBeCloseTo(Math.PI / 3);
      expect(cameraState.lookAt).toEqual([0, 0, 0]);
    });

    test('getLightPosition calculates correct position at angle 0', () => {
      resetLabState();
      labState.lightAngle = 0;
      const pos = getLightPosition();
      expect(pos[0]).toBeCloseTo(0); // sin(0) * 8 = 0
      expect(pos[1]).toBe(5); // lightHeight
      expect(pos[2]).toBeCloseTo(8); // cos(0) * 8 = 8
    });

    test('getLightPosition calculates correct position at PI/2', () => {
      resetLabState();
      labState.lightAngle = Math.PI / 2;
      const pos = getLightPosition();
      expect(pos[0]).toBeCloseTo(8); // sin(PI/2) * 8 = 8
      expect(pos[1]).toBe(5); // lightHeight
      expect(pos[2]).toBeCloseTo(0); // cos(PI/2) * 8 = 0
    });

    test('getMaterialProperties returns gold material by default', () => {
      resetLabState();
      const props = getMaterialProperties();
      expect(props.color).toBe('#ffd700');
      expect(props.shininess).toBe(0.9);
    });

    test('getMaterialProperties returns plastic when set', () => {
      resetLabState();
      labState.material = 'plastic';
      const props = getMaterialProperties();
      expect(props.color).toBe('#cc2222'); // redPlastic
      expect(props.shininess).toBe(0.8);
    });

    test('getMaterialProperties returns matte when set', () => {
      resetLabState();
      labState.material = 'matte';
      const props = getMaterialProperties();
      expect(props.color).toBe('#888888');
      expect(props.shininess).toBe(0.1);
    });
  });

  describe('GUI Tests', () => {
    test('should render lighting lab', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Wait for initial render
      await ctx.wait(500);

      // Verify title is present
      await ctx.getById('title').within(1000).shouldBe('Lighting Lab');

      // Take screenshot if enabled
      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = path.join(screenshotDir, '3d-lighting-lab.png');
        await tsyneTest.screenshot(screenshotPath);
        console.log(`Screenshot saved: ${screenshotPath}`);
      }
    });

    test('material buttons are present', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Check material buttons exist
      await ctx.getById('btn-gold').shouldExist();
      await ctx.getById('btn-plastic').shouldExist();
      await ctx.getById('btn-matte').shouldExist();
    });

    test('light color buttons are present', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Check light color buttons exist
      await ctx.getById('btn-white').shouldExist();
      await ctx.getById('btn-warm').shouldExist();
      await ctx.getById('btn-cool').shouldExist();
      await ctx.getById('btn-red').shouldExist();
      await ctx.getById('btn-green').shouldExist();
      await ctx.getById('btn-blue').shouldExist();
    });

    test('clicking material button changes state', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Click plastic button
      await ctx.getById('btn-plastic').click();
      await ctx.wait(100);

      // Verify state changed
      expect(labState.material).toBe('plastic');

      // Click matte button
      await ctx.getById('btn-matte').click();
      await ctx.wait(100);

      // Verify state changed
      expect(labState.material).toBe('matte');
    });

    test('clicking light color button changes state', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Click warm button
      await ctx.getById('btn-warm').click();
      await ctx.wait(100);

      // Verify state changed
      expect(labState.lightColor).toBe('#ffcc77');

      // Click blue button
      await ctx.getById('btn-blue').click();
      await ctx.wait(100);

      // Verify state changed
      expect(labState.lightColor).toBe('#4444ff');
    });

    test('animation speed buttons work', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Click slow button
      await ctx.getById('btn-slow').click();
      expect(labState.lightOrbitSpeed).toBe(0.01);

      // Click fast button
      await ctx.getById('btn-fast').click();
      expect(labState.lightOrbitSpeed).toBe(0.04);

      // Click stop button
      await ctx.getById('btn-stop').click();
      expect(labState.lightOrbitSpeed).toBe(0);
    });

    test('light height buttons work', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Click low button
      await ctx.getById('btn-low').click();
      await ctx.wait(100);
      expect(labState.lightHeight).toBe(3);

      // Click high button
      await ctx.getById('btn-high').click();
      await ctx.wait(100);
      expect(labState.lightHeight).toBe(8);

      // Click mid button
      await ctx.getById('btn-mid').click();
      await ctx.wait(100);
      expect(labState.lightHeight).toBe(5);
    });

    test('reset camera button works', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      // Modify camera state
      cameraState.radius = 30;
      cameraState.theta = Math.PI;

      // Click reset button
      await ctx.getById('btn-reset').click();
      await ctx.wait(100);

      // Verify camera state reset
      expect(cameraState.radius).toBe(20);
      expect(cameraState.theta).toBeCloseTo(Math.PI / 4);
      expect(cameraState.phi).toBeCloseTo(Math.PI / 3);
    });

    test('light orbits when animation is running', async () => {
      const testApp = await tsyneTest.createApp(buildLightingLabApp);
      ctx = tsyneTest.getContext();
      await testApp.run();
      await ctx.wait(300);

      const initialAngle = labState.lightAngle;

      // Wait for animation to progress (animation interval is 32ms)
      await ctx.wait(200);

      // Angle should have increased (animation is running by default)
      expect(labState.lightAngle).toBeGreaterThan(initialAngle);
    }, 10000);
  });
});
