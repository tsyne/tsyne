/**
 * GemGuesser Game Logic
 *
 * Pure game state and logic for the GemGuesser puzzle game.
 * Portions copyright Wngui 2026, portions copyright Paul Hammant, 2026.
 */

// --- Types ---

export type GemColor = 'red' | 'blue' | 'green' | 'purple' | 'orange';
export type Cell = GemColor | null;
export type CellState = 'hidden' | 'revealed';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ColorSequence {
  color: GemColor;
  count: number;
  indices: number[];
}

export interface RevealResult {
  state: GameState;
  result: 'correct' | 'wrong_color' | 'empty' | 'already_revealed' | 'no_color_selected' | 'game_over';
}

export interface GameState {
  grid: Cell[];
  cellStates: CellState[];
  selectedColor: GemColor | null;
  lives: number;
  difficulty: Difficulty;
  gameOver: boolean;
  won: boolean;
  remainingByColor: Record<GemColor, number>;
  ghostMarks: Record<number, GemColor>;
}

// --- Constants ---

export const GRID_SIZE = 8;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
export const COLORS: GemColor[] = ['red', 'blue', 'green', 'purple', 'orange'];
export const MAX_LIVES = 3;

const DIFFICULTY_PERCENTAGES: Record<Difficulty, number> = {
  easy: 0.80,
  medium: 0.65,
  hard: 0.50,
};

const COLOR_HEX: Record<GemColor, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#27ae60',
  purple: '#9b59b6',
  orange: '#f39c12',
};

const COLOR_HEX_FADED: Record<GemColor, string> = {
  red: '#f4a6a0',
  blue: '#a3cde8',
  green: '#7dcea0',
  purple: '#c9a5d8',
  orange: '#f7cd82',
};

// --- Utility functions ---

export function getGemColorHex(color: GemColor): string {
  return COLOR_HEX[color];
}

export function getGemColorFadedHex(color: GemColor): string {
  return COLOR_HEX_FADED[color];
}

export function getColoredCellCount(difficulty: Difficulty): number {
  return Math.floor(TOTAL_CELLS * DIFFICULTY_PERCENTAGES[difficulty]);
}

export function getRemainingCount(state: GameState, color: GemColor): number {
  return state.remainingByColor[color] || 0;
}

// --- Grid generation ---

function getRandomPositionsWithNoEmptyLines(
  count: number,
  rng: () => number
): number[] {
  const positions = new Set<number>();

  // Ensure at least one cell per row
  for (let row = 0; row < GRID_SIZE; row++) {
    const col = Math.floor(rng() * GRID_SIZE);
    positions.add(row * GRID_SIZE + col);
  }

  // Ensure at least one cell per column
  const colsWithCells = new Set<number>();
  for (const pos of positions) {
    colsWithCells.add(pos % GRID_SIZE);
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    if (!colsWithCells.has(col)) {
      const row = Math.floor(rng() * GRID_SIZE);
      positions.add(row * GRID_SIZE + col);
    }
  }

  // Fill remaining positions randomly
  const remaining = count - positions.size;
  if (remaining > 0) {
    const available: number[] = [];
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (!positions.has(i)) {
        available.push(i);
      }
    }
    // Fisher-Yates shuffle on available
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    for (let i = 0; i < remaining && i < available.length; i++) {
      positions.add(available[i]);
    }
  }

  return Array.from(positions);
}

function selectWeightedColor(
  remainingColors: Record<GemColor, number>,
  coloredCellsCount: number,
  rng: () => number
): GemColor {
  const weights: { color: GemColor; weight: number }[] = [];
  let totalWeight = 0;

  for (const color of COLORS) {
    const count = remainingColors[color] || 0;
    const weight = Math.pow(coloredCellsCount - count + 1, 3);
    weights.push({ color, weight });
    totalWeight += weight;
  }

  let random = rng() * totalWeight;
  for (const w of weights) {
    random -= w.weight;
    if (random <= 0) {
      return w.color;
    }
  }

  return COLORS[0];
}

export function generateGrid(
  coloredCount: number,
  rng: () => number = Math.random
): { grid: Cell[]; remainingByColor: Record<GemColor, number> } {
  const grid: Cell[] = new Array(TOTAL_CELLS).fill(null);
  const remainingByColor: Record<GemColor, number> = {
    red: 0, blue: 0, green: 0, purple: 0, orange: 0,
  };

  const positions = getRandomPositionsWithNoEmptyLines(coloredCount, rng);

  // Sort positions so we process left-to-right, top-to-bottom for adjacency
  positions.sort((a, b) => a - b);

  for (const pos of positions) {
    let color: GemColor | undefined;

    const row = Math.floor(pos / GRID_SIZE);
    const col = pos % GRID_SIZE;

    // 35% chance to match left neighbor
    if (col > 0) {
      const leftColor = grid[pos - 1];
      if (leftColor && rng() < 0.35) {
        color = leftColor;
      }
    }

    // 35% chance to match cell above
    if (!color && row > 0) {
      const aboveColor = grid[pos - GRID_SIZE];
      if (aboveColor && rng() < 0.35) {
        color = aboveColor;
      }
    }

    // Weighted random if no adjacency match
    if (!color) {
      color = selectWeightedColor(remainingByColor, coloredCount, rng);
    }

    grid[pos] = color;
    remainingByColor[color]++;
  }

  return { grid, remainingByColor };
}

// --- Count calculations ---

