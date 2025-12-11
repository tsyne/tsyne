// Test for TextGrid widget / Terminal Emulator example
import { TsyneTest, TestContext } from '../core/src/index-test';
import { TextGrid } from '../core/src/index';
import * as path from 'path';

describe('TextGrid Widget', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should create and display a TextGrid', async () => {
    let textGrid: TextGrid;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'TextGrid Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('TextGrid Widget Test');
            textGrid = app.textgrid({
              text: 'Hello, TextGrid!\nLine 2\nLine 3',
              showLineNumbers: false,
              showWhitespace: false,
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the label is visible
    await ctx.expect(ctx.getByExactText('TextGrid Widget Test')).toBeVisible();

    // Verify we can get text from the TextGrid
    const text = await textGrid!.getText();
    expect(text).toContain('Hello, TextGrid!');
    expect(text).toContain('Line 2');
    expect(text).toContain('Line 3');
  });

  test('should support setText and getText', async () => {
    let textGrid: TextGrid;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'TextGrid setText Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            textGrid = app.textgrid('Initial text');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify initial text
    let text = await textGrid!.getText();
    expect(text).toBe('Initial text');

    // Update text
    await textGrid!.setText('Updated text content\nWith multiple lines');
    text = await textGrid!.getText();
    expect(text).toContain('Updated text content');
    expect(text).toContain('With multiple lines');
  });

  test('should support setRow with styling', async () => {
    let textGrid: TextGrid;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'TextGrid Row Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            textGrid = app.textgrid({
              text: 'Row 0\nRow 1\nRow 2\nRow 3',
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Update row with style
    await textGrid!.setRow(1, 'Styled Row', { fgColor: 'red', bold: true });

    // Verify the text was updated
    const text = await textGrid!.getText();
    expect(text).toContain('Styled Row');
  });

  test('should support cell-level operations', async () => {
    let textGrid: TextGrid;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'TextGrid Cell Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            textGrid = app.textgrid({
              text: 'ABCD\nEFGH\nIJKL',
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Set individual cell with character and style
    await textGrid!.setCell(0, 0, 'X', { fgColor: 'green' });

    // The character at position (0,0) should now be 'X'
    const text = await textGrid!.getText();
    expect(text.charAt(0)).toBe('X');
  });

  test('should support style ranges', async () => {
    let textGrid: TextGrid;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'TextGrid Style Range Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            textGrid = app.textgrid({
              text: 'Line 1: Some text\nLine 2: More text\nLine 3: Even more',
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Apply style to a range
    await textGrid!.setStyleRange(0, 0, 1, 5, {
      fgColor: 'blue',
      bgColor: 'yellow',
      bold: true
    });

    // Test passes if no errors - visual verification needed for colors
    const text = await textGrid!.getText();
    expect(text).toContain('Line 1');
  });

  test('should support append and clear operations', async () => {
    let textGrid: TextGrid;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'TextGrid Append/Clear Test', width: 600, height: 400 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            textGrid = app.textgrid('Initial');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Test append
    await textGrid!.append(' Appended');
    let text = await textGrid!.getText();
    expect(text).toBe('Initial Appended');

    // Test clear
    await textGrid!.clear();
    text = await textGrid!.getText();
    expect(text).toBe('');
  });

  test('should display terminal emulator demo', async () => {
    let textGrid: TextGrid;

    const testApp = await tsyneTest.createApp((app) => {
      app.window({ title: 'Terminal Demo', width: 800, height: 500 }, (win) => {
        win.setContent(() => {
          app.vbox(() => {
            app.label('Terminal Emulator Demo');
            app.separator();
            app.scroll(() => {
              textGrid = app.textgrid({
                text: '╔══════════════════════════════════════╗\n' +
                      '║  Welcome to Tsyne Terminal           ║\n' +
                      '║                                      ║\n' +
                      '║  Type "help" for commands            ║\n' +
                      '╚══════════════════════════════════════╝\n' +
                      '\n$ ',
                showLineNumbers: false,
              });
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify the title is visible
    await ctx.expect(ctx.getByExactText('Terminal Emulator Demo')).toBeVisible();

    // Apply terminal styling
    await textGrid!.setRow(0, '╔══════════════════════════════════════╗', { fgColor: 'cyan' });
    await textGrid!.setRow(1, '║  Welcome to Tsyne Terminal           ║', { fgColor: 'green', bold: true });

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'terminal-emulator.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });
});
