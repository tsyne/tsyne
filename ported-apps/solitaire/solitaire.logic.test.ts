/**
 * Solitaire Game Logic Tests
 *
 * Comprehensive tests for all game logic with fixed card setups
 * to ensure deterministic, repeatable results.
 */

import { Game, Card, Suit, SuitColor } from './solitaire';

// ============================================================================
// Card Class Tests
// ============================================================================

describe('Card', () => {
  describe('constructor', () => {
    test('should create card with valid value and suit', () => {
      const card = new Card(5, Suit.Hearts);
      expect(card.value).toBe(5);
      expect(card.suit).toBe(Suit.Hearts);
      expect(card.faceUp).toBe(false);
    });

    test('should create card with faceUp parameter', () => {
      const card = new Card(10, Suit.Spades, true);
      expect(card.faceUp).toBe(true);
    });

    test('should reject value below 1', () => {
      expect(() => new Card(0, Suit.Hearts)).toThrow('Card value must be between 1 and 13');
    });

    test('should reject value above 13', () => {
      expect(() => new Card(14, Suit.Hearts)).toThrow('Card value must be between 1 and 13');
    });
  });

  describe('color', () => {
    test('should return Black for Clubs', () => {
      expect(new Card(1, Suit.Clubs).color()).toBe(SuitColor.Black);
    });

    test('should return Black for Spades', () => {
      expect(new Card(1, Suit.Spades).color()).toBe(SuitColor.Black);
    });

    test('should return Red for Hearts', () => {
      expect(new Card(1, Suit.Hearts).color()).toBe(SuitColor.Red);
    });

    test('should return Red for Diamonds', () => {
      expect(new Card(1, Suit.Diamonds).color()).toBe(SuitColor.Red);
    });
  });

  describe('suitSymbol', () => {
    test('should return ♣ for Clubs', () => {
      expect(new Card(1, Suit.Clubs).suitSymbol()).toBe('♣');
    });

    test('should return ♦ for Diamonds', () => {
      expect(new Card(1, Suit.Diamonds).suitSymbol()).toBe('♦');
    });

    test('should return ♥ for Hearts', () => {
      expect(new Card(1, Suit.Hearts).suitSymbol()).toBe('♥');
    });

    test('should return ♠ for Spades', () => {
      expect(new Card(1, Suit.Spades).suitSymbol()).toBe('♠');
    });
  });

  describe('valueName', () => {
    test('should return A for Ace', () => {
      expect(new Card(1, Suit.Hearts).valueName()).toBe('A');
    });

    test('should return number string for 2-10', () => {
      expect(new Card(2, Suit.Hearts).valueName()).toBe('2');
      expect(new Card(5, Suit.Hearts).valueName()).toBe('5');
      expect(new Card(10, Suit.Hearts).valueName()).toBe('10');
    });

    test('should return J for Jack', () => {
      expect(new Card(11, Suit.Hearts).valueName()).toBe('J');
    });

    test('should return Q for Queen', () => {
      expect(new Card(12, Suit.Hearts).valueName()).toBe('Q');
    });

    test('should return K for King', () => {
      expect(new Card(13, Suit.Hearts).valueName()).toBe('K');
    });
  });

  describe('toString', () => {
    test('should return [??] for face-down card', () => {
      const card = new Card(5, Suit.Hearts, false);
      expect(card.toString()).toBe('[??]');
    });

    test('should return value and suit symbol for face-up card', () => {
      expect(new Card(1, Suit.Hearts, true).toString()).toBe('A♥');
      expect(new Card(10, Suit.Spades, true).toString()).toBe('10♠');
      expect(new Card(13, Suit.Diamonds, true).toString()).toBe('K♦');
    });
  });

  describe('imageFilename', () => {
    test('should return back.svg for face-down card', () => {
      const card = new Card(5, Suit.Hearts, false);
      expect(card.imageFilename()).toBe('back.svg');
    });

    test('should return correct filename for face-up card', () => {
      expect(new Card(1, Suit.Hearts, true).imageFilename()).toBe('AH.svg');
      expect(new Card(10, Suit.Spades, true).imageFilename()).toBe('10S.svg');
      expect(new Card(13, Suit.Clubs, true).imageFilename()).toBe('KC.svg');
      expect(new Card(12, Suit.Diamonds, true).imageFilename()).toBe('QD.svg');
    });
  });

  describe('turnFaceUp/turnFaceDown', () => {
    test('should turn card face up', () => {
      const card = new Card(5, Suit.Hearts, false);
      card.turnFaceUp();
      expect(card.faceUp).toBe(true);
    });

    test('should turn card face down', () => {
      const card = new Card(5, Suit.Hearts, true);
      card.turnFaceDown();
      expect(card.faceUp).toBe(false);
    });
  });
});

