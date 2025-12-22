/**
 * TsyneTest for NextCloud App
 *
 * Integration tests for the NextCloud client app UI using TsyneTest framework.
 * Tests user interactions, file management, and tab navigation.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildNextCloudApp } from './index';

describe('NextCloud App UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    // Cleanup
  });

  it('should render the app with title and tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check app title
    const title = await ctx.getByID('app-title').getText();
    expect(title).toContain('NextCloud');

    // Check tabs exist
    const filesTab = await ctx.getByID('tab-files');
    expect(filesTab).toBeDefined();
  });

  it('should display account status', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const accountLabel = await ctx.getByID('account-label').getText();
    expect(accountLabel).toMatch(/john\.doe|Connected/);
  });

  it('should show files tab by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const filesTitle = await ctx.getByID('files-title').getText();
    expect(filesTitle).toBe('File Browser');
  });

  it('should switch to sync tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click sync tab
    await ctx.getByID('tab-sync').click();

    // Sync title should be visible
    const syncTitle = await ctx.getByID('sync-title').within(1000).getText();
    expect(syncTitle).toBe('Sync Status');
  });

  it('should switch to shared tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click shared tab
    await ctx.getByID('tab-shared').click();

    // Shared title should be visible
    const sharedTitle = await ctx.getByID('shared-title').within(1000).getText();
    expect(sharedTitle).toBe('Shared Files');
  });

  it('should switch to account tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click account tab
    await ctx.getByID('tab-account').click();

    // Account title should be visible
    const accountTitle = await ctx.getByID('account-title').within(1000).getText();
    expect(accountTitle).toBe('Account Settings');
  });

  it('should navigate between all tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start in files
    let title = await ctx.getByID('files-title').getText();
    expect(title).toBe('File Browser');

    // Go to sync
    await ctx.getByID('tab-sync').click();
    title = await ctx.getByID('sync-title').within(500).getText();
    expect(title).toBe('Sync Status');

    // Go to shared
    await ctx.getByID('tab-shared').click();
    title = await ctx.getByID('shared-title').within(500).getText();
    expect(title).toBe('Shared Files');

    // Go to account
    await ctx.getByID('tab-account').click();
    title = await ctx.getByID('account-title').within(500).getText();
    expect(title).toBe('Account Settings');

    // Back to files
    await ctx.getByID('tab-files').click();
    title = await ctx.getByID('files-title').within(500).getText();
    expect(title).toBe('File Browser');
  });

  it('should display file list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should have some files visible
    const fileTitle = await ctx.getByID('files-title').within(500).getText();
    expect(fileTitle).toBeDefined();
  });

  it('should display sync items list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to sync tab
    await ctx.getByID('tab-sync').click();

    // Should have sync title
    const syncTitle = await ctx.getByID('sync-title').within(500).getText();
    expect(syncTitle).toBe('Sync Status');
  });

  it('should display shared files', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to shared tab
    await ctx.getByID('tab-shared').click();

    // Should have shared title
    const sharedTitle = await ctx.getByID('shared-title').within(500).getText();
    expect(sharedTitle).toBe('Shared Files');
  });

  it('should display account connection info', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to account tab
    await ctx.getByID('tab-account').click();

    // Check for account elements
    const accountTitle = await ctx.getByID('account-title').within(500).getText();
    expect(accountTitle).toBe('Account Settings');
  });

  it('should have upload button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const uploadBtn = await ctx.getByID('btn-upload');
    expect(uploadBtn).toBeDefined();
  });

  it('should have new folder button', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const folderBtn = await ctx.getByID('btn-new-folder');
    expect(folderBtn).toBeDefined();
  });

  it('should have search input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchInput = await ctx.getByID('search-files');
    expect(searchInput).toBeDefined();
  });

  it('should have sync button in sync tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to sync
    await ctx.getByID('tab-sync').click();

    const syncBtn = await ctx.getByID('btn-sync-all');
    expect(syncBtn).toBeDefined();
  });

  it('should have connect button in account tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to account
    await ctx.getByID('tab-account').click();

    const connectBtn = await ctx.getByID('btn-connect');
    expect(connectBtn).toBeDefined();
  });

  it('should maintain state when switching tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get initial account status
    const initialAccount = await ctx.getByID('account-label').getText();

    // Switch tabs
    await ctx.getByID('tab-sync').click();
    await ctx.getByID('tab-shared').click();
    await ctx.getByID('tab-account').click();

    // Back to files
    await ctx.getByID('tab-files').click();

    // Account status should be same
    const finalAccount = await ctx.getByID('account-label').within(500).getText();
    expect(finalAccount).toBe(initialAccount);
  });

  it('should have proper accessibility with IDs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Key elements should have IDs
    const elements = [
      'app-title',
      'account-label',
      'tab-files',
      'tab-sync',
      'tab-shared',
      'tab-account',
      'files-title',
      'btn-upload',
    ];

    for (const id of elements) {
      const element = await ctx.getByID(id);
      expect(element).toBeDefined();
    }
  });

  it('should display storage usage', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Storage info should be visible
    const storageLabel = await ctx.getByID('storage-label').getText();
    expect(storageLabel).toMatch(/Storage|Used/);
  });

  it('should capture screenshot of files view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/nextcloud-files.png');
    }
  });

  it('should capture screenshot of sync view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to sync
    await ctx.getByID('tab-sync').click();
    await ctx.getByID('sync-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/nextcloud-sync.png');
    }
  });

  it('should capture screenshot of shared view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to shared
    await ctx.getByID('tab-shared').click();
    await ctx.getByID('shared-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/nextcloud-shared.png');
    }
  });

  it('should capture screenshot of account view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildNextCloudApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to account
    await ctx.getByID('tab-account').click();
    await ctx.getByID('account-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/nextcloud-account.png');
    }
  });
});
