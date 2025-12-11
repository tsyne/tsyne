import { app, window, vbox, hbox, grid, button, label, styles, FontStyle, getAccessibilityManager } from '../core/src';
// In production: import { app, window, vbox, hbox, grid, button, label, styles, FontStyle, getAccessibilityManager } from 'tsyne';

/**
 * Accessible Tic-Tac-Toe
 * Showcases comprehensive accessibility features for a Fyne-based UI:
 *
 * 1. TTS Announcements - Game state, moves, wins, draws
 * 2. Keyboard Navigation - Arrow keys + Space/Enter to play
 * 3. High Contrast Mode - Clear X and O markers
 * 4. Font Size Controls - Small/Medium/Large
 * 5. Audio Feedback - Distinct sounds for X, O, win, draw, error
 * 6. ARIA Labels - Every cell properly labeled with position
 * 7. Move History - Full game transcript
 * 8. Undo Feature - Take back last move
 * 9. Smart Hints - Suggest next move for beginners
 * 10. Game State Announcements - Turn info, winner, position descriptions
 */

// Game state
type Player = 'X' | 'O' | '';
type Board = Player[];
type GameState = 'playing' | 'won' | 'draw';

// Application context - holds all state and dependencies for a single game instance
// This is injected into functions instead of using globals
interface GameContext {
  // Game state
  board: Board;
  currentPlayer: Player;
  gameState: GameState;
  winner: Player;
  moveHistory: string[];
  moveStack: { board: Board; player: Player }[];

  // UI references
  cellButtons: any[];
  statusLabel: any;
  historyLabel: any;
  ttsToggle: any;
  contrastToggle: any;
  fontToggle: any;
  appContext: any;
  accessibilityManager: any;

  // Settings
  ttsEnabled: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  audioFeedback: boolean;
  currentFocus: number;
}

// Factory function to create a fresh context for each game instance
function createGameContext(): GameContext {
  return {
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    gameState: 'playing',
    winner: '',
    moveHistory: [],
    moveStack: [],
    cellButtons: [],
    statusLabel: null,
    historyLabel: null,
    ttsToggle: null,
    contrastToggle: null,
    fontToggle: null,
    appContext: null,
    accessibilityManager: null,
    ttsEnabled: false,
    highContrast: false,
    fontSize: 'medium',
    audioFeedback: true,
    currentFocus: 4,
  };
}

// Styles
const normalStyles = {
  cell: {
    font_size: 48,
    font_style: FontStyle.BOLD,
    background_color: '#2196F3'  // Material Blue - explicit default color
  },
  status: {
    font_size: 24,
    font_style: FontStyle.BOLD,
    color: '#212121'  // Dark gray for text
  },
  history: {
    font_size: 14,
    text_align: 'left' as const,
    color: '#424242'  // Medium gray
  },
  control: {
    font_size: 16,
    background_color: '#757575'  // Gray for control buttons
  }
};

const highContrastStyles = {
  cell: {
    font_size: 48,
    font_style: FontStyle.BOLD,
    color: '#FFFFFF',
    background_color: '#000000'
  },
  status: {
    font_size: 24,
    font_style: FontStyle.BOLD,
    color: '#FFFF00'  // Yellow for better visibility
  },
  history: {
    font_size: 14,
    text_align: 'left' as const,
    color: '#FFFFFF'
  },
  control: {
    font_size: 16,
    color: '#FFFFFF'
  }
};

// Apply current styles
function applyStyles(ctx: GameContext) {
  const baseStyles = ctx.highContrast ? highContrastStyles : normalStyles;
  const fontMultiplier = ctx.fontSize === 'small' ? 0.75 : ctx.fontSize === 'large' ? 1.5 : 1;

  styles({
    cell: {
      ...baseStyles.cell,
      font_size: Math.round(baseStyles.cell.font_size * fontMultiplier)
    },
    status: {
      ...baseStyles.status,
      font_size: Math.round(baseStyles.status.font_size * fontMultiplier)
    },
    history: baseStyles.history,
    control: baseStyles.control
  });
}

