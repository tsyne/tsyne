/**
 * Terminal Emulator for Tsyne
 *
 * Fully-featured port from https://github.com/fyne-io/terminal
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * This implementation provides:
 * - Real shell execution via node-pty (proper pseudo-terminal)
 * - SIGWINCH handling for terminal resize
 * - Full ANSI/VT100 escape sequence parsing
 * - 8/16/256 color support
 * - Cursor positioning and movement
 * - Text attributes (bold, italic, underline, etc.)
 * - Scroll regions and scrollback buffer
 * - Mouse support (basic)
 * - Text selection
 * - Keyboard input handling with proper escape sequences
 *
 * Based on the original Fyne terminal structure:
 * - term.go → Terminal class (main terminal state and PTY management)
 * - escape.go → AnsiParser class (escape sequence parsing)
 * - color.go → Color handling
 * - input.go → Keyboard input handling
 * - output.go → Output processing
 * - render.go → TextGrid rendering
 */

// @tsyne-app:name Terminal
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8l4 4-4 4"/><path d="M12 16h6"/></svg>
// @tsyne-app:category utilities
// @tsyne-app:builder createTerminalApp
// @tsyne-app:count many
// @tsyne-app:args app, desktop

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { ITsyneWindow } from '../../core/src/tsyne-window';
import type { TextGrid, TextGridStyle } from '../../core/src/widgets';
import type { IDesktopService } from '../../core/src/services';
import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import * as os from 'os';
import * as path from 'path';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const MAX_SCROLLBACK = 1000;

// Charset designators
enum Charset {
  ASCII = 'B',         // US ASCII (default)
  DECSpecialGraphics = '0', // DEC Special Graphics (box drawing)
  UK = 'A',            // UK charset
}

// DEC Special Graphics character mapping
// Maps ASCII characters 0x60-0x7E to Unicode box-drawing and special characters
const DEC_SPECIAL_GRAPHICS: { [key: string]: string } = {
  '`': '◆', // Diamond
  'a': '▒', // Checkerboard
  'b': '␉', // HT symbol
  'c': '␌', // FF symbol
  'd': '␍', // CR symbol
  'e': '␊', // LF symbol
  'f': '°', // Degree symbol
  'g': '±', // Plus/minus
  'h': '␤', // NL symbol
  'i': '␋', // VT symbol
  'j': '┘', // Lower right corner
  'k': '┐', // Upper right corner
  'l': '┌', // Upper left corner
  'm': '└', // Lower left corner
  'n': '┼', // Crossing lines
  'o': '⎺', // Scan line 1 (top)
  'p': '⎻', // Scan line 3
  'q': '─', // Horizontal line (scan line 5)
  'r': '⎼', // Scan line 7
  's': '⎽', // Scan line 9 (bottom)
  't': '├', // Left tee
  'u': '┤', // Right tee
  'v': '┴', // Bottom tee
  'w': '┬', // Top tee
  'x': '│', // Vertical line
  'y': '≤', // Less than or equal
  'z': '≥', // Greater than or equal
  '{': 'π', // Pi
  '|': '≠', // Not equal
  '}': '£', // Pound sterling
  '~': '·', // Middle dot / bullet
};

// ANSI color palette (standard 16 colors)
const ANSI_COLORS: string[] = [
  '#000000', // 0: Black
  '#cd0000', // 1: Red
  '#00cd00', // 2: Green
  '#cdcd00', // 3: Yellow
  '#0000ee', // 4: Blue
  '#cd00cd', // 5: Magenta
  '#00cdcd', // 6: Cyan
  '#e5e5e5', // 7: White
  '#7f7f7f', // 8: Bright Black (Gray)
  '#ff0000', // 9: Bright Red
  '#00ff00', // 10: Bright Green
  '#ffff00', // 11: Bright Yellow
  '#5c5cff', // 12: Bright Blue
  '#ff00ff', // 13: Bright Magenta
  '#00ffff', // 14: Bright Cyan
  '#ffffff', // 15: Bright White
];

// Generate 256 color palette
function generate256ColorPalette(): string[] {
  const palette: string[] = [...ANSI_COLORS];

  // Colors 16-231: 6x6x6 color cube
  const levels = [0, 95, 135, 175, 215, 255];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        palette.push(
          `#${levels[r].toString(16).padStart(2, '0')}${levels[g].toString(16).padStart(2, '0')}${levels[b].toString(16).padStart(2, '0')}`
        );
      }
    }
  }

  // Colors 232-255: grayscale
  for (let i = 0; i < 24; i++) {
    const gray = 8 + i * 10;
    palette.push(`#${gray.toString(16).padStart(2, '0').repeat(3)}`);
  }

  return palette;
}

const COLOR_PALETTE = generate256ColorPalette();

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Cell attributes for terminal rendering
 * Based on: escape.go handleSGR
 */
interface CellAttributes {
  fgColor: number; // -1 for default, 0-255 for palette
  bgColor: number; // -1 for default, 0-255 for palette
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  blink: boolean;
  inverse: boolean;
  hidden: boolean;
  strikethrough: boolean;
}

/**
 * Terminal cell
 * Based on: term.go cell structure
 */
interface Cell {
  char: string;
  attrs: CellAttributes;
}

/**
 * Terminal configuration
 * Based on: Config struct in term.go
 */
interface TerminalConfig {
  cols: number;
  rows: number;
  title: string;
  cwd: string;
}

/**
 * Selection mode - linear (normal) or block (rectangular)
 */
export enum SelectionMode {
  Linear = 'linear',   // Normal line-based selection
  Block = 'block',     // Rectangular/column selection (Alt+drag)
}

/**
 * Selection state for text selection
 * Based on: select.go
 */
export interface Selection {
  active: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  mode: SelectionMode;
}

/**
 * Touch event types for mobile/touch support
 * Based on: Fyne's mobile event handling
 */
export enum TouchEventType {
  TouchDown = 'touchDown',
  TouchMove = 'touchMove',
  TouchUp = 'touchUp',
  TouchCancel = 'touchCancel',
}

/**
 * Touch event data
 */
export interface TouchEvent {
  type: TouchEventType;
  x: number;           // X position in pixels
  y: number;           // Y position in pixels
  id: number;          // Touch identifier for multi-touch
  timestamp: number;   // Event timestamp
  modifiers?: {        // Optional keyboard modifiers held during touch
    alt?: boolean;     // Alt/Option key - triggers block selection
    shift?: boolean;   // Shift key
    ctrl?: boolean;    // Control key
  };
}

/**
 * Touch state tracking
 */
export interface TouchState {
  active: boolean;
  startX: number;
  startY: number;
  startTime: number;
  lastX: number;
  lastY: number;
  touchId: number;
  isLongPress: boolean;
  isDragging: boolean;
  selectionMode: SelectionMode;  // Selection mode for this drag (linear or block)
}

// Touch gesture thresholds
const LONG_PRESS_DURATION = 500;  // ms for long press detection
const DRAG_THRESHOLD = 10;        // pixels before drag starts
const TAP_THRESHOLD = 200;        // ms max for tap detection

// ============================================================================
// Mouse Protocol Support
// ============================================================================

/**
 * Mouse button identifiers
 */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
  Release = 3,      // Button release (no button)
  WheelUp = 4,
  WheelDown = 5,
  WheelLeft = 6,    // Horizontal scroll
  WheelRight = 7,
}

/**
 * Mouse event types
 */
export enum MouseEventType {
  Press = 'press',
  Release = 'release',
  Move = 'move',
  Wheel = 'wheel',
}

/**
 * Mouse event data
 */
export interface MouseEvent {
  type: MouseEventType;
  button: MouseButton;
  x: number;           // Column (1-based for protocol)
  y: number;           // Row (1-based for protocol)
  modifiers: {
    shift: boolean;
    alt: boolean;
    ctrl: boolean;
  };
}

/**
 * Mouse tracking modes
 */
export enum MouseTrackingMode {
  None = 0,
  X10 = 1000,           // Basic click tracking (press only)
  ButtonEvent = 1002,   // Button event tracking (press, release, drag)
  AnyEvent = 1003,      // Any event tracking (all mouse movement)
}

/**
 * Mouse encoding formats
 */
export enum MouseEncodingFormat {
  X10 = 'x10',       // Traditional X10 encoding (CSI M Cb Cx Cy)
  SGR = 'sgr',       // SGR encoding (CSI < Cb ; Cx ; Cy M/m)
  URXVT = 'urxvt',   // urxvt encoding (CSI Cb ; Cx ; Cy M)
}

/**
 * Context menu item for right-click menus
 */
export interface ContextMenuItem {
  label: string;
  action: string;      // Action identifier (e.g., 'copy', 'paste', 'selectAll')
  enabled: boolean;
  separator?: boolean; // If true, this is a separator line
}

// ============================================================================
// ANSI Escape Sequence Parser
// ============================================================================

/**
 * Parser states for escape sequence parsing
 * Based on: escape.go state machine
 */
enum ParserState {
  Normal,
  Escape,
  CSI,
  OSC,
  DCS,
  APC,
  CharSet,
}

/**
 * ANSI/VT100 escape sequence parser
 * Based on: escape.go, osc.go, apc.go, dcs.go
 */
class AnsiParser {
  private state: ParserState = ParserState.Normal;
  private params: number[] = [];
  private currentParam: string = '';
  private oscString: string = '';
  private dcsString: string = '';
  private apcString: string = '';
  private privateMarker: string = '';
  private intermediates: string = '';

  // Callbacks
  onPrint: (char: string) => void = () => {};
  onExecute: (code: number) => void = () => {};
  onCsiDispatch: (params: number[], intermediates: string, final: string, privateMarker: string) => void = () => {};
  onOscDispatch: (params: string[]) => void = () => {};
  onEscDispatch: (intermediates: string, final: string) => void = () => {};
  onCharSetDispatch: (target: string, charset: string) => void = () => {};
  onDcsDispatch: (data: string) => void = () => {};
  onApcDispatch: (data: string) => void = () => {};

  /**
   * Parse input data
   * Based on: escape.go handleOutput
   */
  parse(data: string): void {
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const code = data.charCodeAt(i);

      switch (this.state) {
        case ParserState.Normal:
          this.handleNormal(char, code);
          break;
        case ParserState.Escape:
          this.handleEscape(char, code);
          break;
        case ParserState.CSI:
          this.handleCSI(char, code);
          break;
        case ParserState.OSC:
          this.handleOSC(char, code);
          break;
        case ParserState.DCS:
          this.handleDCS(char, code);
          break;
        case ParserState.APC:
          this.handleAPC(char, code);
          break;
        case ParserState.CharSet:
          this.handleCharSet(char, code);
          break;
      }
    }
  }

  private handleNormal(char: string, code: number): void {
    if (code === 0x1b) {
      // ESC
      this.state = ParserState.Escape;
    } else if (code < 0x20 || code === 0x7f) {
      // Control characters
      this.onExecute(code);
    } else {
      // Printable character
      this.onPrint(char);
    }
  }

  private handleEscape(char: string, code: number): void {
    if (char === '[') {
      this.state = ParserState.CSI;
      this.params = [];
      this.currentParam = '';
      this.privateMarker = '';
      this.intermediates = '';
    } else if (char === ']') {
      this.state = ParserState.OSC;
      this.oscString = '';
    } else if (char === 'P') {
      // DCS - Device Control String
      this.state = ParserState.DCS;
      this.dcsString = '';
    } else if (char === '_') {
      // APC - Application Program Command
      this.state = ParserState.APC;
      this.apcString = '';
    } else if (char === '(' || char === ')' || char === '*' || char === '+') {
      this.state = ParserState.CharSet;
      this.intermediates = char;
    } else if (char === '7' || char === '8' || char === 'D' || char === 'E' || char === 'M' || char === 'c') {
      // Single-character escape sequences
      this.onEscDispatch('', char);
      this.state = ParserState.Normal;
    } else if (char === '=') {
      // Application keypad mode
      this.onEscDispatch('', char);
      this.state = ParserState.Normal;
    } else if (char === '>') {
      // Normal keypad mode
      this.onEscDispatch('', char);
      this.state = ParserState.Normal;
    } else {
      // Unknown escape sequence, re-process the character in normal state
      this.state = ParserState.Normal;
      this.handleNormal(char, code); // Re-process the character
    }
  }

  private handleCSI(char: string, code: number): void {
    if (char >= '0' && char <= '9') {
      this.currentParam += char;
    } else if (char === ';') {
      this.params.push(this.currentParam ? parseInt(this.currentParam, 10) : 0);
      this.currentParam = '';
    } else if (char === '?' || char === '>' || char === '!') {
      this.privateMarker = char;
    } else if (char >= ' ' && char <= '/') {
      this.intermediates += char;
    } else if (char >= '@' && char <= '~') {
      // Final byte
      if (this.currentParam) {
        this.params.push(parseInt(this.currentParam, 10));
      }
      this.onCsiDispatch(this.params, this.intermediates, char, this.privateMarker);
      this.state = ParserState.Normal;
    } else {
      // Invalid CSI
      this.state = ParserState.Normal;
    }
  }

  private handleOSC(char: string, code: number): void {
    if (code === 0x07 || (code === 0x1b && this.oscString.endsWith('\\'))) {
      // Bell or ST terminates OSC
      if (code === 0x1b) {
        this.oscString = this.oscString.slice(0, -1);
      }
      this.onOscDispatch(this.oscString.split(';'));
      this.state = ParserState.Normal;
    } else if (code === 0x1b) {
      this.oscString += char;
    } else {
      this.oscString += char;
    }
  }

  private handleCharSet(char: string, _code: number): void {
    // Character set designation
    // intermediates contains '(' for G0, ')' for G1, '*' for G2, '+' for G3
    // char contains the charset designator ('0' for DEC Special Graphics, 'B' for ASCII, etc.)
    this.onCharSetDispatch(this.intermediates, char);
    this.state = ParserState.Normal;
  }

  /**
   * Handle DCS (Device Control String) sequences
   * Format: ESC P ... ST (where ST is ESC \)
   * Used for: DECRQSS, Sixel graphics, ReGIS graphics, etc.
   */
  private handleDCS(char: string, code: number): void {
    // Check for ST (String Terminator): ESC \ or 0x9C
    if (code === 0x9c) {
      // C1 ST
      this.onDcsDispatch(this.dcsString);
      this.state = ParserState.Normal;
    } else if (code === 0x1b) {
      // Possible start of ESC \ (ST)
      // We need to check the next character, so append ESC and check in next iteration
      this.dcsString += char;
    } else if (this.dcsString.endsWith('\x1b') && char === '\\') {
      // ESC \ (ST) - end of DCS
      this.dcsString = this.dcsString.slice(0, -1); // Remove the ESC
      this.onDcsDispatch(this.dcsString);
      this.state = ParserState.Normal;
    } else {
      this.dcsString += char;
    }
  }

  /**
   * Handle APC (Application Program Command) sequences
   * Format: ESC _ ... ST (where ST is ESC \)
   * Used for: Custom application commands, tmux passthrough, etc.
   */
  private handleAPC(char: string, code: number): void {
    // Check for ST (String Terminator): ESC \ or 0x9C
    if (code === 0x9c) {
      // C1 ST
      this.onApcDispatch(this.apcString);
      this.state = ParserState.Normal;
    } else if (code === 0x1b) {
      // Possible start of ESC \ (ST)
      this.apcString += char;
    } else if (this.apcString.endsWith('\x1b') && char === '\\') {
      // ESC \ (ST) - end of APC
      this.apcString = this.apcString.slice(0, -1); // Remove the ESC
      this.onApcDispatch(this.apcString);
      this.state = ParserState.Normal;
    } else {
      this.apcString += char;
    }
  }
}

