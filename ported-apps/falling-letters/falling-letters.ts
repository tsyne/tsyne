/**
 * Falling Letters Game
 *
 * A faithful port of Dropping Letters from https://gitlab.com/xixired/dropping-letters-modern
 * Original authors: @sil (Stuart Langridge), fork by @xixired
 * License: See original repository
 *
 * A word puzzle game where letters fall into columns and players
 * select letters to form valid English words for points.
 *
 * @tsyne-app:name Falling Letters
 * @tsyne-app:icon <<SVG
 * <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
 *   <rect x="2" y="2" width="5" height="20" fill="#1a5276" stroke="#333"/>
 *   <rect x="9" y="6" width="5" height="16" fill="#2874a6" stroke="#333"/>
 *   <rect x="16" y="4" width="5" height="18" fill="#3498db" stroke="#333"/>
 *   <text x="3" y="8" font-size="4" fill="white" font-weight="bold">A</text>
 *   <text x="10" y="12" font-size="4" fill="white" font-weight="bold">B</text>
 *   <text x="17" y="10" font-size="4" fill="white" font-weight="bold">C</text>
 * </svg>
 * SVG
 * @tsyne-app:category games
 * @tsyne-app:builder createFallingLettersApp
 * @tsyne-app:args app
 */

import { app } from '../../core/src';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';
import type { Label } from '../../core/src/widgets/display';
import type { TappableCanvasRaster } from '../../core/src/widgets/canvas';

// ============================================================================
// Constants
// ============================================================================

const NUM_COLUMNS = 7;
const MAX_ROWS = 10;
const CELL_SIZE = 40;
const CANVAS_WIDTH = NUM_COLUMNS * CELL_SIZE;
const CANVAS_HEIGHT = MAX_ROWS * CELL_SIZE;

// Letter frequencies (based on English usage - from original game)
const LETTER_FREQUENCIES: Record<string, number> = {
  'A': 66, 'B': 19, 'C': 22, 'D': 28, 'E': 72, 'F': 12, 'G': 18, 'H': 20,
  'I': 41, 'J': 4, 'K': 14, 'L': 40, 'M': 22, 'N': 35, 'O': 48, 'P': 22,
  'Q': 1, 'R': 43, 'S': 75, 'T': 37, 'U': 26, 'V': 7, 'W': 13, 'X': 3,
  'Y': 19, 'Z': 4
};

// Letter scores (Scrabble-style - from original game)
const LETTER_SCORES: Record<string, number> = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
  'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
  'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
  'Y': 4, 'Z': 10
};

