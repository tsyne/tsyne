// @tsyne-app:name Solitaire
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 6v4"/><path d="M10 8h4"/><path d="M12 14l-3 4h6l-3-4z"/></svg>
// @tsyne-app:category games
// @tsyne-app:builder createSolitaireApp
// @tsyne-app:args app,windowWidth,windowHeight

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

import { app, resolveTransport  , standaloneShutdownStrategy } from 'tsyne';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';
import { cvg } from 'cosyne';
import type { CvgContext } from 'cosyne';
import { CARD_DRAW_MAP, CARD_VB_WIDTH, CARD_VB_HEIGHT } from './solitaire-cards-cvg';
import { detectDropZone } from './drop-zone';

// ============================================================================
// Board layout constants for CVG rendering
// ============================================================================

const CW = 120;                          // card display width
const CH = 174;                          // card display height
const GAP = 10;                          // spacing between elements
const COL_W = CW + GAP;                 // column width (130)
const FNDTN_X = 530;                    // foundation area x start
const TABLEAU_Y = CH + GAP * 3;         // tableau top (204)
const OVERLAP = 50;                      // vertical overlap for stacked cards
const BOARD_W = FNDTN_X + 4 * COL_W;   // board width (1050)
const BOARD_H = 900;                     // board height

// ============================================================================
// Solitaire Card Game Logic
// ============================================================================

/**
 * Card suits
 * Based on: card.go
 */
export enum Suit {
  Clubs = 0,
  Diamonds = 1,
  Hearts = 2,
  Spades = 3
}

export enum SuitColor {
  Black = 0,
  Red = 1
}

/**
 * Card class representing a playing card
 * Based on: card.go
 */
export class Card {
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

  /**
   * Get the SVG filename for this card's face
   */
  imageFilename(): string {
    if (!this.faceUp) {
      return 'back.svg';
    }

    const suitStr = ['C', 'D', 'H', 'S'][this.suit];
    const valueStr = this.valueName();
    return `${valueStr}${suitStr}.svg`;
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
}

/**
 * Game state and logic
 * Based on: game.go
 */
export class Game {
  private hand: Stack = new Stack();
  private waste: Stack = new Stack(); // Discard pile for drawn cards
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

  constructor(skipInit: boolean = false) {
    if (!skipInit) {
      this.newGame();
    }
  }

  /**
   * Set up a fixed game state for testing
   * @param config Configuration object with hand cards, draw cards, stacks, and builds
   */
  setupFixedState(config: {
    handCards?: Card[];
    draw1?: Card | null;
    draw2?: Card | null;
    draw3?: Card | null;
    stacks?: Card[][];
    builds?: Card[][];
  }): void {
    // Clear everything
    this.hand.clear();
    this.waste.clear();
    this.draw1 = null;
    this.draw2 = null;
    this.draw3 = null;
    this.stacks.forEach(s => s.clear());
    this.builds.forEach(s => s.clear());

    // Set up hand
    if (config.handCards) {
      for (const card of config.handCards) {
        this.hand.push(card);
      }
    }

    // Set up draw cards
    if (config.draw1 !== undefined) this.draw1 = config.draw1;
    if (config.draw2 !== undefined) this.draw2 = config.draw2;
    if (config.draw3 !== undefined) this.draw3 = config.draw3;

    // Set up tableau stacks
    if (config.stacks) {
      for (let i = 0; i < config.stacks.length && i < 7; i++) {
        for (const card of config.stacks[i]) {
          this.stacks[i].push(card);
        }
      }
    }

    // Set up foundation builds
    if (config.builds) {
      for (let i = 0; i < config.builds.length && i < 4; i++) {
        for (const card of config.builds[i]) {
          this.builds[i].push(card);
        }
      }
    }
  }

