// @tsyne-app:name Solitaire
// @tsyne-app:icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 6v4"/><path d="M10 8h4"/><path d="M12 14l-3 4h6l-3-4z"/></svg>
// @tsyne-app:category games
// @tsyne-app:builder createSolitaireApp

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

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import * as path from 'path';
import * as fs from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { detectDropZone } from './drop-zone';

// ============================================================================
// Card Image Provider Interface (Dependency Injection)
// ============================================================================

/**
 * Interface for providing card images.
 * Production uses SvgCardImageProvider (renders SVGs to PNG).
 * Tests can inject StubCardImageProvider for fast execution.
 */
export interface CardImageProvider {
  getCardImage(filename: string): string;
  getOverlappedCardsImage(
    cardImages: string[],
    cardWidth: number,
    cardHeight: number,
    overlapOffset: number
  ): string;
}

// ============================================================================
// Pseudo-declarative Observable System (like todomvc-ngshow.ts)
// ============================================================================

type GameChangeType = 'draw' | 'move' | 'newgame' | 'shuffle';
type GameChangeListener = (changeType: GameChangeType) => void;

// ============================================================================
// SVG to PNG Rendering (merged from svg-renderer.ts)
// ============================================================================

/**
 * Cache for pre-rendered card faces Map (shared across all SolitaireUI instances)
 */
let cardFacesCache: Map<string, string> | null = null;

/**
 * Render an SVG file to a base64-encoded PNG
 * @param svgPath Path to the SVG file
 * @param width Target width (optional, maintains aspect ratio)
 * @param height Target height (optional, maintains aspect ratio)
 * @returns Base64-encoded PNG data with data URI prefix
 */