// ============================================================================
// Game Logic Tests
// ============================================================================

describe('Solitaire Game Logic', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game(true); // Skip random initialization
  });

  describe('Foundation (Build) Moves', () => {
    test('should place Ace on empty foundation', () => {
      // Setup: Ace of Hearts in draw3
      const aceHearts = new Card(1, Suit.Hearts, true);
      game.setupFixedState({
        draw3: aceHearts
      });

      // Act: Move draw3 to foundation 0
      const result = game.moveDrawToBuild(0);

      // Assert
      expect(result).toBe(true);
      const buildCards = game.getBuildCards(0);
      expect(buildCards.length).toBe(1);
      expect(buildCards[0].value).toBe(1);
      expect(buildCards[0].suit).toBe(Suit.Hearts);
    });

    test('should NOT place non-Ace on empty foundation', () => {
      // Setup: 2 of Hearts in draw3
      const twoHearts = new Card(2, Suit.Hearts, true);
      game.setupFixedState({
        draw3: twoHearts
      });

      // Act: Try to move draw3 to empty foundation 0
      const result = game.moveDrawToBuild(0);

      // Assert
      expect(result).toBe(false);
      const buildCards = game.getBuildCards(0);
      expect(buildCards.length).toBe(0);
    });

    test('should place 2 on Ace of same suit', () => {
      // Setup: Ace in foundation, 2 in draw3
      const aceHearts = new Card(1, Suit.Hearts, true);
      const twoHearts = new Card(2, Suit.Hearts, true);
      game.setupFixedState({
        builds: [[aceHearts]],
        draw3: twoHearts
      });

      // Act
      const result = game.moveDrawToBuild(0);

      // Assert
      expect(result).toBe(true);
      const buildCards = game.getBuildCards(0);
      expect(buildCards.length).toBe(2);
      expect(buildCards[1].value).toBe(2);
    });

    test('should NOT place card of different suit on foundation', () => {
      // Setup: Ace of Hearts in foundation, 2 of Clubs in draw3
      const aceHearts = new Card(1, Suit.Hearts, true);
      const twoClubs = new Card(2, Suit.Clubs, true);
      game.setupFixedState({
        builds: [[aceHearts]],
        draw3: twoClubs
      });

      // Act
      const result = game.moveDrawToBuild(0);

      // Assert
      expect(result).toBe(false);
    });

    test('should NOT skip values in foundation', () => {
      // Setup: Ace in foundation, 3 in draw3 (skipping 2)
      const aceHearts = new Card(1, Suit.Hearts, true);
      const threeHearts = new Card(3, Suit.Hearts, true);
      game.setupFixedState({
        builds: [[aceHearts]],
        draw3: threeHearts
      });

      // Act
      const result = game.moveDrawToBuild(0);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Tableau Stack Moves', () => {
    test('should place King on empty stack', () => {
      // Setup: King of Spades in draw3
      const kingSpades = new Card(13, Suit.Spades, true);
      game.setupFixedState({
        draw3: kingSpades
      });

      // Act
      const result = game.moveDrawToStack(0);

      // Assert
      expect(result).toBe(true);
      const stackCards = game.getStackCards(0);
      expect(stackCards.length).toBe(1);
      expect(stackCards[0].value).toBe(13);
    });

    test('should NOT place non-King on empty stack', () => {
      // Setup: Queen in draw3
      const queenHearts = new Card(12, Suit.Hearts, true);
      game.setupFixedState({
        draw3: queenHearts
      });

      // Act
      const result = game.moveDrawToStack(0);

      // Assert
      expect(result).toBe(false);
    });

    test('should place red card on black card (descending)', () => {
      // Setup: Black Queen in stack, Red Jack in draw3
      const queenSpades = new Card(12, Suit.Spades, true);
      const jackHearts = new Card(11, Suit.Hearts, true);
      game.setupFixedState({
        stacks: [[queenSpades]],
        draw3: jackHearts
      });

      // Act
      const result = game.moveDrawToStack(0);

      // Assert
      expect(result).toBe(true);
      const stackCards = game.getStackCards(0);
      expect(stackCards.length).toBe(2);
      expect(stackCards[1].value).toBe(11);
    });

    test('should place black card on red card (descending)', () => {
      // Setup: Red Queen in stack, Black Jack in draw3
      const queenHearts = new Card(12, Suit.Hearts, true);
      const jackClubs = new Card(11, Suit.Clubs, true);
      game.setupFixedState({
        stacks: [[queenHearts]],
        draw3: jackClubs
      });

      // Act
      const result = game.moveDrawToStack(0);

      // Assert
      expect(result).toBe(true);
      const stackCards = game.getStackCards(0);
      expect(stackCards.length).toBe(2);
    });

    test('should NOT place same color on stack', () => {
      // Setup: Red Queen, Red Jack
      const queenHearts = new Card(12, Suit.Hearts, true);
      const jackDiamonds = new Card(11, Suit.Diamonds, true);
      game.setupFixedState({
        stacks: [[queenHearts]],
        draw3: jackDiamonds
      });

      // Act
      const result = game.moveDrawToStack(0);

      // Assert
      expect(result).toBe(false);
    });

    test('should NOT place higher value on stack', () => {
      // Setup: Jack in stack, Queen in draw3
      const jackHearts = new Card(11, Suit.Hearts, true);
      const queenSpades = new Card(12, Suit.Spades, true);
      game.setupFixedState({
        stacks: [[jackHearts]],
        draw3: queenSpades
      });

      // Act
      const result = game.moveDrawToStack(0);

      // Assert
      expect(result).toBe(false);
    });

    test('should NOT skip values in stack', () => {
      // Setup: Queen in stack, 10 in draw3 (skipping Jack)
      const queenSpades = new Card(12, Suit.Spades, true);
      const tenHearts = new Card(10, Suit.Hearts, true);
      game.setupFixedState({
        stacks: [[queenSpades]],
        draw3: tenHearts
      });

      // Act
      const result = game.moveDrawToStack(0);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Draw Pile Mechanics', () => {
    test('should draw 3 cards from hand', () => {
      // Setup: 5 cards in hand
      const cards = [
        new Card(5, Suit.Hearts),
        new Card(4, Suit.Clubs),
        new Card(3, Suit.Diamonds),
        new Card(2, Suit.Spades),
        new Card(1, Suit.Hearts)
      ];
      game.setupFixedState({ handCards: cards });

      // Act
      game.drawThree();

      // Assert
      const draws = game.getDrawCards();
      expect(draws.draw3?.value).toBe(1); // Last card in hand (top of stack)
      expect(draws.draw2?.value).toBe(2);
      expect(draws.draw1?.value).toBe(3);
      expect(game.getHandCount()).toBe(2);
    });

    test('should draw 2 cards when only 2 left in hand', () => {
      // Setup: 2 cards in hand
      const cards = [
        new Card(2, Suit.Hearts),
        new Card(1, Suit.Clubs)
      ];
      game.setupFixedState({ handCards: cards });

      // Act
      game.drawThree();

      // Assert
      const draws = game.getDrawCards();
      expect(draws.draw3?.value).toBe(1);
      expect(draws.draw2?.value).toBe(2);
      expect(draws.draw1).toBeNull();
      expect(game.getHandCount()).toBe(0);
    });

    test('should shift cards after moving draw3', () => {
      // Setup: Ace in foundation, 3 draw cards (Ace, 2, 3)
      const aceHearts = new Card(1, Suit.Hearts, true);
      const card1 = new Card(4, Suit.Diamonds, true); // draw1
      const card2 = new Card(3, Suit.Spades, true);   // draw2
      const card3 = new Card(2, Suit.Hearts, true);   // draw3 - can go on Ace
      game.setupFixedState({
        builds: [[aceHearts]],
        draw1: card1,
        draw2: card2,
        draw3: card3
      });

      // Act: Move draw3 (2 of Hearts) to foundation 0 (on Ace of Hearts)
      const result = game.moveDrawToBuild(0);
      expect(result).toBe(true); // Verify move succeeded

      // Assert: draw2 should become draw3, draw1 should become draw2
      const draws = game.getDrawCards();
      expect(draws.draw3?.value).toBe(3); // Was draw2 (3 of Spades)
      expect(draws.draw2?.value).toBe(4); // Was draw1 (4 of Diamonds)
      expect(draws.draw1).toBeNull();
    });

    test('should recycle waste pile when hand is empty', () => {
      // Setup: Empty hand, but we'll draw and move cards to create waste
      const cards = [
        new Card(5, Suit.Hearts),
        new Card(4, Suit.Clubs),
        new Card(3, Suit.Diamonds)
      ];
      game.setupFixedState({ handCards: cards });

      // Act: Draw 3 cards
      game.drawThree();
      // Hand is now empty, draws are: 3D, 4C, 5H

      // Draw again - should recycle waste
      game.drawThree();

      // Assert: Should have recycled the waste pile back to hand
      const draws = game.getDrawCards();
      expect(draws.draw3?.value).toBe(5);
      expect(draws.draw2?.value).toBe(4);
      expect(draws.draw1?.value).toBe(3);
    });

    test('should handle draw when both hand and waste are empty', () => {
      // Setup: No cards anywhere - completely empty deck
      game.setupFixedState({
        handCards: [],
        draw1: null,
        draw2: null,
        draw3: null
      });

      // Act: Try to draw from empty deck
      game.drawThree();

      // Assert: Should do nothing, no crash
      const draws = game.getDrawCards();
      expect(draws.draw1).toBeNull();
      expect(draws.draw2).toBeNull();
      expect(draws.draw3).toBeNull();
      expect(game.getHandCount()).toBe(0);
    });
  });

  describe('Stack to Stack Moves', () => {
    test('should move card from one stack to another', () => {
      // Setup: Red Queen in stack 0, Black Jack in stack 1
      const queenHearts = new Card(12, Suit.Hearts, true);
      const jackSpades = new Card(11, Suit.Spades, true);
      game.setupFixedState({
        stacks: [[queenHearts], [jackSpades]]
      });

      // Act: Move Jack to Queen
      const result = game.moveStackToStack(1, 0);

      // Assert
      expect(result).toBe(true);
      const stack0 = game.getStackCards(0);
      const stack1 = game.getStackCards(1);
      expect(stack0.length).toBe(2);
      expect(stack0[1].value).toBe(11);
      expect(stack1.length).toBe(0);
    });

    test('should flip face-down card after moving top card', () => {
      // Setup: Stack with face-down card and face-up card on top
      const hiddenCard = new Card(5, Suit.Hearts, false);
      const topCard = new Card(4, Suit.Spades, true);
      const targetCard = new Card(5, Suit.Hearts, true); // Red card, so black 4 can go on it
      game.setupFixedState({
        stacks: [[hiddenCard, topCard], [targetCard]]
      });

      // Act: Move top card from stack 0 to stack 1
      const result = game.moveStackToStack(0, 1);

      // Assert
      expect(result).toBe(true);
      const stack0 = game.getStackCards(0);
      expect(stack0.length).toBe(1);
      expect(stack0[0].faceUp).toBe(true); // Should be flipped
    });
  });

  describe('Multi-Card Stack Moves', () => {
    test('should move a valid sequence of cards', () => {
      // Setup: Stack 0 has black 9 -> red 8 -> black 7, Stack 1 has black 9
      const black9a = new Card(9, Suit.Spades, true);
      const red8 = new Card(8, Suit.Hearts, true);
      const black7 = new Card(7, Suit.Clubs, true);
      const black9b = new Card(9, Suit.Clubs, true);
      game.setupFixedState({
        stacks: [
          [black9a, red8, black7],
          [black9b]
        ]
      });

      // Act: Move sequence starting at red 8 from stack 0 to stack 1
      const result = game.moveStackSequenceToStack(0, 1, 1); // fromStack, toStack, cardIndex

      // Assert
      expect(result).toBe(true);
      const stack0 = game.getStackCards(0);
      const stack1 = game.getStackCards(1);
      expect(stack0.length).toBe(1); // Only black 9 remains
      expect(stack0[0].value).toBe(9);
      expect(stack1.length).toBe(3); // black 9, red 8, black 7
      expect(stack1[1].value).toBe(8);
      expect(stack1[2].value).toBe(7);
    });

    test('should NOT move sequence if target cannot accept bottom card', () => {
      // Setup: Stack 0 has red 6 -> black 5, Stack 1 has black 8 (same color as 6)
      const red6 = new Card(6, Suit.Hearts, true);
      const black5 = new Card(5, Suit.Clubs, true);
      const black8 = new Card(8, Suit.Spades, true);
      game.setupFixedState({
        stacks: [
          [red6, black5],
          [black8]
        ]
      });

      // Act: Try to move red 6 onto black 8 (wrong color)
      const result = game.moveStackSequenceToStack(0, 1, 0);

      // Assert
      expect(result).toBe(false);
    });

    test('should NOT move sequence with face-down cards', () => {
      // Setup: Stack has face-down card followed by valid sequence
      const faceDown = new Card(8, Suit.Hearts, false);
      const red7 = new Card(7, Suit.Diamonds, true);
      const black6 = new Card(6, Suit.Spades, true);
      const red8 = new Card(8, Suit.Hearts, true);
      game.setupFixedState({
        stacks: [
          [faceDown, red7, black6],
          [red8]
        ]
      });

      // Act: Try to move from face-down card
      const result = game.moveStackSequenceToStack(0, 1, 0);

      // Assert
      expect(result).toBe(false);
    });

    test('should move King sequence to empty stack', () => {
      // Setup: Stack 0 has King -> Queen -> Jack, Stack 1 is empty
      const kingSpades = new Card(13, Suit.Spades, true);
      const queenHearts = new Card(12, Suit.Hearts, true);
      const jackClubs = new Card(11, Suit.Clubs, true);
      game.setupFixedState({
        stacks: [
          [new Card(1, Suit.Diamonds, true), kingSpades, queenHearts, jackClubs],
          []
        ]
      });

      // Act: Move King sequence to empty stack
      const result = game.moveStackSequenceToStack(0, 1, 1); // Start at King

      // Assert
      expect(result).toBe(true);
      const stack0 = game.getStackCards(0);
      const stack1 = game.getStackCards(1);
      expect(stack0.length).toBe(1); // Only Ace remains
      expect(stack1.length).toBe(3); // King, Queen, Jack
      expect(stack1[0].value).toBe(13);
      expect(stack1[1].value).toBe(12);
      expect(stack1[2].value).toBe(11);
    });

    test('should NOT move non-King sequence to empty stack', () => {
      // Setup: Stack 0 has Queen -> Jack, Stack 1 is empty
      const queenHearts = new Card(12, Suit.Hearts, true);
      const jackClubs = new Card(11, Suit.Clubs, true);
      game.setupFixedState({
        stacks: [
          [queenHearts, jackClubs],
          []
        ]
      });

      // Act: Try to move Queen sequence to empty stack
      const result = game.moveStackSequenceToStack(0, 1, 0);

      // Assert
      expect(result).toBe(false);
    });

    test('should flip face-down card after moving sequence', () => {
      // Setup: Stack has face-down card, then sequence
      const faceDown = new Card(10, Suit.Hearts, false);
      const red9 = new Card(9, Suit.Diamonds, true);
      const black8 = new Card(8, Suit.Spades, true);
      const black10 = new Card(10, Suit.Spades, true);
      game.setupFixedState({
        stacks: [
          [faceDown, red9, black8],
          [black10]
        ]
      });

      // Act: Move sequence starting at red 9
      const result = game.moveStackSequenceToStack(0, 1, 1);

      // Assert
      expect(result).toBe(true);
      const stack0 = game.getStackCards(0);
      expect(stack0.length).toBe(1);
      expect(stack0[0].faceUp).toBe(true); // Should be flipped
      expect(stack0[0].value).toBe(10);
    });

    test('should validate sequence is properly ordered', () => {
      // Setup: Stack has a broken sequence (not alternating colors)
      const red7 = new Card(7, Suit.Hearts, true);
      const red6 = new Card(6, Suit.Diamonds, true); // Same color!
      const black5 = new Card(5, Suit.Spades, true);
      const black8 = new Card(8, Suit.Clubs, true);
      game.setupFixedState({
        stacks: [
          [red7, red6, black5],
          [black8]
        ]
      });

      // Act: Try to move broken sequence
      const result = game.moveStackSequenceToStack(0, 1, 0);

      // Assert: Should fail because sequence is invalid
      expect(result).toBe(false);
    });

    test('should reject invalid cardIndex (negative)', () => {
      const blackKing = new Card(13, Suit.Spades, true);
      game.setupFixedState({
        stacks: [[blackKing], []]
      });

      // Act: Try with negative index
      const result = game.moveStackSequenceToStack(0, 1, -1);

      // Assert
      expect(result).toBe(false);
    });

    test('should reject sequence with non-descending values', () => {
      // Setup: Cards with wrong value progression (8 -> 6 instead of 8 -> 7)
      const black8 = new Card(8, Suit.Spades, true);
      const red6 = new Card(6, Suit.Hearts, true); // Skips 7!
      const black9 = new Card(9, Suit.Clubs, true);
      game.setupFixedState({
        stacks: [
          [black8, red6],
          [black9]
        ]
      });

      // Act: Try to move sequence with skipped value
      const result = game.moveStackSequenceToStack(0, 1, 0);

      // Assert: Should fail - values must descend by exactly 1
      expect(result).toBe(false);
    });
  });

  describe('Stack to Foundation Moves', () => {
    test('should move Ace from stack to foundation', () => {
      // Setup: Ace in stack
      const aceHearts = new Card(1, Suit.Hearts, true);
      game.setupFixedState({
        stacks: [[aceHearts]]
      });

      // Act
      const result = game.moveStackToBuild(0, 0);

      // Assert
      expect(result).toBe(true);
      const buildCards = game.getBuildCards(0);
      expect(buildCards.length).toBe(1);
      expect(buildCards[0].value).toBe(1);
    });

    test('should flip face-down card after moving to foundation', () => {
      // Setup: Stack with face-down card and Ace on top
      const hiddenCard = new Card(5, Suit.Hearts, false);
      const aceHearts = new Card(1, Suit.Hearts, true);
      game.setupFixedState({
        stacks: [[hiddenCard, aceHearts]],
        builds: [[]]
      });

      // Act: Move Ace to foundation
      const result = game.moveStackToBuild(0, 0);

      // Assert
      expect(result).toBe(true);
      const stack = game.getStackCards(0);
      expect(stack.length).toBe(1);
      expect(stack[0].faceUp).toBe(true); // Hidden card should be flipped
    });
  });

  describe('Foundation to Stack Moves', () => {
    test('should move card from foundation to stack', () => {
      // Setup: Ace and 2 in foundation, 3 of different color in stack
      const aceHearts = new Card(1, Suit.Hearts, true);
      const twoHearts = new Card(2, Suit.Hearts, true);
      const threeSpades = new Card(3, Suit.Spades, true);
      game.setupFixedState({
        builds: [[aceHearts, twoHearts]],
        stacks: [[threeSpades]]
      });

      // Act: Move 2 from foundation to stack
      const result = game.moveBuildToStack(0, 0);

      // Assert
      expect(result).toBe(true);
      const buildCards = game.getBuildCards(0);
      const stackCards = game.getStackCards(0);
      expect(buildCards.length).toBe(1);
      expect(stackCards.length).toBe(2);
      expect(stackCards[1].value).toBe(2);
    });
  });

  describe('Win Condition', () => {
    test('should detect win when all foundations have 13 cards', () => {
      // Setup: All foundations complete
      const buildClubs: Card[] = [];
      const buildDiamonds: Card[] = [];
      const buildHearts: Card[] = [];
      const buildSpades: Card[] = [];

      for (let i = 1; i <= 13; i++) {
        buildClubs.push(new Card(i, Suit.Clubs, true));
        buildDiamonds.push(new Card(i, Suit.Diamonds, true));
        buildHearts.push(new Card(i, Suit.Hearts, true));
        buildSpades.push(new Card(i, Suit.Spades, true));
      }

      game.setupFixedState({
        builds: [buildClubs, buildDiamonds, buildHearts, buildSpades]
      });

      // Assert
      expect(game.hasWon()).toBe(true);
    });

    test('should NOT detect win when foundations incomplete', () => {
      // Setup: Only one foundation complete
      const buildClubs: Card[] = [];
      for (let i = 1; i <= 13; i++) {
        buildClubs.push(new Card(i, Suit.Clubs, true));
      }

      game.setupFixedState({
        builds: [buildClubs, [], [], []]
      });

      // Assert
      expect(game.hasWon()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle moving from empty draw pile', () => {
      // Setup: No draw cards
      game.setupFixedState({
        draw3: null
      });

      // Act
      const resultBuild = game.moveDrawToBuild(0);
      const resultStack = game.moveDrawToStack(0);

      // Assert
      expect(resultBuild).toBe(false);
      expect(resultStack).toBe(false);
    });

    test('should handle moving from empty stack', () => {
      // Setup: Empty stacks
      game.setupFixedState({
        stacks: [[], [], [], [], [], [], []]
      });

      // Act
      const resultBuild = game.moveStackToBuild(0, 0);
      const resultStack = game.moveStackToStack(0, 1);

      // Assert
      expect(resultBuild).toBe(false);
      expect(resultStack).toBe(false);
    });

    test('should handle moving from empty foundation', () => {
      // Setup: Empty foundation, stack with a card
      const threeSpades = new Card(3, Suit.Spades, true);
      game.setupFixedState({
        builds: [[]],
        stacks: [[threeSpades]]
      });

      // Act
      const result = game.moveBuildToStack(0, 0);

      // Assert
      expect(result).toBe(false);
    });
  });
});
