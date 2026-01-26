// @tsyne-app:name Edlin
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder buildEdlinApp
// @tsyne-app:args app,windowWidth,windowHeight

/**
 * Edlin - A Line-Oriented Text Editor for Tsyne
 *
 * Ported from https://github.com/bshofner/edlin (Go/Fyne)
 * Original author: Bob Shofner
 * MIT License - https://opensource.org/license/mit/
 *
 * Features:
 * - Multi-tab document editing (DocTabs)
 * - File menu: New, Open, Save
 * - Edit menu: Undo, Redo, Cut, Copy, Paste, Select All
 * - Search/Replace with case-insensitive option
 * - Help dialogs with keyboard shortcuts
 * - Supports Unicode text including CJK characters
 *
 * TypeScript port uses Tsyne's MultilineEntry widget for text editing,
 * rather than the custom Go TextList widget.
 */

import { app } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import type { DocTabs, MultiLineEntry } from 'tsyne';
import { EdlinStore, DocumentStore, createEdlinStore } from './edlin-store';
import * as fs from 'fs';
import * as path from 'path';

// Help text
const HELP_FILE = `EDLIN Help:

FileMenu:

Open a new empty tab:       File > New
Open tab from a file:       File > Open
Save tab contents to a file: File > Save
`;

const HELP_EDIT = `EDLIN Help:

EditMenu:

Undo:                Ctrl+Z - Undo last change
Redo:                Ctrl+Y - Redo undone change
Cut:                 Ctrl+X - Cut selected text
Copy:                Ctrl+C - Copy selected text
Paste:               Ctrl+V - Paste from clipboard
Select All:          Ctrl+A - Select all text
`;

const HELP_SHORTCUTS = `EDLIN Help:

Shortcut Keys:

Ctrl+F or Ctrl+R:    Open Search/Replace dialog

Ctrl+Home:           Go to beginning of document
Ctrl+End:            Go to end of document
Page Down:           Scroll down one page
Page Up:             Scroll up one page
`;

const HELP_SEARCH = `EDLIN Help:

Search / Replace:

1. Enter text to find in the Search field
2. Optionally check "Ignore Case"
3. Click "Find All" to highlight all matches
4. Use "Next" / "Previous" to navigate matches
5. Enter replacement text and click "Replace" or "Replace All"
`;

/**
 * Edlin Text Editor Application
 */
export class EdlinApp {
  private a: App;
  private win: Window | null = null;
  private store: EdlinStore;
  private tabs: DocTabs | null = null;
  private editors: Map<string, MultiLineEntry> = new Map();

  constructor(app: App, store?: EdlinStore) {
    this.a = app;
    this.store = store || createEdlinStore();
  }

  getStore(): EdlinStore {
    return this.store;
  }

  /**
   * Build the editor UI
   */
  build(): void {
    this.a.window({ title: 'EDLIN by Bob', width: 1000, height: 800 }, (win) => {
      this.win = win as Window;

      // Set up menus
      this.setupMenus();

      // Build content with initial document
      this.buildContent();

      // Show the window (required for tests)
      win.show();
    });
  }