// ============================================================================
// Terminal Buffer
// ============================================================================

/**
 * Terminal screen buffer
 * Based on: term.go buffer management
 */
class TerminalBuffer {
  private buffer: Cell[][] = [];
  private scrollback: Cell[][] = [];
  private cols: number;
  private rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.clear();
  }

  private defaultCell(): Cell {
    return {
      char: ' ',
      attrs: {
        fgColor: -1,
        bgColor: -1,
        bold: false,
        dim: false,
        italic: false,
        underline: false,
        blink: false,
        inverse: false,
        hidden: false,
        strikethrough: false,
      },
    };
  }

  private createRow(): Cell[] {
    return Array(this.cols)
      .fill(null)
      .map(() => this.defaultCell());
  }

  clear(): void {
    this.buffer = [];
    for (let i = 0; i < this.rows; i++) {
      this.buffer.push(this.createRow());
    }
  }

  getCell(row: number, col: number): Cell {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      return this.buffer[row][col];
    }
    return this.defaultCell();
  }

  setCell(row: number, col: number, char: string, attrs: CellAttributes): void {
    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
      this.buffer[row][col] = { char, attrs: { ...attrs } };
    }
  }

  scrollUp(top: number, bottom: number, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      // Save scrolled line to scrollback if scrolling full screen
      if (top === 0) {
        this.scrollback.push([...this.buffer[top]]);
        if (this.scrollback.length > MAX_SCROLLBACK) {
          this.scrollback.shift();
        }
      }

      // Scroll lines up
      for (let row = top; row < bottom; row++) {
        this.buffer[row] = this.buffer[row + 1] || this.createRow();
      }
      this.buffer[bottom] = this.createRow();
    }
  }

  scrollDown(top: number, bottom: number, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      for (let row = bottom; row > top; row--) {
        this.buffer[row] = this.buffer[row - 1] || this.createRow();
      }
      this.buffer[top] = this.createRow();
    }
  }

  eraseLine(row: number, mode: number, col: number): void {
    if (row < 0 || row >= this.rows) return;

    switch (mode) {
      case 0: // Erase to end of line
        for (let c = col; c < this.cols; c++) {
          this.buffer[row][c] = this.defaultCell();
        }
        break;
      case 1: // Erase to beginning of line
        for (let c = 0; c <= col; c++) {
          this.buffer[row][c] = this.defaultCell();
        }
        break;
      case 2: // Erase entire line
        this.buffer[row] = this.createRow();
        break;
    }
  }

  eraseDisplay(mode: number, row: number, col: number): void {
    switch (mode) {
      case 0: // Erase below
        this.eraseLine(row, 0, col);
        for (let r = row + 1; r < this.rows; r++) {
          this.buffer[r] = this.createRow();
        }
        break;
      case 1: // Erase above
        this.eraseLine(row, 1, col);
        for (let r = 0; r < row; r++) {
          this.buffer[r] = this.createRow();
        }
        break;
      case 2: // Erase all
      case 3: // Erase all + scrollback
        this.clear();
        if (mode === 3) {
          this.scrollback = [];
        }
        break;
    }
  }

  insertLines(row: number, count: number, scrollBottom: number): void {
    for (let i = 0; i < count; i++) {
      for (let r = scrollBottom; r > row; r--) {
        this.buffer[r] = this.buffer[r - 1];
      }
      this.buffer[row] = this.createRow();
    }
  }

  deleteLines(row: number, count: number, scrollBottom: number): void {
    for (let i = 0; i < count; i++) {
      for (let r = row; r < scrollBottom; r++) {
        this.buffer[r] = this.buffer[r + 1];
      }
      this.buffer[scrollBottom] = this.createRow();
    }
  }

  insertChars(row: number, col: number, count: number): void {
    if (row < 0 || row >= this.rows) return;
    for (let i = 0; i < count; i++) {
      this.buffer[row].splice(col, 0, this.defaultCell());
      this.buffer[row].pop();
    }
  }

  deleteChars(row: number, col: number, count: number): void {
    if (row < 0 || row >= this.rows) return;
    for (let i = 0; i < count; i++) {
      this.buffer[row].splice(col, 1);
      this.buffer[row].push(this.defaultCell());
    }
  }

  resize(newCols: number, newRows: number): void {
    const newBuffer: Cell[][] = [];

    for (let r = 0; r < newRows; r++) {
      if (r < this.buffer.length) {
        const row = this.buffer[r];
        if (newCols > this.cols) {
          // Extend row
          for (let c = this.cols; c < newCols; c++) {
            row.push(this.defaultCell());
          }
        } else if (newCols < this.cols) {
          // Truncate row
          row.splice(newCols);
        }
        newBuffer.push(row);
      } else {
        newBuffer.push(this.createNewRow(newCols));
      }
    }

    this.buffer = newBuffer;
    this.cols = newCols;
    this.rows = newRows;
  }

  private createNewRow(cols: number): Cell[] {
    return Array(cols)
      .fill(null)
      .map(() => this.defaultCell());
  }

  getRows(): number {
    return this.rows;
  }

  getCols(): number {
    return this.cols;
  }

  getBuffer(): Cell[][] {
    return this.buffer;
  }

  getScrollback(): Cell[][] {
    return this.scrollback;
  }
}

// ============================================================================
// Terminal Core
// ============================================================================

/**
 * Terminal emulator core
 * Based on: term.go Terminal struct
 */
export class Terminal {
  private buffer: TerminalBuffer;
  private parser: AnsiParser;
  private cursorRow: number = 0;
  private cursorCol: number = 0;
  private savedCursorRow: number = 0;
  private savedCursorCol: number = 0;
  private scrollTop: number = 0;
  private scrollBottom: number;
  private currentAttrs: CellAttributes;
  private title: string = 'Terminal';
  private iconName: string = 'Terminal';  // Icon name (often same as title, used by some window managers)
  private cwd: string = os.homedir();
  private ptyProcess: IPty | null = null;
  private selection: Selection = { active: false, startRow: 0, startCol: 0, endRow: 0, endCol: 0, mode: SelectionMode.Linear };

  // Mode flags
  private originMode: boolean = false;
  private autoWrapMode: boolean = true;
  private cursorVisible: boolean = true;
  private applicationCursorKeys: boolean = false;
  private applicationKeypadMode: boolean = false;  // DECKPAM/DECKPNM
  private newLineMode: boolean = false;            // LNM - affects Enter key
  private bracketedPasteMode: boolean = false;
  private printerMode: boolean = false;           // Media Copy mode (ESC[5i/ESC[4i)
  private printerBuffer: string = '';             // Buffer for printer output
  private lastExitCode: number | null = null;     // Last shell exit code (null if still running)
  private mouseTrackingMode: number = 0;
  private mouseEncodingFormat: MouseEncodingFormat = MouseEncodingFormat.X10;
  private mouseButtonState: MouseButton = MouseButton.Release;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private alternateBuffer: TerminalBuffer | null = null;
  private mainBuffer: TerminalBuffer;

  // Platform detection
  private platform: 'macos' | 'windows' | 'linux' = 'linux';

  // Key state tracking
  private pressedKeys: Set<string> = new Set();

  // Double-click detection for word selection
  private lastClickTime: number = 0;
  private lastClickRow: number = -1;
  private lastClickCol: number = -1;
  private readonly DOUBLE_CLICK_THRESHOLD = 300; // ms

  // Charset state (G0 and G1 character sets)
  private g0Charset: string = Charset.ASCII;  // G0 charset designator
  private g1Charset: string = Charset.ASCII;  // G1 charset designator
  private useG1: boolean = false;             // true = use G1, false = use G0

  // Touch state for mobile support
  private touchState: TouchState = {
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    lastX: 0,
    lastY: 0,
    touchId: -1,
    isLongPress: false,
    isDragging: false,
    selectionMode: SelectionMode.Linear,
  };
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private cellWidth: number = 8;   // Default cell width in pixels
  private cellHeight: number = 16; // Default cell height in pixels

  // UTF-8 partial sequence buffer for handling split multi-byte characters
  private utf8PartialBuffer: number[] = [];

  // Debug mode - set to true to enable logging
  private debug: boolean = false;

  // Desktop service for launching apps (injected)
  private desktopService: IDesktopService | null = null;

  // Callbacks
  onUpdate: () => void = () => {};
  onTitleChange: (title: string) => void = () => {};
  onIconNameChange: (iconName: string) => void = () => {};
  onBell: () => void = () => {};
  onExit: (code: number) => void = () => {};
  onError: (error: Error, context: string) => void = () => {};  // Called on PTY/stream errors
  onLongPress: (row: number, col: number) => void = () => {};
  onTap: (row: number, col: number) => void = () => {};
  onContextMenu: (row: number, col: number, items: ContextMenuItem[]) => void = () => {};
  onPrinterOutput: (data: string) => void = () => {};  // Called when printer mode ends with buffered data

  // Extensible handler registration for DCS and APC sequences
  private dcsHandlers: Map<string, (data: string) => void> = new Map();
  private apcHandlers: Map<string, (data: string) => void> = new Map();

  constructor(cols: number = DEFAULT_COLS, rows: number = DEFAULT_ROWS) {
    this.buffer = new TerminalBuffer(cols, rows);
    this.mainBuffer = this.buffer;
    this.scrollBottom = rows - 1;
    this.currentAttrs = this.defaultAttrs();

    this.parser = new AnsiParser();
    this.setupParser();

    // Detect platform for keyboard shortcuts
    this.detectPlatform();

    // Check for debug environment variable
    this.debug = process.env.TSYNE_TERMINAL_DEBUG === '1';
  }

  /**
   * Enable or disable debug logging
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.debug;
  }

  /**
   * Set the desktop service for launching apps
   * Called when running in desktop mode
   */
  setDesktopService(service: IDesktopService): void {
    this.desktopService = service;
  }

  /**
   * Register a handler for DCS (Device Control String) sequences
   * The prefix is the initial part of the DCS data that identifies the handler
   *
   * @example
   * // Handle Sixel graphics
   * terminal.registerDCSHandler('q', (data) => {
   *   console.log('Sixel data:', data);
   * });
   *
   * // Handle DECRQSS queries
   * terminal.registerDCSHandler('$q', (data) => {
   *   console.log('DECRQSS query:', data);
   * });
   */
  registerDCSHandler(prefix: string, handler: (data: string) => void): void {
    this.dcsHandlers.set(prefix, handler);
  }

  /**
   * Unregister a DCS handler
   */
  unregisterDCSHandler(prefix: string): void {
    this.dcsHandlers.delete(prefix);
  }

  /**
   * Register a handler for APC (Application Program Command) sequences
   * The prefix is the initial part of the APC data that identifies the handler
   *
   * @example
   * // Handle tmux passthrough
   * terminal.registerAPCHandler('tmux;', (data) => {
   *   console.log('tmux command:', data);
   * });
   *
   * // Handle custom application commands
   * terminal.registerAPCHandler('myapp:', (data) => {
   *   const parts = data.split(':');
   *   handleMyAppCommand(parts[1], parts.slice(2));
   * });
   */
  registerAPCHandler(prefix: string, handler: (data: string) => void): void {
    this.apcHandlers.set(prefix, handler);
  }

  /**
   * Unregister an APC handler
   */
  unregisterAPCHandler(prefix: string): void {
    this.apcHandlers.delete(prefix);
  }

