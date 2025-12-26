/**
 * Notes App - Tsyne Port of FyneLabs Notes
 *
 * @tsyne-app:name Notes
 * @tsyne-app:icon document
 * @tsyne-app:category utilities
 * @tsyne-app:args (a: App) => void
 *
 * A simple notes application with:
 * - Note management (create, edit, delete)
 * - Persistent storage via preferences
 * - Hot-swappable themes (light, dark, custom)
 * - Dual-pane interface (notes list + editor)
 *
 * Ported from github.com/fynelabs/notes
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

export function buildNotesApp(a: any) {
  const store = new NotesStore();

  // Theme definitions
  const customLightTheme = {
    background: '#f5f5f5',
    foreground: '#333333',
    primary: '#2196F3',
    button: '#e8e8e8',
    hover: '#d0d0d0',
    focus: '#2196F3',
    selection: '#bbdefb',
  };

  const customDarkTheme = {
    background: '#1e1e1e',
    foreground: '#e0e0e0',
    primary: '#64B5F6',
    button: '#333333',
    hover: '#444444',
    focus: '#64B5F6',
    selection: '#1565c0',
  };

  // Apply initial theme
  const applyTheme = async () => {
    const prefs = store.getPreferences();
    if (prefs.customTheme) {
      await a.setCustomTheme(prefs.customTheme);
    } else {
      await a.setTheme(prefs.theme);
    }
  };

  let currentNote: any = null;
  let notesList: any = null;
  let titleEntry: any = null;
  let contentEntry: any = null;
  let statusLabel: any = null;
  let themeLabel: any = null;

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

    const prefs = store.getPreferences();
    if (themeLabel) {
      themeLabel.setText(`Theme: ${prefs.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}`);
    }

    // Update status
    if (statusLabel) {
      const noteCount = store.getNoteCount();
      statusLabel.setText(`${noteCount} note${noteCount !== 1 ? 's' : ''}`);
    }

    if (notesList) {
      await notesList.refresh();
    }
  };

  return a.window({ title: 'Notes', width: 900, height: 600 }, (win: any) => {
    win.setContent(() => {
      a.hbox(() => {
        // Left sidebar: notes list
        a.vbox(() => {
          a.label('📝 Notes').withBold().withId('notes-title');

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

          // Notes list
          notesList = a.vbox(() => {})
            .withId('notes-list')
            .bindTo({
              items: () => store.getNotes(),
              render: (note: Note) => {
                const isSelected = store.getSelectedNoteId() === note.id;
                return a.hbox(() => {
                  a.button(
                    () => note.title || '(untitled)',
                    async () => {
                      store.selectNote(note.id);
                      await updateUI();
                    }
                  )
                    .withId(`note-btn-${note.id}`)
                    .when(() => !isSelected);

                  a.label(
                    () => `📌 ${note.title || '(untitled)'}`
                  )
                    .withBold()
                    .withId(`note-label-${note.id}`)
                    .when(() => isSelected);
                });
              },
              trackBy: (note: Note) => note.id,
            });
        });

        // Right panel: editor
        a.vbox(() => {
          a.label('Editor').withBold().withId('editor-title');

          a.label('Title:').withId('title-label');
          titleEntry = a.entry()
            .withPlaceholder('Note title')
            .onChange(async (text: string) => {
              const selectedId = store.getSelectedNoteId();
              if (selectedId) {
                store.updateNoteTitle(selectedId, text);
              }
            })
            .withId('title-entry');

          a.label('Content:').withId('content-label');
          contentEntry = a.multilineentry()
            .withPlaceholder('Note content')
            .onChange(async (text: string) => {
              const selectedId = store.getSelectedNoteId();
              if (selectedId) {
                store.updateNoteContent(selectedId, text);
              }
            })
            .withId('content-entry');

          // Theme selector
          a.label('🎨 Theme').withBold().withId('theme-selector-label');
          themeLabel = a.label('Theme: ☀️ Light').withId('theme-label');

          a.hbox(() => {
            a.button(
              () => '☀️ Light',
              async () => {
                store.setTheme('light');
                await a.setTheme('light');
                await updateUI();
              }
            ).withId('light-theme-btn');

            a.button(
              () => '🌙 Dark',
              async () => {
                store.setTheme('dark');
                await a.setTheme('dark');
                await updateUI();
              }
            ).withId('dark-theme-btn');

            a.button(
              () => '🎨 Custom Light',
              async () => {
                store.setCustomTheme(customLightTheme);
                await a.setCustomTheme(customLightTheme);
                await updateUI();
              }
            ).withId('custom-light-btn');

            a.button(
              () => '🎨 Custom Dark',
              async () => {
                store.setCustomTheme(customDarkTheme);
                await a.setCustomTheme(customDarkTheme);
                await updateUI();
              }
            ).withId('custom-dark-btn');
          });

          // Status
          statusLabel = a.label('').withId('status-label');
        });
      });
    });

    win.show();
    win.centerOnScreen();

    // Initialize UI
    (async () => {
      await applyTheme();
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
  const { app, resolveTransport } = require('../core/src');
  app(resolveTransport(), { title: 'Notes' }, buildNotesApp);
}