export function calculateRowCounts(grid: Cell[]): ColorSequence[][] {
  const rowCounts: ColorSequence[][] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    const sequences: ColorSequence[] = [];
    let lastColor: GemColor | null = null;

    for (let col = 0; col < GRID_SIZE; col++) {
      const index = row * GRID_SIZE + col;
      const color = grid[index];

      if (color) {
        if (color === lastColor && sequences.length > 0) {
          sequences[sequences.length - 1].count++;
          sequences[sequences.length - 1].indices.push(index);
        } else {
          sequences.push({ color, count: 1, indices: [index] });
          lastColor = color;
        }
      } else {
        lastColor = null;
      }
    }

    rowCounts.push(sequences);
  }

  return rowCounts;
}

export function calculateColumnCounts(grid: Cell[]): ColorSequence[][] {
  const columnCounts: ColorSequence[][] = [];

  for (let col = 0; col < GRID_SIZE; col++) {
    const sequences: ColorSequence[] = [];
    let lastColor: GemColor | null = null;

    for (let row = 0; row < GRID_SIZE; row++) {
      const index = row * GRID_SIZE + col;
      const color = grid[index];

      if (color) {
        if (color === lastColor && sequences.length > 0) {
          sequences[sequences.length - 1].count++;
          sequences[sequences.length - 1].indices.push(index);
        } else {
          sequences.push({ color, count: 1, indices: [index] });
          lastColor = color;
        }
      } else {
        lastColor = null;
      }
    }

    columnCounts.push(sequences);
  }

  return columnCounts;
}

// --- Segment completion ---

export function isSegmentComplete(
  sequence: ColorSequence,
  cellStates: CellState[]
): boolean {
  return sequence.indices.every((index) => cellStates[index] === 'revealed');
}

// --- Victory detection ---

export function checkVictory(state: GameState): boolean {
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (state.grid[i] !== null && state.cellStates[i] !== 'revealed') {
      return false;
    }
  }
  return true;
}

// --- Color selection ---

export function selectColor(state: GameState, color: GemColor): GameState {
  if ((state.remainingByColor[color] || 0) === 0) {
    return state;
  }
  return { ...state, selectedColor: color };
}

export function selectNextAvailableColor(state: GameState): GameState {
  let nextColor: GemColor | null = null;
  let lowestCount = Infinity;

  for (const color of COLORS) {
    const count = state.remainingByColor[color] || 0;
    if (count > 0 && count < lowestCount) {
      lowestCount = count;
      nextColor = color;
    }
  }

  if (nextColor) {
    return { ...state, selectedColor: nextColor };
  }
  return { ...state, selectedColor: null };
}

// --- Ghost marks ---

export function toggleGhostMark(state: GameState, index: number): GameState {
  // Can't ghost mark revealed cells
  if (state.cellStates[index] === 'revealed') {
    return state;
  }
  // Need a selected color
  if (!state.selectedColor) {
    return state;
  }

  const ghostMarks = { ...state.ghostMarks };
  const currentMark = ghostMarks[index];

  if (currentMark === state.selectedColor) {
    // Same color: remove
    delete ghostMarks[index];
  } else {
    // Different or no mark: set
    ghostMarks[index] = state.selectedColor;
  }

  return { ...state, ghostMarks };
}

// --- Cell reveal ---

export function revealCell(state: GameState, index: number): RevealResult {
  if (state.gameOver) {
    return { state, result: 'game_over' };
  }

  if (!state.selectedColor) {
    return { state, result: 'no_color_selected' };
  }

  if (state.cellStates[index] === 'revealed') {
    return { state, result: 'already_revealed' };
  }

  const cellColor = state.grid[index];

  // Empty cell
  if (cellColor === null) {
    const newLives = state.lives - 1;
    const gameOver = newLives === 0;
    return {
      state: {
        ...state,
        lives: newLives,
        gameOver,
        won: false,
      },
      result: 'empty',
    };
  }

  // Wrong color
  if (cellColor !== state.selectedColor) {
    const newLives = state.lives - 1;
    const gameOver = newLives === 0;
    return {
      state: {
        ...state,
        lives: newLives,
        gameOver,
        won: false,
      },
      result: 'wrong_color',
    };
  }

  // Correct guess
  const newCellStates = [...state.cellStates];
  newCellStates[index] = 'revealed';

  const newRemaining = { ...state.remainingByColor };
  newRemaining[cellColor] = (newRemaining[cellColor] || 1) - 1;

  // Remove ghost mark if present
  const newGhostMarks = { ...state.ghostMarks };
  delete newGhostMarks[index];

  let newState: GameState = {
    ...state,
    cellStates: newCellStates,
    remainingByColor: newRemaining,
    ghostMarks: newGhostMarks,
  };

  // Auto-select next color if this one is depleted
  if (newRemaining[cellColor] === 0) {
    newState = selectNextAvailableColor(newState);
  }

  // Check victory
  const won = checkVictory(newState);
  if (won) {
    newState = { ...newState, won: true, gameOver: true };
  }

  return { state: newState, result: 'correct' };
}

// --- Game creation ---

export function createGameState(
  difficulty: Difficulty = 'easy',
  rng: () => number = Math.random
): GameState {
  const coloredCount = getColoredCellCount(difficulty);
  const { grid, remainingByColor } = generateGrid(coloredCount, rng);
  const cellStates: CellState[] = new Array(TOTAL_CELLS).fill('hidden');

  const state: GameState = {
    grid,
    cellStates,
    selectedColor: null,
    lives: MAX_LIVES,
    difficulty,
    gameOver: false,
    won: false,
    remainingByColor,
    ghostMarks: {},
  };

  // Auto-select the color with the lowest count
  return selectNextAvailableColor(state);
}
