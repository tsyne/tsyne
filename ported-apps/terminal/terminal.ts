/**
 * Terminal Emulator for Tsyne
 *
 * Ported from https://github.com/fyne-io/terminal
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * This is a simplified demonstration port showing terminal-like interaction.
 * The original implementation is a full terminal emulator with PTY support,
 * ANSI escape sequences, shell execution, and advanced features.
 * This version demonstrates the UI pattern and basic command interaction
 * adapted to work with Tsyne's architecture.
 *
 * NOTE: This is NOT a full terminal emulator. It's a simplified demonstration
 * of terminal-like UI interaction. For a real terminal, use the original
 * fyne-io/terminal which supports full shell execution and PTY management.
 *
 * Tsyne API features demonstrated:
 * - Main menu with File, Edit, Help operations
 * - TextGrid for proper terminal display (monospace, fixed-width)
 * - Clipboard integration (copy/paste)
 * - Preferences for command history persistence
 * - Confirm dialog for destructive operations
 * - About dialog
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';
import type { TextGrid } from '../../src/widgets';

// Constants for preferences
const PREF_HISTORY_COUNT = 'terminal_history_count';
const PREF_HISTORY_PREFIX = 'terminal_history_';
const MAX_HISTORY_PERSIST = 50;
const TERMINAL_COLS = 80;
const TERMINAL_ROWS = 24;

/**
 * Terminal output line
 */
interface TerminalLine {
  text: string;
  type: 'output' | 'input' | 'error';
}

/**
 * Simple command processor
 */
class CommandProcessor {
  private history: string[] = [];
  private workingDir: string = '~';
  private historyIndex: number = -1;

  processCommand(command: string): TerminalLine[] {
    const trimmed = command.trim();

    if (!trimmed) {
      return [];
    }

    this.history.push(trimmed);
    this.historyIndex = this.history.length;
    const result: TerminalLine[] = [];

    // Parse command and args
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
        result.push({ text: 'Available commands:', type: 'output' });
        result.push({ text: '  help     - Show this help message', type: 'output' });
        result.push({ text: '  echo     - Echo text to output', type: 'output' });
        result.push({ text: '  clear    - Clear the terminal', type: 'output' });
        result.push({ text: '  date     - Show current date/time', type: 'output' });
        result.push({ text: '  pwd      - Print working directory', type: 'output' });
        result.push({ text: '  cd       - Change working directory', type: 'output' });
        result.push({ text: '  history  - Show command history', type: 'output' });
        result.push({ text: '  version  - Show terminal version', type: 'output' });
        result.push({ text: '  uptime   - Show session uptime', type: 'output' });
        result.push({ text: '  exit     - Exit the terminal', type: 'output' });
        break;

      case 'echo':
        result.push({ text: args.join(' '), type: 'output' });
        break;

      case 'date':
        result.push({ text: new Date().toString(), type: 'output' });
        break;

      case 'pwd':
        result.push({ text: this.workingDir, type: 'output' });
        break;

      case 'cd':
        if (args.length === 0 || args[0] === '~') {
          this.workingDir = '~';
        } else if (args[0] === '..') {
          const parts = this.workingDir.split('/');
          parts.pop();
          this.workingDir = parts.length === 0 ? '/' : parts.join('/') || '~';
        } else {
          const newDir = args[0].startsWith('/') ? args[0] :
            this.workingDir === '~' ? `~/${args[0]}` :
            `${this.workingDir}/${args[0]}`;
          this.workingDir = newDir;
        }
        result.push({ text: this.workingDir, type: 'output' });
        break;

      case 'history':
        if (this.history.length === 0) {
          result.push({ text: '(no history)', type: 'output' });
        } else {
          this.history.forEach((cmd, i) => {
            result.push({ text: `${(i + 1).toString().padStart(4)}  ${cmd}`, type: 'output' });
          });
        }
        break;

      case 'version':
        result.push({ text: 'Tsyne Terminal v1.0.0', type: 'output' });
        result.push({ text: 'A simplified terminal emulator built with Tsyne', type: 'output' });
        break;

      case 'uptime':
        // Will be handled by Terminal class with actual session start time
        return [{ text: '__UPTIME__', type: 'output' }];

      case 'clear':
        // Special case - handled by caller
        return [{ text: '__CLEAR__', type: 'output' }];

      case 'exit':
        result.push({ text: 'Goodbye!', type: 'output' });
        return [{ text: '__EXIT__', type: 'output' }];

      default:
        result.push({ text: `Command not found: ${cmd}`, type: 'error' });
        result.push({ text: 'Type "help" for available commands', type: 'output' });
    }

