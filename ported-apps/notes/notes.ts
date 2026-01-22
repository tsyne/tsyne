/**
 * Notes App - Tsyne Port
 *
 * @tsyne-app:name Notes
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder buildNotesApp
 * @tsyne-app:args app,windowWidth,windowHeight
 *
 * A simple notes application with:
 * - Note management (create, edit, delete)
 * - Persistent storage via preferences
 * - Hot-swappable themes (light, dark, custom)
 * - Dual-pane interface (notes list + editor)
 *
 * Ported from github.com/fynelabs/notes by Andy Williams
 * Portions copyright Andy Williams 2020-2023, portions copyright Paul Hammant 2025
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface NotesPreferences {
  theme: 'light' | 'dark';
  customTheme?: Record<string, string>;
}

// ============================================================================
// NOTES STORE (Observable)
// ============================================================================

type ChangeListener = () => void;

export class NotesStore {
  private notes: Note[] = [];
  private selectedNoteId: string | null = null;
  private preferences: NotesPreferences = {
    theme: 'light',
  };
  private changeListeners: ChangeListener[] = [];
  private nextNoteId = 1;

  constructor() {
    this.initializeNotes();
  }

  private initializeNotes() {
    // Initialize with sample notes
    this.notes = [
      {
        id: 'note-001',
        title: 'Welcome',
        content: 'Welcome to the Notes App!\n\nClick on a note to edit it, or create a new one.',
        createdAt: new Date(2025, 0, 1),
        modifiedAt: new Date(2025, 0, 1),
      },
      {
        id: 'note-002',
        title: 'Shopping List',
        content: '- Milk\n- Eggs\n- Bread\n- Butter\n- Cheese',
        createdAt: new Date(2025, 0, 5),
        modifiedAt: new Date(2025, 0, 10),
      },
      {
        id: 'note-003',
        title: 'Ideas',
        content: 'Project ideas:\n1. Build a todo app\n2. Create a note sync service\n3. Add rich text editing',
        createdAt: new Date(2025, 0, 8),
        modifiedAt: new Date(2025, 0, 15),
      },
    ];
    this.selectedNoteId = this.notes[0]?.id || null;
    this.nextNoteId = 4;
  }

  // Note Management
  getNotes(): Note[] {
    return [...this.notes];
  }

  getNoteCount(): number {
    return this.notes.length;
  }

  getSelectedNoteId(): string | null {
    return this.selectedNoteId;
  }

  getSelectedNote(): Note | undefined {
    if (!this.selectedNoteId) return undefined;
    return this.notes.find((n) => n.id === this.selectedNoteId);
  }

  getNoteById(id: string): Note | undefined {
    return this.notes.find((n) => n.id === id);
  }

  selectNote(id: string): boolean {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return false;
    this.selectedNoteId = id;
    this.notifyChange();
    return true;
  }

  addNote(): Note {
    const newNote: Note = {
      id: `note-${String(this.nextNoteId++).padStart(3, '0')}`,
      title: 'New Note',
      content: '',
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    this.notes.push(newNote);
    this.selectedNoteId = newNote.id;
    this.notifyChange();
    return newNote;
  }

  updateNoteTitle(id: string, title: string): boolean {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return false;
    note.title = title;
    note.modifiedAt = new Date();
    this.notifyChange();
    return true;
  }

  updateNoteContent(id: string, content: string): boolean {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return false;
    note.content = content;
    note.modifiedAt = new Date();
    this.notifyChange();
    return true;
  }

  deleteNote(id: string): boolean {
    const index = this.notes.findIndex((n) => n.id === id);
    if (index === -1) return false;
    this.notes.splice(index, 1);
    if (this.selectedNoteId === id) {
      this.selectedNoteId = this.notes[0]?.id || null;
    }
    this.notifyChange();
    return true;
  }

  searchNotes(query: string): Note[] {
    const lower = query.toLowerCase();
    return this.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(lower) ||
        n.content.toLowerCase().includes(lower)
    );
  }

  // Preferences
  getPreferences(): NotesPreferences {
    return { ...this.preferences };
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.preferences.theme = theme;
    this.notifyChange();
  }

  setCustomTheme(colors?: Record<string, string>): void {
    this.preferences.customTheme = colors ? { ...colors } : undefined;
    this.notifyChange();
  }

  // Observable Pattern
  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }
}

// ============================================================================
// UI BUILDER
// ============================================================================

export function buildNotesApp(a: any, windowWidth?: number, windowHeight?: number) {
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;
  const store = new NotesStore();
  const path = require('path');
  const fontPath = path.join(__dirname, 'GochiHand.ttf');

  // Sticky note theme definitions (matching original Fyne Notes)
  // All surfaces use the same yellow, buttons are semi-transparent white overlays
  const stickyNoteLight = {
    background: '#F0E99B',         // Yellow/tan sticky note
    inputBackground: '#F0E99B',    // Same yellow for inputs
    menuBackground: '#F0E99B',     // Same yellow for menus
    overlayBackground: '#F0E99B',  // Same yellow for overlays
    foreground: '#463A11',         // Brown text
    primary: '#ffffffAA',          // Semi-transparent white accent
    button: '#ffffffBB',           // More opaque white for button visibility
    hover: '#ffffffDD',            // Lighter on hover (shine effect)
    pressed: '#ffffff55',          // Darker when pressed (shadow effect)
    focus: '#ffffff99',            // Focus ring
    selection: '#ffffff66',        // Text selection
    separator: '#463A1133',        // Subtle brown separator
  };

  const stickyNoteDark = {
    background: '#372B09',         // Dark brown
    inputBackground: '#372B09',    // Same dark brown for inputs
    menuBackground: '#372B09',     // Same dark brown for menus
    overlayBackground: '#372B09',  // Same dark brown for overlays
    foreground: '#F0E99B',         // Yellow text
    primary: '#ffffffAA',          // Semi-transparent white accent
    button: '#ffffff44',           // More visible button on dark
    hover: '#ffffff66',            // Lighter on hover
    pressed: '#ffffff22',          // Darker when pressed
    focus: '#ffffff55',            // Focus ring
    selection: '#ffffff44',        // Text selection
    separator: '#F0E99B33',        // Subtle yellow separator
  };

  // Get current theme colors based on preference
  const getThemeColors = () => {
    const prefs = store.getPreferences();
    return prefs.theme === 'dark' ? stickyNoteDark : stickyNoteLight;
  };

  let notesList: any = null;
  let titleEntry: any = null;
  let contentEntry: any = null;
  let statusLabel: any = null;
  let winRef: any = null;

  // Update UI based on selected note
  const updateUI = async () => {
    const selectedNote = store.getSelectedNote();

    if (selectedNote) {
      if (titleEntry) titleEntry.setText(selectedNote.title);
      if (contentEntry) contentEntry.setText(selectedNote.content);
    } else {
      if (titleEntry) titleEntry.setText('');
      if (contentEntry) contentEntry.setText('');
    }

    // Update status
    if (statusLabel) {
      const noteCount = store.getNoteCount();
      statusLabel.setText(`${noteCount} note${noteCount !== 1 ? 's' : ''}`);
    }

    if (notesList) {
      notesList.update();
    }
  };

  // Build the themed content (called on initial load and theme change)
  const buildContent = () => {
    const themeColors = getThemeColors();

    // Wrap entire content in themeoverride with scoped custom colors
    a.themeoverride({
      colors: themeColors,
      fontPath: fontPath
    }, () => {
      // Max: expands children to fill available space
      // Background rectangle + content layered on top
      a.max(() => {
        // Solid background in theme color (covers the grey window background)
        a.rectangle(themeColors.background);

        // Horizontal split: left sidebar | right editor (both resize with window)
        a.hsplit(() => {
        // Left sidebar: notes list
        a.vbox(() => {
          a.label('Notes', undefined, undefined, undefined, { bold: true }).withId('notes-title');

          a.hbox(() => {
            a.button('+').onClick(async () => {
              store.addNote();
              await updateUI();
            }).withId('add-note-btn');

            a.button('-').onClick(async () => {
              const selectedId = store.getSelectedNoteId();
              if (selectedId && store.getNoteCount() > 1) {
                store.deleteNote(selectedId);
                await updateUI();
              }
            }).withId('delete-note-btn');
          });

          // Notes list with bindTo
          notesList = a.vbox(() => {}).withId('notes-list').bindTo({
            items: () => store.getNotes(),
            render: (note: Note) => {
              const isSelected = store.getSelectedNoteId() === note.id;
              a.hbox(() => {
                if (!isSelected) {
                  a.button(note.title || '(untitled)').onClick(async () => {
                    store.selectNote(note.id);
                    await updateUI();
                  }).withId(`note-btn-${note.id}`);
                } else {
                  a.label(`> ${note.title || '(untitled)'}`, undefined, undefined, undefined, { bold: true })
                    .withId(`note-label-${note.id}`);
                }
              });
            },
            trackBy: (note: Note) => note.id,
          });
        });
      }, () => {
        // Right panel: editor with border layout so content expands
        a.border({
          top: () => {
            a.vbox(() => {
              a.label('Title:').withId('title-label');
              // Entry: placeholder, onSubmit, minWidth, onDoubleClick, onChange
              titleEntry = a.entry('Note title', undefined, undefined, undefined, async (text: string) => {
                const selectedId = store.getSelectedNoteId();
                if (selectedId) {
                  store.updateNoteTitle(selectedId, text);
                }
              }).withId('title-entry');
            });
          },
          center: () => {
            // Content entry expands to fill available space
            contentEntry = a.multilineentry('Note content').withId('content-entry');
          },
          bottom: () => {
            a.vbox(() => {
              // Save button for content since multilineentry doesn't have onChange
              a.button('Save Content').onClick(async () => {
                const selectedId = store.getSelectedNoteId();
                if (selectedId && contentEntry) {
                  const text = await contentEntry.getText();
                  store.updateNoteContent(selectedId, text);
                }
              }).withId('save-content-btn');

              // Theme selector (sticky note light/dark) - rebuilds UI with new theme
              a.hbox(() => {
                a.button('Light').onClick(async () => {
                  store.setTheme('light');
                  // Rebuild content with new theme
                  if (winRef) {
                    winRef.setContent(buildContent);
                    await updateUI();
                  }
                }).withId('light-theme-btn');

                a.button('Dark').onClick(async () => {
                  store.setTheme('dark');
                  // Rebuild content with new theme
                  if (winRef) {
                    winRef.setContent(buildContent);
                    await updateUI();
                  }
                }).withId('dark-theme-btn');
              });

              // Status
              statusLabel = a.label('').withId('status-label');
            });
          }
        });
      }, 0.25);  // Split offset: sidebar takes ~25% width
      }); // close max
    }); // close themeoverride
  };

  if (isEmbedded) {
    buildContent();
    setTimeout(async () => {
      await updateUI();
    }, 0);
    store.subscribe(async () => {
      await updateUI();
    });
    return;
  }

  return a.window({ title: 'Notes', width: 900, height: 600 }, (win: any) => {
    winRef = win;
    win.setContent(buildContent);

    win.show();
    win.centerOnScreen();

    // Initialize UI
    (async () => {
      await updateUI();
    })();

    // Subscribe to store changes
    store.subscribe(async () => {
      await updateUI();
    });
  });
}

// ============================================================================
// STANDALONE EXECUTION
// ============================================================================

if (require.main === module) {
  const { app, resolveTransport } = require('../../core/src');
  app(resolveTransport(), { title: 'Notes' }, buildNotesApp);
}
