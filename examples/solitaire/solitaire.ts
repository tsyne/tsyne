/**
 * Solitaire Card Game for Tsyne
 *
 * Ported from https://github.com/fyne-io/solitaire
 * Original authors: Fyne.io contributors
 * License: See original repository
 *
 * This is a simplified port to demonstrate card game capabilities in Tsyne.
 * The original implementation uses Fyne's custom widgets for drag-and-drop
 * card interactions. This version adapts the concepts to work with Tsyne's
 * declarative API and uses a simplified interaction model.
 */

import { app } from '../../src';
import type { App } from '../../src/app';
import type { Window } from '../../src/window';

/**
 * Card suits
 * Based on: card.go
 */
enum Suit {
  Clubs = 0,
  Diamonds = 1,
  Hearts = 2,
  Spades = 3
}

enum SuitColor {
  Black = 0,
  Red = 1
}

/**
 * Card class representing a playing card
 * Based on: card.go
 */
class Card {
  constructor(
    public value: number, // 1-13 (Ace through King)
    public suit: Suit,
    public faceUp: boolean = false
  ) {
    if (value < 1 || value > 13) {
      throw new Error('Card value must be between 1 and 13');
    }
  }

  turnFaceUp(): void {
    this.faceUp = true;
  }

  turnFaceDown(): void {
    this.faceUp = false;
  }

  color(): SuitColor {
    return (this.suit === Suit.Clubs || this.suit === Suit.Spades)
      ? SuitColor.Black
      : SuitColor.Red;
  }

  suitSymbol(): string {
    switch (this.suit) {
      case Suit.Clubs: return '♣';
      case Suit.Diamonds: return '♦';
      case Suit.Hearts: return '♥';
      case Suit.Spades: return '♠';
    }
  }

  valueName(): string {
    switch (this.value) {
      case 1: return 'A';
      case 11: return 'J';
      case 12: return 'Q';
      case 13: return 'K';
      default: return this.value.toString();
    }
  }

  toString(): string {
    if (!this.faceUp) {
      return '[??]';
    }
    return `${this.valueName()}${this.suitSymbol()}`;
  }
}

/**
 * Stack of cards
 * Based on: game.go Stack
 */
class Stack {
  private cards: Card[] = [];

  push(card: Card): void {
    this.cards.push(card);
  }

  pop(): Card | null {
    if (this.cards.length === 0) return null;
    return this.cards.pop() || null;
  }

  top(): Card | null {
    if (this.cards.length === 0) return null;
    return this.cards[this.cards.length - 1];
  }

  length(): number {
    return this.cards.length;
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  clear(): void {
    this.cards = [];
  }
}

/**
 * Deck of 52 cards
 * Based on: deck.go
 */
class Deck {
  private cards: Card[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (let suit = 0; suit < 4; suit++) {
      for (let value = 1; value <= 13; value++) {
        this.cards.push(new Card(value, suit as Suit));
      }
    }
  }

  shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(): Card | null {
    if (this.cards.length === 0) return null;
    return this.cards.pop() || null;
  }

  remaining(): number {
    return this.cards.length;
  }
}

/**
 * Game state and logic
 * Based on: game.go
 */
class Game {
  private hand: Stack = new Stack();
  private draw1: Card | null = null;
  private draw2: Card | null = null;
  private draw3: Card | null = null;

  // Tableau (7 stacks)
  private stacks: Stack[] = [
    new Stack(), new Stack(), new Stack(), new Stack(),
    new Stack(), new Stack(), new Stack()
  ];

  // Build piles (4 foundation stacks)
  private builds: Stack[] = [
    new Stack(), new Stack(), new Stack(), new Stack()
  ];

  private deck: Deck = new Deck();

  constructor() {
    this.newGame();
  }

  newGame(): void {
    // Clear all stacks
    this.hand.clear();
    this.draw1 = null;
    this.draw2 = null;
    this.draw3 = null;
    this.stacks.forEach(s => s.clear());
    this.builds.forEach(s => s.clear());

    // Reset and shuffle deck
    this.deck.reset();
    this.deck.shuffle();

    // Deal cards to tableau stacks
    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        const card = this.deck.deal();
        if (card) {
          if (i === j) {
            card.turnFaceUp();
          }
          this.stacks[j].push(card);
        }
      }
    }

