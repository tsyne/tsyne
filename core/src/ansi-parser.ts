import type { TextGridStyle } from './widgets/display_text';

/**
 * A segment of text with an associated style, produced by parsing ANSI escape codes.
 */
export interface StyledSegment {
  text: string;
  style: TextGridStyle;
}

/**
 * Parsed output: plain text (ANSI stripped) + style ranges for TextGrid rendering.
 */
export interface ParsedOutput {
  /** Plain text with all ANSI escape codes stripped */
  plainText: string;
  /** Style ranges to apply via setStyleRange() */
  ranges: Array<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
    style: TextGridStyle;
  }>;
}

// Standard ANSI color palette (dark variants)
const ANSI_COLORS: string[] = [
  '#000000', // 0: black
  '#cc0000', // 1: red
  '#00cc00', // 2: green
  '#cccc00', // 3: yellow
  '#0000cc', // 4: blue
  '#cc00cc', // 5: magenta
  '#00cccc', // 6: cyan
  '#cccccc', // 7: white
];

// Bright ANSI colors
const ANSI_BRIGHT_COLORS: string[] = [
  '#666666', // 8: bright black (gray)
  '#ff0000', // 9: bright red
  '#00ff00', // 10: bright green
  '#ffff00', // 11: bright yellow
  '#5c5cff', // 12: bright blue
  '#ff00ff', // 13: bright magenta
  '#00ffff', // 14: bright cyan
  '#ffffff', // 15: bright white
];

/**
 * Convert a 256-color index to a hex color string.
 */
