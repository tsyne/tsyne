/**
 * Notes App - Simple note-taking application
 *
 * A straightforward note-taking app for creating, editing, and deleting text notes.
 * All notes are stored using app preferences for persistence.
 *
 * Portions copyright original team and portions copyright Paul Hammant 2025
 * License: MIT
 *
 * @tsyne-app:name Notes
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor"/></svg>
 * @tsyne-app:category Utilities
 * @tsyne-app:builder buildNotesApp
 * @tsyne-app:args app,win
 * @tsyne-app:count single
 */

import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  modifiedAt: number;
}

interface NotesState {
  notes: Note[];
  selectedNoteId: string | null;
}

/**
 * Notes Application UI
 */
class NotesUI {
  private window: Window | null = null;
  private state: NotesState = {
    notes: [],
    selectedNoteId: null,
  };

  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(private a: App) {
    this.loadNotes();
  }

  private loadNotes(): void {
    const notesJson = this.a.getPreference('notes_list', '[]');

    Promise.resolve(notesJson).then((json: string) => {
      try {
        this.state.notes = JSON.parse(json);
        if (this.state.notes.length > 0) {
          this.state.selectedNoteId = this.state.notes[0].id;
        }
      } catch {
        this.state.notes = [];
        this.state.selectedNoteId = null;
      }
    });
  }

  private saveNotes(): void {
    // Debounce saves to prevent excessive writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.a.setPreference('notes_list', JSON.stringify(this.state.notes));
    }, 500);
  }

  private createNote(): void {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      content: '',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    this.state.notes.unshift(newNote);
    this.state.selectedNoteId = newNote.id;
    this.saveNotes();
    this.refreshUI();
  }

  private deleteNote(id: string): void {
    this.state.notes = this.state.notes.filter((n) => n.id !== id);

    if (this.state.selectedNoteId === id) {
      this.state.selectedNoteId = this.state.notes.length > 0 ? this.state.notes[0].id : null;
    }

    this.saveNotes();
    this.refreshUI();
  }

  private updateNoteTitle(id: string, title: string): void {
    const note = this.state.notes.find((n) => n.id === id);
    if (note) {
      note.title = title;
      note.modifiedAt = Date.now();
      this.saveNotes();
    }
  }

  private updateNoteContent(id: string, content: string): void {
    const note = this.state.notes.find((n) => n.id === id);
    if (note) {
      note.content = content;
      note.modifiedAt = Date.now();
      this.saveNotes();
    }
  }

  private selectNote(id: string): void {
    this.state.selectedNoteId = id;
    this.refreshUI();
  }

  private getSelectedNote(): Note | null {
    if (!this.state.selectedNoteId) {
      return null;
    }
    return this.state.notes.find((n) => n.id === this.state.selectedNoteId) || null;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private getPreview(content: string): string {
    const firstLine = content.split('\n')[0] || '';
    return firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine || '(empty)';
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  buildUI(win: Window): void {
    this.window = win;

    const selectedNote = this.getSelectedNote();

    this.a.hbox(() => {
      // Left panel - notes list
      this.a.vbox(() => {
        this.a.hbox(() => {
          this.a.label('Notes').withId('notesTitle');
          this.a.spacer();
          this.a
            .button('+ New')
            .onClick(() => this.createNote())
            .withId('notesAddBtn');
        });

        this.a.separator();

        this.a.scroll(() => {
          this.a.vbox(() => {
            if (this.state.notes.length === 0) {
              this.a.label('No notes yet').withId('notesEmpty');
            } else {
              for (const note of this.state.notes) {
                const isSelected = this.state.selectedNoteId === note.id;
                this.a.hbox(() => {
                  this.a.vbox(() => {
                    this.a
                      .label(note.title || '(Untitled)')
                      .withId(`notes-title-${note.id}`);
                    this.a
                      .label(this.getPreview(note.content))
                      .withId(`notes-preview-${note.id}`);
                    this.a
                      .label(this.formatDate(note.modifiedAt))
                      .withId(`notes-date-${note.id}`);
                  });

                  if (isSelected) {
                    this.a.label('✓').withId(`notes-selected-${note.id}`);
                  }
                });
              }
            }
          });
        });
      });

      this.a.separator();

      // Right panel - editor
      this.a.vbox(() => {
        if (selectedNote) {
          this.a.hbox(() => {
            this.a
              .entry('Title')
              .setValue(selectedNote.title)
              .onChange((value: string) => {
                this.updateNoteTitle(selectedNote.id, value);
              })
              .withId(`notes-title-edit-${selectedNote.id}`);

            this.a.spacer();

            this.a
              .button('Delete')
              .onClick(() => this.deleteNote(selectedNote.id))
              .withId(`notes-delete-${selectedNote.id}`);
          });

          this.a.separator();

          this.a
            .richTextEntry('Content')
            .setValue(selectedNote.content)
            .onChange((value: string) => {
              this.updateNoteContent(selectedNote.id, value);
            })
            .withId(`notes-content-${selectedNote.id}`);
        } else {
          this.a.spacer();
          this.a.label('Select a note or create a new one').withId('notesEditorEmpty');
          this.a.spacer();
        }
      });
    });
  }

  // Public methods for testing
  getNotes(): ReadonlyArray<Note> {
    return [...this.state.notes];
  }

  getSelectedNoteId(): string | null {
    return this.state.selectedNoteId;
  }

  cleanup(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
}

/**
 * Create the Notes app
 */
export function buildNotesApp(a: App, win: Window): NotesUI {
  const ui = new NotesUI(a);

  win.setContent(() => {
    ui.buildUI(win);
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  const { app } = require('./index');
  app({ title: 'Notes', width: 600, height: 800 }, (a: App) => {
    a.window({ title: 'Notes', width: 600, height: 800 }, (win: Window) => {
      buildNotesApp(a, win);
    });
  });
}
