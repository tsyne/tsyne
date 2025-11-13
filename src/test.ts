import { BridgeConnection } from './fynebridge';

/**
 * Widget information returned from inspections
 */
export interface WidgetInfo {
  id: string;
  type: string;
  text: string;
  placeholder?: string;
}

/**
 * Locator represents a way to find widgets in the UI
 * Supports fluent-selenium style method chaining
 */
export class Locator {
  private withinTimeout?: number;
  private withoutTimeout?: number;

  constructor(
    private bridge: BridgeConnection,
    private selector: string,
    private selectorType: 'text' | 'exactText' | 'type' | 'id'
  ) {}

  /**
   * Find all widgets matching this locator
   */
  async findAll(): Promise<string[]> {
    const result = await this.bridge.send('findWidget', {
      selector: this.selector,
      type: this.selectorType
    });
    return result.widgetIds || [];
  }

  /**
   * Find the first widget matching this locator
   */
  async find(): Promise<string | null> {
    const widgets = await this.findAll();
    return widgets.length > 0 ? widgets[0] : null;
  }

  /**
   * Click the first widget matching this locator
   * Respects within() timeout if set
   */
  async click(): Promise<void> {
    const widgetId = await this.findWithRetry();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    await this.bridge.send('clickWidget', { widgetId });
  }

  /**
   * Type text into the first widget matching this locator
   * Respects within() timeout if set
   */
  async type(text: string): Promise<void> {
    const widgetId = await this.findWithRetry();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    await this.bridge.send('typeText', { widgetId, text });
  }

  /**
   * Double-click the first widget matching this locator
   * Respects within() timeout if set
   */
  async doubleClick(): Promise<void> {
    const widgetId = await this.findWithRetry();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    await this.bridge.send('doubleTapWidget', { widgetId });
  }

  /**
   * Right-click (secondary tap) the first widget matching this locator
   * Respects within() timeout if set
   */
  async rightClick(): Promise<void> {
    const widgetId = await this.findWithRetry();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    await this.bridge.send('rightClickWidget', { widgetId });
  }

  /**
   * Hover over the first widget matching this locator (moves mouse to widget position)
   * Respects within() timeout if set
   * Note: Requires windowId to be available (automatically determined from bridge)
   */
  async hover(): Promise<void> {
    const widgetId = await this.findWithRetry();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    // Get first window ID from bridge (assumes single window for now)
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('hoverWidget', { widgetId, windowId });
  }

  /**
   * Get the text of the first widget matching this locator
   */
  async getText(): Promise<string> {
    const widgetId = await this.find();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    const result = await this.bridge.send('getText', { widgetId });
    return result.text;
  }

