/**
 * Hexview - Hexadecimal File Viewer
 *
 * Ported from ChrysaLisp: https://github.com/vygr/ChrysaLisp/blob/master/apps/hexview/app.lisp
 * Original authors: ChrysaLisp contributors
 * License: See original repository
 *
 * A hex viewer application for examining file contents in hexadecimal format.
 *
 * @tsyne-app:name HexView
 * @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01"/></svg>
 * @tsyne-app:category utilities
 * @tsyne-app:builder createHexViewApp
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';
import * as fs from 'fs';

// Number of bytes per row
const BYTES_PER_ROW = 16;
// Number of rows to display
const DEFAULT_VISIBLE_ROWS = 20;

/**
 * Format a number as a hex string with padding
 */
function toHex(num: number, padding: number = 2): string {
  return num.toString(16).toUpperCase().padStart(padding, '0');
}

/**
 * Format a byte as a printable ASCII character or dot
 */
function toAscii(byte: number): string {
  if (byte >= 32 && byte <= 126) {
    return String.fromCharCode(byte);
  }
  return '.';
}

/**
 * HexViewBuffer - represents a file loaded for hex viewing
 */
export class HexViewBuffer {
  private data: Buffer;
  private filePath: string;
  private cursorOffset: number = 0;
  private selectionStart: number = -1;
  private selectionEnd: number = -1;
  private scrollOffset: number = 0;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.data = Buffer.alloc(0);
  }

  async load(): Promise<void> {
    try {
      this.data = fs.readFileSync(this.filePath);
    } catch (e) {
      this.data = Buffer.alloc(0);
      throw e;
    }
  }

  getFilePath(): string {
    return this.filePath;
  }

  getSize(): number {
    return this.data.length;
  }

  getByte(offset: number): number | null {
    if (offset < 0 || offset >= this.data.length) {
      return null;
    }
    return this.data[offset];
  }

  getBytes(offset: number, count: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const byte = this.getByte(offset + i);
      if (byte !== null) {
        result.push(byte);
      }
    }
    return result;
  }

  getCursorOffset(): number {
    return this.cursorOffset;
  }

  setCursorOffset(offset: number): void {
    this.cursorOffset = Math.max(0, Math.min(offset, this.data.length - 1));
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  setScrollOffset(offset: number): void {
    const maxOffset = Math.max(0, Math.floor(this.data.length / BYTES_PER_ROW) - DEFAULT_VISIBLE_ROWS + 1);
    this.scrollOffset = Math.max(0, Math.min(offset, maxOffset));
  }

  setSelection(start: number, end: number): void {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  clearSelection(): void {
    this.selectionStart = -1;
    this.selectionEnd = -1;
  }

  getSelection(): { start: number; end: number } | null {
    if (this.selectionStart < 0) return null;
    return { start: this.selectionStart, end: this.selectionEnd };
  }

  /**
   * Get the total number of rows
   */
  getRowCount(): number {
    return Math.ceil(this.data.length / BYTES_PER_ROW);
  }

  /**
   * Format a single row of hex data
   */
  formatRow(rowIndex: number): { address: string; hex: string; ascii: string } | null {
    const offset = rowIndex * BYTES_PER_ROW;
    if (offset >= this.data.length) {
      return null;
    }

    const bytes = this.getBytes(offset, BYTES_PER_ROW);
    if (bytes.length === 0) return null;

    const address = toHex(offset, 8);
    const hexParts: string[] = [];
    const asciiParts: string[] = [];

    for (let i = 0; i < BYTES_PER_ROW; i++) {
      if (i < bytes.length) {
        hexParts.push(toHex(bytes[i]));
        asciiParts.push(toAscii(bytes[i]));
      } else {
        hexParts.push('  ');
        asciiParts.push(' ');
      }
    }

    // Group hex bytes with space every 8 bytes
    const hex = hexParts.slice(0, 8).join(' ') + '  ' + hexParts.slice(8).join(' ');
    const ascii = asciiParts.join('');

    return { address, hex, ascii };
  }
}

/**
 * HexView UI class
 */
export class HexViewUI {
  private a: App;
  private win: Window | null = null;
  private buffer: HexViewBuffer | null = null;
  private statusLabel: Label | null = null;
  private fileLabel: Label | null = null;
  private hexDisplay: Label[] = [];
  private visibleRows: number = DEFAULT_VISIBLE_ROWS;

  constructor(a: App) {
    this.a = a;
  }

  async loadFile(filePath: string): Promise<void> {
    try {
      this.buffer = new HexViewBuffer(filePath);
      await this.buffer.load();
      this.refreshUI();
    } catch (e) {
      if (this.win) {
        await this.win.showError('Error', `Failed to load file: ${e}`);
      }
    }
  }

  private async openFile(): Promise<void> {
    if (!this.win) return;

    const filePath = await this.win.showFileOpen();
    if (filePath) {
      await this.loadFile(filePath);
    }
  }

  private scrollUp(lines: number = 1): void {
    if (!this.buffer) return;
    this.buffer.setScrollOffset(this.buffer.getScrollOffset() - lines);
    this.refreshUI();
  }

  private scrollDown(lines: number = 1): void {
    if (!this.buffer) return;
    this.buffer.setScrollOffset(this.buffer.getScrollOffset() + lines);
    this.refreshUI();
  }

  private scrollToTop(): void {
    if (!this.buffer) return;
    this.buffer.setScrollOffset(0);
    this.refreshUI();
  }

  private scrollToBottom(): void {
    if (!this.buffer) return;
    const maxOffset = Math.max(0, this.buffer.getRowCount() - this.visibleRows);
    this.buffer.setScrollOffset(maxOffset);
    this.refreshUI();
  }

  private updateStatus(): void {
    if (!this.statusLabel || !this.buffer) return;

    const offset = this.buffer.getScrollOffset() * BYTES_PER_ROW;
    const total = this.buffer.getSize();
    const percent = total > 0 ? Math.round((offset / total) * 100) : 0;
    this.statusLabel.setText(`Offset: ${toHex(offset, 8)} | Size: ${total} bytes | ${percent}%`);
  }

  private refreshUI(): void {
    if (this.win) {
      this.win.setContent(() => this.buildUI(this.win!));
    }
  }

  buildUI(win: Window): void {
    this.win = win;
    this.hexDisplay = [];

    this.a.vbox(() => {
      // Toolbar
      this.a.hbox(() => {
        this.a.button('Open').onClick(() => this.openFile()).withId('openBtn');
        this.a.spacer();
        this.fileLabel = this.a.label(
          this.buffer ? this.buffer.getFilePath() : 'No file loaded'
        ).withId('fileLabel');
      });

      this.a.separator();

      // Header row
      this.a.hbox(() => {
        this.a.label('Address ', 'hex-header').withId('addrHeader');
        this.a.label(' 00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F', 'hex-header').withId('hexHeader');
        this.a.label('  ASCII', 'hex-header').withId('asciiHeader');
      });

      this.a.separator();

      // Hex display area with scroll
      this.a.scroll(() => {
        this.a.vbox(() => {
          if (this.buffer && this.buffer.getSize() > 0) {
            const startRow = this.buffer.getScrollOffset();
            const endRow = Math.min(startRow + this.visibleRows, this.buffer.getRowCount());

            for (let i = startRow; i < endRow; i++) {
              const row = this.buffer.formatRow(i);
              if (row) {
                this.a.hbox(() => {
                  this.a.label(`${row.address} `, 'hex-address').withId(`addr-${i}`);
                  this.a.label(row.hex, 'hex-bytes').withId(`hex-${i}`);
                  this.a.label(`  ${row.ascii}`, 'hex-ascii').withId(`ascii-${i}`);
                });
              }
            }
          } else {
            this.a.label('No file loaded. Click Open to load a file.');
          }
        });
      });

      this.a.separator();

      // Navigation buttons
      this.a.hbox(() => {
        this.a.button('Top').onClick(() => this.scrollToTop()).withId('topBtn');
        this.a.button('Page Up').onClick(() => this.scrollUp(this.visibleRows)).withId('pageUpBtn');
        this.a.button('Up').onClick(() => this.scrollUp()).withId('upBtn');
        this.a.button('Down').onClick(() => this.scrollDown()).withId('downBtn');
        this.a.button('Page Down').onClick(() => this.scrollDown(this.visibleRows)).withId('pageDownBtn');
        this.a.button('Bottom').onClick(() => this.scrollToBottom()).withId('bottomBtn');
      });

      this.a.separator();

      // Status bar
      this.a.hbox(() => {
        this.statusLabel = this.a.label(
          this.buffer
            ? `Offset: ${toHex(this.buffer.getScrollOffset() * BYTES_PER_ROW, 8)} | Size: ${this.buffer.getSize()} bytes`
            : 'No file loaded'
        ).withId('statusLabel');
      });
    });
  }
}

/**
 * Create the HexView app
 */
export function createHexViewApp(a: App): HexViewUI {
  const ui = new HexViewUI(a);

  a.window({ title: 'HexView', width: 700, height: 600 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// HexViewBuffer class is already exported above

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'HexView' }, async (a: App) => {
    const ui = createHexViewApp(a);
    await a.run();

    // If a file argument is provided, load it
    const args = process.argv.slice(2);
    if (args.length > 0) {
      await ui.loadFile(args[0]);
    }
  });
}
