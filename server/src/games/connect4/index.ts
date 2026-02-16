import { GameEngine, Position } from '../../types';

// ---- Four in a Row Types ----

export type Connect4Color = 'red' | 'yellow';

export interface Connect4State {
  board: (Connect4Color | null)[][]; // 6 rows x 7 columns, [0][0] is top-left
  currentTurn: Connect4Color;
  players: { red: string; yellow: string }; // player IDs
  winner: string | null;
  winReason: string | null;
  lastMove: Position | null; // for highlighting the last dropped piece
  winningCells: Position[] | null; // the 4 cells that form the winning line
}

export interface Connect4Move {
  from: Position; // unused, will be {row:0,col:0}
  to: Position;   // to.col = the column to drop into (0-6), to.row is ignored
}

// ---- Constants ----

const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

// ---- Helper Functions ----

function createEmptyBoard(): (Connect4Color | null)[][] {
  return Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null));
}

function cloneBoard(board: (Connect4Color | null)[][]): (Connect4Color | null)[][] {
  return board.map(row => [...row]);
}

function getPlayerColor(state: Connect4State, playerId: string): Connect4Color | null {
  if (state.players.red === playerId) return 'red';
  if (state.players.yellow === playerId) return 'yellow';
  return null;
}

/**
 * Find the lowest empty row in a column. Returns -1 if the column is full.
 */
function getLowestEmptyRow(board: (Connect4Color | null)[][], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      return row;
    }
  }
  return -1;
}

/**
 * Check if the entire board is full (draw condition).
 */
function isBoardFull(board: (Connect4Color | null)[][]): boolean {
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === null) {
      return false;
    }
  }
  return true;
}

// Direction vectors for checking lines: horizontal, vertical, diag-down-right, diag-down-left
const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal down-right
  [1, -1],  // diagonal down-left
];

/**
 * Find a winning line of 4 on the board.
 * Returns the winning cells if found, or null if no winner.
 */
function findWinningLine(board: (Connect4Color | null)[][]): { color: Connect4Color; cells: Position[] } | null {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = board[row][col];
      if (!color) continue;

      for (const [dRow, dCol] of DIRECTIONS) {
        const cells: Position[] = [];
        let valid = true;

        for (let i = 0; i < WIN_LENGTH; i++) {
          const r = row + i * dRow;
          const c = col + i * dCol;

          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== color) {
            valid = false;
            break;
          }

          cells.push({ row: r, col: c });
        }

        if (valid) {
          return { color, cells };
        }
      }
    }
  }

  return null;
}

// ---- Game Engine ----

export const connect4Engine: GameEngine<Connect4State, Connect4Move> = {
  initGame(playerIds: [string, string]): Connect4State {
    // Randomly assign colors
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];
    return {
      board: createEmptyBoard(),
      currentTurn: 'red', // red always goes first
      players: {
        red: shuffled[0],
        yellow: shuffled[1],
      },
      winner: null,
      winReason: null,
      lastMove: null,
      winningCells: null,
    };
  },

  validateMove(state: Connect4State, playerId: string, move: Connect4Move): string | null {
    if (state.winner) return 'Game is already over';

    const color = getPlayerColor(state, playerId);
    if (!color) return 'You are not a player in this game';
    if (color !== state.currentTurn) return 'It is not your turn';

    const col = move.to.col;

    // Validate column range
    if (col < 0 || col >= COLS || !Number.isInteger(col)) {
      return 'Invalid column';
    }

    // Check if the column is full
    if (getLowestEmptyRow(state.board, col) === -1) {
      return 'That column is full';
    }

    return null;
  },

  applyMove(state: Connect4State, playerId: string, move: Connect4Move): Connect4State {
    const col = move.to.col;
    const color = getPlayerColor(state, playerId)!;
    const newBoard = cloneBoard(state.board);

    // Find the lowest empty row and place the piece
    const row = getLowestEmptyRow(newBoard, col);
    newBoard[row][col] = color;

    // Switch turn
    const nextTurn: Connect4Color = state.currentTurn === 'red' ? 'yellow' : 'red';

    // Detect winning line after placing the piece
    const winLine = findWinningLine(newBoard);

    return {
      ...state,
      board: newBoard,
      currentTurn: nextTurn,
      lastMove: { row, col },
      winningCells: winLine ? winLine.cells : state.winningCells,
    };
  },

  getState(state: Connect4State, _playerId: string): unknown {
    // Both players see the full board - no hidden information
    return {
      board: state.board,
      currentTurn: state.currentTurn,
      players: state.players,
      winner: state.winner,
      winReason: state.winReason,
      lastMove: state.lastMove,
      winningCells: state.winningCells,
    };
  },

  checkWinner(state: Connect4State): { winner: string | null; reason?: string } | null {
    const result = findWinningLine(state.board);

    if (result) {
      return {
        winner: state.players[result.color],
        reason: `${result.color} gets four in a row!`,
      };
    }

    // Check for draw
    if (isBoardFull(state.board)) {
      return {
        winner: null,
        reason: 'The board is full - it\'s a draw!',
      };
    }

    return null;
  },
};