// Basic English word list (common 3-7 letter words for dictionary validation)
// In a full implementation, this would be loaded from a file
const WORD_LIST = new Set([
  // 3-letter words
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'boy', 'did', 'man', 'any', 'let', 'put', 'say', 'too', 'use', 'run',
  'cat', 'dog', 'eat', 'big', 'red', 'top', 'box', 'cup', 'hat', 'sun',
  'bed', 'pen', 'car', 'bus', 'bag', 'air', 'ice', 'hot', 'wet', 'dry',
  // 4-letter words
  'that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'been',
  'call', 'come', 'make', 'than', 'find', 'more', 'long', 'here', 'both',
  'down', 'each', 'even', 'good', 'just', 'last', 'life', 'look', 'made',
  'many', 'most', 'much', 'only', 'over', 'same', 'such', 'take', 'them',
  'then', 'time', 'very', 'were', 'what', 'when', 'word', 'work', 'year',
  'also', 'back', 'been', 'does', 'give', 'goes', 'hand', 'high', 'into',
  'know', 'kind', 'keep', 'left', 'line', 'like', 'live', 'love', 'mind',
  'name', 'need', 'next', 'part', 'play', 'said', 'side', 'some', 'sure',
  'tell', 'turn', 'want', 'well', 'went', 'book', 'city', 'come', 'days',
  'done', 'door', 'fact', 'feel', 'form', 'gave', 'girl', 'hard', 'head',
  'hear', 'help', 'home', 'hour', 'idea', 'keep', 'knew', 'land', 'late',
  'less', 'list', 'lost', 'mean', 'meet', 'move', 'must', 'near', 'once',
  'open', 'read', 'real', 'room', 'seen', 'show', 'soon', 'stop', 'talk',
  'test', 'till', 'tree', 'true', 'upon', 'used', 'walk', 'week', 'wide',
  'game', 'drop', 'fall', 'word', 'text', 'type', 'blue', 'best', 'fast',
  // 5-letter words
  'about', 'after', 'again', 'being', 'below', 'black', 'bring', 'build',
  'could', 'every', 'first', 'found', 'front', 'going', 'great', 'green',
  'group', 'house', 'large', 'later', 'learn', 'leave', 'light', 'might',
  'money', 'never', 'night', 'order', 'other', 'place', 'plant', 'point',
  'power', 'right', 'river', 'shall', 'small', 'sound', 'south', 'start',
  'state', 'still', 'story', 'study', 'their', 'there', 'these', 'thing',
  'think', 'those', 'three', 'today', 'under', 'until', 'water', 'where',
  'which', 'while', 'white', 'whole', 'woman', 'world', 'would', 'write',
  'young', 'years', 'above', 'added', 'along', 'among', 'began', 'begin',
  'board', 'break', 'brown', 'carry', 'cause', 'check', 'child', 'class',
  'close', 'color', 'court', 'cover', 'cross', 'death', 'doing', 'doubt',
  'drive', 'early', 'earth', 'eight', 'enemy', 'enjoy', 'enter', 'equal',
  'error', 'event', 'exact', 'exist', 'extra', 'faith', 'field', 'final',
  'floor', 'force', 'forth', 'given', 'glass', 'grade', 'grand', 'grass',
  'happy', 'heard', 'heart', 'heavy', 'horse', 'human', 'image', 'issue',
  'judge', 'known', 'laugh', 'level', 'local', 'lower', 'major', 'march',
  'match', 'maybe', 'media', 'metal', 'model', 'month', 'moral', 'movie',
  'music', 'north', 'occur', 'offer', 'often', 'paper', 'party', 'peace',
  'phone', 'piece', 'plane', 'press', 'price', 'print', 'prove', 'queen',
  'quick', 'quiet', 'quite', 'radio', 'raise', 'range', 'reach', 'ready',
  'score', 'sense', 'serve', 'seven', 'shall', 'shape', 'share', 'sharp',
  'short', 'shown', 'since', 'skill', 'sleep', 'smile', 'solid', 'solve',
  'space', 'speak', 'speed', 'spend', 'sport', 'staff', 'stage', 'stand',
  'stock', 'stone', 'store', 'style', 'sugar', 'table', 'taken', 'taste',
  'teach', 'thank', 'throw', 'tired', 'title', 'total', 'touch', 'track',
  'trade', 'train', 'treat', 'trial', 'tribe', 'trick', 'truck', 'trust',
  'truth', 'twice', 'union', 'upper', 'usual', 'value', 'video', 'visit',
  'voice', 'watch', 'whole', 'whose', 'women', 'worse', 'worst', 'worth',
  'wrong', 'youth', 'letter', 'words', 'plays', 'games',
  // 6-letter words
  'action', 'always', 'amount', 'answer', 'around', 'become', 'before',
  'behind', 'better', 'beyond', 'border', 'bottle', 'bottom', 'branch',
  'breath', 'bridge', 'bright', 'broken', 'budget', 'button', 'camera',
  'campus', 'cancer', 'cannot', 'carbon', 'career', 'casino', 'castle',
  'cattle', 'center', 'chance', 'change', 'charge', 'choice', 'choose',
  'church', 'circle', 'client', 'closed', 'coffee', 'column', 'combat',
  'coming', 'common', 'county', 'couple', 'course', 'create', 'credit',
  'crisis', 'custom', 'damage', 'danger', 'dealer', 'debate', 'decade',
  'decide', 'defeat', 'defend', 'define', 'degree', 'demand', 'design',
  'desire', 'detail', 'device', 'dinner', 'direct', 'doctor', 'dollar',
  'domain', 'double', 'driver', 'during', 'easily', 'eating', 'editor',
  'effect', 'effort', 'eighth', 'either', 'eleven', 'emerge', 'empire',
  'enable', 'ending', 'energy', 'engage', 'engine', 'enough', 'ensure',
  'entire', 'entity', 'equity', 'escape', 'estate', 'ethnic', 'exceed',
  'except', 'expand', 'expect', 'expert', 'export', 'extend', 'extent',
  'fabric', 'factor', 'failed', 'fairly', 'fallen', 'family', 'famous',
  'father', 'fellow', 'female', 'figure', 'filter', 'finger', 'finish',
  'fiscal', 'flight', 'flower', 'follow', 'forced', 'forest', 'forget',
  'formal', 'format', 'former', 'fourth', 'friend', 'future', 'garden',
  'gather', 'gender', 'global', 'golden', 'ground', 'growth', 'guilty',
  'handle', 'happen', 'health', 'height', 'hidden', 'holder', 'honest',
  'horror', 'impact', 'import', 'income', 'indeed', 'injury', 'inside',
  'intent', 'island', 'itself', 'jersey', 'junior', 'killed', 'labour',
  'laptop', 'latest', 'latter', 'launch', 'lawyer', 'leader', 'league',
  'legend', 'length', 'lesson', 'likely', 'linked', 'liquid', 'listen',
  'living', 'losing', 'lovely', 'luxury', 'mainly', 'making', 'manage',
  'manner', 'manual', 'margin', 'marine', 'marked', 'market', 'master',
  'matter', 'medium', 'member', 'memory', 'mental', 'merely', 'method',
  'middle', 'minute', 'mirror', 'mobile', 'modern', 'moment', 'monkey',
  'mother', 'motion', 'moving', 'murder', 'museum', 'mutual', 'myself',
  'nation', 'native', 'nature', 'nearby', 'nearly', 'needle', 'notice',
  'notion', 'number', 'object', 'obtain', 'office', 'online', 'option',
  'orange', 'origin', 'output', 'parent', 'patent', 'people', 'period',
  'permit', 'person', 'phrase', 'planet', 'player', 'please', 'plenty',
  'pocket', 'police', 'policy', 'poster', 'potato', 'powder', 'prefer',
  'pretty', 'prince', 'prison', 'profit', 'prompt', 'proper', 'proven',
  'public', 'pursue', 'puzzle', 'racing', 'random', 'rarely', 'rather',
  'rating', 'reader', 'really', 'reason', 'recall', 'recent', 'record',
  'reduce', 'reform', 'refuse', 'regard', 'region', 'relate', 'relief',
  'remain', 'remind', 'remote', 'remove', 'repair', 'repeat', 'report',
  'rescue', 'result', 'retail', 'retain', 'retire', 'return', 'reveal',
  'review', 'reward', 'rhythm', 'rights', 'rising', 'robust', 'rocket',
  'rubber', 'ruling', 'runner', 'safely', 'safety', 'salary', 'sample',
  'saving', 'scared', 'scheme', 'school', 'screen', 'search', 'season',
  'second', 'secret', 'sector', 'secure', 'seeing', 'seeing', 'select',
  'seller', 'senior', 'sensor', 'series', 'served', 'server', 'settle',
  'severe', 'sexual', 'should', 'signal', 'signed', 'silent', 'silver',
  'simple', 'simply', 'single', 'sister', 'slight', 'slowly', 'smooth',
  'soccer', 'social', 'socket', 'sodium', 'solely', 'solver', 'sought',
  'source', 'speech', 'spirit', 'spread', 'spring', 'square', 'stable',
  'status', 'steady', 'stolen', 'stored', 'stream', 'street', 'stress',
  'strike', 'string', 'strong', 'struck', 'studio', 'stupid', 'submit',
  'sudden', 'suffer', 'summer', 'summit', 'supply', 'surely', 'survey',
  'switch', 'symbol', 'system', 'tablet', 'taking', 'talent', 'target',
  'taught', 'tenant', 'tender', 'tennis', 'terror', 'tested', 'thanks',
  'theory', 'thirty', 'though', 'threat', 'thrown', 'ticket', 'timber',
  'timing', 'tissue', 'toward', 'trader', 'travel', 'treaty', 'tribal',
  'troops', 'trying', 'tunnel', 'turkey', 'twelve', 'twenty', 'unable',
  'unique', 'united', 'unlike', 'update', 'useful', 'valley', 'varied',
  'vendor', 'vessel', 'victim', 'viewer', 'virgin', 'virtue', 'vision',
  'visual', 'volume', 'voters', 'waited', 'walker', 'wallet', 'warmth',
  'wealth', 'weapon', 'weekly', 'weight', 'wheels', 'wholly', 'widely',
  'wilson', 'window', 'winner', 'winter', 'wishes', 'within', 'wonder',
  'wooden', 'worker', 'worthy', 'writer', 'yellow',
  // 7-letter words
  'abandon', 'ability', 'absence', 'academy', 'account', 'accused', 'achieve',
  'acquire', 'address', 'advance', 'adverse', 'advised', 'adviser', 'affairs',
  'airline', 'airport', 'alleged', 'amazing', 'analyst', 'ancient', 'animals',
  'another', 'anxiety', 'anybody', 'anymore', 'applied', 'arrange', 'arrival',
  'article', 'assault', 'athlete', 'attempt', 'attract', 'auction', 'average',
  'awarded', 'banking', 'barrier', 'battery', 'bearing', 'beating', 'because',
  'bedroom', 'believe', 'beneath', 'benefit', 'besides', 'between', 'billion',
  'booking', 'brother', 'brought', 'builder', 'burning', 'cabinet', 'calling',
  'capable', 'capital', 'captain', 'capture', 'careful', 'carrier', 'central',
  'century', 'certain', 'chamber', 'chapter', 'charter', 'cheaper', 'chicken',
  'chronic', 'circuit', 'classic', 'climate', 'closest', 'closing', 'clothes',
  'coastal', 'collins', 'college', 'combine', 'command', 'comment', 'classic',
  'company', 'compare', 'complex', 'concept', 'concern', 'confirm', 'connect',
  'consent', 'contact', 'contain', 'content', 'contest', 'context', 'control',
  'convert', 'cooling', 'correct', 'council', 'counter', 'country', 'cutting',
  'dealing', 'decided', 'decline', 'default', 'defense', 'deficit', 'deliver',
  'density', 'deposit', 'desktop', 'despite', 'destroy', 'develop', 'devote',
  'diamond', 'digital', 'dinosaur', 'diploma', 'disease', 'distant', 'diverse',
  'dollars', 'drawing', 'dropped', 'eastern', 'economy', 'edition', 'elderly',
  'elected', 'element', 'embrace', 'emotion', 'emperor', 'enhance', 'enormous',
  'episode', 'equally', 'essence', 'evening', 'exactly', 'examine', 'example',
  'excited', 'execute', 'exhibit', 'expense', 'explain', 'explore', 'express',
  'extreme', 'factory', 'failing', 'failure', 'falling', 'farmers', 'fashion',
  'fastest', 'fathers', 'fatigue', 'feature', 'federal', 'feeling', 'fiction',
  'fifteen', 'fighter', 'finally', 'finance', 'finding', 'firefox', 'fishing',
  'fitness', 'focused', 'follows', 'forcing', 'forever', 'formula', 'fortune',
  'forward', 'founder', 'freedom', 'freight', 'freshly', 'friends', 'funding',
  'funeral', 'further', 'gallery', 'gateway', 'gazette', 'general', 'genetic',
  'genuine', 'getting', 'glasses', 'graphic', 'gravity', 'greater', 'greatly',
  'grocery', 'growing', 'habitat', 'halfway', 'hanging', 'happens', 'harbour',
  'hardest', 'healthy', 'hearing', 'heavily', 'helping', 'herself', 'highest',
  'highway', 'himself', 'history', 'hitting', 'holding', 'holiday', 'horizon',
  'hostile', 'housing', 'however', 'hundred', 'hunting', 'husband', 'illegal',
  'illness', 'imagine', 'imaging', 'implied', 'improve', 'include', 'indexed',
  'initial', 'inquiry', 'insight', 'install', 'instant', 'instead', 'intense',
  'interim', 'involve', 'islamic', 'islands', 'keeping', 'killing', 'kitchen',
  'knowing', 'labeled', 'landing', 'largely', 'lasting', 'leading', 'learned',
  'leather', 'leaving', 'leisure', 'lengthy', 'lesbian', 'letters', 'letting',
  'liberal', 'liberty', 'library', 'licence', 'lighter', 'limited', 'lincoln',
  'listing', 'literal', 'logical', 'looking', 'lottery', 'machine', 'kingdom',
].map(w => w.toUpperCase()));

