/**
 * Store for Literate Programming app state management
 *
 * Manages the literate document state and provides reactive updates
 */

import {
  LitProgParser,
  ParsedDocument,
  LitChunk,
  LitDocSection,
  tangle,
  weave,
  getStats,
  SyntaxStyle,
  WeaveFormat,
} from './parser';

export type ChangeListener = () => void;

export interface LitProgState {
  source: string;
  syntaxStyle: SyntaxStyle;
  currentChunkIndex: number;
  weaveFormat: WeaveFormat;
  isDirty: boolean;
  filePath?: string;
}

/**
 * LitProg Store - manages literate programming document state
 */
export class LitProgStore {
  private parser = new LitProgParser();
  private parsedDoc: ParsedDocument | null = null;
  private state: LitProgState;
  private changeListeners: ChangeListener[] = [];
  private chunkNames: string[] = [];

  constructor(initialSource: string = '') {
    this.state = {
      source: initialSource,
      syntaxStyle: 'auto',
      currentChunkIndex: 0,
      weaveFormat: 'markdown',
      isDirty: false,
      filePath: undefined,
    };

    if (initialSource) {
      this.reparse();
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }

  /**
   * Reparse the source document
   */
  private reparse(): void {
    this.parsedDoc = this.parser.parse(this.state.source, this.state.syntaxStyle);
    this.chunkNames = Array.from(this.parsedDoc.chunks.keys());
  }

  // ----- Source Management -----

  /**
   * Get the current source
   */
  getSource(): string {
    return this.state.source;
  }

  /**
   * Set the source and reparse
   */
  setSource(source: string): void {
    if (this.state.source !== source) {
      this.state.source = source;
      this.state.isDirty = true;
      this.reparse();
      this.notifyChange();
    }
  }

  /**
   * Get dirty state
   */
  isDirty(): boolean {
    return this.state.isDirty;
  }

  /**
   * Mark as saved
   */
  markSaved(filePath?: string): void {
    this.state.isDirty = false;
    if (filePath) {
      this.state.filePath = filePath;
    }
    this.notifyChange();
  }

  /**
   * Get current file path
   */
  getFilePath(): string | undefined {
    return this.state.filePath;
  }

  // ----- Syntax Style -----

  /**
   * Get current syntax style
   */
  getSyntaxStyle(): SyntaxStyle {
    return this.state.syntaxStyle;
  }

  /**
   * Set syntax style and reparse
   */
  setSyntaxStyle(style: SyntaxStyle): void {
    if (this.state.syntaxStyle !== style) {
      this.state.syntaxStyle = style;
      this.reparse();
      this.notifyChange();
    }
  }

  // ----- Weave Format -----

  /**
   * Get current weave format
   */
  getWeaveFormat(): WeaveFormat {
    return this.state.weaveFormat;
  }

  /**
   * Set weave format
   */
  setWeaveFormat(format: WeaveFormat): void {
    if (this.state.weaveFormat !== format) {
      this.state.weaveFormat = format;
      this.notifyChange();
    }
  }

  // ----- Document Access -----

  /**
   * Get parsed document
   */
  getParsedDocument(): ParsedDocument | null {
    return this.parsedDoc;
  }

  /**
   * Get all chunk names
   */
  getChunkNames(): string[] {
    return [...this.chunkNames];
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.chunkNames.length;
  }

  /**
   * Get chunks by name
   */
  getChunks(name: string): LitChunk[] {
    return this.parsedDoc?.chunks.get(name) || [];
  }

  /**
   * Get current chunk index
   */
  getCurrentChunkIndex(): number {
    return this.state.currentChunkIndex;
  }

  /**
   * Get current chunk name
   */
  getCurrentChunkName(): string | null {
    return this.chunkNames[this.state.currentChunkIndex] || null;
  }

  /**
   * Get current chunk(s)
   */
  getCurrentChunk(): LitChunk[] | null {
    const name = this.getCurrentChunkName();
    return name ? this.getChunks(name) : null;
  }

  /**
   * Navigate to next chunk
   */
  nextChunk(): boolean {
    if (this.state.currentChunkIndex < this.chunkNames.length - 1) {
      this.state.currentChunkIndex++;
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Navigate to previous chunk
   */
  previousChunk(): boolean {
    if (this.state.currentChunkIndex > 0) {
      this.state.currentChunkIndex--;
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Jump to specific chunk by index
   */
  goToChunk(index: number): boolean {
    if (index >= 0 && index < this.chunkNames.length) {
      this.state.currentChunkIndex = index;
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Jump to chunk by name
   */
  goToChunkByName(name: string): boolean {
    const index = this.chunkNames.indexOf(name);
    if (index >= 0) {
      return this.goToChunk(index);
    }
    return false;
  }

  // ----- Documentation Access -----

  /**
   * Get all documentation sections
   */
  getDocumentation(): LitDocSection[] {
    return this.parsedDoc?.documentation || [];
  }

  /**
   * Get document title
   */
  getTitle(): string {
    return this.parsedDoc?.title || 'Untitled';
  }

  // ----- Tangle & Weave -----

  /**
   * Tangle the document (extract code)
   */
  tangle(rootChunk?: string): Map<string, string> {
    if (!this.parsedDoc) {
      return new Map();
    }
    return tangle(this.parsedDoc, rootChunk);
  }

  /**
   * Weave the document (generate documentation)
   */
  weave(): string {
    if (!this.parsedDoc) {
      return '';
    }
    return weave(this.parsedDoc, this.state.weaveFormat);
  }

  /**
   * Get tangled output for preview
   */
  getTangledPreview(): string {
    const files = this.tangle();
    const parts: string[] = [];

    for (const [filename, content] of files) {
      parts.push(`=== ${filename} ===\n\n${content}`);
    }

    return parts.join('\n\n');
  }

  // ----- Statistics -----

  /**
   * Get document statistics
   */
  getStats(): ReturnType<typeof getStats> {
    if (!this.parsedDoc) {
      return {
        chunkCount: 0,
        uniqueChunks: 0,
        totalCodeLines: 0,
        documentationSections: 0,
        filesGenerated: 0,
        errors: 0,
        warnings: 0,
      };
    }
    return getStats(this.parsedDoc);
  }

  /**
   * Get parse errors
   */
  getErrors(): Array<{ line: number; message: string; severity: string }> {
    return this.parsedDoc?.errors || [];
  }

  /**
   * Check if document has errors
   */
  hasErrors(): boolean {
    return (this.parsedDoc?.errors || []).some((e) => e.severity === 'error');
  }

  // ----- File Associations -----

  /**
   * Get files that will be generated
   */
  getTargetFiles(): string[] {
    return Array.from(this.parsedDoc?.fileAssociations.keys() || []);
  }

  /**
   * Get chunks associated with a file
   */
  getChunksForFile(filename: string): string[] {
    return this.parsedDoc?.fileAssociations.get(filename) || [];
  }

  // ----- Templates -----

  /**
   * Get example templates for each syntax style
   */
  static getTemplate(style: SyntaxStyle): string {
    switch (style) {
      case 'noweb':
        return NOWEB_TEMPLATE;
      case 'orgmode':
        return ORGMODE_TEMPLATE;
      case 'markdown':
        return MARKDOWN_TEMPLATE;
      default:
        return MARKDOWN_TEMPLATE;
    }
  }
}

// ----- Templates -----

const NOWEB_TEMPLATE = `# Hello World (Noweb Style)

This is a simple literate program using Noweb syntax.

The main program structure:

<<hello.ts>>=
<<imports>>
<<main-function>>
@

## Imports

We need to import the greeting module:

<<imports>>=
import { greet } from './greeting';
@

## Main Function

The main function calls greet:

<<main-function>>=
function main() {
  console.log(greet('World'));
}

main();
@
`;

const ORGMODE_TEMPLATE = `* Hello World (Org-mode Style)

This is a simple literate program using Org-mode syntax.

** Main Module

#+BEGIN_SRC typescript :tangle hello.ts
import { greet } from './greeting';

function main() {
  console.log(greet('World'));
}

main();
#+END_SRC

** Greeting Module

The greeting function returns a formatted string.

#+BEGIN_SRC typescript :tangle greeting.ts
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
#+END_SRC
`;

const MARKDOWN_TEMPLATE = `# Hello World (Markdown Style)

This is a simple literate program using Markdown fence syntax.

## Main Module

The main entry point imports and uses the greeting module.

\`\`\`typescript {#main .tangle=hello.ts}
import { greet } from './greeting';

function main() {
  console.log(greet('World'));
}

main();
\`\`\`

## Greeting Module

The greeting function takes a name and returns a formatted greeting.

\`\`\`typescript {#greeting .tangle=greeting.ts}
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;
