import { CheckersState, CheckersPiece, Position } from './types';

function isInBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

function getJumpsForPiece(
  board: (CheckersPiece | null)[][],
  pos: Position,
  piece: CheckersPiece,
): Position[] {
  const jumps: Position[] = [];
  // Kings can jump in any direction; regular pieces only jump forward
  const directions: number[] = [];
  if (piece.isKing) {
    directions.push(-1, 1);
  } else if (piece.color === 'red') {
    directions.push(-1);
  } else {
    directions.push(1);
  }

  for (const dRow of directions) {
    for (const dCol of [-1, 1]) {
      const midPos: Position = { row: pos.row + dRow, col: pos.col + dCol };
      const landPos: Position = { row: pos.row + 2 * dRow, col: pos.col + 2 * dCol };

      if (
        isInBounds(midPos) &&
        isInBounds(landPos) &&
        board[midPos.row][midPos.col] !== null &&
        board[midPos.row][midPos.col]!.color !== piece.color &&
        board[landPos.row][landPos.col] === null
      ) {
        jumps.push(landPos);
      }
    }
  }

  return jumps;
}

function getSimpleMovesForPiece(
  board: (CheckersPiece | null)[][],
  pos: Position,
  piece: CheckersPiece,
): Position[] {
  const moves: Position[] = [];
  const directions: number[] = [];

  if (piece.isKing || piece.color === 'red') directions.push(-1);
  if (piece.isKing || piece.color === 'black') directions.push(1);

  for (const dRow of directions) {
    for (const dCol of [-1, 1]) {
      const newPos: Position = { row: pos.row + dRow, col: pos.col + dCol };
      if (isInBounds(newPos) && board[newPos.row][newPos.col] === null) {
        moves.push(newPos);
      }
    }
  }

  return moves;
}

function playerHasJumps(board: (CheckersPiece | null)[][], color: string): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        if (getJumpsForPiece(board, { row, col }, piece).length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Client-side move calculation for highlighting valid destinations */
export function getValidMoves(state: CheckersState, pos: Position): Position[] {
  const piece = state.board[pos.row]?.[pos.col];
  if (!piece || piece.color !== state.currentTurn) return [];

  if (state.mustContinueFrom) {
    if (pos.row !== state.mustContinueFrom.row || pos.col !== state.mustContinueFrom.col) {
      return [];
    }
    return getJumpsForPiece(state.board, pos, piece);
  }

  const hasJumps = playerHasJumps(state.board, state.currentTurn);
  if (hasJumps) {
    return getJumpsForPiece(state.board, pos, piece);
  }

  return getSimpleMovesForPiece(state.board, pos, piece);
}
