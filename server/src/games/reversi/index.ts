import { GameEngine, Position } from '../../types';

// ---- Reversi Types ----

export type ReversiColor = 'black' | 'white';

export interface ReversiMove {
  from: Position; // unused, will be {row:0,col:0}
  to: Position;   // the position to place a piece
}

export interface ReversiState {
  board: (ReversiColor | null)[][]; // 8x8 board, null = empty
  currentTurn: ReversiColor;
  players: { black: string; white: string }; // player IDs
  winner: string | null;
  winReason: string | null;
  scores: { black: number; white: number }; // current piece counts
  lastMove: Position | null; // for highlighting
  flippedCells: Position[]; // cells flipped by the last move (for animation)
  validMoves: Position[]; // pre-computed valid moves for current player
  skippedLastTurn: boolean; // whether the previous turn was skipped (no valid moves)
}

// ---- Constants ----

const BOARD_SIZE = 8;

// All 8 directions: horizontal, vertical, and diagonal
const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

// ---- Helper Functions ----

function createInitialBoard(): (ReversiColor | null)[][] {
  const board: (ReversiColor | null)[][] = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  // Standard Reversi starting position: 4 pieces in the center
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';

  return board;
}

function cloneBoard(board: (ReversiColor | null)[][]): (ReversiColor | null)[][] {
  return board.map(row => [...row]);
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOpponent(color: ReversiColor): ReversiColor {
  return color === 'black' ? 'white' : 'black';
}

function getPlayerColor(state: ReversiState, playerId: string): ReversiColor | null {
  if (state.players.black === playerId) return 'black';
  if (state.players.white === playerId) return 'white';
  return null;
}

/**
 * Count the number of pieces of each color on the board.
 */
function countPieces(board: (ReversiColor | null)[][]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === 'black') black++;
      else if (board[row][col] === 'white') white++;
    }
  }
  return { black, white };
}

/**
 * Get the cells that would be flipped in a specific direction if a piece of the
 * given color is placed at (row, col). Returns an empty array if no flips in this direction.
 */
function getFlipsInDirection(
  board: (ReversiColor | null)[][],
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  color: ReversiColor,
): Position[] {
  const opponent = getOpponent(color);
  const flips: Position[] = [];

  let r = row + dRow;
  let c = col + dCol;

  // Walk along the direction, collecting opponent pieces
  while (isInBounds(r, c) && board[r][c] === opponent) {
    flips.push({ row: r, col: c });
    r += dRow;
    c += dCol;
  }

  // If we ended on one of our own pieces, the flips are valid
  // If we went out of bounds or hit an empty cell, no flips in this direction
  if (flips.length > 0 && isInBounds(r, c) && board[r][c] === color) {
    return flips;
  }

  return [];
}

/**
 * Get all cells that would be flipped if a piece of the given color is placed at (row, col).
 * Returns an empty array if no flips (meaning the move is invalid).
 */
function getAllFlips(
  board: (ReversiColor | null)[][],
  row: number,
  col: number,
  color: ReversiColor,
): Position[] {
  if (board[row][col] !== null) {
    return []; // cell is occupied
  }

  const allFlips: Position[] = [];

  for (const [dRow, dCol] of DIRECTIONS) {
    const flips = getFlipsInDirection(board, row, col, dRow, dCol, color);
    allFlips.push(...flips);
  }

  return allFlips;
}

/**
 * Get all valid moves for a player of the given color.
 * A valid move is an empty square where placing a piece would flip at least one opponent piece.
 */
export function getValidMovesForPlayer(
  board: (ReversiColor | null)[][],
  color: ReversiColor,
): Position[] {
  const validMoves: Position[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        const flips = getAllFlips(board, row, col, color);
        if (flips.length > 0) {
          validMoves.push({ row, col });
        }
      }
    }
  }

  return validMoves;
}

/**
 * Check if the board is completely full.
 */
function isBoardFull(board: (ReversiColor | null)[][]): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) return false;
    }
  }
  return true;
}

// ---- Game Engine ----

