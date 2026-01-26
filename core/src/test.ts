import { BridgeInterface } from './fynebridge';
import { initTsyneMatchers } from './test-matchers';

// Initialize custom matchers when module loads
initTsyneMatchers();

// Jest globals for test assertions
declare const expect: any;
declare const fail: (message?: string) => never;

/**
 * Record of a single ctx.wait() call
 */
export interface WaitTimeRecord {
  testName: string;       // Full test name including describe blocks
  testPath?: string;      // File path of the test
  waitMs: number;         // Duration waited
  callLocation?: string;  // Optional: stack trace location of the call
}

/**
 * Summary of wait times for a single test
 */
export interface TestWaitSummary {
  testName: string;
  testPath?: string;  // File path of the test
  totalWaitMs: number;
  waitCount: number;
}

/**
 * Global tracker for ctx.wait() times across test runs
 */
class WaitTimeTracker {
  private records: WaitTimeRecord[] = [];
  private enabled: boolean = true;

  /**
   * Record a wait call
   */
  record(waitMs: number, testName: string, testPath?: string, callLocation?: string): void {
    if (!this.enabled) return;
    this.records.push({ testName, testPath, waitMs, callLocation });
  }

  /**
   * Get total wait time across all tests
   */
  getTotalWaitTime(): number {
    return this.records.reduce((sum, r) => sum + r.waitMs, 0);
  }

  /**
   * Get wait time summary per test
   */
  getSummaryByTest(): TestWaitSummary[] {
    const byTest = new Map<string, { total: number; count: number; testPath?: string }>();

    for (const record of this.records) {
      const existing = byTest.get(record.testName) || { total: 0, count: 0, testPath: record.testPath };
      existing.total += record.waitMs;
      existing.count += 1;
      if (!existing.testPath && record.testPath) {
        existing.testPath = record.testPath;
      }
      byTest.set(record.testName, existing);
    }

    return Array.from(byTest.entries())
      .map(([testName, data]) => ({
        testName,
        testPath: data.testPath,
        totalWaitMs: data.total,
        waitCount: data.count
      }))
      .sort((a, b) => b.totalWaitMs - a.totalWaitMs); // Sort by highest wait time first
  }

  /**
   * Get all raw records
   */
  getAllRecords(): WaitTimeRecord[] {
    return [...this.records];
  }

  /**
   * Clear all records (useful between test runs)
   */
  clear(): void {
    this.records = [];
  }

  /**
   * Enable or disable tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Print a formatted report to stdout
   * Uses process.stdout.write to bypass Jest's console interception during teardown
   */
  printReport(): void {
    const summaries = this.getSummaryByTest();
    const total = this.getTotalWaitTime();

    // Use process.stdout.write to avoid Jest's "Cannot log after tests are done" warning
    const write = (msg: string) => process.stdout.write(msg + '\n');

    if (summaries.length === 0) {
      write('\n📊 Wait Time Report: No ctx.wait() calls recorded\n');
      return;
    }

    write('\n' + '='.repeat(80));
    write('📊 Wait Time Report');
    write('='.repeat(80));
    write(`Total wait time: ${total}ms (${(total / 1000).toFixed(2)}s)`);
    write(`Total ctx.wait() calls: ${this.records.length}`);
    write('-'.repeat(80));
    write('By test (sorted by highest wait time):');
    write('-'.repeat(80));

    for (const summary of summaries) {
      const percentage = ((summary.totalWaitMs / total) * 100).toFixed(1);
      const pathInfo = summary.testPath ? ` [${summary.testPath}]` : '';
      write(`  ${summary.testName}${pathInfo}`);
      write(`    └─ ${summary.totalWaitMs}ms (${summary.waitCount} calls, ${percentage}%)`);
    }

    write('='.repeat(80) + '\n');
  }

  /**
   * Save wait time data to a JSON file for CI aggregation
   * Appends to existing file if present (for multi-file test runs)
   */
  saveToFile(filePath: string): void {
    const fs = require('fs');
    const data = {
      totalWaitMs: this.getTotalWaitTime(),
      totalCalls: this.records.length,
      summaries: this.getSummaryByTest(),
      records: this.records
    };

    // Read existing data if file exists and merge
    let existingData: any[] = [];
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(content);
      }
    } catch (e) {
      // File doesn't exist or is invalid, start fresh
    }

    existingData.push(data);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  }
}

// Global singleton instance - use globalThis to ensure single instance across Jest's module isolation
// This ensures the tracker is shared between the test environment and test files
declare const globalThis: any;

const TRACKER_KEY = '__tsyneWaitTimeTracker';
if (!globalThis[TRACKER_KEY]) {
  globalThis[TRACKER_KEY] = new WaitTimeTracker();
}
export const waitTimeTracker: WaitTimeTracker = globalThis[TRACKER_KEY];

/**
 * Get the current Jest test name (includes describe blocks)
 * Returns 'unknown' if not in a Jest test context
 */
function getCurrentTestName(): string {
  try {
    // Jest exposes current test info via expect.getState()
    const state = expect.getState();
    if (state && state.currentTestName) {
      return state.currentTestName;
    }
  } catch (e) {
    // Not in Jest context or expect not available
  }
  return 'unknown';
}

/**
 * Get the current Jest test file path (relative path for display)
 * Returns undefined if not in a Jest test context
 */
function getCurrentTestPath(): string | undefined {
  try {
    // Jest exposes current test info via expect.getState()
    const state = expect.getState();
    if (state && state.testPath) {
      // Return just the relative portion for cleaner display
      const path = state.testPath as string;
      // Find common markers to make path shorter
      const markers = ['/examples/', '/ported-apps/', '/src/'];
      for (const marker of markers) {
        const idx = path.indexOf(marker);
        if (idx !== -1) {
          return path.substring(idx + 1); // Remove leading slash
        }
      }
      // Fallback: just return the filename
      const lastSlash = path.lastIndexOf('/');
      return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
    }
  } catch (e) {
    // Not in Jest context or expect not available
  }
  return undefined;
}

/**
 * Throw an error with stack trace pointing to the caller, not this file.
 * This ensures Jest shows the test file line number, not test.ts internals.
 */
function throwCallerError(message: string, callerFn: Function): never {
  const error = new Error(message);
  // Remove this function and the caller from the stack trace
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, callerFn);
  }
  throw error;
}

/**
 * Widget information returned from inspections
 */
export interface WidgetInfo {
  id: string;
  type: string;
  text?: string;
  x?: number;
  y?: number;
  absoluteX?: number;
  absoluteY?: number;
  width?: number;
  height?: number;
  fillMode?: 'contain' | 'stretch' | 'original';
  checked?: boolean;
  value?: unknown;
  selected?: string;
  disabled?: boolean;
  x2?: number; // Added for canvas elements
  y2?: number; // Added for canvas elements
}

/**
 * TextValue represents a text value that can be polled and asserted
 * Allows fluent chaining like: locator.getText().within(2000).shouldContain("text")
 * Can also be awaited directly: const text = await locator.getText();
 */
export class TextValue implements PromiseLike<string> {
  private withinTimeout?: number;
  private getTextFn: () => Promise<string>;

  constructor(getTextFn: () => Promise<string>) {
    this.getTextFn = getTextFn;
  }

