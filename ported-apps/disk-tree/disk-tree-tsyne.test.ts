/**
 * TsyneTest tests for Disk Tree App
 * Tests UI interactions, treemap rendering, navigation, and color schemes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TsyneTest, App } from 'tsyne';
import { buildDiskTreeApp, DiskTreeUI } from './disk-tree';

// Create a deterministic test directory structure
function createTestDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'disk-tree-test-'));

  // Root files
  fs.writeFileSync(path.join(dir, 'readme.md'), 'A'.repeat(500));
  fs.writeFileSync(path.join(dir, 'app.ts'), 'B'.repeat(2000));
  fs.writeFileSync(path.join(dir, 'config.json'), 'C'.repeat(100));

  // Subdirectory: src/
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'main.ts'), 'D'.repeat(5000));
  fs.writeFileSync(path.join(dir, 'src', 'utils.ts'), 'E'.repeat(3000));
  fs.writeFileSync(path.join(dir, 'src', 'style.css'), 'F'.repeat(1000));

  // Nested subdirectory: src/lib/
  fs.mkdirSync(path.join(dir, 'src', 'lib'));
  fs.writeFileSync(path.join(dir, 'src', 'lib', 'helper.ts'), 'G'.repeat(1500));
  fs.writeFileSync(path.join(dir, 'src', 'lib', 'data.json'), 'H'.repeat(800));

  // Subdirectory: assets/
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'assets', 'logo.png'), 'I'.repeat(10000));
  fs.writeFileSync(path.join(dir, 'assets', 'icon.svg'), 'J'.repeat(400));

  return dir;
}

describe('Disk Tree App', () => {
  let tsyneTest: TsyneTest;
  let testDir: string;
  let testApp: any;
  let diskTreeUI: DiskTreeUI;

  beforeAll(() => {
    testDir = createTestDir();
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    if (tsyneTest) {
      await tsyneTest.cleanup();
    }
  });

  async function launchApp(): Promise<void> {
    tsyneTest = new TsyneTest({ headed: false });
    tsyneTest.mockFileDialog('folder', testDir);

    const createTestApp = (app: App) => {
      testApp = app;
      app.window({ title: 'Disk Tree', width: 900, height: 700 }, (win: any) => {
        diskTreeUI = buildDiskTreeApp(app, win);
        win.show();
      });
    };

    await tsyneTest.createApp(createTestApp);
    await testApp.run();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async function scanFolder(): Promise<void> {
    const ctx = tsyneTest.getContext();
    await ctx.getById('openBtn').click();
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // ---------- Initial UI state ----------

  it('renders initial UI with all controls', async () => {
    await launchApp();
    const ctx = tsyneTest.getContext();

    await ctx.getById('title').within(2000).shouldContain('Disk Tree');
    await ctx.getById('status').within(2000).shouldContain('Select a folder');
    await ctx.getById('openBtn').within(2000).shouldExist();
    await ctx.getById('upBtn').within(2000).shouldExist();
    await ctx.getById('rootBtn').within(2000).shouldExist();
    await ctx.getById('breadcrumb').within(2000).shouldBe('Root');
    await ctx.getById('stats').within(2000).shouldContain('Files: 0');
  }, 30000);

  it('Up and Root buttons are ghosted before scan', async () => {
    await launchApp();
    const ctx = tsyneTest.getContext();

    await ctx.getById('upBtn').within(2000).shouldBeDisabled();
    await ctx.getById('rootBtn').within(2000).shouldBeDisabled();
  }, 30000);

  // ---------- After scanning ----------

  it('scans directory and shows treemap rects', async () => {
    await launchApp();
    await scanFolder();

    const state = diskTreeUI.getStore().getState();
    // 11 files across root + src + src/lib + assets, with recursive subdivision
    expect(state.allRects.length).toBeGreaterThan(0);
    expect(state.rootEntry).not.toBeNull();
    expect(state.rootEntry!.path).toBe(testDir);
    expect(state.currentEntry).not.toBeNull();
  }, 30000);

  it('updates title and stats after scan', async () => {
    await launchApp();
    await scanFolder();

    const ctx = tsyneTest.getContext();
    await ctx.getById('title').within(2000).shouldContain(path.basename(testDir));
    await ctx.getById('stats').within(2000).shouldContain('Files:');
    await ctx.getById('stats').within(2000).shouldContain('Folders:');
  }, 30000);

  it('Up and Root buttons are still ghosted at root after scan', async () => {
    await launchApp();
    await scanFolder();

    const ctx = tsyneTest.getContext();
    // At root level - no drill-down yet, so still ghosted
    await ctx.getById('upBtn').within(2000).shouldBeDisabled();
    await ctx.getById('rootBtn').within(2000).shouldBeDisabled();
  }, 30000);

  // ---------- Navigation ----------

  it('drill-down via store unghosts Up and Root buttons', async () => {
    await launchApp();
    await scanFolder();

    const store = diskTreeUI.getStore();
    const state = store.getState();

    // Find a directory rect to drill into
    const dirRect = state.allRects.find(r => r.entry.isDirectory);
    if (!dirRect) {
      // All rects are leaf files after recursive subdivision - navigate via store
      store.navigateToPath(path.join(testDir, 'src'));
    } else {
      store.drillDown(dirRect.id);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    const ctx = tsyneTest.getContext();

    // Now drilled in — breadcrumbs.length > 1, so buttons should be enabled
    const newState = store.getState();
    expect(newState.breadcrumbs.length).toBeGreaterThan(1);

    await ctx.getById('upBtn').within(2000).shouldBeEnabled();
    await ctx.getById('rootBtn').within(2000).shouldBeEnabled();
  }, 30000);

  it('drillUp returns to parent', async () => {
    await launchApp();
    await scanFolder();

    const store = diskTreeUI.getStore();
    store.navigateToPath(path.join(testDir, 'src'));
    expect(store.getState().breadcrumbs.length).toBe(2);

    store.drillUp();
    expect(store.getState().breadcrumbs.length).toBe(1);
    expect(store.getState().currentEntry!.path).toBe(testDir);
  }, 30000);

  it('goToRoot returns to root from nested drill-down', async () => {
    await launchApp();
    await scanFolder();

    const store = diskTreeUI.getStore();
    store.navigateToPath(path.join(testDir, 'src', 'lib'));
    expect(store.getState().breadcrumbs.length).toBe(3);

    store.goToRoot();
    expect(store.getState().breadcrumbs.length).toBe(1);
    expect(store.getState().currentEntry!.path).toBe(testDir);
  }, 30000);

  // ---------- Color schemes ----------

  it('switches to bySize color scheme', async () => {
    await launchApp();
    await scanFolder();

    const ctx = tsyneTest.getContext();
    await ctx.getById('colorSizeBtn').click();
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(diskTreeUI.getStore().getState().colorScheme).toBe('bySize');
  }, 30000);

  it('switches to byDepth color scheme', async () => {
    await launchApp();
    await scanFolder();

    const ctx = tsyneTest.getContext();
    await ctx.getById('colorDepthBtn').click();
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(diskTreeUI.getStore().getState().colorScheme).toBe('byDepth');
  }, 30000);

  it('switches to byAge color scheme', async () => {
    await launchApp();
    await scanFolder();

    const ctx = tsyneTest.getContext();
    await ctx.getById('colorAgeBtn').click();
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(diskTreeUI.getStore().getState().colorScheme).toBe('byAge');
  }, 30000);

  it('switches back to byType color scheme', async () => {
    await launchApp();
    await scanFolder();

    const ctx = tsyneTest.getContext();
    // Switch away first
    await ctx.getById('colorSizeBtn').click();
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(diskTreeUI.getStore().getState().colorScheme).toBe('bySize');

    // Switch back
    await ctx.getById('colorTypeBtn').click();
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(diskTreeUI.getStore().getState().colorScheme).toBe('byType');
  }, 30000);

  // ---------- Store unit tests (no UI) ----------

  it('store: scans directory and produces correct tree', async () => {
    await launchApp();
    const store = diskTreeUI.getStore();
    await store.scanDirectory(testDir);

    const state = store.getState();
    expect(state.rootEntry!.name).toBe(path.basename(testDir));
    expect(state.rootEntry!.isDirectory).toBe(true);
    expect(state.rootEntry!.children.length).toBeGreaterThan(0);

    // Check specific children exist
    const childNames = state.rootEntry!.children.map(c => c.name).sort();
    expect(childNames).toContain('src');
    expect(childNames).toContain('assets');
    expect(childNames).toContain('readme.md');
    expect(childNames).toContain('app.ts');
    expect(childNames).toContain('config.json');
  }, 30000);

  it('store: setSelected and setHovered update state', async () => {
    await launchApp();
    await scanFolder();

    const store = diskTreeUI.getStore();
    const rects = store.getState().allRects;
    expect(rects.length).toBeGreaterThan(0);

    store.setSelected(rects[0].id);
    expect(store.getState().selectedId).toBe(rects[0].id);

    store.setHovered(rects[1]?.id || rects[0].id);
    expect(store.getState().hoveredId).toBeTruthy();

    store.setSelected(null);
    expect(store.getState().selectedId).toBeNull();
  }, 30000);

  it('store: navigateToPath builds breadcrumb trail', async () => {
    await launchApp();
    await scanFolder();

    const store = diskTreeUI.getStore();
    store.navigateToPath(path.join(testDir, 'src', 'lib'));

    const state = store.getState();
    expect(state.breadcrumbs.length).toBe(3);
    expect(state.breadcrumbs[0].path).toBe(testDir);
    expect(state.breadcrumbs[1].name).toBe('src');
    expect(state.breadcrumbs[2].name).toBe('lib');
    expect(state.currentEntry!.name).toBe('lib');
  }, 30000);

  it('store: navigateToPath to nonexistent path is a no-op', async () => {
    await launchApp();
    await scanFolder();

    const store = diskTreeUI.getStore();
    const beforeState = store.getState();
    store.navigateToPath(path.join(testDir, 'nonexistent', 'path'));

    // Should not have changed
    expect(store.getState().currentEntry!.path).toBe(beforeState.currentEntry!.path);
  }, 30000);
});