  /**
   * Log debug message with hex dump of data
   */
  private debugLog(context: string, data: string): void {
    if (!this.debug) return;
    const hex = data.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code < 32 || code > 126) {
        return `\\x${code.toString(16).padStart(2, '0')}`;
      }
      return c;
    }).join('');
    console.log(`[Terminal:${context}] "${hex}"`);
  }

  /**
   * Detect the current platform for keyboard shortcut handling
   */
  private detectPlatform(): void {
    const platform = os.platform();
    if (platform === 'darwin') {
      this.platform = 'macos';
    } else if (platform === 'win32') {
      this.platform = 'windows';
    } else {
      this.platform = 'linux';
    }
  }

  /**
   * Get the current platform
   */
  getPlatform(): 'macos' | 'windows' | 'linux' {
    return this.platform;
  }

  private defaultAttrs(): CellAttributes {
    return {
      fgColor: -1,
      bgColor: -1,
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      blink: false,
      inverse: false,
      hidden: false,
      strikethrough: false,
    };
  }

  private setupParser(): void {
    this.parser.onPrint = (char: string) => this.handlePrint(char);
    this.parser.onExecute = (code: number) => this.handleExecute(code);
    this.parser.onCsiDispatch = (params, intermediates, final, privateMarker) =>
      this.handleCSI(params, intermediates, final, privateMarker);
    this.parser.onOscDispatch = (params) => this.handleOSC(params);
    this.parser.onEscDispatch = (intermediates, final) => this.handleEsc(intermediates, final);
    this.parser.onCharSetDispatch = (target, charset) => this.handleCharSetDesignation(target, charset);
    this.parser.onDcsDispatch = (data) => this.handleDCS(data);
    this.parser.onApcDispatch = (data) => this.handleAPC(data);
  }

  /**
   * Handle charset designation escape sequences
   * ESC ( X - Designate G0 charset
   * ESC ) X - Designate G1 charset
   * ESC * X - Designate G2 charset (not commonly used)
   * ESC + X - Designate G3 charset (not commonly used)
   *
   * Where X is:
   *   0 = DEC Special Graphics (box drawing)
   *   B = US ASCII
   *   A = UK
   */
  private handleCharSetDesignation(target: string, charset: string): void {
    switch (target) {
      case '(':
        this.g0Charset = charset;
        break;
      case ')':
        this.g1Charset = charset;
        break;
      // G2 and G3 are rarely used, ignore for now
    }
  }

  /**
   * Start local shell using PTY
   * Based on: term.go RunLocalShell
   */
  runLocalShell(): void {
    const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh');

    if (this.debug) {
      console.log(`[Terminal:runLocalShell] Starting shell: ${shell}`);
      console.log(`[Terminal:runLocalShell] TERM=xterm-256color, cols=${this.buffer.getCols()}, rows=${this.buffer.getRows()}`);
    }

    // Set TSYNE_DESKTOP=1 if desktop service is available
    const tsyneEnv: { [key: string]: string } = {
      ...process.env as { [key: string]: string },
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    };
    if (this.desktopService?.isAvailable()) {
      tsyneEnv.TSYNE_DESKTOP = '1';
    }

    try {
      this.ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: this.buffer.getCols(),
        rows: this.buffer.getRows(),
        cwd: this.cwd,
        env: tsyneEnv,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (this.debug) {
        console.log(`[Terminal:runLocalShell] Failed to spawn PTY: ${error.message}`);
      }
      this.onError(error, 'pty_spawn');
      // Write error message to terminal display
      this.write(`\r\n\x1b[31mError: Failed to start shell: ${error.message}\x1b[0m\r\n`);
      return;
    }

    if (this.debug) {
      console.log(`[Terminal:runLocalShell] PTY spawned, pid=${this.ptyProcess.pid}`);
    }

    this.ptyProcess.onData((data: string) => {
      this.write(data);
    });

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      if (this.debug) {
        console.log(`[Terminal:runLocalShell] PTY exited with code ${exitCode}, signal ${signal}`);
      }
      this.ptyProcess = null;
      this.lastExitCode = exitCode;

      // Check for abnormal termination
      if (signal !== undefined && signal !== 0) {
        const signalNames: { [key: number]: string } = {
          1: 'SIGHUP', 2: 'SIGINT', 3: 'SIGQUIT', 6: 'SIGABRT',
          9: 'SIGKILL', 11: 'SIGSEGV', 13: 'SIGPIPE', 15: 'SIGTERM',
        };
        const signalName = signalNames[signal] || `signal ${signal}`;
        if (this.debug) {
          console.log(`[Terminal:runLocalShell] Shell killed by ${signalName}`);
        }
      }

      this.onExit(exitCode);
    });

    // Inject tsyne helper function if desktop service is available
    if (this.desktopService?.isAvailable()) {
      // Wait for shell to initialize, then inject the function silently
      setTimeout(() => {
        if (this.ptyProcess) {
          // Define tsyne function, then clear screen to hide the definition
          const tsyneFunc = [
            `tsyne() { case "$1" in`,
            `open) printf '\\e]7777;open;%s;%s\\e\\\\' "$2" "$3" ;;`,
            `list) printf '\\e]7777;list\\e\\\\' ;;`,
            `*) echo "Usage: tsyne open <App> [file] | tsyne list" ;;`,
            `esac; }`,
          ].join(' ');
          // Send function definition followed by clear to hide it
          this.safePtyWrite(`${tsyneFunc} && clear\n`);
        }
      }, 150);
    }
  }

  /**
   * Safely write to PTY with error handling for broken pipe
   * @returns true if write succeeded, false if PTY is not available or write failed
   */
  private safePtyWrite(data: string): boolean {
    if (!this.ptyProcess) {
      if (this.debug) {
        console.log('[Terminal:safePtyWrite] PTY not available');
      }
      return false;
    }

    try {
      this.ptyProcess.write(data);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (this.debug) {
        console.log(`[Terminal:safePtyWrite] Write failed: ${error.message}`);
      }
      // Check for broken pipe / EOF errors
      if (error.message.includes('EPIPE') ||
          error.message.includes('EOF') ||
          error.message.includes('not open') ||
          error.message.includes('closed')) {
        // PTY has been closed - clean up
        this.ptyProcess = null;
        this.onError(error, 'pty_write_broken_pipe');
      } else {
        this.onError(error, 'pty_write');
      }
      return false;
    }
  }

  /**
   * Stop the terminal and clean up resources
   */
  stop(): void {
    if (this.ptyProcess) {
      if (this.debug) {
        console.log('[Terminal:stop] Killing PTY process');
      }
      try {
        this.ptyProcess.kill();
      } catch (err) {
        // Ignore errors during cleanup
        if (this.debug) {
          console.log(`[Terminal:stop] Error killing PTY: ${err}`);
        }
      }
      this.ptyProcess = null;
    }
    // Flush any remaining UTF-8 buffer
    this.flushUtf8Buffer();
  }

  /**
   * Run with external connection (for SSH, etc.)
   * Based on: term.go RunWithConnection
   */
  runWithConnection(reader: NodeJS.ReadableStream, writer: NodeJS.WritableStream): void {
    reader.on('data', (data: Buffer) => {
      // Use writeBuffer for proper UTF-8 handling with partial sequence buffering
      this.writeBuffer(data);
    });

    reader.on('end', () => {
      // Flush any remaining partial UTF-8 sequence
      this.flushUtf8Buffer();
    });

    reader.on('error', (err: Error) => {
      if (this.debug) {
        console.log('[Terminal:runWithConnection] Stream error:', err.message);
      }
      // Flush any remaining partial UTF-8 sequence
      this.flushUtf8Buffer();
    });

    // Store writer for input
    (this as any)._writer = writer;
  }

  /**
   * Write data to terminal (output from shell)
   * Based on: output.go Write
   */
  write(data: string): void {
    this.debugLog('write (from shell)', data);
    // Validate and sanitize UTF-8, replacing invalid sequences with U+FFFD
    const sanitized = this.sanitizeUtf8(data);
    this.parser.parse(sanitized);
    this.onUpdate();
  }

  /**
   * Write raw bytes to terminal, handling UTF-8 decoding with partial sequence buffering
   * Use this when receiving raw Buffer data that may be split across chunks
   */
  writeBuffer(data: Buffer): void {
    const decoded = this.decodeUtf8WithBuffering(data);
    if (decoded.length > 0) {
      this.write(decoded);
    }
  }

  /**
   * Decode UTF-8 bytes with buffering for partial multi-byte sequences
   * Handles the case where a multi-byte character is split across data chunks
   */
  private decodeUtf8WithBuffering(data: Buffer): string {
    // Combine any buffered bytes with new data
    const bytes: number[] = [...this.utf8PartialBuffer];
    for (let i = 0; i < data.length; i++) {
      bytes.push(data[i]);
    }
    this.utf8PartialBuffer = [];

    // Decode bytes to string, but check for trailing partial sequences
    let result = '';
    let i = 0;

    while (i < bytes.length) {
      const byte = bytes[i];

      // Determine expected sequence length from first byte
      let seqLen: number;
      if ((byte & 0x80) === 0) {
        seqLen = 1; // ASCII
      } else if ((byte & 0xe0) === 0xc0) {
        seqLen = 2; // 2-byte sequence
      } else if ((byte & 0xf0) === 0xe0) {
        seqLen = 3; // 3-byte sequence
      } else if ((byte & 0xf8) === 0xf0) {
        seqLen = 4; // 4-byte sequence
      } else {
        // Invalid leading byte - replace with U+FFFD
        result += '\uFFFD';
        i++;
        continue;
      }

      // Check if we have enough bytes
      if (i + seqLen > bytes.length) {
        // Partial sequence at end - buffer it for next chunk
        this.utf8PartialBuffer = bytes.slice(i);
        break;
      }

      // Validate continuation bytes
      let valid = true;
      for (let j = 1; j < seqLen; j++) {
        if ((bytes[i + j] & 0xc0) !== 0x80) {
          valid = false;
          break;
        }
      }

      if (!valid) {
        // Invalid sequence - replace with U+FFFD and advance one byte
        result += '\uFFFD';
        i++;
        continue;
      }

      // Decode the valid sequence
      let codePoint: number;
      if (seqLen === 1) {
        codePoint = byte;
      } else if (seqLen === 2) {
        codePoint = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f);
        // Check for overlong encoding
        if (codePoint < 0x80) {
          result += '\uFFFD';
          i += seqLen;
          continue;
        }
      } else if (seqLen === 3) {
        codePoint = ((byte & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f);
        // Check for overlong encoding and surrogate range
        if (codePoint < 0x800 || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
          result += '\uFFFD';
          i += seqLen;
          continue;
        }
      } else {
        codePoint = ((byte & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) |
                    ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
        // Check for overlong encoding and valid range
        if (codePoint < 0x10000 || codePoint > 0x10ffff) {
          result += '\uFFFD';
          i += seqLen;
          continue;
        }
      }

      result += String.fromCodePoint(codePoint);
      i += seqLen;
    }

    return result;
  }

  /**
   * Sanitize a UTF-8 string by replacing invalid sequences with U+FFFD
   * This handles cases where strings may contain unpaired surrogates or other issues
   */
  private sanitizeUtf8(str: string): string {
    // JavaScript strings are UTF-16, but may contain unpaired surrogates
    // Replace any unpaired surrogates with U+FFFD
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);

      // Check for high surrogate
      if (code >= 0xd800 && code <= 0xdbff) {
        if (i + 1 < str.length) {
          const next = str.charCodeAt(i + 1);
          // Check for valid low surrogate
          if (next >= 0xdc00 && next <= 0xdfff) {
            result += str[i] + str[i + 1];
            i++; // Skip the low surrogate
            continue;
          }
        }
        // Unpaired high surrogate - replace with U+FFFD
        result += '\uFFFD';
      } else if (code >= 0xdc00 && code <= 0xdfff) {
        // Unpaired low surrogate - replace with U+FFFD
        result += '\uFFFD';
      } else {
        result += str[i];
      }
    }
    return result;
  }

  /**
   * Flush any buffered partial UTF-8 sequence (e.g., on stream close)
   * Replaces incomplete sequences with U+FFFD
   */
  flushUtf8Buffer(): void {
    if (this.utf8PartialBuffer.length > 0) {
      // Replace incomplete sequence with replacement character(s)
      const replacements = '\uFFFD'.repeat(this.utf8PartialBuffer.length);
      this.utf8PartialBuffer = [];
      this.parser.parse(replacements);
      this.onUpdate();
    }
  }

  /**
   * Send input to shell via PTY
   * Based on: input.go TypedRune, TypedKey
   */
  sendInput(data: string): void {
    this.debugLog('sendInput', data);
    if (this.ptyProcess) {
      // Use safePtyWrite for broken pipe handling
      this.safePtyWrite(data);
    } else if ((this as any)._writer) {
      try {
        (this as any)._writer.write(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (this.debug) {
          console.log(`[Terminal:sendInput] Writer error: ${error.message}`);
        }
        this.onError(error, 'writer_write');
      }
    } else {
      if (this.debug) {
        console.log('[Terminal:sendInput] WARNING: No PTY or writer available!');
      }
    }
  }

  /**
   * Handle typed character
   */
  typeChar(char: string): void {
    this.sendInput(char);
  }

  /**
   * Handle special key with full modifier support
   * Based on: input.go TypedKey
   *
   * Modifier encoding for xterm-style sequences:
   *   1 = none, 2 = Shift, 3 = Alt, 4 = Shift+Alt
   *   5 = Ctrl, 6 = Shift+Ctrl, 7 = Alt+Ctrl, 8 = Shift+Alt+Ctrl
   */
  typeKey(key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean } = {}): void {
    if (this.debug) {
      console.log(`[Terminal:typeKey] key="${key}" modifiers=${JSON.stringify(modifiers)}`);
    }

    // Track key state
    this.pressedKeys.add(key);

    let sequence = '';
    const hasModifier: boolean = !!(modifiers.shift || modifiers.alt || modifiers.ctrl);
    const modifierCode = this.getModifierCode(modifiers);

    switch (key) {
      case 'Enter':
        // In new line mode, Enter sends CR LF; otherwise just CR
        sequence = this.newLineMode ? '\r\n' : '\r';
        break;
      case 'Backspace':
        sequence = modifiers.ctrl ? '\x08' : '\x7f';
        if (this.debug) {
          console.log(`[Terminal:typeKey] Backspace -> sending ${modifiers.ctrl ? '0x08 (BS)' : '0x7f (DEL)'}`);
        }
        break;
      case 'Tab':
        sequence = modifiers.shift ? '\x1b[Z' : '\t'; // Shift+Tab = backtab
        break;
      case 'Escape':
        sequence = '\x1b';
        break;

      // Cursor keys with modifier support
      case 'ArrowUp':
        sequence = this.encodeCursorKey('A', modifierCode, hasModifier);
        break;
      case 'ArrowDown':
        sequence = this.encodeCursorKey('B', modifierCode, hasModifier);
        break;
      case 'ArrowRight':
        sequence = this.encodeCursorKey('C', modifierCode, hasModifier);
        break;
      case 'ArrowLeft':
        sequence = this.encodeCursorKey('D', modifierCode, hasModifier);
        break;

      // Navigation keys with modifier support
      case 'Home':
        sequence = hasModifier ? `\x1b[1;${modifierCode}H` : '\x1b[H';
        break;
      case 'End':
        sequence = hasModifier ? `\x1b[1;${modifierCode}F` : '\x1b[F';
        break;
      case 'PageUp':
        sequence = hasModifier ? `\x1b[5;${modifierCode}~` : '\x1b[5~';
        break;
      case 'PageDown':
        sequence = hasModifier ? `\x1b[6;${modifierCode}~` : '\x1b[6~';
        break;
      case 'Insert':
        sequence = hasModifier ? `\x1b[2;${modifierCode}~` : '\x1b[2~';
        break;
      case 'Delete':
        sequence = hasModifier ? `\x1b[3;${modifierCode}~` : '\x1b[3~';
        break;

      // Function keys F1-F4 (VT style with modifier support)
      case 'F1':
        sequence = this.encodeFunctionKey1_4('P', modifierCode, hasModifier);
        break;
      case 'F2':
        sequence = this.encodeFunctionKey1_4('Q', modifierCode, hasModifier);
        break;
      case 'F3':
        sequence = this.encodeFunctionKey1_4('R', modifierCode, hasModifier);
        break;
      case 'F4':
        sequence = this.encodeFunctionKey1_4('S', modifierCode, hasModifier);
        break;

      // Function keys F5-F12 (CSI style with modifier support)
      case 'F5':
        sequence = hasModifier ? `\x1b[15;${modifierCode}~` : '\x1b[15~';
        break;
      case 'F6':
        sequence = hasModifier ? `\x1b[17;${modifierCode}~` : '\x1b[17~';
        break;
      case 'F7':
        sequence = hasModifier ? `\x1b[18;${modifierCode}~` : '\x1b[18~';
        break;
      case 'F8':
        sequence = hasModifier ? `\x1b[19;${modifierCode}~` : '\x1b[19~';
        break;
      case 'F9':
        sequence = hasModifier ? `\x1b[20;${modifierCode}~` : '\x1b[20~';
        break;
      case 'F10':
        sequence = hasModifier ? `\x1b[21;${modifierCode}~` : '\x1b[21~';
        break;
      case 'F11':
        sequence = hasModifier ? `\x1b[23;${modifierCode}~` : '\x1b[23~';
        break;
      case 'F12':
        sequence = hasModifier ? `\x1b[24;${modifierCode}~` : '\x1b[24~';
        break;

      // Extended function keys F13-F24 (Shift+F1-F12 on some systems)
      case 'F13':
        sequence = hasModifier ? `\x1b[1;${modifierCode}P` : '\x1b[1;2P';
        break;
      case 'F14':
        sequence = hasModifier ? `\x1b[1;${modifierCode}Q` : '\x1b[1;2Q';
        break;
      case 'F15':
        sequence = hasModifier ? `\x1b[1;${modifierCode}R` : '\x1b[1;2R';
        break;
      case 'F16':
        sequence = hasModifier ? `\x1b[1;${modifierCode}S` : '\x1b[1;2S';
        break;
      case 'F17':
        sequence = hasModifier ? `\x1b[15;${modifierCode}~` : '\x1b[15;2~';
        break;
      case 'F18':
        sequence = hasModifier ? `\x1b[17;${modifierCode}~` : '\x1b[17;2~';
        break;
      case 'F19':
        sequence = hasModifier ? `\x1b[18;${modifierCode}~` : '\x1b[18;2~';
        break;
      case 'F20':
        sequence = hasModifier ? `\x1b[19;${modifierCode}~` : '\x1b[19;2~';
        break;

      default:
        // Handle Ctrl+key combinations
        if (modifiers.ctrl && key.length === 1) {
          const code = key.toUpperCase().charCodeAt(0) - 64;
          if (code >= 0 && code < 32) {
            sequence = String.fromCharCode(code);
          }
        }
        // Handle Alt+key (send ESC prefix)
        else if (modifiers.alt && key.length === 1) {
          sequence = '\x1b' + key;
        }
    }

    if (sequence) {
      this.sendInput(sequence);
    }
  }

  /**
   * Handle key release event for key state tracking
   */
  keyUp(key: string): void {
    this.pressedKeys.delete(key);
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }

  /**
   * Get all currently pressed keys
   */
  getPressedKeys(): string[] {
    return Array.from(this.pressedKeys);
  }

  /**
   * Calculate xterm modifier code
   * 1 = none, 2 = Shift, 3 = Alt, 4 = Shift+Alt
   * 5 = Ctrl, 6 = Shift+Ctrl, 7 = Alt+Ctrl, 8 = Shift+Alt+Ctrl
   */
  private getModifierCode(modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean }): number {
    let code = 1;
    if (modifiers.shift) code += 1;
    if (modifiers.alt) code += 2;
    if (modifiers.ctrl) code += 4;
    return code;
  }

  /**
   * Encode cursor key with optional modifier
   * In application mode: ESC O A (or ESC O 1 ; mod A with modifiers)
   * In normal mode: ESC [ A (or ESC [ 1 ; mod A with modifiers)
   */
  private encodeCursorKey(suffix: string, modifierCode: number, hasModifier: boolean): string {
    if (hasModifier) {
      // Modifiers always use CSI format: ESC [ 1 ; mod X
      return `\x1b[1;${modifierCode}${suffix}`;
    }
    // No modifier - use application or normal mode
    return this.applicationCursorKeys ? `\x1bO${suffix}` : `\x1b[${suffix}`;
  }

  /**
   * Encode function keys F1-F4 (SS3 style)
   * Normal: ESC O P/Q/R/S
   * With modifiers: ESC [ 1 ; mod P/Q/R/S
   */
  private encodeFunctionKey1_4(suffix: string, modifierCode: number, hasModifier: boolean): string {
    if (hasModifier) {
      return `\x1b[1;${modifierCode}${suffix}`;
    }
    return `\x1bO${suffix}`;
  }

  /**
   * Check if the action modifier is pressed (Ctrl on Linux/Windows, Cmd on macOS)
   */
  isActionModifier(modifiers: { ctrl?: boolean; meta?: boolean }): boolean {
    if (this.platform === 'macos') {
      return !!modifiers.meta;
    }
    return !!modifiers.ctrl;
  }

  /**
   * Get application keypad mode state
   */
  isApplicationKeypadMode(): boolean {
    return this.applicationKeypadMode;
  }

  /**
   * Get new line mode state (LNM)
   */
  isNewLineMode(): boolean {
    return this.newLineMode;
  }

  /**
   * Get printer mode state (Media Copy)
   */
  isPrinterMode(): boolean {
    return this.printerMode;
  }

  /**
   * Handle paste with bracketed paste mode
   */
  paste(text: string): void {
    if (this.bracketedPasteMode) {
      this.sendInput('\x1b[200~' + text + '\x1b[201~');
    } else {
      this.sendInput(text);
    }
  }

  /**
   * Resize terminal
   * Based on: term.go Resize
   *
   * This properly signals SIGWINCH to the PTY process.
   */
  resize(cols: number, rows: number): void {
    this.buffer.resize(cols, rows);
    this.scrollBottom = rows - 1;

    // Signal the PTY about the new window size (sends SIGWINCH)
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }

    this.onUpdate();
  }

  /**
   * Exit terminal and kill PTY process
   */
  exit(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }

  /**
   * Check if PTY is running
   */
  isRunning(): boolean {
    return this.ptyProcess !== null;
  }

  // ============================================================================
  // Output Handlers
  // ============================================================================

  private handlePrint(char: string): void {
    // In printer mode, buffer characters instead of displaying
    if (this.printerMode) {
      this.printerBuffer += char;
      return;
    }

    // Translate character based on active charset
    const translatedChar = this.translateCharset(char);

    // Handle wide characters
    const charWidth = this.getCharWidth(translatedChar);

    // Auto-wrap if needed
    if (this.cursorCol >= this.buffer.getCols()) {
      if (this.autoWrapMode) {
        this.cursorCol = 0;
        this.cursorRow++;
        if (this.cursorRow > this.scrollBottom) {
          this.cursorRow = this.scrollBottom;
          this.buffer.scrollUp(this.scrollTop, this.scrollBottom);
        }
      } else {
        this.cursorCol = this.buffer.getCols() - 1;
      }
    }

    this.buffer.setCell(this.cursorRow, this.cursorCol, translatedChar, this.currentAttrs);
    this.cursorCol += charWidth;
  }

  /**
   * Translate character based on active charset
   * Handles DEC Special Graphics for box drawing characters
   */
  private translateCharset(char: string): string {
    const activeCharset = this.useG1 ? this.g1Charset : this.g0Charset;

    if (activeCharset === Charset.DECSpecialGraphics) {
      // DEC Special Graphics maps characters in the range 0x60-0x7E
      const mapped = DEC_SPECIAL_GRAPHICS[char];
      if (mapped) {
        return mapped;
      }
    }

    // Default: return character unchanged
    return char;
  }

  private getCharWidth(char: string): number {
    // Simple width detection - could be enhanced for full Unicode support
    const code = char.charCodeAt(0);
    // CJK characters, etc. are double width
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe1f) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      return 2;
    }
    return 1;
  }

  private handleExecute(code: number): void {
    if (this.debug) {
      console.log(`[Terminal:handleExecute] code=0x${code.toString(16)} (${code})`);
    }
    switch (code) {
      case 0x07: // BEL
        this.onBell();
        break;
      case 0x08: // BS (Backspace)
        if (this.debug) {
          console.log(`[Terminal:handleExecute] BS received, cursorCol=${this.cursorCol} -> ${Math.max(0, this.cursorCol - 1)}`);
        }
        if (this.cursorCol > 0) {
          this.cursorCol--;
        }
        break;
      case 0x09: // HT (Tab)
        this.cursorCol = Math.min((Math.floor(this.cursorCol / 8) + 1) * 8, this.buffer.getCols() - 1);
        break;
      case 0x0a: // LF (Line Feed)
      case 0x0b: // VT (Vertical Tab)
      case 0x0c: // FF (Form Feed)
        // In new line mode (LNM), LF also does CR (moves to column 0)
        if (this.newLineMode) {
          this.cursorCol = 0;
        }
        this.cursorRow++;
        if (this.cursorRow > this.scrollBottom) {
          this.cursorRow = this.scrollBottom;
          this.buffer.scrollUp(this.scrollTop, this.scrollBottom);
        }
        break;
      case 0x0d: // CR (Carriage Return)
        this.cursorCol = 0;
        break;
      case 0x0e: // SO (Shift Out) - switch to G1 charset
        this.useG1 = true;
        break;
      case 0x0f: // SI (Shift In) - switch to G0 charset
        this.useG1 = false;
        break;
    }
  }

  /**
   * Handle CSI sequences
   * Based on: escape.go handleCSI
   */
  private handleCSI(params: number[], _intermediates: string, final: string, privateMarker: string): void {
    const p = (index: number, defaultVal: number = 0): number => (params[index] !== undefined ? params[index] : defaultVal);

    switch (final) {
      case 'A': // CUU - Cursor Up
        this.cursorRow = Math.max(this.scrollTop, this.cursorRow - Math.max(1, p(0, 1)));
        break;

      case 'B': // CUD - Cursor Down
      case 'e': // VPR - Vertical Position Relative
        this.cursorRow = Math.min(this.scrollBottom, this.cursorRow + Math.max(1, p(0, 1)));
        break;

      case 'C': // CUF - Cursor Forward
      case 'a': // HPR - Horizontal Position Relative
        this.cursorCol = Math.min(this.buffer.getCols() - 1, this.cursorCol + Math.max(1, p(0, 1)));
        break;

      case 'D': // CUB - Cursor Back
        this.cursorCol = Math.max(0, this.cursorCol - Math.max(1, p(0, 1)));
        break;

      case 'E': // CNL - Cursor Next Line
        this.cursorRow = Math.min(this.scrollBottom, this.cursorRow + Math.max(1, p(0, 1)));
        this.cursorCol = 0;
        break;

      case 'F': // CPL - Cursor Previous Line
        this.cursorRow = Math.max(this.scrollTop, this.cursorRow - Math.max(1, p(0, 1)));
        this.cursorCol = 0;
        break;

      case 'G': // CHA - Cursor Horizontal Absolute
      case '`': // HPA - Horizontal Position Absolute
        this.cursorCol = Math.max(0, Math.min(this.buffer.getCols() - 1, p(0, 1) - 1));
        break;

      case 'H': // CUP - Cursor Position
      case 'f': // HVP - Horizontal and Vertical Position
        this.cursorRow = Math.max(0, Math.min(this.buffer.getRows() - 1, p(0, 1) - 1));
        this.cursorCol = Math.max(0, Math.min(this.buffer.getCols() - 1, p(1, 1) - 1));
        if (this.originMode) {
          this.cursorRow = Math.min(this.cursorRow + this.scrollTop, this.scrollBottom);
        }
        break;

      case 'J': // ED - Erase in Display
        this.buffer.eraseDisplay(p(0, 0), this.cursorRow, this.cursorCol);
        break;

      case 'K': // EL - Erase in Line
        this.buffer.eraseLine(this.cursorRow, p(0, 0), this.cursorCol);
        break;

      case 'L': // IL - Insert Lines
        this.buffer.insertLines(this.cursorRow, Math.max(1, p(0, 1)), this.scrollBottom);
        break;

      case 'M': // DL - Delete Lines
        this.buffer.deleteLines(this.cursorRow, Math.max(1, p(0, 1)), this.scrollBottom);
        break;

      case 'P': // DCH - Delete Characters
        this.buffer.deleteChars(this.cursorRow, this.cursorCol, Math.max(1, p(0, 1)));
        break;

      case 'S': // SU - Scroll Up
        this.buffer.scrollUp(this.scrollTop, this.scrollBottom, Math.max(1, p(0, 1)));
        break;

      case 'T': // SD - Scroll Down
        this.buffer.scrollDown(this.scrollTop, this.scrollBottom, Math.max(1, p(0, 1)));
        break;

      case 'X': // ECH - Erase Characters
        for (let i = 0; i < Math.max(1, p(0, 1)); i++) {
          if (this.cursorCol + i < this.buffer.getCols()) {
            this.buffer.setCell(this.cursorRow, this.cursorCol + i, ' ', this.currentAttrs);
          }
        }
        break;

      case '@': // ICH - Insert Characters
        this.buffer.insertChars(this.cursorRow, this.cursorCol, Math.max(1, p(0, 1)));
        break;

      case 'd': // VPA - Vertical Position Absolute
        this.cursorRow = Math.max(0, Math.min(this.buffer.getRows() - 1, p(0, 1) - 1));
        break;

      case 'm': // SGR - Select Graphic Rendition
        this.handleSGR(params);
        break;

      case 'r': // DECSTBM - Set Scrolling Region
        this.scrollTop = Math.max(0, p(0, 1) - 1);
        this.scrollBottom = Math.min(this.buffer.getRows() - 1, (params[1] || this.buffer.getRows()) - 1);
        this.cursorRow = this.originMode ? this.scrollTop : 0;
        this.cursorCol = 0;
        break;

      case 's': // SCOSC - Save Cursor Position
        this.savedCursorRow = this.cursorRow;
        this.savedCursorCol = this.cursorCol;
        break;

      case 'u': // SCORC - Restore Cursor Position
        this.cursorRow = this.savedCursorRow;
        this.cursorCol = this.savedCursorCol;
        break;

      case 'h': // SM - Set Mode
        this.handleMode(params, privateMarker, true);
        break;

      case 'l': // RM - Reset Mode
        this.handleMode(params, privateMarker, false);
        break;

      case 'n': // DSR - Device Status Report
        if (p(0) === 6) {
          // Report cursor position
          this.sendInput(`\x1b[${this.cursorRow + 1};${this.cursorCol + 1}R`);
        }
        break;

      case 'c': // DA - Device Attributes
        if (privateMarker === '>') {
          // Secondary DA
          this.sendInput('\x1b[>0;0;0c');
        } else {
          // Primary DA
          this.sendInput('\x1b[?1;2c');
        }
        break;

      case 't': // Window manipulation
        // Ignore most window operations
        break;

      case 'i': // MC - Media Copy (Printer Mode)
        if (p(0) === 5) {
          // ESC[5i - Start printer controller mode
          this.printerMode = true;
          this.printerBuffer = '';
          if (this.debug) {
            console.log('[Terminal] Printer mode enabled');
          }
        } else if (p(0) === 4) {
          // ESC[4i - Stop printer controller mode
          if (this.printerMode) {
            this.printerMode = false;
            if (this.printerBuffer.length > 0) {
              this.onPrinterOutput(this.printerBuffer);
            }
            this.printerBuffer = '';
            if (this.debug) {
              console.log('[Terminal] Printer mode disabled');
            }
          }
        }
        // Other printer modes (0, 10, 11) are not commonly used
        break;
    }
  }

  /**
   * Handle SGR (Select Graphic Rendition)
   * Based on: escape.go handleSGR
   */
  private handleSGR(params: number[]): void {
    if (params.length === 0) {
      params = [0];
    }

    let i = 0;
    while (i < params.length) {
      const p = params[i];

      switch (p) {
        case 0: // Reset
          this.currentAttrs = this.defaultAttrs();
          break;
        case 1: // Bold
          this.currentAttrs.bold = true;
          break;
        case 2: // Dim
          this.currentAttrs.dim = true;
          break;
        case 3: // Italic
          this.currentAttrs.italic = true;
          break;
        case 4: // Underline
          this.currentAttrs.underline = true;
          break;
        case 5: // Blink
          this.currentAttrs.blink = true;
          break;
        case 7: // Inverse
          this.currentAttrs.inverse = true;
          break;
        case 8: // Hidden
          this.currentAttrs.hidden = true;
          break;
        case 9: // Strikethrough
          this.currentAttrs.strikethrough = true;
          break;
        case 21: // Double underline (treat as underline)
          this.currentAttrs.underline = true;
          break;
        case 22: // Normal intensity
          this.currentAttrs.bold = false;
          this.currentAttrs.dim = false;
          break;
        case 23: // Not italic
          this.currentAttrs.italic = false;
          break;
        case 24: // Not underlined
          this.currentAttrs.underline = false;
          break;
        case 25: // Not blinking
          this.currentAttrs.blink = false;
          break;
        case 27: // Not inverse
          this.currentAttrs.inverse = false;
          break;
        case 28: // Not hidden
          this.currentAttrs.hidden = false;
          break;
        case 29: // Not strikethrough
          this.currentAttrs.strikethrough = false;
          break;

        // Foreground colors (30-37, 90-97)
        case 30:
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
          this.currentAttrs.fgColor = p - 30;
          break;

        case 38: // Extended foreground color
          if (i + 1 < params.length && params[i + 1] === 5 && i + 2 < params.length) {
            // 256 color mode: 38;5;n
            this.currentAttrs.fgColor = params[i + 2];
            i += 2;
          } else if (i + 1 < params.length && params[i + 1] === 2 && i + 4 < params.length) {
            // True color mode: 38;2;r;g;b - convert to nearest 256 color
            const r = params[i + 2];
            const g = params[i + 3];
            const b = params[i + 4];
            this.currentAttrs.fgColor = this.rgbTo256(r, g, b);
            i += 4;
          }
          break;

        case 39: // Default foreground
          this.currentAttrs.fgColor = -1;
          break;

        // Background colors (40-47, 100-107)
        case 40:
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
          this.currentAttrs.bgColor = p - 40;
          break;

        case 48: // Extended background color
          if (i + 1 < params.length && params[i + 1] === 5 && i + 2 < params.length) {
            // 256 color mode
            this.currentAttrs.bgColor = params[i + 2];
            i += 2;
          } else if (i + 1 < params.length && params[i + 1] === 2 && i + 4 < params.length) {
            // True color mode
            const r = params[i + 2];
            const g = params[i + 3];
            const b = params[i + 4];
            this.currentAttrs.bgColor = this.rgbTo256(r, g, b);
            i += 4;
          }
          break;

        case 49: // Default background
          this.currentAttrs.bgColor = -1;
          break;

        // Bright foreground colors
        case 90:
        case 91:
        case 92:
        case 93:
        case 94:
        case 95:
        case 96:
        case 97:
          this.currentAttrs.fgColor = p - 90 + 8;
          break;

        // Bright background colors
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
          this.currentAttrs.bgColor = p - 100 + 8;
          break;
      }

      i++;
    }
  }

  private rgbTo256(r: number, g: number, b: number): number {
    // Convert RGB to nearest 256 color
    // First check if it's a grayscale
    if (r === g && g === b) {
      if (r < 8) return 16;
      if (r > 248) return 231;
      return Math.round((r - 8) / 247 * 24) + 232;
    }

    // Convert to 6x6x6 color cube
    const toLevel = (v: number) => {
      if (v < 48) return 0;
      if (v < 115) return 1;
      return Math.min(5, Math.floor((v - 35) / 40));
    };

    return 16 + 36 * toLevel(r) + 6 * toLevel(g) + toLevel(b);
  }

  /**
   * Handle mode setting/resetting
   * Based on: escape.go handleMode
   */
  private handleMode(params: number[], privateMarker: string, enable: boolean): void {
    for (const mode of params) {
      if (privateMarker === '?') {
        // DEC private modes
        switch (mode) {
          case 1: // DECCKM - Application cursor keys
            this.applicationCursorKeys = enable;
            break;
          case 6: // DECOM - Origin mode
            this.originMode = enable;
            break;
          case 7: // DECAWM - Auto-wrap mode
            this.autoWrapMode = enable;
            break;
          case 25: // DECTCEM - Cursor visible
            this.cursorVisible = enable;
            break;
          case 47: // Alternate screen buffer
          case 1047:
            if (enable) {
              this.alternateBuffer = new TerminalBuffer(this.buffer.getCols(), this.buffer.getRows());
              this.buffer = this.alternateBuffer;
            } else {
              this.buffer = this.mainBuffer;
              this.alternateBuffer = null;
            }
            break;
          case 1000: // Mouse tracking
          case 1002: // Button event mouse tracking
          case 1003: // Any event mouse tracking
            this.mouseTrackingMode = enable ? mode : 0;
            break;
          case 1006: // SGR mouse encoding
            this.mouseEncodingFormat = enable ? MouseEncodingFormat.SGR : MouseEncodingFormat.X10;
            break;
          case 1015: // URXVT mouse encoding
            this.mouseEncodingFormat = enable ? MouseEncodingFormat.URXVT : MouseEncodingFormat.X10;
            break;
          case 1049: // Alternate screen buffer with cursor save/restore
            if (enable) {
              this.savedCursorRow = this.cursorRow;
              this.savedCursorCol = this.cursorCol;
              this.alternateBuffer = new TerminalBuffer(this.buffer.getCols(), this.buffer.getRows());
              this.buffer = this.alternateBuffer;
            } else {
              this.buffer = this.mainBuffer;
              this.alternateBuffer = null;
              this.cursorRow = this.savedCursorRow;
              this.cursorCol = this.savedCursorCol;
            }
            break;
          case 2004: // Bracketed paste mode
            this.bracketedPasteMode = enable;
            break;
        }
      } else {
        // Standard ANSI modes (no ? prefix)
        switch (mode) {
          case 4: // IRM - Insert/Replace Mode
            // TODO: Implement insert mode
            break;
          case 20: // LNM - Line Feed/New Line Mode
            // When set, Enter sends CR LF; when reset, Enter sends just CR
            this.newLineMode = enable;
            break;
        }
      }
    }
  }

  /**
   * Handle OSC sequences
   * Based on: osc.go handleOSC
   */
  private handleOSC(params: string[]): void {
    if (params.length === 0) return;

    const cmd = parseInt(params[0], 10);
    switch (cmd) {
      case 0: // Set window title and icon name
        if (params[1]) {
          this.title = params[1];
          this.iconName = params[1];
          this.onTitleChange(this.title);
          this.onIconNameChange(this.iconName);
        }
        break;
      case 1: // Set icon name only
        if (params[1]) {
          this.iconName = params[1];
          this.onIconNameChange(this.iconName);
        }
        break;
      case 2: // Set window title only
        if (params[1]) {
          this.title = params[1];
          this.onTitleChange(this.title);
        }
        break;
      case 7: // Set working directory
        if (params[1]) {
          this.cwd = this.parseFileUri(params[1]);
        }
        break;
      case 7777: // Tsyne custom: launch app
        // Format: OSC 7777 ; open ; AppName ; FilePath ST
        // or: OSC 7777 ; open ; AppName ST
        // or: OSC 7777 ; list ST
        this.handleTsyneOSC(params.slice(1));
        break;
    }
  }

  /**
   * Parse a file:// URI and return the path
   * Handles various formats:
   *   file:///path/to/dir         - Standard absolute path
   *   file://localhost/path       - Localhost prefix
   *   file://hostname/path        - Network path (returns as-is on Unix, UNC on Windows)
   *   file:///path%20with%20spaces - URL-encoded characters
   *   /path/to/dir                - Plain path (returned as-is)
   */
  private parseFileUri(uri: string): string {
    // If it's not a file:// URI, return as-is
    if (!uri.startsWith('file://')) {
      return uri;
    }

    // Remove file:// prefix
    let path = uri.substring(7);

    // Handle file:///path (standard format for local paths)
    if (path.startsWith('/')) {
      // Already an absolute path, decode and return
      return this.decodeUriPath(path);
    }

    // Handle file://localhost/path
    if (path.startsWith('localhost/')) {
      path = path.substring(9); // Remove 'localhost'
      return this.decodeUriPath(path);
    }

    // Handle file://hostname/path (network path)
    const slashIndex = path.indexOf('/');
    if (slashIndex > 0) {
      const hostname = path.substring(0, slashIndex);
      const pathPart = path.substring(slashIndex);

      // On Windows, convert to UNC path: \\hostname\path
      if (this.platform === 'windows') {
        return `\\\\${hostname}${pathPart.replace(/\//g, '\\')}`;
      }

      // On Unix, just use the path part (network mounts aren't standard)
      return this.decodeUriPath(pathPart);
    }

    // Fallback: just decode whatever we have
    return this.decodeUriPath('/' + path);
  }

  /**
   * Decode URL-encoded characters in a path
   */
  private decodeUriPath(path: string): string {
    try {
      return decodeURIComponent(path);
    } catch {
      // If decoding fails, return the original path
      return path;
    }
  }

  /**
   * Handle Tsyne-specific OSC sequences (OSC 7777)
   * Commands:
   *   open;AppName         - Launch app by name
   *   open;AppName;path    - Launch app with file path
   *   list                 - List available apps to stdout
   */
  private handleTsyneOSC(params: string[]): void {
    if (params.length === 0) return;

    const command = params[0];
    switch (command) {
      case 'open':
        if (params.length >= 2 && this.desktopService?.isAvailable()) {
          const appName = params[1];
          const filePath = params[2]; // Optional
          this.desktopService.launchApp(appName, filePath).then(success => {
            if (!success) {
              // Write error to terminal
              this.write(`\r\n\x1b[31mtsyne: app not found: ${appName}\x1b[0m\r\n`);
            }
          });
        } else if (!this.desktopService?.isAvailable()) {
          this.write(`\r\n\x1b[31mtsyne: desktop service not available\x1b[0m\r\n`);
        }
        break;
      case 'list':
        if (this.desktopService?.isAvailable()) {
          const apps = this.desktopService.listApps();
          this.write('\r\n');
          for (const app of apps) {
            const category = app.category ? ` (${app.category})` : '';
            this.write(`${app.name}${category}\r\n`);
          }
        }
        break;
    }
  }

  /**
   * Handle DCS (Device Control String) sequences
   * Based on: dcs.go
   *
   * Common DCS sequences:
   * - DECRQSS ($q) - Request Status String (query terminal settings)
   * - Sixel graphics (q...) - Sixel image data
   * - ReGIS graphics (p...) - ReGIS vector graphics
   * - DECUDK (!u) - User Defined Keys
   *
   * Format: DCS [params] [intermediates] final-byte data ST
   */
  private handleDCS(data: string): void {
    if (this.debug) {
      console.log(`[Terminal:handleDCS] data="${data.substring(0, 50)}${data.length > 50 ? '...' : ''}"`);
    }

    if (data.length === 0) return;

    // Check registered handlers first (longest prefix match)
    let handled = false;
    this.dcsHandlers.forEach((handler, prefix) => {
      if (!handled && data.startsWith(prefix)) {
        handler(data.substring(prefix.length));
        handled = true;
      }
    });
    if (handled) return;

    // Built-in handlers:
    // $q... - DECRQSS (Request Status String)
    // q...  - Sixel graphics
    // p...  - ReGIS graphics

    // Check for DECRQSS ($q)
    if (data.startsWith('$q')) {
      this.handleDECRQSS(data.substring(2));
      return;
    }

    // Check for Sixel graphics (just 'q' followed by data)
    if (data.startsWith('q')) {
      // Sixel graphics - not implemented, just consume silently
      if (this.debug) {
        console.log('[Terminal:handleDCS] Sixel graphics received (not rendered)');
      }
      return;
    }

    // Unknown DCS - log if debugging
    if (this.debug) {
      console.log(`[Terminal:handleDCS] Unknown DCS sequence: ${data.substring(0, 20)}`);
    }
  }

  /**
   * Handle DECRQSS (Request Status String)
   * Responds with current terminal settings
   *
   * Query format: DCS $ q Pt ST
   * Response format: DCS Ps $ r Pt ST
   * Where Ps is 1 for valid, 0 for invalid
   */
  private handleDECRQSS(query: string): void {
    if (this.debug) {
      console.log(`[Terminal:handleDECRQSS] query="${query}"`);
    }

    let response = '';

    switch (query) {
      case 'm': // SGR (Select Graphic Rendition)
        // Report current text attributes
        response = '0m'; // Default attributes
        break;
      case 'r': // DECSTBM (Scrolling Region)
        response = `${this.scrollTop + 1};${this.scrollBottom + 1}r`;
        break;
      case 's': // DECSLRM (Left/Right Margins) - not implemented
        response = '';
        break;
      case '"p': // DECSCL (Conformance Level)
        response = '65;1"p'; // VT500 level
        break;
      case ' q': // DECSCUSR (Cursor Style)
        response = '1 q'; // Blinking block
        break;
      default:
        // Unknown query - send invalid response
        if (this.debug) {
          console.log(`[Terminal:handleDECRQSS] Unknown query: ${query}`);
        }
        this.sendInput('\x1bP0$r\x1b\\'); // Invalid response
        return;
    }

    // Send valid response: DCS 1 $ r <response> ST
    this.sendInput(`\x1bP1$r${response}\x1b\\`);
  }

  /**
   * Handle APC (Application Program Command) sequences
   * Based on: apc.go
   *
   * Used for custom application commands:
   * - tmux passthrough
   * - Terminal multiplexer communication
   * - Custom extensions
   *
   * Format: APC data ST
   */
  private handleAPC(data: string): void {
    if (this.debug) {
      console.log(`[Terminal:handleAPC] data="${data.substring(0, 50)}${data.length > 50 ? '...' : ''}"`);
    }

    if (data.length === 0) return;

    // Check registered handlers (longest prefix match)
    let handled = false;
    this.apcHandlers.forEach((handler, prefix) => {
      if (!handled && data.startsWith(prefix)) {
        handler(data.substring(prefix.length));
        handled = true;
      }
    });
    if (handled) return;

    // No registered handler - common uses to potentially support:
    // - tmux passthrough (\033Ptmux;...\033\\)
    // - iTerm2 proprietary sequences
    // - Custom application commands

    // Log unhandled APC if debugging
    if (this.debug) {
      console.log(`[Terminal:handleAPC] Unhandled APC: ${data.substring(0, 20)}`);
    }
  }

  /**
   * Handle escape sequences
   * Based on: escape.go handleEsc
   */
  private handleEsc(_intermediates: string, final: string): void {
    switch (final) {
      case '7': // DECSC - Save cursor
        this.savedCursorRow = this.cursorRow;
        this.savedCursorCol = this.cursorCol;
        break;
      case '8': // DECRC - Restore cursor
        this.cursorRow = this.savedCursorRow;
        this.cursorCol = this.savedCursorCol;
        break;
      case '=': // DECPAM - Application keypad mode
        this.applicationKeypadMode = true;
        break;
      case '>': // DECPNM - Normal keypad mode
        this.applicationKeypadMode = false;
        break;
      case 'D': // IND - Index (move down)
        if (this.cursorRow === this.scrollBottom) {
          this.buffer.scrollUp(this.scrollTop, this.scrollBottom);
        } else {
          this.cursorRow++;
        }
        break;
      case 'E': // NEL - Next line
        this.cursorCol = 0;
        if (this.cursorRow === this.scrollBottom) {
          this.buffer.scrollUp(this.scrollTop, this.scrollBottom);
        } else {
          this.cursorRow++;
        }
        break;
      case 'M': // RI - Reverse index (move up)
        if (this.cursorRow === this.scrollTop) {
          this.buffer.scrollDown(this.scrollTop, this.scrollBottom);
        } else {
          this.cursorRow--;
        }
        break;
      case 'c': // RIS - Reset
        this.reset();
        break;
    }
  }

  /**
   * Reset terminal to initial state
   */
  reset(): void {
    this.buffer.clear();
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.scrollTop = 0;
    this.scrollBottom = this.buffer.getRows() - 1;
    this.currentAttrs = this.defaultAttrs();
    this.originMode = false;
    this.autoWrapMode = true;
    this.cursorVisible = true;
    this.applicationCursorKeys = false;
    this.bracketedPasteMode = false;
    this.mouseTrackingMode = 0;
    // Reset charset state
    this.g0Charset = Charset.ASCII;
    this.g1Charset = Charset.ASCII;
    this.useG1 = false;
  }

  // ============================================================================
  // Selection
  // ============================================================================

  /**
   * Start text selection
   * Based on: select.go
   * @param row Starting row
   * @param col Starting column
   * @param mode Selection mode (linear or block). Default is linear.
   */
  startSelection(row: number, col: number, mode: SelectionMode = SelectionMode.Linear): void {
    this.selection = {
      active: true,
      startRow: row,
      startCol: col,
      endRow: row,
      endCol: col,
      mode,
    };
  }

  /**
   * Update selection endpoint
   */
  updateSelection(row: number, col: number): void {
    if (this.selection.active) {
      this.selection.endRow = row;
      this.selection.endCol = col;
    }
  }

  /**
   * Set selection mode (can be changed during selection)
   */
  setSelectionMode(mode: SelectionMode): void {
    this.selection.mode = mode;
  }

  /**
   * Get current selection mode
   */
  getSelectionMode(): SelectionMode {
    return this.selection.mode;
  }

  /**
   * End selection and return selected text
   * Based on: select.go SelectedText
   * Supports both linear and block (rectangular) selection modes
   */
  endSelection(): string {
    if (!this.selection.active) return '';

    this.selection.active = false;

    if (this.selection.mode === SelectionMode.Block) {
      return this.getBlockSelectionText();
    }

    return this.getLinearSelectionText();
  }

  /**
   * Get text from linear (normal) selection
   */
  private getLinearSelectionText(): string {
    let startRow = this.selection.startRow;
    let startCol = this.selection.startCol;
    let endRow = this.selection.endRow;
    let endCol = this.selection.endCol;

    // Normalize selection direction
    if (startRow > endRow || (startRow === endRow && startCol > endCol)) {
      [startRow, endRow] = [endRow, startRow];
      [startCol, endCol] = [endCol, startCol];
    }

    const lines: string[] = [];
    for (let row = startRow; row <= endRow; row++) {
      let line = '';
      const colStart = row === startRow ? startCol : 0;
      const colEnd = row === endRow ? endCol : this.buffer.getCols() - 1;

      for (let col = colStart; col <= colEnd; col++) {
        const cell = this.buffer.getCell(row, col);
        line += cell.char;
      }

      lines.push(line.trimEnd());
    }

    return lines.join('\n');
  }

  /**
   * Get text from block (rectangular) selection
   * Each line contains only the characters within the column range
   */
  private getBlockSelectionText(): string {
    let startRow = this.selection.startRow;
    let startCol = this.selection.startCol;
    let endRow = this.selection.endRow;
    let endCol = this.selection.endCol;

    // Normalize row order
    if (startRow > endRow) {
      [startRow, endRow] = [endRow, startRow];
    }

    // Normalize column order (block selection uses absolute columns)
    if (startCol > endCol) {
      [startCol, endCol] = [endCol, startCol];
    }

    const lines: string[] = [];
    for (let row = startRow; row <= endRow; row++) {
      let line = '';
      for (let col = startCol; col <= endCol; col++) {
        const cell = this.buffer.getCell(row, col);
        line += cell.char;
      }
      // For block selection, preserve trailing spaces within the block
      // but trim trailing spaces that extend beyond actual content
      lines.push(line.trimEnd());
    }

    return lines.join('\n');
  }

  /**
   * Get the normalized selection bounds
   * Returns the top-left and bottom-right corners regardless of selection direction
   */
  getSelectionBounds(): { startRow: number; startCol: number; endRow: number; endCol: number } | null {
    if (!this.selection.active) return null;

    let { startRow, startCol, endRow, endCol } = this.selection;

    if (this.selection.mode === SelectionMode.Block) {
      // For block selection, normalize both row and column independently
      if (startRow > endRow) [startRow, endRow] = [endRow, startRow];
      if (startCol > endCol) [startCol, endCol] = [endCol, startCol];
    } else {
      // For linear selection, normalize by position
      if (startRow > endRow || (startRow === endRow && startCol > endCol)) {
        [startRow, endRow] = [endRow, startRow];
        [startCol, endCol] = [endCol, startCol];
      }
    }

    return { startRow, startCol, endRow, endCol };
  }

  /**
   * Check if a cell is within the current selection
   * Useful for rendering selection highlighting
   */
  isCellSelected(row: number, col: number): boolean {
    if (!this.selection.active) return false;

    const bounds = this.getSelectionBounds();
    if (!bounds) return false;

    const { startRow, startCol, endRow, endCol } = bounds;

    if (row < startRow || row > endRow) return false;

    if (this.selection.mode === SelectionMode.Block) {
      // Block selection: cell must be within column range on any selected row
      return col >= startCol && col <= endCol;
    } else {
      // Linear selection: depends on row position
      if (row === startRow && row === endRow) {
        // Single row selection
        return col >= startCol && col <= endCol;
      } else if (row === startRow) {
        // First row: from startCol to end of row
        return col >= startCol;
      } else if (row === endRow) {
        // Last row: from start of row to endCol
        return col <= endCol;
      } else {
        // Middle rows: entire row is selected
        return true;
      }
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selection.active = false;
  }

  // ============================================================================
  // Word Selection (Double-click)
  // ============================================================================

  /**
   * Handle click event for double-click detection
   * Returns true if a double-click was detected and word was selected
   */
  handleClick(row: number, col: number, timestamp: number = Date.now()): boolean {
    const timeDiff = timestamp - this.lastClickTime;
    const samePosition = row === this.lastClickRow && col === this.lastClickCol;

    // Update last click info
    this.lastClickTime = timestamp;
    this.lastClickRow = row;
    this.lastClickCol = col;

    // Check for double-click
    if (timeDiff < this.DOUBLE_CLICK_THRESHOLD && samePosition) {
      this.selectWord(row, col);
      return true;
    }

    return false;
  }

  /**
   * Select the word at the given position
   */
  selectWord(row: number, col: number): void {
    const bounds = this.getWordBounds(row, col);
    if (bounds) {
      this.selection = {
        active: true,
        startRow: row,
        startCol: bounds.start,
        endRow: row,
        endCol: bounds.end,
        mode: SelectionMode.Linear,
      };
      this.onUpdate();
    }
  }

  /**
   * Get the word boundaries at the given position
   * Returns { start, end } column indices or null if not in a word
   */
  getWordBounds(row: number, col: number): { start: number; end: number } | null {
    const cols = this.buffer.getCols();
    if (row < 0 || row >= this.buffer.getRows() || col < 0 || col >= cols) {
      return null;
    }

    // Get character at position
    const cell = this.buffer.getCell(row, col);
    if (!this.isWordChar(cell.char)) {
      return null;
    }

    // Find word start
    let start = col;
    while (start > 0) {
      const prevCell = this.buffer.getCell(row, start - 1);
      if (!this.isWordChar(prevCell.char)) break;
      start--;
    }

    // Find word end
    let end = col;
    while (end < cols - 1) {
      const nextCell = this.buffer.getCell(row, end + 1);
      if (!this.isWordChar(nextCell.char)) break;
      end++;
    }

    return { start, end };
  }

  /**
   * Check if a character is part of a word
   * Word characters include alphanumeric and common programming symbols
   */
  private isWordChar(char: string): boolean {
    if (!char || char === ' ' || char === '\0') return false;
    // Alphanumeric
    if (/[a-zA-Z0-9_]/.test(char)) return true;
    // Common path/URL characters
    if (/[.\-\/\\:]/.test(char)) return true;
    return false;
  }

  /**
   * Get the word at the given position
   */
  getWordAt(row: number, col: number): string {
    const bounds = this.getWordBounds(row, col);
    if (!bounds) return '';

    let word = '';
    for (let c = bounds.start; c <= bounds.end; c++) {
      const cell = this.buffer.getCell(row, c);
      word += cell.char;
    }
    return word;
  }

  // ============================================================================
  // Context Menu (Right-click)
  // ============================================================================

  /**
   * Handle right-click context menu request
   * Triggers the onContextMenu callback with appropriate menu items
   */
  handleContextMenu(row: number, col: number): void {
    const items = this.getContextMenuItems();
    this.onContextMenu(row, col, items);
  }

  /**
   * Get context menu items based on current terminal state
   */
  getContextMenuItems(): ContextMenuItem[] {
    const hasSelection = this.selection.active;
    const items: ContextMenuItem[] = [
      {
        label: 'Copy',
        action: 'copy',
        enabled: hasSelection,
      },
      {
        label: 'Paste',
        action: 'paste',
        enabled: true,
      },
      {
        label: '',
        action: '',
        enabled: false,
        separator: true,
      },
      {
        label: 'Select All',
        action: 'selectAll',
        enabled: true,
      },
      {
        label: 'Clear',
        action: 'clear',
        enabled: true,
      },
    ];

    return items;
  }

  /**
   * Execute a context menu action
   */
  executeContextMenuAction(action: string): void {
    switch (action) {
      case 'copy':
        // Copy is handled by the UI layer which has clipboard access
        break;
      case 'paste':
        // Paste is handled by the UI layer which has clipboard access
        break;
      case 'selectAll':
        this.selectAll();
        break;
      case 'clear':
        this.clear();
        break;
    }
  }

  /**
   * Select all text in the terminal
   */
  selectAll(): void {
    this.selection = {
      active: true,
      startRow: 0,
      startCol: 0,
      endRow: this.buffer.getRows() - 1,
      endCol: this.buffer.getCols() - 1,
      mode: SelectionMode.Linear,
    };
    this.onUpdate();
  }

  /**
   * Clear the terminal screen
   */
  clear(): void {
    this.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to home
  }

  // ============================================================================
  // Touch Event Handling
  // ============================================================================

  /**
   * Set cell dimensions for touch coordinate conversion
   * Should be called when terminal font/size changes
   */
  setCellDimensions(width: number, height: number): void {
    this.cellWidth = width;
    this.cellHeight = height;
  }

  /**
   * Convert pixel coordinates to terminal cell coordinates
   */
  pixelToCell(x: number, y: number): { row: number; col: number } {
    const col = Math.floor(x / this.cellWidth);
    const row = Math.floor(y / this.cellHeight);
    return {
      row: Math.max(0, Math.min(row, this.buffer.getRows() - 1)),
      col: Math.max(0, Math.min(col, this.buffer.getCols() - 1)),
    };
  }

  /**
   * Handle touch event
   * Main entry point for touch events from the UI layer
   */
  handleTouchEvent(event: TouchEvent): void {
    switch (event.type) {
      case TouchEventType.TouchDown:
        this.handleTouchDown(event);
        break;
      case TouchEventType.TouchMove:
        this.handleTouchMove(event);
        break;
      case TouchEventType.TouchUp:
        this.handleTouchUp(event);
        break;
      case TouchEventType.TouchCancel:
        this.handleTouchCancel(event);
        break;
    }
  }

  /**
   * Handle touch down (finger pressed)
   */
  private handleTouchDown(event: TouchEvent): void {
    // Cancel any existing long press timer
    this.cancelLongPressTimer();

    // Determine selection mode based on Alt modifier
    // Alt+drag = block selection, normal drag = linear selection
    const selectionMode = event.modifiers?.alt ? SelectionMode.Block : SelectionMode.Linear;

    // Initialize touch state
    this.touchState = {
      active: true,
      startX: event.x,
      startY: event.y,
      startTime: event.timestamp,
      lastX: event.x,
      lastY: event.y,
      touchId: event.id,
      isLongPress: false,
      isDragging: false,
      selectionMode,
    };

    // Clear any existing selection
    this.clearSelection();

    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      if (this.touchState.active && !this.touchState.isDragging) {
        this.touchState.isLongPress = true;
        const { row, col } = this.pixelToCell(this.touchState.startX, this.touchState.startY);
        this.onLongPress(row, col);
      }
    }, LONG_PRESS_DURATION);
  }

  /**
   * Handle touch move (finger dragged)
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.touchState.active || event.id !== this.touchState.touchId) {
      return;
    }

    const dx = event.x - this.touchState.startX;
    const dy = event.y - this.touchState.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if we've moved enough to start dragging
    if (!this.touchState.isDragging && distance > DRAG_THRESHOLD) {
      this.touchState.isDragging = true;
      this.cancelLongPressTimer();

      // Start selection at the initial touch point with the appropriate mode
      // Alt+drag = block selection, normal drag = linear selection
      const start = this.pixelToCell(this.touchState.startX, this.touchState.startY);
      this.startSelection(start.row, start.col, this.touchState.selectionMode);
    }

    // If dragging, update selection
    if (this.touchState.isDragging) {
      const current = this.pixelToCell(event.x, event.y);
      this.updateSelection(current.row, current.col);
      this.onUpdate();
    }

    // Update last position
    this.touchState.lastX = event.x;
    this.touchState.lastY = event.y;
  }

  /**
   * Handle touch up (finger released)
   */
  private handleTouchUp(event: TouchEvent): void {
    if (!this.touchState.active || event.id !== this.touchState.touchId) {
      return;
    }

    this.cancelLongPressTimer();

    const duration = event.timestamp - this.touchState.startTime;

    // Check for tap gesture (quick touch without dragging)
    if (!this.touchState.isDragging && !this.touchState.isLongPress && duration < TAP_THRESHOLD) {
      const { row, col } = this.pixelToCell(event.x, event.y);
      this.onTap(row, col);
    }

    // Reset touch state
    this.resetTouchState();
  }

  /**
   * Handle touch cancel (interrupted by system)
   */
  private handleTouchCancel(_event: TouchEvent): void {
    this.cancelLongPressTimer();
    this.clearSelection();
    this.resetTouchState();
  }

  /**
   * Cancel long press timer
   */
  private cancelLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Reset touch state
   */
  private resetTouchState(): void {
    this.touchState = {
      active: false,
      startX: 0,
      startY: 0,
      startTime: 0,
      lastX: 0,
      lastY: 0,
      touchId: -1,
      isLongPress: false,
      isDragging: false,
      selectionMode: SelectionMode.Linear,
    };
  }

  /**
   * Get current touch state (for testing)
   */
  getTouchState(): TouchState {
    return { ...this.touchState };
  }

  /**
   * Check if currently in a touch gesture
   */
  isTouchActive(): boolean {
    return this.touchState.active;
  }

  // ============================================================================
  // Mouse Protocol Handling
  // ============================================================================

  /**
   * Handle mouse event from UI layer
   * Encodes and sends mouse events to the PTY based on tracking mode
   */
  handleMouseEvent(event: MouseEvent): boolean {
    // Check if mouse tracking is enabled
    if (this.mouseTrackingMode === MouseTrackingMode.None) {
      return false;  // Not handled - allow default behavior
    }

    const shouldReport = this.shouldReportMouseEvent(event);
    if (!shouldReport) {
      return false;
    }

    // Encode and send mouse event
    const encoded = this.encodeMouseEvent(event);
    if (encoded) {
      this.sendInput(encoded);
      return true;  // Event was handled
    }

    return false;
  }

  /**
   * Determine if a mouse event should be reported based on tracking mode
   */
  private shouldReportMouseEvent(event: MouseEvent): boolean {
    switch (this.mouseTrackingMode) {
      case MouseTrackingMode.X10:
        // X10 only reports button press, not release or motion
        return event.type === MouseEventType.Press;

      case MouseTrackingMode.ButtonEvent:
        // Report press, release, and motion while button is pressed
        if (event.type === MouseEventType.Press || event.type === MouseEventType.Release) {
          return true;
        }
        if (event.type === MouseEventType.Move && this.mouseButtonState !== MouseButton.Release) {
          return true;
        }
        if (event.type === MouseEventType.Wheel) {
          return true;
        }
        return false;

      case MouseTrackingMode.AnyEvent:
        // Report all mouse events
        return true;

      default:
        return false;
    }
  }

  /**
   * Encode mouse event for transmission to PTY
   * Uses X10 encoding by default, SGR if enabled
   */
  private encodeMouseEvent(event: MouseEvent): string {
    // Update button state
    if (event.type === MouseEventType.Press) {
      this.mouseButtonState = event.button;
    } else if (event.type === MouseEventType.Release) {
      this.mouseButtonState = MouseButton.Release;
    }

    // Update last position
    this.lastMouseX = event.x;
    this.lastMouseY = event.y;

    // Calculate button code
    let buttonCode = this.getMouseButtonCode(event);

    // Add modifier bits
    if (event.modifiers.shift) buttonCode |= 4;
    if (event.modifiers.alt) buttonCode |= 8;
    if (event.modifiers.ctrl) buttonCode |= 16;

    // Add motion flag for move events
    if (event.type === MouseEventType.Move) {
      buttonCode |= 32;
    }

    // Clamp coordinates to valid range (1-based, max 223 for X10)
    const x = Math.max(1, Math.min(event.x, 223));
    const y = Math.max(1, Math.min(event.y, 223));

    switch (this.mouseEncodingFormat) {
      case MouseEncodingFormat.SGR:
        return this.encodeSGR(buttonCode, x, y, event.type === MouseEventType.Release);

      case MouseEncodingFormat.URXVT:
        return this.encodeURXVT(buttonCode, x, y);

      case MouseEncodingFormat.X10:
      default:
        return this.encodeX10(buttonCode, x, y);
    }
  }

  /**
   * Get button code for mouse protocol
   */
  private getMouseButtonCode(event: MouseEvent): number {
    switch (event.button) {
      case MouseButton.Left:
        return 0;
      case MouseButton.Middle:
        return 1;
      case MouseButton.Right:
        return 2;
      case MouseButton.Release:
        return 3;  // Used in X10 for release
      case MouseButton.WheelUp:
        return 64;
      case MouseButton.WheelDown:
        return 65;
      case MouseButton.WheelLeft:
        return 66;
      case MouseButton.WheelRight:
        return 67;
      default:
        return 0;
    }
  }

  /**
   * Encode mouse event in X10 format
   * Format: CSI M Cb Cx Cy
   * Where Cb, Cx, Cy are single bytes with value + 32
   */
  private encodeX10(buttonCode: number, x: number, y: number): string {
    return `\x1b[M${String.fromCharCode(buttonCode + 32)}${String.fromCharCode(x + 32)}${String.fromCharCode(y + 32)}`;
  }

  /**
   * Encode mouse event in SGR format
   * Format: CSI < Cb ; Cx ; Cy M (press) or CSI < Cb ; Cx ; Cy m (release)
   */
  private encodeSGR(buttonCode: number, x: number, y: number, isRelease: boolean): string {
    const suffix = isRelease ? 'm' : 'M';
    return `\x1b[<${buttonCode};${x};${y}${suffix}`;
  }

  /**
   * Encode mouse event in URXVT format
   * Format: CSI Cb ; Cx ; Cy M
   */
  private encodeURXVT(buttonCode: number, x: number, y: number): string {
    return `\x1b[${buttonCode + 32};${x};${y}M`;
  }

  /**
   * Set mouse encoding format
   */
  setMouseEncodingFormat(format: MouseEncodingFormat): void {
    this.mouseEncodingFormat = format;
  }

  /**
   * Get current mouse encoding format
   */
  getMouseEncodingFormat(): MouseEncodingFormat {
    return this.mouseEncodingFormat;
  }

  /**
   * Get current mouse tracking mode
   */
  getMouseTrackingMode(): number {
    return this.mouseTrackingMode;
  }

  /**
   * Check if mouse tracking is enabled
   */
  isMouseTrackingEnabled(): boolean {
    return this.mouseTrackingMode !== MouseTrackingMode.None;
  }

  /**
   * Create a mouse event from UI coordinates
   * Convenience method for UI layer
   */
  createMouseEvent(
    type: MouseEventType,
    button: MouseButton,
    pixelX: number,
    pixelY: number,
    modifiers: { shift?: boolean; alt?: boolean; ctrl?: boolean } = {}
  ): MouseEvent {
    const cell = this.pixelToCell(pixelX, pixelY);
    return {
      type,
      button,
      x: cell.col + 1,  // Mouse protocol uses 1-based coordinates
      y: cell.row + 1,
      modifiers: {
        shift: modifiers.shift || false,
        alt: modifiers.alt || false,
        ctrl: modifiers.ctrl || false,
      },
    };
  }

  // ============================================================================
  // Getters for rendering
  // ============================================================================

  getBuffer(): TerminalBuffer {
    return this.buffer;
  }

  getCursorRow(): number {
    return this.cursorRow;
  }

  getCursorCol(): number {
    return this.cursorCol;
  }

  isCursorVisible(): boolean {
    return this.cursorVisible;
  }

  getTitle(): string {
    return this.title;
  }

  getIconName(): string {
    return this.iconName;
  }

  getCwd(): string {
    return this.cwd;
  }

  /**
   * Get the last shell exit code
   * Returns null if shell is still running or hasn't been started
   */
  getExitCode(): number | null {
    return this.lastExitCode;
  }

  getConfig(): TerminalConfig {
    return {
      cols: this.buffer.getCols(),
      rows: this.buffer.getRows(),
      title: this.title,
      cwd: this.cwd,
    };
  }

  getSelection(): Selection {
    return { ...this.selection };
  }

  /**
   * Get terminal content as plain text
   * Based on: term.go Text()
   */
  getText(): string {
    const lines: string[] = [];
    const buffer = this.buffer.getBuffer();

    for (const row of buffer) {
      let line = '';
      for (const cell of row) {
        line += cell.char;
      }
      lines.push(line.trimEnd());
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Terminal UI
// ============================================================================

/**
 * Terminal UI built with Tsyne
 * Based on: cmd/fyneterm/main.go and render.go
 */
// Cursor blink interval in ms (standard terminal blink rate)
const CURSOR_BLINK_INTERVAL = 530;

// Selection highlight color (blue tint for better visibility)
const SELECTION_BG_COLOR = '#264f78';
const SELECTION_FG_COLOR = '#ffffff';

export class TerminalUI {
  private terminal: Terminal;
  private textGrid: TextGrid | null = null;
  private win: Window | ITsyneWindow | null = null;
  private a: App;
  private cols: number = DEFAULT_COLS;
  private rows: number = DEFAULT_ROWS;
  // Track previous selection bounds to clear them when selection changes
  private prevSelectionBounds: { startRow: number; startCol: number; endRow: number; endCol: number } | null = null;

  // Cursor blinking state
  private cursorBlinkVisible: boolean = true;
  private cursorBlinkTimer: ReturnType<typeof setInterval> | null = null;
  private hasFocus: boolean = true;
  // Track previous cursor position to clear it when it moves
  private prevCursorRow: number = -1;
  private prevCursorCol: number = -1;

  constructor(a: App, cols: number = DEFAULT_COLS, rows: number = DEFAULT_ROWS) {
    this.a = a;
    this.cols = cols;
    this.rows = rows;
    this.terminal = new Terminal(cols, rows);

    this.terminal.onUpdate = () => this.scheduleRender();
    this.terminal.onTitleChange = (title) => {
      if (this.win) {
        this.win.setTitle(title);
      }
    };
    this.terminal.onBell = () => {
      // Could play a sound or flash the window
    };
    this.terminal.onExit = () => {
      this.stopCursorBlink();
      if (this.win) {
        process.exit(0);
      }
    };

    // Start cursor blinking
    this.startCursorBlink();
  }

  /**
   * Start cursor blink timer
   */
  private startCursorBlink(): void {
    if (this.cursorBlinkTimer) return;

    this.cursorBlinkVisible = true;
    this.cursorBlinkTimer = setInterval(() => {
      if (this.hasFocus) {
        this.cursorBlinkVisible = !this.cursorBlinkVisible;
        this.renderCursor();
      }
    }, CURSOR_BLINK_INTERVAL);
  }

  /**
   * Stop cursor blink timer
   */
  private stopCursorBlink(): void {
    if (this.cursorBlinkTimer) {
      clearInterval(this.cursorBlinkTimer);
      this.cursorBlinkTimer = null;
    }
  }

  /**
   * Reset cursor blink (show cursor immediately, restart timer)
   * Called when user types to keep cursor visible during input
   */
  private resetCursorBlink(): void {
    this.cursorBlinkVisible = true;
    if (this.cursorBlinkTimer) {
      clearInterval(this.cursorBlinkTimer);
    }
    this.cursorBlinkTimer = setInterval(() => {
      if (this.hasFocus) {
        this.cursorBlinkVisible = !this.cursorBlinkVisible;
        this.renderCursor();
      }
    }, CURSOR_BLINK_INTERVAL);
  }

  /**
   * Render just the cursor (for blink updates without full re-render)
   */
  private async renderCursor(): Promise<void> {
    if (!this.textGrid) return;

    const buffer = this.terminal.getBuffer();
    const cells = buffer.getBuffer();
    const cursorRow = this.terminal.getCursorRow();
    const cursorCol = this.terminal.getCursorCol();
    const cursorVisible = this.terminal.isCursorVisible();

    // Clear previous cursor position if it moved
    if (this.prevCursorRow >= 0 && this.prevCursorCol >= 0 &&
        (this.prevCursorRow !== cursorRow || this.prevCursorCol !== cursorCol)) {
      if (this.prevCursorRow < cells.length && this.prevCursorCol < cells[this.prevCursorRow].length) {
        const prevCell = cells[this.prevCursorRow][this.prevCursorCol];
        const style = this.cellAttrsToStyle(prevCell.attrs);
        if (!style.fgColor) style.fgColor = '#ffffff';
        if (!style.bgColor) style.bgColor = '#000000';
        await this.textGrid.setCell(this.prevCursorRow, this.prevCursorCol, undefined, style);
      }
    }

    // Render current cursor position
    if (cursorRow < cells.length && cursorCol < cells[cursorRow].length) {
      const cell = cells[cursorRow][cursorCol];
      const style = this.cellAttrsToStyle(cell.attrs);

      if (cursorVisible && this.cursorBlinkVisible && this.hasFocus) {
        // Cursor visible: white block
        style.bgColor = '#ffffff';
        style.fgColor = '#000000';
      } else {
        // Cursor hidden: restore original cell style
        if (!style.fgColor) style.fgColor = '#ffffff';
        if (!style.bgColor) style.bgColor = '#000000';
      }

      await this.textGrid.setCell(cursorRow, cursorCol, undefined, style);
    }

    this.prevCursorRow = cursorRow;
    this.prevCursorCol = cursorCol;
  }

  /**
   * Build the terminal UI
   */
  async buildUI(win: Window | ITsyneWindow): Promise<void> {
    this.win = win;
    this.buildMainMenu(win);

    this.a.vbox(() => {
      // Terminal display area with keyboard input
      this.textGrid = this.a.textgrid({
        text: '',
        showLineNumbers: false,
        showWhitespace: false,
        // Handle typed characters (regular text input)
        onTyped: (char: string) => {
          this.resetCursorBlink();
          this.terminal.typeChar(char);
        },
        // Handle focus changes
        onFocus: (focused: boolean) => {
          this.hasFocus = focused;
          if (focused) {
            this.cursorBlinkVisible = true;
            this.renderCursor();
          } else {
            // Show solid cursor when unfocused (no blink)
            this.cursorBlinkVisible = true;
            this.renderCursor();
          }
        },
        // Handle special keys (arrows, enter, backspace, etc.)
        onKeyDown: (key: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => {
          // Reset cursor blink to keep cursor visible while typing
          this.resetCursorBlink();

          // Debug
          console.log(`[Terminal] onKeyDown: key="${key}" ctrl=${modifiers.ctrl} shift=${modifiers.shift}`);

          // Intercept Ctrl+Shift+C for copy (Ctrl+C is SIGINT)
          if (modifiers.ctrl && modifiers.shift && (key === 'C' || key === 'c')) {
            console.log('[Terminal] Copy triggered');
            this.copy();
            return;
          }
          // Intercept Ctrl+Shift+V for paste
          if (modifiers.ctrl && modifiers.shift && (key === 'V' || key === 'v')) {
            console.log('[Terminal] Paste triggered');
            this.paste();
            return;
          }

          // Map Fyne key names to terminal key names
          const keyMap: Record<string, string> = {
            'Return': 'Enter',
            'BackSpace': 'Backspace',
            'Up': 'ArrowUp',
            'Down': 'ArrowDown',
            'Left': 'ArrowLeft',
            'Right': 'ArrowRight',
          };
          const mappedKey = keyMap[key] || key;

          // For special keys or when modifiers are used
          if (mappedKey.length > 1 || modifiers.ctrl || modifiers.alt) {
            this.terminal.typeKey(mappedKey, modifiers);
          }
        },
        // Mouse handling for text selection
        onMouseDown: (x: number, y: number, button: number, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => {
          console.log(`[Terminal] MouseDown button=${button}`);
          // Only handle left button for selection
          if (button !== 1) return;

          // Convert to touch event and delegate to terminal
          this.terminal.handleTouchEvent({
            type: TouchEventType.TouchDown,
            id: 0,
            x,
            y,
            timestamp: Date.now(),
            modifiers,
          });
        },
        onMouseMove: (x: number, y: number, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => {
          // Delegate to terminal for selection drag
          this.terminal.handleTouchEvent({
            type: TouchEventType.TouchMove,
            id: 0,
            x,
            y,
            timestamp: Date.now(),
            modifiers,
          });
        },
        onMouseUp: (x: number, y: number, button: number, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean }) => {
          if (button !== 1) return;

          this.terminal.handleTouchEvent({
            type: TouchEventType.TouchUp,
            id: 0,
            x,
            y,
            timestamp: Date.now(),
            modifiers,
          });
        },
      });
    });

    // Start the shell
    console.log('[TerminalUI] About to start shell');
    this.terminal.runLocalShell();
    console.log('[TerminalUI] Shell started');

    // Initial render
    await this.render();
    console.log('[TerminalUI] Initial render complete');
  }

  /**
   * Build main menu
   */
  private buildMainMenu(win: Window | ITsyneWindow): void {
    win.setMainMenu([
      {
        label: 'File',
        items: [
          { label: 'New Window', onSelected: () => this.newWindow() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => this.exit() },
        ],
      },
      {
        label: 'Edit',
        items: [
          { label: 'Copy', onSelected: () => this.copy() },
          { label: 'Paste', onSelected: () => this.paste() },
          { label: '', isSeparator: true },
          { label: 'Clear Scrollback', onSelected: () => this.clearScrollback() },
          { label: 'Reset Terminal', onSelected: () => this.reset() },
        ],
      },
      {
        label: 'Help',
        items: [{ label: 'About', onSelected: () => this.showAbout() }],
      },
    ]);
  }

  /**
   * Schedule a render with simple throttling
   */
  private renderTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleRender(): void {
    // If a render is already scheduled, don't schedule another
    if (this.renderTimer) return;

    // Schedule render on next tick (batches multiple updates)
    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.render();
    }, 16); // ~60fps
  }

  /**
   * Render terminal content to TextGrid
   * Based on: render.go
   */
  private async render(): Promise<void> {
    if (!this.textGrid) return;

    const buffer = this.terminal.getBuffer();
    const cells = buffer.getBuffer();
    const cursorRow = this.terminal.getCursorRow();
    const cursorCol = this.terminal.getCursorCol();
    const cursorVisible = this.terminal.isCursorVisible();

    // Build text content
    const lines: string[] = [];
    for (const row of cells) {
      let line = '';
      for (const cell of row) {
        line += cell.char;
      }
      lines.push(line);
    }

    await this.textGrid.setText(lines.join('\n'));

    // Collect all style updates and send them in parallel
    const styleUpdates: Promise<void>[] = [];

    // Get current selection bounds
    const currentBounds = this.terminal.getSelectionBounds();

    // First, clear any cells from previous selection that are no longer selected
    if (this.prevSelectionBounds) {
      const prev = this.prevSelectionBounds;
      for (let row = prev.startRow; row <= prev.endRow; row++) {
        if (row < 0 || row >= cells.length) continue;
        const rowCells = cells[row];
        for (let col = 0; col < rowCells.length; col++) {
          // Check if this cell was in prev selection
          let wasInPrev = false;
          if (row === prev.startRow && row === prev.endRow) {
            wasInPrev = col >= prev.startCol && col <= prev.endCol;
          } else if (row === prev.startRow) {
            wasInPrev = col >= prev.startCol;
          } else if (row === prev.endRow) {
            wasInPrev = col <= prev.endCol;
          } else {
            wasInPrev = true;
          }

          // If was selected but no longer is, reset its style
          if (wasInPrev && !this.terminal.isCellSelected(row, col)) {
            const cell = rowCells[col];
            const style = this.cellAttrsToStyle(cell.attrs);
            // Ensure we set default colors if none
            if (!style.fgColor) style.fgColor = '#ffffff';
            if (!style.bgColor) style.bgColor = '#000000';
            styleUpdates.push(this.textGrid.setCell(row, col, undefined, style));
          }
        }
      }
    }

    // Apply styles row by row
    for (let row = 0; row < cells.length; row++) {
      const rowCells = cells[row];

      for (let col = 0; col < rowCells.length; col++) {
        const cell = rowCells[col];
        const style = this.cellAttrsToStyle(cell.attrs);
        const isSelected = this.terminal.isCellSelected(row, col);
        const isCursor = cursorVisible && row === cursorRow && col === cursorCol;

        // Highlight selected cells with distinct selection color
        if (isSelected) {
          // Use a visible selection color (VS Code-style blue)
          style.bgColor = SELECTION_BG_COLOR;
          style.fgColor = SELECTION_FG_COLOR;
        }

        // Highlight cursor position (with blink support)
        if (isCursor && this.cursorBlinkVisible && this.hasFocus) {
          style.bgColor = '#ffffff';
          style.fgColor = '#000000';
        }

        // Apply style if non-default OR if this cell is selected/cursor
        if (style.fgColor || style.bgColor || style.bold || style.italic || isSelected || isCursor) {
          styleUpdates.push(this.textGrid.setCell(row, col, undefined, style));
        }
      }
    }

    // Update tracking for next render
    this.prevSelectionBounds = currentBounds;
    this.prevCursorRow = cursorRow;
    this.prevCursorCol = cursorCol;

    // Wait for all style updates to complete
    await Promise.all(styleUpdates);
  }

  /**
   * Convert cell attributes to TextGrid style
   */
  private cellAttrsToStyle(attrs: CellAttributes): TextGridStyle {
    const style: TextGridStyle = {};

    if (attrs.inverse) {
      // Swap foreground and background
      const fg = attrs.bgColor >= 0 ? COLOR_PALETTE[attrs.bgColor] : '#000000';
      const bg = attrs.fgColor >= 0 ? COLOR_PALETTE[attrs.fgColor] : '#ffffff';
      style.fgColor = fg;
      style.bgColor = bg;
    } else {
      if (attrs.fgColor >= 0) {
        let colorIndex = attrs.fgColor;
        // Bold brightens colors 0-7
        if (attrs.bold && colorIndex < 8) {
          colorIndex += 8;
        }
        style.fgColor = COLOR_PALETTE[colorIndex];
      }

      if (attrs.bgColor >= 0) {
        style.bgColor = COLOR_PALETTE[attrs.bgColor];
      }
    }

    if (attrs.bold) {
      style.bold = true;
    }

    if (attrs.italic) {
      style.italic = true;
    }

    if (attrs.dim && style.fgColor) {
      // Dim is implemented by reducing brightness to ~50%
      style.fgColor = this.dimColor(style.fgColor);
    }

    return style;
  }

  /**
   * Dim a hex color by reducing its brightness to ~50%
   */
  private dimColor(hexColor: string): string {
    // Parse hex color
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Reduce brightness by 50%
    const dimR = Math.floor(r * 0.5);
    const dimG = Math.floor(g * 0.5);
    const dimB = Math.floor(b * 0.5);

    return `#${dimR.toString(16).padStart(2, '0')}${dimG.toString(16).padStart(2, '0')}${dimB.toString(16).padStart(2, '0')}`;
  }

  /**
   * Handle keyboard input
   */
  handleKeyDown(key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean }): void {
    if (key.length === 1 && !modifiers.ctrl && !modifiers.alt) {
      // Regular character
      this.terminal.typeChar(key);
    } else {
      // Special key
      this.terminal.typeKey(key, modifiers);
    }
  }

  // Menu actions
  private newWindow(): void {
    // Would create a new terminal window
  }

  private exit(): void {
    this.terminal.exit();
    process.exit(0);
  }

  private async copy(): Promise<void> {
    console.log('[Terminal] copy() called');
    if (this.win) {
      const text = this.terminal.endSelection();
      console.log('[Terminal] Selected text:', text ? text.substring(0, 50) + '...' : '(empty)');
      if (text) {
        try {
          await this.win.setClipboard(text);
          console.log('[Terminal] Clipboard set successfully');
        } catch (err) {
          console.error('[Terminal] Clipboard error:', err);
        }
      }
      // Re-render to clear the selection highlight
      await this.render();
    }
  }

  private async paste(): Promise<void> {
    console.log('[Terminal] paste() called');
    if (this.win) {
      try {
        const text = await this.win.getClipboard();
        console.log('[Terminal] Clipboard content:', text ? text.substring(0, 50) + '...' : '(empty)');
        if (text) {
          this.terminal.paste(text);
          console.log('[Terminal] Paste sent to terminal');
        }
      } catch (err) {
        console.error('[Terminal] Paste error:', err);
      }
    }
  }

  private clearScrollback(): void {
    this.terminal.write('\x1b[3J');
  }

  private reset(): void {
    this.terminal.reset();
    this.render();
  }

  private async showAbout(): Promise<void> {
    if (this.win) {
      await this.win.showInfo(
        'About Tsyne Terminal',
        'Tsyne Terminal - A full-featured terminal emulator\n\n' +
          'Ported from github.com/fyne-io/terminal\n' +
          'Original authors: Fyne.io contributors\n\n' +
          'Features:\n' +
          '• Full shell execution\n' +
          '• ANSI/VT100 escape sequences\n' +
          '• 256 color support\n' +
          '• Cursor positioning\n' +
          '• Text selection\n' +
          '• Scrollback buffer'
      );
    }
  }

  getTerminal(): Terminal {
    return this.terminal;
  }
}

/**
 * Create the terminal app
 * Based on: cmd/fyneterm/main.go
 */
export function createTerminalApp(a: App, desktop?: IDesktopService): TerminalUI {
  const ui = new TerminalUI(a);

  // Inject desktop service if available (for launching apps via OSC 7777)
  if (desktop) {
    ui.getTerminal().setDesktopService(desktop);
  }

  a.window({ title: 'Tsyne Terminal', width: 900, height: 700 }, (win: Window) => {
    win.setContent(async () => {
      await ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app(resolveTransport(), { title: 'Tsyne Terminal' }, (a: App) => {
    createTerminalApp(a);
  });
}