function color256ToHex(n: number): string {
  if (n < 8) return ANSI_COLORS[n];
  if (n < 16) return ANSI_BRIGHT_COLORS[n - 8];

  // 216-color cube (indices 16-231): 6x6x6
  if (n < 232) {
    const idx = n - 16;
    const r = Math.floor(idx / 36);
    const g = Math.floor((idx % 36) / 6);
    const b = idx % 6;
    const toHex = (v: number) => {
      const val = v === 0 ? 0 : 55 + v * 40;
      return val.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // Grayscale ramp (indices 232-255): 24 shades
  const gray = 8 + (n - 232) * 10;
  const hex = gray.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

interface AnsiState {
  fgColor?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Apply SGR (Select Graphic Rendition) parameters to the current state.
 */
function applySGR(params: number[], state: AnsiState): void {
  let i = 0;
  while (i < params.length) {
    const code = params[i];

    if (code === 0) {
      // Reset
      delete state.fgColor;
      delete state.bgColor;
      delete state.bold;
      delete state.italic;
    } else if (code === 1) {
      state.bold = true;
    } else if (code === 2) {
      // Dim — skip (no TextGrid support)
    } else if (code === 3) {
      state.italic = true;
    } else if (code === 22) {
      delete state.bold;
    } else if (code === 23) {
      delete state.italic;
    } else if (code === 39) {
      delete state.fgColor;
    } else if (code === 49) {
      delete state.bgColor;
    } else if (code >= 30 && code <= 37) {
      // Standard FG colors
      state.fgColor = state.bold ? ANSI_BRIGHT_COLORS[code - 30] : ANSI_COLORS[code - 30];
    } else if (code >= 40 && code <= 47) {
      // Standard BG colors
      state.bgColor = ANSI_COLORS[code - 40];
    } else if (code >= 90 && code <= 97) {
      // Bright FG colors
      state.fgColor = ANSI_BRIGHT_COLORS[code - 90];
    } else if (code >= 100 && code <= 107) {
      // Bright BG colors
      state.bgColor = ANSI_BRIGHT_COLORS[code - 100];
    } else if (code === 38) {
      // Extended FG color
      if (i + 1 < params.length && params[i + 1] === 5 && i + 2 < params.length) {
        // 256-color: 38;5;n
        state.fgColor = color256ToHex(params[i + 2]);
        i += 2;
      } else if (i + 1 < params.length && params[i + 1] === 2 && i + 4 < params.length) {
        // True color: 38;2;r;g;b
        const r = params[i + 2].toString(16).padStart(2, '0');
        const g = params[i + 3].toString(16).padStart(2, '0');
        const b = params[i + 4].toString(16).padStart(2, '0');
        state.fgColor = `#${r}${g}${b}`;
        i += 4;
      }
    } else if (code === 48) {
      // Extended BG color
      if (i + 1 < params.length && params[i + 1] === 5 && i + 2 < params.length) {
        // 256-color: 48;5;n
        state.bgColor = color256ToHex(params[i + 2]);
        i += 2;
      } else if (i + 1 < params.length && params[i + 1] === 2 && i + 4 < params.length) {
        // True color: 48;2;r;g;b
        const r = params[i + 2].toString(16).padStart(2, '0');
        const g = params[i + 3].toString(16).padStart(2, '0');
        const b = params[i + 4].toString(16).padStart(2, '0');
        state.bgColor = `#${r}${g}${b}`;
        i += 4;
      }
    }
    i++;
  }
}

/**
 * Parse text containing ANSI escape codes into plain text + style ranges.
 *
 * Handles:
 * - SGR sequences (colors, bold, italic)
 * - Strips cursor movement, clear screen, and other CSI sequences
 * - Supports 8-color, 256-color, and true color
 */
export function parseAnsi(input: string): ParsedOutput {
  const ranges: ParsedOutput['ranges'] = [];
  const state: AnsiState = {};

  let plainText = '';
  let row = 0;
  let col = 0;

  // Track current styled run
  let runStartRow = 0;
  let runStartCol = 0;
  let runStyle: TextGridStyle | null = null;

  const flushRun = () => {
    if (runStyle && (row > runStartRow || col > runStartCol)) {
      // End the run at the previous position
      let endRow = row;
      let endCol = col - 1;
      if (endCol < 0) {
        endRow--;
        // Find the length of the previous row
        const lines = plainText.split('\n');
        endCol = endRow >= 0 && endRow < lines.length ? lines[endRow].length - 1 : 0;
      }
      if (endRow >= runStartRow && (endRow > runStartRow || endCol >= runStartCol)) {
        ranges.push({
          startRow: runStartRow,
          startCol: runStartCol,
          endRow,
          endCol,
          style: { ...runStyle },
        });
      }
    }
    runStyle = null;
  };

  const stateToStyle = (): TextGridStyle | null => {
    if (!state.fgColor && !state.bgColor && !state.bold && !state.italic) {
      return null;
    }
    const s: TextGridStyle = {};
    if (state.fgColor) s.fgColor = state.fgColor;
    if (state.bgColor) s.bgColor = state.bgColor;
    if (state.bold) s.bold = true;
    if (state.italic) s.italic = true;
    return s;
  };

  const stylesEqual = (a: TextGridStyle | null, b: TextGridStyle | null): boolean => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a.fgColor === b.fgColor &&
      a.bgColor === b.bgColor &&
      a.bold === b.bold &&
      a.italic === b.italic;
  };

  // ESC [ ... (letter) - CSI sequence regex
  // Also handle ESC ] ... ST (OSC) and ESC ( (charset)
  const CSI = /\x1b\[([0-9;]*)([A-Za-z])/;
  const OSC = /\x1b\].*?(?:\x1b\\|\x07)/;
  const CHARSET = /\x1b[()][A-Za-z0-9]/;

  let pos = 0;
  while (pos < input.length) {
    // Check for ESC
    if (input[pos] === '\x1b') {
      // Try CSI
      const csiMatch = input.slice(pos).match(/^\x1b\[([0-9;]*)([A-Za-z])/);
      if (csiMatch) {
        const paramStr = csiMatch[1];
        const command = csiMatch[2];

        if (command === 'm') {
          // SGR - color/style
          const params = paramStr === '' ? [0] : paramStr.split(';').map(Number);
          const oldStyle = stateToStyle();
          applySGR(params, state);
          const newStyle = stateToStyle();

          if (!stylesEqual(oldStyle, newStyle)) {
            flushRun();
            runStartRow = row;
            runStartCol = col;
            runStyle = newStyle;
          }
        }
        // Skip all other CSI sequences (cursor movement, clear, etc.)
        pos += csiMatch[0].length;
        continue;
      }

      // Try OSC
      const oscMatch = input.slice(pos).match(/^\x1b\].*?(?:\x1b\\|\x07)/);
      if (oscMatch) {
        pos += oscMatch[0].length;
        continue;
      }

      // Try charset
      const charsetMatch = input.slice(pos).match(/^\x1b[()][A-Za-z0-9]/);
      if (charsetMatch) {
        pos += charsetMatch[0].length;
        continue;
      }

      // Unknown escape — skip ESC char
      pos++;
      continue;
    }

    // Carriage return — move to start of line (for overwriting)
    if (input[pos] === '\r') {
      pos++;
      // If followed by \n, just skip the \r
      if (pos < input.length && input[pos] === '\n') {
        continue;
      }
      // Otherwise, \r alone moves cursor to start of line (strip it)
      continue;
    }

    // Regular character or newline
    const ch = input[pos];
    plainText += ch;

    if (ch === '\n') {
      row++;
      col = 0;
    } else {
      col++;
    }

    pos++;
  }

  // Flush any remaining run
  flushRun();

  return { plainText, ranges };
}