function renderSVGToBase64(svgPath: string, width?: number, height?: number): string {
  // Read SVG file
  const svgBuffer = fs.readFileSync(svgPath);

  // Render using resvg
  const opts: any = {
    fitTo: {
      mode: width && height ? 'width' : 'original',
      value: width || undefined,
    },
  };

  const resvg = new Resvg(svgBuffer, opts);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Convert to base64
  const base64 = pngBuffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Pre-render all card face SVGs to base64 PNG
 * @param facesDir Directory containing the SVG files
 * @param cardWidth Width to render cards at (default: 100)
 * @param cardHeight Height to render cards at (default: 145)
 * @returns Map of filename to base64 PNG data
 */
function preRenderAllCards(
  facesDir: string,
  cardWidth: number = 200,
  cardHeight: number = 290
): Map<string, string> {
  // Return cached cards if already rendered
  if (cardFacesCache) {
    return cardFacesCache;
  }

  const renderedCards = new Map<string, string>();

  // Get all SVG files
  const files = fs.readdirSync(facesDir).filter(f => f.endsWith('.svg'));

  for (const file of files) {
    const svgPath = path.join(facesDir, file);
    const base64 = renderSVGToBase64(svgPath, cardWidth, cardHeight);
    renderedCards.set(file, base64);
  }

  // Cache for future instances
  cardFacesCache = renderedCards;

  return renderedCards;
}

/**
 * Create a composite image of multiple cards overlapping vertically
 * @param cardImages Array of base64 PNG data URIs for each card
 * @param cardWidth Width of each card
 * @param cardHeight Height of each card
 * @param overlapOffset Vertical offset between cards (e.g., cardHeight / 2)
 * @returns Base64-encoded PNG data URI of the composite image
 */
function createOverlappedCardsImage(
  cardImages: string[],
  cardWidth: number,
  cardHeight: number,
  overlapOffset: number
): string {
  if (cardImages.length === 0) {
    return '';
  }

  // For a single card, just return it as-is
  if (cardImages.length === 1) {
    return cardImages[0];
  }

  // Calculate total height: first card full height + remaining cards at offset
  const totalHeight = cardHeight + (cardImages.length - 1) * overlapOffset;

  // Create a simple SVG that layers the images
  // We'll decode the base64 PNGs and embed them in an SVG, then render that SVG
  const svgParts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${totalHeight}">`,
  ];

  for (let i = 0; i < cardImages.length; i++) {
    const y = i * overlapOffset;
    // Embed the image directly (data URI is already in the right format)
    svgParts.push(
      `<image href="${cardImages[i]}" x="0" y="${y}" width="${cardWidth}" height="${cardHeight}"/>`
    );
  }

  svgParts.push('</svg>');

  const svgString = svgParts.join('\n');
  const svgBuffer = Buffer.from(svgString, 'utf-8');

  // Render the composite SVG to PNG
  const resvg = new Resvg(svgBuffer, {
    fitTo: {
      mode: 'width',
      value: cardWidth,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  // Convert to base64
  const base64 = pngBuffer.toString('base64');
  return `data:image/png;base64,${base64}`;
}

// ============================================================================
// Card Image Provider Implementations
// ============================================================================

/**
 * Production card image provider that renders SVGs to PNG.
 * Expensive but produces real card images.
 */
export class SvgCardImageProvider implements CardImageProvider {
  private renderedCards: Map<string, string>;

  constructor(facesDir: string, cardWidth: number = 120, cardHeight: number = 174) {
    this.renderedCards = preRenderAllCards(facesDir, cardWidth, cardHeight);
  }

  getCardImage(filename: string): string {
    const data = this.renderedCards.get(filename);
    if (!data) {
      console.warn(`Card image not found: ${filename}`);
      return this.renderedCards.get('back.svg') || '';
    }
    return data;
  }

  getOverlappedCardsImage(
    cardImages: string[],
    cardWidth: number,
    cardHeight: number,
    overlapOffset: number
  ): string {
    return createOverlappedCardsImage(cardImages, cardWidth, cardHeight, overlapOffset);
  }
}

/**
 * Stub card image provider for fast tests.
 * Returns minimal placeholder images instantly.
 */
export class StubCardImageProvider implements CardImageProvider {
  private static placeholder: string | null = null;

  private getPlaceholder(): string {
    if (!StubCardImageProvider.placeholder) {
      // Minimal valid 1x1 transparent PNG (67 bytes)
      const minimalPng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);
      StubCardImageProvider.placeholder = `data:image/png;base64,${minimalPng.toString('base64')}`;
    }
    return StubCardImageProvider.placeholder;
  }

  getCardImage(_filename: string): string {
    return this.getPlaceholder();
  }

  getOverlappedCardsImage(
    cardImages: string[],
    _cardWidth: number,
    _cardHeight: number,
    _overlapOffset: number
  ): string {
    // Just return first image - no expensive composite rendering
    return cardImages.length > 0 ? cardImages[0] : this.getPlaceholder();
  }
}

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
 * Solitaire UI
 */
class SolitaireUI {
  private game: Game;
  private statusLabel: any = null;
  private currentStatus: string = 'New game started'; // Current status message preserved across rebuilds
  private cardImageProvider: CardImageProvider;
  private selectedCard: { type: 'draw' | 'stack' | 'build', index: number, cardIndex?: number } | null = null;
  private draggedCard: { type: 'draw' | 'stack' | 'build', index: number } | null = null;
  private window: Window | null = null;

  // Widget references for incremental updates (avoid full rebuilds)
  private handPileImage: any = null;
  private draw1Image: any = null;
  private draw2Image: any = null;
  private draw3Image: any = null;

  constructor(private a: App, cardImageProvider?: CardImageProvider) {
    this.game = new Game();

    if (cardImageProvider) {
      // Use injected provider (e.g., StubCardImageProvider for tests)
      this.cardImageProvider = cardImageProvider;
    } else {
      // Default: use SVG renderer (production)
      const possiblePaths = [
        path.join(process.cwd(), 'faces'),
        path.join(process.cwd(), 'examples/solitaire/faces'),
        path.join(process.cwd(), '../examples/solitaire/faces'),
        path.join(__dirname, 'faces')
      ];
      const facesDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[3];
      this.cardImageProvider = new SvgCardImageProvider(facesDir, 120, 174);
    }
  }

  /**
   * Get the base64 PNG data for a card
   */
  private getCardImage(filename: string): string {
    return this.cardImageProvider.getCardImage(filename);
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

      // Get the card details for the status message
      let card: Card | null = null;
      let statusMessage = '';

      if (type === 'draw') {
        const draws = this.game.getDrawCards();
        card = draws.draw3;
        const cardDesc = card ? this.getCardDescription(card) : 'card';
        statusMessage = `Selected ${cardDesc} from draw pile`;
      } else if (type === 'stack') {
        const cards = this.game.getStackCards(index);
        // Find the first face-up card
        const firstFaceUpIndex = cards.findIndex(c => c.faceUp);

        if (firstFaceUpIndex >= 0) {
          // Store the index of the first face-up card for multi-card moves
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
      // Try to move sequence of cards if cardIndex is available
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
        // Fall back to single card move
        moved = this.game.moveStackToStack(from.index, index);
        message = moved ? `Moved card to tableau ${index}` : 'Cannot move card there';
      }
    } else if (from.type === 'build' && type === 'stack') {
      moved = this.game.moveBuildToStack(from.index, index);
      message = moved ? `Moved card to tableau ${index}` : 'Cannot move card there';
    } else {
      // Invalid move combination - instead of just clearing selection,
      // select the newly clicked card if it's a valid source

      // Check if the clicked location has a valid card to select
      let canSelect = false;
      if (type === 'draw') {
        const draws = this.game.getDrawCards();
        canSelect = draws.draw3 !== null;
      } else if (type === 'stack') {
        const cards = this.game.getStackCards(index);
        canSelect = cards.length > 0 && cards[cards.length - 1].faceUp;
      } else if (type === 'build') {
        canSelect = true; // Can always select foundations (even empty ones for placing)
      }

      if (canSelect) {
        // Reselect the clicked card
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

    // Clear selection
    this.selectedCard = null;

    await this.updateStatus(message);

    // Rebuild UI to show the move
    if (moved) {
      // Check for win and update status before rebuilding
      if (this.game.hasWon()) {
        this.currentStatus = 'Congratulations! You won!';
      }
      this.rebuildUI();
    }
  }

  /**
   * Handle drag start on a card - tracks what's being dragged
   */
  private handleCardDrag(type: 'draw' | 'stack' | 'build', index: number, x: number, y: number): void {
    // Only set draggedCard once per drag operation
    if (!this.draggedCard) {
      this.draggedCard = { type, index };
      this.updateStatus(`Dragging card from ${type} ${index}...`);
    }
  }

  /**
   * Handle drag end on a card - determine drop target and move card
   */
  private async handleCardDragEnd(x: number, y: number): Promise<void> {
    if (!this.draggedCard) {
      return;
    }

    const from = this.draggedCard;
    this.draggedCard = null;

    // Use the tested drop zone detection logic
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
        // Can't move from foundation to foundation
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

    // Rebuild UI to show the move
    if (moved) {
      // Check for win and update status before rebuilding
      if (this.game.hasWon()) {
        this.currentStatus = 'Congratulations! You won!';
      }
      this.rebuildUI();
    }
  }

  /**
   * Rebuild the UI to reflect game state changes
   */
  private rebuildUI(): void {
    if (!this.window) return;

    this.window.setContent(() => {
      this.buildUI(this.window!);
    });
  }

  buildUI(win: Window): void {
    this.window = win;

    // Get base64-rendered images
    const emptySlotImage = this.getCardImage('back.svg');
    const backCardImage = this.getCardImage('back.svg');

    this.a.vbox(() => {
      // Action buttons
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.newGame()).withId('new-game-btn');
        this.a.button('Shuffle').onClick(() => this.shuffle()).withId('shuffle-btn');
        this.a.button('Draw').onClick(() => this.draw()).withId('draw-btn');
      });

      // Game area
      this.a.vbox(() => {
        // Draw pile and builds
          this.a.hbox(() => {
            const draws = this.game.getDrawCards();

            // Draw pile - show face-down cards or empty
            // Make it clickable to draw cards
            const handPileImg = this.game.getHandCount() > 0 ? backCardImage : emptySlotImage;
            this.handPileImage = this.a.image(handPileImg, 'original', () => this.draw()).withId('hand-pile');

            // Draw slots - show drawn cards or empty slots
            const draw1Img = draws.draw1 ? this.getCardImage(draws.draw1.imageFilename()) : emptySlotImage;
            const draw2Img = draws.draw2 ? this.getCardImage(draws.draw2.imageFilename()) : emptySlotImage;
            const draw3Img = draws.draw3 ? this.getCardImage(draws.draw3.imageFilename()) : emptySlotImage;

            this.draw1Image = this.a.image(draw1Img, 'original');
            this.draw2Image = this.a.image(draw2Img, 'original');
            // pseudo-declarative lines: imperative if/else for conditional rendering
            // Make draw3 clickable and draggable if there's a card there
            if (draws.draw3) {
              this.draw3Image = this.a.image(
                draw3Img,
                'original',
                () => this.handleCardClick('draw', 0),
                (x: number, y: number) => this.handleCardDrag('draw', 0, x, y),
                (x: number, y: number) => this.handleCardDragEnd(x, y)
              ).withId('draw3');
            } else {
              this.draw3Image = this.a.image(draw3Img, 'original');
            }
          });

          // Build piles (foundations)
          this.a.label('Foundations:');
          // More pseudo-declarative: use array method instead of for loop
          this.a.hbox(() => {
            [0, 1, 2, 3].forEach(buildIndex => {
              const cards = this.game.getBuildCards(buildIndex);
              const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
              const cardImg = topCard ? this.getCardImage(topCard.imageFilename()) : emptySlotImage;
              // Always clickable and draggable - can place cards on empty or occupied foundations
              this.a.image(
                cardImg,
                'original',
                () => this.handleCardClick('build', buildIndex),
                (x: number, y: number) => this.handleCardDrag('build', buildIndex, x, y),
                (x: number, y: number) => this.handleCardDragEnd(x, y)
              ).withId(`foundation-${buildIndex}`);
            });
          });

          // Tableau stacks
          this.a.label('Tableau:');
          // More pseudo-declarative: use array method instead of for loop
          this.a.hbox(() => {
            [0, 1, 2, 3, 4, 5, 6].forEach(stackIndex => {
              this.a.vbox(() => {
                const cards = this.game.getStackCards(stackIndex);
                // pseudo-declarative lines: imperative if/else for conditional rendering
                if (cards.length === 0) {
                  // Empty stack - clickable to place Kings
                  this.a.image(emptySlotImage, 'original', () => this.handleCardClick('stack', stackIndex)).withId(`empty-stack-${stackIndex}`);
                } else {
                  // pseudo-declarative lines: pre-computed values before declarative use
                  // Create overlapped composite image
                  const cardImages = cards.map(card => this.getCardImage(card.imageFilename()));
                  const compositeImage = this.cardImageProvider.getOverlappedCardsImage(cardImages, 120, 174, 87);

                  // Display composite image with click handler for top card
                  const topCard = cards[cards.length - 1];
                  // pseudo-declarative lines: imperative if/else for conditional rendering
                  if (topCard.faceUp) {
                    this.a.image(
                      compositeImage,
                      'original',
                      () => this.handleCardClick('stack', stackIndex),
                      (x: number, y: number) => this.handleCardDrag('stack', stackIndex, x, y),
                      (x: number, y: number) => this.handleCardDragEnd(x, y)
                    ).withId(`stack-${stackIndex}`);
                  } else {
                    this.a.image(compositeImage, 'original');
                  }
                }
              });
            });
          });
        });

      // Status
      this.statusLabel = this.a.label(this.currentStatus).withId('status-label');
    });
  }

  /**
   * Update only the draw pile widgets without rebuilding the entire UI
   * Kent Beck approach: update what changes, not everything
   */
  private async updateDrawPileUI(): Promise<void> {
    const emptySlotImage = this.getCardImage('back.svg');
    const backCardImage = this.getCardImage('back.svg');
    const draws = this.game.getDrawCards();

    // Update hand pile image
    if (this.handPileImage) {
      const handPileImg = this.game.getHandCount() > 0 ? backCardImage : emptySlotImage;
      await this.handPileImage.updateImage(handPileImg);
    }

    // Update draw slot images
    if (this.draw1Image) {
      const draw1Img = draws.draw1 ? this.getCardImage(draws.draw1.imageFilename()) : emptySlotImage;
      await this.draw1Image.updateImage(draw1Img);
    }

    if (this.draw2Image) {
      const draw2Img = draws.draw2 ? this.getCardImage(draws.draw2.imageFilename()) : emptySlotImage;
      await this.draw2Image.updateImage(draw2Img);
    }

    if (this.draw3Image) {
      const draw3Img = draws.draw3 ? this.getCardImage(draws.draw3.imageFilename()) : emptySlotImage;
      await this.draw3Image.updateImage(draw3Img);
    }
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
    this.currentStatus = message; // Store for rebuilds
    if (this.statusLabel) {
      await this.statusLabel.setText(message);
    }
  }

  /**
   * Get the game instance (for testing)
   */
  getGame(): Game {
    return this.game;
  }

  /**
   * Refresh the UI to reflect game state changes (for testing)
   */
  refreshUI(): void {
    this.rebuildUI();
  }
}

/**
 * Create the solitaire app
 * Based on: main.go
 * @param a The Tsyne App instance
 * @param cardImageProvider Optional card image provider (inject StubCardImageProvider for fast tests)
 */
export function createSolitaireApp(a: App, cardImageProvider?: CardImageProvider): SolitaireUI {
  const ui = new SolitaireUI(a, cardImageProvider);

  a.window({ title: 'Solitaire', width: 1000, height: 700 }, (win: Window) => {
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
  app(resolveTransport(), { title: 'Solitaire' }, (a: App) => {
    createSolitaireApp(a);
  });
}
