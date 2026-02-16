import { Position } from './types';

// ---- Chess Types (mirrors server types) ----

export type ChessPieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type ChessColor = 'white' | 'black';

export interface ChessPiece {
  type: ChessPieceType;
  color: ChessColor;
  hasMoved: boolean;
}

export interface ChessState {
  board: (ChessPiece | null)[][];
  currentTurn: ChessColor;
  players: { white: string; black: string };
  captures: { white: ChessPiece[]; black: ChessPiece[] };
  winner: string | null;
  winReason: string | null;
  enPassantTarget: Position | null;
  moveCount: number;
  halfMoveClock: number;
  inCheck: boolean;
  lastMove: { from: Position; to: Position } | null;
}

// ---- Helpers ----

function isInBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

function cloneBoard(board: (ChessPiece | null)[][]): (ChessPiece | null)[][] {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function oppositeColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}

function findKing(board: (ChessPiece | null)[][], color: ChessColor): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

// ---- Attack / Threat Detection ----

function isSquareAttackedBy(board: (ChessPiece | null)[][], pos: Position, byColor: ChessColor): boolean {
  // Knight attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of knightOffsets) {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (isInBounds({ row: r, col: c })) {
      const piece = board[r][c];
      if (piece && piece.color === byColor && piece.type === 'knight') return true;
    }
  }

  // Pawn attacks
  const pawnDir = byColor === 'white' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const r = pos.row + pawnDir;
    const c = pos.col + dc;
    if (isInBounds({ row: r, col: c })) {
      const piece = board[r][c];
      if (piece && piece.color === byColor && piece.type === 'pawn') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (isInBounds({ row: r, col: c })) {
        const piece = board[r][c];
        if (piece && piece.color === byColor && piece.type === 'king') return true;
      }
    }
  }

  // Rook/Queen: horizontal and vertical
  const rookDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of rookDirs) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (isInBounds({ row: r, col: c })) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'rook' || piece.type === 'queen')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // Bishop/Queen: diagonals
  const bishopDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of bishopDirs) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (isInBounds({ row: r, col: c })) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'bishop' || piece.type === 'queen')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return false;
}

function isKingInCheck(board: (ChessPiece | null)[][], color: ChessColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  return isSquareAttackedBy(board, kingPos, oppositeColor(color));
}

// ---- Pseudo-legal Move Generation ----

