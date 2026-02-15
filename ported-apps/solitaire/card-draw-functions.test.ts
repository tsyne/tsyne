/**
 * Card Draw Functions Tests
 *
 * Tests for the auto-generated CVG card drawing functions.
 * Replaces the old card-image-provider.test.ts.
 */

import { CARD_DRAW_MAP, CARD_VB_WIDTH, CARD_VB_HEIGHT } from './solitaire-cards-cvg';

describe('Card Draw Functions', () => {
  test('should have all 53 entries (52 cards + back)', () => {
    const keys = Object.keys(CARD_DRAW_MAP);
    expect(keys.length).toBe(53);
  });

  test('should have the back card', () => {
    expect(CARD_DRAW_MAP['back.svg']).toBeDefined();
    expect(typeof CARD_DRAW_MAP['back.svg']).toBe('function');
  });

  test('should have all 4 aces', () => {
    expect(CARD_DRAW_MAP['AC.svg']).toBeDefined();
    expect(CARD_DRAW_MAP['AD.svg']).toBeDefined();
    expect(CARD_DRAW_MAP['AH.svg']).toBeDefined();
    expect(CARD_DRAW_MAP['AS.svg']).toBeDefined();
  });

  test('should have all 4 kings', () => {
    expect(CARD_DRAW_MAP['KC.svg']).toBeDefined();
    expect(CARD_DRAW_MAP['KD.svg']).toBeDefined();
    expect(CARD_DRAW_MAP['KH.svg']).toBeDefined();
    expect(CARD_DRAW_MAP['KS.svg']).toBeDefined();
  });

  test('should have valid viewBox dimensions', () => {
    expect(CARD_VB_WIDTH).toBeCloseTo(167.087, 2);
    expect(CARD_VB_HEIGHT).toBeCloseTo(242.667, 2);
  });

  test('should have all suits for all values', () => {
    const suits = ['C', 'D', 'H', 'S'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    for (const v of values) {
      for (const s of suits) {
        const key = `${v}${s}.svg`;
        expect(CARD_DRAW_MAP[key]).toBeDefined();
        expect(typeof CARD_DRAW_MAP[key]).toBe('function');
      }
    }
  });

  test('each function should be callable', () => {
    // Create a minimal mock CvgContext that just tracks calls
    const calls: string[] = [];
    const mockCtx = new Proxy({}, {
      get: (_target, prop) => {
        return (...args: any[]) => {
          calls.push(String(prop));
          // If the last arg is a function (callback for s.g()), call it
          const lastArg = args[args.length - 1];
          if (typeof lastArg === 'function') {
            lastArg();
          }
        };
      }
    });

    // Call a few representative cards
    const samples = ['AH.svg', 'KS.svg', 'back.svg', '5D.svg'];
    for (const key of samples) {
      calls.length = 0;
      CARD_DRAW_MAP[key](mockCtx as any);
      // Should have made at least one drawing call
      expect(calls.length).toBeGreaterThan(0);
    }
  });
});