// Audio feedback
function playSound(ctx: GameContext, type: 'x' | 'o' | 'win' | 'draw' | 'error' | 'click') {
  if (!ctx.audioFeedback) return;

  const sounds = {
    x: '✗',      // Lower tone
    o: '○',      // Higher tone
    win: '🎉',   // Victory fanfare
    draw: '🤝',  // Draw sound
    error: '⚠️',  // Error beep
    click: '🔊'  // Click
  };

  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(`${sounds[type]} `);
  }
}

// TTS announcements
function announce(ctx: GameContext, message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (ctx.ttsEnabled && ctx.accessibilityManager?.isEnabled()) {
    // Priority affects how screen readers handle interruption
    ctx.accessibilityManager.announce(message);
  }
}

// Position descriptions for accessibility
function getCellDescription(index: number): string {
  const positions = [
    'top left', 'top center', 'top right',
    'middle left', 'center', 'middle right',
    'bottom left', 'bottom center', 'bottom right'
  ];
  return positions[index];
}

// Board coordinates for better announcement
function getCellCoordinates(index: number): string {
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  return `row ${row}, column ${col}`;
}

// Check for winner
function checkWinner(ctx: GameContext): Player {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  for (const [a, b, c] of lines) {
    if (ctx.board[a] && ctx.board[a] === ctx.board[b] && ctx.board[a] === ctx.board[c]) {
      return ctx.board[a];
    }
  }
  return '';
}

// Check for draw
function checkDraw(ctx: GameContext): boolean {
  return ctx.board.every(cell => cell !== '') && !checkWinner(ctx);
}

// Get available moves (for hints)
function getAvailableMoves(ctx: GameContext): number[] {
  return ctx.board.map((cell, i) => cell === '' ? i : -1).filter(i => i !== -1);
}

// Simple AI hint (block opponent or take center)
function getHint(ctx: GameContext): number {
  const available = getAvailableMoves(ctx);
  if (available.length === 0) return -1;

  // Check if we can win
  const opponent = ctx.currentPlayer === 'X' ? 'O' : 'X';
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  // Block opponent's win
  for (const [a, b, c] of lines) {
    const cells = [ctx.board[a], ctx.board[b], ctx.board[c]];
    if (cells.filter(x => x === opponent).length === 2 && cells.includes('')) {
      const emptyIndex = [a, b, c].find(i => ctx.board[i] === '');
      if (emptyIndex !== undefined) return emptyIndex;
    }
  }

  // Take center if available
  if (ctx.board[4] === '') return 4;

  // Take a corner
  const corners = [0, 2, 6, 8].filter(i => ctx.board[i] === '');
  if (corners.length > 0) return corners[0];

  // Take any available
  return available[0];
}

// Update cell display
function updateCell(ctx: GameContext, index: number) {
  if (ctx.cellButtons[index]) {
    const value = ctx.board[index] || ' ';
    ctx.cellButtons[index].setText(value);
  }
}

// Update status display
function updateStatus(ctx: GameContext) {
  let statusText = '';

  if (ctx.gameState === 'won') {
    statusText = `Player ${ctx.winner} wins! 🎉`;
  } else if (ctx.gameState === 'draw') {
    statusText = `Game drawn! 🤝`;
  } else {
    statusText = `Player ${ctx.currentPlayer}'s turn`;
  }

  if (ctx.statusLabel) {
    ctx.statusLabel.setText(statusText);
  }
}

// Update history display
function updateHistory(ctx: GameContext) {
  if (ctx.historyLabel) {
    const historyText = ctx.moveHistory.length > 0
      ? `Moves:\n${ctx.moveHistory.join('\n')}`
      : 'No moves yet';
    ctx.historyLabel.setText(historyText);
  }
}

