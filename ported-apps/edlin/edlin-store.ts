/**
 * EdlinStore - Document state management for Edlin text editor
 *
 * Based on the original Go edlin by Bob Shofner
 * MIT License - https://opensource.org/license/mit/
 */

export interface TextDocument {
  id: string;
  title: string;
  filePath: string | null;
  content: string;
  isDirty: boolean;
}

export interface SearchResult {
  lineIndex: number;
  startCol: number;
  endCol: number;
  lineText: string;
}

export type ChangeListener = () => void;

/**
 * Store for a single text document
 */
export class DocumentStore {
  private doc: TextDocument;
  private changeListeners: ChangeListener[] = [];
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  constructor(id: string, title: string, content: string = '', filePath: string | null = null) {
    this.doc = {
      id,
      title,
      filePath,
      content,
      isDirty: false
    };
  }

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => l());
  }

  getDocument(): TextDocument {
    return { ...this.doc };
  }

  getId(): string {
    return this.doc.id;
  }

  getTitle(): string {
    return this.doc.title;
  }

  getFilePath(): string | null {
    return this.doc.filePath;
  }

  getContent(): string {
    return this.doc.content;
  }

  getLines(): string[] {
    return this.doc.content.split('\n');
  }

  getLineCount(): number {
    return this.getLines().length;
  }

  isDirty(): boolean {
    return this.doc.isDirty;
  }

  setTitle(title: string): void {
    this.doc.title = title;
    this.notifyChange();
  }

  setFilePath(filePath: string): void {
    this.doc.filePath = filePath;
    this.notifyChange();
  }

  setContent(content: string, markDirty: boolean = true): void {
    const isChanged = content !== this.doc.content;
    if (markDirty && isChanged) {
      this.undoStack.push(this.doc.content);
      this.redoStack = [];
    }
    this.doc.content = content;
    if (markDirty && isChanged) {
      this.doc.isDirty = true;
    }
    this.notifyChange();
  }

  markClean(): void {
    this.doc.isDirty = false;
    this.notifyChange();
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(this.doc.content);
    this.doc.content = previous;
    this.doc.isDirty = true;
    this.notifyChange();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const next = this.redoStack.pop()!;
    this.undoStack.push(this.doc.content);
    this.doc.content = next;
    this.doc.isDirty = true;
    this.notifyChange();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

/**
 * Store for managing multiple documents (tabs)
 */
export class EdlinStore {
  private documents: Map<string, DocumentStore> = new Map();
  private activeDocId: string | null = null;
  private nextDocId: number = 1;
  private changeListeners: ChangeListener[] = [];

  // Clipboard for cut/copy/paste operations
  private clipboard: string = '';

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange(): void {
    this.changeListeners.forEach((l) => l());
  }

  private generateId(): string {
    return `doc-${this.nextDocId++}`;
  }

  createDocument(title: string = 'New', content: string = '', filePath: string | null = null): DocumentStore {
    const id = this.generateId();

    // Ensure unique title
    let uniqueTitle = title;
    let counter = 1;
    while (this.findDocumentByTitle(uniqueTitle)) {
      uniqueTitle = `${title}(${counter++})`;
    }

    const doc = new DocumentStore(id, uniqueTitle, content, filePath);
    this.documents.set(id, doc);
    this.activeDocId = id;

    // Subscribe to document changes
    doc.subscribe(() => this.notifyChange());

    this.notifyChange();
    return doc;
  }

  closeDocument(id: string): boolean {
    if (!this.documents.has(id)) return false;

    this.documents.delete(id);

    // Update active document
    if (this.activeDocId === id) {
      const remaining = Array.from(this.documents.keys());
      this.activeDocId = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    }

    this.notifyChange();
    return true;
  }

  getDocument(id: string): DocumentStore | undefined {
    return this.documents.get(id);
  }

  getActiveDocument(): DocumentStore | undefined {
    return this.activeDocId ? this.documents.get(this.activeDocId) : undefined;
  }

  getActiveDocumentId(): string | null {
    return this.activeDocId;
  }

  setActiveDocument(id: string): void {
    if (this.documents.has(id)) {
      this.activeDocId = id;
      this.notifyChange();
    }
  }

  getAllDocuments(): DocumentStore[] {
    return Array.from(this.documents.values());
  }

  getDocumentCount(): number {
    return this.documents.size;
  }

  findDocumentByTitle(title: string): DocumentStore | undefined {
    return Array.from(this.documents.values()).find((d) => d.getTitle() === title);
  }

  findDocumentByPath(filePath: string): DocumentStore | undefined {
    return Array.from(this.documents.values()).find((d) => d.getFilePath() === filePath);
  }

  // Clipboard operations
  setClipboard(text: string): void {
    this.clipboard = text;
  }

  getClipboard(): string {
    return this.clipboard;
  }

  // Search functionality
  search(text: string, ignoreCase: boolean = false): SearchResult[] {
    const doc = this.getActiveDocument();
    if (!doc) return [];

    const results: SearchResult[] = [];
    const lines = doc.getLines();
    const searchText = ignoreCase ? text.toLowerCase() : text;

    lines.forEach((line, lineIndex) => {
      const searchLine = ignoreCase ? line.toLowerCase() : line;
      let startIndex = 0;
      let foundIndex: number;

      while ((foundIndex = searchLine.indexOf(searchText, startIndex)) !== -1) {
        results.push({
          lineIndex,
          startCol: foundIndex,
          endCol: foundIndex + text.length - 1,
          lineText: line
        });
        startIndex = foundIndex + 1;
      }
    });

    return results;
  }

  replace(searchText: string, replaceText: string, ignoreCase: boolean = false): number {
    const doc = this.getActiveDocument();
    if (!doc) return 0;

    let content = doc.getContent();
    const regex = new RegExp(escapeRegex(searchText), ignoreCase ? 'gi' : 'g');
    const matches = content.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      content = content.replace(regex, replaceText);
      doc.setContent(content);
    }

    return count;
  }

  replaceOne(
    searchText: string,
    replaceText: string,
    lineIndex: number,
    startCol: number,
    ignoreCase: boolean = false
  ): boolean {
    const doc = this.getActiveDocument();
    if (!doc) return false;

    const lines = doc.getLines();
    if (lineIndex >= lines.length) return false;

    const line = lines[lineIndex];
    const searchLine = ignoreCase ? line.toLowerCase() : line;
    const searchLower = ignoreCase ? searchText.toLowerCase() : searchText;

    if (searchLine.substring(startCol, startCol + searchText.length) === searchLower) {
      lines[lineIndex] = line.substring(0, startCol) + replaceText + line.substring(startCol + searchText.length);
      doc.setContent(lines.join('\n'));
      return true;
    }

    return false;
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export a factory function for creating the store
export function createEdlinStore(): EdlinStore {
  return new EdlinStore();
}
