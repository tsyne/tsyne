/**
 * Mahjongg Solitaire App
 *
 * A faithful port of QmlMahjongg from https://gitlab.com/alaskalinuxuser/QmlMahjongg
 * Original author: alaskalinuxuser (Brian D.)
 * License: GPL-3.0
 *
 * A solitaire tile-matching game where players match pairs of identical tiles
 * to remove them from a multi-layered pyramid layout. Tiles can only be selected
 * if they are not blocked (no tile on top and at least one side free).
 *
 * @tsyne-app:name Mahjongg
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
 *   <rect x="2" y="4" width="8" height="10" rx="1" fill="#f5deb3" stroke="#8B4513"/>
 *   <rect x="6" y="2" width="8" height="10" rx="1" fill="#ffe4c4" stroke="#8B4513"/>
 *   <rect x="10" y="6" width="8" height="10" rx="1" fill="#faebd7" stroke="#8B4513"/>
 *   <text x="10" y="13" font-size="6" fill="#8B4513">M</text>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createMahjonggApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

import { app, resolveTransport  } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';

// ============================================================================
// Constants
// ============================================================================

// Tile dimensions (pixels in canvas)
const TILE_WIDTH = 32;
const TILE_HEIGHT = 44;
const TILE_OFFSET_3D = 4; // 3D offset per layer

// Board dimensions from original QmlMahjongg
const BOARD_WIDTH = 30;
const BOARD_HEIGHT = 16;

// Canvas dimensions
const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 420;

// Board layout configuration (from original GameLogic.js)
// '1' marks top-left of a tile, '2' marks top-right, '3' marks bottom-left, '4' marks bottom-right
// Tiles occupy 2x2 cells in this grid
const BOARD_CONFIG = [
  // Layer 0 (bottom)
  `..121212121212121212121212....` +
  `..434343434343434343434343....` +
  `......1212121212121212........` +
  `......4343434343434343........` +
  `....12121212121212121212......` +
  `....43434343434343434343......` +
  `..121212121212121212121212....` +
  `124343434343434343434343431212` +
  `431212121212121212121212124343` +
  `..434343434343434343434343....` +
  `....12121212121212121212......` +
  `....43434343434343434343......` +
  `......1212121212121212........` +
  `......4343434343434343........` +
  `..121212121212121212121212....` +
  `..434343434343434343434343....`,

  // Layer 1
  `..............................` +
  `..............................` +
  `........121212121212..........` +
  `........434343434343..........` +
  `........121212121212..........` +
  `........434343434343..........` +
  `........121212121212..........` +
  `........434343434343..........` +
  `........121212121212..........` +
  `........434343434343..........` +
  `........121212121212..........` +
  `........434343434343..........` +
  `........121212121212..........` +
  `........434343434343..........` +
  `..............................` +
  `..............................`,

  // Layer 2
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..........12121212............` +
  `..........43434343............` +
  `..........12121212............` +
  `..........43434343............` +
  `..........12121212............` +
  `..........43434343............` +
  `..........12121212............` +
  `..........43434343............` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................`,

  // Layer 3
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `............1212..............` +
  `............4343..............` +
  `............1212..............` +
  `............4343..............` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................`,

  // Layer 4 (top)
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `.............12...............` +
  `.............43...............` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................` +
  `..............................`,
];

// Tile type colors (simplified visual representation)
const TILE_COLORS: Array<{ bg: string; fg: string }> = [
  // Characters 1-9 (red family)
  { bg: '#FFFFF0', fg: '#8B0000' }, { bg: '#FFFFF0', fg: '#8B0000' }, { bg: '#FFFFF0', fg: '#8B0000' },
  { bg: '#FFFFF0', fg: '#8B0000' }, { bg: '#FFFFF0', fg: '#8B0000' }, { bg: '#FFFFF0', fg: '#8B0000' },
  { bg: '#FFFFF0', fg: '#8B0000' }, { bg: '#FFFFF0', fg: '#8B0000' }, { bg: '#FFFFF0', fg: '#8B0000' },
  // Bamboo 1-9 (green family)
  { bg: '#F0FFF0', fg: '#006400' }, { bg: '#F0FFF0', fg: '#006400' }, { bg: '#F0FFF0', fg: '#006400' },
  { bg: '#F0FFF0', fg: '#006400' }, { bg: '#F0FFF0', fg: '#006400' }, { bg: '#F0FFF0', fg: '#006400' },
  { bg: '#F0FFF0', fg: '#006400' }, { bg: '#F0FFF0', fg: '#006400' }, { bg: '#F0FFF0', fg: '#006400' },
  // Circles 1-9 (blue family)
  { bg: '#F0F8FF', fg: '#00008B' }, { bg: '#F0F8FF', fg: '#00008B' }, { bg: '#F0F8FF', fg: '#00008B' },
  { bg: '#F0F8FF', fg: '#00008B' }, { bg: '#F0F8FF', fg: '#00008B' }, { bg: '#F0F8FF', fg: '#00008B' },
  { bg: '#F0F8FF', fg: '#00008B' }, { bg: '#F0F8FF', fg: '#00008B' }, { bg: '#F0F8FF', fg: '#00008B' },
  // Winds (4)
  { bg: '#F5F5DC', fg: '#000080' }, { bg: '#F5F5DC', fg: '#000080' },
  { bg: '#F5F5DC', fg: '#000080' }, { bg: '#F5F5DC', fg: '#000080' },
  // Dragons (3)
  { bg: '#FFE4E1', fg: '#FF0000' }, { bg: '#E0FFE0', fg: '#00AA00' }, { bg: '#F5F5F5', fg: '#333333' },
  // Flowers (2)
  { bg: '#FFF0F5', fg: '#FF69B4' }, { bg: '#E6E6FA', fg: '#9370DB' },
];

// Tile type labels (short identifier)
const TILE_LABELS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9',  // Characters
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9',  // Bamboo
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9',  // Circles
  'E', 'S', 'W', 'N',  // Winds
  'R', 'G', 'W',  // Dragons
  'F1', 'F2',  // Flowers
];

// ============================================================================
// Game Types
// ============================================================================

interface Tile {
  index: number;      // Unique tile index (0-143)
  typeId: number;     // Tile type (1-36)
  x: number;          // Grid X position
  y: number;          // Grid Y position
  z: number;          // Layer (0-4)
  removed: boolean;   // Has been matched and removed
  selected: boolean;  // Currently selected
}

type GameState = 'playing' | 'won' | 'lost';

// ============================================================================
// Game Logic (ported from GameLogic.js)
// ============================================================================

export class MahjonggGame {
  private tiles: Tile[] = [];
  private selectedIndex: number = -1;
  private gameState: GameState = 'playing';
  private onUpdate?: () => void;
  private onGameEnd?: (state: GameState) => void;
  private moveCount: number = 0;

  constructor() {
    this.initBoard();
  }

  /**
   * Initialize the board with randomized tiles
   */
  initBoard(): void {
    this.tiles = [];
    this.selectedIndex = -1;
    this.gameState = 'playing';
    this.moveCount = 0;

    // Create tile IDs (36 types × 4 copies = 144 tiles)
    const tileIds = this.createTileIds();
    const shuffledIds = this.shuffle([...tileIds]);

    // Parse board configuration and place tiles
    let idIndex = 0;
    for (let z = 0; z < BOARD_CONFIG.length; z++) {
      const layer = BOARD_CONFIG[z];
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          const idx = y * BOARD_WIDTH + x;
          if (layer[idx] === '1') {
            // This is the top-left corner of a tile
            this.tiles.push({
              index: idIndex,
              typeId: shuffledIds[idIndex],
              x,
              y,
              z,
              removed: false,
              selected: false,
            });
            idIndex++;
          }
        }
      }
    }
  }

  /**
   * Create array of 144 tile IDs (36 types × 4 copies)
   */
  private createTileIds(): number[] {
    const ids: number[] = [];
    for (let i = 1; i <= 36; i++) {
      ids.push(i, i, i, i);
    }
    return ids;
  }

  /**
   * Fisher-Yates shuffle
   */
  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Check if a tile is blocked by adjacent tiles
   */
  isBlocked(tileIndex: number): boolean {
    const tile = this.tiles[tileIndex];
    if (!tile || tile.removed) return true;

    const activeTiles = this.tiles.filter(t => !t.removed);

    // Check if blocked from above (any tile on higher layer that overlaps)
    const hasOnTop = activeTiles.some(t =>
      t.z > tile.z &&
      Math.abs(t.x - tile.x) <= 1 &&
      Math.abs(t.y - tile.y) <= 1
    );
    if (hasOnTop) return true;

    // Check if blocked on both sides
    const hasLeft = activeTiles.some(t =>
      t.z === tile.z &&
      t.x === tile.x - 2 &&
      Math.abs(t.y - tile.y) <= 1
    );
    const hasRight = activeTiles.some(t =>
      t.z === tile.z &&
      t.x === tile.x + 2 &&
      Math.abs(t.y - tile.y) <= 1
    );

    return hasLeft && hasRight;
  }

  /**
   * Check if a tile is selectable (not removed and not blocked)
   */
  isSelectable(tileIndex: number): boolean {
    if (tileIndex < 0 || tileIndex >= this.tiles.length) return false;
    const tile = this.tiles[tileIndex];
    if (tile.removed) return false;
    return !this.isBlocked(tileIndex);
  }

  /**
   * Check if two tiles match (same type)
   */
  tilesMatch(index1: number, index2: number): boolean {
    const tile1 = this.tiles[index1];
    const tile2 = this.tiles[index2];
    if (!tile1 || !tile2) return false;
    return tile1.typeId === tile2.typeId;
  }

  /**
   * Handle tile click
   */
  clickTile(tileIndex: number): void {
    if (this.gameState !== 'playing') return;
    if (!this.isSelectable(tileIndex)) return;

    if (this.selectedIndex === -1) {
      // No tile selected yet - select this one
      this.tiles[tileIndex].selected = true;
      this.selectedIndex = tileIndex;
    } else if (this.selectedIndex === tileIndex) {
      // Clicked same tile - deselect
      this.tiles[tileIndex].selected = false;
      this.selectedIndex = -1;
    } else {
      // Different tile selected - check for match
      if (this.tilesMatch(this.selectedIndex, tileIndex)) {
        // Match found - remove both tiles
        this.tiles[this.selectedIndex].removed = true;
        this.tiles[this.selectedIndex].selected = false;
        this.tiles[tileIndex].removed = true;
        this.moveCount++;
        this.selectedIndex = -1;

        // Check game state
        if (this.isGameWon()) {
          this.gameState = 'won';
          this.onGameEnd?.('won');
        } else if (this.isGameLost()) {
          this.gameState = 'lost';
          this.onGameEnd?.('lost');
        }
      } else {
        // No match - deselect previous, select new
        this.tiles[this.selectedIndex].selected = false;
        this.tiles[tileIndex].selected = true;
        this.selectedIndex = tileIndex;
      }
    }

    this.onUpdate?.();
  }

  /**
   * Check if game is won (all tiles removed)
   */
  isGameWon(): boolean {
    return this.tiles.every(t => t.removed);
  }

  /**
   * Check if game is lost (no more valid moves)
   */
  isGameLost(): boolean {
    const selectableTiles = this.tiles
      .filter((_, i) => this.isSelectable(i))
      .map(t => t.typeId)
      .sort((a, b) => a - b);

    // Check if any pairs exist among selectable tiles
    for (let i = 0; i < selectableTiles.length - 1; i++) {
      if (selectableTiles[i] === selectableTiles[i + 1]) {
        return false; // Found a valid pair
      }
    }
    return selectableTiles.length > 0; // No pairs but tiles remain = lost
  }

  /**
   * Get all tiles
   */
  getTiles(): Tile[] {
    return this.tiles;
  }

  /**
   * Get remaining tile count
   */
  getRemainingCount(): number {
    return this.tiles.filter(t => !t.removed).length;
  }

  /**
   * Get move count
   */
  getMoveCount(): number {
    return this.moveCount;
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Set update callback
   */
  setOnUpdate(callback: () => void): void {
    this.onUpdate = callback;
  }

  /**
   * Set game end callback
   */
  setOnGameEnd(callback: (state: GameState) => void): void {
    this.onGameEnd = callback;
  }

  /**
   * Find all valid moves (pairs of matching selectable tiles)
   */
  getValidMoves(): Array<[number, number]> {
    const moves: Array<[number, number]> = [];
    const selectable = this.tiles
      .map((t, i) => ({ tile: t, index: i }))
      .filter(({ index }) => this.isSelectable(index));

    for (let i = 0; i < selectable.length; i++) {
      for (let j = i + 1; j < selectable.length; j++) {
        if (selectable[i].tile.typeId === selectable[j].tile.typeId) {
          moves.push([selectable[i].index, selectable[j].index]);
        }
      }
    }
    return moves;
  }

  /**
   * Get a hint (one valid move)
   */
  getHint(): [number, number] | null {
    const moves = this.getValidMoves();
    return moves.length > 0 ? moves[0] : null;
  }

  /**
   * Find tile at canvas position
   */
  findTileAt(canvasX: number, canvasY: number): number {
    // Check tiles from top to bottom (highest z first)
    const sortedTiles = [...this.tiles]
      .filter(t => !t.removed)
      .sort((a, b) => b.z - a.z);

    for (const tile of sortedTiles) {
      const { x: tileX, y: tileY } = this.getTileScreenPosition(tile);
      if (
        canvasX >= tileX &&
        canvasX < tileX + TILE_WIDTH &&
        canvasY >= tileY &&
        canvasY < tileY + TILE_HEIGHT
      ) {
        return tile.index;
      }
    }
    return -1;
  }

  /**
   * Calculate screen position for a tile
   */
  getTileScreenPosition(tile: Tile): { x: number; y: number } {
    return {
      x: tile.x * (TILE_WIDTH / 2) + tile.z * TILE_OFFSET_3D + TILE_OFFSET_3D,
      y: tile.y * (TILE_HEIGHT / 2) + tile.z * TILE_OFFSET_3D + TILE_OFFSET_3D,
    };
  }

  /**
   * Get tile type label
   */
  static getTileLabel(typeId: number): string {
    return TILE_LABELS[typeId - 1] || '?';
  }

  /**
   * Get tile type colors
   */
  static getTileColors(typeId: number): { bg: string; fg: string } {
    return TILE_COLORS[typeId - 1] || { bg: '#FFFFFF', fg: '#000000' };
  }
}