  /**
   * Set up the application menus
   */
  private setupMenus(): void {
    if (!this.win) return;

    this.win.setMainMenu([
      {
        label: 'File',
        items: [
          { label: 'New', onSelected: () => this.newDocument() },
          { label: 'Open...', onSelected: () => this.openFile() },
          { label: 'Save...', onSelected: () => this.saveFile() },
          { label: '', isSeparator: true },
          { label: 'Close Tab', onSelected: () => this.closeCurrentTab() }
        ]
      },
      {
        label: 'Edit',
        items: [
          { label: 'Undo', onSelected: () => this.undo() },
          { label: 'Redo', onSelected: () => this.redo() },
          { label: '', isSeparator: true },
          { label: 'Find/Replace...', onSelected: () => this.showSearchDialog() }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'File Menu', onSelected: () => this.showHelp('File Menu', HELP_FILE) },
          { label: 'Edit Menu', onSelected: () => this.showHelp('Edit Menu', HELP_EDIT) },
          { label: 'Shortcuts', onSelected: () => this.showHelp('Shortcuts', HELP_SHORTCUTS) },
          { label: 'Search', onSelected: () => this.showHelp('Search / Replace', HELP_SEARCH) },
          { label: '', isSeparator: true },
          {
            label: 'About',
            onSelected: () => this.win?.showInfo('EDLIN by Bob', 'Version 1.0.0 - Tsyne Port\n\nBased on the original Go/Fyne app')
          }
        ]
      }
    ]);
  }

  /**
   * Build the main content area with initial document
   */
  buildContent(): void {
    // Create initial document
    const initialDoc = this.store.createDocument('New', 'Hello World\n\nStart typing here...');

    const buildUI = () => {
      this.tabs = this.a.doctabs([
        {
          title: initialDoc.getTitle(),
          builder: () => this.buildDocumentContent(initialDoc)
        }
      ], {
        onClosed: (tabIndex: number, tabTitle: string) => {
          const doc = this.store.findDocumentByTitle(tabTitle);
          if (doc) {
            this.store.closeDocument(doc.getId());
          }
        }
      });
    };

    if (this.win) {
      this.win.setContent(buildUI);
    } else {
      buildUI();
    }
  }

  /**
   * Build content for a document tab
   */
  private buildDocumentContent(doc: DocumentStore): void {
    // Border layout: file path at top, editor in center
    this.a.border({
      top: () => {
        this.a.vbox(() => {
          const pathLabel = this.a.label(doc.getFilePath() || '(new document)').withId(`path-${doc.getId()}`);
          this.a.separator();

          // Subscribe to document changes
          doc.subscribe(() => {
            const fp = doc.getFilePath();
            pathLabel.setText(fp ? fp : '(new document)');
          });
        });
      },
      center: () => {
        const editor = this.a.multilineentry('').withId(`editor-${doc.getId()}`);
        editor.setText(doc.getContent());
        this.editors.set(doc.getId(), editor);
      }
    });
  }

  /**
   * Create a new empty document
   */
  newDocument(): DocumentStore {
    const doc = this.store.createDocument('New', 'Hello World\n\nStart typing here...');

    // Add new tab
    if (this.tabs) {
      this.tabs.append(doc.getTitle(), () => this.buildDocumentContent(doc), true);
    }

    return doc;
  }

  /**
   * Open a file
   */
  async openFile(): Promise<void> {
    if (!this.win) return;

    const filePath = await this.win.showFileOpen();
    if (!filePath) return;

    // Check if already open
    const existing = this.store.findDocumentByPath(filePath);
    if (existing) {
      this.store.setActiveDocument(existing.getId());
      return;
    }

    // Read file content
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = path.basename(filePath);
      const doc = this.store.createDocument(title, content, filePath);
      doc.markClean();

      // Add new tab
      if (this.tabs) {
        this.tabs.append(doc.getTitle(), () => this.buildDocumentContent(doc), true);
      }
    } catch (err) {
      await this.win.showError('Error', `Failed to open file: ${err}`);
    }
  }

  /**
   * Save the current document
   */
  async saveFile(): Promise<void> {
    const doc = this.store.getActiveDocument();
    if (!doc) return;
    if (!this.win) return;

    // Get editor content
    const editor = this.editors.get(doc.getId());
    if (editor) {
      const content = await editor.getText();
      doc.setContent(content, false);
    }

    let filePath = doc.getFilePath();

    if (!filePath) {
      const result = await this.win.showFileSave(doc.getTitle() + '.txt');
      if (!result) return;
      filePath = result;
    }

    try {
      fs.writeFileSync(filePath, doc.getContent(), 'utf-8');
      doc.setFilePath(filePath);
      doc.setTitle(path.basename(filePath));
      doc.markClean();
    } catch (err) {
      await this.win.showError('Error', `Failed to save file: ${err}`);
    }
  }

  /**
   * Close the current tab
   */
  closeCurrentTab(): void {
    // DocTabs handles closing via onClosed callback
    const doc = this.store.getActiveDocument();
    if (doc && this.tabs) {
      const docs = this.store.getAllDocuments();
      const index = docs.findIndex(d => d.getId() === doc.getId());
      if (index >= 0) {
        this.tabs.remove(index);
        this.editors.delete(doc.getId());
        this.store.closeDocument(doc.getId());
      }
    }
  }

  // Edit operations
  undo(): void {
    const doc = this.store.getActiveDocument();
    if (doc) {
      doc.undo();
      // Update editor
      const editor = this.editors.get(doc.getId());
      if (editor) {
        editor.setText(doc.getContent());
      }
    }
  }

  redo(): void {
    const doc = this.store.getActiveDocument();
    if (doc) {
      doc.redo();
      // Update editor
      const editor = this.editors.get(doc.getId());
      if (editor) {
        editor.setText(doc.getContent());
      }
    }
  }

  /**
   * Show search/replace dialog
   */
  async showSearchDialog(): Promise<void> {
    if (!this.win) return;

    const doc = this.store.getActiveDocument();
    if (!doc) {
      await this.win.showInfo('Search', 'No document open');
      return;
    }

    // Sync editor content to store
    const editor = this.editors.get(doc.getId());
    if (editor) {
      const content = await editor.getText();
      doc.setContent(content, false);
    }

    const result = await this.win.showForm('Find / Replace', [
      { type: 'entry', label: 'Search', name: 'search' },
      { type: 'entry', label: 'Replace', name: 'replace' },
      { type: 'check', label: 'Ignore Case', name: 'ignoreCase' }
    ]);

    if (!result || !result.submitted) return;

    const searchText = (result.values?.search as string) || '';
    const replaceText = (result.values?.replace as string) || '';
    const ignoreCase = result.values?.ignoreCase as boolean;

    if (!searchText) return;

    if (replaceText) {
      // Replace all
      const count = this.store.replace(searchText, replaceText, ignoreCase);
      // Update editor
      if (editor) {
        editor.setText(doc.getContent());
      }
      await this.win.showInfo('Replace', `Replaced ${count} occurrence(s)`);
    } else {
      // Just search
      const results = this.store.search(searchText, ignoreCase);
      if (results.length === 0) {
        await this.win.showInfo('Search', `"${searchText}" not found`);
      } else {
        await this.win.showInfo('Search', `Found ${results.length} occurrence(s)`);
      }
    }
  }

  /**
   * Show help dialog
   */
  async showHelp(title: string, content: string): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo(title, content);
  }
}

/**
 * Build the Edlin app (for phonetop and other integrations)
 */
export function buildEdlinApp(a: App, windowWidth?: number, windowHeight?: number): void {
  const edlin = new EdlinApp(a);

  // Always create a window - PhoneTop intercepts this to create a StackPaneAdapter
  edlin.build();
}

/**
 * Create an EdlinApp instance (for testing)
 */
export function createEdlinApp(a: App, store?: EdlinStore): EdlinApp {
  return new EdlinApp(a, store);
}

// Export for imports
export { EdlinStore, DocumentStore, createEdlinStore };

// Standalone entry point
if (require.main === module) {
  app({ title: 'EDLIN' }, (a) => {
    buildEdlinApp(a);
  });
}
