/**
 * Theme Zones Demo Test
 *
 * Tests the ThemeOverride container functionality.
 *
 * Run with: npm test examples/theme-zones.test.ts
 */

import { TsyneTest } from 'tsyne';
import { App } from 'tsyne';

describe('Theme Zones Demo', () => {
  let tsyneTest: TsyneTest;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should render theme zones with different variants', async () => {
    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Theme Zones Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          a.hbox(() => {
            // Dark theme zone
            a.themeoverride('dark', () => {
              a.vbox(() => {
                a.label('Dark Zone');
                a.button('Dark Button');
              });
            });

            // Light theme zone
            a.themeoverride('light', () => {
              a.vbox(() => {
                a.label('Light Zone');
                a.button('Light Button');
              });
            });
          });
        });
        win.show();
      });
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify both zones are visible
    await ctx.expect(ctx.getByText('Dark Zone')).toBeVisible();
    await ctx.expect(ctx.getByText('Light Zone')).toBeVisible();
    await ctx.expect(ctx.getByText('Dark Button')).toBeVisible();
    await ctx.expect(ctx.getByText('Light Button')).toBeVisible();
  });

  it('should allow nested theme overrides', async () => {
    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Nested Theme Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          a.themeoverride('dark', () => {
            a.vbox(() => {
              a.label('Outer Dark');
              a.themeoverride('light', () => {
                a.vbox(() => {
                  a.label('Inner Light');
                });
              });
            });
          });
        });
        win.show();
      });
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify nested zones are visible
    await ctx.expect(ctx.getByText('Outer Dark')).toBeVisible();
    await ctx.expect(ctx.getByText('Inner Light')).toBeVisible();
  });

  it('should respond to button clicks in theme zones', async () => {
    let darkClicked = false;
    let lightClicked = false;

    const testApp = await tsyneTest.createApp((a: App) => {
      a.window({ title: 'Theme Button Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          a.hbox(() => {
            a.themeoverride('dark', () => {
              a.button('Dark Click').onClick(() => {
                darkClicked = true;
              });
            });

            a.themeoverride('light', () => {
              a.button('Light Click').onClick(() => {
                lightClicked = true;
              });
            });
          });
        });
        win.show();
      });
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Click buttons
    await ctx.getByText('Dark Click').click();
    expect(darkClicked).toBe(true);

    await ctx.getByText('Light Click').click();
    expect(lightClicked).toBe(true);
  });
});
