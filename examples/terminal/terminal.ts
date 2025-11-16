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
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';

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

  processCommand(command: string): TerminalLine[] {
    const trimmed = command.trim();

    if (!trimmed) {
      return [];
    }

    this.history.push(trimmed);
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
        result.push({ text: '  history  - Show command history', type: 'output' });
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

      case 'history':
        this.history.forEach((cmd, i) => {
          result.push({ text: `${i + 1}  ${cmd}`, type: 'output' });
        });
        break;

      case 'clear':
        // Special case - handled by caller
        return [{ text: '__CLEAR__', type: 'output' }];

      case 'exit':
        result.push({ text: 'Goodbye!', type: 'output' });
        break;

      default:
        result.push({ text: `Command not found: ${cmd}`, type: 'error' });
        result.push({ text: 'Type "help" for available commands', type: 'output' });
    }

    return result;
  }

  getHistory(): string[] {
    return [...this.history];
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

  constructor() {
    this.lines.push({ text: 'Tsyne Terminal Emulator (Simplified)', type: 'output' });
    this.lines.push({ text: 'Type "help" for available commands', type: 'output' });
    this.lines.push({ text: '', type: 'output' });
  }

  /**
   * Execute a command
   */
  executeCommand(command: string): void {
    // Add input line
    this.lines.push({ text: `$ ${command}`, type: 'input' });

    // Process command
    const output = this.processor.processCommand(command);

    // Handle clear command
    if (output.length === 1 && output[0].text === '__CLEAR__') {
      this.clear();
      return;
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
}

/**
 * Terminal UI
 * Based on: cmd/fyneterm/main.go and render.go
 */
class TerminalUI {
  private terminal: Terminal;
  private inputEntry: any = null;
  private outputLabel: any = null;

  constructor(private a: App) {
    this.terminal = new Terminal();
    this.terminal.setUpdateCallback(() => this.updateDisplay());
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      // Toolbar
      this.a.toolbar([
        this.a.toolbarAction('Clear', () => this.clear()),
        this.a.toolbarAction('Help', () => this.showHelp())
      ]);

      // Terminal output area
      this.a.scroll(() => {
        this.a.vbox(() => {
          this.outputLabel = this.a.label(this.terminal.getOutput());
        });
      });

      this.a.separator();

      // Input area
      this.a.hbox(() => {
        this.a.label('$');
        this.inputEntry = this.a.entry('Enter command...', () => this.executeCommand());
      });

      // Status
      this.a.label('Simplified terminal demo - Type "help" for commands');
    });
  }

  private async executeCommand(): Promise<void> {
    if (!this.inputEntry) return;

    const command = await this.inputEntry.getText();
    if (!command.trim()) return;

    this.terminal.executeCommand(command);
    await this.inputEntry.setText(''); // Clear input
  }

  private clear(): void {
    this.terminal.clear();
  }

  private showHelp(): void {
    this.terminal.executeCommand('help');
  }

  private async updateDisplay(): Promise<void> {
    if (this.outputLabel) {
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

  a.window({ title: 'Terminal', width: 800, height: 600 }, (win: Window) => {
    win.setContent(() => {
      ui.buildUI(win);
    });
    win.show();
  });

  return ui;
}

/**
 * Main application entry point
 */
if (require.main === module) {
  app({ title: 'Terminal' }, (a: App) => {
    createTerminalApp(a);
  });
}
