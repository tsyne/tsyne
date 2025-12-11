/**
 * Unit tests for app-metadata.ts
 * Tests the @tsyne-app metadata parser including heredoc support.
 */

import { parseAppMetadata } from './app-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('parseAppMetadata', () => {
  const tmpDir = path.join(os.tmpdir(), 'tsyne-metadata-tests');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup temp files
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tmpDir, file));
      }
      fs.rmdirSync(tmpDir);
    }
  });

  function createTempFile(content: string): string {
    const filename = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`;
    const filepath = path.join(tmpDir, filename);
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  test('should return null for file without @tsyne-app:name', () => {
    const filepath = createTempFile(`
      // Just a regular TypeScript file
      export function doSomething() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).toBeNull();
  });

  test('should return null for file with name but no builder', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name Test App
      export function doSomething() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).toBeNull();
  });

  test('should parse basic metadata with single-line icon', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name Calculator
      // @tsyne-app:icon calculate
      // @tsyne-app:category utilities
      // @tsyne-app:builder buildCalculator
      export function buildCalculator() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Calculator');
    expect(result!.icon).toBe('calculate');
    expect(result!.iconIsSvg).toBe(false);
    expect(result!.category).toBe('utilities');
    expect(result!.builder).toBe('buildCalculator');
  });

  test('should parse inline SVG icon', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name Test
      // @tsyne-app:icon <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
      // @tsyne-app:builder buildTest
      export function buildTest() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.icon).toBe('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>');
    expect(result!.iconIsSvg).toBe(true);
  });

  test('should parse heredoc icon in JSDoc comment', () => {
    const filepath = createTempFile(`
/**
 * Test App
 * @tsyne-app:name Checklist
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
 *   <path d="M9 11l3 3L22 4"/>
 *   <path d="M21 12v7a2 2 0 01-2 2H5"/>
 * </svg>
 * SVG
 * @tsyne-app:builder buildChecklist
 */
export function buildChecklist() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Checklist');
    expect(result!.iconIsSvg).toBe(true);
    expect(result!.icon).toContain('<svg viewBox="0 0 24 24"');
    expect(result!.icon).toContain('<path d="M9 11l3 3L22 4"/>');
    expect(result!.icon).toContain('</svg>');
    expect(result!.builder).toBe('buildChecklist');
  });

  test('heredoc only works in JSDoc comments (not // comments)', () => {
    // Heredoc syntax requires JSDoc-style comments (* prefix)
    // because the parser strips * prefix from content lines
    // This test documents this limitation
    const filepath = createTempFile(`
// @tsyne-app:name LineCommentApp
// @tsyne-app:icon <<ICON
// <svg viewBox="0 0 24 24">
// </svg>
// ICON
// @tsyne-app:builder buildLineCommentApp
export function buildLineCommentApp() {}
    `);
    const result = parseAppMetadata(filepath);
    // Returns null because heredoc isn't properly closed in // comment style
    expect(result).toBeNull();
  });

  test('should parse count directive', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name MultiInstance
      // @tsyne-app:builder buildMulti
      // @tsyne-app:count many
      export function buildMulti() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.count).toBe('many');
  });

  test('should parse desktop-many count', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name DesktopMulti
      // @tsyne-app:builder buildDesktopMulti
      // @tsyne-app:count desktop-many
      export function buildDesktopMulti() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.count).toBe('desktop-many');
  });

  test('should default count to one', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name SingleInstance
      // @tsyne-app:builder buildSingle
      export function buildSingle() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.count).toBe('one');
  });

  test('should parse args directive', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name WithArgs
      // @tsyne-app:builder buildWithArgs
      // @tsyne-app:args app,resources,config
      export function buildWithArgs() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.args).toEqual(['app', 'resources', 'config']);
  });

  test('should default args to ["app"]', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name NoArgs
      // @tsyne-app:builder buildNoArgs
      export function buildNoArgs() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.args).toEqual(['app']);
  });

  test('should parse contentBuilder directive', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name WithContent
      // @tsyne-app:builder buildWithContent
      // @tsyne-app:contentBuilder buildWithContentContent
      export function buildWithContent() {}
      export function buildWithContentContent() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.contentBuilder).toBe('buildWithContentContent');
  });

  test('should use default icon when none specified', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name NoIcon
      // @tsyne-app:builder buildNoIcon
      export function buildNoIcon() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.icon).toContain('<svg');
    expect(result!.iconIsSvg).toBe(true);
  });

  test('should set filePath correctly', () => {
    const filepath = createTempFile(`
      // @tsyne-app:name PathTest
      // @tsyne-app:builder buildPathTest
      export function buildPathTest() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe(filepath);
  });

  test('should handle heredoc with custom tag name', () => {
    const filepath = createTempFile(`
/**
 * @tsyne-app:name CustomTag
 * @tsyne-app:icon <<MYSVG
 * <svg><circle/></svg>
 * MYSVG
 * @tsyne-app:builder buildCustomTag
 */
export function buildCustomTag() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    expect(result!.icon).toContain('<svg><circle/></svg>');
  });

  test('should strip JSDoc asterisk prefixes from heredoc content', () => {
    const filepath = createTempFile(`
/**
 * @tsyne-app:name StripPrefix
 * @tsyne-app:icon <<SVG
 *     <svg>
 *       <path d="M1 2"/>
 *     </svg>
 * SVG
 * @tsyne-app:builder buildStripPrefix
 */
export function buildStripPrefix() {}
    `);
    const result = parseAppMetadata(filepath);
    expect(result).not.toBeNull();
    // Should not have leading asterisks in the content
    expect(result!.icon).not.toContain('*');
    expect(result!.icon).toContain('<svg>');
    expect(result!.icon).toContain('<path d="M1 2"/>');
  });
});
