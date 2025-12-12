/**
 * Unit tests for LitProg Parser
 */

import {
  LitProgParser,
  tangle,
  weave,
  getStats,
  ParsedDocument,
  SyntaxStyle,
} from './parser';

describe('LitProgParser', () => {
  let parser: LitProgParser;

  beforeEach(() => {
    parser = new LitProgParser();
  });

  describe('Noweb Style Parsing', () => {
    test('parses simple chunk definition', () => {
      const source = `# Hello

<<hello.ts>>=
console.log('hello');
@
`;
      const doc = parser.parse(source, 'noweb');

      expect(doc.chunks.size).toBe(1);
      expect(doc.chunks.has('hello.ts')).toBe(true);

      const chunks = doc.chunks.get('hello.ts')!;
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toEqual(["console.log('hello');"]);
    });

    test('parses multiple chunks', () => {
      const source = `<<first>>=
code1
@

<<second>>=
code2
@
`;
      const doc = parser.parse(source, 'noweb');

      expect(doc.chunks.size).toBe(2);
      expect(doc.chunks.has('first')).toBe(true);
      expect(doc.chunks.has('second')).toBe(true);
    });

    test('handles multiple definitions of same chunk', () => {
      const source = `<<main>>=
part1
@

<<main>>=
part2
@
`;
      const doc = parser.parse(source, 'noweb');

      expect(doc.chunks.size).toBe(1);
      const chunks = doc.chunks.get('main')!;
      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toEqual(['part1']);
      expect(chunks[1].content).toEqual(['part2']);
    });

    test('detects chunk references', () => {
      const source = `<<main>>=
<<imports>>
<<body>>
@

<<imports>>=
import foo from 'foo';
@

<<body>>=
foo();
@
`;
      const doc = parser.parse(source, 'noweb');

      const mainChunks = doc.chunks.get('main')!;
      expect(mainChunks[0].references).toContain('imports');
      expect(mainChunks[0].references).toContain('body');
    });

    test('reports unterminated chunk error', () => {
      const source = `<<unterminated>>=
code without end marker
`;
      const doc = parser.parse(source, 'noweb');

      expect(doc.errors).toHaveLength(1);
      expect(doc.errors[0].severity).toBe('error');
      expect(doc.errors[0].message).toContain('Unterminated');
    });

    test('reports undefined chunk reference error', () => {
      const source = `<<main>>=
<<undefined-chunk>>
@
`;
      const doc = parser.parse(source, 'noweb');

      expect(doc.errors.some((e) => e.message.includes('undefined'))).toBe(true);
    });

    test('parses markdown headings in documentation', () => {
      const source = `# Main Title

Some prose here.

## Subsection

<<code>>=
x = 1
@
`;
      const doc = parser.parse(source, 'noweb');

      const headings = doc.documentation.filter((d) => d.type === 'heading');
      expect(headings).toHaveLength(2);
      expect(headings[0].content).toBe('Main Title');
      expect(headings[0].level).toBe(1);
      expect(headings[1].content).toBe('Subsection');
      expect(headings[1].level).toBe(2);
    });

    test('extracts document title from first heading', () => {
      const source = `# My Document

<<chunk>>=
code
@
`;
      const doc = parser.parse(source, 'noweb');
      expect(doc.title).toBe('My Document');
    });
  });

  describe('Org-mode Style Parsing', () => {
    test('parses org-mode code blocks', () => {
      const source = `* Hello

#+BEGIN_SRC typescript
console.log('hello');
#+END_SRC
`;
      const doc = parser.parse(source, 'orgmode');

      expect(doc.chunks.size).toBe(1);
      const chunks = Array.from(doc.chunks.values())[0];
      expect(chunks[0].language).toBe('typescript');
      expect(chunks[0].content).toEqual(["console.log('hello');"]);
    });

    test('parses tangle directive', () => {
      const source = `#+BEGIN_SRC typescript :tangle output.ts
code here
#+END_SRC
`;
      const doc = parser.parse(source, 'orgmode');

      const chunks = Array.from(doc.chunks.values())[0];
      expect(chunks[0].targetFile).toBe('output.ts');
    });

    test('parses named code blocks', () => {
      const source = `#+BEGIN_SRC typescript :name my-chunk
code here
#+END_SRC
`;
      const doc = parser.parse(source, 'orgmode');

      expect(doc.chunks.has('my-chunk')).toBe(true);
    });

    test('parses org-style headings', () => {
      const source = `* Top Level
** Second Level
*** Third Level

#+BEGIN_SRC text
code
#+END_SRC
`;
      const doc = parser.parse(source, 'orgmode');

      const headings = doc.documentation.filter((d) => d.type === 'heading');
      expect(headings).toHaveLength(3);
      expect(headings[0].level).toBe(1);
      expect(headings[1].level).toBe(2);
      expect(headings[2].level).toBe(3);
    });
  });

  describe('Markdown Fence Style Parsing', () => {
    test('parses markdown fenced code blocks', () => {
      const source = `# Hello

\`\`\`typescript
console.log('hello');
\`\`\`
`;
      const doc = parser.parse(source, 'markdown');

      expect(doc.chunks.size).toBe(1);
    });

    test('parses code block with attributes', () => {
      const source = `\`\`\`typescript {#my-chunk .tangle=output.ts}
code here
\`\`\`
`;
      const doc = parser.parse(source, 'markdown');

      expect(doc.chunks.has('my-chunk')).toBe(true);
      const chunks = doc.chunks.get('my-chunk')!;
      expect(chunks[0].targetFile).toBe('output.ts');
      expect(chunks[0].language).toBe('typescript');
    });

    test('handles blocks without attributes', () => {
      const source = `\`\`\`javascript
const x = 1;
\`\`\`
`;
      const doc = parser.parse(source, 'markdown');

      expect(doc.chunks.size).toBe(1);
      const chunks = Array.from(doc.chunks.values())[0];
      expect(chunks[0].language).toBe('javascript');
    });

    test('handles blocks without language', () => {
      const source = `\`\`\`
plain text
\`\`\`
`;
      const doc = parser.parse(source, 'markdown');

      const chunks = Array.from(doc.chunks.values())[0];
      expect(chunks[0].language).toBe('text');
    });
  });

  describe('Mixed Style Parsing (Auto)', () => {
    test('auto-detects and parses mixed styles', () => {
      const source = `# Mixed Document

<<noweb-chunk>>=
noweb code
@

\`\`\`typescript {#md-chunk}
markdown code
\`\`\`

#+BEGIN_SRC python
org-mode code
#+END_SRC
`;
      const doc = parser.parse(source, 'auto');

      expect(doc.chunks.has('noweb-chunk')).toBe(true);
      expect(doc.chunks.has('md-chunk')).toBe(true);
      // Org-mode chunk will have auto-generated name
      expect(doc.chunks.size).toBe(3);
    });

    test('detects primarily noweb style', () => {
      const source = `<<a>>=
x
@
<<b>>=
y
@
<<c>>=
z
@
`;
      const doc = parser.parse(source);
      // Should detect as noweb and parse correctly
      expect(doc.chunks.size).toBe(3);
    });
  });

  describe('Prose and Documentation', () => {
    test('captures prose sections', () => {
      const source = `This is some prose text.

<<chunk>>=
code
@

More prose after the code.
`;
      const doc = parser.parse(source, 'noweb');

      const prose = doc.documentation.filter((d) => d.type === 'prose');
      expect(prose.length).toBeGreaterThanOrEqual(2);
    });

    test('preserves prose content', () => {
      const source = `This is important documentation.

<<code>>=
x
@
`;
      const doc = parser.parse(source, 'noweb');

      const prose = doc.documentation.find((d) => d.type === 'prose');
      expect(prose?.content).toContain('important documentation');
    });
  });
});

