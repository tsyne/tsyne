/**
 * HexView Tests
 */

import { TsyneTest } from '../../core/src/index-test';
import { createHexViewApp, HexViewBuffer } from './hexview';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('HexViewBuffer Logic', () => {
  let tempFile: string;
  let buffer: HexViewBuffer;

  beforeAll(() => {
    // Create a temp file with known content
    // Use 512 bytes (32 rows) to allow scroll testing with DEFAULT_VISIBLE_ROWS=20
    tempFile = path.join(os.tmpdir(), 'hexview-test.bin');
    const data = Buffer.alloc(512);
    for (let i = 0; i < 512; i++) {
      data[i] = i % 256;
    }
    fs.writeFileSync(tempFile, data);
  });

  afterAll(() => {
    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    buffer = new HexViewBuffer(tempFile);
    await buffer.load();
  });

  describe('file loading', () => {
    it('should load file correctly', () => {
      expect(buffer.getSize()).toBe(512);
      expect(buffer.getFilePath()).toBe(tempFile);
    });

    it('should read bytes correctly', () => {
      expect(buffer.getByte(0)).toBe(0);
      expect(buffer.getByte(255)).toBe(255);
      expect(buffer.getByte(128)).toBe(128);
    });

    it('should return null for out of bounds', () => {
      expect(buffer.getByte(-1)).toBe(null);
      expect(buffer.getByte(512)).toBe(null);
    });

    it('should get multiple bytes', () => {
      const bytes = buffer.getBytes(0, 4);
      expect(bytes).toEqual([0, 1, 2, 3]);
    });
  });

  describe('formatting', () => {
    it('should format first row correctly', () => {
      const row = buffer.formatRow(0);
      expect(row).not.toBeNull();
      expect(row!.address).toBe('00000000');
      expect(row!.hex).toContain('00 01 02');
      expect(row!.ascii.length).toBe(16);
    });

    it('should calculate row count correctly', () => {
      // 512 bytes / 16 bytes per row = 32 rows
      expect(buffer.getRowCount()).toBe(32);
    });

    it('should return null for invalid row', () => {
      const row = buffer.formatRow(100);
      expect(row).toBeNull();
    });
  });

  describe('scrolling', () => {
    it('should start at offset 0', () => {
      expect(buffer.getScrollOffset()).toBe(0);
    });

    it('should allow scroll within bounds', () => {
      buffer.setScrollOffset(5);
      expect(buffer.getScrollOffset()).toBe(5);
    });

    it('should clamp negative scroll', () => {
      buffer.setScrollOffset(-10);
      expect(buffer.getScrollOffset()).toBe(0);
    });
  });

  describe('cursor', () => {
    it('should start at offset 0', () => {
      expect(buffer.getCursorOffset()).toBe(0);
    });

    it('should allow cursor movement', () => {
      buffer.setCursorOffset(100);
      expect(buffer.getCursorOffset()).toBe(100);
    });

    it('should clamp cursor to bounds', () => {
      buffer.setCursorOffset(1000);
      expect(buffer.getCursorOffset()).toBe(511);
    });
  });

  describe('selection', () => {
    it('should have no selection initially', () => {
      expect(buffer.getSelection()).toBeNull();
    });

    it('should set selection', () => {
      buffer.setSelection(10, 20);
      const sel = buffer.getSelection();
      expect(sel).not.toBeNull();
      expect(sel!.start).toBe(10);
      expect(sel!.end).toBe(20);
    });

    it('should clear selection', () => {
      buffer.setSelection(10, 20);
      buffer.clearSelection();
      expect(buffer.getSelection()).toBeNull();
    });
  });
});

describe('HexView UI', () => {
  let tsyneTest: TsyneTest;

  beforeAll(() => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  it('should create the app with toolbar buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createHexViewApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Check Open button exists
    await ctx.getById('openBtn').shouldExist();
  }, 30000);

  it('should have navigation buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createHexViewApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Check navigation buttons exist
    await ctx.getById('topBtn').shouldExist();
    await ctx.getById('pageUpBtn').shouldExist();
    await ctx.getById('upBtn').shouldExist();
    await ctx.getById('downBtn').shouldExist();
    await ctx.getById('pageDownBtn').shouldExist();
    await ctx.getById('bottomBtn').shouldExist();
  }, 30000);

  it('should show no file loaded status initially', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createHexViewApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('statusLabel').within(500).shouldBe('No file loaded');
  }, 30000);

  it('should have header row', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createHexViewApp(app);
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('addrHeader').shouldExist();
    await ctx.getById('hexHeader').shouldExist();
    await ctx.getById('asciiHeader').shouldExist();
  }, 30000);
});
