/**
 * Notes App
 *
 * A simple notes app for creating, editing, and deleting text notes.
 * Uses StorageService for persistence.
 *
 * @tsyne-app:name Notes
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder createNotesApp
 * @tsyne-app:args app,storage
 * @tsyne-app:count single
 */

import { app } from '../src';
import type { App } from '../src/app';
import type { Window } from '../src/window';
import type { Label } from '../src/widgets/display';
import type { MultiLineEntry } from '../src/widgets/inputs';
import { IStorageService, MockStorageService } from './services';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

const NOTES_KEY = 'notes-app-data';

/**
 * Notes UI class
 */
class NotesUI {
  private window: Window | null = null;
  private notes: Note[] = [];
  private selectedNoteId: string | null = null;
  private nextId = 1;
  private contentEntry: MultiLineEntry | null = null;

  constructor(
    private a: App,
    private storage: IStorageService
  ) {
    this.loadNotes();
  }

  private loadNotes(): void {
    const data = this.storage.get(NOTES_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.notes = parsed.notes || [];
        this.nextId = parsed.nextId || 1;
      } catch {
        this.notes = [];
      }
    }
  }

  private saveNotes(): void {
    this.storage.set(NOTES_KEY, JSON.stringify({
      notes: this.notes,
      nextId: this.nextId,
    }));
  }

  private refreshUI(): void {
    if (this.window) {
      this.window.setContent(() => this.buildUI(this.window!));
    }
  }

  private async createNote(): Promise<void> {
    await this.saveCurrentContent();
    const note: Note = {
      id: `note-${this.nextId++}`,
      title: 'New Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.notes.unshift(note);
    this.selectedNoteId = note.id;
    this.saveNotes();
    this.refreshUI();
  }

  private async saveCurrentContent(): Promise<void> {
    if (this.contentEntry && this.selectedNoteId) {
      const content = await this.contentEntry.getText();
      const note = this.notes.find(n => n.id === this.selectedNoteId);
      if (note && note.content !== content) {
        note.content = content;
        note.updatedAt = Date.now();
        this.saveNotes();
      }
    }
  }

  private async selectNote(noteId: string): Promise<void> {
    await this.saveCurrentContent();
    this.selectedNoteId = noteId;
    this.refreshUI();
  }

  private updateNoteTitle(noteId: string, title: string): void {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.title = title;
      note.updatedAt = Date.now();
      this.saveNotes();
    }
  }

  private async deleteNote(noteId: string): Promise<void> {
    if (!this.window) return;

    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    const confirmed = await this.window.showConfirm(
      'Delete Note',
      `Delete "${note.title}"?`
    );

    if (confirmed) {
      this.notes = this.notes.filter(n => n.id !== noteId);
      if (this.selectedNoteId === noteId) {
        this.selectedNoteId = this.notes[0]?.id || null;
      }
      this.saveNotes();
      this.refreshUI();
    }
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
    return firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine || 'No content';
  }

  buildUI(win: Window): void {
    this.window = win;

    const selectedNote = this.notes.find(n => n.id === this.selectedNoteId);

    this.a.hbox(() => {
      // Left panel - note list
      this.a.vbox(() => {
        this.a.hbox(() => {
          this.a.label('Notes');
          this.a.spacer();
          this.a.button('+').onClick(() => this.createNote()).withId('btn-new-note');
        });

        this.a.separator();

        this.a.scroll(() => {
          this.a.vbox(() => {
            if (this.notes.length === 0) {
              this.a.label('No notes yet');
              this.a.label('Tap + to create one');
            } else {
              this.notes.forEach((note, index) => {
                const isSelected = note.id === this.selectedNoteId;
                this.a.hbox(() => {
                  this.a.vbox(() => {
                    this.a.label(note.title || 'Untitled').withId(`note-${index}-title`);
                    this.a.label(this.getPreview(note.content)).withId(`note-${index}-preview`);
                    this.a.label(this.formatDate(note.updatedAt)).withId(`note-${index}-date`);
                  });
                });
                // Make the whole row clickable
                if (!isSelected) {
                  this.a.button('Open').onClick(() => this.selectNote(note.id)).withId(`note-${index}-open`);
                }
              });
            }
          });
        });
      });

      this.a.separator();

      // Right panel - editor
      this.a.vbox(() => {
        if (selectedNote) {
          this.a.hbox(() => {
            this.a.entry(selectedNote.title, (value) => {
              this.updateNoteTitle(selectedNote.id, value);
            }, 200).withId('note-title-entry');
            this.a.spacer();
            this.a.button('Delete').onClick(() => this.deleteNote(selectedNote.id)).withId('btn-delete-note');
          });

          this.a.separator();

          this.contentEntry = this.a.multilineentry().withId('note-content-entry');
          this.contentEntry.setText(selectedNote.content);
        } else {
          this.contentEntry = null;
          this.a.spacer();
          this.a.label('Select a note or create a new one');
          this.a.spacer();
        }
      });
    });
  }

  // Public methods for testing
  getNoteCount(): number {
    return this.notes.length;
  }

  getSelectedNote(): Note | null {
    return this.notes.find(n => n.id === this.selectedNoteId) || null;
  }

  getNotes(): Note[] {
    return [...this.notes];
  }
}

/**
 * Create the notes app
 * @param a - App instance
 * @param storage - Storage service for persistence
 */
export function createNotesApp(
  a: App,
  storage: IStorageService
): NotesUI {
  const ui = new NotesUI(a, storage);

  a.window({ title: 'Notes' }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Standalone execution
if (require.main === module) {
  app({ title: 'Notes' }, (a: App) => {
    const storage = new MockStorageService();
    createNotesApp(a, storage);
  });
}