// Make a move
function makeMove(ctx: GameContext, index: number) {
  if (ctx.gameState !== 'playing') {
    announce(ctx, 'Game is over. Press New Game to play again.', 'assertive');
    playSound(ctx, 'error');
    return;
  }

  if (ctx.board[index] !== '') {
    announce(ctx, 'Cell is already occupied. Choose another cell.', 'assertive');
    playSound(ctx, 'error');
    return;
  }

  // Save state for undo
  ctx.moveStack.push({
    board: [...ctx.board],
    player: ctx.currentPlayer
  });

  // Make the move
  ctx.board[index] = ctx.currentPlayer;
  updateCell(ctx, index);

  // Play sound
  playSound(ctx, ctx.currentPlayer.toLowerCase() as 'x' | 'o');

  // Add to history
  const moveDesc = `${ctx.currentPlayer} at ${getCellDescription(index)} (${getCellCoordinates(index)})`;
  ctx.moveHistory.push(moveDesc);
  updateHistory(ctx);

  // Announce move
  announce(ctx, `${ctx.currentPlayer} placed at ${getCellDescription(index)}`);

  // Check for winner
  ctx.winner = checkWinner(ctx);
  if (ctx.winner) {
    ctx.gameState = 'won';
    updateStatus(ctx);
    playSound(ctx, 'win');
    announce(ctx, `Player ${ctx.winner} wins the game!`, 'assertive');
    return;
  }

  // Check for draw
  if (checkDraw(ctx)) {
    ctx.gameState = 'draw';
    updateStatus(ctx);
    playSound(ctx, 'draw');
    announce(ctx, 'Game is drawn. No more moves available.', 'assertive');
    return;
  }

  // Switch player
  ctx.currentPlayer = ctx.currentPlayer === 'X' ? 'O' : 'X';
  updateStatus(ctx);
  announce(ctx, `Player ${ctx.currentPlayer}'s turn`, 'polite');
}

// Reset game
function newGame(ctx: GameContext) {
  ctx.board = ['', '', '', '', '', '', '', '', ''];
  ctx.currentPlayer = 'X';
  ctx.gameState = 'playing';
  ctx.winner = '';
  ctx.moveHistory = [];
  ctx.moveStack = [];

  // Update display
  for (let i = 0; i < 9; i++) {
    updateCell(ctx, i);
  }
  updateStatus(ctx);
  updateHistory(ctx);

  playSound(ctx, 'click');
  announce(ctx, 'New game started. Player X goes first.', 'assertive');
}

// Undo last move
function undoMove(ctx: GameContext) {
  if (ctx.moveStack.length === 0) {
    announce(ctx, 'No moves to undo.', 'assertive');
    playSound(ctx, 'error');
    return;
  }

  const lastState = ctx.moveStack.pop()!;
  ctx.board = lastState.board;
  ctx.currentPlayer = lastState.player;
  ctx.gameState = 'playing';
  ctx.winner = '';

  // Update display
  for (let i = 0; i < 9; i++) {
    updateCell(ctx, i);
  }

  // Remove last move from history
  ctx.moveHistory.pop();
  updateHistory(ctx);
  updateStatus(ctx);

  playSound(ctx, 'click');
  announce(ctx, `Move undone. ${ctx.currentPlayer}'s turn again.`, 'assertive');
}

// Get hint
function showHint(ctx: GameContext) {
  if (ctx.gameState !== 'playing') {
    announce(ctx, 'Game is over.', 'assertive');
    return;
  }

  const hintIndex = getHint(ctx);
  if (hintIndex === -1) {
    announce(ctx, 'No moves available.', 'assertive');
    return;
  }

  const position = getCellDescription(hintIndex);
  announce(ctx, `Hint: Try placing at ${position}`, 'assertive');
  playSound(ctx, 'click');

  // Briefly highlight the suggested cell (in a real implementation)
  ctx.currentFocus = hintIndex;
}

// Keyboard navigation
function moveFocus(ctx: GameContext, direction: 'up' | 'down' | 'left' | 'right') {
  const row = Math.floor(ctx.currentFocus / 3);
  const col = ctx.currentFocus % 3;

  let newRow = row;
  let newCol = col;

  if (direction === 'up') newRow = Math.max(0, row - 1);
  if (direction === 'down') newRow = Math.min(2, row + 1);
  if (direction === 'left') newCol = Math.max(0, col - 1);
  if (direction === 'right') newCol = Math.min(2, col + 1);

  ctx.currentFocus = newRow * 3 + newCol;

  // Announce new position
  const position = getCellDescription(ctx.currentFocus);
  const cellValue = ctx.board[ctx.currentFocus] || 'empty';
  announce(ctx, `Focused on ${position}, currently ${cellValue}`, 'polite');
}

