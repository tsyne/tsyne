import * as fs from 'fs';
import { WidgetMetadata } from './metadata';

/**
 * SourceCodeEditor - Text-based editor for updating TypeScript source code
 * Uses direct text replacement instead of AST manipulation
 */
export class SourceCodeEditor {
  private sourceCode: string;
  private lines: string[];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.sourceCode = fs.readFileSync(filePath, 'utf8');
    this.lines = this.sourceCode.split('\n');
  }

  /**
   * Update a widget property by direct text replacement
   */
  updateWidgetProperty(
    metadata: WidgetMetadata,
    property: string,
    newValue: any
  ): boolean {
    const { line, column } = metadata.sourceLocation;

    if (line === 0 || line > this.lines.length) {
      console.warn('Invalid line number:', line);
      return false;
    }

    const lineIndex = line - 1; // Convert to 0-indexed
    const lineContent = this.lines[lineIndex];

    try {
      if (property === 'text') {
        // Handle button, label, etc. - replace the first string literal after column
        const beforeColumn = lineContent.substring(0, column);
        const afterColumn = lineContent.substring(column);

        // Find the first string literal (single or double quoted)
        const match = afterColumn.match(/(['"])((?:(?!\1).)*)\1/);

        if (match) {
          const quote = match[1];
          const oldText = match[2];
          const startIndex = column + afterColumn.indexOf(match[0]);
          const endIndex = startIndex + match[0].length;

          // Replace the matched string with new value
          const updatedLine =
            lineContent.substring(0, startIndex) +
            `${quote}${newValue}${quote}` +
            lineContent.substring(endIndex);

          this.lines[lineIndex] = updatedLine;
          return true;
        }
      }

      console.warn('Could not find property to update:', property);
      return false;
    } catch (error) {
      console.error('Error updating property:', error);
      return false;
    }
  }

  /**
   * Add a widget to a container
   */
  addWidget(
    parentMetadata: WidgetMetadata,
    widgetType: string,
    properties: Record<string, any>
  ): boolean {
    const parentLine = parentMetadata.sourceLocation.line - 1;

    // Find the closing brace of the parent container's builder function
    const closingBraceLine = this.findClosingBrace(parentLine);

    if (closingBraceLine === -1) {
      console.warn('Could not find closing brace for parent');
      return false;
    }

    // Get indentation from parent line
    const indentation = this.getIndentation(parentLine);
    const childIndentation = indentation + '  ';

    // Generate widget code
    const widgetCode = this.generateWidgetCode(widgetType, properties, childIndentation);

    // Insert before closing brace
    this.lines.splice(closingBraceLine, 0, widgetCode);

    return true;
  }

  /**
   * Remove a widget from source code
   */
  removeWidget(metadata: WidgetMetadata): boolean {
    const lineIndex = metadata.sourceLocation.line - 1;

    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      return false;
    }

    // Simple approach: remove the line
    // TODO: Handle multi-line widgets
    this.lines.splice(lineIndex, 1);

    return true;
  }

  /**
   * Get the updated source code
   */
  getSourceCode(): string {
    return this.lines.join('\n');
  }

  /**
   * Save the updated source code to file
   */
  save(outputPath?: string): void {
    const targetPath = outputPath || this.filePath;
    fs.writeFileSync(targetPath, this.getSourceCode(), 'utf8');
  }

  /**
   * Create a backup of the original file
   */
  backup(): void {
    const backupPath = `${this.filePath}.backup`;
    fs.writeFileSync(backupPath, this.sourceCode, 'utf8');
  }

  /**
   * Get indentation of a line
   */
  private getIndentation(lineIndex: number): string {
    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      return '';
    }

    const line = this.lines[lineIndex];
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Find the closing brace for a block starting at lineIndex
   */
  private findClosingBrace(startLine: number): number {
    let braceCount = 0;
    let foundOpenBrace = false;

    for (let i = startLine; i < this.lines.length; i++) {
      const line = this.lines[i];

      // Count opening braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      braceCount += openBraces;
      braceCount -= closeBraces;

      if (openBraces > 0) {
        foundOpenBrace = true;
      }

      // When we've found an opening brace and count returns to 0, we found the closing brace
      if (foundOpenBrace && braceCount === 0) {
        // Return the line before the closing brace (where we want to insert)
        return i;
      }
    }

    return -1;
  }

  /**
   * Generate widget code for a given widget type
   */
  private generateWidgetCode(
    widgetType: string,
    properties: Record<string, any>,
    indentation: string
  ): string {
    switch (widgetType) {
      case 'label':
        return `${indentation}label('${properties.text || 'New Label'}');`;

      case 'button':
        return `${indentation}button('${properties.text || 'New Button'}', () => {\n${indentation}  console.log('Button clicked');\n${indentation}});`;

      case 'entry':
        return `${indentation}entry('${properties.placeholder || ''}');`;

      case 'vbox':
        return `${indentation}vbox(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      case 'hbox':
        return `${indentation}hbox(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      default:
        return `${indentation}${widgetType}();`;
    }
  }
}
