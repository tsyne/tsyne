/**
 * TsyneTest Integration Tests for Scroll Container Height
 *
 * Tests that scroll container height can be programmed in various scenarios:
 * - Default height (content-determined)
 * - Fixed minimum height with withMinHeight()
 * - Fixed minimum size with withMinSize()
 * - Scroll in different container layouts (vbox, border, etc.)
 *
 * USAGE:
 * - Headless mode (default): npx jest scroll-height.test.ts
 * - Visual debugging mode: TSYNE_HEADED=1 npx jest scroll-height.test.ts
 */

import { TsyneTest, TestContext } from '../src/index-test';

describe('Scroll Container Height Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('scroll with many labels should have content-determined height by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Scroll Test', width: 300, height: 400 }, (win) => {
        win.setContent(() => {
          app.scroll(() => {
            app.vbox(() => {
              for (let i = 1; i <= 20; i++) {
                app.label(`Item ${i}`).withId(`item-${i}`);
              }
            });
          }).withId('test-scroll');
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Scroll should exist
    await ctx.getByID('test-scroll').shouldExist();

    // First and some middle items should exist
    await ctx.getByID('item-1').shouldExist();
    await ctx.getByID('item-10').shouldExist();
    await ctx.getByID('item-20').shouldExist();
  });

  test('scroll with withMinHeight should have specified minimum height', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Scroll MinHeight Test', width: 300, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Above scroll');

            app.scroll(() => {
              app.vbox(() => {
                for (let i = 1; i <= 5; i++) {
                  app.label(`Item ${i}`).withId(`item-${i}`);
                }
              });
            }).withMinHeight(150).withId('test-scroll');

            app.label('Below scroll');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get scroll info and verify height
    const scrollInfo = await ctx.getByID('test-scroll').getInfo();
    expect(scrollInfo.height).toBeGreaterThanOrEqual(150);
  });

  test('scroll with withMinSize should have specified minimum dimensions', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Scroll MinSize Test', width: 400, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Above scroll');

            app.scroll(() => {
              app.vbox(() => {
                for (let i = 1; i <= 5; i++) {
                  app.label(`Short item ${i}`).withId(`item-${i}`);
                }
              });
            }).withMinSize(200, 100).withId('test-scroll');

            app.label('Below scroll');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get scroll info and verify dimensions
    const scrollInfo = await ctx.getByID('test-scroll').getInfo();
    expect(scrollInfo.width).toBeGreaterThanOrEqual(200);
    expect(scrollInfo.height).toBeGreaterThanOrEqual(100);
  });

  test('scroll in border layout center should expand to fill', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Scroll Border Test', width: 300, height: 300 }, (win) => {
        win.setContent(() => {
          app.border({
            top: () => {
              app.label('Header').withId('header');
            },
            center: () => {
              app.scroll(() => {
                app.vbox(() => {
                  for (let i = 1; i <= 10; i++) {
                    app.label(`Item ${i}`).withId(`item-${i}`);
                  }
                });
              }).withId('test-scroll');
            },
            bottom: () => {
              app.label('Footer').withId('footer');
            }
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All elements should exist
    await ctx.getByID('header').shouldExist();
    await ctx.getByID('test-scroll').shouldExist();
    await ctx.getByID('footer').shouldExist();

    // Scroll should have significant height (filling center)
    const scrollInfo = await ctx.getByID('test-scroll').getInfo();
    expect(scrollInfo.height).toBeGreaterThan(100);
  });

  test('multiple scrolls with different heights in same container', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Multiple Scrolls Test', width: 300, height: 500 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('First scroll (100px):');
            app.scroll(() => {
              app.vbox(() => {
                for (let i = 1; i <= 10; i++) {
                  app.label(`Scroll1 Item ${i}`);
                }
              });
            }).withMinHeight(100).withId('scroll-1');

            app.separator();

            app.label('Second scroll (200px):');
            app.scroll(() => {
              app.vbox(() => {
                for (let i = 1; i <= 10; i++) {
                  app.label(`Scroll2 Item ${i}`);
                }
              });
            }).withMinHeight(200).withId('scroll-2');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Both scrolls should exist with different heights
    const scroll1Info = await ctx.getByID('scroll-1').getInfo();
    const scroll2Info = await ctx.getByID('scroll-2').getInfo();

    expect(scroll1Info.height).toBeGreaterThanOrEqual(100);
    expect(scroll2Info.height).toBeGreaterThanOrEqual(200);
    // Second scroll should be taller
    expect(scroll2Info.height).toBeGreaterThan(scroll1Info.height!);
  });

  test('scroll height should accommodate content when content is smaller than minHeight', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Small Content Test', width: 300, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            // Scroll with large minHeight but small content
            app.scroll(() => {
              app.vbox(() => {
                app.label('Only one item').withId('single-item');
              });
            }).withMinHeight(200).withId('test-scroll');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Single item should exist
    await ctx.getByID('single-item').shouldExist();

    // Scroll should still have the minimum height even with small content
    const scrollInfo = await ctx.getByID('test-scroll').getInfo();
    expect(scrollInfo.height).toBeGreaterThanOrEqual(200);
  });

  test('scroll in nested border/stack/vbox structure like daily-med-checklist', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Nested Scroll Test', width: 400, height: 500 }, (win) => {
        win.setContent(() => {
          // Mimics daily-med-checklist structure
          app.border({
            top: () => {
              app.vbox(() => {
                app.label('Header Title').withId('title');
                app.separator();
                app.label('Status: 3 items remaining').withId('status');
                app.separator();
              });
            },
            center: () => {
              app.stack(() => {
                // Checklist mode container - use border so scroll in center expands
                app.border({
                  center: () => {
                    app.scroll(() => {
                      app.vbox(() => {
                        app.checkbox('Morning pill').withId('item-1');
                        app.checkbox('Evening pill').withId('item-2');
                        app.checkbox('Vitamins').withId('item-3');
                      });
                    }).withId('test-scroll');
                  },
                  bottom: () => {
                    app.vbox(() => {
                      app.separator();
                      app.hbox(() => {
                        app.button('Reset All').withId('reset-btn');
                        app.spacer();
                        app.button('Edit List').withId('edit-btn');
                      });
                    });
                  }
                });
              });
            }
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot to see the problem
    if (process.env.TAKE_SCREENSHOTS === '1') {
      await tsyneTest.screenshot('/tmp/nested-scroll-test.png');
      console.log('Screenshot saved to /tmp/nested-scroll-test.png');
    }

    // All items should exist
    await ctx.getByID('item-1').shouldExist();
    await ctx.getByID('item-2').shouldExist();
    await ctx.getByID('item-3').shouldExist();

    // Get scroll dimensions
    const scrollInfo = await ctx.getByID('test-scroll').getInfo();
    console.log('Scroll info:', JSON.stringify(scrollInfo, null, 2));

    // The scroll should have significant height - filling most of the center area
    // Window is 500px tall, header is ~70px, buttons ~35px, so scroll should be ~350px+
    expect(scrollInfo.height).toBeGreaterThan(200);
  });
});