// Factory function to create a TTS toggle that closes over the context
function createToggleTTS(ctx: GameContext) {
  return () => {
    if (!ctx.accessibilityManager) {
      return;
    }

    ctx.accessibilityManager.toggle();
    ctx.ttsEnabled = ctx.accessibilityManager.isEnabled();

    if (ctx.ttsToggle) {
      const status = ctx.ttsEnabled ? "ON" : "OFF";
      ctx.ttsToggle.setText(`TTS: ${status}`);
    }

    announce(ctx, ctx.ttsEnabled ? "Text to speech enabled" : "Text to speech disabled", 'assertive');
  };
}

// Factory function to create high contrast toggle
function createToggleHighContrast(ctx: GameContext) {
  return async () => {
    ctx.highContrast = !ctx.highContrast;

    if (ctx.contrastToggle) {
      const status = ctx.highContrast ? "ON" : "OFF";
      ctx.contrastToggle.setText(`High Contrast: ${status}`);
    }

    // Update global stylesheet
    applyStyles(ctx);

    // Refresh all widget styles to apply the new theme
    for (const cellButton of ctx.cellButtons) {
      if (cellButton) {
        await cellButton.refreshStyles();
      }
    }

    if (ctx.statusLabel) await ctx.statusLabel.refreshStyles();
    if (ctx.historyLabel) await ctx.historyLabel.refreshStyles();
    if (ctx.contrastToggle) await ctx.contrastToggle.refreshStyles();
    if (ctx.ttsToggle) await ctx.ttsToggle.refreshStyles();
    if (ctx.fontToggle) await ctx.fontToggle.refreshStyles();

    announce(ctx, ctx.highContrast ? "High contrast mode enabled" : "High contrast mode disabled", 'assertive');
    playSound(ctx, 'click');
  };
}

// Factory function to create font size cycle toggle
function createCycleFontSize(ctx: GameContext) {
  return async () => {
    ctx.fontSize = ctx.fontSize === 'medium' ? 'large' : ctx.fontSize === 'large' ? 'small' : 'medium';

    if (ctx.fontToggle) {
      const sizeLabel = ctx.fontSize === 'small' ? 'A-' : ctx.fontSize === 'large' ? 'A+' : 'A';
      ctx.fontToggle.setText(`Font: ${sizeLabel}`);
    }

    // Calculate font scale: small = 0.75, medium = 1.0, large = 1.5
    const fontScale = ctx.fontSize === 'small' ? 0.75 : ctx.fontSize === 'large' ? 1.5 : 1.0;

    // Update theme font scale (this affects all widgets globally)
    if (ctx.appContext) {
      await ctx.appContext.bridge.send('setFontScale', { scale: fontScale });
    }

    announce(ctx, `Font size: ${ctx.fontSize}`, 'polite');
    playSound(ctx, 'click');
  };
}

