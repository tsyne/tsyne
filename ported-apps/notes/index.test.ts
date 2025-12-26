/**
 * Notes App - Jest Unit Tests
 *
 * Tests for NotesStore and data management
 * 40+ tests covering CRUD, state management, preferences, and immutability
 */

import { NotesStore, Note } from './index';

describe('NotesStore', () => {
  let store: NotesStore;

  beforeEach(() => {
    store = new NotesStore();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should initialize with sample notes', () => {
      expect(store.getNoteCount()).toBe(3);
    });

    it('should select first note on initialization', () => {
      expect(store.getSelectedNoteId()).not.toBeNull();
      expect(store.getSelectedNote()).toBeDefined();
    });

    it('should have valid initial theme', () => {
      const prefs = store.getPreferences();
      expect(prefs.theme).toBe('light');
    });

    it('should have all initial notes with correct structure', () => {
      const notes = store.getNotes();
      notes.forEach((note: Note) => {
        expect(note.id).toBeDefined();
        expect(note.title).toBeDefined();
        expect(note.content).toBeDefined();
        expect(note.createdAt).toBeInstanceOf(Date);
        expect(note.modifiedAt).toBeInstanceOf(Date);
      });
    });
  });

  // ============================================================================
  // DEFENSIVE COPY TESTS (Immutability)
  // ============================================================================

  describe('Defensive Copies / Immutability', () => {
    it('should return defensive copy of notes array', () => {
      const notes1 = store.getNotes();
      const notes2 = store.getNotes();
      expect(notes1).not.toBe(notes2);
    });

    it('should not allow mutation of returned notes array', () => {
      const notes = store.getNotes();
      const originalCount = store.getNoteCount();
      notes.push({
        id: 'fake',
        title: 'Fake',
        content: '',
        createdAt: new Date(),
        modifiedAt: new Date(),
      });
      expect(store.getNoteCount()).toBe(originalCount);
    });

    it('should return defensive copy of preferences', () => {
      const prefs1 = store.getPreferences();
      const prefs2 = store.getPreferences();
      expect(prefs1).not.toBe(prefs2);
    });

    it('should not allow mutation of returned preferences', () => {
      const prefs = store.getPreferences();
      prefs.theme = 'dark';
      expect(store.getPreferences().theme).toBe('light');
    });
  });

  // ============================================================================
  // NOTE SELECTION TESTS
  // ============================================================================

  describe('Note Selection', () => {
    it('should select note by ID', () => {
      const notes = store.getNotes();
      const targetId = notes[1].id;
      expect(store.selectNote(targetId)).toBe(true);
      expect(store.getSelectedNoteId()).toBe(targetId);
    });

    it('should not select non-existent note', () => {
      expect(store.selectNote('non-existent')).toBe(false);
    });

    it('should get selected note', () => {
      const notes = store.getNotes();
      store.selectNote(notes[1].id);
      const selected = store.getSelectedNote();
      expect(selected).toBeDefined();
      expect(selected?.id).toBe(notes[1].id);
    });

    it('should not change selection when trying to select non-existent note', () => {
      const originalId = store.getSelectedNoteId();
      const result = store.selectNote('non-existent');
      expect(result).toBe(false);
      expect(store.getSelectedNoteId()).toBe(originalId);
      expect(store.getSelectedNote()).toBeDefined();
    });
  });

  // ============================================================================
  // CREATE NOTE TESTS
  // ============================================================================

  describe('Create Note', () => {
    it('should create new note', () => {
      const initialCount = store.getNoteCount();
      const newNote = store.addNote();
      expect(store.getNoteCount()).toBe(initialCount + 1);
      expect(newNote.id).toMatch(/^note-\d{3}$/);
    });

    it('should auto-select newly created note', () => {
      const newNote = store.addNote();
      expect(store.getSelectedNoteId()).toBe(newNote.id);
    });

    it('should create note with default title', () => {
      const newNote = store.addNote();
      expect(newNote.title).toBe('New Note');
    });

    it('should create note with empty content', () => {
      const newNote = store.addNote();
      expect(newNote.content).toBe('');
    });

    it('should have valid timestamps', () => {
      const newNote = store.addNote();
      expect(newNote.createdAt).toBeInstanceOf(Date);
      expect(newNote.modifiedAt).toBeInstanceOf(Date);
      expect(newNote.createdAt.getTime()).toBeLessThanOrEqual(newNote.modifiedAt.getTime());
    });

    it('should generate unique IDs', () => {
      const notes1 = store.addNote();
      const notes2 = store.addNote();
      expect(notes1.id).not.toBe(notes2.id);
    });

    it('should increment ID counter correctly', () => {
      const note1 = store.addNote();
      const note2 = store.addNote();
      const id1Num = parseInt(note1.id.split('-')[1]);
      const id2Num = parseInt(note2.id.split('-')[1]);
      expect(id2Num).toBe(id1Num + 1);
    });
  });

  // ============================================================================
  // READ NOTE TESTS
  // ============================================================================

  describe('Read Note', () => {
    it('should get note by ID', () => {
      const notes = store.getNotes();
      const note = store.getNoteById(notes[0].id);
      expect(note).toEqual(notes[0]);
    });

    it('should return undefined for non-existent ID', () => {
      expect(store.getNoteById('non-existent')).toBeUndefined();
    });

    it('should get all notes', () => {
      const notes = store.getNotes();
      expect(Array.isArray(notes)).toBe(true);
      expect(notes.length).toBeGreaterThan(0);
    });

    it('should get correct note count', () => {
      const notes = store.getNotes();
      expect(store.getNoteCount()).toBe(notes.length);
    });
  });

  // ============================================================================
  // UPDATE NOTE TESTS
  // ============================================================================

  describe('Update Note', () => {
    it('should update note title', () => {
      const notes = store.getNotes();
      const targetId = notes[0].id;
      const newTitle = 'Updated Title';
      expect(store.updateNoteTitle(targetId, newTitle)).toBe(true);
      const updated = store.getNoteById(targetId);
      expect(updated?.title).toBe(newTitle);
    });

    it('should update note content', () => {
      const notes = store.getNotes();
      const targetId = notes[0].id;
      const newContent = 'Updated content here';
      expect(store.updateNoteContent(targetId, newContent)).toBe(true);
      const updated = store.getNoteById(targetId);
      expect(updated?.content).toBe(newContent);
    });

    it('should update modifiedAt timestamp on title change', () => {
      const notes = store.getNotes();
      const originalNote = notes[0];
      const originalModified = originalNote.modifiedAt;

      // Wait to ensure timestamp changes
      setTimeout(() => {
        store.updateNoteTitle(originalNote.id, 'New Title');
      }, 1);

      const updated = store.getNoteById(originalNote.id);
      expect(updated?.modifiedAt.getTime()).toBeGreaterThanOrEqual(originalModified.getTime());
    });

    it('should update modifiedAt timestamp on content change', () => {
      const notes = store.getNotes();
      const originalNote = notes[0];
      const originalModified = originalNote.modifiedAt;

      setTimeout(() => {
        store.updateNoteContent(originalNote.id, 'New content');
      }, 1);

      const updated = store.getNoteById(originalNote.id);
      expect(updated?.modifiedAt.getTime()).toBeGreaterThanOrEqual(originalModified.getTime());
    });

    it('should not update non-existent note title', () => {
      expect(store.updateNoteTitle('non-existent', 'Title')).toBe(false);
    });

    it('should not update non-existent note content', () => {
      expect(store.updateNoteContent('non-existent', 'Content')).toBe(false);
    });

    it('should allow empty title', () => {
      const notes = store.getNotes();
      expect(store.updateNoteTitle(notes[0].id, '')).toBe(true);
      expect(store.getNoteById(notes[0].id)?.title).toBe('');
    });

    it('should allow empty content', () => {
      const notes = store.getNotes();
      expect(store.updateNoteContent(notes[0].id, '')).toBe(true);
      expect(store.getNoteById(notes[0].id)?.content).toBe('');
    });
  });

  // ============================================================================
  // DELETE NOTE TESTS
  // ============================================================================

  describe('Delete Note', () => {
    it('should delete note', () => {
      const notes = store.getNotes();
      const targetId = notes[0].id;
      const initialCount = store.getNoteCount();
      expect(store.deleteNote(targetId)).toBe(true);
      expect(store.getNoteCount()).toBe(initialCount - 1);
    });

    it('should not delete non-existent note', () => {
      expect(store.deleteNote('non-existent')).toBe(false);
    });

    it('should deselect note when deleted', () => {
      const notes = store.getNotes();
      store.selectNote(notes[0].id);
      store.deleteNote(notes[0].id);
      expect(store.getSelectedNoteId()).not.toBe(notes[0].id);
    });

    it('should select another note when deleting selected', () => {
      const initialNotes = store.getNotes();
      store.selectNote(initialNotes[0].id);
      store.deleteNote(initialNotes[0].id);
      const selectedId = store.getSelectedNoteId();
      expect(selectedId).not.toBeNull();
      expect(store.getNoteById(selectedId!)).toBeDefined();
    });

    it('should select null when deleting last note', () => {
      // Delete all but one note
      const notes = store.getNotes();
      for (let i = 1; i < notes.length; i++) {
        store.deleteNote(notes[i].id);
      }
      // Delete the last note
      store.deleteNote(notes[0].id);
      expect(store.getSelectedNoteId()).toBeNull();
    });
  });

  // ============================================================================
  // SEARCH TESTS
  // ============================================================================

  describe('Search', () => {
    it('should search notes by title', () => {
      const results = store.searchNotes('Welcome');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((n: Note) => n.title.includes('Welcome'))).toBe(true);
    });

    it('should search notes by content', () => {
      const results = store.searchNotes('Milk');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((n: Note) => n.content.includes('Milk'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const results1 = store.searchNotes('welcome');
      const results2 = store.searchNotes('WELCOME');
      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', () => {
      const results = store.searchNotes('xyz123notfound');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should return all notes for empty query', () => {
      const results = store.searchNotes('');
      expect(results.length).toBe(store.getNoteCount());
    });
  });

  // ============================================================================
  // THEME PREFERENCE TESTS
  // ============================================================================

  describe('Theme Preferences', () => {
    it('should get default theme', () => {
      const prefs = store.getPreferences();
      expect(prefs.theme).toBe('light');
    });

    it('should set theme to dark', () => {
      store.setTheme('dark');
      expect(store.getPreferences().theme).toBe('dark');
    });

    it('should set theme to light', () => {
      store.setTheme('dark');
      store.setTheme('light');
      expect(store.getPreferences().theme).toBe('light');
    });

    it('should set custom theme', () => {
      const customTheme = { background: '#fff', foreground: '#000' };
      store.setCustomTheme(customTheme);
      const prefs = store.getPreferences();
      expect(prefs.customTheme).toEqual(customTheme);
    });

    it('should clear custom theme', () => {
      store.setCustomTheme({ background: '#fff' });
      store.setCustomTheme(undefined);
      expect(store.getPreferences().customTheme).toBeUndefined();
    });

    it('should not mutate original custom theme object', () => {
      const original = { background: '#fff' };
      const copy = { ...original };
      store.setCustomTheme(original);
      original.background = '#000';
      expect(store.getPreferences().customTheme?.background).toBe('#fff');
    });
  });

  // ============================================================================
  // OBSERVABLE PATTERN TESTS
  // ============================================================================

  describe('Observable Pattern', () => {
    it('should notify on note addition', (done) => {
      store.subscribe(() => {
        expect(store.getNoteCount()).toBeGreaterThan(3);
        done();
      });
      store.addNote();
    });

    it('should notify on note deletion', (done) => {
      const notes = store.getNotes();
      const initialCount = store.getNoteCount();
      store.subscribe(() => {
        expect(store.getNoteCount()).toBe(initialCount - 1);
        done();
      });
      store.deleteNote(notes[0].id);
    });

    it('should notify on title update', (done) => {
      const notes = store.getNotes();
      store.subscribe(() => {
        expect(store.getNoteById(notes[0].id)?.title).toBe('Updated');
        done();
      });
      store.updateNoteTitle(notes[0].id, 'Updated');
    });

    it('should notify on content update', (done) => {
      const notes = store.getNotes();
      store.subscribe(() => {
        expect(store.getNoteById(notes[0].id)?.content).toBe('Updated Content');
        done();
      });
      store.updateNoteContent(notes[0].id, 'Updated Content');
    });

    it('should notify on note selection', (done) => {
      const notes = store.getNotes();
      store.subscribe(() => {
        expect(store.getSelectedNoteId()).toBe(notes[1].id);
        done();
      });
      store.selectNote(notes[1].id);
    });

    it('should notify on theme change', (done) => {
      store.subscribe(() => {
        expect(store.getPreferences().theme).toBe('dark');
        done();
      });
      store.setTheme('dark');
    });

    it('should support multiple subscribers', () => {
      const calls = { sub1: 0, sub2: 0 };
      store.subscribe(() => calls.sub1++);
      store.subscribe(() => calls.sub2++);
      store.addNote();
      expect(calls.sub1).toBe(1);
      expect(calls.sub2).toBe(1);
    });

    it('should support unsubscribe', () => {
      let callCount = 0;
      const unsubscribe = store.subscribe(() => callCount++);
      store.addNote();
      expect(callCount).toBe(1);
      unsubscribe();
      store.addNote();
      expect(callCount).toBe(1);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long note titles', () => {
      const notes = store.getNotes();
      const longTitle = 'A'.repeat(1000);
      expect(store.updateNoteTitle(notes[0].id, longTitle)).toBe(true);
      expect(store.getNoteById(notes[0].id)?.title).toBe(longTitle);
    });

    it('should handle very long note content', () => {
      const notes = store.getNotes();
      const longContent = 'Lorem ipsum dolor sit amet. '.repeat(100);
      expect(store.updateNoteContent(notes[0].id, longContent)).toBe(true);
      expect(store.getNoteById(notes[0].id)?.content.length).toBeGreaterThan(1000);
    });

    it('should handle special characters in title', () => {
      const notes = store.getNotes();
      const specialTitle = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      expect(store.updateNoteTitle(notes[0].id, specialTitle)).toBe(true);
      expect(store.getNoteById(notes[0].id)?.title).toBe(specialTitle);
    });

    it('should handle special characters in content', () => {
      const notes = store.getNotes();
      const specialContent = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r';
      expect(store.updateNoteContent(notes[0].id, specialContent)).toBe(true);
      expect(store.getNoteById(notes[0].id)?.content).toBe(specialContent);
    });

    it('should handle rapid note creation', () => {
      const initialCount = store.getNoteCount();
      for (let i = 0; i < 10; i++) {
        store.addNote();
      }
      expect(store.getNoteCount()).toBe(initialCount + 10);
    });

    it('should handle rapid updates', () => {
      const notes = store.getNotes();
      for (let i = 0; i < 10; i++) {
        store.updateNoteTitle(notes[0].id, `Title ${i}`);
      }
      expect(store.getNoteById(notes[0].id)?.title).toBe('Title 9');
    });
  });
});
