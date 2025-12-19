/**
 * Notes App - Jest Unit Tests
 * Tests note CRUD operations, storage, and state management
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  modifiedAt: number;
}

class NotesTestHelper {
  private notes: Note[] = [];
  private selectedNoteId: string | null = null;

  createNote(): void {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      content: '',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    this.notes.unshift(newNote);
    this.selectedNoteId = newNote.id;
  }

  deleteNote(id: string): void {
    this.notes = this.notes.filter((n) => n.id !== id);
    if (this.selectedNoteId === id) {
      this.selectedNoteId = this.notes.length > 0 ? this.notes[0].id : null;
    }
  }

  updateNoteTitle(id: string, title: string): void {
    const note = this.notes.find((n) => n.id === id);
    if (note) {
      note.title = title;
      note.modifiedAt = Date.now();
    }
  }

  updateNoteContent(id: string, content: string): void {
    const note = this.notes.find((n) => n.id === id);
    if (note) {
      note.content = content;
      note.modifiedAt = Date.now();
    }
  }

  selectNote(id: string): void {
    if (this.notes.find((n) => n.id === id)) {
      this.selectedNoteId = id;
    }
  }

  getNotes(): ReadonlyArray<Note> {
    return [...this.notes];
  }

  getSelectedNote(): Note | null {
    if (!this.selectedNoteId) return null;
    return this.notes.find((n) => n.id === this.selectedNoteId) || null;
  }

  getNoteCount(): number {
    return this.notes.length;
  }

  getSelectedNoteId(): string | null {
    return this.selectedNoteId;
  }

  loadFromJson(json: string): void {
    try {
      this.notes = JSON.parse(json);
      if (this.notes.length > 0) {
        this.selectedNoteId = this.notes[0].id;
      }
    } catch {
      this.notes = [];
      this.selectedNoteId = null;
    }
  }

  saveToJson(): string {
    return JSON.stringify(this.notes);
  }

  formatDate(timestamp: number): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  getPreview(content: string): string {
    const firstLine = content.split('\n')[0] || '';
    const trimmed = firstLine.trim();
    if (!trimmed) return '(empty)';
    return trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed;
  }
}

describe('Notes App', () => {
  let helper: NotesTestHelper;

  beforeEach(() => {
    helper = new NotesTestHelper();
  });

  describe('Note creation', () => {
    test('should create a new note', () => {
      helper.createNote();
      expect(helper.getNoteCount()).toBe(1);
      const note = helper.getSelectedNote();
      expect(note).not.toBeNull();
      expect(note!.title).toBe('New Note');
      expect(note!.content).toBe('');
    });

    test('should set note ID with timestamp', () => {
      helper.createNote();
      const note = helper.getSelectedNote();
      expect(note!.id).toMatch(/^note-\d+$/);
    });

    test('should select newly created note', () => {
      helper.createNote();
      expect(helper.getSelectedNoteId()).not.toBeNull();
      expect(helper.getSelectedNoteId()).toBe(helper.getSelectedNote()!.id);
    });

    test('should place new note at top of list', () => {
      helper.createNote();
      const firstNoteId = helper.getNotes()[0].id;
      expect(firstNoteId).toBe(helper.getSelectedNoteId());
    });
  });

  describe('Note deletion', () => {
    test('should delete a note', () => {
      helper.createNote();
      const noteId = helper.getSelectedNote()!.id;
      helper.deleteNote(noteId);
      expect(helper.getNoteCount()).toBe(0);
    });

    test('should update selection when deleting selected note', () => {
      helper.createNote();
      const firstNoteId = helper.getSelectedNoteId();
      // Create delay to ensure different timestamps for note IDs
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Busy wait for 2ms to ensure different note ID
      }
      helper.createNote();
      const secondNoteId = helper.getSelectedNoteId();
      helper.deleteNote(secondNoteId!);
      expect(helper.getSelectedNoteId()).toBe(firstNoteId);
    });

    test('should clear selection when deleting last note', () => {
      helper.createNote();
      const noteId = helper.getSelectedNote()!.id;
      helper.deleteNote(noteId);
      expect(helper.getSelectedNoteId()).toBeNull();
    });
  });

  describe('Note updates', () => {
    test('should update note title', () => {
      helper.createNote();
      const note = helper.getSelectedNote()!;
      helper.updateNoteTitle(note.id, 'Updated Title');
      const updated = helper.getNotes().find((n) => n.id === note.id);
      expect(updated!.title).toBe('Updated Title');
    });

    test('should update note content', () => {
      helper.createNote();
      const note = helper.getSelectedNote()!;
      helper.updateNoteContent(note.id, 'Test content');
      const updated = helper.getNotes().find((n) => n.id === note.id);
      expect(updated!.content).toBe('Test content');
    });

    test('should update modifiedAt timestamp on title change', () => {
      helper.createNote();
      const note = helper.getSelectedNote()!;
      const originalTime = note.modifiedAt;
      helper.updateNoteTitle(note.id, 'New Title');
      const updated = helper.getNotes().find((n) => n.id === note.id);
      expect(updated!.modifiedAt).toBeGreaterThanOrEqual(originalTime);
    });

    test('should update modifiedAt timestamp on content change', () => {
      helper.createNote();
      const note = helper.getSelectedNote()!;
      const originalTime = note.modifiedAt;
      helper.updateNoteContent(note.id, 'New content');
      const updated = helper.getNotes().find((n) => n.id === note.id);
      expect(updated!.modifiedAt).toBeGreaterThanOrEqual(originalTime);
    });
  });

  describe('Note selection', () => {
    test('should select a note', () => {
      helper.createNote();
      const note1 = helper.getSelectedNote()!;
      helper.createNote();
      helper.selectNote(note1.id);
      expect(helper.getSelectedNoteId()).toBe(note1.id);
    });

    test('should not select non-existent note', () => {
      helper.createNote();
      const currentId = helper.getSelectedNoteId();
      helper.selectNote('non-existent-id');
      expect(helper.getSelectedNoteId()).toBe(currentId);
    });
  });

  describe('Date formatting', () => {
    test('should format very recent notes as "Just now"', () => {
      const now = Date.now();
      const formatted = helper.formatDate(now);
      expect(formatted).toBe('Just now');
    });

    test('should format notes from minutes ago', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const formatted = helper.formatDate(fiveMinutesAgo);
      expect(formatted).toMatch(/^\d+m ago$/);
    });

    test('should format notes from hours ago', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const formatted = helper.formatDate(twoHoursAgo);
      expect(formatted).toMatch(/^\d+h ago$/);
    });

    test('should format notes from days ago', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      const formatted = helper.formatDate(threeDaysAgo);
      expect(formatted).toMatch(/^\d+d ago$/);
    });
  });

  describe('Preview generation', () => {
    test('should generate preview from first line', () => {
      const content = 'First line\nSecond line';
      const preview = helper.getPreview(content);
      expect(preview).toBe('First line');
    });

    test('should truncate long first lines', () => {
      const longContent = 'a'.repeat(60);
      const preview = helper.getPreview(longContent);
      expect(preview.length).toBeLessThanOrEqual(53);
      expect(preview).toContain('...');
    });

    test('should show empty indicator for empty content', () => {
      const preview = helper.getPreview('');
      expect(preview).toBe('(empty)');
    });

    test('should show placeholder for whitespace-only content', () => {
      const preview = helper.getPreview('   \n   ');
      expect(preview).toBe('(empty)');
    });
  });

  describe('Persistence', () => {
    test('should serialize notes to JSON', () => {
      helper.createNote();
      helper.updateNoteTitle(helper.getSelectedNote()!.id, 'Test Note');
      const json = helper.saveToJson();
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Test Note');
    });

    test('should deserialize notes from JSON', () => {
      const noteData = JSON.stringify([
        {
          id: 'test-1',
          title: 'Loaded Note',
          content: 'Loaded content',
          createdAt: 1000,
          modifiedAt: 2000,
        },
      ]);
      helper.loadFromJson(noteData);
      expect(helper.getNoteCount()).toBe(1);
      const note = helper.getNotes()[0];
      expect(note.title).toBe('Loaded Note');
      expect(note.content).toBe('Loaded content');
    });

    test('should handle invalid JSON gracefully', () => {
      helper.loadFromJson('invalid json');
      expect(helper.getNoteCount()).toBe(0);
      expect(helper.getSelectedNoteId()).toBeNull();
    });

    test('should auto-select first note on load', () => {
      const noteData = JSON.stringify([
        { id: 'note-1', title: 'Note 1', content: '', createdAt: 1000, modifiedAt: 2000 },
      ]);
      helper.loadFromJson(noteData);
      expect(helper.getSelectedNoteId()).toBe('note-1');
    });
  });

  describe('Multiple notes', () => {
    test('should maintain multiple notes', () => {
      helper.createNote();
      helper.createNote();
      helper.createNote();
      expect(helper.getNoteCount()).toBe(3);
    });

    test('should preserve note data when adding new notes', () => {
      helper.createNote();
      const firstNoteId = helper.getSelectedNoteId()!;
      helper.updateNoteTitle(firstNoteId, 'First');
      // Add delay to ensure different note IDs
      const start = Date.now();
      while (Date.now() - start < 2) {
        // Busy wait
      }
      helper.createNote();
      const retrieved = helper.getNotes().find((n) => n.id === firstNoteId);
      expect(retrieved!.title).toBe('First');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty notes list', () => {
      expect(helper.getNoteCount()).toBe(0);
      expect(helper.getSelectedNote()).toBeNull();
    });

    test('should handle special characters in title', () => {
      helper.createNote();
      const note = helper.getSelectedNote()!;
      const specialTitle = 'Note with "quotes", \'apostrophes\', and <brackets>';
      helper.updateNoteTitle(note.id, specialTitle);
      const updated = helper.getNotes().find((n) => n.id === note.id);
      expect(updated!.title).toBe(specialTitle);
    });

    test('should handle multiline content', () => {
      helper.createNote();
      const note = helper.getSelectedNote()!;
      const multiline = 'Line 1\nLine 2\nLine 3';
      helper.updateNoteContent(note.id, multiline);
      const updated = helper.getNotes().find((n) => n.id === note.id);
      expect(updated!.content).toBe(multiline);
    });

    test('should handle very long content', () => {
      helper.createNote();
      const note = helper.getSelectedNote()!;
      const longContent = 'a'.repeat(10000);
      helper.updateNoteContent(note.id, longContent);
      const updated = helper.getNotes().find((n) => n.id === note.id);
      expect(updated!.content).toBe(longContent);
    });
  });
});
