/**
 * Folder Metadata Tests (fancyfs style)
 *
 * Tests for special folder detection and background image detection.
 *
 * Usage:
 *   npm test examples/fyles/folder-metadata.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getFolderMetadata,
  hasFolderMetadata,
  getFancyFolderIcon,
  getSpecialFolderIcon,
  SpecialFolderType,
} from './folder-metadata';

describe('FolderMetadata - Special Folder Detection', () => {
  test('should detect home directory as special', () => {
    const homeDir = os.homedir();
    const metadata = getFolderMetadata(homeDir);

    expect(metadata.specialType).toBe(SpecialFolderType.Home);
    expect(hasFolderMetadata(homeDir)).toBe(true);
  });

  test('should detect Desktop folder as special', () => {
    const desktopDir = path.join(os.homedir(), 'Desktop');

    // Only test if Desktop exists
    if (fs.existsSync(desktopDir)) {
      const metadata = getFolderMetadata(desktopDir);
      expect(metadata.specialType).toBe(SpecialFolderType.Desktop);
    }
  });

  test('should detect Documents folder as special', () => {
    const docsDir = path.join(os.homedir(), 'Documents');

    // Only test if Documents exists
    if (fs.existsSync(docsDir)) {
      const metadata = getFolderMetadata(docsDir);
      expect(metadata.specialType).toBe(SpecialFolderType.Documents);
    }
  });

  test('should detect Downloads folder as special', () => {
    const dlDir = path.join(os.homedir(), 'Downloads');

    // Only test if Downloads exists
    if (fs.existsSync(dlDir)) {
      const metadata = getFolderMetadata(dlDir);
      expect(metadata.specialType).toBe(SpecialFolderType.Downloads);
    }
  });

  test('should detect Music folder as special', () => {
    const musicDir = path.join(os.homedir(), 'Music');

    // Only test if Music exists
    if (fs.existsSync(musicDir)) {
      const metadata = getFolderMetadata(musicDir);
      expect(metadata.specialType).toBe(SpecialFolderType.Music);
    }
  });

  test('should detect Pictures folder as special', () => {
    const picsDir = path.join(os.homedir(), 'Pictures');

    // Only test if Pictures exists
    if (fs.existsSync(picsDir)) {
      const metadata = getFolderMetadata(picsDir);
      expect(metadata.specialType).toBe(SpecialFolderType.Pictures);
    }
  });

  test('should detect Videos folder as special', () => {
    const vidDir = path.join(os.homedir(), 'Videos');

    // Only test if Videos exists
    if (fs.existsSync(vidDir)) {
      const metadata = getFolderMetadata(vidDir);
      expect(metadata.specialType).toBe(SpecialFolderType.Videos);
    }
  });

  test('should not detect non-special folders', () => {
    const tmpDir = os.tmpdir();
    const metadata = getFolderMetadata(tmpDir);

    expect(metadata.specialType).toBe(SpecialFolderType.None);
  });

  test('should not detect nested special folder names', () => {
    // Create a nested Documents folder
    const nestedDocsDir = path.join(os.tmpdir(), 'test-nested', 'Documents');

    try {
      fs.mkdirSync(path.join(os.tmpdir(), 'test-nested'), { recursive: true });
      fs.mkdirSync(nestedDocsDir, { recursive: true });

      const metadata = getFolderMetadata(nestedDocsDir);
      // Should NOT be special because it's not a direct child of home
      expect(metadata.specialType).toBe(SpecialFolderType.None);
    } finally {
      fs.rmSync(path.join(os.tmpdir(), 'test-nested'), { recursive: true, force: true });
    }
  });
});

describe('FolderMetadata - Background Image Detection', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-bg-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should detect .background.png', () => {
    const bgPath = path.join(testDir, '.background.png');
    fs.writeFileSync(bgPath, 'fake png content');

    const metadata = getFolderMetadata(testDir);
    expect(metadata.backgroundImagePath).toBe(bgPath);
    expect(metadata.backgroundImageType).toBe('png');
  });

  test('should detect .background.jpg', () => {
    const bgPath = path.join(testDir, '.background.jpg');
    fs.writeFileSync(bgPath, 'fake jpg content');

    const metadata = getFolderMetadata(testDir);
    expect(metadata.backgroundImagePath).toBe(bgPath);
    expect(metadata.backgroundImageType).toBe('jpg');
  });

  test('should detect .background.jpeg', () => {
    const bgPath = path.join(testDir, '.background.jpeg');
    fs.writeFileSync(bgPath, 'fake jpeg content');

    const metadata = getFolderMetadata(testDir);
    expect(metadata.backgroundImagePath).toBe(bgPath);
    expect(metadata.backgroundImageType).toBe('jpg');
  });

  test('should detect .background.svg', () => {
    const bgPath = path.join(testDir, '.background.svg');
    fs.writeFileSync(bgPath, '<svg></svg>');

    const metadata = getFolderMetadata(testDir);
    expect(metadata.backgroundImagePath).toBe(bgPath);
    expect(metadata.backgroundImageType).toBe('svg');
  });

  test('should prefer .background.png over other formats', () => {
    // Create all formats
    fs.writeFileSync(path.join(testDir, '.background.png'), 'png');
    fs.writeFileSync(path.join(testDir, '.background.jpg'), 'jpg');
    fs.writeFileSync(path.join(testDir, '.background.svg'), 'svg');

    const metadata = getFolderMetadata(testDir);
    // PNG should be found first (priority order)
    expect(metadata.backgroundImagePath).toBe(path.join(testDir, '.background.png'));
    expect(metadata.backgroundImageType).toBe('png');
  });

  test('should return null when no background image exists', () => {
    const metadata = getFolderMetadata(testDir);
    expect(metadata.backgroundImagePath).toBeNull();
    expect(metadata.backgroundImageType).toBeNull();
  });

  test('should not detect non-background hidden files', () => {
    fs.writeFileSync(path.join(testDir, '.gitignore'), 'content');
    fs.writeFileSync(path.join(testDir, '.hidden.png'), 'content');

    const metadata = getFolderMetadata(testDir);
    expect(metadata.backgroundImagePath).toBeNull();
  });

  test('hasFolderMetadata returns true for folders with background', () => {
    fs.writeFileSync(path.join(testDir, '.background.jpg'), 'content');

    expect(hasFolderMetadata(testDir)).toBe(true);
  });
});

describe('FolderMetadata - Icon Functions', () => {
  test('getSpecialFolderIcon returns correct icons', () => {
    expect(getSpecialFolderIcon(SpecialFolderType.Home)).toBe('🏠');
    expect(getSpecialFolderIcon(SpecialFolderType.Desktop)).toBe('🖥️');
    expect(getSpecialFolderIcon(SpecialFolderType.Documents)).toBe('📑');
    expect(getSpecialFolderIcon(SpecialFolderType.Downloads)).toBe('⬇️');
    expect(getSpecialFolderIcon(SpecialFolderType.Music)).toBe('🎵');
    expect(getSpecialFolderIcon(SpecialFolderType.Pictures)).toBe('🖼️');
    expect(getSpecialFolderIcon(SpecialFolderType.Videos)).toBe('🎬');
    expect(getSpecialFolderIcon(SpecialFolderType.None)).toBe('📁');
  });

  test('getFancyFolderIcon returns special icon for home', () => {
    const homeDir = os.homedir();
    expect(getFancyFolderIcon(homeDir)).toBe('🏠');
  });

  test('getFancyFolderIcon returns background indicator for folders with background', () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-icon-test-'));
    try {
      fs.writeFileSync(path.join(testDir, '.background.png'), 'content');

      // Should show background indicator
      expect(getFancyFolderIcon(testDir)).toBe('📁🎨');
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('getFancyFolderIcon returns regular folder icon for normal folders', () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-icon-test2-'));
    try {
      expect(getFancyFolderIcon(testDir)).toBe('📁');
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
});

describe('FolderMetadata - Integration with FileItem', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-fileitem-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('createFileItem includes folder metadata for special folders', async () => {
    // Import dynamically to avoid circular dependency issues
    const { createFileItem } = await import('./file-item');

    // Create a fake Desktop folder structure for testing
    const fakeDesktopParent = path.join(testDir, 'fakehome');
    const fakeDesktop = path.join(fakeDesktopParent, 'Desktop');
    fs.mkdirSync(fakeDesktopParent, { recursive: true });
    fs.mkdirSync(fakeDesktop);

    // Create a regular subfolder inside testDir
    const subfolderName = 'subfolder';
    fs.mkdirSync(path.join(testDir, subfolderName));

    // Read the directory
    const dirents = fs.readdirSync(testDir, { withFileTypes: true });
    const subfolderDirent = dirents.find((d) => d.name === subfolderName && d.isDirectory());

    if (subfolderDirent) {
      const fileItem = createFileItem(subfolderDirent, testDir);
      expect(fileItem.isDirectory).toBe(true);
      // Regular subfolder should not have special type
      expect(fileItem.specialFolderType).toBeUndefined();
    }
  });

  test('createFileItem includes background image path when present', async () => {
    const { createFileItem } = await import('./file-item');

    // Create a folder with a background image
    const folderName = 'fancy-folder';
    const folderPath = path.join(testDir, folderName);
    fs.mkdirSync(folderPath);
    fs.writeFileSync(path.join(folderPath, '.background.svg'), '<svg></svg>');

    // Read the directory
    const dirents = fs.readdirSync(testDir, { withFileTypes: true });
    const folderDirent = dirents.find((d) => d.name === folderName && d.isDirectory());

    if (folderDirent) {
      const fileItem = createFileItem(folderDirent, testDir);
      expect(fileItem.isDirectory).toBe(true);
      expect(fileItem.backgroundImagePath).toBe(path.join(folderPath, '.background.svg'));
    }
  });

  test('getFileIcon returns fancy icon for folders with background', async () => {
    const { createFileItem, getFileIcon } = await import('./file-item');

    // Create a folder with a background image
    const folderName = 'artsy-folder';
    const folderPath = path.join(testDir, folderName);
    fs.mkdirSync(folderPath);
    fs.writeFileSync(path.join(folderPath, '.background.png'), 'fake png');

    // Read the directory
    const dirents = fs.readdirSync(testDir, { withFileTypes: true });
    const folderDirent = dirents.find((d) => d.name === folderName && d.isDirectory());

    if (folderDirent) {
      const fileItem = createFileItem(folderDirent, testDir);
      const icon = getFileIcon(fileItem);
      // Should have the art indicator since it has a background
      expect(icon).toBe('📁🎨');
    }
  });
});
