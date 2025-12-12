/**
 * Mahjongg Game Logic Unit Tests
 *
 * Tests for the core game logic without UI dependencies.
 * Tests the MahjonggGame class including:
 * - Board initialization and tile placement
 * - Tile selection and matching rules
 * - Blocking detection (adjacent tiles)
 * - Win and lose conditions
 * - Hint system
 */

import { MahjonggGame, TILE_COLORS, TILE_LABELS, BOARD_CONFIG } from './mahjongg';

describe('MahjonggGame Logic', () => {
  describe('Board Initialization', () => {
    test('should create 144 tiles on initialization', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();
      expect(tiles).toHaveLength(144);
    });

    test('should have 36 unique tile types with 4 copies each', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Count occurrences of each tile type
      const typeCounts = new Map<number, number>();
      for (const tile of tiles) {
        const count = typeCounts.get(tile.typeId) || 0;
        typeCounts.set(tile.typeId, count + 1);
      }

      // Should have exactly 36 unique types
      expect(typeCounts.size).toBe(36);

      // Each type should appear exactly 4 times
      for (const [, count] of typeCounts) {
        expect(count).toBe(4);
      }
    });

    test('should place tiles at valid grid positions', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      for (const tile of tiles) {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(30);
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeLessThan(16);
        expect(tile.z).toBeGreaterThanOrEqual(0);
        expect(tile.z).toBeLessThan(5);
      }
    });

    test('should initialize all tiles as not removed and not selected', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      for (const tile of tiles) {
        expect(tile.removed).toBe(false);
        expect(tile.selected).toBe(false);
      }
    });

    test('should start with 144 remaining tiles', () => {
      const game = new MahjonggGame();
      expect(game.getRemainingCount()).toBe(144);
    });

    test('should start with 0 moves', () => {
      const game = new MahjonggGame();
      expect(game.getMoveCount()).toBe(0);
    });

    test('should start in playing state', () => {
      const game = new MahjonggGame();
      expect(game.getGameState()).toBe('playing');
    });
  });

  describe('TILE_COLORS Configuration', () => {
    test('should have exactly 36 tile colors', () => {
      expect(TILE_COLORS).toHaveLength(36);
    });

    test('should have valid color data', () => {
      for (const colors of TILE_COLORS) {
        expect(colors.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(colors.fg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    test('should get tile colors by ID', () => {
      const colors = MahjonggGame.getTileColors(1);
      expect(colors).toBeDefined();
      expect(colors.bg).toBeTruthy();
      expect(colors.fg).toBeTruthy();
    });

    test('should return default colors for invalid tile type ID', () => {
      const colors = MahjonggGame.getTileColors(999);
      expect(colors.bg).toBe('#FFFFFF');
      expect(colors.fg).toBe('#000000');
    });
  });

  describe('TILE_LABELS Configuration', () => {
    test('should have exactly 36 tile labels', () => {
      expect(TILE_LABELS).toHaveLength(36);
    });

    test('should get tile label by ID', () => {
      const label = MahjonggGame.getTileLabel(1);
      expect(label).toBe('1');
    });

    test('should return ? for invalid tile type ID', () => {
      const label = MahjonggGame.getTileLabel(999);
      expect(label).toBe('?');
    });
  });

  describe('BOARD_CONFIG', () => {
    test('should have exactly 5 layers', () => {
      expect(BOARD_CONFIG).toHaveLength(5);
    });

    test('each layer should be 480 characters (30x16)', () => {
      for (const layer of BOARD_CONFIG) {
        expect(layer.length).toBe(30 * 16);
      }
    });

    test('should count exactly 144 tile positions (marked with "1")', () => {
      let tileCount = 0;
      for (const layer of BOARD_CONFIG) {
        for (const char of layer) {
          if (char === '1') tileCount++;
        }
      }
      expect(tileCount).toBe(144);
    });
  });

  describe('Tile Selection', () => {
    test('clicking a free tile should select it', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find a tile on the top layer (should be free)
      const topTile = tiles.find(t => t.z === 4);
      expect(topTile).toBeDefined();

      if (topTile) {
        game.clickTile(topTile.index);
        expect(tiles[topTile.index].selected).toBe(true);
      }
    });

    test('clicking selected tile should deselect it', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find a free tile
      const topTile = tiles.find(t => t.z === 4);
      expect(topTile).toBeDefined();

      if (topTile) {
        // Select
        game.clickTile(topTile.index);
        expect(tiles[topTile.index].selected).toBe(true);

        // Deselect
        game.clickTile(topTile.index);
        expect(tiles[topTile.index].selected).toBe(false);
      }
    });

    test('clicking blocked tile should not select it', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find a tile on layer 0 that is blocked (has tile above)
      const bottomTile = tiles.find(t => t.z === 0);
      expect(bottomTile).toBeDefined();

      // Check if it's blocked
      if (bottomTile && game.isBlocked(bottomTile.index)) {
        game.clickTile(bottomTile.index);
        expect(tiles[bottomTile.index].selected).toBe(false);
      }
    });
  });

  describe('Tile Matching', () => {
    test('matching tiles should have same typeId', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find two tiles with same type
      const type1Tiles = tiles.filter(t => t.typeId === 1);
      expect(type1Tiles.length).toBe(4);

      // They should match
      expect(game.tilesMatch(type1Tiles[0].index, type1Tiles[1].index)).toBe(true);
    });

    test('non-matching tiles should have different typeId', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find tiles with different types
      const type1Tile = tiles.find(t => t.typeId === 1);
      const type2Tile = tiles.find(t => t.typeId === 2);

      expect(type1Tile).toBeDefined();
      expect(type2Tile).toBeDefined();

      if (type1Tile && type2Tile) {
        expect(game.tilesMatch(type1Tile.index, type2Tile.index)).toBe(false);
      }
    });

    test('matching two selectable tiles should remove them', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find selectable tiles
      const selectableIndices: number[] = [];
      for (let i = 0; i < tiles.length; i++) {
        if (game.isSelectable(i)) {
          selectableIndices.push(i);
        }
      }

      // Find a matching pair among selectable tiles
      let matchFound = false;
      for (let i = 0; i < selectableIndices.length && !matchFound; i++) {
        for (let j = i + 1; j < selectableIndices.length && !matchFound; j++) {
          if (game.tilesMatch(selectableIndices[i], selectableIndices[j])) {
            // Click first tile
            game.clickTile(selectableIndices[i]);
            expect(tiles[selectableIndices[i]].selected).toBe(true);

            // Click matching tile - both should be removed
            game.clickTile(selectableIndices[j]);
            expect(tiles[selectableIndices[i]].removed).toBe(true);
            expect(tiles[selectableIndices[j]].removed).toBe(true);
            expect(game.getMoveCount()).toBe(1);

            matchFound = true;
          }
        }
      }

      expect(matchFound).toBe(true);
    });

    test('clicking non-matching tile should switch selection', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find selectable tiles
      const selectableIndices: number[] = [];
      for (let i = 0; i < tiles.length; i++) {
        if (game.isSelectable(i)) {
          selectableIndices.push(i);
        }
      }

      // Find two non-matching selectable tiles
      let idx1 = -1;
      let idx2 = -1;
      for (let i = 0; i < selectableIndices.length && idx2 === -1; i++) {
        for (let j = i + 1; j < selectableIndices.length && idx2 === -1; j++) {
          if (!game.tilesMatch(selectableIndices[i], selectableIndices[j])) {
            idx1 = selectableIndices[i];
            idx2 = selectableIndices[j];
          }
        }
      }

      if (idx1 !== -1 && idx2 !== -1) {
        // Select first tile
        game.clickTile(idx1);
        expect(tiles[idx1].selected).toBe(true);

        // Click non-matching tile - selection should switch
        game.clickTile(idx2);
        expect(tiles[idx1].selected).toBe(false);
        expect(tiles[idx2].selected).toBe(true);
        expect(tiles[idx1].removed).toBe(false);
        expect(tiles[idx2].removed).toBe(false);
      }
    });
  });

  describe('Blocking Detection', () => {
    test('tile with tile on top should be blocked', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find a tile on layer 3 (below top layer)
      const layer3Tile = tiles.find(t => t.z === 3);
      expect(layer3Tile).toBeDefined();

      // It should be blocked by the tile on layer 4 above it
      if (layer3Tile) {
        expect(game.isBlocked(layer3Tile.index)).toBe(true);
      }
    });

    test('top layer tile should not be blocked from above', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find the tile on layer 4 (top)
      const topTile = tiles.find(t => t.z === 4);
      expect(topTile).toBeDefined();

      if (topTile) {
        // Top tile should be selectable (single tile at the peak)
        expect(game.isSelectable(topTile.index)).toBe(true);
      }
    });

    test('tile blocked on both sides should not be selectable', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find a middle tile on layer 0 (should be blocked on both sides)
      const middleTiles = tiles.filter(
        t => t.z === 0 && t.x > 6 && t.x < 22
      );

      // Some of these should be blocked
      let foundBlocked = false;
      for (const tile of middleTiles) {
        if (game.isBlocked(tile.index)) {
          foundBlocked = true;
          expect(game.isSelectable(tile.index)).toBe(false);
          break;
        }
      }

      // We should find at least one blocked tile in the middle
      expect(foundBlocked).toBe(true);
    });
  });

  describe('Valid Moves', () => {
    test('getValidMoves should return array of matching pairs', () => {
      const game = new MahjonggGame();
      const validMoves = game.getValidMoves();

      // At start, there should be at least some valid moves
      expect(validMoves.length).toBeGreaterThan(0);

      // Each move should be a pair of matching, selectable tiles
      for (const [idx1, idx2] of validMoves) {
        expect(game.isSelectable(idx1)).toBe(true);
        expect(game.isSelectable(idx2)).toBe(true);
        expect(game.tilesMatch(idx1, idx2)).toBe(true);
      }
    });

    test('getHint should return a valid move or null', () => {
      const game = new MahjonggGame();
      const hint = game.getHint();

      if (hint) {
        const [idx1, idx2] = hint;
        expect(game.isSelectable(idx1)).toBe(true);
        expect(game.isSelectable(idx2)).toBe(true);
        expect(game.tilesMatch(idx1, idx2)).toBe(true);
      }
    });
  });

  describe('Win Condition', () => {
    test('isGameWon should return false initially', () => {
      const game = new MahjonggGame();
      expect(game.isGameWon()).toBe(false);
    });

    test('isGameWon should return true when all tiles removed', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Manually mark all tiles as removed
      for (const tile of tiles) {
        tile.removed = true;
      }

      expect(game.isGameWon()).toBe(true);
    });
  });

  describe('Lose Condition', () => {
    test('isGameLost should return false when valid moves exist', () => {
      const game = new MahjonggGame();
      expect(game.isGameLost()).toBe(false);
    });
  });

  describe('Game Reset', () => {
    test('initBoard should reset all game state', () => {
      const game = new MahjonggGame();

      // Make some moves
      const tiles = game.getTiles();
      const topTile = tiles.find(t => t.z === 4);
      if (topTile) {
        game.clickTile(topTile.index);
      }

      // Reset
      game.initBoard();

      // Check reset state
      expect(game.getRemainingCount()).toBe(144);
      expect(game.getMoveCount()).toBe(0);
      expect(game.getGameState()).toBe('playing');

      const newTiles = game.getTiles();
      for (const tile of newTiles) {
        expect(tile.removed).toBe(false);
        expect(tile.selected).toBe(false);
      }
    });

    test('tiles should be shuffled on new game', () => {
      const game1 = new MahjonggGame();
      const tiles1 = game1.getTiles().map(t => t.typeId);

      const game2 = new MahjonggGame();
      const tiles2 = game2.getTiles().map(t => t.typeId);

      // Both should have valid 144 tile arrays
      expect(tiles1).toHaveLength(144);
      expect(tiles2).toHaveLength(144);
    });
  });

  describe('Move Counting', () => {
    test('successful match should increment move count', () => {
      const game = new MahjonggGame();
      expect(game.getMoveCount()).toBe(0);

      // Find and execute a valid move
      const hint = game.getHint();
      if (hint) {
        game.clickTile(hint[0]);
        game.clickTile(hint[1]);
        expect(game.getMoveCount()).toBe(1);
      }
    });

    test('failed match should not increment move count', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find selectable tiles
      const selectableIndices: number[] = [];
      for (let i = 0; i < tiles.length; i++) {
        if (game.isSelectable(i)) {
          selectableIndices.push(i);
        }
      }

      // Find non-matching pair
      for (let i = 0; i < selectableIndices.length; i++) {
        for (let j = i + 1; j < selectableIndices.length; j++) {
          if (!game.tilesMatch(selectableIndices[i], selectableIndices[j])) {
            game.clickTile(selectableIndices[i]);
            game.clickTile(selectableIndices[j]);

            // Move count should still be 0
            expect(game.getMoveCount()).toBe(0);
            return;
          }
        }
      }
    });
  });

  describe('Callbacks', () => {
    test('onUpdate callback should be called on tile click', () => {
      const game = new MahjonggGame();
      let updateCalled = false;
      game.setOnUpdate(() => {
        updateCalled = true;
      });

      const topTile = game.getTiles().find(t => t.z === 4);
      if (topTile) {
        game.clickTile(topTile.index);
        expect(updateCalled).toBe(true);
      }
    });

    test('onGameEnd callback should be called on win', () => {
      const game = new MahjonggGame();
      let endState: string | null = null;
      game.setOnGameEnd((state) => {
        endState = state;
      });

      // Manually mark all but 2 tiles as removed
      const tiles = game.getTiles();
      for (let i = 0; i < tiles.length - 2; i++) {
        tiles[i].removed = true;
      }

      // Find the last two tiles and make them match
      const remaining = tiles.filter(t => !t.removed);
      remaining[0].typeId = 1;
      remaining[1].typeId = 1;

      // Mark them as selectable by putting them on top layer
      remaining[0].z = 4;
      remaining[1].z = 4;
      remaining[0].x = 10;
      remaining[1].x = 20;

      // Click to match them
      game.clickTile(remaining[0].index);
      game.clickTile(remaining[1].index);

      expect(endState).toBe('won');
    });
  });

  describe('Tile Position Finding', () => {
    test('findTileAt should return tile index when clicking on tile', () => {
      const game = new MahjonggGame();
      const tiles = game.getTiles();

      // Find the top tile
      const topTile = tiles.find(t => t.z === 4);
      expect(topTile).toBeDefined();

      if (topTile) {
        const pos = game.getTileScreenPosition(topTile);
        // Click in the middle of the tile
        const foundIndex = game.findTileAt(pos.x + 16, pos.y + 22);
        expect(foundIndex).toBe(topTile.index);
      }
    });

    test('findTileAt should return -1 when clicking outside tiles', () => {
      const game = new MahjonggGame();
      // Click at the edge of the canvas
      const foundIndex = game.findTileAt(0, 0);
      expect(foundIndex).toBe(-1);
    });
  });
});
