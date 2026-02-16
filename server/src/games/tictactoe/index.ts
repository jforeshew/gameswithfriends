import { GameEngine, Position } from '../../types';

// ---- Tic-Tac-Toe Types ----

export type TicTacToeMark = 'X' | 'O';

export interface TicTacToeMove {
  from: Position; // unused, kept for interface consistency
  to: Position;   // the cell to place the mark in
}

export interface TicTacToeState {
  board: (TicTacToeMark | null)[][]; // 3x3
  currentTurn: TicTacToeMark;
  players: { X: string; O: string };
  winner: string | null;
  winReason: string | null;
  winningCells: Position[] | null;
}

// ---- Constants ----

const SIZE = 3;

// ---- Helper Functions ----

function createEmptyBoard(): (TicTacToeMark | null)[][] {
  return Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill(null));
}

function cloneBoard(board: (TicTacToeMark | null)[][]): (TicTacToeMark | null)[][] {
  return board.map(row => [...row]);
}

function getPlayerMark(state: TicTacToeState, playerId: string): TicTacToeMark | null {
  if (state.players.X === playerId) return 'X';
  if (state.players.O === playerId) return 'O';
  return null;
}

function isBoardFull(board: (TicTacToeMark | null)[][]): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === null) return false;
    }
  }
  return true;
}

// All possible winning lines: 3 rows, 3 columns, 2 diagonals
const WINNING_LINES: Position[][] = [
  // Rows
  [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
  [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }],
  [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }],
  // Columns
  [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }],
  [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }],
  [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }],
  // Diagonals
  [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }],
  [{ row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 0 }],
];

/**
 * Find a winning line on the board.
 * Returns the winning mark and the three cells, or null if no winner.
 */
function findWinningLine(board: (TicTacToeMark | null)[][]): { mark: TicTacToeMark; cells: Position[] } | null {
  for (const line of WINNING_LINES) {
    const mark = board[line[0].row][line[0].col];
    if (!mark) continue;

    const allMatch = line.every(pos => board[pos.row][pos.col] === mark);
    if (allMatch) {
      return { mark, cells: line };
    }
  }
  return null;
}

// ---- Game Engine ----

export const tictactoeEngine: GameEngine<TicTacToeState, TicTacToeMove> = {
  initGame(playerIds: [string, string]): TicTacToeState {
    // Randomly assign X and O
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];
    return {
      board: createEmptyBoard(),
      currentTurn: 'X', // X always goes first
      players: {
        X: shuffled[0],
        O: shuffled[1],
      },
      winner: null,
      winReason: null,
      winningCells: null,
    };
  },

  validateMove(state: TicTacToeState, playerId: string, move: TicTacToeMove): string | null {
    if (state.winner) return 'Game is already over';

    const mark = getPlayerMark(state, playerId);
    if (!mark) return 'You are not a player in this game';
    if (mark !== state.currentTurn) return 'It is not your turn';

    const { row, col } = move.to;

    // Validate bounds
    if (
      row < 0 || row >= SIZE || col < 0 || col >= SIZE ||
      !Number.isInteger(row) || !Number.isInteger(col)
    ) {
      return 'Invalid position';
    }

    // Check if the cell is already occupied
    if (state.board[row][col] !== null) {
      return 'That cell is already taken';
    }

    return null;
  },

  applyMove(state: TicTacToeState, playerId: string, move: TicTacToeMove): TicTacToeState {
    const { row, col } = move.to;
    const mark = getPlayerMark(state, playerId)!;
    const newBoard = cloneBoard(state.board);

    newBoard[row][col] = mark;

    const nextTurn: TicTacToeMark = state.currentTurn === 'X' ? 'O' : 'X';

    // Detect winning line after placing the mark
    const winLine = findWinningLine(newBoard);

    return {
      ...state,
      board: newBoard,
      currentTurn: nextTurn,
      winningCells: winLine ? winLine.cells : state.winningCells,
    };
  },

  getState(state: TicTacToeState, _playerId: string): unknown {
    // Both players see the full board - no hidden information
    return {
      board: state.board,
      currentTurn: state.currentTurn,
      players: state.players,
      winner: state.winner,
      winReason: state.winReason,
      winningCells: state.winningCells,
    };
  },

  checkWinner(state: TicTacToeState): { winner: string | null; reason?: string } | null {
    const result = findWinningLine(state.board);

    if (result) {
      return {
        winner: state.players[result.mark],
        reason: `${result.mark} wins with three in a row!`,
      };
    }

    // Check for draw
    if (isBoardFull(state.board)) {
      return {
        winner: null,
        reason: "It's a draw! The board is full.",
      };
    }

    return null;
  },
};
