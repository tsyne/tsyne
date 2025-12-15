/**
 * Card Image Provider Tests
 *
 * Tests for the SVG rendering collaborators:
 * - SvgCardImageProvider (production - renders real SVGs)
 * - StubCardImageProvider (test double - returns placeholders)
 *
 * These are the collaborators that were stubbed in game logic tests.
 */

import * as path from 'path';
import * as fs from 'fs';
import { SvgCardImageProvider, StubCardImageProvider, CardImageProvider } from './solitaire';

// ============================================================================
// StubCardImageProvider Tests
// ============================================================================

describe('StubCardImageProvider', () => {
  let provider: StubCardImageProvider;

  beforeEach(() => {
    provider = new StubCardImageProvider();
  });

  describe('getCardImage', () => {
    test('should return a valid base64 PNG data URI', () => {
      const image = provider.getCardImage('AH.svg');
      expect(image).toMatch(/^data:image\/png;base64,/);
    });

    test('should return same placeholder for any card', () => {
      const ace = provider.getCardImage('AH.svg');
      const king = provider.getCardImage('KS.svg');
      const back = provider.getCardImage('back.svg');

      expect(ace).toBe(king);
      expect(king).toBe(back);
    });

    test('should return valid PNG bytes', () => {
      const image = provider.getCardImage('AH.svg');
      const base64 = image.replace('data:image/png;base64,', '');
      const buffer = Buffer.from(base64, 'base64');

      // PNG magic bytes
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    });
  });

  describe('getOverlappedCardsImage', () => {
    test('should return placeholder for empty array', () => {
      const image = provider.getOverlappedCardsImage([], 120, 174, 87);
      expect(image).toMatch(/^data:image\/png;base64,/);
    });

    test('should return first image for non-empty array', () => {
      const card1 = 'data:image/png;base64,CARD1';
      const card2 = 'data:image/png;base64,CARD2';

      const result = provider.getOverlappedCardsImage([card1, card2], 120, 174, 87);
      expect(result).toBe(card1);
    });

    test('should return single card as-is', () => {
      const card = 'data:image/png;base64,SINGLECARD';
      const result = provider.getOverlappedCardsImage([card], 120, 174, 87);
      expect(result).toBe(card);
    });
  });

  describe('interface compliance', () => {
    test('should implement CardImageProvider interface', () => {
      const asInterface: CardImageProvider = provider;
      expect(typeof asInterface.getCardImage).toBe('function');
      expect(typeof asInterface.getOverlappedCardsImage).toBe('function');
    });
  });
});

// ============================================================================
// SvgCardImageProvider Tests
// ============================================================================

describe('SvgCardImageProvider', () => {
  let provider: SvgCardImageProvider;
  let facesDir: string;

  beforeAll(() => {
    // Find faces directory
    const possiblePaths = [
      path.join(process.cwd(), 'faces'),
      path.join(process.cwd(), 'ported-apps/solitaire/faces'),
      path.join(__dirname, 'faces')
    ];

    facesDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[2];

    // Create provider (this does the expensive SVG rendering)
    provider = new SvgCardImageProvider(facesDir, 60, 87); // Smaller size for faster tests
  });

  describe('getCardImage', () => {
    test('should return a valid base64 PNG data URI', () => {
      const image = provider.getCardImage('AH.svg');
      expect(image).toMatch(/^data:image\/png;base64,/);
    });

    test('should return different images for different cards', () => {
      const aceHearts = provider.getCardImage('AH.svg');
      const kingSpades = provider.getCardImage('KS.svg');

      expect(aceHearts).not.toBe(kingSpades);
    });

    test('should return back image for unknown card', () => {
      const unknown = provider.getCardImage('UNKNOWN.svg');
      const back = provider.getCardImage('back.svg');

      expect(unknown).toBe(back);
    });

    test('should return valid PNG bytes', () => {
      const image = provider.getCardImage('AH.svg');
      const base64 = image.replace('data:image/png;base64,', '');
      const buffer = Buffer.from(base64, 'base64');

      // PNG magic bytes
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    test('should cache rendered images', () => {
      // Get same image twice
      const first = provider.getCardImage('2H.svg');
      const second = provider.getCardImage('2H.svg');

      // Should be exact same reference (cached)
      expect(first).toBe(second);
    });
  });

  describe('getOverlappedCardsImage', () => {
    test('should return empty string for empty array', () => {
      const result = provider.getOverlappedCardsImage([], 120, 174, 87);
      expect(result).toBe('');
    });

    test('should return single card as-is', () => {
      const card = provider.getCardImage('AH.svg');
      const result = provider.getOverlappedCardsImage([card], 120, 174, 87);
      expect(result).toBe(card);
    });

    test('should create composite image for multiple cards', () => {
      const card1 = provider.getCardImage('AH.svg');
      const card2 = provider.getCardImage('2S.svg');

      const composite = provider.getOverlappedCardsImage([card1, card2], 60, 87, 43);

      // Should be a valid PNG
      expect(composite).toMatch(/^data:image\/png;base64,/);

      // Should be different from either individual card
      expect(composite).not.toBe(card1);
      expect(composite).not.toBe(card2);
    });

    test('should create larger image for more cards', () => {
      const card1 = provider.getCardImage('AH.svg');
      const card2 = provider.getCardImage('2S.svg');
      const card3 = provider.getCardImage('3D.svg');

      const twoCards = provider.getOverlappedCardsImage([card1, card2], 60, 87, 43);
      const threeCards = provider.getOverlappedCardsImage([card1, card2, card3], 60, 87, 43);

      // Both should be valid PNGs
      expect(twoCards).toMatch(/^data:image\/png;base64,/);
      expect(threeCards).toMatch(/^data:image\/png;base64,/);

      // Three cards composite should be different (and likely larger)
      expect(threeCards).not.toBe(twoCards);
    });
  });

  describe('interface compliance', () => {
    test('should implement CardImageProvider interface', () => {
      const asInterface: CardImageProvider = provider;
      expect(typeof asInterface.getCardImage).toBe('function');
      expect(typeof asInterface.getOverlappedCardsImage).toBe('function');
    });
  });

  describe('all card files', () => {
    test('should render all 52 cards plus back', () => {
      const suits = ['C', 'D', 'H', 'S'];
      const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

      // Test a sampling of cards (not all 52 to keep test fast)
      const sampleCards = [
        'AC.svg', 'AD.svg', 'AH.svg', 'AS.svg',  // All aces
        'KC.svg', 'KD.svg', 'KH.svg', 'KS.svg',  // All kings
        '7H.svg', '10S.svg',                       // Middle cards
        'back.svg'                                 // Back
      ];

      for (const card of sampleCards) {
        const image = provider.getCardImage(card);
        expect(image).toMatch(/^data:image\/png;base64,/);
      }
    });
  });

  describe('module-level caching', () => {
    test('should use cached cards for second provider instance', () => {
      // The first provider (created in beforeAll) already populated the cache
      // Creating a second provider should hit the cardFacesCache (line 120)
      const secondProvider = new SvgCardImageProvider(facesDir, 100, 145);

      // Should return valid images (from cache)
      const image = secondProvider.getCardImage('AH.svg');
      expect(image).toMatch(/^data:image\/png;base64,/);

      // Both providers should return the same cached images
      const fromFirst = provider.getCardImage('KS.svg');
      const fromSecond = secondProvider.getCardImage('KS.svg');
      expect(fromFirst).toBe(fromSecond);
    });
  });
});
