/**
 * CosyneTest - Testing utilities for Cosyne canvas applications
 *
 * Extends TsyneTest with cosyne-specific testing capabilities.
 */

import { TsyneTest, TestOptions, App } from 'tsyne';
import type { SvgContext, SvgEvent } from './svg';

export interface CosyneTestOptions extends TestOptions {
  // Future: cosyne-specific options
}

/**
 * Journal monitor window — logs SvgContext events in a second Fyne window.
 *
 * Created via `CosyneTest.createJournal(app, svgCtx)`.
 */
export class TestJournal {
  private app: App;
  private lines: string[] = [];
  private label: any;
  private scroll: any;
  private startTime: number;
  window: any;

  constructor(app: App) {
    this.app = app;
    this.startTime = Date.now();
  }

  /** Create the journal Fyne window with a scrollable monospace label.
   *  If headerLines are provided, they appear above a separator before the event log. */
  createWindow(headerLines?: string[], x?: number, y?: number): void {
    const opts: any = { title: 'Journal', width: 360, height: 300 };
    if (x !== undefined) opts.x = x;
    if (y !== undefined) opts.y = y;
    if (headerLines) {
      for (const line of headerLines) this.lines.push(line);
      this.lines.push('────────────────────────────────');
    }
    this.window = this.app.window(opts, (win: any) => {
      win.setContent(() => {
        this.scroll = this.app.scroll(() => {
          this.label = this.app.label(this.lines.join('\n') || '— journal ready —', {
            textStyle: { monospace: true },
            alignment: 'leading',
            wrapping: 'off',
          });
        });
      });
      win.show();
    });
  }

  /** Append a timestamped line to the journal and update the label. */
  async log(message: string): Promise<void> {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    this.lines.push(`[${elapsed}s] ${message}`);
    if (this.label) {
      await this.label.setText(this.lines.join('\n'));
    }
    if (this.scroll) {
      await this.scroll.scrollToBottom();
    }
  }

  /** Hook into an SvgContext to automatically log tap, hover, drag, scroll, and key events. */
  monitor(svgCtx: SvgContext): void {
    svgCtx.onEvent((event: SvgEvent) => {
      const name = event.elementName ?? (event.elementIndex !== undefined ? `#${event.elementIndex}` : '(scene)');
      switch (event.type) {
        case 'tap-hit':
          this.log(`HIT  ${name}  (${event.x}, ${event.y})`);
          break;
        case 'tap-miss':
          this.log(`MISS (${event.x}, ${event.y})`);
          break;
        case 'hover-in':
          this.log(`HOVER-IN  ${name}  (${event.x}, ${event.y})`);
          break;
        case 'hover-out':
          this.log(`HOVER-OUT ${name}  (${event.x}, ${event.y})`);
          break;
        case 'drag':
          this.log(`DRAG ${name}  (${event.x}, ${event.y}) d=(${event.deltaX}, ${event.deltaY})`);
          break;
        case 'drag-end':
          this.log(`DRAG-END ${name}`);
          break;
        case 'scroll':
          this.log(`SCROLL ${name}  (${event.x}, ${event.y}) d=(${event.deltaX}, ${event.deltaY})`);
          break;
        case 'key-down':
          this.log(`KEY-DOWN ${event.key}`);
          break;
        case 'key-up':
          this.log(`KEY-UP ${event.key}`);
          break;
      }
    });
  }
}

/**
 * CosyneTest extends TsyneTest with canvas-specific testing utilities.
 *
 * Usage:
 * ```typescript
 * const test = new CosyneTest({ headed: false });
 * await test.createApp(myAppBuilder);
 * await test.screenshot('/tmp/test.png');
 * ```
 */
export class CosyneTest extends TsyneTest {
  constructor(options?: CosyneTestOptions) {
    super(options);
  }

  /** Create a journal monitor window that logs events from an SvgContext.
   *  Auto-detects the test file, describe chain, and it() name from Jest
   *  and shows them as a header in the content pane above the event log. */
  createJournal(app: App, svgCtx: SvgContext, position?: { x: number; y: number }): TestJournal {
    const journal = new TestJournal(app);

    // Build content header from Jest test context
    // __JEST_TEST_NAMES__ is set by our custom test environment (test/jest-environment.js)
    // and contains [describe1, describe2, ..., itName] from the jest-circus tree.
    let headerLines: string[] | undefined;
    try {
      const state = expect.getState();
      const names: string[] | undefined = (globalThis as any).__JEST_TEST_NAMES__;
      if (state.testPath) {
        const file = state.testPath.replace(/^.*\//, '');
        headerLines = [file];
        if (names) {
          let indent = '';
          for (const part of names) {
            indent += '  ';
            headerLines.push(`${indent}${part}`);
          }
        }
      }
    } catch {
      // Not in Jest context
    }

    journal.createWindow(headerLines, position?.x, position?.y);
    journal.monitor(svgCtx);
    return journal;
  }
}