// ============================================================================
// UI Class
// ============================================================================

export class MahjonggUI {
  private game: MahjonggGame;
  private a: App;
  private win: Window | null = null;
  private canvas: TappableCanvasRaster | null = null;
  private statusLabel: Label | null = null;
  private tilesLabel: Label | null = null;
  private movesLabel: Label | null = null;
  private messageLabel: Label | null = null;

  constructor(a: App) {
    this.a = a;
    this.game = new MahjonggGame();
    this.game.setOnUpdate(() => this.renderBoard());
    this.game.setOnGameEnd((state) => this.handleGameEnd(state));
  }

  /**
   * Build main menu
   */
  private buildMainMenu(win: Window): void {
    win.setMainMenu([
      {
        label: 'Game',
        items: [
          { label: 'New Game', onSelected: () => this.newGame() },
          { label: '', isSeparator: true },
          { label: 'Hint', onSelected: () => this.showHint() },
          { label: '', isSeparator: true },
          { label: 'Exit', onSelected: () => process.exit(0) },
        ],
      },
      {
        label: 'Help',
        items: [
          { label: 'How to Play', onSelected: () => this.showHelp() },
          { label: 'About', onSelected: () => this.showAbout() },
        ],
      },
    ]);
  }

  /**
   * Setup window
   */
  setupWindow(win: Window): void {
    this.win = win;
    this.buildMainMenu(win);
  }