  newGame(): void {
    // Clear all stacks
    this.hand.clear();
    this.waste.clear();
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
    // Move current draws to waste pile
    if (this.draw1) {
      this.waste.push(this.draw1);
      this.draw1 = null;
    }
    if (this.draw2) {
      this.waste.push(this.draw2);
      this.draw2 = null;
    }
    if (this.draw3) {
      this.waste.push(this.draw3);
      this.draw3 = null;
    }

    // If hand is empty, flip waste pile back to hand
    if (this.hand.length() === 0) {
      while (this.waste.length() > 0) {
        const card = this.waste.pop();
        if (card) {
          card.turnFaceDown();
          this.hand.push(card);
        }
      }
      // If still empty after flipping waste, we're done
      if (this.hand.length() === 0) {
        return;
      }
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

  /**
   * Try to move a card from draw3 to a build pile
   */
  moveDrawToBuild(buildIndex: number): boolean {
    if (!this.draw3) return false;
    if (!this.canMoveToBuild(this.draw3, buildIndex)) return false;

    this.builds[buildIndex].push(this.draw3);
    // Shift the remaining drawn cards
    this.draw3 = this.draw2;
    this.draw2 = this.draw1;
    this.draw1 = null;
    return true;
  }

  /**
   * Try to move a card from draw3 to a tableau stack
   */
  moveDrawToStack(stackIndex: number): boolean {
    if (!this.draw3) return false;
    if (!this.canMoveToStack(this.draw3, stackIndex)) return false;

    this.stacks[stackIndex].push(this.draw3);
    // Shift the remaining drawn cards
    this.draw3 = this.draw2;
    this.draw2 = this.draw1;
    this.draw1 = null;
    return true;
  }

  /**
   * Try to move top card from one stack to a build pile
   */
  moveStackToBuild(fromStack: number, buildIndex: number): boolean {
    const card = this.stacks[fromStack].top();
    if (!card) return false;
    if (!this.canMoveToBuild(card, buildIndex)) return false;

    this.stacks[fromStack].pop();
    this.builds[buildIndex].push(card);

    // Turn over the next card in the stack if any
    const nextCard = this.stacks[fromStack].top();
    if (nextCard && !nextCard.faceUp) {
      nextCard.turnFaceUp();
    }

    return true;
  }

  /**
   * Try to move top card from one stack to another stack
   */
  moveStackToStack(fromStack: number, toStack: number): boolean {
    const card = this.stacks[fromStack].top();
    if (!card) return false;
    if (!this.canMoveToStack(card, toStack)) return false;

    this.stacks[fromStack].pop();
    this.stacks[toStack].push(card);

    // Turn over the next card in the from-stack if any
    const nextCard = this.stacks[fromStack].top();
    if (nextCard && !nextCard.faceUp) {
      nextCard.turnFaceUp();
    }

    return true;
  }

  /**
   * Try to move top card from a build pile to a stack
   */
  moveBuildToStack(buildIndex: number, toStack: number): boolean {
    const card = this.builds[buildIndex].top();
    if (!card) return false;
    if (!this.canMoveToStack(card, toStack)) return false;

    this.builds[buildIndex].pop();
    this.stacks[toStack].push(card);
    return true;
  }

  /**
   * Try to move a sequence of cards from one stack to another
   * @param fromStack Source stack index
   * @param toStack Destination stack index
   * @param cardIndex Index of the first card to move (0 = bottom of stack)
   */
  moveStackSequenceToStack(fromStack: number, toStack: number, cardIndex: number): boolean {
    const cards = this.stacks[fromStack].getCards();

    // Validate cardIndex is within bounds
    if (cardIndex < 0 || cardIndex >= cards.length) {
      return false;
    }

    // Get the sequence of cards to move
    const sequence = cards.slice(cardIndex);

    // All cards in the sequence must be face-up
    if (sequence.some(card => !card.faceUp)) {
      return false;
    }

    // Validate the sequence is properly ordered (alternating colors, descending values)
    for (let i = 0; i < sequence.length - 1; i++) {
      const current = sequence[i];
      const next = sequence[i + 1];

      // Check colors alternate
      if (current.color() === next.color()) {
        return false;
      }

      // Check values descend by 1
      if (current.value !== next.value + 1) {
        return false;
      }
    }

    // Check if the first card in the sequence can be placed on the target stack
    const firstCard = sequence[0];
    if (!this.canMoveToStack(firstCard, toStack)) {
      return false;
    }

    // All validation passed - perform the move
    // Remove cards from source stack
    for (let i = 0; i < sequence.length; i++) {
      this.stacks[fromStack].pop();
    }

    // Add cards to destination stack
    for (const card of sequence) {
      this.stacks[toStack].push(card);
    }

    // Flip the card left behind if it's face-down
    const nextCard = this.stacks[fromStack].top();
    if (nextCard && !nextCard.faceUp) {
      nextCard.turnFaceUp();
    }

    return true;
  }
}

/**
 * Solitaire UI — renders the entire game board as a CVG canvas
 */
class SolitaireUI {
  private game: Game;
  private statusLabel: any = null;
  private currentStatus: string = 'New game started';
  private selectedCard: { type: 'draw' | 'stack' | 'build', index: number, cardIndex?: number } | null = null;
  private draggedCard: { type: 'draw' | 'stack' | 'build', index: number } | null = null;
  private window: Window | null = null;
  private cvgCtx: CvgContext = null as any;

  constructor(private a: App) {
    this.game = new Game();
  }

  /**
   * Get a human-readable card description
   */
  private getCardDescription(card: Card): string {
    const suitNames = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
    const valueNames = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
    return `${valueNames[card.value]} of ${suitNames[card.suit]}`;
  }

  /**
   * Handle clicking on a card - select or move
   */
  private async handleCardClick(type: 'draw' | 'stack' | 'build', index: number): Promise<void> {
    // If no card is selected, select this one
    if (!this.selectedCard) {
      this.selectedCard = { type, index };

      let card: Card | null = null;
      let statusMessage = '';

      if (type === 'draw') {
        const draws = this.game.getDrawCards();
        card = draws.draw3;
        const cardDesc = card ? this.getCardDescription(card) : 'card';
        statusMessage = `Selected ${cardDesc} from draw pile`;
      } else if (type === 'stack') {
        const cards = this.game.getStackCards(index);
        const firstFaceUpIndex = cards.findIndex(c => c.faceUp);

        if (firstFaceUpIndex >= 0) {
          this.selectedCard.cardIndex = firstFaceUpIndex;
          const faceUpCards = cards.slice(firstFaceUpIndex);
          const cardDescs = faceUpCards.map(c => this.getCardDescription(c));

          if (cardDescs.length === 1) {
            statusMessage = `Selected ${cardDescs[0]} from stack ${index}`;
          } else {
            statusMessage = `Selected stack ${index}: ${cardDescs.join(' → ')} (${cardDescs.length} cards)`;
          }
        } else {
          statusMessage = `Selected stack ${index}`;
        }
      } else if (type === 'build') {
        const cards = this.game.getBuildCards(index);
        card = cards[cards.length - 1] || null;
        const cardDesc = card ? this.getCardDescription(card) : 'empty foundation';
        statusMessage = `Selected ${cardDesc} from foundation ${index}`;
      }

      await this.updateStatus(statusMessage);
      return;
    }

    // If clicking the same card that's already selected, deselect it
    const from = this.selectedCard;
    if (from.type === type && from.index === index) {
      this.selectedCard = null;
      await this.updateStatus('Selection cleared');
      return;
    }

    // Try to move selected card to clicked location
    let moved = false;
    let message = '';

    if (from.type === 'draw' && type === 'build') {
      moved = this.game.moveDrawToBuild(index);
      message = moved ? `Moved card to foundation ${index}` : 'Cannot move card there';
    } else if (from.type === 'draw' && type === 'stack') {
      moved = this.game.moveDrawToStack(index);
      message = moved ? `Moved card to tableau ${index}` : 'Cannot move card there';
    } else if (from.type === 'stack' && type === 'build') {
      moved = this.game.moveStackToBuild(from.index, index);
      message = moved ? `Moved card to foundation ${index}` : 'Cannot move card there';
    } else if (from.type === 'stack' && type === 'stack') {
      if (from.cardIndex !== undefined) {
        moved = this.game.moveStackSequenceToStack(from.index, index, from.cardIndex);
        if (moved) {
          const cards = this.game.getStackCards(index);
          const numMoved = cards.length - (from.cardIndex || 0);
          message = numMoved > 1
            ? `Moved ${numMoved} cards to tableau ${index}`
            : `Moved card to tableau ${index}`;
        } else {
          message = 'Cannot move cards there';
        }
      } else {
        moved = this.game.moveStackToStack(from.index, index);
        message = moved ? `Moved card to tableau ${index}` : 'Cannot move card there';
      }
    } else if (from.type === 'build' && type === 'stack') {
      moved = this.game.moveBuildToStack(from.index, index);
      message = moved ? `Moved card to tableau ${index}` : 'Cannot move card there';
    } else {
      let canSelect = false;
      if (type === 'draw') {
        const draws = this.game.getDrawCards();
        canSelect = draws.draw3 !== null;
      } else if (type === 'stack') {
        const cards = this.game.getStackCards(index);
        canSelect = cards.length > 0 && cards[cards.length - 1].faceUp;
      } else if (type === 'build') {
        canSelect = true;
      }

      if (canSelect) {
        this.selectedCard = { type, index };
        let card: Card | null = null;
        let statusMessage = '';

        if (type === 'draw') {
          const draws = this.game.getDrawCards();
          card = draws.draw3;
          const cardDesc = card ? this.getCardDescription(card) : 'card';
          statusMessage = `Selected ${cardDesc} from draw pile`;
        } else if (type === 'stack') {
          const cards = this.game.getStackCards(index);
          const firstFaceUpIndex = cards.findIndex(c => c.faceUp);

          if (firstFaceUpIndex >= 0) {
            this.selectedCard.cardIndex = firstFaceUpIndex;
            const faceUpCards = cards.slice(firstFaceUpIndex);
            const cardDescs = faceUpCards.map(c => this.getCardDescription(c));

            if (cardDescs.length === 1) {
              statusMessage = `Selected ${cardDescs[0]} from stack ${index}`;
            } else {
              statusMessage = `Selected stack ${index}: ${cardDescs.join(' → ')} (${cardDescs.length} cards)`;
            }
          } else {
            statusMessage = `Selected stack ${index}`;
          }
        } else if (type === 'build') {
          const cards = this.game.getBuildCards(index);
          card = cards[cards.length - 1] || null;
          const cardDesc = card ? this.getCardDescription(card) : 'empty foundation';
          statusMessage = `Selected ${cardDesc} from foundation ${index}`;
        }

        await this.updateStatus(statusMessage);
        return;
      } else {
        message = 'Invalid move';
      }
    }

    this.selectedCard = null;

    await this.updateStatus(message);

    if (moved) {
      if (this.game.hasWon()) {
        this.currentStatus = 'Congratulations! You won!';
      }
      this.rebuildUI();
    }
  }

  /**
   * Handle drag start on a card
   */
  private handleCardDrag(type: 'draw' | 'stack' | 'build', index: number, _x: number, _y: number): void {
    if (!this.draggedCard) {
      this.draggedCard = { type, index };
      this.updateStatus(`Dragging card from ${type} ${index}...`);
    }
  }

  /**
   * Handle drag end on a card — determine drop target and move
   */
  private async handleCardDragEnd(x: number, y: number): Promise<void> {
    if (!this.draggedCard) return;

    const from = this.draggedCard;
    this.draggedCard = null;

    const dropZone = detectDropZone(x, y, 1000, 700);

    let moved = false;
    let message = '';

    if (dropZone.zone === 'foundation') {
      const buildIndex = dropZone.index;
      if (from.type === 'draw') {
        moved = this.game.moveDrawToBuild(buildIndex);
        message = moved ? `Moved card to foundation ${buildIndex}` : 'Cannot move card there';
      } else if (from.type === 'stack') {
        moved = this.game.moveStackToBuild(from.index, buildIndex);
        message = moved ? `Moved card to foundation ${buildIndex}` : 'Cannot move card there';
      } else if (from.type === 'build') {
        message = 'Cannot move foundation cards to another foundation';
      }
    } else if (dropZone.zone === 'tableau') {
      const stackIndex = dropZone.index;
      if (from.type === 'draw') {
        moved = this.game.moveDrawToStack(stackIndex);
        message = moved ? `Moved card to tableau ${stackIndex}` : 'Cannot move card there';
      } else if (from.type === 'stack') {
        moved = this.game.moveStackToStack(from.index, stackIndex);
        message = moved ? `Moved card to tableau ${stackIndex}` : 'Cannot move card there';
      } else if (from.type === 'build') {
        moved = this.game.moveBuildToStack(from.index, stackIndex);
        message = moved ? `Moved card to tableau ${stackIndex}` : 'Cannot move card there';
      }
    } else {
      message = `Invalid drop location (${Math.floor(x)}, ${Math.floor(y)})`;
    }

    await this.updateStatus(message);

    if (moved) {
      if (this.game.hasWon()) {
        this.currentStatus = 'Congratulations! You won!';
      }
      this.rebuildUI();
    }
  }

  /**
   * Rebuild the UI to reflect game state changes
   */
  private async rebuildUI(): Promise<void> {
    if (!this.window) return;
    await this.window.setContent(() => {
      this.buildUI(this.window!);
    });
  }

  /**
   * Draw a card at the given position with proper scaling from card viewBox
   */
  private drawCardAt(s: CvgContext, filename: string, x: number, y: number): void {
    const fn = CARD_DRAW_MAP[filename];
    if (!fn) return;
    s.g({ transform: { translate: [x, y], scale: [CW / CARD_VB_WIDTH, CH / CARD_VB_HEIGHT] } }, () => {
      fn(s);
    });
  }

  /**
   * Draw an empty slot outline at the given position
   */
  private drawEmptySlot(s: CvgContext, x: number, y: number): void {
    s.rect({ x, y, width: CW, height: CH, fill: 'none', stroke: '#888', 'stroke-width': 2, rx: 8 });
  }

  buildUI(win: Window | null): void {
    this.window = win;

    this.a.vbox(() => {
      // Action buttons (still Tsyne widgets for accessibility)
      this.a.hbox(() => {
        this.a.button('New Game', { onClick: () => this.newGame() }).withId('new-game-btn');
        this.a.button('Shuffle', { onClick: () => this.shuffle() }).withId('shuffle-btn');
        this.a.button('Draw', { onClick: () => this.draw() }).withId('draw-btn');
      });

      // Entire game board as one CVG canvas
      this.cvgCtx = cvg(this.a, {
        viewBox: `0 0 ${BOARD_W} ${BOARD_H}`,
        width: 1000, height: 860
      }, (s) => {
        const draws = this.game.getDrawCards();

        // --- Hand pile ---
        if (this.game.getHandCount() > 0) {
          this.drawCardAt(s, 'back.svg', GAP, GAP);
        } else {
          this.drawEmptySlot(s, GAP, GAP);
        }
        s.rect({ x: GAP, y: GAP, width: CW, height: CH,
          fill: 'transparent', onClick: () => this.draw() });

        // --- Draw slots ---
        // Draw1 (non-interactive)
        if (draws.draw1) {
          this.drawCardAt(s, draws.draw1.imageFilename(), GAP + COL_W, GAP);
        } else {
          this.drawEmptySlot(s, GAP + COL_W, GAP);
        }

        // Draw2 (non-interactive)
        if (draws.draw2) {
          this.drawCardAt(s, draws.draw2.imageFilename(), GAP + COL_W * 2, GAP);
        } else {
          this.drawEmptySlot(s, GAP + COL_W * 2, GAP);
        }

        // Draw3 (clickable — the active draw card)
        const d3x = GAP + COL_W * 3;
        if (draws.draw3) {
          this.drawCardAt(s, draws.draw3.imageFilename(), d3x, GAP);
          s.rect({ x: d3x, y: GAP, width: CW, height: CH,
            fill: 'transparent',
            onClick: () => this.handleCardClick('draw', 0) });
        } else {
          this.drawEmptySlot(s, d3x, GAP);
        }

        // --- Foundations (4) ---
        for (let i = 0; i < 4; i++) {
          const fx = FNDTN_X + i * COL_W;
          const cards = this.game.getBuildCards(i);
          const top = cards.length > 0 ? cards[cards.length - 1] : null;
          if (top) {
            this.drawCardAt(s, top.imageFilename(), fx, GAP);
          } else {
            this.drawEmptySlot(s, fx, GAP);
          }
          s.rect({ x: fx, y: GAP, width: CW, height: CH,
            fill: 'transparent',
            onClick: () => this.handleCardClick('build', i) });
        }

        // --- Tableau (7 columns) ---
        for (let i = 0; i < 7; i++) {
          const tx = GAP + i * COL_W;
          const cards = this.game.getStackCards(i);
          if (cards.length === 0) {
            this.drawEmptySlot(s, tx, TABLEAU_Y);
            s.rect({ x: tx, y: TABLEAU_Y, width: CW, height: CH,
              fill: 'transparent',
              onClick: () => this.handleCardClick('stack', i) });
          } else {
            // Draw each card in the stack with vertical overlap
            for (let j = 0; j < cards.length; j++) {
              const ty = TABLEAU_Y + j * OVERLAP;
              this.drawCardAt(s, cards[j].imageFilename(), tx, ty);
            }
            // Click target covers the full stack height
            const stackH = CH + (cards.length - 1) * OVERLAP;
            s.rect({ x: tx, y: TABLEAU_Y, width: CW, height: stackH,
              fill: 'transparent',
              onClick: () => this.handleCardClick('stack', i) });
          }
        }

        s.enableEvents();
      });

      // Status label
      this.statusLabel = this.a.label(this.currentStatus).withId('status-label');
    }, { spacing: 0 });
  }

  private newGame(): void {
    this.game.newGame();
    this.selectedCard = null;
    this.draggedCard = null;
    this.currentStatus = 'New game started';
    this.rebuildUI();
  }

  private shuffle(): void {
    this.game.newGame();
    this.selectedCard = null;
    this.draggedCard = null;
    this.currentStatus = 'Deck shuffled';
    this.rebuildUI();
  }

  private draw(): void {
    this.game.drawThree();
    if (this.game.hasWon()) {
      this.currentStatus = 'Congratulations! You won!';
    } else {
      this.currentStatus = 'Drew cards';
    }
    this.rebuildUI();
  }

  private async updateStatus(message: string): Promise<void> {
    this.currentStatus = message;
    if (this.statusLabel) {
      await this.statusLabel.setText(message);
    }
  }

  // ============================================================================
  // Public methods (for testing)
  // ============================================================================

  getGame(): Game {
    return this.game;
  }

  refreshUI(): void {
    this.rebuildUI();
  }

  /**
   * Get the CVG context for dispatchTap in tests
   */
  getCvgCtx(): CvgContext {
    return this.cvgCtx;
  }

  /**
   * Simulate a click on the hand pile (for tests)
   */
  clickHandPile(): void {
    const m = this.cvgCtx.getMapping();
    const [cx, cy] = m.transform.apply(GAP + CW / 2, GAP + CH / 2);
    this.cvgCtx.dispatchTap(cx, cy);
  }

  /**
   * Simulate a click on draw3 card (for tests)
   */
  clickDraw3(): void {
    const d3x = GAP + COL_W * 3;
    const m = this.cvgCtx.getMapping();
    const [cx, cy] = m.transform.apply(d3x + CW / 2, GAP + CH / 2);
    this.cvgCtx.dispatchTap(cx, cy);
  }

  /**
   * Simulate a click on a tableau stack (for tests)
   */
  clickStack(index: number): void {
    const tx = GAP + index * COL_W;
    const cards = this.game.getStackCards(index);
    // Click near bottom of the stack (where the top card is)
    const lastCardY = cards.length > 0
      ? TABLEAU_Y + (cards.length - 1) * OVERLAP
      : TABLEAU_Y;
    const m = this.cvgCtx.getMapping();
    const [cx, cy] = m.transform.apply(tx + CW / 2, lastCardY + CH / 2);
    this.cvgCtx.dispatchTap(cx, cy);
  }

  /**
   * Simulate a click on a foundation pile (for tests)
   */
  clickFoundation(index: number): void {
    const fx = FNDTN_X + index * COL_W;
    const m = this.cvgCtx.getMapping();
    const [cx, cy] = m.transform.apply(fx + CW / 2, GAP + CH / 2);
    this.cvgCtx.dispatchTap(cx, cy);
  }
}

/**
 * Create the solitaire app
 * @param a The Tsyne App instance
 * @param windowWidth - Optional window width from PhoneTop
 * @param windowHeight - Optional window height from PhoneTop
 */
export function createSolitaireApp(a: App, windowWidth?: number, windowHeight?: number): SolitaireUI {
  const ui = new SolitaireUI(a);

  const layoutScale = (a.getContext() as any).getLayoutScale?.() || 1.0;
  const isMobile = layoutScale < 1.0;
  const width = isMobile ? 1040 : 1000;
  const height = isMobile ? 750 : 700;

  a.window({ title: 'Solitaire', width, height }, (win: Window) => {
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
  const appInstance = app(resolveTransport(), { title: 'Solitaire' }, (a: App) => {
    createSolitaireApp(a);
  });
  appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance));
}
