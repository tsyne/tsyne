/**
 * Unit tests for LitProg Store
 */

import { LitProgStore } from './store';

describe('LitProgStore', () => {
  describe('Source Management', () => {
    test('initializes with empty source', () => {
      const store = new LitProgStore();
      expect(store.getSource()).toBe('');
    });

    test('initializes with provided source', () => {
      const source = '# Test\n<<code>>=\nx\n@';
      const store = new LitProgStore(source);
      expect(store.getSource()).toBe(source);
    });

    test('setSource updates and reparses', () => {
      const store = new LitProgStore();
      store.setSource('<<chunk>>=\ncode\n@');
      expect(store.getChunkNames()).toContain('chunk');
    });

    test('tracks dirty state', () => {
      const store = new LitProgStore();
      expect(store.isDirty()).toBe(false);

      store.setSource('new content');
      expect(store.isDirty()).toBe(true);

      store.markSaved('/path/to/file.lit');
      expect(store.isDirty()).toBe(false);
      expect(store.getFilePath()).toBe('/path/to/file.lit');
    });
  });

  describe('Syntax Style', () => {
    test('defaults to auto syntax detection', () => {
      const store = new LitProgStore();
      expect(store.getSyntaxStyle()).toBe('auto');
    });

    test('allows setting syntax style', () => {
      const store = new LitProgStore();
      store.setSyntaxStyle('noweb');
      expect(store.getSyntaxStyle()).toBe('noweb');
    });

    test('reparses when syntax changes', () => {
      const store = new LitProgStore('<<chunk>>=\ncode\n@');
      expect(store.getChunkCount()).toBe(1);

      // Changing style should reparse
      store.setSyntaxStyle('markdown');
      // Noweb syntax won't be recognized as markdown, so chunks may change
      expect(store.getParsedDocument()).not.toBeNull();
    });
  });

  describe('Weave Format', () => {
    test('defaults to markdown format', () => {
      const store = new LitProgStore();
      expect(store.getWeaveFormat()).toBe('markdown');
    });

    test('allows setting weave format', () => {
      const store = new LitProgStore();
      store.setWeaveFormat('html');
      expect(store.getWeaveFormat()).toBe('html');

      store.setWeaveFormat('latex');
      expect(store.getWeaveFormat()).toBe('latex');
    });
  });

  describe('Chunk Navigation', () => {
    const multiChunkSource = `<<first>>=
code1
@

<<second>>=
code2
@

<<third>>=
code3
@
`;

    test('starts at first chunk', () => {
      const store = new LitProgStore(multiChunkSource);
      expect(store.getCurrentChunkIndex()).toBe(0);
      expect(store.getCurrentChunkName()).toBe('first');
    });

    test('navigates to next chunk', () => {
      const store = new LitProgStore(multiChunkSource);

      expect(store.nextChunk()).toBe(true);
      expect(store.getCurrentChunkIndex()).toBe(1);
      expect(store.getCurrentChunkName()).toBe('second');
    });

    test('navigates to previous chunk', () => {
      const store = new LitProgStore(multiChunkSource);
      store.nextChunk();
      store.nextChunk();

      expect(store.previousChunk()).toBe(true);
      expect(store.getCurrentChunkIndex()).toBe(1);
    });

    test('returns false at boundaries', () => {
      const store = new LitProgStore(multiChunkSource);

      // Can't go before first
      expect(store.previousChunk()).toBe(false);
      expect(store.getCurrentChunkIndex()).toBe(0);

      // Go to last
      store.nextChunk();
      store.nextChunk();

      // Can't go after last
      expect(store.nextChunk()).toBe(false);
      expect(store.getCurrentChunkIndex()).toBe(2);
    });

    test('jumps to chunk by index', () => {
      const store = new LitProgStore(multiChunkSource);

      expect(store.goToChunk(2)).toBe(true);
      expect(store.getCurrentChunkName()).toBe('third');

      expect(store.goToChunk(0)).toBe(true);
      expect(store.getCurrentChunkName()).toBe('first');
    });

    test('returns false for invalid index', () => {
      const store = new LitProgStore(multiChunkSource);

      expect(store.goToChunk(-1)).toBe(false);
      expect(store.goToChunk(10)).toBe(false);
    });

    test('jumps to chunk by name', () => {
      const store = new LitProgStore(multiChunkSource);

      expect(store.goToChunkByName('second')).toBe(true);
      expect(store.getCurrentChunkIndex()).toBe(1);

      expect(store.goToChunkByName('nonexistent')).toBe(false);
    });
  });

  describe('Chunk Access', () => {
    test('gets all chunk names', () => {
      const store = new LitProgStore(`<<a>>=\nx\n@\n<<b>>=\ny\n@`);
      const names = store.getChunkNames();

      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names).toHaveLength(2);
    });

    test('gets chunks by name', () => {
      const store = new LitProgStore(`<<test>>=\ncode here\n@`);
      const chunks = store.getChunks('test');

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toEqual(['code here']);
    });

    test('returns empty array for unknown chunk', () => {
      const store = new LitProgStore(`<<known>>=\nx\n@`);
      expect(store.getChunks('unknown')).toEqual([]);
    });

    test('gets current chunk', () => {
      const store = new LitProgStore(`<<current>>=\nmy code\n@`);
      const current = store.getCurrentChunk();

      expect(current).not.toBeNull();
      expect(current![0].content).toEqual(['my code']);
    });
  });

  describe('Documentation', () => {
    test('gets documentation sections', () => {
      const store = new LitProgStore(`# Title\n\nSome prose.\n\n<<code>>=\nx\n@`);
      const docs = store.getDocumentation();

      expect(docs.length).toBeGreaterThan(0);
      const heading = docs.find((d) => d.type === 'heading');
      expect(heading?.content).toBe('Title');
    });

    test('gets document title', () => {
      const store = new LitProgStore(`# My Document Title\n\n<<code>>=\nx\n@`);
      expect(store.getTitle()).toBe('My Document Title');
    });

    test('returns "Untitled" when no title', () => {
      const store = new LitProgStore(`<<code>>=\nx\n@`);
      expect(store.getTitle()).toBe('Untitled');
    });
  });

  describe('Tangle & Weave', () => {
    test('tangles document', () => {
      const store = new LitProgStore(`\`\`\`ts {#main .tangle=output.ts}
console.log('hello');
\`\`\``);
      store.setSyntaxStyle('markdown');

      const files = store.tangle();
      expect(files.has('output.ts')).toBe(true);
    });

    test('weaves document', () => {
      const store = new LitProgStore(`# Title\n\n<<code>>=\nx = 1\n@`);
      const output = store.weave();

      expect(output).toContain('Title');
      expect(output).toContain('x = 1');
    });

    test('gets tangled preview', () => {
      const store = new LitProgStore(`\`\`\`ts {#a .tangle=file.ts}
code
\`\`\``);
      store.setSyntaxStyle('markdown');

      const preview = store.getTangledPreview();
      expect(preview).toContain('file.ts');
      expect(preview).toContain('code');
    });

    test('respects weave format setting', () => {
      const store = new LitProgStore(`# Title\n\n<<code>>=\nx\n@`);

      store.setWeaveFormat('html');
      const htmlOutput = store.weave();
      expect(htmlOutput).toContain('<h1>');

      store.setWeaveFormat('markdown');
      const mdOutput = store.weave();
      expect(mdOutput).toContain('# Title');
    });
  });

  describe('Statistics', () => {
    test('gets document statistics', () => {
      const store = new LitProgStore(`# Title

<<chunk1>>=
line1
line2
@

<<chunk2>>=
line3
@
`);
      const stats = store.getStats();

      expect(stats.uniqueChunks).toBe(2);
      expect(stats.totalCodeLines).toBe(3);
      expect(stats.documentationSections).toBeGreaterThan(0);
    });

    test('returns zero stats for empty document', () => {
      const store = new LitProgStore();
      const stats = store.getStats();

      expect(stats.uniqueChunks).toBe(0);
      expect(stats.totalCodeLines).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('reports parse errors', () => {
      const store = new LitProgStore(`<<main>>=
<<undefined-chunk>>
@
`);
      const errors = store.getErrors();

      expect(errors.length).toBeGreaterThan(0);
      expect(store.hasErrors()).toBe(true);
    });

    test('hasErrors returns false when no errors', () => {
      const store = new LitProgStore(`<<valid>>=
code
@
`);
      expect(store.hasErrors()).toBe(false);
    });
  });

  describe('File Associations', () => {
    test('gets target files', () => {
      const store = new LitProgStore(`\`\`\`ts {#a .tangle=file1.ts}
x
\`\`\`

\`\`\`ts {#b .tangle=file2.ts}
y
\`\`\``);
      store.setSyntaxStyle('markdown');

      const files = store.getTargetFiles();
      expect(files).toContain('file1.ts');
      expect(files).toContain('file2.ts');
    });

    test('gets chunks for file', () => {
      const store = new LitProgStore(`\`\`\`ts {#main .tangle=output.ts}
code
\`\`\``);
      store.setSyntaxStyle('markdown');

      const chunks = store.getChunksForFile('output.ts');
      expect(chunks).toContain('main');
    });
  });

  describe('Change Notifications', () => {
    test('notifies subscribers on source change', () => {
      const store = new LitProgStore();
      const listener = jest.fn();
      store.subscribe(listener);

      store.setSource('new content');
      expect(listener).toHaveBeenCalled();
    });

    test('notifies subscribers on navigation', () => {
      const store = new LitProgStore(`<<a>>=\nx\n@\n<<b>>=\ny\n@`);
      const listener = jest.fn();
      store.subscribe(listener);

      store.nextChunk();
      expect(listener).toHaveBeenCalled();
    });

    test('unsubscribe stops notifications', () => {
      const store = new LitProgStore();
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();
      store.setSource('new content');
      expect(listener).not.toHaveBeenCalled();
    });

    test('multiple subscribers all notified', () => {
      const store = new LitProgStore();
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);

      store.setSource('content');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Templates', () => {
    test('provides noweb template', () => {
      const template = LitProgStore.getTemplate('noweb');
      expect(template).toContain('<<');
      expect(template).toContain('>>=');
      expect(template).toContain('@');
    });

    test('provides org-mode template', () => {
      const template = LitProgStore.getTemplate('orgmode');
      expect(template).toContain('#+BEGIN_SRC');
      expect(template).toContain('#+END_SRC');
    });

    test('provides markdown template', () => {
      const template = LitProgStore.getTemplate('markdown');
      expect(template).toContain('```');
      expect(template).toContain('.tangle=');
    });

    test('auto defaults to markdown template', () => {
      const template = LitProgStore.getTemplate('auto');
      expect(template).toContain('```');
    });
  });
});