describe('tangle', () => {
  let parser: LitProgParser;

  beforeEach(() => {
    parser = new LitProgParser();
  });

  test('expands simple chunk', () => {
    const source = `<<output.ts>>=
console.log('hello');
@
`;
    const doc = parser.parse(source, 'noweb');
    // Specify root chunk when no file associations exist
    const files = tangle(doc, 'output.ts');

    expect(files.size).toBe(1);
    // Output goes to output.ts (since it's the specified root)
    const output = files.get('output.ts') || files.get('output.ts.out')!;
    expect(output).toContain("console.log('hello')");
  });

  test('expands chunk references', () => {
    const source = `<<main.ts>>=
<<imports>>
<<code>>
@

<<imports>>=
import { foo } from 'foo';
@

<<code>>=
foo();
@
`;
    const doc = parser.parse(source, 'noweb');
    const files = tangle(doc, 'main.ts');

    // May output to main.ts or main.ts.out depending on whether targetFile is set
    const output = files.get('main.ts') || files.get('main.ts.out')!;
    expect(output).toContain("import { foo } from 'foo'");
    expect(output).toContain('foo()');
  });

  test('preserves indentation for expanded chunks', () => {
    const source = `<<main>>=
function test() {
  <<body>>
}
@

<<body>>=
console.log('indented');
@
`;
    const doc = parser.parse(source, 'noweb');
    const files = tangle(doc, 'main');

    const output = files.get('main.out')!;
    expect(output).toContain("  console.log('indented')");
  });

  test('handles inline references', () => {
    const source = `<<main>>=
const x = <<value>>;
@

<<value>>=
42
@
`;
    const doc = parser.parse(source, 'noweb');
    const files = tangle(doc, 'main');

    expect(files.get('main.out')).toContain('const x = 42');
  });

  test('generates multiple files from file associations', () => {
    const source = `\`\`\`typescript {#mod1 .tangle=file1.ts}
code1
\`\`\`

\`\`\`typescript {#mod2 .tangle=file2.ts}
code2
\`\`\`
`;
    const doc = parser.parse(source, 'markdown');
    const files = tangle(doc);

    expect(files.size).toBe(2);
    expect(files.has('file1.ts')).toBe(true);
    expect(files.has('file2.ts')).toBe(true);
  });

  test('handles recursive reference protection', () => {
    const source = `<<recursive>>=
<<recursive>>
@
`;
    const doc = parser.parse(source, 'noweb');
    const files = tangle(doc, 'recursive');

    // Should not crash, and should mark as recursive
    expect(files.get('recursive.out')).toContain('RECURSIVE');
  });

  test('marks undefined references', () => {
    const source = `<<main>>=
<<undefined-chunk>>
@
`;
    const doc = parser.parse(source, 'noweb');
    const files = tangle(doc, 'main');

    expect(files.get('main.out')).toContain('UNDEFINED');
  });
});

