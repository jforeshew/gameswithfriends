import { GameEngine, Position } from '../../types';

// ---- Gomoku Types ----

export type GomokuColor = 'black' | 'white';

export interface GomokuMove {
  from: Position; // unused, will be {row:0, col:0}
  to: Position;   // the intersection to place a stone
}

export interface GomokuState {
  board: (GomokuColor | null)[][]; // 15x15
  currentTurn: GomokuColor;
  players: { black: string; white: string }; // player IDs
  winner: string | null;
  winReason: string | null;
  lastMove: Position | null;
  winningCells: Position[] | null;
  moveCount: number;
}

// ---- Constants ----

const BOARD_SIZE = 15;
const WIN_LENGTH = 5;

// All 8 directions: horizontal, vertical, and diagonal
const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal right
  [1, 0],   // vertical down
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

// ---- Helper Functions ----

function createEmptyBoard(): (GomokuColor | null)[][] {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

function cloneBoard(board: (GomokuColor | null)[][]): (GomokuColor | null)[][] {
  return board.map(row => [...row]);
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOpponent(color: GomokuColor): GomokuColor {
  return color === 'black' ? 'white' : 'black';
}

function getPlayerColor(state: GomokuState, playerId: string): GomokuColor | null {
  if (state.players.black === playerId) return 'black';
  if (state.players.white === playerId) return 'white';
  return null;
}

/**
 * Check for exactly 5 in a row starting from a given position in a given direction.
 * Returns the list of winning cells if found, or null otherwise.
 * "Exactly 5" means the line of the same color is not longer than 5
 * (i.e., 6+ in a row does NOT count as a win in standard Gomoku with overline restriction).
 *
 * NOTE: The specification says "exactly 5 in a row wins". We implement strict Gomoku
 * rules where exactly 5 consecutive stones of the same color wins.
 */
function checkLineFromPosition(
  board: (GomokuColor | null)[][],
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  color: GomokuColor,
): Position[] | null {
  // Collect consecutive stones in both directions from (row, col)
  const cells: Position[] = [{ row, col }];

  // Extend in the positive direction
  let r = row + dRow;
  let c = col + dCol;
  while (isInBounds(r, c) && board[r][c] === color) {
    cells.push({ row: r, col: c });
    r += dRow;
    c += dCol;
  }

  // Extend in the negative direction
  r = row - dRow;
  c = col - dCol;
  while (isInBounds(r, c) && board[r][c] === color) {
    cells.unshift({ row: r, col: c });
    r -= dRow;
    c -= dCol;
  }

  if (cells.length === WIN_LENGTH) {
    return cells;
  }

  return null;
}

/**
 * Check if placing a stone at (row, col) creates a winning line.
 * Returns the winning cells if a win is detected, or null.
 */
function findWinningLine(
  board: (GomokuColor | null)[][],
  row: number,
  col: number,
  color: GomokuColor,
): Position[] | null {
  for (const [dRow, dCol] of DIRECTIONS) {
    const result = checkLineFromPosition(board, row, col, dRow, dCol, color);
    if (result) {
      return result;
    }
  }
  return null;
}

/**
 * Check if the board is completely full (draw condition).
 */
function isBoardFull(board: (GomokuColor | null)[][]): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) return false;
    }
  }
  return true;
}

// ---- Game Engine ----

export const gomokuEngine: GameEngine<GomokuState, GomokuMove> = {
  initGame(playerIds: [string, string]): GomokuState {
    // Randomly assign colors
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];

    return {
      board: createEmptyBoard(),
      currentTurn: 'black', // black always goes first in Gomoku
      players: {
        black: shuffled[0],
        white: shuffled[1],
      },
      winner: null,
      winReason: null,
      lastMove: null,
      winningCells: null,
      moveCount: 0,
    };
  },

  validateMove(state: GomokuState, playerId: string, move: GomokuMove): string | null {
    if (state.winner) return 'Game is already over';

    const color = getPlayerColor(state, playerId);
    if (!color) return 'You are not a player in this game';
    if (color !== state.currentTurn) return 'It is not your turn';

    const { row, col } = move.to;

    // Validate position bounds
    if (!Number.isInteger(row) || !Number.isInteger(col) || !isInBounds(row, col)) {
      return 'Position out of bounds';
    }

    // Check if the intersection is empty
    if (state.board[row][col] !== null) {
      return 'That intersection is already occupied';
    }

    return null;
  },

  applyMove(state: GomokuState, playerId: string, move: GomokuMove): GomokuState {
    const color = getPlayerColor(state, playerId)!;
    const { row, col } = move.to;
    const newBoard = cloneBoard(state.board);

    // Place the stone
    newBoard[row][col] = color;

    // Check for a winning line through the newly placed stone
    const winningCells = findWinningLine(newBoard, row, col, color);

    const newState: GomokuState = {
      ...state,
      board: newBoard,
      currentTurn: getOpponent(color),
      lastMove: { row, col },
      moveCount: state.moveCount + 1,
      winningCells: winningCells,
    };

    // If there's a winner, set it immediately
    if (winningCells) {
      newState.winner = playerId;
      newState.winReason = `${color.charAt(0).toUpperCase() + color.slice(1)} wins with five in a row!`;
    }

    return newState;
  },

  getState(state: GomokuState, _playerId: string): unknown {
    // Both players see the full board - no hidden information in Gomoku
    return {
      board: state.board,
      currentTurn: state.currentTurn,
      players: state.players,
      winner: state.winner,
      winReason: state.winReason,
      lastMove: state.lastMove,
      winningCells: state.winningCells,
      moveCount: state.moveCount,
    };
  },

  checkWinner(state: GomokuState): { winner: string | null; reason?: string } | null {
    // If a winner was already determined in applyMove
    if (state.winner) {
      return {
        winner: state.winner,
        reason: state.winReason || 'Five in a row!',
      };
    }

    // Check for draw (board is full with no winner)
    if (isBoardFull(state.board)) {
      return {
        winner: null,
        reason: "It's a draw! The board is completely full.",
      };
    }

    // Game is still in progress
    return null;
  },
};
