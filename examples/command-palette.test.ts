/**
 * Test for Command Palette Example
 *
 * Tests the Menu widget used as a command palette.
 * Note: Fyne's widget.Menu is a composite widget - menu items are rendered
 * internally and not exposed as separate clickable widgets. These tests verify
 * the menu widget is created and the app structure is correct.
 */

import { TsyneTest } from '../core/src/index-test';
import { App, MenuItem, Menu } from '../core/src';

// All available commands (subset for testing)
const testCommands: Array<{ label: string; action: string; category: string }> = [
  { label: 'New File', action: 'file:new', category: 'File' },
  { label: 'Open File...', action: 'file:open', category: 'File' },
  { label: 'Save', action: 'file:save', category: 'File' },
  { label: 'Undo', action: 'edit:undo', category: 'Edit' },
  { label: 'Redo', action: 'edit:redo', category: 'Edit' },
  { label: 'Copy', action: 'edit:copy', category: 'Edit' },
  { label: 'Toggle Sidebar', action: 'view:sidebar', category: 'View' },
  { label: 'Go to Line...', action: 'go:line', category: 'Go' },
];

// Track executed commands
let executedCommands: string[] = [];

// Build menu items from commands
function buildMenuItems(commands: typeof testCommands): MenuItem[] {
  const items: MenuItem[] = [];
  let currentCategory = '';

  for (const cmd of commands) {
    if (cmd.category !== currentCategory) {
      if (items.length > 0) {
        items.push({ label: '', onSelected: () => {}, isSeparator: true });
      }
      currentCategory = cmd.category;
    }

    items.push({
      label: `${cmd.label}`,
      onSelected: () => {
        executedCommands.push(cmd.action);
      },
    });
  }

  return items;
}

// Filter commands
function filterCommands(query: string): typeof testCommands {
  if (!query.trim()) {
    return testCommands;
  }
  const lowerQuery = query.toLowerCase();
  return testCommands.filter(
    cmd =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
  );
}

// Track created menu for testing
let createdMenu: Menu | null = null;

// Create the test app
function createCommandPaletteApp(app: App) {
  let statusLabel: any;
  let searchEntry: any;
  let menuContainer: any;

  function rebuildMenu(query: string) {
    const filtered = filterCommands(query);
    const menuItems = buildMenuItems(filtered);
    menuContainer.removeAll();
    menuContainer.add(() => {
      createdMenu = app.menu(menuItems);
    });
    menuContainer.refresh();
    statusLabel.setText(`${filtered.length} commands found`);
  }

  app.window({ title: 'Command Palette Test', width: 500, height: 600 }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Command Palette Test', undefined, 'center', undefined, { bold: true });
        app.separator();

        app.hbox(() => {
          app.label('Search: ');
          searchEntry = app.entry('Type to filter...', (text) => {
            rebuildMenu(text);
          }, 300);
        });

        app.separator();
        statusLabel = app.label(`${testCommands.length} commands available`);
        app.separator();

        app.scroll(() => {
          menuContainer = app.vbox(() => {
            createdMenu = app.menu(buildMenuItems(testCommands));
          });
        });
      });
    });
    win.show();
  });
}

describe('Command Palette (Menu Widget)', () => {
  let tsyneTest: TsyneTest;

  beforeEach(async () => {
    executedCommands = [];
    createdMenu = null;
    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp((app) => {
      createCommandPaletteApp(app);
    });
    await testApp.run();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display command palette title', async () => {
    const ctx = tsyneTest.getContext();
    await ctx.expect(ctx.getByText('Command Palette Test')).toBeVisible();
  });

  test('should display status showing command count', async () => {
    const ctx = tsyneTest.getContext();
    await ctx.expect(ctx.getByText('8 commands available')).toBeVisible();
  });

  test('should create menu widget with correct items', async () => {
    // Verify the menu was created
    expect(createdMenu).not.toBeNull();
    expect(createdMenu!.id).toBeDefined();
    expect(createdMenu!.id).toMatch(/^_menu_/);  // Internal ID format: _type_random

    // Verify menu items are stored correctly
    const items = createdMenu!.getItems();
    expect(items.length).toBeGreaterThan(0);

    // Find the non-separator items
    const commandItems = items.filter(item => !item.isSeparator);
    expect(commandItems.length).toBe(8); // 8 test commands
  });

  test('should include all command labels in menu items', async () => {
    expect(createdMenu).not.toBeNull();
    const items = createdMenu!.getItems();
    const labels = items.filter(item => !item.isSeparator).map(item => item.label);

    expect(labels).toContain('New File');
    expect(labels).toContain('Save');
    expect(labels).toContain('Undo');
    expect(labels).toContain('Copy');
    expect(labels).toContain('Toggle Sidebar');
    expect(labels).toContain('Go to Line...');
  });

  test('should have search entry visible', async () => {
    const ctx = tsyneTest.getContext();
    await ctx.expect(ctx.getByText('Search:')).toBeVisible();
  });

  test('menu items should have onSelected callbacks', async () => {
    expect(createdMenu).not.toBeNull();
    const items = createdMenu!.getItems();
    const commandItems = items.filter(item => !item.isSeparator);

    // All command items should have onSelected callbacks
    for (const item of commandItems) {
      expect(typeof item.onSelected).toBe('function');
    }
  });

  test('onSelected callback should track command execution', async () => {
    expect(createdMenu).not.toBeNull();
    const items = createdMenu!.getItems();
    const newFileItem = items.find(item => item.label === 'New File');

    expect(newFileItem).toBeDefined();
    expect(executedCommands).toHaveLength(0);

    // Manually trigger the callback (since we can't click the menu item directly)
    newFileItem!.onSelected();

    expect(executedCommands).toContain('file:new');
  });
});