function getPseudoLegalMoves(
  board: (ChessPiece | null)[][],
  pos: Position,
  enPassantTarget: Position | null,
): Position[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  switch (piece.type) {
    case 'pawn': return getPawnMoves(board, pos, piece, enPassantTarget);
    case 'rook': return getSlidingMoves(board, pos, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    case 'bishop': return getSlidingMoves(board, pos, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    case 'queen': return getSlidingMoves(board, pos, piece, [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ]);
    case 'knight': return getKnightMoves(board, pos, piece);
    case 'king': return getKingMoves(board, pos, piece);
    default: return [];
  }
}

function getPawnMoves(
  board: (ChessPiece | null)[][],
  pos: Position,
  piece: ChessPiece,
  enPassantTarget: Position | null,
): Position[] {
  const moves: Position[] = [];
  const dir = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;

  // Forward one
  const oneStep = { row: pos.row + dir, col: pos.col };
  if (isInBounds(oneStep) && !board[oneStep.row][oneStep.col]) {
    moves.push(oneStep);

    // Forward two from starting position
    if (pos.row === startRow) {
      const twoStep = { row: pos.row + 2 * dir, col: pos.col };
      if (!board[twoStep.row][twoStep.col]) {
        moves.push(twoStep);
      }
    }
  }

  // Diagonal captures
  for (const dc of [-1, 1]) {
    const target = { row: pos.row + dir, col: pos.col + dc };
    if (isInBounds(target)) {
      const targetPiece = board[target.row][target.col];
      if (targetPiece && targetPiece.color !== piece.color) {
        moves.push(target);
      }
      // En passant
      if (enPassantTarget && target.row === enPassantTarget.row && target.col === enPassantTarget.col) {
        moves.push(target);
      }
    }
  }

  return moves;
}

function getSlidingMoves(
  board: (ChessPiece | null)[][],
  pos: Position,
  piece: ChessPiece,
  directions: number[][],
): Position[] {
  const moves: Position[] = [];
  for (const [dr, dc] of directions) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (isInBounds({ row: r, col: c })) {
      const target = board[r][c];
      if (target) {
        if (target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      moves.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
  }
  return moves;
}

function getKnightMoves(
  board: (ChessPiece | null)[][],
  pos: Position,
  piece: ChessPiece,
): Position[] {
  const moves: Position[] = [];
  const offsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  for (const [dr, dc] of offsets) {
    const target = { row: pos.row + dr, col: pos.col + dc };
    if (isInBounds(target)) {
      const targetPiece = board[target.row][target.col];
      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push(target);
      }
    }
  }
  return moves;
}

function getKingMoves(
  board: (ChessPiece | null)[][],
  pos: Position,
  piece: ChessPiece,
): Position[] {
  const moves: Position[] = [];

  // Normal king moves
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const target = { row: pos.row + dr, col: pos.col + dc };
      if (isInBounds(target)) {
        const targetPiece = board[target.row][target.col];
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push(target);
        }
      }
    }
  }

  // Castling
  if (!piece.hasMoved && !isSquareAttackedBy(board, pos, oppositeColor(piece.color))) {
    // Kingside
    const kingsideRook = board[pos.row][7];
    if (
      kingsideRook &&
      kingsideRook.type === 'rook' &&
      kingsideRook.color === piece.color &&
      !kingsideRook.hasMoved &&
      !board[pos.row][5] &&
      !board[pos.row][6] &&
      !isSquareAttackedBy(board, { row: pos.row, col: 5 }, oppositeColor(piece.color)) &&
      !isSquareAttackedBy(board, { row: pos.row, col: 6 }, oppositeColor(piece.color))
    ) {
      moves.push({ row: pos.row, col: 6 });
    }

    // Queenside
    const queensideRook = board[pos.row][0];
    if (
      queensideRook &&
      queensideRook.type === 'rook' &&
      queensideRook.color === piece.color &&
      !queensideRook.hasMoved &&
      !board[pos.row][1] &&
      !board[pos.row][2] &&
      !board[pos.row][3] &&
      !isSquareAttackedBy(board, { row: pos.row, col: 2 }, oppositeColor(piece.color)) &&
      !isSquareAttackedBy(board, { row: pos.row, col: 3 }, oppositeColor(piece.color))
    ) {
      moves.push({ row: pos.row, col: 2 });
    }
  }

  return moves;
}

// ---- Legal Move Filtering ----

function wouldBeInCheck(
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  color: ChessColor,
  enPassantTarget: Position | null,
): boolean {
  const testBoard = cloneBoard(board);
  const piece = testBoard[from.row][from.col]!;

  // Handle en passant capture
  if (piece.type === 'pawn' && enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col) {
    testBoard[from.row][to.col] = null;
  }

  testBoard[to.row][to.col] = piece;
  testBoard[from.row][from.col] = null;

  return isKingInCheck(testBoard, color);
}

/**
 * Get all legal moves for a piece at a given position.
 * Used by ChessBoard to show valid move indicators.
 */
export function getValidMoves(state: ChessState, pos: Position): Position[] {
  const piece = state.board[pos.row]?.[pos.col];
  if (!piece || piece.color !== state.currentTurn) return [];

  const pseudoMoves = getPseudoLegalMoves(state.board, pos, state.enPassantTarget);

  return pseudoMoves.filter(to => !wouldBeInCheck(state.board, pos, to, piece.color, state.enPassantTarget));
}