type GameState = 'ready' | 'playing' | 'paused' | 'gameover';

interface LetterCell {
  letter: string;
  selected: boolean;
}

interface FallingLetter {
  letter: string;
  col: number;
  y: number;        // Current visual Y position (0 = top of screen)
  targetY: number;  // Target visual Y position where it will land
}

// ============================================================================
// Game Logic
// ============================================================================

export class FallingLettersGame {
  private columns: LetterCell[][];
  private fallingLetters: FallingLetter[] = [];
  private selectedCells: Array<{ col: number; row: number }> = [];
  private currentWord: string = '';
  private gameState: GameState = 'ready';
  private score: number = 0;
  private bestScore: number = 0;
  private dropInterval: number = 2000;
  private tickCount: number = 0;
  private lastDrop: number = 0;
  private onUpdate?: () => void;
  private onGameEnd?: () => void;

  private static readonly FALL_SPEED = 0.15; // Rows per tick (adjustable)

  constructor() {
    this.columns = [];
    this.initColumns();
  }

  /**
   * Initialize empty columns
   */
  private initColumns(): void {
    this.columns = [];
    for (let col = 0; col < NUM_COLUMNS; col++) {
      this.columns[col] = [];
    }
  }

  /**
   * Get a random letter weighted by frequency
   */
  private getRandomWeightedLetter(): string {
    let sumOfWeights = 0;
    for (const k in LETTER_FREQUENCIES) {
      sumOfWeights += LETTER_FREQUENCIES[k];
    }

    let selection = Math.floor(Math.random() * sumOfWeights);
    for (const k in LETTER_FREQUENCIES) {
      if (selection < LETTER_FREQUENCIES[k]) return k;
      selection -= LETTER_FREQUENCIES[k];
    }
    return 'E'; // Fallback
  }

