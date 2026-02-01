/**
 * Test actual disk-tree.ts using TsyneTest
 */

import { TsyneTest, App } from 'tsyne';
import { buildDiskTreeApp, DiskTreeUI } from './disk-tree';

describe('Actual disk-tree test', () => {
  let tsyneTest: TsyneTest;

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  it('shows colored rectangles after scanning foo folder', async () => {
    let testApp: App;
    let diskTreeUI: DiskTreeUI;

    const createTestApp = (app: App) => {
      testApp = app;
      app.window({ title: 'Disk Tree', width: 900, height: 700 }, (win: any) => {
        diskTreeUI = buildDiskTreeApp(app, win);
        win.show();
      });
    };

    tsyneTest = new TsyneTest({ headed: false });
    tsyneTest.mockFileDialog('folder', '/home/paul/scm/tsyne/tsyne/android-native/foo');

    await tsyneTest.createApp(createTestApp);
    await testApp!.run();

    await new Promise(resolve => setTimeout(resolve, 500));
    await tsyneTest.screenshot('/tmp/actual-disk-tree-1-initial.png');

    // Click Open Folder
    const ctx = tsyneTest.getContext();
    await ctx.getById('openBtn').click();

    await new Promise(resolve => setTimeout(resolve, 1000));
    await tsyneTest.screenshot('/tmp/actual-disk-tree-2-after-scan.png');

    const state = diskTreeUI!.getStore().getState();
    console.log(`[Test] allRects = ${state.allRects.length}`);
    expect(state.allRects.length).toBe(4);
  });
});