// Build the UI
export function buildTicTacToe(a: any) {
  // Create a fresh game context for this instance (fixes test isolation)
  const ctx = createGameContext();
  ctx.appContext = (a as any).ctx;
  ctx.accessibilityManager = getAccessibilityManager(ctx.appContext);

  // Create bound versions of game functions that use this context
  // This is dependency injection - functions close over the context
  const makeMoveBound = (index: number) => makeMove(ctx, index);
  const newGameBound = () => newGame(ctx);
  const undoMoveBound = () => undoMove(ctx);
  const showHintBound = () => showHint(ctx);
  const toggleTTSBound = () => createToggleTTS(ctx)();
  const toggleHighContrastBound = () => createToggleHighContrast(ctx)();
  const cycleFontSizeBound = () => createCycleFontSize(ctx)();

  applyStyles(ctx);

  a.window({ title: "Accessible Tic-Tac-Toe" }, () => {
    a.vbox(() => {
      // Accessibility controls
      a.hbox(() => {
        ctx.ttsToggle = a.button("TTS: OFF", "control").onClick(toggleTTSBound)
          .withId('ttsToggle')
          .accessibility({
            label: "Text-to-Speech Toggle",
            description: "Enable or disable spoken game announcements",
            role: "switch",
            hint: "Press T to toggle"
          });

        ctx.contrastToggle = a.button("High Contrast: OFF", "control").onClick(toggleHighContrastBound)
          .withId('contrastToggle')
          .accessibility({
            label: "High Contrast Mode",
            description: "Switch to high contrast display",
            role: "switch",
            hint: "Press H to toggle"
          });

        ctx.fontToggle = a.button("Font: A", "control").onClick(cycleFontSizeBound)
          .withId('fontToggle')
          .accessibility({
            label: "Font Size",
            description: "Cycle through font sizes",
            role: "button",
            hint: "Press F to cycle"
          });
      });

      // Status display
      ctx.statusLabel = a.label("Player X's turn", "status")
        .withId('status')
        .accessibility({
          label: "Game Status",
          description: "Shows current player and game state",
          role: "status"
        });

      // Game board - 3x3 grid
      a.grid(3, () => {
        for (let i = 0; i < 9; i++) {
          const position = getCellDescription(i);
          const coords = getCellCoordinates(i);

          const cellButton = a.button(" ", "cell").onClick(() => makeMoveBound(i))
            .withId(`cell${i}`)
            .accessibility({
              label: position,
              description: `${coords} in \${parent.label}. Press Space or Enter to place your mark.`,
              role: "button",
              hint: `\${label} position. Use arrow keys to navigate.`
            });

          ctx.cellButtons[i] = cellButton;
        }
      })
        .withId('gameGrid')
        .accessibility({
          label: "nine cell grid",
          role: "group"
        });

      // Game controls
      a.hbox(() => {
        a.button("New Game").onClick(newGameBound)
          .withId('newGame')
          .accessibility({
            label: "New Game",
            description: "Start a new game",
            role: "button",
            hint: "Press N to start a new game"
          });

        a.button("Undo").onClick(undoMoveBound)
          .withId('undo')
          .accessibility({
            label: "Undo Move",
            description: "Take back the last move",
            role: "button",
            hint: "Press U to undo. Only available during gameplay."
          });

        a.button("Hint").onClick(showHintBound)
          .withId('hint')
          .accessibility({
            label: "Get Hint",
            description: "Suggests a good move",
            role: "button",
            hint: "Press ? for a hint"
          });

        a.button("Show Source").onClick(() => a.showSource(__filename))
          .withId('showSource')
          .accessibility({
            label: "Show Source Code",
            description: "Display the source code of this application",
            role: "button",
            hint: "View the TypeScript code that creates this UI"
          });
      });

      // Move history
      ctx.historyLabel = a.label("No moves yet", "history")
        .withId('history')
        .accessibility({
          label: "Move History",
          description: "List of all moves made in the game",
          role: "log"
        });
    });
  });
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  // Note: In a real Fyne implementation, keyboard shortcuts would be handled
  // via the bridge. This is a documentation of the intended shortcuts.

// console.log("\n=== Keyboard Shortcuts ===");
// console.log("Arrow Keys: Navigate the board");
// console.log("Space/Enter: Place mark at focused cell");
// console.log("N: New game");
// console.log("U: Undo last move");
// console.log("?: Show hint");
// console.log("T: Toggle TTS");
// console.log("H: Toggle high contrast");
// console.log("F: Change font size");
// console.log("=========================\n");
}

// Run directly when executed as main script
if (require.main === module) {
  // Create app and build the game UI
  // Note: buildTicTacToe creates its own isolated game context for each instance,
  // which prevents test isolation issues
  const myApp = app({ title: "Accessible Tic-Tac-Toe" }, (a) => {
    buildTicTacToe(a);
  });

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

// console.log("\n=== Accessible Tic-Tac-Toe ===");
// console.log("Accessibility Features:");
// console.log("✓ TTS - Announces moves, turns, and game state");
// console.log("✓ Keyboard Navigation - Arrow keys + Space/Enter");
// console.log("✓ High Contrast - Clear visual markers");
// console.log("✓ Font Size - Small/Medium/Large options");
// console.log("✓ Audio Feedback - Distinct sounds for X, O, win");
// console.log("✓ ARIA Labels - Every cell has position description");
// console.log("✓ Move History - Full game transcript");
// console.log("✓ Undo Feature - Take back mistakes");
// console.log("✓ Hints - Suggests good moves");
// console.log("✓ Position Context - Row/column coordinates");
// console.log("===============================\n");

// console.log("Game Rules:");
// console.log("- Players alternate placing X and O");
// console.log("- Get three in a row to win (horizontal, vertical, or diagonal)");
// console.log("- If board fills with no winner, it's a draw");
// console.log("\nAccessibility Tip:");
// console.log("Enable TTS first to hear all game announcements!\n");
}
