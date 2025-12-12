/**
 * Falling Letters Game Logic Unit Tests
 */

import {
  FallingLettersGame,
  LETTER_FREQUENCIES,
  LETTER_SCORES,
  WORD_LIST,
  NUM_COLUMNS,
  MAX_ROWS
} from './falling-letters';

describe('FallingLettersGame', () => {
  describe('initialization', () => {
    test('should start in ready state', () => {
      const game = new FallingLettersGame();
      expect(game.getGameState()).toBe('ready');
    });

    test('should have empty columns initially', () => {
      const game = new FallingLettersGame();
      const columns = game.getColumns();
      expect(columns.length).toBe(NUM_COLUMNS);
      for (const col of columns) {
        expect(col.length).toBe(0);
      }
    });

    test('should have empty current word initially', () => {
      const game = new FallingLettersGame();
      expect(game.getCurrentWord()).toBe('');
    });

    test('should have zero score initially', () => {
      const game = new FallingLettersGame();
      expect(game.getScore()).toBe(0);
    });

    test('should have no selected cells initially', () => {
      const game = new FallingLettersGame();
      expect(game.getSelectedCells()).toEqual([]);
    });
  });

  describe('startGame', () => {
    test('should change state to playing', () => {
      const game = new FallingLettersGame();
      game.startGame();
      expect(game.getGameState()).toBe('playing');
    });

    test('should reset score', () => {
      const game = new FallingLettersGame();
      game.startGame();
      expect(game.getScore()).toBe(0);
    });

    test('should clear columns', () => {
      const game = new FallingLettersGame();
      game.startGame();
      const columns = game.getColumns();
      for (const col of columns) {
        expect(col.length).toBe(0);
      }
    });

    test('should call onUpdate callback', () => {
      const game = new FallingLettersGame();
      let updateCalled = false;
      game.setOnUpdate(() => { updateCalled = true; });
      game.startGame();
      expect(updateCalled).toBe(true);
    });
  });

  describe('word validation', () => {
    test('should accept valid 3-letter words', () => {
      const game = new FallingLettersGame();
      expect(game.isValidWord('THE')).toBe(true);
      expect(game.isValidWord('AND')).toBe(true);
      expect(game.isValidWord('CAT')).toBe(true);
    });

    test('should accept valid longer words', () => {
      const game = new FallingLettersGame();
      expect(game.isValidWord('ABOUT')).toBe(true);
      expect(game.isValidWord('BECAUSE')).toBe(true);
    });

    test('should reject words shorter than 3 letters', () => {
      const game = new FallingLettersGame();
      expect(game.isValidWord('A')).toBe(false);
      expect(game.isValidWord('IT')).toBe(false);
    });

    test('should reject invalid words', () => {
      const game = new FallingLettersGame();
      expect(game.isValidWord('XYZ')).toBe(false);
      expect(game.isValidWord('ASDFGH')).toBe(false);
    });

    test('should be case insensitive', () => {
      const game = new FallingLettersGame();
      expect(game.isValidWord('the')).toBe(true);
      expect(game.isValidWord('The')).toBe(true);
      expect(game.isValidWord('THE')).toBe(true);
    });
  });

  describe('cell selection', () => {
    test('should not select when not playing', () => {
      const game = new FallingLettersGame();
      game.selectCell(0, 0);
      expect(game.getSelectedCells()).toEqual([]);
    });

    test('should not select invalid column', () => {
      const game = new FallingLettersGame();
      game.startGame();
      game.selectCell(-1, 0);
      game.selectCell(NUM_COLUMNS, 0);
      expect(game.getSelectedCells()).toEqual([]);
    });
  });

  describe('pause', () => {
    test('should toggle to paused state', () => {
      const game = new FallingLettersGame();
      game.startGame();
      game.togglePause();
      expect(game.getGameState()).toBe('paused');
    });

    test('should toggle back to playing state', () => {
      const game = new FallingLettersGame();
      game.startGame();
      game.togglePause();
      game.togglePause();
      expect(game.getGameState()).toBe('playing');
    });

    test('should not pause when not playing', () => {
      const game = new FallingLettersGame();
      game.togglePause();
      expect(game.getGameState()).toBe('ready');
    });
  });

  describe('tick', () => {
    test('should not tick when not playing', () => {
      const game = new FallingLettersGame();
      game.tick();
      const columns = game.getColumns();
      let totalLetters = 0;
      for (const col of columns) {
        totalLetters += col.length;
      }
      expect(totalLetters).toBe(0);
    });

    test('should not tick when paused', () => {
      const game = new FallingLettersGame();
      game.startGame();
      game.togglePause();
      const initialColumns = game.getColumns().map(c => [...c]);
      game.tick();
      // Columns should not have changed
      const columns = game.getColumns();
      for (let i = 0; i < NUM_COLUMNS; i++) {
        expect(columns[i].length).toBe(initialColumns[i].length);
      }
    });
  });

  describe('clear selection', () => {
    test('should clear current word', () => {
      const game = new FallingLettersGame();
      game.startGame();
      game.clearSelection();
      expect(game.getCurrentWord()).toBe('');
    });

    test('should clear selected cells', () => {
      const game = new FallingLettersGame();
      game.startGame();
      game.clearSelection();
      expect(game.getSelectedCells()).toEqual([]);
    });
  });
});