  /**
   * Get detailed information about the first widget
   */
  async getInfo(): Promise<WidgetInfo> {
    const widgetId = await this.find();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    return await this.bridge.send('getWidgetInfo', { widgetId });
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for widget with ${this.selectorType}: ${this.selector}`);
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
   * Fluent API: Wait for element to disappear from DOM (like fluent-selenium's without)
   * Returns a promise that resolves when element is no longer found
   * @param timeoutMs - Time in milliseconds to wait for element to disappear
   * @example
   * await ctx.getByText("Loading...").without(5000);
   */
  async without(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const widget = await this.find();
      if (!widget) {
        return; // Element not found = disappeared
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for widget to disappear with ${this.selectorType}: ${this.selector}`);
  }

  /**
   * Fluent API: Assert text equals expected value (like fluent-selenium's shouldBe)
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("status").getText().then(t => expect(t).toBe("Success"));
   * // Or use shouldBe for fluent style:
   * await ctx.getByID("status").shouldBe("Success");
   */
  async shouldBe(expected: string): Promise<Locator> {
    const actual = await this.getTextWithRetry();
    if (actual !== expected) {
      throw new Error(`Expected text to be "${expected}" but got "${actual}"`);
    }
    return this;
  }

  /**
   * Fluent API: Assert text contains expected substring (like fluent-selenium's shouldContain)
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("message").shouldContain("success");
   */
  async shouldContain(expected: string): Promise<Locator> {
    const actual = await this.getTextWithRetry();
    if (!actual.includes(expected)) {
      throw new Error(`Expected text to contain "${expected}" but got "${actual}"`);
    }
    return this;
  }

  /**
   * Fluent API: Assert text matches regex pattern (like fluent-selenium's shouldMatch)
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("email").shouldMatch(/^[a-z]+@[a-z]+\.[a-z]+$/);
   */
  async shouldMatch(pattern: RegExp): Promise<Locator> {
    const actual = await this.getTextWithRetry();
    if (!pattern.test(actual)) {
      throw new Error(`Expected text to match ${pattern} but got "${actual}"`);
    }
    return this;
  }

  /**
   * Fluent API: Assert text does not equal expected value
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("status").shouldNotBe("Error");
   */
  async shouldNotBe(expected: string): Promise<Locator> {
    const actual = await this.getTextWithRetry();
    if (actual === expected) {
      throw new Error(`Expected text to not be "${expected}" but it was`);
    }
    return this;
  }

  /**
   * Fluent API: Assert checkbox is checked
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("agree").shouldBeChecked();
   * await ctx.getByID("agree").within(5000).shouldBeChecked();
   */
  async shouldBeChecked(): Promise<Locator> {
    const checked = await this.getCheckedWithRetry();
    if (!checked) {
      throw new Error('Expected checkbox to be checked but it was not');
    }
    return this;
  }

  /**
   * Fluent API: Assert checkbox is not checked
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("agree").shouldNotBeChecked();
   */
  async shouldNotBeChecked(): Promise<Locator> {
    const checked = await this.getCheckedWithRetry();
    if (checked) {
      throw new Error('Expected checkbox to not be checked but it was');
    }
    return this;
  }

  /**
   * Fluent API: Assert widget has specific value (for entry, slider, select)
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("volume").shouldHaveValue(75);
   * await ctx.getByID("country").shouldHaveValue("US");
   */
  async shouldHaveValue(expected: string | number): Promise<Locator> {
    const actual = await this.getValueWithRetry();
    const expectedStr = String(expected);
    if (actual !== expectedStr) {
      throw new Error(`Expected value to be "${expectedStr}" but got "${actual}"`);
    }
    return this;
  }

  /**
   * Fluent API: Assert select/radiogroup has specific selected text
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("country").shouldHaveSelected("United States");
   */
  async shouldHaveSelected(expected: string): Promise<Locator> {
    const actual = await this.getSelectedWithRetry();
    if (actual !== expected) {
      throw new Error(`Expected selected value to be "${expected}" but got "${actual}"`);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is enabled (not disabled)
   * Returns this locator for chaining
   * @example
   * await ctx.getByText("Submit").shouldBeEnabled();
   */
  async shouldBeEnabled(): Promise<Locator> {
    const disabled = await this.getDisabledWithRetry();
    if (disabled) {
      throw new Error('Expected widget to be enabled but it was disabled');
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is disabled
   * Returns this locator for chaining
   * @example
   * await ctx.getByText("Submit").shouldBeDisabled();
   */
  async shouldBeDisabled(): Promise<Locator> {
    const disabled = await this.getDisabledWithRetry();
    if (!disabled) {
      throw new Error('Expected widget to be disabled but it was enabled');
    }
    return this;
  }

  /**
   * Fluent API: Assert widget has specific type
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("myWidget").shouldHaveType("button");
   */
  async shouldHaveType(expected: string): Promise<Locator> {
    const actual = await this.getTypeWithRetry();
    if (actual !== expected) {
      throw new Error(`Expected widget type to be "${expected}" but got "${actual}"`);
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is visible
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("modal").shouldBeVisible();
   */
  async shouldBeVisible(): Promise<Locator> {
    const widget = await this.findWithRetry();
    if (!widget) {
      throw new Error('Expected widget to be visible but it was not found');
    }
    return this;
  }

  /**
   * Fluent API: Assert widget is not visible
   * Returns this locator for chaining
   * @example
   * await ctx.getByID("modal").shouldNotBeVisible();
   */
  async shouldNotBeVisible(): Promise<Locator> {
    const widget = await this.findWithRetry();
    if (widget) {
      throw new Error('Expected widget to not be visible but it was found');
    }
    return this;
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
        await new Promise(resolve => setTimeout(resolve, 100));
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
      await new Promise(resolve => setTimeout(resolve, 100));
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
      const response = await this.bridge.send('getWidgetInfo', { widgetId });
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
        const response = await this.bridge.send('getWidgetInfo', { widgetId });
        return response.checked || false;
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 100));
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
      const response = await this.bridge.send('getWidgetInfo', { widgetId });
      return String(response.value || response.text || '');
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    while (Date.now() - startTime < this.withinTimeout) {
      try {
        const widgetId = await this.find();
        if (!widgetId) {
          throw new Error('Widget not found');
        }
        const response = await this.bridge.send('getWidgetInfo', { widgetId });
        return String(response.value || response.text || '');
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 100));
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
      const response = await this.bridge.send('getWidgetInfo', { widgetId });
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
        const response = await this.bridge.send('getWidgetInfo', { widgetId });
        return response.selected || '';
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 100));
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
      const response = await this.bridge.send('getWidgetInfo', { widgetId });
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
        const response = await this.bridge.send('getWidgetInfo', { widgetId });
        return response.disabled || false;
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 100));
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
      const response = await this.bridge.send('getWidgetInfo', { widgetId });
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
        const response = await this.bridge.send('getWidgetInfo', { widgetId });
        return response.type || '';
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    throw lastError || new Error('Failed to get widget type');
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
    if (actualText !== expectedText) {
      throw new Error(`Expected text to be "${expectedText}" but got "${actualText}"`);
    }
  }

  async toContainText(expectedText: string): Promise<void> {
    const actualText = await this.locator.getText();
    if (!actualText.includes(expectedText)) {
      throw new Error(`Expected text to contain "${expectedText}" but got "${actualText}"`);
    }
  }

  async toNotHaveText(expectedText: string): Promise<void> {
    const actualText = await this.locator.getText();
    if (actualText === expectedText) {
      throw new Error(`Expected text to not be "${expectedText}" but it was`);
    }
  }

  async toNotContainText(expectedText: string): Promise<void> {
    const actualText = await this.locator.getText();
    if (actualText.includes(expectedText)) {
      throw new Error(`Expected text to not contain "${expectedText}" but got "${actualText}"`);
    }
  }

  async toMatchText(pattern: RegExp): Promise<void> {
    const actualText = await this.locator.getText();
    if (!pattern.test(actualText)) {
      throw new Error(`Expected text to match ${pattern} but got "${actualText}"`);
    }
  }

  async toNotMatchText(pattern: RegExp): Promise<void> {
    const actualText = await this.locator.getText();
    if (pattern.test(actualText)) {
      throw new Error(`Expected text to not match ${pattern} but got "${actualText}"`);
    }
  }

  async toBeVisible(): Promise<void> {
    const widget = await this.locator.find();
    if (!widget) {
      throw new Error('Expected widget to be visible but it was not found');
    }
  }

  async toNotBeVisible(): Promise<void> {
    const widget = await this.locator.find();
    if (widget) {
      throw new Error('Expected widget to not be visible but it was found');
    }
  }

  async toExist(): Promise<void> {
    const widgets = await this.locator.findAll();
    if (widgets.length === 0) {
      throw new Error('Expected widget to exist but none were found');
    }
  }

  async toNotExist(): Promise<void> {
    const widgets = await this.locator.findAll();
    if (widgets.length > 0) {
      throw new Error('Expected widget to not exist but found ' + widgets.length);
    }
  }

  async toHaveCount(count: number): Promise<void> {
    const widgets = await this.locator.findAll();
    if (widgets.length !== count) {
      throw new Error(`Expected ${count} widgets but found ${widgets.length}`);
    }
  }

  async toHaveCountGreaterThan(count: number): Promise<void> {
    const widgets = await this.locator.findAll();
    if (widgets.length <= count) {
      throw new Error(`Expected more than ${count} widgets but found ${widgets.length}`);
    }
  }

  async toHaveCountLessThan(count: number): Promise<void> {
    const widgets = await this.locator.findAll();
    if (widgets.length >= count) {
      throw new Error(`Expected less than ${count} widgets but found ${widgets.length}`);
    }
  }
}