describe('weave', () => {
  let parser: LitProgParser;

  beforeEach(() => {
    parser = new LitProgParser();
  });

  test('generates markdown output', () => {
    const source = `# Title

<<code>>=
x = 1
@
`;
    const doc = parser.parse(source, 'noweb');
    const output = weave(doc, 'markdown');

    expect(output).toContain('# Title');
    expect(output).toContain('```');
    expect(output).toContain('x = 1');
  });

  test('generates HTML output', () => {
    const source = `# Title

<<code>>=
x = 1
@
`;
    const doc = parser.parse(source, 'noweb');
    const output = weave(doc, 'html');

    expect(output).toContain('<h1>');
    expect(output).toContain('<pre>');
    expect(output).toContain('code'); // Contains code element
  });

  test('generates LaTeX output', () => {
    const source = `# Title

<<code>>=
x = 1
@
`;
    const doc = parser.parse(source, 'noweb');
    const output = weave(doc, 'latex');

    // H1 becomes chapter in LaTeX
    expect(output).toMatch(/\\(chapter|section)/);
    expect(output).toContain('\\begin{lstlisting}');
  });

  test('generates plain text output', () => {
    const source = `# Title

<<code>>=
x = 1
@
`;
    const doc = parser.parse(source, 'noweb');
    const output = weave(doc, 'text');

    expect(output).toContain('Title');
    expect(output).toContain('x = 1');
  });

  test('escapes HTML special characters in HTML output', () => {
    const source = `<<code>>=
if (x < y && z > 0) {}
@
`;
    const doc = parser.parse(source, 'noweb');
    const output = weave(doc, 'html');

    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
    expect(output).toContain('&amp;');
  });
});

describe('getStats', () => {
  let parser: LitProgParser;

  beforeEach(() => {
    parser = new LitProgParser();
  });

  test('counts chunks correctly', () => {
    const source = `<<a>>=
line1
line2
@

<<b>>=
line3
@

<<a>>=
line4
@
`;
    const doc = parser.parse(source, 'noweb');
    const stats = getStats(doc);

    expect(stats.uniqueChunks).toBe(2);
    expect(stats.chunkCount).toBe(3); // 2 for 'a', 1 for 'b'
    expect(stats.totalCodeLines).toBe(4);
  });

  test('counts documentation sections', () => {
    const source = `# Title

Prose here.

## Subtitle

More prose.

<<code>>=
x
@
`;
    const doc = parser.parse(source, 'noweb');
    const stats = getStats(doc);

    expect(stats.documentationSections).toBeGreaterThanOrEqual(3); // 2 headings + 2 prose
  });

  test('counts files generated', () => {
    const source = `\`\`\`ts {#a .tangle=file1.ts}
x
\`\`\`

\`\`\`ts {#b .tangle=file2.ts}
y
\`\`\`
`;
    const doc = parser.parse(source, 'markdown');
    const stats = getStats(doc);

    expect(stats.filesGenerated).toBe(2);
  });

  test('counts errors and warnings', () => {
    const source = `<<main>>=
<<undefined>>
`;
    const doc = parser.parse(source, 'noweb');
    const stats = getStats(doc);

    expect(stats.errors).toBeGreaterThan(0);
  });
});

describe('Language Detection', () => {
  let parser: LitProgParser;

  beforeEach(() => {
    parser = new LitProgParser();
  });

  test('detects TypeScript from .ts extension', () => {
    const source = `<<file.ts>>=
code
@
`;
    const doc = parser.parse(source, 'noweb');
    const chunks = doc.chunks.get('file.ts')!;
    expect(chunks[0].language).toBe('typescript');
  });

  test('detects Python from .py extension', () => {
    const source = `<<script.py>>=
code
@
`;
    const doc = parser.parse(source, 'noweb');
    const chunks = doc.chunks.get('script.py')!;
    expect(chunks[0].language).toBe('python');
  });

  test('uses explicit language from markdown fence', () => {
    const source = `\`\`\`rust {#chunk}
code
\`\`\`
`;
    const doc = parser.parse(source, 'markdown');
    const chunks = doc.chunks.get('chunk')!;
    expect(chunks[0].language).toBe('rust');
  });

  test('uses explicit language from org-mode', () => {
    const source = `#+BEGIN_SRC go
code
#+END_SRC
`;
    const doc = parser.parse(source, 'orgmode');
    const chunks = Array.from(doc.chunks.values())[0];
    expect(chunks[0].language).toBe('go');
  });
});
