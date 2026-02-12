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
    const opts: any = { title: 'Journal', width: 360, height: 600 };
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
        case 'double-click':
          this.log(`DBLCLICK ${name}  (${event.x}, ${event.y})`);
          break;
        case 'right-click':
          this.log(`RTCLICK ${name}  (${event.x}, ${event.y})`);
          break;
        case 'tooltip-show':
          this.log(`TOOLTIP-SHOW ${name}`);
          break;
        case 'tooltip-hide':
          this.log(`TOOLTIP-HIDE ${name}`);
          break;
        case 'when-show':
          this.log(`WHEN-SHOW ${name}`);
          break;
        case 'when-hide':
          this.log(`WHEN-HIDE ${name}`);
          break;
      }
    });
  }
}

// ─── Assertion description helpers ────────────────────────────

/** Format a value for assertion logging — short and readable. */
function fmtVal(v: any): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 30 ? `"${v.slice(0, 27)}..."` : `"${v}"`;
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    const inner = v.map(fmtVal);
    const joined = inner.join(', ');
    return joined.length > 40 ? `[${inner[0]}, ... (${v.length})]` : `[${joined}]`;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    if (keys.length <= 3) {
      const inner = keys.map(k => `${k}: ${fmtVal(v[k])}`).join(', ');
      if (inner.length <= 40) return `{${inner}}`;
    }
    return `{${keys.length} keys}`;
  }
  return String(v);
}

/** Describe an assertion in English. */
function describeAssertion(received: any, matcher: string, args: any[], negated: boolean): string {
  const not = negated ? ' not' : '';
  const rv = fmtVal(received);
  const ev = args.length > 0 ? fmtVal(args[0]) : '';
  switch (matcher) {
    case 'toBe':
      if (args[0] === true) return `${rv} is${not} true`;
      if (args[0] === false) return `${rv} is${not} false`;
      return `${rv} is${not} ${ev}`;
    case 'toEqual':        return `${rv}${not} equals ${ev}`;
    case 'toStrictEqual':  return `${rv}${not} strict-equals ${ev}`;
    case 'toBeGreaterThan':          return `${rv} is${not} > ${ev}`;
    case 'toBeGreaterThanOrEqual':   return `${rv} is${not} >= ${ev}`;
    case 'toBeLessThan':             return `${rv} is${not} < ${ev}`;
    case 'toBeLessThanOrEqual':      return `${rv} is${not} <= ${ev}`;
    case 'toBeTruthy':    return `${rv} is${not} truthy`;
    case 'toBeFalsy':     return `${rv} is${not} falsy`;
    case 'toBeNull':      return `${rv} is${not} null`;
    case 'toBeUndefined': return `${rv} is${not} undefined`;
    case 'toBeDefined':   return `${rv} is${not} defined`;
    case 'toBeNaN':       return `${rv} is${not} NaN`;
    case 'toContain':     return `${rv}${not} contains ${ev}`;
    case 'toHaveLength':  return `${rv} has${not} length ${ev}`;
    case 'toMatch':       return `${rv}${not} matches ${ev}`;
    case 'toThrow':       return `${not ? 'does not throw' : 'throws'}`;
    default:
      return args.length > 0
        ? `${rv}${not} ${matcher}(${args.map(fmtVal).join(', ')})`
        : `${rv}${not} ${matcher}`;
  }
}

// ─── CosyneTest ──────────────────────────────────────────────

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
  private _origExpect: any;

  constructor(options?: CosyneTestOptions) {
    super(options);
  }

  /** Create a journal monitor window that logs events from an SvgContext.
   *  Auto-detects the test file, describe chain, and it() name from Jest
   *  and shows them as a header in the content pane above the event log.
   *  Also intercepts expect() assertions so they appear in the journal. */
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
    this.interceptAssertions(journal);
    return journal;
  }

  /** Monkey-patch global expect() to log each assertion result to the journal. */
  private interceptAssertions(journal: TestJournal): void {
    const g = globalThis as any;
    // Guard against double-wrapping
    if (this._origExpect) return;
    const orig = g.expect;
    if (!orig) return;
    this._origExpect = orig;

    const wrapMatchers = (matchers: any, received: any, negated: boolean): any => {
      return new Proxy(matchers, {
        get(target: any, prop: string | symbol) {
          if (prop === 'not') {
            return wrapMatchers(target.not, received, !negated);
          }
          const val = target[prop];
          if (typeof val !== 'function') return val;
          return (...args: any[]) => {
            const desc = describeAssertion(received, String(prop), args, negated);
            try {
              const result = val.apply(target, args);
              journal.log(`  PASS  ${desc}`);
              return result;
            } catch (e) {
              journal.log(`  FAIL  ${desc}`);
              throw e;
            }
          };
        },
      });
    };

    g.expect = Object.assign(
      (received: any) => wrapMatchers(orig(received), received, false),
      orig, // preserve static methods (expect.getState, expect.extend, etc.)
    );
  }

  /** Restore the original expect() if we patched it. */
  private restoreExpect(): void {
    if (this._origExpect) {
      (globalThis as any).expect = this._origExpect;
      this._origExpect = undefined;
    }
  }

  async cleanup(): Promise<void> {
    this.restoreExpect();
    return super.cleanup();
  }
}