/**
 * Main test context for interacting with Tsyne apps
 */
export class TestContext {
  constructor(private bridge: BridgeConnection) {}

  /**
   * Get a locator for buttons with specific text
   */
  getByText(text: string): Locator {
    return new Locator(this.bridge, text, 'text');
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
  getByType(type: 'button' | 'label' | 'entry'): Locator {
    return new Locator(this.bridge, type, 'type');
  }

  /**
   * Get a locator for a widget by ID (like Selenium's findElement)
   * Returns a locator that finds a single widget with the specified ID
   *
   * @example
   * const submitButton = ctx.getByID('submit-btn');
   * await submitButton.click();
   * await ctx.expect(submitButton).toBeVisible();
   */
  getByID(id: string): Locator {
    return new Locator(this.bridge, id, 'id');
  }

  /**
   * Get all widgets in the application
   */
  async getAllWidgets(): Promise<WidgetInfo[]> {
    const result = await this.bridge.send('getAllWidgets', {});
    return result.widgets || [];
  }

  /**
   * Wait for a specified time
   */
  async wait(ms: number): Promise<void> {
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

    throw new Error(`Timeout waiting for ${description} after ${timeout}ms`);
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
    await this.bridge.send('clickWidget', { widgetId });
  }

  /**
   * Get table data for a table widget
   * Returns the raw table data (array of rows)
   */
  async getTableData(tableId: string): Promise<string[][]> {
    const result = await this.bridge.send('getTableData', { id: tableId });
    return result.data || [];
  }

  /**
   * Get list data for a list widget
   * Returns the list items as an array
   */
  async getListData(listId: string): Promise<string[]> {
    const result = await this.bridge.send('getListData', { id: listId });
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

    if (!hasIt) {
      throw new Error(`Expected to find text "${text}" on page but it was not found`);
    }
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
    await this.bridge.send('scrollCanvas', { windowId, deltaX, deltaY });
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
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('dragCanvas', { windowId, fromX, fromY, deltaX, deltaY });
  }

  /**
   * Focus the next focusable widget (tab navigation)
   * Uses Fyne's test.FocusNext in test mode
   * @example
   * await ctx.focusNext(); // Simulate pressing Tab
   */
  async focusNext(): Promise<void> {
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('focusNext', { windowId });
  }

  /**
   * Focus the previous focusable widget (shift-tab navigation)
   * Uses Fyne's test.FocusPrevious in test mode
   * @example
   * await ctx.focusPrevious(); // Simulate pressing Shift+Tab
   */
  async focusPrevious(): Promise<void> {
    const windowId = 'window_1'; // TODO: Make this dynamic
    await this.bridge.send('focusPrevious', { windowId });
  }
}
