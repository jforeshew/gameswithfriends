import { GameEngine, Position } from '../../types';

// ---- Dots and Boxes Types ----

export type DotsBoxesColor = 'red' | 'blue';

export interface DotsBoxesMove {
  from: Position; // dot 1 (row, col in dot grid)
  to: Position;   // dot 2 (adjacent dot)
}

export interface DotsBoxesState {
  // 5x5 grid of dots = 4x4 grid of boxes
  gridSize: number; // 5 (dots), so 4x4 boxes
  // Lines drawn: stored as a set of line keys "r1,c1-r2,c2" (normalized so smaller point first)
  lines: string[];
  // Who drew each line
  lineOwners: Record<string, DotsBoxesColor>;
  // Box ownership: boxes[row][col] = color of who completed it, or null
  boxes: (DotsBoxesColor | null)[][];
  currentTurn: DotsBoxesColor;
  players: { red: string; blue: string };
  scores: { red: number; blue: number };
  winner: string | null;
  winReason: string | null;
  lastLine: string | null; // for highlighting
}

// ---- Constants ----

const GRID_SIZE = 5; // 5x5 dots = 4x4 boxes
const BOX_SIZE = GRID_SIZE - 1; // 4x4 boxes

// ---- Helper Functions ----

/**
 * Normalize a line key so that the "smaller" position comes first.
 * Comparison: first by row, then by col.
 * Format: "r1,c1-r2,c2"
 */
function normalizeLineKey(from: Position, to: Position): string {
  if (from.row < to.row || (from.row === to.row && from.col < to.col)) {
    return `${from.row},${from.col}-${to.row},${to.col}`;
  }
  return `${to.row},${to.col}-${from.row},${from.col}`;
}

/**
 * Check if two dots are adjacent (horizontally or vertically, exactly 1 step apart).
 */