describe('LETTER_FREQUENCIES', () => {
  test('should have 26 letters', () => {
    expect(Object.keys(LETTER_FREQUENCIES).length).toBe(26);
  });

  test('should have all uppercase letters', () => {
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      expect(LETTER_FREQUENCIES[letter]).toBeDefined();
    }
  });

  test('should have positive frequencies', () => {
    for (const freq of Object.values(LETTER_FREQUENCIES)) {
      expect(freq).toBeGreaterThan(0);
    }
  });

  test('E should be most common vowel', () => {
    expect(LETTER_FREQUENCIES['E']).toBeGreaterThan(LETTER_FREQUENCIES['A']);
    expect(LETTER_FREQUENCIES['E']).toBeGreaterThan(LETTER_FREQUENCIES['I']);
    expect(LETTER_FREQUENCIES['E']).toBeGreaterThan(LETTER_FREQUENCIES['O']);
    expect(LETTER_FREQUENCIES['E']).toBeGreaterThan(LETTER_FREQUENCIES['U']);
  });

  test('Q and Z should be rare', () => {
    expect(LETTER_FREQUENCIES['Q']).toBeLessThan(LETTER_FREQUENCIES['E']);
    expect(LETTER_FREQUENCIES['Z']).toBeLessThan(LETTER_FREQUENCIES['E']);
  });
});

describe('LETTER_SCORES', () => {
  test('should have 26 letters', () => {
    expect(Object.keys(LETTER_SCORES).length).toBe(26);
  });

  test('should have all uppercase letters', () => {
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      expect(LETTER_SCORES[letter]).toBeDefined();
    }
  });

  test('should have positive scores', () => {
    for (const score of Object.values(LETTER_SCORES)) {
      expect(score).toBeGreaterThan(0);
    }
  });

  test('common letters should have low scores', () => {
    expect(LETTER_SCORES['E']).toBe(1);
    expect(LETTER_SCORES['A']).toBe(1);
    expect(LETTER_SCORES['T']).toBe(1);
    expect(LETTER_SCORES['S']).toBe(1);
  });

  test('rare letters should have high scores', () => {
    expect(LETTER_SCORES['Q']).toBe(10);
    expect(LETTER_SCORES['Z']).toBe(10);
    expect(LETTER_SCORES['X']).toBe(8);
    expect(LETTER_SCORES['J']).toBe(8);
  });
});

describe('WORD_LIST', () => {
  test('should be a Set', () => {
    expect(WORD_LIST instanceof Set).toBe(true);
  });

  test('should contain common words', () => {
    expect(WORD_LIST.has('THE')).toBe(true);
    expect(WORD_LIST.has('AND')).toBe(true);
    expect(WORD_LIST.has('FOR')).toBe(true);
  });

  test('should have words in uppercase', () => {
    for (const word of WORD_LIST) {
      expect(word).toBe(word.toUpperCase());
    }
  });

  test('should have reasonable size', () => {
    expect(WORD_LIST.size).toBeGreaterThan(100);
  });
});

describe('Constants', () => {
  test('NUM_COLUMNS should be 7', () => {
    expect(NUM_COLUMNS).toBe(7);
  });

  test('MAX_ROWS should be 10', () => {
    expect(MAX_ROWS).toBe(10);
  });
});
