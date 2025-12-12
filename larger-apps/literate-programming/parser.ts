/**
 * Literate Programming Parser
 *
 * Supports three syntax styles:
 * 1. Noweb (Classic): <<chunk-name>>= ... @
 * 2. Org-Mode (Emacs): #+BEGIN_SRC ... #+END_SRC
 * 3. Markdown Fences: ```lang {#name .tangle=file} ... ```
 *
 * Ported from ChrysaLisp litprog.lisp (PR #301)
 */

export interface LitChunk {
  name: string;
  language: string;
  content: string[];
  targetFile?: string;
  lineNumber: number;
  references: string[]; // Names of chunks referenced by <<name>>
}

export interface LitDocSection {
  type: 'prose' | 'heading';
  content: string;
  level?: number; // For headings: 1-6
  lineNumber: number;
}

export interface ParsedDocument {
  chunks: Map<string, LitChunk[]>;
  documentation: LitDocSection[];
  fileAssociations: Map<string, string[]>; // filename -> chunk names
  title?: string;
  errors: ParseError[];
}

export interface ParseError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export type SyntaxStyle = 'noweb' | 'orgmode' | 'markdown' | 'auto';

/**
 * LitProg Parser - parses literate programming documents
 */
export class LitProgParser {
  private currentLineNumber = 0;
  private errors: ParseError[] = [];

  /**
   * Parse a literate programming document
   * @param source Source text
   * @param style Syntax style (auto-detected if not specified)
   */
  parse(source: string, style: SyntaxStyle = 'auto'): ParsedDocument {
    this.currentLineNumber = 0;
    this.errors = [];

    const lines = source.split('\n');
    const detectedStyle = style === 'auto' ? this.detectStyle(lines) : style;

    const result: ParsedDocument = {
      chunks: new Map(),
      documentation: [],
      fileAssociations: new Map(),
      errors: [],
    };

    switch (detectedStyle) {
      case 'noweb':
        this.parseNoweb(lines, result);
        break;
      case 'orgmode':
        this.parseOrgMode(lines, result);
        break;
      case 'markdown':
        this.parseMarkdown(lines, result);
        break;
      default:
        // Mixed mode - parse all styles
        this.parseMixed(lines, result);
    }

    // Extract title from first heading
    const firstHeading = result.documentation.find((d) => d.type === 'heading');
    if (firstHeading) {
      result.title = firstHeading.content;
    }

    // Validate chunk references
    this.validateReferences(result);

    result.errors = [...this.errors];
    return result;
  }