function areAdjacent(from: Position, to: Position): boolean {
  const dr = Math.abs(from.row - to.row);
  const dc = Math.abs(from.col - to.col);
  // Exactly one of dr/dc must be 1, the other must be 0
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

/**
 * Check if a position is a valid dot on the grid.
 */
function isValidDot(pos: Position): boolean {
  return (
    Number.isInteger(pos.row) &&
    Number.isInteger(pos.col) &&
    pos.row >= 0 &&
    pos.row < GRID_SIZE &&
    pos.col >= 0 &&
    pos.col < GRID_SIZE
  );
}

/**
 * Get the player's color from their ID.
 */
function getPlayerColor(state: DotsBoxesState, playerId: string): DotsBoxesColor | null {
  if (state.players.red === playerId) return 'red';
  if (state.players.blue === playerId) return 'blue';
  return null;
}

/**
 * Create an empty boxes grid (4x4).
 */
function createEmptyBoxes(): (DotsBoxesColor | null)[][] {
  return Array(BOX_SIZE)
    .fill(null)
    .map(() => Array(BOX_SIZE).fill(null));
}

/**
 * Get the four line keys that form the sides of a box at (boxRow, boxCol).
 * Box (r, c) has corners at dots (r,c), (r,c+1), (r+1,c), (r+1,c+1).
 */
function getBoxSides(boxRow: number, boxCol: number): string[] {
  return [
    normalizeLineKey({ row: boxRow, col: boxCol }, { row: boxRow, col: boxCol + 1 }),       // top
    normalizeLineKey({ row: boxRow + 1, col: boxCol }, { row: boxRow + 1, col: boxCol + 1 }), // bottom
    normalizeLineKey({ row: boxRow, col: boxCol }, { row: boxRow + 1, col: boxCol }),         // left
    normalizeLineKey({ row: boxRow, col: boxCol + 1 }, { row: boxRow + 1, col: boxCol + 1 }), // right
  ];
}

/**
 * Given a line between two dots, find which boxes (0, 1, or 2) that line borders.
 * Returns an array of {row, col} box positions.
 */
function getAdjacentBoxes(from: Position, to: Position): Position[] {
  const boxes: Position[] = [];

  if (from.row === to.row) {
    // Horizontal line: same row, adjacent columns
    const row = from.row;
    const minCol = Math.min(from.col, to.col);
    // Box above the line (if it exists)
    if (row - 1 >= 0) {
      boxes.push({ row: row - 1, col: minCol });
    }
    // Box below the line (if it exists)
    if (row < BOX_SIZE) {
      boxes.push({ row: row, col: minCol });
    }
  } else {
    // Vertical line: same column, adjacent rows
    const col = from.col;
    const minRow = Math.min(from.row, to.row);
    // Box to the left of the line (if it exists)
    if (col - 1 >= 0) {
      boxes.push({ row: minRow, col: col - 1 });
    }
    // Box to the right of the line (if it exists)
    if (col < BOX_SIZE) {
      boxes.push({ row: minRow, col: col });
    }
  }

  return boxes;
}

/**
 * Check if all four sides of a box are drawn.
 */
function isBoxComplete(lineSet: Set<string>, boxRow: number, boxCol: number): boolean {
  const sides = getBoxSides(boxRow, boxCol);
  return sides.every(side => lineSet.has(side));
}

/**
 * Calculate the total number of possible lines in the grid.
 * Horizontal lines: GRID_SIZE rows * (GRID_SIZE - 1) cols = 5 * 4 = 20
 * Vertical lines: (GRID_SIZE - 1) rows * GRID_SIZE cols = 4 * 5 = 20
 * Total: 40
 */
function getTotalLineCount(): number {
  return GRID_SIZE * (GRID_SIZE - 1) * 2;
}

// ---- Game Engine ----

export const dotsboxesEngine: GameEngine<DotsBoxesState, DotsBoxesMove> = {
  initGame(playerIds: [string, string]): DotsBoxesState {
    // Randomly assign colors
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];

    return {
      gridSize: GRID_SIZE,
      lines: [],
      lineOwners: {},
      boxes: createEmptyBoxes(),
      currentTurn: 'red', // red always goes first
      players: {
        red: shuffled[0],
        blue: shuffled[1],
      },
      scores: { red: 0, blue: 0 },
      winner: null,
      winReason: null,
      lastLine: null,
    };
  },

  validateMove(state: DotsBoxesState, playerId: string, move: DotsBoxesMove): string | null {
    if (state.winner) return 'Game is already over';

    const color = getPlayerColor(state, playerId);
    if (!color) return 'You are not a player in this game';
    if (color !== state.currentTurn) return 'It is not your turn';

    const { from, to } = move;

    // Validate positions are valid dots
    if (!isValidDot(from) || !isValidDot(to)) {
      return 'Invalid dot position';
    }

    // Validate the dots are adjacent
    if (!areAdjacent(from, to)) {
      return 'Dots must be horizontally or vertically adjacent';
    }

    // Check if this line is already drawn
    const lineKey = normalizeLineKey(from, to);
    const lineSet = new Set(state.lines);
    if (lineSet.has(lineKey)) {
      return 'That line is already drawn';
    }

    return null;
  },

  applyMove(state: DotsBoxesState, playerId: string, move: DotsBoxesMove): DotsBoxesState {
    const color = getPlayerColor(state, playerId)!;
    const { from, to } = move;
    const lineKey = normalizeLineKey(from, to);

    // Add the new line
    const newLines = [...state.lines, lineKey];
    const newLineOwners = { ...state.lineOwners, [lineKey]: color };
    const lineSet = new Set(newLines);

    // Clone boxes
    const newBoxes = state.boxes.map(row => [...row]);

    // Check which boxes this line might complete
    const adjacentBoxes = getAdjacentBoxes(from, to);
    let boxesCompleted = 0;

    for (const box of adjacentBoxes) {
      if (newBoxes[box.row][box.col] === null && isBoxComplete(lineSet, box.row, box.col)) {
        newBoxes[box.row][box.col] = color;
        boxesCompleted++;
      }
    }

    // Update scores
    const newScores = { ...state.scores };
    newScores[color] += boxesCompleted;

    // Determine next turn: if player completed a box, they go again; otherwise switch
    let nextTurn: DotsBoxesColor;
    if (boxesCompleted > 0) {
      nextTurn = color; // bonus turn for completing a box
    } else {
      nextTurn = color === 'red' ? 'blue' : 'red';
    }

    return {
      ...state,
      lines: newLines,
      lineOwners: newLineOwners,
      boxes: newBoxes,
      currentTurn: nextTurn,
      scores: newScores,
      lastLine: lineKey,
    };
  },

  getState(state: DotsBoxesState, _playerId: string): unknown {
    // Both players see the full board - no hidden information
    return {
      gridSize: state.gridSize,
      lines: state.lines,
      lineOwners: state.lineOwners,
      boxes: state.boxes,
      currentTurn: state.currentTurn,
      players: state.players,
      scores: state.scores,
      winner: state.winner,
      winReason: state.winReason,
      lastLine: state.lastLine,
    };
  },

  checkWinner(state: DotsBoxesState): { winner: string | null; reason?: string } | null {
    // Game ends when all lines are drawn
    if (state.lines.length < getTotalLineCount()) {
      return null; // game still in progress
    }

    // All lines are drawn - determine winner by score
    if (state.scores.red > state.scores.blue) {
      return {
        winner: state.players.red,
        reason: `Red wins ${state.scores.red} to ${state.scores.blue}!`,
      };
    } else if (state.scores.blue > state.scores.red) {
      return {
        winner: state.players.blue,
        reason: `Blue wins ${state.scores.blue} to ${state.scores.red}!`,
      };
    } else {
      return {
        winner: null,
        reason: `It's a draw! Both players have ${state.scores.red} boxes.`,
      };
    }
  },
};
