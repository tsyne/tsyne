/**
 * Sudoku App
 *
 * A faithful port of sudoku-app from https://gitlab.com/alaskalinuxuser/sudoku-app
 * Based on Sudoku generator by Jani Hartikainen
 * License: GPL-3.0
 *
 * Classic 9x9 Sudoku puzzle with multiple difficulty levels,
 * hint system, and conflict detection.
 *
 * @tsyne-app:name Sudoku
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
 *   <rect x="2" y="2" width="20" height="20" rx="1" stroke="#333"/>
 *   <line x1="8" y1="2" x2="8" y2="22" stroke="#333"/>
 *   <line x1="16" y1="2" x2="16" y2="22" stroke="#333"/>
 *   <line x1="2" y1="8" x2="22" y2="8" stroke="#333"/>
 *   <line x1="2" y1="16" x2="22" y2="16" stroke="#333"/>
 *   <text x="5" y="7" font-size="4" fill="#00008B">5</text>
 *   <text x="11" y="14" font-size="4" fill="#00008B">7</text>
 *   <text x="17" y="21" font-size="4" fill="#00008B">3</text>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createSudokuApp
 * @tsyne-app:args app,window,windowWidth,windowHeight
 */

import { app, resolveTransport } from 'tsyne';
import type { App, Window, ITsyneWindow, Label, ColorCell } from 'tsyne';

// ============================================================================
// Constants
// ============================================================================

const GRID_SIZE = 9;
const BOX_SIZE = 3;

// Difficulty settings: number of cells to reveal
const DIFFICULTY_LEVELS = {
  easy: { minReveal: 40, maxReveal: 50 },
  medium: { minReveal: 30, maxReveal: 39 },
  hard: { minReveal: 25, maxReveal: 29 },
  expert: { minReveal: 17, maxReveal: 24 },
};

type Difficulty = keyof typeof DIFFICULTY_LEVELS;

// ============================================================================
// Game Types
// ============================================================================

interface CellState {
  value: number;       // 0-9, 0 means empty
  isFixed: boolean;    // Part of the initial puzzle
  isHinted: boolean;   // Revealed via hint
  isConflict: boolean; // Has conflict with another cell
}

type GameState = 'playing' | 'won' | 'paused';

// ============================================================================
// Sudoku Grid Class (ported from SudokuCU.js)
// ============================================================================

export class SudokuGrid {
  private rows: number[][];

  constructor() {
    this.rows = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      const cols: number[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        cols[col] = 0;
      }
      this.rows[row] = cols;
    }
  }

  getValue(col: number, row: number): number {
    return this.rows[row][col];
  }

  setValue(col: number, row: number, value: number): void {
    this.rows[row][col] = value;
  }

  /**
   * Check if a cell conflicts with another cell in same row, column, or 3x3 box
   */
  cellConflicts(col: number, row: number): boolean {
    const value = this.rows[row][col];
    if (value === 0) return false;

    // Check row and column
    for (let i = 0; i < GRID_SIZE; i++) {
      if (i !== row && this.rows[i][col] === value) return true;
      if (i !== col && this.rows[row][i] === value) return true;
    }

    // Check 3x3 box
    return !this.miniGridValidFor(col, row, value);
  }

  /**
   * Check if 3x3 box is valid for a specific value
   */
  private miniGridValidFor(col: number, row: number, val: number): boolean {
    const boxX = Math.floor(col / BOX_SIZE);
    const boxY = Math.floor(row / BOX_SIZE);

    const startCol = boxX * BOX_SIZE;
    const startRow = boxY * BOX_SIZE;
    const endCol = startCol + BOX_SIZE;
    const endRow = startRow + BOX_SIZE;

    const numbers: number[] = [];
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const value = this.rows[r][c];
        if (value === 0) continue;
        if (numbers.indexOf(value) !== -1 && value === val) return false;
        numbers.push(value);
      }
    }
    return true;
  }

  /**
   * Deep copy the grid
   */
  clone(): SudokuGrid {
    const copy = new SudokuGrid();
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        copy.rows[row][col] = this.rows[row][col];
      }
    }
    return copy;
  }

  /**
   * Check if grid is completely filled with valid values
   */
  isComplete(): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.rows[row][col] === 0) return false;
        if (this.cellConflicts(col, row)) return false;
      }
    }
    return true;
  }

  /**
   * Get all rows
   */
  getRows(): number[][] {
    return this.rows;
  }
}

