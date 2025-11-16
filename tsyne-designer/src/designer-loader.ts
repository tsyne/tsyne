import * as fs from 'fs';
import * as path from 'path';
import { DesignerApp } from './designer-app';

/**
 * DesignerLoader - Loads and executes TypeScript files in design mode
 */
export class DesignerLoader {
  /**
   * Load a TypeScript file and execute it in design mode
   * @param filePath Path to the TypeScript file
   * @returns DesignerApp instance with captured metadata
   */
  static async loadFile(filePath: string): Promise<DesignerApp> {
    // Read the original file
    const sourceCode = fs.readFileSync(filePath, 'utf8');

    // Create a modified version with designer imports
    const modifiedCode = this.swapImports(sourceCode);

    // Write to a temporary file
    const tempPath = path.join('/tmp', `designer-${Date.now()}.ts`);
    fs.writeFileSync(tempPath, modifiedCode, 'utf8');

    try {
      // Clear require cache
      delete require.cache[require.resolve(tempPath)];

      // Require the modified file
      // Note: This will execute the code and populate the designer app
      const { getDesignerApp, resetDesignerState } = require('./index');

      // Reset state before loading
      resetDesignerState();

      // Execute the file
      require(tempPath);

      // Get the designer app that was created
      const designerApp = getDesignerApp();

      if (!designerApp) {
        throw new Error('No designer app was created during execution');
      }

      return designerApp;
    } finally {
      // Clean up temp file
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Swap imports from 'tsyne' to 'tsyne-designer'
   * Uses simple text replacement (sed-like approach)
   */
  private static swapImports(sourceCode: string): string {
    // Replace import from '../src' (examples use relative imports)
    let modified = sourceCode.replace(
      /from\s+['"]\.\.\/src['"]/g,
      "from 'tsyne-designer'"
    );

    // Replace import from 'tsyne'
    modified = modified.replace(
      /from\s+['"]tsyne['"]/g,
      "from 'tsyne-designer'"
    );

    // Replace require('../src')
    modified = modified.replace(
      /require\(['"]\.\.\/src['"]\)/g,
      "require('tsyne-designer')"
    );

    // Replace require('tsyne')
    modified = modified.replace(
      /require\(['"]tsyne['"]\)/g,
      "require('tsyne-designer')"
    );

    return modified;
  }

  /**
   * Preview: Show what the modified imports would look like
   */
  static previewSwappedImports(filePath: string): { original: string; modified: string } {
    const original = fs.readFileSync(filePath, 'utf8');
    const modified = this.swapImports(original);

    return { original, modified };
  }
}