  /**
   * Build the UI content
   */
  buildContent(): void {
    this.a.vbox(() => {
      // Control buttons
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.newGame()).withId('newGameBtn');
        this.a.button('Hint').onClick(() => this.showHint()).withId('hintBtn');
      });

      // Status bar
      this.a.hbox(() => {
        this.a.label('Tiles: ');
        this.tilesLabel = this.a.label('144').withId('tilesCount');
        this.a.label(' | Moves: ');
        this.movesLabel = this.a.label('0').withId('movesCount');
        this.a.label(' | ');
        this.statusLabel = this.a.label('Playing').withId('gameStatus');
      });

      this.a.separator();

      // Message area (for win/lose messages)
      this.messageLabel = this.a.label('').withId('gameMessage');

      // Game board using tappable canvas
      this.canvas = this.a.tappableCanvasRaster(CANVAS_WIDTH, CANVAS_HEIGHT, {
        onTap: (x, y) => this.handleBoardClick(x, y),
      });
      // Note: TappableCanvasRaster doesn't support withId, using label for identification
      this.a.label('').withId('gameBoard');

      // Instructions
      this.a.separator();
      this.a.label('Click matching pairs of free tiles to remove them');
    });
  }

  /**
   * Handle click on the game board
   */
  private handleBoardClick(x: number, y: number): void {
    const tileIndex = this.game.findTileAt(x, y);
    if (tileIndex >= 0) {
      this.game.clickTile(tileIndex);
    }
  }

  /**
   * Parse hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      };
    }
    return { r: 0, g: 0, b: 0 };
  }

  /**
   * Set a pixel in the buffer (helper for efficient rendering)
   */
  private setPixel(buffer: Uint8Array, x: number, y: number, r: number, g: number, b: number): void {
    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
      const offset = (y * CANVAS_WIDTH + x) * 4;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
      buffer[offset + 3] = 255;
    }
  }

  /**
   * Render the entire board to the canvas
   */
  async renderBoard(): Promise<void> {
    if (!this.canvas) return;

    // Use efficient buffer-based rendering
    const buffer = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 4);

    // Wood background color
    const woodBg = this.hexToRgb('#8B4513');

    // Fill background
    for (let i = 0; i < CANVAS_WIDTH * CANVAS_HEIGHT; i++) {
      const offset = i * 4;
      buffer[offset] = woodBg.r;
      buffer[offset + 1] = woodBg.g;
      buffer[offset + 2] = woodBg.b;
      buffer[offset + 3] = 255;
    }

    // Sort tiles by z-index (lowest first, so higher tiles are drawn on top)
    const sortedTiles = [...this.game.getTiles()]
      .filter(t => !t.removed)
      .sort((a, b) => a.z - b.z);

    // Draw each tile
    for (const tile of sortedTiles) {
      this.drawTileToBuffer(buffer, tile);
    }

    // Update canvas with single efficient call
    await this.canvas.setPixelBuffer(buffer);

    // Update status labels
    await this.updateStatus();
  }

  /**
   * Draw a single tile to the buffer
   */
  private drawTileToBuffer(buffer: Uint8Array, tile: Tile): void {
    const pos = this.game.getTileScreenPosition(tile);
    const colors = MahjonggGame.getTileColors(tile.typeId);
    const bgColor = tile.selected ? this.hexToRgb('#FFE4B5') : this.hexToRgb(colors.bg);
    const shadowColor = this.hexToRgb('#654321');
    const borderColor = tile.selected ? this.hexToRgb('#FF0000') : this.hexToRgb('#8B4513');

    // Draw 3D shadow (bottom-left offset)
    for (let dy = 0; dy < TILE_HEIGHT; dy++) {
      for (let dx = 0; dx < TILE_OFFSET_3D; dx++) {
        this.setPixel(buffer, pos.x - TILE_OFFSET_3D + dx, pos.y + dy,
          shadowColor.r, shadowColor.g, shadowColor.b);
      }
    }

    // Draw bottom shadow
    for (let dy = 0; dy < TILE_OFFSET_3D; dy++) {
      for (let dx = 0; dx < TILE_WIDTH; dx++) {
        this.setPixel(buffer, pos.x - TILE_OFFSET_3D + dx, pos.y + TILE_HEIGHT + dy - TILE_OFFSET_3D,
          shadowColor.r, shadowColor.g, shadowColor.b);
      }
    }

    // Draw tile background
    for (let dy = 0; dy < TILE_HEIGHT; dy++) {
      for (let dx = 0; dx < TILE_WIDTH; dx++) {
        // Border
        const isBorder = dx === 0 || dx === TILE_WIDTH - 1 || dy === 0 || dy === TILE_HEIGHT - 1;
        const color = isBorder ? borderColor : bgColor;
        this.setPixel(buffer, pos.x + dx, pos.y + dy, color.r, color.g, color.b);
      }
    }

    // Draw tile type indicator (simple colored square in center)
    const fgColor = this.hexToRgb(colors.fg);
    const indicatorSize = 12;
    const startX = pos.x + Math.floor((TILE_WIDTH - indicatorSize) / 2);
    const startY = pos.y + Math.floor((TILE_HEIGHT - indicatorSize) / 2);

    for (let dy = 0; dy < indicatorSize; dy++) {
      for (let dx = 0; dx < indicatorSize; dx++) {
        this.setPixel(buffer, startX + dx, startY + dy, fgColor.r, fgColor.g, fgColor.b);
      }
    }
  }

  /**
   * Update status labels
   */
  private async updateStatus(): Promise<void> {
    if (this.tilesLabel) {
      await this.tilesLabel.setText(String(this.game.getRemainingCount()));
    }
    if (this.movesLabel) {
      await this.movesLabel.setText(String(this.game.getMoveCount()));
    }

    const validMoves = this.game.getValidMoves().length;
    if (this.statusLabel) {
      const state = this.game.getGameState();
      if (state === 'playing') {
        await this.statusLabel.setText(`Playing (${validMoves} moves)`);
      } else {
        await this.statusLabel.setText(state === 'won' ? 'You Won!' : 'No more moves');
      }
    }
  }

  /**
   * Handle game end
   */
  private async handleGameEnd(state: GameState): Promise<void> {
    if (this.messageLabel) {
      if (state === 'won') {
        await this.messageLabel.setText('Congratulations! You matched all tiles!');
      } else {
        await this.messageLabel.setText('No more valid moves. Game Over!');
      }
    }

    if (this.win) {
      const message = state === 'won'
        ? `Congratulations! You won in ${this.game.getMoveCount()} moves!`
        : 'No more valid moves available. Try again?';
      const title = state === 'won' ? 'Victory!' : 'Game Over';
      await this.win.showInfo(title, message);
    }
  }

  /**
   * Start a new game
   */
  async newGame(): Promise<void> {
    this.game.initBoard();
    if (this.messageLabel) {
      await this.messageLabel.setText('');
    }
    await this.renderBoard();
  }

  /**
   * Show a hint
   */
  async showHint(): Promise<void> {
    const hint = this.game.getHint();
    if (hint && this.win) {
      const [idx1] = hint;
      const tile1 = this.game.getTiles()[idx1];
      const label = MahjonggGame.getTileLabel(tile1.typeId);
      await this.win.showInfo('Hint', `Look for matching "${label}" tiles`);
    } else if (this.win) {
      await this.win.showInfo('No Hint', 'No valid moves available!');
    }
  }

  /**
   * Show help
   */
  async showHelp(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo(
      'How to Play Mahjongg',
      'Mahjongg Solitaire Rules:\n\n' +
      '1. Click on matching pairs of tiles to remove them\n' +
      '2. A tile is "free" if it has no tile on top AND\n' +
      '   at least one side (left or right) is clear\n' +
      '3. Match all 144 tiles to win\n' +
      '4. If no more matches are possible, you lose\n\n' +
      'Tips:\n' +
      '- Look for tiles on the top layers first\n' +
      '- Try to keep the board balanced\n' +
      '- Use the Hint button when stuck'
    );
  }

  /**
   * Show about dialog
   */
  async showAbout(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo(
      'About Mahjongg',
      'Mahjongg Solitaire v1.0.0\n\n' +
      'A faithful port of QmlMahjongg\n' +
      'Original: gitlab.com/alaskalinuxuser/QmlMahjongg\n' +
      'Original author: alaskalinuxuser (Brian D.)\n' +
      'License: GPL-3.0\n\n' +
      'Ported to Tsyne framework'
    );
  }

  /**
   * Initialize display after setup
   */
  async initialize(): Promise<void> {
    await this.renderBoard();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    // Nothing to clean up currently
  }
}

// ============================================================================
// App Factory
// ============================================================================

/**
 * Create the Mahjongg app
 */
export function createMahjonggApp(a: App, windowWidth?: number, windowHeight?: number): MahjonggUI {
  const ui = new MahjonggUI(a);
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  a.registerCleanup(() => ui.cleanup());

  if (isEmbedded) {
    // PhoneTop/embedded mode: build content directly without a window
    ui.buildContent();
    setTimeout(() => ui.initialize(), 0);
  } else {
    // Standalone/desktop mode: create a window
    a.window({ title: 'Mahjongg Solitaire', width: 600, height: 550 }, (win: Window) => {
      ui.setupWindow(win);
      win.setContent(() => ui.buildContent());
      win.show();
      setTimeout(() => ui.initialize(), 0);
    });
  }

  return ui;
}

// Export for testing
export { TILE_COLORS, TILE_LABELS, BOARD_CONFIG, TILE_WIDTH, TILE_HEIGHT };

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  app(resolveTransport(), { title: 'Mahjongg Solitaire' }, async (a: App) => {
    const ui = createMahjonggApp(a);
    await a.run();
    await ui.initialize();
  });
}
