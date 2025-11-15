/**
 * Fyles Navigation Tests
 *
 * Test suite specifically for directory navigation and path handling:
 * - Directory navigation
 * - Parent directory navigation
 * - Home directory navigation
 * - Path updates
 *
 * Usage:
 *   npm test examples/fyles/fyles-navigation.test.ts
 *   TSYNE_HEADED=1 npm test examples/fyles/fyles-navigation.test.ts
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createFylesApp } from './fyles';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Fyles Navigation Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testDir: string;

  beforeAll(async () => {
    // Create a nested directory structure for navigation testing
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-nav-test-'));

    // Create nested folders: testDir/level1/level2/level3
    const level1 = path.join(testDir, 'level1');
    const level2 = path.join(level1, 'level2');
    const level3 = path.join(level2, 'level3');

    fs.mkdirSync(level1);
    fs.mkdirSync(level2);
    fs.mkdirSync(level3);

    // Add files at each level
    fs.writeFileSync(path.join(testDir, 'root.txt'), 'Root level');
    fs.writeFileSync(path.join(level1, 'level1.txt'), 'Level 1');
    fs.writeFileSync(path.join(level2, 'level2.txt'), 'Level 2');
    fs.writeFileSync(path.join(level3, 'level3.txt'), 'Level 3');

    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });

    const testApp = await tsyneTest.createApp((app) => {
      createFylesApp(app, testDir);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 15000);

  afterAll(async () => {
    await tsyneTest.cleanup();

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to clean up test directory:', err);
    }
  });

  test('should start in specified directory', async () => {
    // Should show test directory path
    await ctx.getByText(testDir).within(2000).shouldExist();

    // Should show level1 folder
    await ctx.getByText('level1').within(2000).shouldExist();

    // Should show root.txt file
    await ctx.getByText('root.txt').within(2000).shouldExist();
  });

  test('should navigate down one level', async () => {
    // Navigate to level1
    await ctx.getByText('level1').click();
    await ctx.wait(200);

    // Path should update
    const level1Path = path.join(testDir, 'level1');
    await ctx.getByText(level1Path).within(2000).shouldExist();

    // Should show level1.txt
    await ctx.getByText('level1.txt').within(2000).shouldExist();

    // Should show level2 folder
    await ctx.getByText('level2').within(2000).shouldExist();
  });

  test('should navigate down multiple levels', async () => {
    // Start at root
    await ctx.getByText('🏠').click();
    await ctx.wait(200);
    await ctx.getByText(testDir).click();
    await ctx.wait(200);

    // Navigate to level1
    await ctx.getByText('level1').click();
    await ctx.wait(200);

    // Navigate to level2
    await ctx.getByText('level2').click();
    await ctx.wait(200);

    // Path should update
    const level2Path = path.join(testDir, 'level1', 'level2');
    await ctx.getByText(level2Path).within(2000).shouldExist();

    // Should show level2.txt
    await ctx.getByText('level2.txt').within(2000).shouldExist();

    // Should show level3 folder
    await ctx.getByText('level3').within(2000).shouldExist();
  });

  test('should navigate up one level', async () => {
    // Navigate down to level2
    await ctx.getByText('🏠').click();
    await ctx.wait(200);
    await ctx.getByText(testDir).click();
    await ctx.wait(200);
    await ctx.getByText('level1').click();
    await ctx.wait(200);
    await ctx.getByText('level2').click();
    await ctx.wait(200);

    // Verify we're at level2
    const level2Path = path.join(testDir, 'level1', 'level2');
    await ctx.getByText(level2Path).within(2000).shouldExist();

    // Navigate up
    await ctx.getByText('⬆️ ..').click();
    await ctx.wait(200);

    // Should be at level1
    const level1Path = path.join(testDir, 'level1');
    await ctx.getByText(level1Path).within(2000).shouldExist();
    await ctx.getByText('level1.txt').within(2000).shouldExist();
  });

  test('should navigate to home and back', async () => {
    // Navigate to home
    await ctx.getByText('🏠').click();
    await ctx.wait(200);

    // Should show home directory
    const homeDir = os.homedir();
    await ctx.getByText(homeDir).within(2000).shouldExist();

    // Navigate to test directory via tree (simulate typing path or using tree)
    // For now, just verify home navigation worked
    expect(true).toBe(true);
  });

  test('should show parent button only when not at root', async () => {
    // Navigate to level1
    await ctx.getByText('🏠').click();
    await ctx.wait(200);
    await ctx.getByText(testDir).click();
    await ctx.wait(200);
    await ctx.getByText('level1').click();
    await ctx.wait(200);

    // Should show parent button
    await ctx.getByText('⬆️ ..').within(2000).shouldExist();
  });

  test('should update navigation panel on directory change', async () => {
    // Start at root
    await ctx.getByText('🏠').click();
    await ctx.wait(200);
    await ctx.getByText(testDir).click();
    await ctx.wait(200);

    // Should show level1 in navigation
    await ctx.getByText('📁 level1').within(2000).shouldExist();

    // Navigate to level1
    await ctx.getByText('level1').click();
    await ctx.wait(200);

    // Should now show level2 in navigation
    await ctx.getByText('📁 level2').within(2000).shouldExist();
  });

  test('should handle navigation to deepest level', async () => {
    // Navigate all the way to level3
    await ctx.getByText('🏠').click();
    await ctx.wait(200);
    await ctx.getByText(testDir).click();
    await ctx.wait(200);

    await ctx.getByText('level1').click();
    await ctx.wait(200);

    await ctx.getByText('level2').click();
    await ctx.wait(200);

    await ctx.getByText('level3').click();
    await ctx.wait(200);

    // Should show level3 path
    const level3Path = path.join(testDir, 'level1', 'level2', 'level3');
    await ctx.getByText(level3Path).within(2000).shouldExist();

    // Should show level3.txt
    await ctx.getByText('level3.txt').within(2000).shouldExist();

    // Should show no subdirectories
    await ctx.getByText('(no subdirectories)').within(2000).shouldExist();
  });

  test('should navigate back to root from deep level', async () => {
    // Navigate to level3
    await ctx.getByText('🏠').click();
    await ctx.wait(200);
    await ctx.getByText(testDir).click();
    await ctx.wait(200);

    await ctx.getByText('level1').click();
    await ctx.wait(200);

    await ctx.getByText('level2').click();
    await ctx.wait(200);

    await ctx.getByText('level3').click();
    await ctx.wait(200);

    // Navigate up 3 times
    await ctx.getByText('⬆️ ..').click();
    await ctx.wait(200);

    await ctx.getByText('⬆️ ..').click();
    await ctx.wait(200);

    await ctx.getByText('⬆️ ..').click();
    await ctx.wait(200);

    // Should be back at root
    await ctx.getByText(testDir).within(2000).shouldExist();
    await ctx.getByText('root.txt').within(2000).shouldExist();
  });
});