// ============================================================================
// Sudoku Generator (ported from SudokuCU.js)
// ============================================================================

export class SudokuGenerator {
  /**
   * Generate a complete, valid Sudoku grid using backtracking
   */
  static generate(): SudokuGrid {
    const grid = new SudokuGrid();

    // Track numbers tried in each cell
    const cellNumbers: number[][] = [];
    for (let i = 0; i < 81; i++) {
      cellNumbers[i] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }

    for (let i = 0; i < 81; i++) {
      let found = false;
      const row = Math.floor(i / 9);
      const col = i % 9;

      while (cellNumbers[i].length > 0) {
        // Pick a random number to try
        const rnd = Math.floor(Math.random() * cellNumbers[i].length);
        const num = cellNumbers[i].splice(rnd, 1)[0];

        grid.setValue(col, row, num);

        if (!grid.cellConflicts(col, row)) {
          found = true;
          break;
        } else {
          grid.setValue(col, row, 0);
        }
      }

      // If no valid number found, backtrack
      if (!found) {
        cellNumbers[i] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        i -= 2; // Go back one cell (loop will increment)
      }
    }

    return grid;
  }

  /**
   * Remove cells from grid to create puzzle
   */
  static cull(grid: SudokuGrid, amount: number): void {
    const cells: number[] = [];
    for (let i = 0; i < 81; i++) cells.push(i);

    for (let i = 0; i < amount; i++) {
      const rnd = Math.floor(Math.random() * cells.length);
      const value = cells.splice(rnd, 1)[0];
      const row = Math.floor(value / 9);
      const col = value % 9;
      grid.setValue(col, row, 0);
    }
  }

  /**
   * Generate a new puzzle with given difficulty
   */
  static createPuzzle(difficulty: Difficulty): { puzzle: SudokuGrid; solution: SudokuGrid } {
    const solution = this.generate();
    const puzzle = solution.clone();

    const settings = DIFFICULTY_LEVELS[difficulty];
    const revealCount = settings.minReveal + Math.floor(Math.random() * (settings.maxReveal - settings.minReveal + 1));
    const cullCount = 81 - revealCount;

    this.cull(puzzle, cullCount);

    return { puzzle, solution };
  }
}

// ============================================================================
// Sudoku Game Logic
// ============================================================================

export class SudokuGame {
  private puzzle: SudokuGrid;
  private solution: SudokuGrid;
  private cells: CellState[][];
  private gameState: GameState = 'playing';
  private selectedCell: { row: number; col: number } | null = null;
  private difficulty: Difficulty = 'medium';
  private startTime: number = 0;
  private hintsUsed: number = 0;
  private onUpdate?: () => void;
  private onGameEnd?: () => void;

  constructor(difficulty: Difficulty = 'medium') {
    this.difficulty = difficulty;
    this.cells = [];
    this.puzzle = new SudokuGrid();
    this.solution = new SudokuGrid();
    this.initGame();
  }

  /**
   * Initialize a new game
   */
  initGame(): void {
    const { puzzle, solution } = SudokuGenerator.createPuzzle(this.difficulty);
    this.puzzle = puzzle;
    this.solution = solution;
    this.gameState = 'playing';
    this.selectedCell = null;
    this.startTime = Date.now();
    this.hintsUsed = 0;

    // Initialize cell states
    this.cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      this.cells[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = puzzle.getValue(col, row);
        this.cells[row][col] = {
          value,
          isFixed: value !== 0,
          isHinted: false,
          isConflict: false,
        };
      }
    }