  /**
   * Detect the primary syntax style used in the document
   */
  private detectStyle(lines: string[]): SyntaxStyle {
    let nowebCount = 0;
    let orgmodeCount = 0;
    let markdownCount = 0;

    for (const line of lines) {
      if (line.match(/^<<[^>]+>>=\s*$/)) nowebCount++;
      if (line.match(/^#\+BEGIN_SRC\s+/i)) orgmodeCount++;
      if (line.match(/^```\w*\s*\{/)) markdownCount++;
    }

    if (nowebCount > orgmodeCount && nowebCount > markdownCount) return 'noweb';
    if (orgmodeCount > nowebCount && orgmodeCount > markdownCount) return 'orgmode';
    if (markdownCount > nowebCount && markdownCount > orgmodeCount) return 'markdown';

    // Mixed or no clear winner - return auto to parse all
    return 'auto';
  }

  /**
   * Parse Noweb-style literate programming
   * Format: <<chunk-name>>= ... @
   */
  private parseNoweb(lines: string[], result: ParsedDocument): void {
    let currentChunk: LitChunk | null = null;
    let proseBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      this.currentLineNumber = i + 1;
      const line = lines[i];

      // Check for chunk definition: <<name>>=
      const chunkStart = line.match(/^<<([^>]+)>>=\s*$/);
      if (chunkStart) {
        // Save accumulated prose
        if (proseBuffer.length > 0) {
          this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
          proseBuffer = [];
        }

        const chunkName = chunkStart[1].trim();
        currentChunk = {
          name: chunkName,
          language: this.guessLanguage(chunkName),
          content: [],
          lineNumber: this.currentLineNumber,
          references: [],
        };
        continue;
      }

      // Check for chunk end: @
      if (line.match(/^@\s*$/) && currentChunk) {
        this.addChunk(currentChunk, result);
        currentChunk = null;
        continue;
      }

      if (currentChunk) {
        // Inside chunk - look for references <<name>>
        const refs = line.match(/<<([^>]+)>>/g);
        if (refs) {
          for (const ref of refs) {
            const refName = ref.slice(2, -2);
            if (!currentChunk.references.includes(refName)) {
              currentChunk.references.push(refName);
            }
          }
        }
        currentChunk.content.push(line);
      } else {
        // Parse headings and prose
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
          if (proseBuffer.length > 0) {
            this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
            proseBuffer = [];
          }
          result.documentation.push({
            type: 'heading',
            content: heading[2],
            level: heading[1].length,
            lineNumber: this.currentLineNumber,
          });
        } else {
          proseBuffer.push(line);
        }
      }
    }

    // Handle unterminated chunk
    if (currentChunk) {
      this.errors.push({
        line: currentChunk.lineNumber,
        message: `Unterminated chunk: ${currentChunk.name}`,
        severity: 'error',
      });
      this.addChunk(currentChunk, result);
    }

    // Save remaining prose
    if (proseBuffer.length > 0) {
      this.addProseSection(
        proseBuffer.join('\n'),
        result,
        lines.length - proseBuffer.length + 1
      );
    }
  }

  /**
   * Parse Org-mode style literate programming
   * Format: #+BEGIN_SRC lang :tangle file ... #+END_SRC
   */
  private parseOrgMode(lines: string[], result: ParsedDocument): void {
    let currentChunk: LitChunk | null = null;
    let proseBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      this.currentLineNumber = i + 1;
      const line = lines[i];

      // Check for code block start: #+BEGIN_SRC
      const srcStart = line.match(
        /^#\+BEGIN_SRC\s+(\w+)(?:\s+:tangle\s+(\S+))?(?:\s+:name\s+(\S+))?/i
      );
      if (srcStart) {
        // Save accumulated prose
        if (proseBuffer.length > 0) {
          this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
          proseBuffer = [];
        }

        const language = srcStart[1];
        const tangleFile = srcStart[2];
        const name = srcStart[3] || (tangleFile ? `file:${tangleFile}` : `block-${i}`);

        currentChunk = {
          name,
          language,
          content: [],
          targetFile: tangleFile,
          lineNumber: this.currentLineNumber,
          references: [],
        };
        continue;
      }

      // Check for code block end: #+END_SRC
      if (line.match(/^#\+END_SRC\s*$/i) && currentChunk) {
        this.addChunk(currentChunk, result);
        currentChunk = null;
        continue;
      }

      if (currentChunk) {
        // Inside chunk - look for references <<name>>
        const refs = line.match(/<<([^>]+)>>/g);
        if (refs) {
          for (const ref of refs) {
            const refName = ref.slice(2, -2);
            if (!currentChunk.references.includes(refName)) {
              currentChunk.references.push(refName);
            }
          }
        }
        currentChunk.content.push(line);
      } else {
        // Parse headings and prose
        const orgHeading = line.match(/^(\*+)\s+(.+)$/);
        const mdHeading = line.match(/^(#{1,6})\s+(.+)$/);

        if (orgHeading) {
          if (proseBuffer.length > 0) {
            this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
            proseBuffer = [];
          }
          result.documentation.push({
            type: 'heading',
            content: orgHeading[2],
            level: orgHeading[1].length,
            lineNumber: this.currentLineNumber,
          });
        } else if (mdHeading) {
          if (proseBuffer.length > 0) {
            this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
            proseBuffer = [];
          }
          result.documentation.push({
            type: 'heading',
            content: mdHeading[2],
            level: mdHeading[1].length,
            lineNumber: this.currentLineNumber,
          });
        } else {
          proseBuffer.push(line);
        }
      }
    }

    // Handle unterminated chunk
    if (currentChunk) {
      this.errors.push({
        line: currentChunk.lineNumber,
        message: `Unterminated Org block: ${currentChunk.name}`,
        severity: 'error',
      });
      this.addChunk(currentChunk, result);
    }

    // Save remaining prose
    if (proseBuffer.length > 0) {
      this.addProseSection(
        proseBuffer.join('\n'),
        result,
        lines.length - proseBuffer.length + 1
      );
    }
  }

  /**
   * Parse Markdown fence style literate programming
   * Format: ```lang {#name .tangle=file} ... ```
   */
  private parseMarkdown(lines: string[], result: ParsedDocument): void {
    let currentChunk: LitChunk | null = null;
    let proseBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      this.currentLineNumber = i + 1;
      const line = lines[i];

      // Check for fenced code block start with attributes: ```lang {#name .tangle=file}
      const fenceStart = line.match(/^```(\w*)\s*(?:\{([^}]*)\})?\s*$/);
      if (fenceStart && !currentChunk) {
        // Save accumulated prose
        if (proseBuffer.length > 0) {
          this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
          proseBuffer = [];
        }

        const language = fenceStart[1] || 'text';
        const attrs = fenceStart[2] || '';

        // Parse attributes: #name .tangle=file .option
        const nameMatch = attrs.match(/#(\S+)/);
        const tangleMatch = attrs.match(/\.tangle=(\S+)/);

        const name = nameMatch ? nameMatch[1] : `block-${i}`;
        const tangleFile = tangleMatch ? tangleMatch[1] : undefined;

        currentChunk = {
          name,
          language,
          content: [],
          targetFile: tangleFile,
          lineNumber: this.currentLineNumber,
          references: [],
        };
        continue;
      }

      // Check for fenced code block end: ```
      if (line.match(/^```\s*$/) && currentChunk) {
        this.addChunk(currentChunk, result);
        currentChunk = null;
        continue;
      }

      if (currentChunk) {
        // Inside chunk - look for references <<name>>
        const refs = line.match(/<<([^>]+)>>/g);
        if (refs) {
          for (const ref of refs) {
            const refName = ref.slice(2, -2);
            if (!currentChunk.references.includes(refName)) {
              currentChunk.references.push(refName);
            }
          }
        }
        currentChunk.content.push(line);
      } else {
        // Parse headings and prose
        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
          if (proseBuffer.length > 0) {
            this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
            proseBuffer = [];
          }
          result.documentation.push({
            type: 'heading',
            content: heading[2],
            level: heading[1].length,
            lineNumber: this.currentLineNumber,
          });
        } else {
          proseBuffer.push(line);
        }
      }
    }

    // Handle unterminated chunk
    if (currentChunk) {
      this.errors.push({
        line: currentChunk.lineNumber,
        message: `Unterminated fenced block: ${currentChunk.name}`,
        severity: 'error',
      });
      this.addChunk(currentChunk, result);
    }

    // Save remaining prose
    if (proseBuffer.length > 0) {
      this.addProseSection(
        proseBuffer.join('\n'),
        result,
        lines.length - proseBuffer.length + 1
      );
    }
  }

  /**
   * Parse document with mixed syntax styles
   */
  private parseMixed(lines: string[], result: ParsedDocument): void {
    let currentChunk: LitChunk | null = null;
    let currentStyle: SyntaxStyle | null = null;
    let proseBuffer: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      this.currentLineNumber = i + 1;
      const line = lines[i];

      // Try to match each style
      const nowebStart = line.match(/^<<([^>]+)>>=\s*$/);
      const orgStart = line.match(
        /^#\+BEGIN_SRC\s+(\w+)(?:\s+:tangle\s+(\S+))?(?:\s+:name\s+(\S+))?/i
      );
      const mdStart = line.match(/^```(\w*)\s*(?:\{([^}]*)\})?\s*$/);

      if (nowebStart && !currentChunk) {
        if (proseBuffer.length > 0) {
          this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
          proseBuffer = [];
        }
        currentStyle = 'noweb';
        const chunkName = nowebStart[1].trim();
        currentChunk = {
          name: chunkName,
          language: this.guessLanguage(chunkName),
          content: [],
          lineNumber: this.currentLineNumber,
          references: [],
        };
        continue;
      }

      if (orgStart && !currentChunk) {
        if (proseBuffer.length > 0) {
          this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
          proseBuffer = [];
        }
        currentStyle = 'orgmode';
        const language = orgStart[1];
        const tangleFile = orgStart[2];
        const name = orgStart[3] || (tangleFile ? `file:${tangleFile}` : `block-${i}`);
        currentChunk = {
          name,
          language,
          content: [],
          targetFile: tangleFile,
          lineNumber: this.currentLineNumber,
          references: [],
        };
        continue;
      }

      if (mdStart && !currentChunk) {
        if (proseBuffer.length > 0) {
          this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
          proseBuffer = [];
        }
        currentStyle = 'markdown';
        const language = mdStart[1] || 'text';
        const attrs = mdStart[2] || '';
        const nameMatch = attrs.match(/#(\S+)/);
        const tangleMatch = attrs.match(/\.tangle=(\S+)/);
        const name = nameMatch ? nameMatch[1] : `block-${i}`;
        const tangleFile = tangleMatch ? tangleMatch[1] : undefined;
        currentChunk = {
          name,
          language,
          content: [],
          targetFile: tangleFile,
          lineNumber: this.currentLineNumber,
          references: [],
        };
        continue;
      }

      // Check for end markers based on current style
      if (currentChunk && currentStyle === 'noweb' && line.match(/^@\s*$/)) {
        this.addChunk(currentChunk, result);
        currentChunk = null;
        currentStyle = null;
        continue;
      }

      if (currentChunk && currentStyle === 'orgmode' && line.match(/^#\+END_SRC\s*$/i)) {
        this.addChunk(currentChunk, result);
        currentChunk = null;
        currentStyle = null;
        continue;
      }

      if (currentChunk && currentStyle === 'markdown' && line.match(/^```\s*$/)) {
        this.addChunk(currentChunk, result);
        currentChunk = null;
        currentStyle = null;
        continue;
      }

      if (currentChunk) {
        const refs = line.match(/<<([^>]+)>>/g);
        if (refs) {
          for (const ref of refs) {
            const refName = ref.slice(2, -2);
            if (!currentChunk.references.includes(refName)) {
              currentChunk.references.push(refName);
            }
          }
        }
        currentChunk.content.push(line);
      } else {
        // Parse headings (markdown or org style)
        const mdHeading = line.match(/^(#{1,6})\s+(.+)$/);
        const orgHeading = line.match(/^(\*+)\s+(.+)$/);

        if (mdHeading) {
          if (proseBuffer.length > 0) {
            this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
            proseBuffer = [];
          }
          result.documentation.push({
            type: 'heading',
            content: mdHeading[2],
            level: mdHeading[1].length,
            lineNumber: this.currentLineNumber,
          });
        } else if (orgHeading) {
          if (proseBuffer.length > 0) {
            this.addProseSection(proseBuffer.join('\n'), result, i - proseBuffer.length + 1);
            proseBuffer = [];
          }
          result.documentation.push({
            type: 'heading',
            content: orgHeading[2],
            level: orgHeading[1].length,
            lineNumber: this.currentLineNumber,
          });
        } else {
          proseBuffer.push(line);
        }
      }
    }

    // Handle unterminated chunk
    if (currentChunk) {
      this.errors.push({
        line: currentChunk.lineNumber,
        message: `Unterminated chunk: ${currentChunk.name}`,
        severity: 'error',
      });
      this.addChunk(currentChunk, result);
    }

    if (proseBuffer.length > 0) {
      this.addProseSection(
        proseBuffer.join('\n'),
        result,
        lines.length - proseBuffer.length + 1
      );
    }
  }

  /**
   * Add a chunk to the document, handling multiple definitions of same name
   */
  private addChunk(chunk: LitChunk, result: ParsedDocument): void {
    const existing = result.chunks.get(chunk.name);
    if (existing) {
      existing.push(chunk);
    } else {
      result.chunks.set(chunk.name, [chunk]);
    }

    // Track file associations
    if (chunk.targetFile) {
      const files = result.fileAssociations.get(chunk.targetFile) || [];
      if (!files.includes(chunk.name)) {
        files.push(chunk.name);
      }
      result.fileAssociations.set(chunk.targetFile, files);
    }
  }

  /**
   * Add a prose section to documentation
   */
  private addProseSection(content: string, result: ParsedDocument, lineNumber: number): void {
    const trimmed = content.trim();
    if (trimmed) {
      result.documentation.push({
        type: 'prose',
        content: trimmed,
        lineNumber,
      });
    }
  }

  /**
   * Validate all chunk references are defined
   */
  private validateReferences(result: ParsedDocument): void {
    for (const [, chunks] of result.chunks) {
      for (const chunk of chunks) {
        for (const ref of chunk.references) {
          if (!result.chunks.has(ref)) {
            this.errors.push({
              line: chunk.lineNumber,
              message: `Reference to undefined chunk: <<${ref}>>`,
              severity: 'error',
            });
          }
        }
      }
    }
  }

  /**
   * Guess language from chunk name
   */
  private guessLanguage(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      lisp: 'lisp',
      el: 'elisp',
      scm: 'scheme',
      md: 'markdown',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      sh: 'shell',
      bash: 'shell',
    };
    return langMap[ext || ''] || 'text';
  }
}

/**
 * Tangle operation - extract code from literate source
 */
export function tangle(doc: ParsedDocument, rootChunk?: string): Map<string, string> {
  const output = new Map<string, string>();
  const expanded = new Set<string>(); // Prevent infinite recursion

  /**
   * Expand a chunk, recursively resolving references
   */
  function expandChunk(name: string, indent: string = ''): string {
    if (expanded.has(name)) {
      return `${indent}/* RECURSIVE: ${name} */`;
    }
    expanded.add(name);

    const chunks = doc.chunks.get(name);
    if (!chunks || chunks.length === 0) {
      expanded.delete(name);
      return `${indent}/* UNDEFINED: ${name} */`;
    }

    const lines: string[] = [];
    for (const chunk of chunks) {
      for (const line of chunk.content) {
        // Check for references <<name>> and expand them
        const refMatch = line.match(/^(\s*)<<([^>]+)>>(\s*)$/);
        if (refMatch) {
          const [, lineIndent, refName] = refMatch;
          const expandedRef = expandChunk(refName, indent + lineIndent);
          lines.push(expandedRef);
        } else if (line.includes('<<') && line.includes('>>')) {
          // Inline references
          let expandedLine = line;
          const refs = line.match(/<<([^>]+)>>/g) || [];
          for (const ref of refs) {
            const refName = ref.slice(2, -2);
            const expandedRef = expandChunk(refName, '');
            expandedLine = expandedLine.replace(ref, expandedRef.trim());
          }
          lines.push(indent + expandedLine);
        } else {
          lines.push(indent + line);
        }
      }
    }

    expanded.delete(name);
    return lines.join('\n');
  }

  // If root chunk specified, only expand that
  if (rootChunk) {
    const content = expandChunk(rootChunk);
    const chunks = doc.chunks.get(rootChunk);
    const targetFile = chunks?.[0]?.targetFile || `${rootChunk}.out`;
    output.set(targetFile, content);
    return output;
  }

  // Otherwise, generate all files based on file associations
  for (const [filename, chunkNames] of doc.fileAssociations) {
    const fileContent: string[] = [];
    for (const name of chunkNames) {
      expanded.clear();
      fileContent.push(expandChunk(name));
    }
    output.set(filename, fileContent.join('\n\n'));
  }

  // Also expand chunks with targetFile set but not in fileAssociations
  for (const [name, chunks] of doc.chunks) {
    for (const chunk of chunks) {
      if (chunk.targetFile && !output.has(chunk.targetFile)) {
        expanded.clear();
        output.set(chunk.targetFile, expandChunk(name));
      }
    }
  }

  return output;
}

export type WeaveFormat = 'markdown' | 'html' | 'latex' | 'text';

/**
 * Weave operation - generate documentation from literate source
 */
export function weave(doc: ParsedDocument, format: WeaveFormat = 'markdown'): string {
  const lines: string[] = [];

  // Interleave documentation and code chunks in order
  const allItems: Array<{
    type: 'doc' | 'chunk';
    lineNumber: number;
    content: LitDocSection | [string, LitChunk[]];
  }> = [];

  for (const section of doc.documentation) {
    allItems.push({ type: 'doc', lineNumber: section.lineNumber, content: section });
  }

  for (const [name, chunks] of doc.chunks) {
    allItems.push({ type: 'chunk', lineNumber: chunks[0].lineNumber, content: [name, chunks] });
  }

  // Sort by line number
  allItems.sort((a, b) => a.lineNumber - b.lineNumber);

  for (const item of allItems) {
    if (item.type === 'doc') {
      const section = item.content as LitDocSection;
      if (section.type === 'heading') {
        lines.push(formatHeading(section.content, section.level || 1, format));
      } else {
        lines.push(formatProse(section.content, format));
      }
    } else {
      const [name, chunks] = item.content as [string, LitChunk[]];
      lines.push(formatCodeBlock(name, chunks, format));
    }
  }

  return lines.join('\n\n');
}

function formatHeading(text: string, level: number, format: WeaveFormat): string {
  switch (format) {
    case 'markdown':
      return '#'.repeat(level) + ' ' + text;
    case 'html':
      return `<h${level}>${escapeHtml(text)}</h${level}>`;
    case 'latex':
      const latexLevels = [
        'chapter',
        'section',
        'subsection',
        'subsubsection',
        'paragraph',
        'subparagraph',
      ];
      return `\\${latexLevels[level - 1] || 'section'}{${text}}`;
    case 'text':
      return text + '\n' + '='.repeat(text.length);
  }
}

function formatProse(text: string, format: WeaveFormat): string {
  switch (format) {
    case 'markdown':
      return text;
    case 'html':
      return `<p>${escapeHtml(text).replace(/\n\n/g, '</p><p>')}</p>`;
    case 'latex':
      return text;
    case 'text':
      return text;
  }
}

function formatCodeBlock(name: string, chunks: LitChunk[], format: WeaveFormat): string {
  const allContent = chunks.map((c) => c.content.join('\n')).join('\n');
  const language = chunks[0]?.language || 'text';

  switch (format) {
    case 'markdown':
      return `**\`<<${name}>>\`** *(${language})*\n\n\`\`\`${language}\n${allContent}\n\`\`\``;
    case 'html':
      return `<div class="chunk"><h4>&lt;&lt;${escapeHtml(name)}&gt;&gt;</h4><pre><code class="language-${language}">${escapeHtml(allContent)}</code></pre></div>`;
    case 'latex':
      return `\\begin{lstlisting}[caption={<<${name}>>},language=${language}]\n${allContent}\n\\end{lstlisting}`;
    case 'text':
      return `<<${name}>>\n${'─'.repeat(40)}\n${allContent}\n${'─'.repeat(40)}`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Get statistics about a parsed document
 */
export function getStats(doc: ParsedDocument): {
  chunkCount: number;
  uniqueChunks: number;
  totalCodeLines: number;
  documentationSections: number;
  filesGenerated: number;
  errors: number;
  warnings: number;
} {
  let totalCodeLines = 0;
  for (const [, chunks] of doc.chunks) {
    for (const chunk of chunks) {
      totalCodeLines += chunk.content.length;
    }
  }

  return {
    chunkCount: Array.from(doc.chunks.values()).reduce((sum, c) => sum + c.length, 0),
    uniqueChunks: doc.chunks.size,
    totalCodeLines,
    documentationSections: doc.documentation.length,
    filesGenerated: doc.fileAssociations.size,
    errors: doc.errors.filter((e) => e.severity === 'error').length,
    warnings: doc.errors.filter((e) => e.severity === 'warning').length,
  };
}