export const reversiEngine: GameEngine<ReversiState, ReversiMove> = {
  initGame(playerIds: [string, string]): ReversiState {
    // Randomly assign colors
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];
    const board = createInitialBoard();
    const scores = countPieces(board);
    const validMoves = getValidMovesForPlayer(board, 'black');

    return {
      board,
      currentTurn: 'black', // black always goes first in Reversi
      players: {
        black: shuffled[0],
        white: shuffled[1],
      },
      winner: null,
      winReason: null,
      scores,
      lastMove: null,
      flippedCells: [],
      validMoves,
      skippedLastTurn: false,
    };
  },

  validateMove(state: ReversiState, playerId: string, move: ReversiMove): string | null {
    if (state.winner) return 'Game is already over';

    const color = getPlayerColor(state, playerId);
    if (!color) return 'You are not a player in this game';
    if (color !== state.currentTurn) return 'It is not your turn';

    const { row, col } = move.to;

    // Validate position bounds
    if (!isInBounds(row, col) || !Number.isInteger(row) || !Number.isInteger(col)) {
      return 'Position out of bounds';
    }

    // Check if the cell is empty
    if (state.board[row][col] !== null) {
      return 'That square is already occupied';
    }

    // Check if the move would flip at least one opponent piece
    const flips = getAllFlips(state.board, row, col, color);
    if (flips.length === 0) {
      return 'Invalid move: must flip at least one opponent piece';
    }

    return null;
  },

  applyMove(state: ReversiState, playerId: string, move: ReversiMove): ReversiState {
    const color = getPlayerColor(state, playerId)!;
    const { row, col } = move.to;
    const newBoard = cloneBoard(state.board);

    // Get all cells to flip
    const flippedCells = getAllFlips(newBoard, row, col, color);

    // Place the piece
    newBoard[row][col] = color;

    // Flip all captured pieces
    for (const pos of flippedCells) {
      newBoard[pos.row][pos.col] = color;
    }

    // Calculate new scores
    const scores = countPieces(newBoard);

    // Determine next turn
    const opponent = getOpponent(color);
    const opponentMoves = getValidMovesForPlayer(newBoard, opponent);
    const currentPlayerMoves = getValidMovesForPlayer(newBoard, color);

    let nextTurn: ReversiColor;
    let validMoves: Position[];
    let skippedLastTurn = false;

    if (opponentMoves.length > 0) {
      // Opponent has valid moves, their turn
      nextTurn = opponent;
      validMoves = opponentMoves;
    } else if (currentPlayerMoves.length > 0) {
      // Opponent has no valid moves, skip their turn, current player goes again
      nextTurn = color;
      validMoves = currentPlayerMoves;
      skippedLastTurn = true;
    } else {
      // Neither player has valid moves - game is over
      // Set turn to opponent (doesn't matter much since the game is over)
      nextTurn = opponent;
      validMoves = [];
      skippedLastTurn = false;
    }

    return {
      ...state,
      board: newBoard,
      currentTurn: nextTurn,
      scores,
      lastMove: { row, col },
      flippedCells,
      validMoves,
      skippedLastTurn,
    };
  },

  getState(state: ReversiState, _playerId: string): unknown {
    // Both players see the full board - no hidden information in Reversi
    return {
      board: state.board,
      currentTurn: state.currentTurn,
      players: state.players,
      winner: state.winner,
      winReason: state.winReason,
      scores: state.scores,
      lastMove: state.lastMove,
      flippedCells: state.flippedCells,
      validMoves: state.validMoves,
      skippedLastTurn: state.skippedLastTurn,
    };
  },

  checkWinner(state: ReversiState): { winner: string | null; reason?: string } | null {
    // Game ends when neither player has valid moves, or board is full
    const blackMoves = getValidMovesForPlayer(state.board, 'black');
    const whiteMoves = getValidMovesForPlayer(state.board, 'white');
    const boardFull = isBoardFull(state.board);

    if (blackMoves.length > 0 || whiteMoves.length > 0) {
      // At least one player can still move (and board is not full if moves exist)
      if (!boardFull) {
        return null;
      }
    }

    // Game is over - count pieces to determine winner
    const scores = countPieces(state.board);

    if (scores.black > scores.white) {
      return {
        winner: state.players.black,
        reason: `Black wins ${scores.black} to ${scores.white}!`,
      };
    } else if (scores.white > scores.black) {
      return {
        winner: state.players.white,
        reason: `White wins ${scores.white} to ${scores.black}!`,
      };
    } else {
      return {
        winner: null,
        reason: `It's a draw! Both players have ${scores.black} pieces.`,
      };
    }
  },
};