    this.onUpdate?.();
  }

  /**
   * Select a cell
   */
  selectCell(row: number, col: number): void {
    if (this.gameState !== 'playing') return;
    if (this.cells[row][col].isFixed) {
      this.selectedCell = null;
    } else {
      this.selectedCell = { row, col };
    }
    this.onUpdate?.();
  }

  /**
   * Set value in selected cell
   */
  setValue(value: number): void {
    if (!this.selectedCell || this.gameState !== 'playing') return;
    const { row, col } = this.selectedCell;
    if (this.cells[row][col].isFixed) return;

    this.cells[row][col].value = value;
    this.puzzle.setValue(col, row, value);

    // Check for conflicts
    this.updateConflicts();

    // Check for win
    if (this.checkWin()) {
      this.gameState = 'won';
      this.onGameEnd?.();
    }

    this.onUpdate?.();
  }

  /**
   * Clear selected cell
   */
  clearCell(): void {
    if (!this.selectedCell || this.gameState !== 'playing') return;
    const { row, col } = this.selectedCell;
    if (this.cells[row][col].isFixed) return;

    this.cells[row][col].value = 0;
    this.puzzle.setValue(col, row, 0);
    this.updateConflicts();
    this.onUpdate?.();
  }

  /**
   * Update conflict flags for all cells
   */
  private updateConflicts(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const value = this.cells[row][col].value;
        this.cells[row][col].isConflict = value !== 0 && this.puzzle.cellConflicts(col, row);
      }
    }
  }

  /**
   * Check if puzzle is solved
   */
  private checkWin(): boolean {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.cells[row][col].value === 0) return false;
        if (this.cells[row][col].isConflict) return false;
      }
    }
    return true;
  }

  /**
   * Reveal a random empty cell as a hint
   */
  revealHint(): void {
    if (this.gameState !== 'playing') return;

    const emptyCells: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.cells[row][col].value === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) return;

    const idx = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[idx];
    const solutionValue = this.solution.getValue(col, row);

    this.cells[row][col].value = solutionValue;
    this.cells[row][col].isHinted = true;
    this.puzzle.setValue(col, row, solutionValue);
    this.hintsUsed++;

    this.updateConflicts();

    if (this.checkWin()) {
      this.gameState = 'won';
      this.onGameEnd?.();
    }

    this.onUpdate?.();
  }

  /**
   * Get cell at position
   */
  getCell(row: number, col: number): CellState {
    return this.cells[row][col];
  }

  /**
   * Get selected cell position
   */
  getSelectedCell(): { row: number; col: number } | null {
    return this.selectedCell;
  }

  /**
   * Get game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    if (this.startTime === 0) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get hints used
   */
  getHintsUsed(): number {
    return this.hintsUsed;
  }

  /**
   * Get difficulty
   */
  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  /**
   * Set difficulty for next game
   */
  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  /**
   * Get empty cell count
   */
  getEmptyCount(): number {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.cells[row][col].value === 0) count++;
      }
    }
    return count;
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
  setOnGameEnd(callback: () => void): void {
    this.onGameEnd = callback;
  }
}

// ============================================================================
// UI Class
// ============================================================================

export class SudokuUI {
  private game: SudokuGame;
  private a: App;
  private win: Window | null = null;
  private cellWidgets: ColorCell[][] = [];
  private statusLabel: Label | null = null;
  private emptyLabel: Label | null = null;
  private timerLabel: Label | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(a: App) {
    this.a = a;
    this.game = new SudokuGame('medium');
    this.game.setOnUpdate(() => this.updateDisplay());
    this.game.setOnGameEnd(() => this.handleGameEnd());
  }

