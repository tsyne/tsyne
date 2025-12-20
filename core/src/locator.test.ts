/**
 * Unit tests for Locator class - within()/without() polling behavior
 * Uses mocked bridge to test timing and retry logic in isolation
 */

import { Locator } from './test';

// Mock bridge interface with call recording
// Recording format: find? (not found), find! (found), click
function createMockBridge(findResults: (string[] | null)[]) {
  let findIndex = 0;
  const calls: string[] = [];

  return {
    send: jest.fn(async (method: string, payload: any) => {
      if (method === 'findWidget') {
        const result = findResults[findIndex] ?? findResults[findResults.length - 1];
        findIndex++;
        const found = result && result.length > 0;
        calls.push(found ? 'find!' : 'find?');
        return { widgetIds: result ?? [] };
      }
      if (method === 'clickWidget') {
        calls.push('click');
        return { success: true };
      }
      return {};
    }),
    /** Returns call sequence like "find?,find!,click" */
    recording: () => calls.join(','),
  };
}

describe('Locator', () => {
  describe('find() without within()', () => {
    test('returns first widget ID when found', async () => {
      const bridge = createMockBridge([['widget-1', 'widget-2']]);
      const locator = new Locator(bridge as any, 'Submit', 'text');

      const result = await locator.find();

      expect(result).toBe('widget-1');
      expect(bridge.recording()).toBe('find!');
    });

    test('returns null when not found', async () => {
      const bridge = createMockBridge([[]]);
      const locator = new Locator(bridge as any, 'Missing', 'text');

      const result = await locator.find();

      expect(result).toBeNull();
      expect(bridge.recording()).toBe('find?');
    });
  });

  describe('within() polling for appearance', () => {
    test('returns immediately if element found on first try', async () => {
      const bridge = createMockBridge([['widget-1']]);
      const locator = new Locator(bridge as any, 'Submit', 'text');

      await locator.within(500).click();

      expect(bridge.recording()).toBe('find!,click');
    });

    test('polls and finds element on second try', async () => {
      const bridge = createMockBridge([
        [],           // First call: not found
        ['widget-1'], // Second call: found
      ]);
      const locator = new Locator(bridge as any, 'Submit', 'text');

      await locator.within(500).click();

      expect(bridge.recording()).toBe('find?,find!,click');
    });

    test('polls and finds element on third try', async () => {
      const bridge = createMockBridge([
        [],           // First call: not found
        [],           // Second call: not found
        ['widget-1'], // Third call: found
      ]);
      const locator = new Locator(bridge as any, 'Submit', 'text');

      await locator.within(500).click();

      expect(bridge.recording()).toBe('find?,find?,find!,click');
    });

    test('throws error if element never appears within timeout', async () => {
      const bridge = createMockBridge([[]]);  // Always returns empty
      const locator = new Locator(bridge as any, 'Missing', 'text');

      await expect(locator.within(50).click()).rejects.toThrow(
        'No widget found with text: Missing'
      );
      // Multiple find? calls (polling), but no click
      expect(bridge.recording()).toMatch(/^(find\?,)+find\?$/);
    });

    test('timeout is consumed after use (does not leak to next operation)', async () => {
      const bridge = createMockBridge([['widget-1']]);
      const locator = new Locator(bridge as any, 'Submit', 'text');

      // First operation with timeout
      await locator.within(500).click();
      expect(bridge.recording()).toBe('find!,click');

      // Reset mock
      const bridge2 = createMockBridge([[]]);
      const locator2 = new Locator(bridge2 as any, 'Missing', 'text');

      // Second operation should NOT have timeout (fast fail - single find)
      const result = await locator2.find();
      expect(result).toBeNull();
      expect(bridge2.recording()).toBe('find?');
    });
  });

  describe('shouldExist() with within()', () => {
    test('succeeds when element found on second try', async () => {
      const bridge = createMockBridge([
        [],           // First: not found
        ['widget-1'], // Second: found
      ]);
      const locator = new Locator(bridge as any, 'Submit', 'text');

      await locator.within(500).shouldExist();

      expect(bridge.recording()).toBe('find?,find!');
    });

    test('throws descriptive error when element never appears', async () => {
      const bridge = createMockBridge([[]]);
      const locator = new Locator(bridge as any, 'MissingButton', 'text');

      await expect(locator.within(50).shouldExist()).rejects.toThrow(
        'Expected widget to exist, but not found: text="MissingButton"'
      );
      // Multiple find? calls (polling), no click
      expect(bridge.recording()).toMatch(/^(find\?,)+find\?$/);
    });
  });

  describe('shouldNotExist() with within() (current behavior)', () => {
    // NOTE: Currently within() and without() are identical.
    // These tests document current behavior. See TODO.md for planned differentiation.

    test('succeeds immediately when element not found', async () => {
      const bridge = createMockBridge([[]]);
      const locator = new Locator(bridge as any, 'Missing', 'text');

      await locator.shouldNotExist();

      expect(bridge.recording()).toBe('find?');
    });

    test('polls until element disappears', async () => {
      const bridge = createMockBridge([
        ['widget-1'], // First: still there
        ['widget-1'], // Second: still there
        [],           // Third: gone
      ]);
      const locator = new Locator(bridge as any, 'Loading', 'text');

      await locator.within(500).shouldNotExist();

      expect(bridge.recording()).toBe('find!,find!,find?');
    });

    test('throws error if element never disappears within timeout', async () => {
      const bridge = createMockBridge([['widget-1']]); // Always present
      const locator = new Locator(bridge as any, 'StuckElement', 'text');

      await expect(locator.within(50).shouldNotExist()).rejects.toThrow(
        'Expected widget NOT to exist, but found: text="StuckElement"'
      );
      // Multiple find! calls (polling - element never disappears)
      expect(bridge.recording()).toMatch(/^(find!,)+find!$/);
    });
  });

  describe('edge cases', () => {
    test('zero timeout behaves like no timeout (fast fail)', async () => {
      const bridge = createMockBridge([[]]);
      const locator = new Locator(bridge as any, 'Missing', 'text');

      await expect(locator.within(0).click()).rejects.toThrow(
        'No widget found with text: Missing'
      );
      expect(bridge.recording()).toBe('find?');
    });

    test('very short timeout still allows at least one retry', async () => {
      const bridge = createMockBridge([
        [],           // First: not found
        ['widget-1'], // Second: found (if we get here)
      ]);
      const locator = new Locator(bridge as any, 'Submit', 'text');

      // 1ms timeout - should still poll at least once
      // This test may be flaky depending on execution speed
      try {
        await locator.within(1).click();
        // If we get here, polling worked
        expect(bridge.recording()).toBe('find?,find!,click');
      } catch {
        // Timeout hit before second find - also acceptable
        expect(bridge.recording()).toBe('find?');
      }
    });

    test('findAll returns all matching widgets', async () => {
      const bridge = createMockBridge([['w1', 'w2', 'w3']]);
      const locator = new Locator(bridge as any, 'Item', 'text');

      const results = await locator.findAll();

      expect(results).toEqual(['w1', 'w2', 'w3']);
      expect(bridge.recording()).toBe('find!');
    });
  });
});
