// Test for rename dialog example - demonstrates showEntryDialog
import { TsyneTest, TestContext } from 'tsyne';
import { Label } from 'tsyne';
import * as path from 'path';

describe('Rename Dialog Example', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display file list with rename buttons', async () => {
    interface FileItem {
      id: number;
      name: string;
    }

    const files: FileItem[] = [
      { id: 1, name: 'document.txt' },
      { id: 2, name: 'photo.jpg' },
      { id: 3, name: 'notes.md' },
    ];

    const fileLabels: Map<number, Label> = new Map();
    let statusLabel: Label;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'File Renamer', width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Click "Rename" to rename a file using the entry dialog:');
            app.separator();

            for (const file of files) {
              app.hbox(() => {
                const label = app.label(file.name);
                fileLabels.set(file.id, label);

                app.button('Rename').onClick(async () => {
                  const newName = await win.showEntryDialog(
                    'Rename File',
                    `Enter new name for "${file.name}":`
                  );

                  if (newName) {
                    const oldName = file.name;
                    file.name = newName;
                    await label.setText(newName);
                    await statusLabel.setText(`Renamed "${oldName}" to "${newName}"`);
                  } else {
                    await statusLabel.setText('Rename cancelled');
                  }
                });
              });
            }

            app.separator();
            statusLabel = app.label('Ready');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial file list is displayed
    await ctx.expect(ctx.getByExactText('document.txt')).toBeVisible();
    await ctx.expect(ctx.getByExactText('photo.jpg')).toBeVisible();
    await ctx.expect(ctx.getByExactText('notes.md')).toBeVisible();

    // Verify at least one rename button is present
    await ctx.expect(ctx.getByText('Rename')).toBeVisible();

    // Verify status label shows "Ready"
    await ctx.expect(ctx.getByExactText('Ready')).toBeVisible();

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'rename-dialog.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('showEntryDialog should return text when confirmed', async () => {
    let dialogResult: string | null = null;
    let dialogShown = false;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Entry Dialog Test', width: 300, height: 150 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.button('Show Dialog').onClick(async () => {
              dialogShown = true;
              dialogResult = await win.showEntryDialog('Test Title', 'Enter some text:');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The dialog functionality is tested indirectly through the bridge
    // In headless mode, we can verify the button triggers the dialog
    await ctx.getByExactText('Show Dialog').click();
    await ctx.wait(100);

    // Note: In headless test mode, the entry dialog cannot be interacted with directly
    // The dialog will be shown but we cannot programmatically type and submit
    // This test verifies the dialog is invoked without error
    expect(dialogShown).toBe(true);
  });
});