  /**
   * Check if a word is valid
   */
  isValidWord(word: string): boolean {
    return word.length >= 3 && WORD_LIST.has(word.toUpperCase());
  }

  /**
   * Start a new game
   */
  startGame(): void {
    this.initColumns();
    this.fallingLetters = [];
    this.selectedCells = [];
    this.currentWord = '';
    this.score = 0;
    this.tickCount = 0;
    this.dropInterval = 2000;
    this.lastDrop = Date.now();
    this.gameState = 'playing';
    this.onUpdate?.();
  }

  /**
   * Drop a letter into a random column
   */
  private dropLetter(): void {
    const col = Math.floor(Math.random() * NUM_COLUMNS);
    const letter = this.getRandomWeightedLetter();

    // Calculate target row (array index where this letter will land)
    // Also count falling letters heading to this column
    const fallingToThisCol = this.fallingLetters.filter(f => f.col === col).length;
    const targetRow = this.columns[col].length + fallingToThisCol;

    // Check for game over before spawning
    if (targetRow >= MAX_ROWS) {
      this.gameState = 'gameover';
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
      }
      this.onGameEnd?.();
      return;
    }

    // Convert target row (array index) to visual Y position
    // Row 0 in array displays at bottom (visual row MAX_ROWS-1)
    const targetY = MAX_ROWS - 1 - targetRow;

