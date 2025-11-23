/**
 * Comprehensive component tests for TsyneTest framework
 * Tests all Fyne containers and widgets in an elegant, terse manner
 */
import { TsyneTest, TestContext } from '../index-test';
import { App } from '../index';

describe('Container Components', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) await tsyneTest.cleanup();
  });

  describe('Layout Containers', () => {
    test('scroll - scrollable content', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Scroll Test' }, (win) => {
          win.setContent(() => {
            a.scroll(() => {
              a.vbox(() => {
                for (let i = 0; i < 20; i++) {
                  a.label(`Item ${i + 1}`);
                }
              });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Item 1')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Item 5')).toBeVisible();
    });

    test('grid - fixed column layout', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Grid Test' }, (win) => {
          win.setContent(() => {
            a.grid(3, () => {
              a.label('A1'); a.label('A2'); a.label('A3');
              a.label('B1'); a.label('B2'); a.label('B3');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('A1')).toBeVisible();
      await ctx.expect(ctx.getByExactText('B3')).toBeVisible();
    });

    test('center - centers content', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Center Test' }, (win) => {
          win.setContent(() => {
            a.center(() => {
              a.label('Centered Text');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Centered Text')).toBeVisible();
    });

    test('max - Z-layer stacking', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Max Test' }, (win) => {
          win.setContent(() => {
            a.max(() => {
              a.canvasRectangle({ width: 100, height: 100, fillColor: '#FF0000' });
              a.label('Overlay');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Overlay')).toBeVisible();
    });

    test('padded - adds padding', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Padded Test' }, (win) => {
          win.setContent(() => {
            a.padded(() => {
              a.label('Padded Content');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Padded Content')).toBeVisible();
    });

    test('border - edge layout', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Border Test' }, (win) => {
          win.setContent(() => {
            a.border({
              top: () => a.label('Header'),
              bottom: () => a.label('Footer'),
              left: () => a.label('Sidebar'),
              center: () => a.label('Main Content')
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Header')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Footer')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Main Content')).toBeVisible();
    });

    test('gridwrap - wrapping grid', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'GridWrap Test' }, (win) => {
          win.setContent(() => {
            a.gridwrap(100, 50, () => {
              a.button('Btn 1', () => {});
              a.button('Btn 2', () => {});
              a.button('Btn 3', () => {});
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Btn 1')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Btn 3')).toBeVisible();
    });

    test('clip - clips overflow', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Clip Test' }, (win) => {
          win.setContent(() => {
            a.clip(() => {
              a.label('Clipped Content');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Clipped Content')).toBeVisible();
    });

    test('adaptivegrid - responsive columns', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'AdaptiveGrid Test' }, (win) => {
          win.setContent(() => {
            a.adaptivegrid(2, () => {
              a.label('Col 1');
              a.label('Col 2');
              a.label('Col 3');
              a.label('Col 4');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Col 1')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Col 4')).toBeVisible();
    });

    test('hsplit - horizontal split panes', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'HSplit Test' }, (win) => {
          win.setContent(() => {
            a.hsplit(
              () => a.label('Left Pane'),
              () => a.label('Right Pane'),
              0.3
            );
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Left Pane')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Right Pane')).toBeVisible();
    });

    test('vsplit - vertical split panes', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'VSplit Test' }, (win) => {
          win.setContent(() => {
            a.vsplit(
              () => a.label('Top Pane'),
              () => a.label('Bottom Pane'),
              0.5
            );
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Top Pane')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Bottom Pane')).toBeVisible();
    });
  });

  describe('Tab Containers', () => {
    test('tabs - tabbed interface', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Tabs Test' }, (win) => {
          win.setContent(() => {
            a.tabs([
              { title: 'Tab 1', builder: () => a.label('Content 1') },
              { title: 'Tab 2', builder: () => a.label('Content 2') }
            ]);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Content 1')).toBeVisible();
    });

    test('tabs - with location', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Tabs Location Test' }, (win) => {
          win.setContent(() => {
            a.tabs([
              { title: 'Left Tab', builder: () => a.label('Left Content') }
            ], 'leading');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Left Content')).toBeVisible();
    });

    test('doctabs - closable tabs', async () => {
      let closedTab = '';
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'DocTabs Test' }, (win) => {
          win.setContent(() => {
            a.doctabs([
              { title: 'Doc 1', builder: () => a.label('Document 1') },
              { title: 'Doc 2', builder: () => a.label('Document 2') }
            ], {
              onClosed: (idx, title) => { closedTab = title; }
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Document 1')).toBeVisible();
    });

    test('accordion - collapsible sections', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Accordion Test' }, (win) => {
          win.setContent(() => {
            a.accordion([
              { title: 'Section 1', builder: () => a.label('Section 1 Content') },
              { title: 'Section 2', builder: () => a.label('Section 2 Content') }
            ]);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      // Accordion items exist in the widget tree
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'accordion')).toBe(true);
    });
  });

  describe('Card & Form Containers', () => {
    test('card - titled card container', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Card Test' }, (win) => {
          win.setContent(() => {
            a.card('My Card', 'Subtitle', () => {
              a.label('Card Content');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Card Content')).toBeVisible();
    });

    test('form - labeled form fields', async () => {
      let submitted = false;
      let nameEntry: any;

      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Form Test' }, (win) => {
          win.setContent(() => {
            a.vbox(() => {
              nameEntry = a.entry('Name');
              a.form([
                { label: 'Name', widget: nameEntry }
              ], () => { submitted = true; });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'form')).toBe(true);
    });
  });

  describe('Advanced Containers', () => {
    test('innerWindow - MDI window', async () => {
      let closed = false;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'InnerWindow Test' }, (win) => {
          win.setContent(() => {
            a.max(() => {
              a.canvasRectangle({ width: 400, height: 300, fillColor: '#EEEEEE' });
              a.innerWindow('Document 1', () => {
                a.label('Inner Content');
              }, () => { closed = true; });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Inner Content')).toBeVisible();
    });

    test('themeoverride - dark/light variant', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'ThemeOverride Test' }, (win) => {
          win.setContent(() => {
            a.hbox(() => {
              a.themeoverride('dark', () => {
                a.label('Dark Theme');
              });
              a.themeoverride('light', () => {
                a.label('Light Theme');
              });
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Dark Theme')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Light Theme')).toBeVisible();
    });

    test('navigation - stack-based nav', async () => {
      let nav: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Navigation Test' }, (win) => {
          win.setContent(() => {
            nav = a.navigation(() => {
              a.vbox(() => {
                a.label('Home Screen');
                a.button('Go to Details', () => {
                  nav.push(() => a.label('Details Screen'), 'Details');
                });
              });
            }, { title: 'Home' });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Home Screen')).toBeVisible();
    });
  });
});

describe('Display Widgets', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) await tsyneTest.cleanup();
  });

  describe('Icons', () => {
    test('icon - theme icon', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Icon Test' }, (win) => {
          win.setContent(() => {
            a.hbox(() => {
              a.icon('home');
              a.icon('settings');
              a.icon('search');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      const icons = widgets.filter((w: any) => w.type === 'icon');
      expect(icons.length).toBe(3);
    });

    test('fileicon - file type icon', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'FileIcon Test' }, (win) => {
          win.setContent(() => {
            a.hbox(() => {
              a.fileicon('document.pdf');
              a.fileicon('image.png');
              a.fileicon('folder');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'fileicon')).toBe(true);
    });
  });

  describe('Progress Indicators', () => {
    test('progressbar - determinate progress', async () => {
      let pb: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'ProgressBar Test' }, (win) => {
          win.setContent(() => {
            pb = a.progressbar(0.5);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'progressbar')).toBe(true);

      // Test programmatic updates
      await pb.setValue(0.75);
      const value = await pb.getValue();
      expect(value).toBe(0.75);
    });

    test('progressbarInfinite - indeterminate progress', async () => {
      let pbi: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'ProgressBarInfinite Test' }, (win) => {
          win.setContent(() => {
            pbi = a.progressbarInfinite();
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'progressbar')).toBe(true);

      // Test start/stop
      await pbi.start();
      expect(await pbi.isRunning()).toBe(true);
      await pbi.stop();
    });

    test('activity - loading spinner', async () => {
      let activity: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Activity Test' }, (win) => {
          win.setContent(() => {
            activity = a.activity();
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'activity')).toBe(true);

      // Test start/stop
      await activity.start();
      await activity.stop();
    });
  });

  describe('Text Widgets', () => {
    test('hyperlink - clickable URL', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Hyperlink Test' }, (win) => {
          win.setContent(() => {
            a.hyperlink('Visit Fyne', 'https://fyne.io');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByText('Visit Fyne')).toBeVisible();
    });

    test('separator - divider line', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Separator Test' }, (win) => {
          win.setContent(() => {
            a.vbox(() => {
              a.label('Above');
              a.separator();
              a.label('Below');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByExactText('Above')).toBeVisible();
      await ctx.expect(ctx.getByExactText('Below')).toBeVisible();
    });

    test('richtext - formatted text', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'RichText Test' }, (win) => {
          win.setContent(() => {
            a.richtext([
              { text: 'Normal ' },
              { text: 'Bold', bold: true },
              { text: ' ' },
              { text: 'Italic', italic: true },
              { text: ' ' },
              { text: 'Code', monospace: true }
            ]);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'richtext')).toBe(true);
    });

    test('textgrid - monospace text grid', async () => {
      let grid: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'TextGrid Test' }, (win) => {
          win.setContent(() => {
            grid = a.textgrid({ text: 'Hello\nWorld', showLineNumbers: true });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'textgrid')).toBe(true);

      // Test programmatic updates
      await grid.setText('Line 1\nLine 2\nLine 3');
      const text = await grid.getText();
      expect(text).toContain('Line 1');
    });
  });

  describe('Data Widgets', () => {
    test('toolbar - action bar', async () => {
      let clicked = '';
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Toolbar Test' }, (win) => {
          win.setContent(() => {
            a.vbox(() => {
              a.toolbar([
                a.toolbarAction('New', () => { clicked = 'new'; }),
                { type: 'separator' },
                a.toolbarAction('Open', () => { clicked = 'open'; }),
                { type: 'spacer' },
                a.toolbarAction('Help', () => { clicked = 'help'; })
              ]);
              a.label('Content');
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'toolbar')).toBe(true);
    });

    test('table - data table', async () => {
      let table: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Table Test' }, (win) => {
          win.setContent(() => {
            table = a.table(
              ['Name', 'Age', 'City'],
              [
                ['Alice', '30', 'NYC'],
                ['Bob', '25', 'LA'],
                ['Charlie', '35', 'Chicago']
              ]
            );
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'table')).toBe(true);

      // Test data retrieval
      const data = await ctx.getTableData(table.id);
      expect(data.length).toBe(3);
    });

    test('list - selectable list', async () => {
      let selected = '';
      let list: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'List Test' }, (win) => {
          win.setContent(() => {
            list = a.list(['Item A', 'Item B', 'Item C'], (idx, item) => {
              selected = item;
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'list')).toBe(true);

      // Test data retrieval
      const data = await ctx.getListData(list.id);
      expect(data).toContain('Item A');
    });

    test('tree - hierarchical tree', async () => {
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Tree Test' }, (win) => {
          win.setContent(() => {
            a.tree('Root Node');
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'tree')).toBe(true);
    });

    test('menu - standalone menu', async () => {
      let selected = '';
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Menu Test' }, (win) => {
          win.setContent(() => {
            a.menu([
              { label: 'Copy', onSelected: () => { selected = 'copy'; } },
              { label: 'Paste', onSelected: () => { selected = 'paste'; } },
              { isSeparator: true, label: '', onSelected: () => {} },
              { label: 'Delete', onSelected: () => { selected = 'delete'; } }
            ]);
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'menu')).toBe(true);
    });
  });
});

describe('Input Widgets', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) await tsyneTest.cleanup();
  });

  describe('Selection Widgets', () => {
    test('select - dropdown', async () => {
      let selected = '';
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Select Test' }, (win) => {
          win.setContent(() => {
            a.select(['Option A', 'Option B', 'Option C'], (value) => {
              selected = value;
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'select')).toBe(true);
    });

    test('selectentry - combo box', async () => {
      let value = '';
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'SelectEntry Test' }, (win) => {
          win.setContent(() => {
            a.selectentry(
              ['Red', 'Green', 'Blue'],
              'Choose or type...',
              (text) => { value = text; }
            );
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'selectentry')).toBe(true);
    });

    test('radiogroup - radio buttons', async () => {
      let selected = '';
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'RadioGroup Test' }, (win) => {
          win.setContent(() => {
            a.radiogroup(['Small', 'Medium', 'Large'], 'Medium', (value) => {
              selected = value;
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByText('Medium')).toBeVisible();
    });

    test('checkgroup - checkbox group', async () => {
      let selected: string[] = [];
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'CheckGroup Test' }, (win) => {
          win.setContent(() => {
            a.checkgroup(
              ['Feature A', 'Feature B', 'Feature C'],
              ['Feature A'],
              (values) => { selected = values; }
            );
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      await ctx.expect(ctx.getByText('Feature A')).toBeVisible();
      await ctx.expect(ctx.getByText('Feature B')).toBeVisible();
    });
  });

  describe('Date/Time Widgets', () => {
    test('dateentry - date input', async () => {
      let selectedDate = '';
      let dateEntry: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'DateEntry Test' }, (win) => {
          win.setContent(() => {
            dateEntry = a.dateentry('2024-01-15', (date) => {
              selectedDate = date;
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'dateentry')).toBe(true);

      // Test programmatic date setting
      await dateEntry.setDate('2024-06-01');
      const date = await dateEntry.getDate();
      expect(date).toBe('2024-06-01');
    });

    test('calendar - inline calendar', async () => {
      let selectedDate = '';
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Calendar Test' }, (win) => {
          win.setContent(() => {
            a.calendar('2024-03-20', (date) => {
              selectedDate = date;
            });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'calendar')).toBe(true);
    });
  });

  describe('Range Widgets', () => {
    test('slider - range slider', async () => {
      let value = 0;
      let slider: any;
      tsyneTest = new TsyneTest({ headed: false });
      await tsyneTest.createApp((a) => {
        a.window({ title: 'Slider Test' }, (win) => {
          win.setContent(() => {
            slider = a.slider(0, 100, 50, (v) => { value = v; });
          });
          win.show();
        });
      });

      ctx = tsyneTest.getContext();
      const widgets = await ctx.getAllWidgets();
      expect(widgets.some((w: any) => w.type === 'slider')).toBe(true);

      // Test programmatic value setting
      await slider.setValue(75);
      const newValue = await slider.getValue();
      expect(newValue).toBe(75);
    });
  });
});

describe('Fluent Test API', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) await tsyneTest.cleanup();
  });

  test('within() - retry finding element', async () => {
    let label: any;
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Within Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            label = a.label('Initial');
            a.button('Update', async () => {
              await label.setText('Updated');
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Use within() to retry finding the element
    await ctx.getByExactText('Initial').within(2000).shouldBe('Initial');
  });

  test('shouldBe/shouldContain - text assertions', async () => {
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Assertions Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Hello World').withId('greeting');
            a.label('Status: OK').withId('status');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    await ctx.getByID('greeting').shouldBe('Hello World');
    await ctx.getByID('status').shouldContain('OK');
  });

  test('shouldBeVisible/shouldExist - visibility assertions', async () => {
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Visibility Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.label('Visible Label');
            a.button('Click Me', () => {});
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    await ctx.getByExactText('Visible Label').shouldBeVisible();
    await ctx.getByText('Click Me').shouldExist();
  });

  test('waitForCondition - custom condition polling', async () => {
    let counter = 0;
    let label: any;

    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Condition Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            label = a.label('Count: 0').withId('counter');
            a.button('Increment', async () => {
              counter++;
              await label.setText(`Count: ${counter}`);
            });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Click multiple times
    await ctx.getByText('Increment').click();
    await ctx.getByText('Increment').click();
    await ctx.getByText('Increment').click();

    // Wait for condition
    await ctx.waitForCondition(async () => {
      const text = await ctx.getByID('counter').getText();
      return text === 'Count: 3';
    }, { timeout: 2000, description: 'counter to reach 3' });
  });
});

describe('Widget Methods', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  afterEach(async () => {
    if (tsyneTest) await tsyneTest.cleanup();
  });

  test('withId() - custom ID for testing', async () => {
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'WithId Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            a.button('Submit', () => {}).withId('submit-btn');
            a.label('Result').withId('result-label');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    // Find by custom ID
    await ctx.expect(ctx.getByID('submit-btn')).toBeVisible();
    await ctx.expect(ctx.getByID('result-label')).toBeVisible();
  });

  test('hide()/show() - visibility control', async () => {
    let label: any;
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Visibility Control Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            label = a.label('Toggle Me').withId('toggle-label');
            a.button('Hide', async () => { await label.hide(); });
            a.button('Show', async () => { await label.show(); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    await ctx.expect(ctx.getByID('toggle-label')).toBeVisible();

    // Hide the label
    await ctx.getByExactText('Hide').click();
    await ctx.wait(100);

    // Show the label
    await ctx.getByExactText('Show').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByID('toggle-label')).toBeVisible();
  });

  test('setText()/getText() - label updates', async () => {
    let label: any;
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Label Update Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            label = a.label('Original').withId('dynamic-label');
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    await ctx.getByID('dynamic-label').shouldBe('Original');

    await label.setText('Modified');
    await ctx.getByID('dynamic-label').shouldBe('Modified');
  });

  test('disable()/enable() - widget state', async () => {
    let entry: any;
    tsyneTest = new TsyneTest({ headed: false });
    await tsyneTest.createApp((a) => {
      a.window({ title: 'Enable/Disable Test' }, (win) => {
        win.setContent(() => {
          a.vbox(() => {
            entry = a.entry('Type here').withId('input-field');
            a.button('Disable', async () => { await entry.disable(); });
            a.button('Enable', async () => { await entry.enable(); });
          });
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();

    await ctx.expect(ctx.getByID('input-field')).toBeVisible();

    // Disable and check
    await ctx.getByExactText('Disable').click();
    await ctx.wait(100);
    await ctx.getByID('input-field').shouldBeDisabled();

    // Enable and check
    await ctx.getByExactText('Enable').click();
    await ctx.wait(100);
    await ctx.getByID('input-field').shouldBeEnabled();
  });
});