    return result;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  setHistory(history: string[]): void {
    this.history = [...history];
    this.historyIndex = this.history.length;
  }

  getPreviousCommand(): string | null {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return null;
  }

  getNextCommand(): string | null {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    }
    this.historyIndex = this.history.length;
    return '';
  }

  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
  }
}

/**
 * Terminal emulator (simplified)
 * Based on: term.go Terminal struct
 */
class Terminal {
  private lines: TerminalLine[] = [];
  private processor: CommandProcessor = new CommandProcessor();
  private maxLines: number = 500;
  private updateCallback?: () => void;
  private exitCallback?: () => void;
  private sessionStart: Date = new Date();

  constructor() {
    this.lines.push({ text: 'Tsyne Terminal Emulator v1.0.0', type: 'output' });
    this.lines.push({ text: 'Type "help" for available commands', type: 'output' });
    this.lines.push({ text: '', type: 'output' });
  }

  /**
   * Execute a command
   * @returns true if command requests exit
   */
  executeCommand(command: string): boolean {
    // Add input line
    this.lines.push({ text: `$ ${command}`, type: 'input' });

    // Process command
    const output = this.processor.processCommand(command);

    // Handle special commands
    if (output.length === 1) {
      if (output[0].text === '__CLEAR__') {
        this.clear();
        return false;
      }
      if (output[0].text === '__EXIT__') {
        this.lines.push({ text: 'Goodbye!', type: 'output' });
        if (this.updateCallback) this.updateCallback();
        if (this.exitCallback) this.exitCallback();
        return true;
      }
      if (output[0].text === '__UPTIME__') {
        const uptime = this.getUptime();
        this.lines.push({ text: `Session uptime: ${uptime}`, type: 'output' });
        if (this.updateCallback) this.updateCallback();
        return false;
      }
    }

    // Add output lines
    output.forEach(line => this.lines.push(line));

    // Trim to max lines
    if (this.lines.length > this.maxLines) {
      this.lines = this.lines.slice(-this.maxLines);
    }

    // Notify update
    if (this.updateCallback) {
      this.updateCallback();
    }

    return false;
  }

