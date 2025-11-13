// Test for shopping-list example
import { TsyneTest, TestContext } from '../src/index-test';
import * as path from 'path';

interface ShoppingItem {
  id: number;
  text: string;
  checked: boolean;
}

describe('Shopping List Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial shopping items', async () => {
    let nextId = 1;
    const items: ShoppingItem[] = [
      { id: nextId++, text: 'Cheese', checked: false },
      { id: nextId++, text: 'Eggs', checked: false },
      { id: nextId++, text: 'Bread', checked: false },
    ];

    let listContainer: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Shopping List', width: 300, height: 400 }, (win) => {
        const renderList = () => {
          listContainer.removeAll();

          items.forEach((item) => {
            listContainer.add(() => {
              app.hbox(() => {
                const checkbox = app.checkbox(item.text, async (checked: boolean) => {
                  item.checked = checked;
                });
                (async () => {
                  await checkbox.setChecked(item.checked);
                })();

                app.button('Delete', async () => {
                  const index = items.findIndex(i => i.id === item.id);
                  if (index !== -1) {
                    items.splice(index, 1);
                    renderList();
                  }
                });
              });
            });
          });

          listContainer.refresh();
        };

        win.setContent(() => {
          app.vbox(() => {
            app.label('Shopping List');

            listContainer = app.scroll(() => {
              app.vbox(() => {
                // Items will be added here
              });
            });
          });
        });

        renderList();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check that items are displayed
    await ctx.expect(ctx.getByExactText('Cheese')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Eggs')).toBeVisible();
    await ctx.expect(ctx.getByExactText('Bread')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', '12-shopping-list.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should add new item to list', async () => {
    let nextId = 1;
    const items: ShoppingItem[] = [];
    let inputEntry: any;
    let listContainer: any;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Shopping List', width: 300, height: 400 }, (win) => {
        const renderList = () => {
          listContainer.removeAll();

          items.forEach((item) => {
            listContainer.add(() => {
              app.hbox(() => {
                app.checkbox(item.text, async (checked: boolean) => {
                  item.checked = checked;
                });
                app.button('Delete', () => {});
              });
            });
          });

          listContainer.refresh();
        };

        win.setContent(() => {
          app.vbox(() => {
            inputEntry = app.entry('Add to list here ...', async () => {
              const text = await inputEntry.getText();
              if (text && text.trim()) {
                items.push({ id: nextId++, text: text.trim(), checked: false });
                await inputEntry.setText('');
                renderList();
              }
            }, 250);

            listContainer = app.scroll(() => {
              app.vbox(() => {});
            });
          });
        });

        renderList();
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Add item
    await inputEntry.setText('Milk');
    await inputEntry.submit();
    await ctx.wait(100);

    // Item should be added
    await ctx.expect(ctx.getByExactText('Milk')).toBeVisible();
  });
});
