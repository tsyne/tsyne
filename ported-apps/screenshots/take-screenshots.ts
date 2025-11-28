#!/usr/bin/env npx ts-node
/**
 * Screenshot capture script for Ported Applications
 *
 * Takes screenshots of all ported apps for documentation.
 * Runs each test with TAKE_SCREENSHOTS=1 and TSYNE_HEADED=1 for real visual output.
 *
 * Usage:
 *   cd ported-apps && npx ts-node screenshots/take-screenshots.ts
 *
 * Or from root:
 *   cd /home/paul/tsyne-workspace/tsyne && npx ts-node ported-apps/screenshots/take-screenshots.ts
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createChessApp } from '../chess/chess';
import { createSolitaireApp } from '../solitaire/solitaire';
import { createTerminalApp } from '../terminal/terminal';
import { createPixelEditorApp } from '../pixeledit/pixeledit';
import { createFylesApp } from '../fyles/fyles';
import { createSlydesApp } from '../slydes/slydes';
import { createImageViewerApp } from '../image-viewer/image-viewer';
import { createGameOfLifeApp } from '../game-of-life/game-of-life';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const screenshotsDir = __dirname;

interface AppConfig {
  name: string;
  filename: string;
  createApp: (app: any, ...args: any[]) => any;
  args?: any[];
  waitTime?: number;
}

const apps: AppConfig[] = [
  {
    name: 'Chess',
    filename: 'chess.png',
    createApp: createChessApp,
    args: [10], // AI delay
    waitTime: 500,
  },
  {
    name: 'Solitaire',
    filename: 'solitaire.png',
    createApp: createSolitaireApp,
    waitTime: 1000, // SVG pre-rendering takes time
  },
  {
    name: 'Terminal',
    filename: 'terminal.png',
    createApp: createTerminalApp,
    waitTime: 300,
  },
  {
    name: 'Pixel Editor',
    filename: 'pixeledit.png',
    createApp: createPixelEditorApp,
    waitTime: 300,
  },
  {
    name: 'Slydes',
    filename: 'slydes.png',
    createApp: createSlydesApp,
    waitTime: 300,
  },
  {
    name: 'Image Viewer',
    filename: 'image-viewer.png',
    createApp: createImageViewerApp,
    waitTime: 300,
  },
  {
    name: 'Game of Life',
    filename: 'game-of-life.png',
    createApp: createGameOfLifeApp,
    waitTime: 300,
  },
];

async function takeScreenshots() {
  console.log('Taking screenshots for Ported Applications...\n');

  // Ensure screenshots directory exists
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  for (const appConfig of apps) {
    console.log(`📷 ${appConfig.name}...`);

    const tsyneTest = new TsyneTest({ headed: true });

    try {
      const testApp = await tsyneTest.createApp((app) => {
        if (appConfig.args) {
          appConfig.createApp(app, ...appConfig.args);
        } else {
          appConfig.createApp(app);
        }
      });

      await testApp.run();

      // Wait for UI to render
      await new Promise(resolve => setTimeout(resolve, appConfig.waitTime || 500));

      const screenshotPath = path.join(screenshotsDir, appConfig.filename);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`   ✓ Saved: ${screenshotPath}`);

    } catch (error) {
      console.error(`   ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await tsyneTest.cleanup();
    }
  }

  // Fyles needs special handling (temp directory)
  console.log(`📷 Fyles...`);
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-screenshot-'));
  try {
    // Create sample files
    fs.writeFileSync(path.join(testDir, 'document.txt'), 'Sample document');
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Sample README');
    fs.mkdirSync(path.join(testDir, 'folder'));
    fs.writeFileSync(path.join(testDir, 'folder', 'nested.txt'), 'Nested file');

    const tsyneTest = new TsyneTest({ headed: true });
    const testApp = await tsyneTest.createApp((app) => {
      createFylesApp(app, testDir);
    });

    await testApp.run();
    await new Promise(resolve => setTimeout(resolve, 500));

    const screenshotPath = path.join(screenshotsDir, 'fyles.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`   ✓ Saved: ${screenshotPath}`);

    await tsyneTest.cleanup();
  } catch (error) {
    console.error(`   ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  console.log('\nDone! Screenshots saved to ported-apps/screenshots/');
}

takeScreenshots().catch(console.error);