  /**
   * Set polling timeout for subsequent assertions
   * @example
   * await locator.getText().within(2000).shouldContain("Updated");
   */
  within(timeout: number): this {
    this.withinTimeout = timeout;
    return this;
  }

  /**
   * Assert text equals expected value
   * With .within(), polls until match or timeout
   */
  async shouldBe(expected: string): Promise<void> {
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      const actual = await this.getTextFn();
      if (actual !== expected) {
        throwCallerError(`Expected text to equal:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldBe);
      }
      return;
    }

    // Poll with within() timeout
    const startTime = Date.now();
    let lastActual = '';
    while (Date.now() - startTime < timeout) {
      try {
        const actual = await this.getTextFn();
        if (actual === expected) {
          return;
        }
        lastActual = actual;
      } catch (error) {
        // Keep trying
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throwCallerError(`Expected text to equal:\n  ${expected}\nReceived:\n  ${lastActual}`, this.shouldBe);
  }

  /**
   * Assert text contains substring
   * With .within(), polls until substring appears or timeout
   */
  async shouldContain(expected: string): Promise<void> {
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      const actual = await this.getTextFn();
      if (!actual.includes(expected)) {
        throwCallerError(`Expected text to contain substring:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldContain);
      }
      return;
    }

    // Poll with within() timeout
    const startTime = Date.now();
    let lastActual = '';
    while (Date.now() - startTime < timeout) {
      try {
        const actual = await this.getTextFn();
        if (actual.includes(expected)) {
          return;
        }
        lastActual = actual;
      } catch (error) {
        // Keep trying
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throwCallerError(`Expected text to contain substring:\n  ${expected}\nReceived:\n  ${lastActual}`, this.shouldContain);
  }

  /**
   * Assert text matches pattern
   * With .within(), polls until pattern matches or timeout
   */
  async shouldMatch(pattern: RegExp): Promise<void> {
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      const actual = await this.getTextFn();
      if (!pattern.test(actual)) {
        throwCallerError(`Expected text to match pattern:\n  ${pattern}\nReceived:\n  ${actual}`, this.shouldMatch);
      }
      return;
    }

    // Poll with within() timeout
    const startTime = Date.now();
    let lastActual = '';
    while (Date.now() - startTime < timeout) {
      try {
        const actual = await this.getTextFn();
        if (pattern.test(actual)) {
          return;
        }
        lastActual = actual;
      } catch (error) {
        // Keep trying
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throwCallerError(`Expected text to match pattern:\n  ${pattern}\nReceived:\n  ${lastActual}`, this.shouldMatch);
  }

  /**
   * Assert text does not equal expected value
   * With .within(), polls until text changes or timeout
   */
  async shouldNotBe(unexpected: string): Promise<void> {
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      const actual = await this.getTextFn();
      if (actual === unexpected) {
        throwCallerError(`Expected text not to equal:\n  ${unexpected}\nReceived:\n  ${actual}`, this.shouldNotBe);
      }
      return;
    }

    // Poll with within() timeout
    const startTime = Date.now();
    let lastActual = '';
    while (Date.now() - startTime < timeout) {
      try {
        const actual = await this.getTextFn();
        if (actual !== unexpected) {
          return;
        }
        lastActual = actual;
      } catch (error) {
        // Keep trying
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throwCallerError(`Expected text to equal something other than:\n  ${unexpected}\nBut it remained:\n  ${lastActual}`, this.shouldNotBe);
  }

  /**
   * Make TextValue thenable so it can be awaited like a Promise
   * Enables: const text = await locator.getText();
   */
  async then<TResult1 = string, TResult2 = never>(
    onfulfilled?: ((value: string) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const text = await this.getTextFn();
      if (onfulfilled) {
        return Promise.resolve(onfulfilled(text));
      }
      return Promise.resolve(text as any);
    } catch (error) {
      if (onrejected) {
        return Promise.resolve(onrejected(error));
      }
      return Promise.reject(error);
    }
  }
}

/**
 * Locator represents a way to find widgets in the UI
 * Supports fluent-selenium style method chaining
 */
export class Locator {
  private withinTimeout?: number;

  constructor(
    private bridge: BridgeInterface,
    private selector: string,
    private selectorType: 'text' | 'exactText' | 'type' | 'id' | 'placeholder' | 'testId' | 'role' | 'label'
  ) {}

  /**
   * Find all widgets matching this locator
   */
  async findAll(): Promise<string[]> {
    const result = await this.bridge.send('findWidget', {
      selector: this.selector,
      type: this.selectorType
    }, this.findAll) as { widgetIds?: string[] };
    return result.widgetIds || [];
  }

  /**
   * Find the first widget matching this locator
   * For 'id' selectors, automatically retries for up to 100ms to handle async withId() registration
   */
  async find(): Promise<string | null> {
    const widgets = await this.findAll();
    if (widgets.length > 0) {
      return widgets[0];
    }

    // For ID selectors, retry briefly to handle async withId() registration after UI rebuild
    if (this.selectorType === 'id') {
      const startTime = Date.now();
      const retryTimeout = 500; // 500ms automatic retry for ID lookups
      while (Date.now() - startTime < retryTimeout) {
        await new Promise(resolve => setTimeout(resolve, 20));
        const retryWidgets = await this.findAll();
        if (retryWidgets.length > 0) {
          return retryWidgets[0];
        }
      }
    }

    return null;
  }

  /**
   * Click the first widget matching this locator
   * Fast fail by default, or use .within(timeout) to poll until found
   * @example
   * await ctx.getById("btn").click(); // Fast fail
   * await ctx.getById("btn").within(500).click(); // Poll 500ms
   */
  async click(): Promise<void> {
    // Consume and clear timeout immediately so it doesn't leak to next operation
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    let widgetId: string | null = null;

    if (!timeout) {
      // Fast fail - no retry
      widgetId = await this.find();
    } else {
      // within() drives explicit retry polling
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        widgetId = await this.find();
        if (widgetId) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.click);
    }

    // Check for special toolbar action prefix
    if (widgetId.startsWith('toolbar_action:')) {
      const customId = widgetId.substring('toolbar_action:'.length);
      await this.bridge.send('clickToolbarAction', { customId }, this.click);
      return;
    }

    await this.bridge.send('clickWidget', { widgetId }, this.click);
  }

  /**
   * Type text into the first widget matching this locator (fast fail)
   */
  async type(text: string): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.type);
    }
    await this.bridge.send('typeText', { widgetId, text }, this.type);
  }

  /**
   * Clear the text in the first widget matching this locator (fast fail)
   */
  async clear(): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.clear);
    }
    await this.bridge.send('setText', { widgetId, text: '' }, this.clear);
  }

  /**
   * Double-click the first widget matching this locator (fast fail)
   */
  async doubleClick(): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.doubleClick);
    }
    await this.bridge.send('doubleTapWidget', { widgetId }, this.doubleClick);
  }

  async submit(): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.submit);
    }
    await this.bridge.send('submitEntry', { widgetId }, this.submit);
  }

  async drag(x: number, y: number): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.drag);
    }
    await this.bridge.send('dragWidget', { widgetId, x, y }, this.drag);
  }

  /**
   * Set the value of a slider or progress bar (fast fail)
   * @example
   * await ctx.getById("volume").setValue(75);
   */
  async setValue(value: number): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.setValue);
    }
    await this.bridge.send('setValue', { widgetId, value }, this.setValue);
  }

  /**
   * Right-click (secondary tap) the first widget matching this locator (fast fail)
   */
  async rightClick(): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.rightClick);
    }

    // Check if this is a synthetic toolbar button
    if (widgetId.includes('_action_')) {
      const info = await this.getInfo();
      const parentToolbarId = await this.bridge.getParent(widgetId);

      if (parentToolbarId) {
        await this.bridge.clickToolbarAction(parentToolbarId, info.text || '');
        return;
      }
    }

    await this.bridge.send('rightClickWidget', { widgetId }, this.rightClick);
  }

  /**
   * Hover over the first widget matching this locator (fast fail)
   * Note: Requires windowId to be available (automatically determined from bridge)
   */
  async hover(): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.hover);
    }
    // Get first window ID from bridge (assumes single window for now)
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('hoverWidget', { widgetId, windowId }, this.hover);
  }

  /**
   * Get the text of the first widget matching this locator
   * Returns a TextValue that can be:
   * - Awaited directly: const text = await locator.getText();
   * - Asserted with polling: locator.getText().within(2000).shouldContain("text");
   */
  getText(): TextValue {
    return new TextValue(async () => {
      const widgetId = await this.find();
      if (!widgetId) {
        throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.getText);
      }
      const result = await this.bridge.send('getText', { widgetId }, this.getText) as { text: string };
      return result.text;
    });
  }

  /**
   * Get detailed information about the first widget
   */
  async getInfo(): Promise<WidgetInfo> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.getInfo);
    }
    return await this.bridge.send('getWidgetInfo', { widgetId }, this.getInfo) as WidgetInfo;
  }

  async getParent(): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) {
      throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.getParent);
    }
    const parentId = await this.bridge.getParent(widgetId);
    if (!parentId) {
      throwCallerError(`Widget with ID ${widgetId} has no parent.`, this.getParent);
    }
    return new Locator(this.bridge, parentId, 'id');
  }

  /**
   * Wait for a widget to appear (with timeout)
   */
  async waitFor(timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const widget = await this.find();
      if (widget) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throwCallerError(`Timeout waiting for widget with ${this.selectorType}: ${this.selector}`, this.waitFor);
  }

  /**
   * Fluent API: Set timeout for retrying element location (like fluent-selenium's within)
   * Returns this locator for chaining
   * @param timeoutMs - Time in milliseconds to retry finding the element
   * @example
   * await ctx.getByText("Submit").within(5000).click();
   */
  within(timeoutMs: number): Locator {
    this.withinTimeout = timeoutMs;
    return this;
  }

  /**
   * Fluent API: Assert text equals expected value
   * Fast fail by default, or use .within(timeout) to poll
   * @example
   * await ctx.getById("status").shouldBe("Success"); // Fast fail
   * await ctx.getById("status").within(500).shouldBe("Success"); // Poll 500ms
   */
  async shouldBe(expected: string): Promise<Locator> {
    // Consume and clear timeout immediately so it doesn't leak to next operation
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      // Fast fail - no retry
      const actual = await this.getText();
      if (actual !== expected) {
        throwCallerError(`Expected text to equal:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldBe);
      }
      return this;
    }

    // within() drives explicit retry polling
    const startTime = Date.now();
    let lastActual = '';
    while (Date.now() - startTime < timeout) {
      try {
        const actual = await this.getText();
        if (actual === expected) {
          return this;
        }
        lastActual = actual;
      } catch (error) {
        // Widget not found yet, keep trying
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    // Timeout - fail with last value
    throwCallerError(`Expected text to equal:\n  ${expected}\nReceived:\n  ${lastActual}`, this.shouldBe);
  }

  /**
   * Fluent API: Assert text contains expected substring
   * Fast fail by default, or use .within(timeout) to poll
   * Returns this locator for chaining
   * @example
   * await ctx.getById("message").shouldContain("success");
   * await ctx.getById("status").within(500).shouldContain("Done");
   */
  async shouldContain(expected: string): Promise<Locator> {
    // Consume and clear timeout immediately so it doesn't leak to next operation
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      // Fast fail - no retry
      const actual = await this.getText();
      if (!actual.includes(expected)) {
        throwCallerError(`Expected text to contain substring:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldContain);
      }
      return this;
    }

    // within() drives explicit retry polling
    const startTime = Date.now();
    let lastActual = '';
    while (Date.now() - startTime < timeout) {
      try {
        const actual = await this.getText();
        if (actual.includes(expected)) {
          return this;
        }
        lastActual = actual;
      } catch (error) {
        // Widget not found yet, keep trying
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    // Timeout - fail with last value
    throwCallerError(`Expected text to contain substring:\n  ${expected}\nReceived:\n  ${lastActual}`, this.shouldContain);
  }

  /**
   * Fluent API: Assert text matches regex pattern (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("email").shouldMatch(/^[a-z]+@[a-z]+\.[a-z]+$/);
   */
  async shouldMatch(pattern: RegExp): Promise<Locator> {
    const actual = await this.getText();
    if (!pattern.test(actual)) {
      throwCallerError(`Expected text to match pattern:\n  ${pattern}\nReceived:\n  ${actual}`, this.shouldMatch);
    }
    return this;
  }

  /**
   * Fluent API: Assert text does not equal expected value (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("status").shouldNotBe("Error");
   */
  async shouldNotBe(expected: string): Promise<Locator> {
    const actual = await this.getText();
    if (actual === expected) {
      throwCallerError(`Expected text not to equal:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldNotBe);
    }
    return this;
  }

  /**
   * Fluent API: Assert checkbox is checked
   * Returns this locator for chaining
   * @example
   * await ctx.getById("agree").shouldBeChecked();
   * await ctx.getById("agree").within(5000).shouldBeChecked();
   */
  async shouldBeChecked(): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.shouldBeChecked);
    const info = await this.bridge.send('getWidgetInfo', { widgetId }, this.shouldBeChecked) as WidgetInfo;
    if (!info.checked) {
      throwCallerError('Expected checkbox to be checked\nReceived: unchecked', this.shouldBeChecked);
    }
    return this;
  }

  /**
   * Fluent API: Assert checkbox is not checked (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("agree").shouldNotBeChecked();
   */
  async shouldNotBeChecked(): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.shouldNotBeChecked);
    const info = await this.bridge.send('getWidgetInfo', { widgetId }, this.shouldNotBeChecked) as WidgetInfo;
    if (info.checked) {
      throwCallerError('Expected checkbox to be unchecked\nReceived: checked', this.shouldNotBeChecked);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget has specific value (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("volume").shouldHaveValue(75);
   * await ctx.getById("country").shouldHaveValue("US");
   */
  async shouldHaveValue(expected: string | number): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.shouldHaveValue);
    const info = await this.bridge.send('getWidgetInfo', { widgetId }, this.shouldHaveValue) as WidgetInfo;
    // Use !== undefined to handle 0 values correctly (0 is falsy but valid)
    const actual = info.value !== undefined ? String(info.value) : '';
    const expectedStr = String(expected);
    if (actual !== expectedStr) {
      throwCallerError(`Expected widget value to equal:\n  ${expectedStr}\nReceived:\n  ${actual}`, this.shouldHaveValue);
    }
    return this;
  }

  /**
   * Fluent API: Assert select/radiogroup has specific selected text (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("country").shouldHaveSelected("United States");
   */
  async shouldHaveSelected(expected: string): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.shouldHaveSelected);
    const info = await this.bridge.send('getWidgetInfo', { widgetId }, this.shouldHaveSelected) as WidgetInfo;
    if (info.selected !== expected) {
      throwCallerError(`Expected selected option to equal:\n  ${expected}\nReceived:\n  ${info.selected}`, this.shouldHaveSelected);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is enabled (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getByText("Submit").shouldBeEnabled();
   */
  async shouldBeEnabled(): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.shouldBeEnabled);
    const info = await this.bridge.send('getWidgetInfo', { widgetId }, this.shouldBeEnabled) as WidgetInfo;
    if (info.disabled) {
      throwCallerError('Expected widget to be enabled\nReceived: disabled', this.shouldBeEnabled);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is disabled (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getByText("Submit").shouldBeDisabled();
   */
  async shouldBeDisabled(): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.shouldBeDisabled);
    const info = await this.bridge.send('getWidgetInfo', { widgetId }, this.shouldBeDisabled) as WidgetInfo;
    if (!info.disabled) {
      throwCallerError('Expected widget to be disabled\nReceived: enabled', this.shouldBeDisabled);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget has specific type (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("myWidget").shouldHaveType("button");
   */
  async shouldHaveType(expected: string): Promise<Locator> {
    const widgetId = await this.find();
    if (!widgetId) throwCallerError(`No widget found with ${this.selectorType}: ${this.selector}`, this.shouldHaveType);
    const info = await this.bridge.send('getWidgetInfo', { widgetId }, this.shouldHaveType) as WidgetInfo;
    if (info.type !== expected) {
      throwCallerError(`Expected widget type to equal:\n  ${expected}\nReceived:\n  ${info.type}`, this.shouldHaveType);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is visible (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("modal").shouldBeVisible();
   */
  async shouldBeVisible(): Promise<Locator> {
    const widget = await this.find();
    if (!widget) {
      throwCallerError('Expected widget to be visible\nReceived: not found', this.shouldBeVisible);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is not visible (fast fail)
   * Returns this locator for chaining
   * @example
   * await ctx.getById("modal").shouldNotBeVisible();
   */
  async shouldNotBeVisible(): Promise<Locator> {
    const widget = await this.find();
    if (widget) {
      throwCallerError('Expected widget not to be visible', this.shouldNotBeVisible);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget exists
   * Fast fail by default, or use .within(timeout) to poll
   * Returns this locator for chaining
   * @example
   * await ctx.getById("modal").shouldExist(); // Fast fail
   * await ctx.getById("modal").within(500).shouldExist(); // Poll 500ms
   */
  async shouldExist(): Promise<Locator> {
    // Consume and clear timeout immediately so it doesn't leak to next operation
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    let widget: string | null = null;

    if (!timeout) {
      // Fast fail - no retry
      widget = await this.find();
    } else {
      // within() drives explicit retry polling
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        widget = await this.find();
        if (widget) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (!widget) {
      throwCallerError(`Expected widget to exist, but not found: ${this.selectorType}="${this.selector}"`, this.shouldExist);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget does not exist
   * Fast fail by default, or use .within(timeout) to poll until gone
   * Returns this locator for chaining
   * @example
   * await ctx.getById("modal").shouldNotExist(); // Fast fail
   * await ctx.getById("modal").within(500).shouldNotExist(); // Poll 500ms until gone
   */
  async shouldNotExist(): Promise<Locator> {
    // Consume and clear timeout immediately so it doesn't leak to next operation
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    let widget: string | null = null;

    if (!timeout) {
      // Fast fail - no retry
      widget = await this.find();
    } else {
      // within() drives explicit retry polling until element disappears
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        widget = await this.find();
        if (!widget) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    if (widget) {
      throwCallerError(`Expected widget NOT to exist, but found: ${this.selectorType}="${this.selector}"`, this.shouldNotExist);
    }
    return this;
  }

  /**
   * Find widget and return it (for assertion on test line)
   * Fast fail by default, or use .within(timeout) to poll
   * @example
   * await ctx.getById("myWidget").shouldExist(); // Fast fail
   * await ctx.getById("myWidget").within(500).shouldExist(); // Poll 500ms
   */
  async exists(): Promise<string | null> {
    // Consume and clear timeout immediately so it doesn't leak to next operation
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      // Fast fail - no retry
      return await this.find();
    }

    // within() drives explicit retry polling
    const startTime = Date.now();
    let widget: string | null = null;
    while (Date.now() - startTime < timeout) {
      widget = await this.find();
      if (widget) {
        return widget;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return null;
  }


  /**
   * Get text with retry support (respects withinTimeout)
   */
  private async getTextWithRetry(): Promise<string> {
    if (!this.withinTimeout) {
      return await this.getText();
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < this.withinTimeout) {
      try {
        return await this.getText();
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    throw lastError || new Error('Failed to get text');
  }

  /**
   * Enhanced find with retry support (respects withinTimeout)
   */
  private async findWithRetry(): Promise<string | null> {
    if (!this.withinTimeout) {
      return await this.find();
    }

    const startTime = Date.now();
    while (Date.now() - startTime < this.withinTimeout) {
      const widget = await this.find();
      if (widget) {
        return widget;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return null; // Timeout
  }

  /**
   * Get checked state with retry support (respects withinTimeout)
   */
  private async getCheckedWithRetry(): Promise<boolean> {
    if (!this.withinTimeout) {
      const widgetId = await this.find();
      if (!widgetId) {
        throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
      }
      const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
      return response.checked || false;
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < this.withinTimeout) {
      try {
        const widgetId = await this.find();
        if (!widgetId) {
          throw new Error('Widget not found');
        }
        const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
        return response.checked || false;
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    throw lastError || new Error('Failed to get checked state');
  }

  /**
   * Get value with retry support (respects withinTimeout)
   */
  private async getValueWithRetry(): Promise<string> {
    if (!this.withinTimeout) {
      const widgetId = await this.find();
      if (!widgetId) {
        throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
      }
      const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
      // Check for value first (can be 0 for sliders), then text, then empty string
      const value = response.value !== undefined ? response.value : (response.text || '');
      return String(value);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < this.withinTimeout) {
      try {
        const widgetId = await this.find();
        if (!widgetId) {
          throw new Error('Widget not found');
        }
        const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
        // Check for value first (can be 0 for sliders), then text, then empty string
        const value = response.value !== undefined ? response.value : (response.text || '');
        return String(value);
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    throw lastError || new Error('Failed to get value');
  }

  /**
   * Get selected value with retry support (respects withinTimeout)
   */
  private async getSelectedWithRetry(): Promise<string> {
    if (!this.withinTimeout) {
      const widgetId = await this.find();
      if (!widgetId) {
        throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
      }
      const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
      return response.selected || '';
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < this.withinTimeout) {
      try {
        const widgetId = await this.find();
        if (!widgetId) {
          throw new Error('Widget not found');
        }
        const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
        return response.selected || '';
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    throw lastError || new Error('Failed to get selected value');
  }

  /**
   * Get disabled state with retry support (respects withinTimeout)
   */
  private async getDisabledWithRetry(): Promise<boolean> {
    if (!this.withinTimeout) {
      const widgetId = await this.find();
      if (!widgetId) {
        throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
      }
      const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
      return response.disabled || false;
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < this.withinTimeout) {
      try {
        const widgetId = await this.find();
        if (!widgetId) {
          throw new Error('Widget not found');
        }
        const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
        return response.disabled || false;
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    throw lastError || new Error('Failed to get disabled state');
  }

  /**
   * Get widget type with retry support (respects withinTimeout)
   */
  private async getTypeWithRetry(): Promise<string> {
    if (!this.withinTimeout) {
      const widgetId = await this.find();
      if (!widgetId) {
        throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
      }
      const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
      return response.type || '';
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < this.withinTimeout) {
      try {
        const widgetId = await this.find();
        if (!widgetId) {
          throw new Error('Widget not found');
        }
        const response = await this.bridge.send('getWidgetInfo', { widgetId }) as WidgetInfo;
        return response.type || '';
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    throw lastError || new Error('Failed to get widget type');
  }

  /**
   * Get the bounding box of the first widget.
   * Primarily for Canvas elements that define x, y, x2, y2.
   *
   * @example
   * const bounds = await ctx.getById('myCircle').getBounds();
   * expect(bounds.x).toBe(10);
   */
  async getBounds(): Promise<{ x: number; y: number; x2: number; y2: number }> {
    const info = await this.getInfo();
    if (info.x === undefined || info.y === undefined || info.x2 === undefined || info.y2 === undefined) {
      throwCallerError(`Widget ${info.id} (type: ${info.type}) does not have x, y, x2, y2 bounds.`, this.getBounds);
    }
    return { x: info.x, y: info.y, x2: info.x2, y2: info.y2 };
  }

  /**
   * Access a specific item in a list widget by index
   * Returns a ListItemLocator for fluent assertions
   * @example
   * await ctx.getById("playerList").item(0).shouldBe("Alice");
   * await ctx.getById("playerList").item(2).shouldContain("Bob");
   */
  item(index: number): ListItemLocator {
    return new ListItemLocator(this.bridge, this, index);
  }
}

/**
 * Locator for a specific item within a list widget
 * Supports fluent assertions on list items
 */
export class ListItemLocator {
  constructor(
    private bridge: BridgeInterface,
    private parentLocator: Locator,
    private index: number
  ) {}

  /**
   * Get the text value of this list item
   */
  async getText(): Promise<string> {
    const parentId = await this.parentLocator.find();
    if (!parentId) {
      throwCallerError('Parent list widget not found', this.getText);
    }
    const result = await this.bridge.send('getListData', { id: parentId }, this.getText) as { data?: string[] };
    const data = result.data || [];
    if (this.index < 0 || this.index >= data.length) {
      throwCallerError(`List item index ${this.index} out of bounds (list has ${data.length} items)`, this.getText);
    }
    return data[this.index];
  }

  /**
   * Assert this list item equals expected value
   * @example
   * await ctx.getById("playerList").item(0).shouldBe("Alice");
   */
  async shouldBe(expected: string): Promise<ListItemLocator> {
    const actual = await this.getText();
    if (actual !== expected) {
      throwCallerError(`Expected list item to equal:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldBe);
    }
    return this;
  }

  /**
   * Assert this list item contains expected substring
   * @example
   * await ctx.getById("playerList").item(0).shouldContain("Ali");
   */
  async shouldContain(expected: string): Promise<ListItemLocator> {
    const actual = await this.getText();
    if (!actual.includes(expected)) {
      throwCallerError(`Expected list item to contain substring:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldContain);
    }
    return this;
  }

  /**
   * Assert this list item matches regex pattern
   * @example
   * await ctx.getById("emails").item(0).shouldMatch(/^[\w]+@[\w]+\.[\w]+$/);
   */
  async shouldMatch(pattern: RegExp): Promise<ListItemLocator> {
    const actual = await this.getText();
    if (!pattern.test(actual)) {
      throwCallerError(`Expected list item to match pattern:\n  ${pattern}\nReceived:\n  ${actual}`, this.shouldMatch);
    }
    return this;
  }

  /**
   * Assert this list item does not equal expected value
   */
  async shouldNotBe(expected: string): Promise<ListItemLocator> {
    const actual = await this.getText();
    if (actual === expected) {
      throwCallerError(`Expected list item not to equal:\n  ${expected}\nReceived:\n  ${actual}`, this.shouldNotBe);
    }
    return this;
  }
}

/**
 * Assertion helpers for testing
 * Enhanced with fluent-selenium style assertions
 */
export class Expect {
  constructor(private locator: Locator) {}

  async toHaveText(expectedText: string): Promise<void> {
    const actualText = await this.locator.getText();
    expect(actualText).toBe(expectedText);
  }

  async toContainText(expectedText: string): Promise<void> {
    const actualText = await this.locator.getText();
    expect(actualText).toContain(expectedText);
  }

  async toNotHaveText(expectedText: string): Promise<void> {
    const actualText = await this.locator.getText();
    expect(actualText).not.toBe(expectedText);
  }

  async toNotContainText(expectedText: string): Promise<void> {
    const actualText = await this.locator.getText();
    expect(actualText).not.toContain(expectedText);
  }

  async toMatchText(pattern: RegExp): Promise<void> {
    const actualText = await this.locator.getText();
    expect(actualText).toMatch(pattern);
  }

  async toNotMatchText(pattern: RegExp): Promise<void> {
    const actualText = await this.locator.getText();
    expect(actualText).not.toMatch(pattern);
  }

  async toBeVisible(): Promise<void> {
    // Use findWithRetry to respect within() timeout
    // If no explicit timeout set, use a sensible default of 2000ms
    // (reduced from 5000ms to prevent Jest test timeouts when multiple assertions fail)
    const locator = this.locator as any;
    const hasTimeout = locator.withinTimeout !== undefined;

    if (!hasTimeout) {
      // Temporarily set default timeout for this assertion
      locator.withinTimeout = 2000;
    }

    try {
      const widget = await locator.findWithRetry();
      if (!widget) {
        throw new Error(`Expected widget to be visible, but not found: ${locator.selectorType}="${locator.selector}"`);
      }
    } finally {
      // Clean up temporary timeout if we set it
      if (!hasTimeout) {
        locator.withinTimeout = undefined;
      }
    }
  }

  async toNotBeVisible(): Promise<void> {
    // For "not visible", we want immediate check (no retry)
    const locator = this.locator as any;
    const widget = await this.locator.find();
    if (widget) {
      throw new Error(`Expected widget to NOT be visible, but found: ${locator.selectorType}="${locator.selector}"`);
    }
  }

  async toExist(): Promise<void> {
    const locator = this.locator as any;
    const widgets = await this.locator.findAll();
    if (widgets.length === 0) {
      throw new Error(`Expected widget to exist, but not found: ${locator.selectorType}="${locator.selector}"`);
    }
  }

  async toNotExist(): Promise<void> {
    const locator = this.locator as any;
    const widgets = await this.locator.findAll();
    if (widgets.length > 0) {
      throw new Error(`Expected widget to NOT exist, but found ${widgets.length}: ${locator.selectorType}="${locator.selector}"`);
    }
  }

  async toHaveCount(count: number): Promise<void> {
    const locator = this.locator as any;
    const widgets = await this.locator.findAll();
    if (widgets.length !== count) {
      throw new Error(`Expected ${count} widget(s), but found ${widgets.length}: ${locator.selectorType}="${locator.selector}"`);
    }
  }

  async toHaveCountGreaterThan(count: number): Promise<void> {
    const widgets = await this.locator.findAll();
    expect(widgets.length).toBeGreaterThan(count);
  }

  async toHaveCountLessThan(count: number): Promise<void> {
    const widgets = await this.locator.findAll();
    expect(widgets.length).toBeLessThan(count);
  }
}

/**
 * Main test context for interacting with Tsyne apps
 */
export class TestContext {
  private app?: any; // Store app for getting window IDs

  constructor(private bridge: BridgeInterface, app?: any) {
    this.app = app;
  }

  /**
   * Get a locator for buttons with specific text
   */
  getByText(text: string): Locator {
    return new Locator(this.bridge, text, 'text');
  }

  getByPlaceholder(text: string): Locator {
    return new Locator(this.bridge, text, 'placeholder');
  }

  /**
   * Get a locator for widgets with exact text match
   */
  getByExactText(text: string): Locator {
    return new Locator(this.bridge, text, 'exactText');
  }

  /**
   * Get a locator for widgets of a specific type
   */
  getByType(type: 'button' | 'label' | 'entry' | 'image' | 'passwordentry' | 'entry'): Locator {
    return new Locator(this.bridge, type, 'type');
  }

  /**
   * Get all widgets of a specific type
   * Returns an array of Locators, one for each widget of the specified type
   *
   * @example
   * const labels = await ctx.getAllByType('label');
   * for (const label of labels) {
   *   const text = await label.getText();
   *   console.log(text);
   * }
   */
  async getAllByType(type: 'button' | 'label' | 'entry' | 'image' | 'passwordentry' | 'entry'): Promise<Locator[]> {
    const typeLocator = new Locator(this.bridge, type, 'type');
    const widgetIds = await typeLocator.findAll();
    return widgetIds.map(id => new Locator(this.bridge, id, 'id'));
  }

  /**
   * Get a locator for a widget by ID (like Selenium's findElement)
   * Returns a locator that finds a single widget with the specified ID
   *
   * @example
   * const submitButton = ctx.getById('submit-btn');
   * await submitButton.click();
   * await ctx.expect(submitButton).toBeVisible();
   */
  getById(id: string): Locator {
    return new Locator(this.bridge, id, 'id');
  }

  /**
   * Get a locator for widgets with a specific test ID (data-testid equivalent)
   * Useful for testing - can add testIds to widgets without affecting UI
   *
   * @example
   * const submitBtn = ctx.getByTestId('submit-button');
   * await submitBtn.click();
   */
  getByTestId(testId: string): Locator {
    return new Locator(this.bridge, testId, 'testId');
  }

  /**
   * Get a locator for widgets with a specific ARIA role
   * Selects widgets by their accessibility role (e.g., 'button', 'textbox', 'navigation')
   *
   * @example
   * const buttons = ctx.getByRole('button');
   * const textbox = ctx.getByRole('textbox');
   */
  getByRole(role: string): Locator {
    return new Locator(this.bridge, role, 'role');
  }

  /**
   * Get a locator for widgets with a specific accessibility label
   * Selects widgets by their accessibility label (partial match)
   *
   * @example
   * const usernameField = ctx.getByLabel('Username');
   * await usernameField.type('john');
   */
  getByLabel(label: string): Locator {
    return new Locator(this.bridge, label, 'label');
  }

  /**
   * Get all widgets in the application
   */
  async getAllWidgets(): Promise<WidgetInfo[]> {
    const result = await this.bridge.send('getAllWidgets', {}, this.getAllWidgets) as { widgets?: WidgetInfo[] };
    return result.widgets || [];
  }

  /**
   * Wait for a specified time
   * NOTE: Wait times are tracked and reported at end of test run.
   * Consider using .within(timeout).shouldBe() patterns instead for better test reliability.
   */
  async wait(ms: number): Promise<void> {
    // Track this wait call with the current test name and file path
    const testName = getCurrentTestName();
    const testPath = getCurrentTestPath();
    waitTimeTracker.record(ms, testName, testPath);

    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to become true (polling like Selenium's waitFor)
   * Checks condition repeatedly until true or timeout
   * @param condition Function that returns true when condition is met
   * @param options timeout (default 5000ms), interval (default 10ms), description
   */
  async waitForCondition(
    condition: () => Promise<boolean> | boolean,
    options: { timeout?: number; interval?: number; description?: string } = {}
  ): Promise<void> {
    const timeout = options.timeout ?? 5000;
    const interval = options.interval ?? 10;
    const description = options.description ?? 'condition';

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return; // Condition met, return immediately
        }
      } catch (e) {
        // Condition check failed, keep trying
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throwCallerError(`Timeout waiting for ${description} after ${timeout}ms`, this.waitForCondition);
  }

  /**
   * Create an assertion helper
   */
  expect(locator: Locator): Expect {
    return new Expect(locator);
  }

  /**
   * Find a widget by text (convenience method for backward compatibility)
   * Returns widget info or null if not found
   */
  async findWidget(options: { text: string }): Promise<WidgetInfo | null> {
    const locator = this.getByText(options.text);
    const widgetId = await locator.find();
    if (!widgetId) {
      return null;
    }
    return await locator.getInfo();
  }

  /**
   * Click a widget by ID (convenience method for backward compatibility)
   */
  async clickWidget(widgetId: string): Promise<void> {
    await this.bridge.send('clickWidget', { widgetId }, this.clickWidget);
  }

  /**
   * Click a widget at specific coordinates (for canvas/raster widgets)
   * @param widgetId The widget ID to click
   * @param x The X coordinate within the widget
   * @param y The Y coordinate within the widget
   */
  async clickWidgetAt(widgetId: string, x: number, y: number): Promise<void> {
    await this.bridge.send('clickWidget', { widgetId, x, y }, this.clickWidgetAt);
  }

  /**
   * Get table data for a table widget
   * Returns the raw table data (array of rows)
   */
  async getTableData(tableId: string): Promise<string[][]> {
    const result = await this.bridge.send('getTableData', { id: tableId }, this.getTableData) as { data?: string[][] };
    return result.data || [];
  }

  /**
   * Get list data for a list widget
   * Returns the list items as an array
   */
  async getListData(listId: string): Promise<string[]> {
    const result = await this.bridge.send('getListData', { id: listId }, this.getListData) as { data?: string[] };
    return result.data || [];
  }

  /**
   * Get all text from all widgets on the page
   * Useful for debugging and quick text verification
   *
   * @returns Array of text values from all widgets (includes empty strings)
   * @example
   * const allText = await ctx.getAllText();
   * console.log('All text on page:', allText);
   */
  async getAllText(): Promise<string[]> {
    const widgets = await this.getAllWidgets();
    return widgets.map(w => w.text || '');
  }

  /**
   * Get all text from all widgets as a single string
   * Each widget's text is on a new line
   * Useful for debugging what's actually rendered on the page
   *
   * @returns All text joined with newlines
   * @example
   * const pageText = await ctx.getAllTextAsString();
   * console.log('Page content:\n', pageText);
   */
  async getAllTextAsString(): Promise<string> {
    const textArray = await this.getAllText();
    return textArray.join('\n');
  }

  /**
   * Get all canvas circle locators
   * @returns An array of Locators, one for each canvas circle
   */
  async getAllCanvasCircles(): Promise<Locator[]> {
    const typeLocator = new Locator(this.bridge, 'canvasCircle', 'type');
    const widgetIds = await typeLocator.findAll();
    return widgetIds.map(id => new Locator(this.bridge, id, 'id'));
  }

  /**
   * Get a specific canvas circle locator by index
   * @param index The 0-based index of the canvas circle
   * @returns A Locator for the specified canvas circle
   */
  async getCanvasCircle(index: number): Promise<Locator> {
    const circles = await this.getAllCanvasCircles();
    if (index < 0 || index >= circles.length) {
      throwCallerError(`Canvas circle index ${index} out of bounds (found ${circles.length} circles).`, this.getCanvasCircle);
    }
    return circles[index];
  }

  /**
   * Check if any widget on the page contains the specified text (case-sensitive)
   * Uses getAllWidgets() internally
   *
   * @param text - Text to search for (case-sensitive)
   * @returns true if any widget contains the text
   * @example
   * if (await ctx.hasText('Success')) {
   *   console.log('Success message found somewhere on page');
   * }
   */
  async hasText(text: string): Promise<boolean> {
    const widgets = await this.getAllWidgets();
    return widgets.some(w => w.text && w.text.includes(text));
  }

  /**
   * Check if any widget on the page contains the specified text (case-insensitive)
   * Uses getAllWidgets() internally
   *
   * @param text - Text to search for (case-insensitive)
   * @returns true if any widget contains the text
   * @example
   * if (await ctx.hasTextIgnoreCase('error')) {
   *   throw new Error('Error message found on page');
   * }
   */
  async hasTextIgnoreCase(text: string): Promise<boolean> {
    const widgets = await this.getAllWidgets();
    const lowerText = text.toLowerCase();
    return widgets.some(w => w.text && w.text.toLowerCase().includes(lowerText));
  }

  /**
   * Assert that the page contains specific text somewhere
   * Throws an error if text is not found
   *
   * @param text - Text that must be present on the page
   * @param options - Optional case-insensitive flag
   * @throws Error if text is not found
   * @example
   * await ctx.assertHasText('Welcome');
   * await ctx.assertHasText('success', { ignoreCase: true });
   */
  async assertHasText(text: string, options: { ignoreCase?: boolean } = {}): Promise<void> {
    const hasIt = options.ignoreCase
      ? await this.hasTextIgnoreCase(text)
      : await this.hasText(text);

    expect(hasIt).toBe(true);
  }

  /**
   * Scroll the canvas by delta X and Y
   * Uses Fyne's test.Scroll in test mode
   * @param deltaX - Horizontal scroll distance (positive = right, negative = left)
   * @param deltaY - Vertical scroll distance (positive = down, negative = up)
   * @example
   * await ctx.scroll(0, 100); // Scroll down 100 pixels
   * await ctx.scroll(-50, 0); // Scroll left 50 pixels
   */
  async scroll(deltaX: number, deltaY: number): Promise<void> {
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('scrollCanvas', { windowId, deltaX, deltaY }, this.scroll);
  }

  /**
   * Drag from a position by delta X and Y
   * Uses Fyne's test.Drag in test mode
   * @param fromX - Starting X position
   * @param fromY - Starting Y position
   * @param deltaX - Horizontal drag distance
   * @param deltaY - Vertical drag distance
   * @example
   * await ctx.drag(100, 100, 50, 0); // Drag right from (100,100) by 50px
   */
  async drag(fromX: number, fromY: number, deltaX: number, deltaY: number): Promise<void> {
    const windowId = this.app?.getFirstWindowId?.();
    if (!windowId) {
      throwCallerError('No window created. Call app.window() before dragging.', this.drag);
    }
    await this.bridge.send('dragCanvas', { windowId, fromX, fromY, deltaX, deltaY }, this.drag);
  }

  /**
   * Focus the next focusable widget (tab navigation)
   * Uses Fyne's test.FocusNext in test mode
   * @example
   * await ctx.focusNext(); // Simulate pressing Tab
   */
  async focusNext(): Promise<void> {
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('focusNext', { windowId }, this.focusNext);
  }

  /**
   * Focus the previous focusable widget (shift-tab navigation)
   * Uses Fyne's test.FocusPrevious in test mode
   * @example
   * await ctx.focusPrevious(); // Simulate pressing Shift+Tab
   */
  async focusPrevious(): Promise<void> {
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('focusPrevious', { windowId }, this.focusPrevious);
  }

  async captureScreenshot(filePath: string): Promise<void> {
    const windowId = this.app?.getFirstWindowId?.();
    if (!windowId) {
      throwCallerError('No window created. Call app.window() before capturing screenshots.', this.captureScreenshot);
    }
    await this.bridge.send('captureWindow', { windowId, filePath }, this.captureScreenshot);
  }

  /**
   * Simulate a tap at specific coordinates on the window's canvas.
   * This goes through Fyne's full event dispatch system.
   * Useful for testing canvas/raster interactions.
   * @param x - X coordinate in the window
   * @param y - Y coordinate in the window
   */
  async tapAt(x: number, y: number): Promise<void> {
    const windowId = this.app?.getFirstWindowId?.();
    if (!windowId) {
      throwCallerError('No window created. Call app.window() before tapping.', this.tapAt);
    }
    await this.bridge.send('tapAt', { windowId, x, y }, this.tapAt);
  }

  /**
   * Get a fluent locator for dialogs
   * Supports within() polling and chainable assertions
   * @example
   * await ctx.dialog().shouldBeError('Failed');
   * await ctx.dialog().within(500).shouldExist();
   * await ctx.dialog().shouldBeInfo('Success').thenDismiss();
   */
  dialog(): DialogLocator {
    return new DialogLocator(this.bridge, this.app);
  }

  /**
   * Get all currently active dialogs (info, error, confirm, etc.)
   * Uses Fyne's canvas overlay system to inspect dialogs
   * @returns Array of dialog information objects
   * @example
   * const dialogs = await ctx.getActiveDialogs();
   * expect(dialogs).toHaveLength(1);
   * expect(dialogs[0].type).toBe('error');
   * expect(dialogs[0].message).toContain('Failed');
   */
  async getActiveDialogs(): Promise<DialogInfo[]> {
    // Get window ID from app (dynamically generated, not hardcoded)
    const windowId = this.app?.getFirstWindowId?.();
    if (!windowId) {
      throwCallerError('No window created. Call app.window() before querying dialogs.', this.getActiveDialogs);
    }

    const result = await this.bridge.send('getActiveDialogs', { windowId }, this.getActiveDialogs) as { dialogs?: DialogInfo[] };
    return result.dialogs || [];
  }

  /**
   * Dismiss the top-most active dialog
   * Finds and clicks the OK/Close/Dismiss/Cancel button
   * @example
   * await ctx.dismissActiveDialog();
   */
  async dismissActiveDialog(): Promise<void> {
    const windowId = this.app?.getFirstWindowId?.();
    if (!windowId) {
      throwCallerError('No window created. Call app.window() before dismissing dialogs.', this.dismissActiveDialog);
    }
    await this.bridge.send('dismissActiveDialog', { windowId }, this.dismissActiveDialog);
  }

  /**
   * Assert that an error dialog is currently shown with the expected message
   * @param expectedMessage - Text that should be in the error message (partial match)
   * @example
   * await ctx.assertErrorDialog('Failed to navigate');
   */
  async assertErrorDialog(expectedMessage: string): Promise<void> {
    const dialogs = await this.getActiveDialogs();
    const errorDialog = dialogs.find(d => d.type === 'error');
    expect(errorDialog).toBeTruthy();
    if (errorDialog?.message) {
      expect(errorDialog.message).toContain(expectedMessage);
    } else if (errorDialog?.texts) {
      expect(errorDialog.texts.join(' ')).toContain(expectedMessage);
    }
  }

  /**
   * Assert that an info dialog is currently shown with the expected title/message
   * @param expectedText - Text that should be in the dialog (partial match)
   * @example
   * await ctx.assertInfoDialog('Cannot Move');
   */
  async assertInfoDialog(expectedText: string): Promise<void> {
    const dialogs = await this.getActiveDialogs();
    const infoDialog = dialogs.find(d => d.type === 'info');
    expect(infoDialog).toBeTruthy();
    const allText = [infoDialog?.title, infoDialog?.message, ...(infoDialog?.texts || [])].join(' ');
    expect(allText).toContain(expectedText);
  }

  /**
   * Assert that no dialogs are currently shown
   * @example
   * await ctx.assertNoDialogs();
   */
  async assertNoDialogs(): Promise<void> {
    const dialogs = await this.getActiveDialogs();
    expect(dialogs).toHaveLength(0);
  }
}

/**
 * Information about an active dialog
 */
export interface DialogInfo {
  type?: 'info' | 'error' | 'confirm';
  title?: string;
  message?: string;
  texts?: string[];
}

/**
 * Fluent locator for dialog assertions
 * Supports within() polling and chainable assertions
 */
export class DialogLocator {
  private withinTimeout?: number;
  private windowId?: string; // Dynamically set from app

  constructor(private bridge: BridgeInterface, app?: any) {
    // Get window ID from app (dynamically generated)
    this.windowId = app?.getFirstWindowId?.();
  }

  /**
   * Set timeout for polling until dialog appears
   * @example
   * await ctx.dialog().within(500).shouldExist();
   */
  within(timeoutMs: number): DialogLocator {
    this.withinTimeout = timeoutMs;
    return this;
  }

  /**
   * Get all active dialogs (with optional polling)
   */
  private async getDialogs(callerFn?: Function): Promise<DialogInfo[]> {
    if (!this.windowId) {
      throwCallerError('No window created. Call app.window() before querying dialogs.', callerFn || this.getDialogs);
    }
    const result = await this.bridge.send('getActiveDialogs', { windowId: this.windowId }, callerFn) as { dialogs?: DialogInfo[] };
    return result.dialogs || [];
  }

  /**
   * Poll for dialogs until condition is met or timeout
   */
  private async pollFor<T>(
    condition: (dialogs: DialogInfo[]) => T | null,
    errorMsg: string,
    callerFn: Function
  ): Promise<T> {
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined; // consume timeout

    if (!timeout) {
      // Fast fail
      const dialogs = await this.getDialogs(callerFn);
      const result = condition(dialogs);
      if (result === null) {
        throwCallerError(errorMsg, callerFn);
      }
      return result;
    }

    // Poll with timeout
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const dialogs = await this.getDialogs(callerFn);
      const result = condition(dialogs);
      if (result !== null) {
        return result;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throwCallerError(`${errorMsg} (after ${timeout}ms)`, callerFn);
  }

  /**
   * Assert any dialog exists
   * @example
   * await ctx.dialog().shouldExist();
   * await ctx.dialog().within(500).shouldExist();
   */
  async shouldExist(): Promise<DialogLocator> {
    await this.pollFor(
      dialogs => dialogs.length > 0 ? true : null,
      'No dialog found',
      this.shouldExist
    );
    return this;
  }

  /**
   * Assert no dialogs exist
   * @example
   * await ctx.dialog().shouldNotExist();
   */
  async shouldNotExist(): Promise<DialogLocator> {
    const timeout = this.withinTimeout;
    this.withinTimeout = undefined;

    if (!timeout) {
      const dialogs = await this.getDialogs(this.shouldNotExist);
      expect(dialogs).toHaveLength(0);
      return this;
    }

    // Poll until dialogs disappear
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const dialogs = await this.getDialogs(this.shouldNotExist);
      if (dialogs.length === 0) {
        return this;
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throwCallerError(`Dialog still visible after ${timeout}ms`, this.shouldNotExist);
  }

  /**
   * Assert an error dialog is shown with expected message
   * @example
   * await ctx.dialog().shouldBeError('Failed to navigate');
   */
  async shouldBeError(expectedMessage?: string): Promise<DialogLocator> {
    const dialog = await this.pollFor(
      dialogs => dialogs.find(d => d.type === 'error') || null,
      'No error dialog found',
      this.shouldBeError
    );

    if (expectedMessage) {
      const allText = [dialog.message, ...(dialog.texts || [])].join(' ');
      expect(allText).toContain(expectedMessage);
    }
    return this;
  }

  /**
   * Assert an info dialog is shown with expected text
   * @example
   * await ctx.dialog().shouldBeInfo('Success');
   */
  async shouldBeInfo(expectedText?: string): Promise<DialogLocator> {
    const dialog = await this.pollFor(
      dialogs => dialogs.find(d => d.type === 'info') || null,
      'No info dialog found',
      this.shouldBeInfo
    );

    if (expectedText) {
      const allText = [dialog.title, dialog.message, ...(dialog.texts || [])].join(' ');
      expect(allText).toContain(expectedText);
    }
    return this;
  }

  /**
   * Assert dialog contains specific text (any type)
   * @example
   * await ctx.dialog().shouldContain('error occurred');
   */
  async shouldContain(expectedText: string): Promise<DialogLocator> {
    await this.pollFor(
      dialogs => {
        for (const d of dialogs) {
          const allText = [d.title, d.message, ...(d.texts || [])].join(' ');
          if (allText.includes(expectedText)) {
            return true;
          }
        }
        return null;
      },
      `No dialog containing "${expectedText}" found`,
      this.shouldContain
    );
    return this;
  }

  /**
   * Dismiss the dialog (chainable after assertion)
   * @example
   * await ctx.dialog().shouldBeError('Failed').thenDismiss();
   */
  async thenDismiss(): Promise<void> {
    await this.bridge.send('dismissActiveDialog', { windowId: this.windowId }, this.thenDismiss);
  }

  /**
   * Dismiss the dialog (standalone)
   * @example
   * await ctx.dialog().dismiss();
   */
  async dismiss(): Promise<void> {
    await this.bridge.send('dismissActiveDialog', { windowId: this.windowId }, this.dismiss);
  }
}