    // Create a falling letter starting at the top
    this.fallingLetters.push({
      letter,
      col,
      y: 0,
      targetY,
    });
  }

  /**
   * Game tick - drop letters periodically and animate falling
   */
  tick(): void {
    if (this.gameState !== 'playing') return;

    const now = Date.now();

    // Spawn new letters periodically
    if (now - this.lastDrop >= this.dropInterval) {
      this.lastDrop = now;
      this.tickCount += 5;
      this.dropInterval = Math.max(500, 2000 - this.tickCount);
      this.dropLetter();
    }

    // Animate falling letters
    let needsUpdate = false;
    const landed: FallingLetter[] = [];

    for (const falling of this.fallingLetters) {
      falling.y += FallingLettersGame.FALL_SPEED;

      // Check if letter has landed (y increases downward visually)
      if (falling.y >= falling.targetY) {
        falling.y = falling.targetY;
        landed.push(falling);
      }
      needsUpdate = true;
    }

    // Move landed letters to columns
    for (const letter of landed) {
      this.columns[letter.col].push({ letter: letter.letter, selected: false });
      const idx = this.fallingLetters.indexOf(letter);
      if (idx >= 0) this.fallingLetters.splice(idx, 1);
    }

    if (needsUpdate) {
      this.onUpdate?.();
    }
  }

  /**
   * Select or deselect a cell
   */
  selectCell(col: number, row: number): void {
    if (this.gameState !== 'playing') return;
    if (col < 0 || col >= NUM_COLUMNS) return;
    if (row < 0 || row >= this.columns[col].length) return;

    const cell = this.columns[col][row];

    if (!cell.selected) {
      // Select the cell
      cell.selected = true;
      this.selectedCells.push({ col, row });
      this.currentWord += cell.letter;
    } else {
      // Only allow deselecting the last selected cell
      const lastSelected = this.selectedCells[this.selectedCells.length - 1];
      if (lastSelected && lastSelected.col === col && lastSelected.row === row) {
        cell.selected = false;
        this.selectedCells.pop();
        this.currentWord = this.currentWord.slice(0, -1);
      }
    }

    this.onUpdate?.();
  }

  /**
   * Submit the current word
   */
  submitWord(): boolean {
    if (this.isValidWord(this.currentWord)) {
      // Calculate score
      let letterScore = 0;
      for (const char of this.currentWord) {
        letterScore += LETTER_SCORES[char] || 1;
      }
      const wordScore = letterScore * this.currentWord.length;
      this.score += wordScore;

      // Remove selected cells (from highest row to lowest to avoid index shifting)
      const sorted = [...this.selectedCells].sort((a, b) => b.row - a.row);
      for (const { col, row } of sorted) {
        this.columns[col].splice(row, 1);
      }

      // Clear selection
      this.selectedCells = [];
      this.currentWord = '';
      this.onUpdate?.();
      return true;
    } else {
      // Invalid word - clear selection
      this.clearSelection();
      return false;
    }
  }

  /**
   * Clear current selection
   */
  clearSelection(): void {
    for (const { col, row } of this.selectedCells) {
      if (this.columns[col][row]) {
        this.columns[col][row].selected = false;
      }
    }
    this.selectedCells = [];
    this.currentWord = '';
    this.onUpdate?.();
  }

  /**
   * Toggle pause
   */
  togglePause(): void {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.lastDrop = Date.now();
    }
    this.onUpdate?.();
  }

  // Getters
  getColumns(): LetterCell[][] { return this.columns; }
  getFallingLetters(): FallingLetter[] { return this.fallingLetters; }
  getCurrentWord(): string { return this.currentWord; }
  getGameState(): GameState { return this.gameState; }
  getScore(): number { return this.score; }
  getBestScore(): number { return this.bestScore; }
  getSelectedCells(): Array<{ col: number; row: number }> { return this.selectedCells; }

  setOnUpdate(callback: () => void): void { this.onUpdate = callback; }
  setOnGameEnd(callback: () => void): void { this.onGameEnd = callback; }
}

