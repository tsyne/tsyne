import { BridgeConnection } from './bridge';

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
 */
export class Locator {
  constructor(
    private bridge: BridgeConnection,
    private selector: string,
    private selectorType: 'text' | 'exactText' | 'type'
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
   */
  async click(): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    await this.bridge.send('clickWidget', { widgetId });
  }

  /**
   * Type text into the first widget matching this locator
   */
  async type(text: string): Promise<void> {
    const widgetId = await this.find();
    if (!widgetId) {
      throw new Error(`No widget found with ${this.selectorType}: ${this.selector}`);
    }
    await this.bridge.send('typeText', { widgetId, text });
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
}

/**
 * Assertion helpers for testing
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

  async toBeVisible(): Promise<void> {
    const widget = await this.locator.find();
    if (!widget) {
      throw new Error('Expected widget to be visible but it was not found');
    }
  }

  async toExist(): Promise<void> {
    const widgets = await this.locator.findAll();
    if (widgets.length === 0) {
      throw new Error('Expected widget to exist but none were found');
    }
  }

  async toHaveCount(count: number): Promise<void> {
    const widgets = await this.locator.findAll();
    if (widgets.length !== count) {
      throw new Error(`Expected ${count} widgets but found ${widgets.length}`);
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
}