  /**
   * Setup window
   */
  setupWindow(win: Window): void {
    this.win = win;
    this.buildMainMenu(win);
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
          { label: 'Easy', onSelected: () => this.setDifficultyAndStart('easy') },
          { label: 'Medium', onSelected: () => this.setDifficultyAndStart('medium') },
          { label: 'Hard', onSelected: () => this.setDifficultyAndStart('hard') },
          { label: 'Expert', onSelected: () => this.setDifficultyAndStart('expert') },
          { label: '', isSeparator: true },
          { label: 'Hint', onSelected: () => this.game.revealHint() },
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
   * Build the UI content
   */
  buildContent(): void {
    this.a.vbox(() => {
      // Control buttons
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.newGame()).withId('newGameBtn');
        this.a.button('Hint').onClick(() => this.game.revealHint()).withId('hintBtn');
      });

      // Status bar
      this.a.hbox(() => {
        this.a.label('Difficulty: ');
        this.statusLabel = this.a.label('Medium').withId('statusLabel');
        this.a.label('').withId('difficultySelect'); // Marker for testing
        this.a.label(' | Empty: ');
        this.emptyLabel = this.a.label('0').withId('emptyCount');
        this.a.label(' | Time: ');
        this.timerLabel = this.a.label('00:00').withId('timerLabel');
      });

      this.a.separator();

      // Initialize cellWidgets array
      for (let row = 0; row < GRID_SIZE; row++) {
        this.cellWidgets[row] = [];
      }

      // Sudoku Grid: vbox of 3 rows, each row is a grid of 3 boxes
      this.a.vbox(() => {
        for (let boxRow = 0; boxRow < 3; boxRow++) {
          // Add vertical gap between box rows (not before first)
          if (boxRow > 0) {
            this.a.label('').withMinSize(1, 8);
          }
          // Each row contains 3 boxes horizontally
          this.a.grid(3, () => {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
              // Each box is a 3x3 grid
              this.a.grid(3, () => {
                for (let innerRow = 0; innerRow < 3; innerRow++) {
                  for (let innerCol = 0; innerCol < 3; innerCol++) {
                    const row = boxRow * 3 + innerRow;
                    const col = boxCol * 3 + innerCol;
                    const cell = this.game.getCell(row, col);
                    const widget = this.a.colorCell({
                      width: 36,
                      height: 36,
                      text: cell.value === 0 ? '' : String(cell.value),
                      fillColor: '#FFFFFF',
                      textColor: cell.isFixed ? '#000080' : '#000000',
                      borderColor: '#404040',
                      borderWidth: 1,
                      centerText: true,
                      onClick: () => this.onCellClick(row, col)
                    }).withId(`cell-${row}-${col}`);

                    this.cellWidgets[row][col] = widget;
                  }
                }
              }, { cellSize: 36, spacing: 1 });
            }
          }, { spacing: 4 });
        }
      }, { spacing: 0 });

      this.a.separator();

      // Number buttons (1-9)
      this.a.hbox(() => {
        for (let num = 1; num <= 9; num++) {
          this.a.button(String(num))
            .onClick(() => this.game.setValue(num))
            .withId(`numBtn${num}`);
        }
        this.a.button('Clear')
          .onClick(() => this.game.clearCell())
          .withId('clearBtn');
      });