// ============================================================================
// UI Class
// ============================================================================

export class FallingLettersUI {
  private game: FallingLettersGame;
  private a: App;
  private win: Window | null = null;
  private canvas: TappableCanvasRaster | null = null;
  private wordLabel: Label | null = null;
  private scoreLabel: Label | null = null;
  private statusLabel: Label | null = null;
  private gameLoop: NodeJS.Timeout | null = null;

  constructor(a: App) {
    this.a = a;
    this.game = new FallingLettersGame();
    this.game.setOnUpdate(() => this.render());
    this.game.setOnGameEnd(() => this.handleGameEnd());
  }

  setupWindow(win: Window): void {
    this.win = win;
    win.setMainMenu([
      {
        label: 'Game',
        items: [
          { label: 'New Game', onSelected: () => this.startGame() },
          { label: 'Pause/Resume', onSelected: () => this.game.togglePause() },
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

  buildContent(): void {
    this.a.vbox(() => {
      // Control buttons
      this.a.hbox(() => {
        this.a.button('New Game').onClick(() => this.startGame()).withId('newGameBtn');
        this.a.button('Pause').onClick(() => this.game.togglePause()).withId('pauseBtn');
      });

      // Score display
      this.a.hbox(() => {
        this.a.label('Score: ');
        this.scoreLabel = this.a.label('0').withId('scoreLabel');
      });

      // Current word display with submit area
      this.a.hbox(() => {
        this.a.label('Word: ');
        this.wordLabel = this.a.label('').withId('wordLabel');
        this.a.button('Submit').onClick(() => this.submitWord()).withId('submitBtn');
        this.a.button('Clear').onClick(() => this.game.clearSelection()).withId('clearBtn');
      });

      this.statusLabel = this.a.label('Press New Game to start').withId('statusLabel');

      this.a.separator();

      // Game board canvas
      this.canvas = this.a.tappableCanvasRaster(CANVAS_WIDTH, CANVAS_HEIGHT, {
        onTap: (x, y) => this.handleTap(x, y),
      });

      this.a.separator();
      this.a.label('Tap letters to form words, then Submit');
    });
  }

  private handleTap(x: number, y: number): void {
    const col = Math.floor(x / CELL_SIZE);
    // Y is inverted - letters stack from bottom
    const row = MAX_ROWS - 1 - Math.floor(y / CELL_SIZE);
    const columns = this.game.getColumns();

    if (col >= 0 && col < NUM_COLUMNS && row >= 0 && row < columns[col].length) {
      this.game.selectCell(col, row);
    }
  }

  private async submitWord(): Promise<void> {
    const word = this.game.getCurrentWord();
    const success = this.game.submitWord();

    if (success && this.win) {
      // Brief visual feedback could be added here
    } else if (!success && this.win && word.length > 0) {
      // Could show "Not a valid word" feedback
    }
  }

  private async startGame(): Promise<void> {
    this.game.startGame();
    if (this.statusLabel) await this.statusLabel.setText('Playing...');
    this.startGameLoop();
    await this.render();
  }

  private startGameLoop(): void {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = setInterval(() => {
      this.game.tick();
    }, 100);
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

  private async render(): Promise<void> {
    if (!this.canvas) return;

    // Use efficient buffer-based rendering
    const buffer = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT * 4);
    const columns = this.game.getColumns();
    const currentWord = this.game.getCurrentWord();
    const isValidWord = this.game.isValidWord(currentWord);

    // Background (gray)
    for (let i = 0; i < CANVAS_WIDTH * CANVAS_HEIGHT; i++) {
      const offset = i * 4;
      buffer[offset] = 239;
      buffer[offset + 1] = 239;
      buffer[offset + 2] = 239;
      buffer[offset + 3] = 255;
    }

    // Draw grid lines
    for (let col = 0; col <= NUM_COLUMNS; col++) {
      const x = col * CELL_SIZE;
      if (x < CANVAS_WIDTH) {
        for (let y = 0; y < CANVAS_HEIGHT; y++) {
          this.setPixel(buffer, x, y, 200, 200, 200);
        }
      }
    }

    for (let row = 0; row <= MAX_ROWS; row++) {
      const y = row * CELL_SIZE;
      if (y < CANVAS_HEIGHT) {
        for (let x = 0; x < CANVAS_WIDTH; x++) {
          this.setPixel(buffer, x, y, 200, 200, 200);
        }
      }
    }

    // Draw letters (bottom-up display)
    for (let col = 0; col < NUM_COLUMNS; col++) {
      for (let row = 0; row < columns[col].length; row++) {
        const cell = columns[col][row];
        // Display from bottom (row 0 at bottom)
        const displayRow = MAX_ROWS - 1 - row;
        const x0 = col * CELL_SIZE + 1;
        const y0 = displayRow * CELL_SIZE + 1;

        // Determine color based on selection state
        let r: number, g: number, b: number;
        if (columns[col].length >= MAX_ROWS) {
          r = 255; g = 0; b = 0; // Red for full column
        } else if (cell.selected) {
          if (isValidWord) {
            r = 76; g = 175; b = 80; // Green for valid word
          } else {
            r = 244; g = 67; b = 54; // Red for invalid
          }
        } else {
          // Blue gradient based on row
          r = Math.floor(26 + row * 15);
          g = Math.floor(82 + row * 15);
          b = Math.floor(118 + row * 10);
        }

        // Draw cell background
        for (let dy = 0; dy < CELL_SIZE - 2; dy++) {
          for (let dx = 0; dx < CELL_SIZE - 2; dx++) {
            this.setPixel(buffer, x0 + dx, y0 + dy, r, g, b);
          }
        }

        // Draw letter (simple block representation)
        this.drawLetterToBuffer(buffer, cell.letter, x0 + 8, y0 + 8, 255, 255, 255);
      }
    }

    // Draw falling letters
    const fallingLetters = this.game.getFallingLetters();
    for (const falling of fallingLetters) {
      const x0 = falling.col * CELL_SIZE + 1;
      // y is already in visual coordinates (0 = top)
      const y0 = Math.floor(falling.y * CELL_SIZE) + 1;

      // Falling letters are orange/yellow to distinguish from settled letters
      const r = 255, g = 152, b = 0;

      // Draw cell background
      for (let dy = 0; dy < CELL_SIZE - 2; dy++) {
        for (let dx = 0; dx < CELL_SIZE - 2; dx++) {
          this.setPixel(buffer, x0 + dx, y0 + dy, r, g, b);
        }
      }

      // Draw letter
      this.drawLetterToBuffer(buffer, falling.letter, x0 + 8, y0 + 8, 255, 255, 255);
    }

    await this.canvas.setPixelBuffer(buffer);

    // Update labels
    if (this.scoreLabel) await this.scoreLabel.setText(String(this.game.getScore()));
    if (this.wordLabel) {
      const word = this.game.getCurrentWord();
      const valid = this.game.isValidWord(word);
      await this.wordLabel.setText(word + (word.length > 0 ? (valid ? ' ✓' : ' ✗') : ''));
    }

    const state = this.game.getGameState();
    if (this.statusLabel) {
      if (state === 'paused') await this.statusLabel.setText('PAUSED');
      else if (state === 'gameover') await this.statusLabel.setText('GAME OVER');
      else if (state === 'playing') await this.statusLabel.setText('');
    }
  }

  // 5x7 pixel font patterns for letters
  private static readonly LETTER_PATTERNS: Record<string, number[]> = {
    'A': [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    'B': [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
    'C': [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
    'D': [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
    'E': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
    'F': [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
    'G': [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
    'H': [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    'I': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
    'J': [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
    'K': [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
    'L': [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
    'M': [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
    'N': [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
    'O': [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'P': [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
    'Q': [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
    'R': [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
    'S': [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
    'T': [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
    'U': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    'V': [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
    'W': [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
    'X': [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
    'Y': [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
    'Z': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  };

  /**
   * Draw a letter to the buffer using efficient direct indexing
   */
  private drawLetterToBuffer(
    buffer: Uint8Array,
    letter: string,
    x0: number, y0: number,
    r: number, g: number, b: number
  ): void {
    const pattern = FallingLettersUI.LETTER_PATTERNS[letter] || FallingLettersUI.LETTER_PATTERNS['A'];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if ((pattern[row] >> (4 - col)) & 1) {
          const px = x0 + col * 3;
          const py = y0 + row * 3;
          // Draw 2x2 pixel for each bit
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              this.setPixel(buffer, px + dx, py + dy, r, g, b);
            }
          }
        }
      }
    }
  }

  private async handleGameEnd(): Promise<void> {
    if (this.gameLoop) clearInterval(this.gameLoop);
    if (this.win) {
      await this.win.showInfo('Game Over',
        `Final Score: ${this.game.getScore()}\n` +
        `Best Score: ${this.game.getBestScore()}`
      );
    }
  }

  private async showHelp(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo('How to Play',
      'Falling Letters Rules:\n\n' +
      '1. Letters fall into 7 columns over time\n' +
      '2. Tap letters to select them and form words\n' +
      '3. Words must be at least 3 letters long\n' +
      '4. Click Submit when you have a valid word\n' +
      '5. Score = letter points × word length\n' +
      '6. Game ends when any column reaches 10 letters\n\n' +
      'Tips:\n' +
      '- Longer words score more points\n' +
      '- Rare letters (Q, Z, X, J) are worth more\n' +
      '- Keep columns balanced to survive longer'
    );
  }

  private async showAbout(): Promise<void> {
    if (!this.win) return;
    await this.win.showInfo('About Falling Letters',
      'Falling Letters v1.0.0\n\n' +
      'A port of Dropping Letters from:\n' +
      'gitlab.com/xixired/dropping-letters-modern\n\n' +
      'Original author: @sil (Stuart Langridge)\n' +
      'Fork by: @xixired\n' +
      'License: See original repository\n\n' +
      'Ported to Tsyne framework'
    );
  }

  async initialize(): Promise<void> {
    await this.render();
  }

  cleanup(): void {
    if (this.gameLoop) clearInterval(this.gameLoop);
  }
}

// ============================================================================
// App Factory
// ============================================================================

export function createFallingLettersApp(a: App): FallingLettersUI {
  const ui = new FallingLettersUI(a);

  a.registerCleanup(() => ui.cleanup());

  a.window({ title: 'Falling Letters', width: 350, height: 550 }, (win: Window) => {
    ui.setupWindow(win);
    win.setContent(() => ui.buildContent());
    win.show();
  });

  return ui;
}

// Export for testing
export { LETTER_FREQUENCIES, LETTER_SCORES, WORD_LIST, NUM_COLUMNS, MAX_ROWS };

// Standalone entry point
if (require.main === module) {
  app({ title: 'Falling Letters' }, async (a: App) => {
    const ui = createFallingLettersApp(a);
    await a.run();
    await ui.initialize();
  });
}
