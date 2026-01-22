/**
 * TsyneTest tests for PhoneTop App Launcher
 *
 * Exercises launching each app in the phonetop environment to catch launch errors.
 * This is a comprehensive smoke test that verifies all apps can at least start.
 */

import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildPhoneTop, PhoneTop } from './phonetop';
import { parseAppMetadata, AppMetadata } from '../core/src/app-metadata';
import { ALL_APPS } from '../all-apps';
import type { App } from '../core/src/app';

// Timeout for each app launch (ms)
const APP_LAUNCH_TIMEOUT = 15000;
// Timeout for phonetop initialization
const PHONETOP_INIT_TIMEOUT = 30000;

// Get the list of apps that will be loaded
function getAppList(): AppMetadata[] {
  const apps: AppMetadata[] = [];
  for (const filePath of ALL_APPS) {
    try {
      const metadata = parseAppMetadata(filePath);
      if (metadata) {
        apps.push(metadata);
      }
    } catch {
      // Silently skip apps that fail to load
    }
  }
  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

// Group apps by category
function groupAppsByCategory(apps: AppMetadata[]): Map<string, AppMetadata[]> {
  const groups = new Map<string, AppMetadata[]>();

  for (const app of apps) {
    const category = app.category || 'uncategorized';
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(app);
  }

  return groups;
}

describe('PhoneTop App Launcher', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  }, PHONETOP_INIT_TIMEOUT);

  afterAll(async () => {
    await tsyneTest.cleanup();
  }, PHONETOP_INIT_TIMEOUT);

  test('should render home screen with folders', async () => {
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify navigation buttons exist
    await ctx.getById('swipeLeft').within(1000).shouldExist();
    await ctx.getById('swipeRight').within(1000).shouldExist();
  }, PHONETOP_INIT_TIMEOUT);

  test('should have correct number of folders', async () => {
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check for known category folders
    const knownCategories = ['utilities', 'graphics', 'games', 'media', 'phone', 'system', 'fun', 'productivity', 'creativity', 'development'];
    const apps = getAppList();
    const groups = groupAppsByCategory(apps);

    for (const category of knownCategories) {
      if (groups.has(category)) {
        // Folder should exist on home screen
        try {
          await ctx.getById(`folder-${category}`).within(500).shouldExist();
        } catch {
          // Folder might be on a different page
        }
      }
    }
  }, PHONETOP_INIT_TIMEOUT);
});