    // Remaining cards go to hand
    let card = this.deck.deal();
    while (card) {
      this.hand.push(card);
      card = this.deck.deal();
    }
  }

  drawThree(): void {
    // Move current draws back to hand
    if (this.draw1) {
      this.hand.push(this.draw1);
      this.draw1 = null;
    }
    if (this.draw2) {
      this.hand.push(this.draw2);
      this.draw2 = null;
    }
    if (this.draw3) {
      this.hand.push(this.draw3);
      this.draw3 = null;
    }

    // If hand is empty, we're done cycling
    if (this.hand.length() === 0) {
      return;
    }

    // Draw up to 3 cards
    const card1 = this.hand.pop();
    if (card1) {
      card1.turnFaceUp();
      this.draw3 = card1;
    }

    const card2 = this.hand.pop();
    if (card2) {
      card2.turnFaceUp();
      this.draw2 = card2;
    }

    const card3 = this.hand.pop();
    if (card3) {
      card3.turnFaceUp();
      this.draw1 = card3;
    }
  }

  canMoveToBuild(card: Card, buildIndex: number): boolean {
    const build = this.builds[buildIndex];
    const top = build.top();

    if (!top) {
      // Empty build - only accept Aces
      return card.value === 1;
    }

    // Must be same suit and one value higher
    return card.suit === top.suit && card.value === top.value + 1;
  }

  canMoveToStack(card: Card, stackIndex: number): boolean {
    const stack = this.stacks[stackIndex];
    const top = stack.top();

    if (!top) {
      // Empty stack - only accept Kings
      return card.value === 13;
    }

    // Must be opposite color and one value lower
    return card.color() !== top.color() && card.value === top.value - 1;
  }

  hasWon(): boolean {
    return this.builds.every(b => b.length() === 13);
  }

  getStackCards(stackIndex: number): Card[] {
    return this.stacks[stackIndex].getCards();
  }

  getBuildCards(buildIndex: number): Card[] {
    return this.builds[buildIndex].getCards();
  }

  getDrawCards(): { draw1: Card | null; draw2: Card | null; draw3: Card | null } {
    return {
      draw1: this.draw1,
      draw2: this.draw2,
      draw3: this.draw3
    };
  }

  getHandCount(): number {
    return this.hand.length();
  }
}

/**
 * Solitaire UI
 */
class SolitaireUI {
  private game: Game;
  private statusLabel: any = null;

  constructor(private a: App) {
    this.game = new Game();
  }

  buildUI(win: Window): void {
    this.a.vbox(() => {
      // Toolbar
      this.a.toolbar([
        {
          type: 'action',
          label: 'New Game',
          onAction: () => this.newGame()
        },
        {
          type: 'action',
          label: 'Shuffle',
          onAction: () => this.shuffle()
        },
        {
          type: 'action',
          label: 'Draw',
          onAction: () => this.draw()
        }
      ]);

      // Game area
      this.a.scroll(() => {
        this.a.vbox(() => {
          // Draw pile and builds
          this.a.hbox(() => {
            this.a.label('Hand:');
            this.a.label(this.game.getHandCount().toString());
            const draws = this.game.getDrawCards();
            this.a.label(draws.draw1 ? draws.draw1.toString() : '[ ]');
            this.a.label(draws.draw2 ? draws.draw2.toString() : '[ ]');
            this.a.label(draws.draw3 ? draws.draw3.toString() : '[ ]');
          });

          this.a.separator();

          // Build piles
          this.a.label('Foundations:');
          this.a.hbox(() => {
            for (let i = 0; i < 4; i++) {
              const cards = this.game.getBuildCards(i);
              const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
              this.a.label(topCard ? topCard.toString() : '[  ]');
            }
          });

          this.a.separator();

          // Tableau stacks
          this.a.label('Tableau:');
          this.a.hbox(() => {
            for (let i = 0; i < 7; i++) {
              this.a.vbox(() => {
                const cards = this.game.getStackCards(i);
                if (cards.length === 0) {
                  this.a.label('[  ]');
                } else {
                  cards.forEach(card => {
                    this.a.label(card.toString());
                  });
                }
              });
            }
          });
        });
      });

      // Status
      this.statusLabel = this.a.label('New game started');
    });
  }

  private newGame(): void {
    this.game.newGame();
    this.updateStatus('New game started');
  }

  private shuffle(): void {
    this.game.newGame();
    this.updateStatus('Deck shuffled');
  }

  private draw(): void {
    this.game.drawThree();
    this.updateStatus('Drew cards');
    if (this.game.hasWon()) {
      this.updateStatus('Congratulations! You won!');
    }
  }

  private async updateStatus(message: string): Promise<void> {
    if (this.statusLabel) {
      await this.statusLabel.setText(message);
    }
  }
}

/**
 * Create the solitaire app
 * Based on: main.go
 */
export function createSolitaireApp(a: App): SolitaireUI {
  const ui = new SolitaireUI(a);

  a.window({ title: 'Solitaire', width: 800, height: 600 }, (win: Window) => {
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
  app({ title: 'Solitaire' }, (a: App) => {
    createSolitaireApp(a);
  });
}
