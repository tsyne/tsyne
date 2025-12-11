/**
 * Test for DocTabs (text-editor.ts example)
 */
import { TsyneTest, TestContext } from '../core/src/index-test';
import { App, DocTabs } from '../core/src';

describe('DocTabs - Text Editor Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial tabs', async () => {
    let docTabsRef: DocTabs;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'DocTabs Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          docTabsRef = app.doctabs([
            {
              title: 'Tab 1',
              builder: () => {
                app.vbox(() => {
                  app.label('Content for Tab 1');
                  app.button('Tab 1 Button');
                });
              }
            },
            {
              title: 'Tab 2',
              builder: () => {
                app.vbox(() => {
                  app.label('Content for Tab 2');
                });
              }
            }
          ]);
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Tab 1 content should be visible (first tab selected by default)
    await ctx.expect(ctx.getByExactText('Content for Tab 1')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Tab 1 Button')).toBeVisible();
  });

  test('should handle onClosed callback', async () => {
    let closedTabTitle = '';
    let closedTabIndex = -1;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'DocTabs Close Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.doctabs([
            {
              title: 'Closable Tab',
              builder: () => {
                app.label('This tab can be closed');
              }
            },
            {
              title: 'Another Tab',
              builder: () => {
                app.label('Another tab content');
              }
            }
          ], {
            onClosed: (tabIndex, tabTitle) => {
              closedTabIndex = tabIndex;
              closedTabTitle = tabTitle;
            }
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify tabs are visible
    await ctx.expect(ctx.getByExactText('This tab can be closed')).toBeVisible();
  });

  test('should support location option', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'DocTabs Location Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.doctabs([
            {
              title: 'Top Tab 1',
              builder: () => {
                app.label('Top location tabs');
              }
            },
            {
              title: 'Top Tab 2',
              builder: () => {
                app.label('Second tab');
              }
            }
          ], {
            location: 'top'
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByExactText('Top location tabs')).toBeVisible();
  });

  test('should track tab count correctly', async () => {
    let docTabsRef: DocTabs;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Tab Count Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          docTabsRef = app.doctabs([
            { title: 'Tab A', builder: () => app.label('A') },
            { title: 'Tab B', builder: () => app.label('B') },
            { title: 'Tab C', builder: () => app.label('C') }
          ]);
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify tab count
    expect(docTabsRef!.getTabCount()).toBe(3);
    expect(docTabsRef!.getTabTitles()).toEqual(['Tab A', 'Tab B', 'Tab C']);
  });

  test('should dynamically append tabs', async () => {
    let docTabsRef: DocTabs;
    let appRef: App;

    const testApp = await tsyneTest.createApp((app) => {
      appRef = app;
      app.window({ title: 'Append Tab Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            docTabsRef = app.doctabs([
              { title: 'Initial Tab', builder: () => app.label('Initial content') }
            ]);

            app.button('Add Tab').onClick(async () => {
              await docTabsRef.append('New Tab', () => {
                appRef.label('Dynamically added content');
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    expect(docTabsRef!.getTabCount()).toBe(1);
    await ctx.expect(ctx.getByExactText('Initial content')).toBeVisible();

    // Add a new tab
    await ctx.getByExactText('Add Tab').click();
    await ctx.wait(100);

    // Verify tab was added
    expect(docTabsRef!.getTabCount()).toBe(2);
    expect(docTabsRef!.getTabTitles()).toContain('New Tab');
  });

  test('should remove tabs by index', async () => {
    let docTabsRef: DocTabs;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Remove Tab Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            docTabsRef = app.doctabs([
              { title: 'Tab 1', builder: () => app.label('Content 1') },
              { title: 'Tab 2', builder: () => app.label('Content 2') },
              { title: 'Tab 3', builder: () => app.label('Content 3') }
            ]);

            app.button('Remove First').onClick(async () => {
              await docTabsRef.remove(0);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial state
    expect(docTabsRef!.getTabCount()).toBe(3);

    // Remove first tab
    await ctx.getByExactText('Remove First').click();
    await ctx.wait(100);

    // Verify tab was removed
    expect(docTabsRef!.getTabCount()).toBe(2);
    expect(docTabsRef!.getTabTitles()).toEqual(['Tab 2', 'Tab 3']);
  });

  test('should select tabs by index', async () => {
    let docTabsRef: DocTabs;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Select Tab Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            docTabsRef = app.doctabs([
              { title: 'Tab A', builder: () => app.label('Content A') },
              { title: 'Tab B', builder: () => app.label('Content B') },
              { title: 'Tab C', builder: () => app.label('Content C') }
            ]);

            app.button('Go to Tab C').onClick(async () => {
              await docTabsRef.select(2);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Tab A content should be visible initially
    await ctx.expect(ctx.getByExactText('Content A')).toBeVisible();

    // Select Tab C
    await ctx.getByExactText('Go to Tab C').click();
    await ctx.wait(100);

    // Tab C content should now be visible
    await ctx.expect(ctx.getByExactText('Content C')).toBeVisible();
  });
});