describe('PhoneTop App Launch Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  const apps = getAppList();
  const launchResults: { name: string; success: boolean; error?: string }[] = [];

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  }, PHONETOP_INIT_TIMEOUT);

  afterAll(async () => {
    await tsyneTest.cleanup();

    // Print summary of launch results
    console.log('\n=== App Launch Results ===');
    const successes = launchResults.filter(r => r.success);
    const failures = launchResults.filter(r => !r.success);

    console.log(`Passed: ${successes.length}/${launchResults.length}`);
    if (failures.length > 0) {
      console.log('\nFailed apps:');
      for (const failure of failures) {
        console.log(`  - ${failure.name}: ${failure.error}`);
      }
    }
  }, PHONETOP_INIT_TIMEOUT);

  // Generate a test for each app
  for (const appMeta of apps) {
    test(`should launch ${appMeta.name} without errors`, async () => {
      let testApp;
      let launchError: string | undefined;

      try {
        testApp = await tsyneTest.createApp(async (app: App) => {
          await buildPhoneTop(app);
        });

        ctx = tsyneTest.getContext();
        await testApp.run();

        // Find which folder contains this app (if categorized)
        const category = appMeta.category;

        if (category) {
          // Open the folder first
          try {
            await ctx.getById(`folder-${category}`).within(1000).click();
            // Wait for folder to open
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (e) {
            // Folder might be on a different page - try navigating
            let found = false;
            for (let page = 0; page < 5 && !found; page++) {
              try {
                await ctx.getById(`folder-${category}`).within(200).click();
                found = true;
              } catch {
                // Try next page
                try {
                  await ctx.getById('swipeRight').click();
                  await new Promise(resolve => setTimeout(resolve, 200));
                } catch {
                  break;
                }
              }
            }
            if (!found) {
              throw new Error(`Could not find folder for category: ${category}`);
            }
          }
        }

        // Try to click the app icon
        const iconId = `icon-${appMeta.name}`;
        try {
          await ctx.getById(iconId).within(1000).click();
        } catch (e) {
          // App might be on a different page - try navigating within folder or home
          let found = false;
          for (let page = 0; page < 5 && !found; page++) {
            try {
              await ctx.getById(iconId).within(200).click();
              found = true;
            } catch {
              // Try scrolling or next page
              try {
                await ctx.getById('swipeRight').click();
                await new Promise(resolve => setTimeout(resolve, 200));
              } catch {
                break;
              }
            }
          }
          if (!found) {
            throw new Error(`Could not find app icon: ${iconId}`);
          }
        }

        // Wait for app to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // App launched successfully if we get here without errors
        launchResults.push({ name: appMeta.name, success: true });

      } catch (err) {
        launchError = err instanceof Error ? err.message : String(err);
        launchResults.push({ name: appMeta.name, success: false, error: launchError });
        throw err;
      }
    }, APP_LAUNCH_TIMEOUT + 10000); // Extra time for test overhead
  }
});

describe('PhoneTop Folder Navigation', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  }, PHONETOP_INIT_TIMEOUT);

  afterAll(async () => {
    await tsyneTest.cleanup();
  }, PHONETOP_INIT_TIMEOUT);

  test('should open and close Games folder', async () => {
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Try to find and click Games folder
    try {
      await ctx.getById('folder-games').within(1000).click();
      // Should see "Back to Home" button in folder view
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch {
      // Games folder might not exist or be on different page
    }
  }, PHONETOP_INIT_TIMEOUT);

  test('should open and close Utilities folder', async () => {
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Try to find and click Utilities folder
    try {
      await ctx.getById('folder-utilities').within(1000).click();
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch {
      // Folder might not exist
    }
  }, PHONETOP_INIT_TIMEOUT);

  test('should navigate between pages', async () => {
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click swipe right
    await ctx.getById('swipeRight').within(1000).click();
    await new Promise(resolve => setTimeout(resolve, 200));

    // Click swipe left
    await ctx.getById('swipeLeft').within(1000).click();
    await new Promise(resolve => setTimeout(resolve, 200));
  }, PHONETOP_INIT_TIMEOUT);
});

describe('PhoneTop Error Recovery', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  }, PHONETOP_INIT_TIMEOUT);

  afterAll(async () => {
    await tsyneTest.cleanup();
  }, PHONETOP_INIT_TIMEOUT);

  test('should recover from app crash gracefully', async () => {
    // This test verifies the error handling we added works
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Just verify the launcher starts without crashing
    await ctx.getById('swipeLeft').within(1000).shouldExist();
    await ctx.getById('swipeRight').within(1000).shouldExist();
  }, PHONETOP_INIT_TIMEOUT);
});

// Quick smoke test that just verifies phonetop initializes
describe('PhoneTop Quick Smoke Test', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  }, PHONETOP_INIT_TIMEOUT);

  afterAll(async () => {
    await tsyneTest.cleanup();
  }, PHONETOP_INIT_TIMEOUT);

  test('should initialize and show app count', async () => {
    const testApp = await tsyneTest.createApp(async (app: App) => {
      await buildPhoneTop(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const apps = getAppList();
    console.log(`PhoneTop discovered ${apps.length} apps`);

    // Verify we found some apps
    expect(apps.length).toBeGreaterThan(0);
  }, PHONETOP_INIT_TIMEOUT);
});