  /**
   * Get uptime as human-readable string
   */
  private getUptime(): string {
    const now = new Date();
    const diff = now.getTime() - this.sessionStart.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Clear the terminal
   */
  clear(): void {
    this.lines = [];
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  /**
   * Get all lines as formatted text
   */
  getOutput(): string {
    return this.lines.map(line => {
      switch (line.type) {
        case 'input':
          return line.text;
        case 'error':
          return `ERROR: ${line.text}`;
        default:
          return line.text;
      }
    }).join('\n');
  }

  /**
   * Get output formatted for TextGrid (fixed width lines)
   */
  getTextGridOutput(cols: number, rows: number): string {
    const outputLines = this.lines.map(line => {
      switch (line.type) {
        case 'input':
          return line.text;
        case 'error':
          return `ERROR: ${line.text}`;
        default:
          return line.text;
      }
    });

    // Pad or truncate lines to fit grid
    const gridLines: string[] = [];
    for (const line of outputLines) {
      // Wrap long lines
      if (line.length > cols) {
        for (let i = 0; i < line.length; i += cols) {
          gridLines.push(line.substring(i, i + cols).padEnd(cols));
        }
      } else {
        gridLines.push(line.padEnd(cols));
      }
    }

    // Take last 'rows' lines and join
    const visibleLines = gridLines.slice(-rows);
    while (visibleLines.length < rows) {
      visibleLines.push(' '.repeat(cols));
    }

    return visibleLines.join('\n');
  }

  /**
   * Get line count
   */
  getLineCount(): number {
    return this.lines.length;
  }

  /**
   * Set update callback
   */
  setUpdateCallback(callback: () => void): void {
    this.updateCallback = callback;
  }

  /**
   * Set exit callback
   */
  setExitCallback(callback: () => void): void {
    this.exitCallback = callback;
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return this.processor.getHistory();
  }

  /**
   * Set command history
   */
  setHistory(history: string[]): void {
    this.processor.setHistory(history);
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.processor.clearHistory();
  }

  /**
   * Get previous command from history
   */
  getPreviousCommand(): string | null {
    return this.processor.getPreviousCommand();
  }

  /**
   * Get next command from history
   */
  getNextCommand(): string | null {
    return this.processor.getNextCommand();
  }
}

/**
 * Terminal UI
 * Based on: cmd/fyneterm/main.go and render.go
 */
class TerminalUI {
  private terminal: Terminal;
  private inputEntry: any = null;
  private outputLabel: any = null;
  private textGrid: TextGrid | null = null;
  private win: Window | null = null;
  private a: App;
  private useTextGrid: boolean = false; // Disabled for test compatibility

  constructor(a: App) {
    this.a = a;
    this.terminal = new Terminal();
    this.terminal.setUpdateCallback(() => this.updateDisplay());
  }

  /**
   * Load command history from preferences
   */
  private async loadHistory(): Promise<void> {
    try {
      const count = await this.a.getPreferenceInt(PREF_HISTORY_COUNT, 0);
      const history: string[] = [];
      for (let i = 0; i < count && i < MAX_HISTORY_PERSIST; i++) {
        const cmd = await this.a.getPreference(`${PREF_HISTORY_PREFIX}${i}`, '');
        if (cmd) {
          history.push(cmd);
        }
      }
      if (history.length > 0) {
        this.terminal.setHistory(history);
        console.log(`Loaded ${history.length} history items from preferences`);
      }
    } catch (e) {
      console.warn('Failed to load history from preferences:', e);
    }
  }

  /**
   * Save command history to preferences
   */
  private async saveHistory(): Promise<void> {
    try {
      const history = this.terminal.getHistory();
      const toSave = history.slice(-MAX_HISTORY_PERSIST);
      await this.a.setPreference(PREF_HISTORY_COUNT, toSave.length.toString());
      for (let i = 0; i < toSave.length; i++) {
        await this.a.setPreference(`${PREF_HISTORY_PREFIX}${i}`, toSave[i]);
      }
      console.log(`Saved ${toSave.length} history items to preferences`);
    } catch (e) {
      console.warn('Failed to save history to preferences:', e);
    }
  }

  /**
   * Build the main menu
   * Based on: Tsyne's menu API
   */
  private buildMainMenu(win: Window): void {
    win.setMainMenu([
      {
        label: 'File',
        items: [
          { label: 'Copy Output', onSelected: () => this.copyOutput() },
          { label: 'Clear Terminal', onSelected: () => this.clearWithConfirm() },
          { label: '', isSeparator: true },
          { label: 'Save History', onSelected: () => this.saveHistory() },
          { label: 'Clear History', onSelected: () => this.clearHistoryWithConfirm() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => this.exit() }
        ]
      },
      {
        label: 'Edit',
        items: [
          { label: 'Copy', onSelected: () => this.copyOutput() },
          { label: 'Paste', onSelected: () => this.pasteToInput() }
        ]
      },
      {
        label: 'View',
        items: [
          { label: 'Toggle Text Grid', onSelected: () => this.toggleTextGrid() }
        ]
      },
      {
        label: 'Help',
        items: [
          { label: 'Commands', onSelected: () => this.showHelp() },
          { label: 'About', onSelected: () => this.showAbout() }
        ]
      }
    ]);
  }

  async buildUI(win: Window): Promise<void> {
    this.win = win;
    this.buildMainMenu(win);
    await this.loadHistory();

    // Set close intercept to save history on exit
    win.setCloseIntercept(async () => {
      await this.saveHistory();
      return true;
    });

    // Set exit callback
    this.terminal.setExitCallback(async () => {
      await this.saveHistory();
      process.exit(0);
    });

    this.a.vbox(() => {
      // Toolbar
      this.a.toolbar([
        this.a.toolbarAction('Clear', () => this.clearWithConfirm()),
        this.a.toolbarAction('Help', () => this.showHelp()),
        this.a.toolbarAction('Copy', () => this.copyOutput()),
        this.a.toolbarAction('Paste', () => this.pasteToInput())
      ]);

      // Terminal output area - use TextGrid for better rendering
      this.a.scroll(() => {
        if (this.useTextGrid) {
          this.textGrid = this.a.textgrid({
            text: this.terminal.getTextGridOutput(TERMINAL_COLS, TERMINAL_ROWS),
            showLineNumbers: false
          });
        } else {
          this.a.vbox(() => {
            this.outputLabel = this.a.label(this.terminal.getOutput());
          });
        }
      });

      this.a.separator();

      // Input area
      this.a.hbox(() => {
        this.a.label('$');
        this.inputEntry = this.a.entry('Enter command...', () => this.executeCommand());
      });

      // Status bar
      this.a.hbox(() => {
        this.a.label('Tsyne Terminal v1.0.0');
        this.a.label(' | ');
        this.a.label('Type "help" for commands');
      });
    });
  }

  private async executeCommand(): Promise<void> {
    if (!this.inputEntry) return;

    const command = await this.inputEntry.getText();
    if (!command.trim()) return;

    this.terminal.executeCommand(command);
    await this.inputEntry.setText(''); // Clear input
  }

  private async clearWithConfirm(): Promise<void> {
    if (!this.win) {
      this.terminal.clear();
      return;
    }

    const confirmed = await this.win.showConfirm('Clear Terminal', 'Are you sure you want to clear the terminal output?');
    if (confirmed) {
      this.terminal.clear();
    }
  }

  private async clearHistoryWithConfirm(): Promise<void> {
    if (!this.win) {
      this.terminal.clearHistory();
      return;
    }

    const confirmed = await this.win.showConfirm('Clear History', 'Are you sure you want to clear the command history?');
    if (confirmed) {
      this.terminal.clearHistory();
      // Also clear from preferences
      await this.a.setPreference(PREF_HISTORY_COUNT, '0');
      if (this.win) {
        await this.win.showInfo('History Cleared', 'Command history has been cleared.');
      }
    }
  }

  private showHelp(): void {
    this.terminal.executeCommand('help');
  }

  private async showAbout(): Promise<void> {
    if (!this.win) return;

    await this.win.showInfo(
      'About Tsyne Terminal',
      'Tsyne Terminal v1.0.0\n\n' +
      'A simplified terminal emulator built with Tsyne.\n\n' +
      'Ported from github.com/fyne-io/terminal\n' +
      'Original authors: Fyne.io contributors\n\n' +
      'Features:\n' +
      '• Built-in commands (help, echo, date, etc.)\n' +
      '• Command history with preferences persistence\n' +
      '• Clipboard support (copy/paste)\n' +
      '• TextGrid display for monospace output'
    );
  }

  private async copyOutput(): Promise<void> {
    if (!this.win) return;

    const output = this.terminal.getOutput();
    await this.win.setClipboard(output);
    // Show brief feedback
    console.log('Terminal output copied to clipboard');
  }

  private async pasteToInput(): Promise<void> {
    if (!this.win || !this.inputEntry) return;

    const clipboard = await this.win.getClipboard();
    if (clipboard) {
      const currentText = await this.inputEntry.getText();
      await this.inputEntry.setText(currentText + clipboard);
    }
  }

  private toggleTextGrid(): void {
    this.useTextGrid = !this.useTextGrid;
    if (this.win) {
      this.rebuildUI();
    }
  }

  private rebuildUI(): void {
    if (!this.win) return;
    this.win.setContent(() => {
      this.buildUI(this.win!);
    });
  }

  private async exit(): Promise<void> {
    await this.saveHistory();
    process.exit(0);
  }

  private async updateDisplay(): Promise<void> {
    if (this.textGrid) {
      const gridOutput = this.terminal.getTextGridOutput(TERMINAL_COLS, TERMINAL_ROWS);
      await this.textGrid.setText(gridOutput);
    } else if (this.outputLabel) {
      await this.outputLabel.setText(this.terminal.getOutput());
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
export function createTerminalApp(a: App): TerminalUI {
  const ui = new TerminalUI(a);

  a.window({ title: 'Tsyne Terminal', width: 900, height: 700 }, async (win: Window) => {
    win.setContent(async () => {
      await ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

// Export Terminal and TerminalUI for testing
export { Terminal, TerminalUI };

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Tsyne Terminal' }, (a: App) => {
    createTerminalApp(a);
  });
}