      // Instructions
      this.a.separator();
      this.a.label('Select a cell, then click a number to fill it');
    });

    // Start timer
    this.startTimer();
  }

  /**
   * Handle cell click
   */
  private onCellClick(row: number, col: number): void {
    this.game.selectCell(row, col);
  }

  /**
   * Set difficulty and start new game
   */
  private setDifficultyAndStart(difficulty: Difficulty): void {
    this.game.setDifficulty(difficulty);
    this.newGame();
  }

  /**
   * Start a new game
   */
  async newGame(): Promise<void> {
    this.game.initGame();
    await this.updateDisplay();
  }

  /**
   * Update display after game state change
   */
  private async updateDisplay(): Promise<void> {
    const selected = this.game.getSelectedCell();

    // Update cell widgets
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.game.getCell(row, col);
        const widget = this.cellWidgets[row]?.[col];
        if (!widget) continue;

        await widget.setText(cell.value === 0 ? '' : String(cell.value));

        // Determine cell color based on state
        const isSelected = selected && selected.row === row && selected.col === col;
        let fillColor = '#FFFFFF'; // Default white
        if (isSelected) {
          fillColor = '#4488FF'; // Blue for selected
        } else if (cell.isConflict) {
          fillColor = '#FF8888'; // Red for conflict
        } else if (cell.isHinted) {
          fillColor = '#88FF88'; // Green for hinted
        }
        await widget.setFillColor(fillColor);

        // Set text color: navy for fixed, black for user-entered
        await widget.setTextColor(cell.isFixed ? '#000080' : '#000000');
      }
    }

    // Update status
    if (this.statusLabel) {
      await this.statusLabel.setText(this.capitalize(this.game.getDifficulty()));
    }
    if (this.emptyLabel) {
      await this.emptyLabel.setText(String(this.game.getEmptyCount()));
    }
  }

  /**
   * Start the timer
   */
  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  /**
   * Update timer display
   */
  private async updateTimer(): Promise<void> {
    if (!this.timerLabel) return;
    const elapsed = this.game.getElapsedTime();
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    await this.timerLabel.setText(
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    );
  }

  /**
   * Capitalize first letter
   */
  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /**
   * Handle game end
   */
  private async handleGameEnd(): Promise<void> {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    if (this.win) {
      const elapsed = this.game.getElapsedTime();
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      const hints = this.game.getHintsUsed();

      await this.win.showInfo(
        'Congratulations!',
        `You solved the puzzle!\n\n` +
        `Time: ${mins}:${secs.toString().padStart(2, '0')}\n` +
        `Hints used: ${hints}`
      );
    }
  }

  /**
   * Show help
   */
  async showHelp(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo(
      'How to Play Sudoku',
      'Sudoku Rules:\n\n' +
      '1. Fill the 9x9 grid with numbers 1-9\n' +
      '2. Each row must contain 1-9 with no repeats\n' +
      '3. Each column must contain 1-9 with no repeats\n' +
      '4. Each 3x3 box must contain 1-9 with no repeats\n\n' +
      'How to play:\n' +
      '- Click on an empty cell to select it\n' +
      '- Click a number (1-9) to fill the cell\n' +
      '- Click Clear to empty the selected cell\n' +
      '- Use Hint to reveal a random cell'
    );
  }

  /**
   * Show about dialog
   */
  async showAbout(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo(
      'About Sudoku',
      'Sudoku v1.0.0\n\n' +
      'A port of sudoku-app from:\n' +
      'gitlab.com/alaskalinuxuser/sudoku-app\n\n' +
      'Based on Sudoku generator by Jani Hartikainen\n' +
      'License: GPL-3.0\n\n' +
      'Ported to Tsyne framework'
    );
  }

  /**
   * Initialize display
   */
  async initialize(): Promise<void> {
    await this.updateDisplay();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}

// ============================================================================
// App Factory
// ============================================================================

/**
 * Create the Sudoku app
 */
export function createSudokuApp(a: App, windowWidth?: number, windowHeight?: number): SudokuUI {
  const ui = new SudokuUI(a);

  a.registerCleanup(() => ui.cleanup());

  // Always create a window - PhoneTop intercepts this to create a StackPaneAdapter
  a.window({ title: 'Sudoku', width: 450, height: 550 }, (win: Window) => {
    ui.setupWindow(win);
    win.setContent(() => ui.buildContent());
    win.show();
    setTimeout(() => ui.initialize(), 0);
  });

  return ui;
}

// Export for testing
export { DIFFICULTY_LEVELS, GRID_SIZE, BOX_SIZE };

// ============================================================================
// Standalone Entry Point
// ============================================================================

if (require.main === module) {
  app(resolveTransport(), { title: 'Sudoku' }, async (a: App) => {
    const ui = createSudokuApp(a);
    await a.run();
    await ui.initialize();
  });
}
