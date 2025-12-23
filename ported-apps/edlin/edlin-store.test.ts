/**
 * Jest unit tests for EdlinStore
 */

import { EdlinStore, DocumentStore, createEdlinStore } from './edlin-store';

describe('DocumentStore', () => {
  let doc: DocumentStore;

  beforeEach(() => {
    doc = new DocumentStore('test-doc', 'Test', 'Hello World', null);
  });

  describe('basic operations', () => {
    it('should create a document with initial values', () => {
      expect(doc.getId()).toBe('test-doc');
      expect(doc.getTitle()).toBe('Test');
      expect(doc.getContent()).toBe('Hello World');
      expect(doc.getFilePath()).toBeNull();
      expect(doc.isDirty()).toBe(false);
    });

    it('should get lines from content', () => {
      doc.setContent('Line 1\nLine 2\nLine 3', false);
      expect(doc.getLines()).toEqual(['Line 1', 'Line 2', 'Line 3']);
      expect(doc.getLineCount()).toBe(3);
    });

    it('should update title', () => {
      doc.setTitle('New Title');
      expect(doc.getTitle()).toBe('New Title');
    });

    it('should update file path', () => {
      doc.setFilePath('/path/to/file.txt');
      expect(doc.getFilePath()).toBe('/path/to/file.txt');
    });

    it('should mark document as dirty when content changes', () => {
      doc.setContent('New content');
      expect(doc.isDirty()).toBe(true);
    });

    it('should mark document clean', () => {
      doc.setContent('New content');
      expect(doc.isDirty()).toBe(true);
      doc.markClean();
      expect(doc.isDirty()).toBe(false);
    });
  });

  describe('undo/redo', () => {
    it('should support undo', () => {
      const original = doc.getContent();
      doc.setContent('Changed');
      expect(doc.getContent()).toBe('Changed');
      expect(doc.canUndo()).toBe(true);

      doc.undo();
      expect(doc.getContent()).toBe(original);
      expect(doc.canUndo()).toBe(false);
    });

    it('should support redo', () => {
      const original = doc.getContent();
      doc.setContent('Changed');
      doc.undo();
      expect(doc.getContent()).toBe(original);
      expect(doc.canRedo()).toBe(true);

      doc.redo();
      expect(doc.getContent()).toBe('Changed');
      expect(doc.canRedo()).toBe(false);
    });

    it('should clear redo stack on new change', () => {
      doc.setContent('Change 1');
      doc.undo();
      expect(doc.canRedo()).toBe(true);

      doc.setContent('Change 2');
      expect(doc.canRedo()).toBe(false);
    });

    it('should handle multiple undo/redo', () => {
      doc.setContent('Change 1');
      doc.setContent('Change 2');
      doc.setContent('Change 3');

      expect(doc.getContent()).toBe('Change 3');
      doc.undo();
      expect(doc.getContent()).toBe('Change 2');
      doc.undo();
      expect(doc.getContent()).toBe('Change 1');
      doc.undo();
      expect(doc.getContent()).toBe('Hello World');

      doc.redo();
      expect(doc.getContent()).toBe('Change 1');
      doc.redo();
      expect(doc.getContent()).toBe('Change 2');
    });
  });

  describe('change listeners', () => {
    it('should notify listeners on changes', () => {
      const listener = jest.fn();
      doc.subscribe(listener);

      doc.setContent('New content');
      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = doc.subscribe(listener);

      doc.setContent('Change 1');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      doc.setContent('Change 2');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

describe('EdlinStore', () => {
  let store: EdlinStore;

  beforeEach(() => {
    store = createEdlinStore();
  });

  describe('document management', () => {
    it('should create documents', () => {
      const doc = store.createDocument('Test', 'Content');
      expect(doc.getTitle()).toBe('Test');
      expect(doc.getContent()).toBe('Content');
      expect(store.getDocumentCount()).toBe(1);
    });

    it('should set created document as active', () => {
      const doc = store.createDocument('Test');
      expect(store.getActiveDocument()).toBe(doc);
      expect(store.getActiveDocumentId()).toBe(doc.getId());
    });

    it('should ensure unique titles', () => {
      const doc1 = store.createDocument('Test');
      const doc2 = store.createDocument('Test');
      expect(doc1.getTitle()).toBe('Test');
      expect(doc2.getTitle()).toBe('Test(1)');
    });

    it('should close documents', () => {
      const doc = store.createDocument('Test');
      expect(store.getDocumentCount()).toBe(1);

      store.closeDocument(doc.getId());
      expect(store.getDocumentCount()).toBe(0);
      expect(store.getActiveDocument()).toBeUndefined();
    });

    it('should get all documents', () => {
      store.createDocument('Doc 1');
      store.createDocument('Doc 2');
      store.createDocument('Doc 3');

      const docs = store.getAllDocuments();
      expect(docs.length).toBe(3);
    });

    it('should find document by title', () => {
      store.createDocument('Find Me', 'Content');
      const found = store.findDocumentByTitle('Find Me');
      expect(found).toBeDefined();
      expect(found?.getContent()).toBe('Content');
    });

    it('should find document by path', () => {
      const doc = store.createDocument('Test', 'Content', '/path/to/file.txt');
      const found = store.findDocumentByPath('/path/to/file.txt');
      expect(found).toBe(doc);
    });
  });

  describe('active document', () => {
    it('should switch active document', () => {
      const doc1 = store.createDocument('Doc 1');
      const doc2 = store.createDocument('Doc 2');
      expect(store.getActiveDocument()).toBe(doc2);

      store.setActiveDocument(doc1.getId());
      expect(store.getActiveDocument()).toBe(doc1);
    });

    it('should update active on close', () => {
      const doc1 = store.createDocument('Doc 1');
      const doc2 = store.createDocument('Doc 2');
      store.setActiveDocument(doc2.getId());

      store.closeDocument(doc2.getId());
      expect(store.getActiveDocument()).toBe(doc1);
    });
  });

  describe('clipboard', () => {
    it('should store and retrieve clipboard content', () => {
      store.setClipboard('Copied text');
      expect(store.getClipboard()).toBe('Copied text');
    });
  });

  describe('search', () => {
    it('should find text in document', () => {
      const doc = store.createDocument('Test', 'Hello World\nHello Again\nGoodbye');
      const results = store.search('Hello');

      expect(results.length).toBe(2);
      expect(results[0].lineIndex).toBe(0);
      expect(results[0].startCol).toBe(0);
      expect(results[1].lineIndex).toBe(1);
    });

    it('should support case-insensitive search', () => {
      store.createDocument('Test', 'Hello World\nhello again');

      const caseSensitive = store.search('Hello', false);
      expect(caseSensitive.length).toBe(1);

      const caseInsensitive = store.search('Hello', true);
      expect(caseInsensitive.length).toBe(2);
    });

    it('should find multiple matches on same line', () => {
      store.createDocument('Test', 'ab ab ab');
      const results = store.search('ab');
      expect(results.length).toBe(3);
      expect(results[0].startCol).toBe(0);
      expect(results[1].startCol).toBe(3);
      expect(results[2].startCol).toBe(6);
    });

    it('should return empty array when not found', () => {
      store.createDocument('Test', 'Hello World');
      const results = store.search('xyz');
      expect(results.length).toBe(0);
    });
  });

  describe('replace', () => {
    it('should replace all occurrences', () => {
      const doc = store.createDocument('Test', 'Hello World, Hello Again');
      const count = store.replace('Hello', 'Hi');

      expect(count).toBe(2);
      expect(doc.getContent()).toBe('Hi World, Hi Again');
    });

    it('should support case-insensitive replace', () => {
      const doc = store.createDocument('Test', 'Hello World, hello again');
      const count = store.replace('hello', 'Hi', true);

      expect(count).toBe(2);
      expect(doc.getContent()).toBe('Hi World, Hi again');
    });

    it('should replace one occurrence', () => {
      const doc = store.createDocument('Test', 'Hello World');
      const success = store.replaceOne('World', 'Universe', 0, 6);

      expect(success).toBe(true);
      expect(doc.getContent()).toBe('Hello Universe');
    });
  });

  describe('change listeners', () => {
    it('should notify on document creation', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.createDocument('Test');
      expect(listener).toHaveBeenCalled();
    });

    it('should notify on document close', () => {
      const doc = store.createDocument('Test');
      const listener = jest.fn();
      store.subscribe(listener);

      store.closeDocument(doc.getId());
      expect(listener).toHaveBeenCalled();
    });
  });
});
