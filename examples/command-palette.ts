/**
 * Command Palette Example
 *
 * Demonstrates using the Menu widget to create a searchable command palette.
 * Users can filter commands by typing in the search box.
 */

import { app, App, MenuItem } from '../core/src';

// All available commands
const allCommands: Array<{ label: string; action: string; category: string }> = [
  // File commands
  { label: 'New File', action: 'file:new', category: 'File' },
  { label: 'Open File...', action: 'file:open', category: 'File' },
  { label: 'Save', action: 'file:save', category: 'File' },
  { label: 'Save As...', action: 'file:saveAs', category: 'File' },
  { label: 'Close File', action: 'file:close', category: 'File' },

  // Edit commands
  { label: 'Undo', action: 'edit:undo', category: 'Edit' },
  { label: 'Redo', action: 'edit:redo', category: 'Edit' },
  { label: 'Cut', action: 'edit:cut', category: 'Edit' },
  { label: 'Copy', action: 'edit:copy', category: 'Edit' },
  { label: 'Paste', action: 'edit:paste', category: 'Edit' },
  { label: 'Select All', action: 'edit:selectAll', category: 'Edit' },
  { label: 'Find...', action: 'edit:find', category: 'Edit' },
  { label: 'Replace...', action: 'edit:replace', category: 'Edit' },

  // View commands
  { label: 'Toggle Sidebar', action: 'view:sidebar', category: 'View' },
  { label: 'Toggle Terminal', action: 'view:terminal', category: 'View' },
  { label: 'Toggle Full Screen', action: 'view:fullscreen', category: 'View' },
  { label: 'Zoom In', action: 'view:zoomIn', category: 'View' },
  { label: 'Zoom Out', action: 'view:zoomOut', category: 'View' },
  { label: 'Reset Zoom', action: 'view:zoomReset', category: 'View' },

  // Go commands
  { label: 'Go to Line...', action: 'go:line', category: 'Go' },
  { label: 'Go to File...', action: 'go:file', category: 'Go' },
  { label: 'Go to Symbol...', action: 'go:symbol', category: 'Go' },
  { label: 'Go to Definition', action: 'go:definition', category: 'Go' },
  { label: 'Go Back', action: 'go:back', category: 'Go' },
  { label: 'Go Forward', action: 'go:forward', category: 'Go' },

  // Run commands
  { label: 'Run Task...', action: 'run:task', category: 'Run' },
  { label: 'Run Debug', action: 'run:debug', category: 'Run' },
  { label: 'Run Tests', action: 'run:tests', category: 'Run' },
  { label: 'Stop', action: 'run:stop', category: 'Run' },

  // Help commands
  { label: 'Show Documentation', action: 'help:docs', category: 'Help' },
  { label: 'Show Keyboard Shortcuts', action: 'help:shortcuts', category: 'Help' },
  { label: 'About', action: 'help:about', category: 'Help' },
];

// Filter commands based on search query
function filterCommands(query: string): typeof allCommands {
  if (!query.trim()) {
    return allCommands;
  }

  const lowerQuery = query.toLowerCase();
  return allCommands.filter(
    cmd =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
  );
}

// Status label reference
let statusLabel: any;
let searchEntry: any;
let menuContainer: any;
let currentApp: App;

// Build menu items from filtered commands
function buildMenuItems(commands: typeof allCommands): MenuItem[] {
  const items: MenuItem[] = [];
  let currentCategory = '';

  for (const cmd of commands) {
    // Add category separator
    if (cmd.category !== currentCategory) {
      if (items.length > 0) {
        items.push({ label: '', onSelected: () => {}, isSeparator: true });
      }
      currentCategory = cmd.category;
    }

    items.push({
      label: `${cmd.label}`,
      onSelected: () => {
        statusLabel.setText(`Executed: ${cmd.action}`);
        console.log(`Command executed: ${cmd.action}`);
      },
    });
  }

  return items;
}

// Rebuild the menu based on search
function rebuildMenu(query: string) {
  const filtered = filterCommands(query);
  const menuItems = buildMenuItems(filtered);

  // Clear and rebuild the menu container
  menuContainer.removeAll();
  menuContainer.add(() => {
    currentApp.menu(menuItems);
  });
  menuContainer.refresh();
}

app({ title: 'Command Palette' }, (a) => {
  currentApp = a;

  a.window({ title: 'Command Palette Demo', width: 500, height: 600 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.label('Command Palette', undefined, 'center', undefined, { bold: true });
        a.label('Type to search commands, click to execute', undefined, 'center');
        a.separator();

        // Search box
        a.hbox(() => {
          a.label('Search: ');
          searchEntry = a.entry('Type to filter commands...', (text) => {
            rebuildMenu(text);
          }, 350);
        });

        a.separator();

        // Results count
        statusLabel = a.label(`${allCommands.length} commands available`);

        a.separator();

        // Scrollable menu container
        a.scroll(() => {
          menuContainer = a.vbox(() => {
            // Initial menu with all commands
            a.menu(buildMenuItems(allCommands));
          });
        });
      });
    });

    win.show();
    win.centerOnScreen();

    // Focus the search entry
    searchEntry.focus();
  });
});
