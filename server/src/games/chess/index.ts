import { GameEngine, Position } from '../../types';

// ---- Chess Types ----

export type ChessPieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type ChessColor = 'white' | 'black';

export interface ChessPiece {
  type: ChessPieceType;
  color: ChessColor;
  hasMoved: boolean;
}

export interface ChessMove {
  from: Position;
  to: Position;
  promotion?: ChessPieceType;
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

function cloneState(state: ChessState): ChessState {
  return {
    ...state,
    board: cloneBoard(state.board),
    captures: {
      white: state.captures.white.map(p => ({ ...p })),
      black: state.captures.black.map(p => ({ ...p })),
    },
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    lastMove: state.lastMove
      ? { from: { ...state.lastMove.from }, to: { ...state.lastMove.to } }
      : null,
  };
}

function oppositeColor(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}

function getPlayerColor(state: ChessState, playerId: string): ChessColor | null {
  if (state.players.white === playerId) return 'white';
  if (state.players.black === playerId) return 'black';
  return null;
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

// ---- Initial Board Setup ----
// Row 0 = black's back rank (top), Row 7 = white's back rank (bottom)

function createInitialBoard(): (ChessPiece | null)[][] {
  const board: (ChessPiece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  const backRank: ChessPieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  // Black pieces (rows 0-1)
  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: 'black', hasMoved: false };
    board[1][col] = { type: 'pawn', color: 'black', hasMoved: false };
  }

  // White pieces (rows 6-7)
  for (let col = 0; col < 8; col++) {
    board[7][col] = { type: backRank[col], color: 'white', hasMoved: false };
    board[6][col] = { type: 'pawn', color: 'white', hasMoved: false };
  }

  return board;
}

// ---- Attack / Threat Detection ----

/**
 * Checks whether a given square is attacked by any piece of the given color.
 * This is a raw check that does not consider pins or legality of moves.
 */
function isSquareAttackedBy(board: (ChessPiece | null)[][], pos: Position, byColor: ChessColor): boolean {
  // Check knight attacks
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

  // Check pawn attacks
  const pawnDir = byColor === 'white' ? 1 : -1; // white pawns attack upward (lower row numbers)
  for (const dc of [-1, 1]) {
    const r = pos.row + pawnDir;
    const c = pos.col + dc;
    if (isInBounds({ row: r, col: c })) {
      const piece = board[r][c];
      if (piece && piece.color === byColor && piece.type === 'pawn') return true;
    }
  }

  // Check king attacks (adjacent squares)
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

  // Check sliding pieces (rook, bishop, queen) along lines
  // Rook/Queen: horizontal and vertical
  const rookDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of rookDirs) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (isInBounds({ row: r, col: c })) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && (piece.type === 'rook' || piece.type === 'queen')) return true;
        break; // blocked by a piece
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
// These generate moves without checking if they leave own king in check.

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
  // Normal king moves (one square in any direction)
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
    // Kingside castling (king moves to col 6, rook from col 7)
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

    // Queenside castling (king moves to col 2, rook from col 0)
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

// ---- Legal Move Generation ----
// Filters pseudo-legal moves to exclude those that leave the king in check.

function wouldBeInCheck(
  board: (ChessPiece | null)[][],
  from: Position,
  to: Position,
  color: ChessColor,
  enPassantTarget: Position | null,
): boolean {
  const testBoard = cloneBoard(board);
  const piece = testBoard[from.row][from.col]!;

  // Handle en passant capture (remove the captured pawn)
  if (piece.type === 'pawn' && enPassantTarget && to.row === enPassantTarget.row && to.col === enPassantTarget.col) {
    // The captured pawn is on the same row as the moving pawn, same col as the target
    testBoard[from.row][to.col] = null;
  }

  testBoard[to.row][to.col] = piece;
  testBoard[from.row][from.col] = null;

  return isKingInCheck(testBoard, color);
}

/**
 * Get all legal moves for a piece at a given position.
 * This is the main function used by both server validation and client highlighting.
 */
export function getValidMoves(state: ChessState, pos: Position): Position[] {
  const piece = state.board[pos.row]?.[pos.col];
  if (!piece || piece.color !== state.currentTurn) return [];

  const pseudoMoves = getPseudoLegalMoves(state.board, pos, state.enPassantTarget);

  // Filter out moves that leave the king in check
  return pseudoMoves.filter(to => !wouldBeInCheck(state.board, pos, to, piece.color, state.enPassantTarget));
}

// ---- Game Status Checks ----

function hasAnyLegalMoves(state: ChessState, color: ChessColor): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = state.board[row][col];
      if (piece && piece.color === color) {
        const tempState: ChessState = { ...state, currentTurn: color };
        const moves = getValidMoves(tempState, { row, col });
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

// ---- Chess Engine ----

export const chessEngine: GameEngine<ChessState, ChessMove> = {
  initGame(playerIds: [string, string]): ChessState {
    // Randomly assign colors
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];
    return {
      board: createInitialBoard(),
      currentTurn: 'white',
      players: {
        white: shuffled[0],
        black: shuffled[1],
      },
      captures: { white: [], black: [] },
      winner: null,
      winReason: null,
      enPassantTarget: null,
      moveCount: 0,
      halfMoveClock: 0,
      inCheck: false,
      lastMove: null,
    };
  },

  validateMove(state: ChessState, playerId: string, move: ChessMove): string | null {
    if (state.winner) return 'Game is already over';

    const color = getPlayerColor(state, playerId);
    if (!color) return 'You are not a player in this game';
    if (color !== state.currentTurn) return 'It is not your turn';

    const { from, to } = move;
    if (!isInBounds(from) || !isInBounds(to)) return 'Position out of bounds';

    const piece = state.board[from.row][from.col];
    if (!piece) return 'No piece at the selected position';
    if (piece.color !== color) return 'That is not your piece';

    const validMoves = getValidMoves(state, from);
    const isValid = validMoves.some(m => m.row === to.row && m.col === to.col);
    if (!isValid) return 'Invalid move';

    return null;
  },

  applyMove(state: ChessState, _playerId: string, move: ChessMove): ChessState {
    const newState = cloneState(state);
    const { from, to } = move;
    const piece = { ...newState.board[from.row][from.col]! };
    const capturedPiece = newState.board[to.row][to.col];

    let isCapture = !!capturedPiece;
    let isPawnMove = piece.type === 'pawn';

    // Handle en passant capture
    if (piece.type === 'pawn' && state.enPassantTarget &&
        to.row === state.enPassantTarget.row && to.col === state.enPassantTarget.col) {
      // Remove the captured pawn (it's on the same row as the moving pawn)
      const capturedPawn = newState.board[from.row][to.col];
      if (capturedPawn) {
        newState.captures[piece.color].push(capturedPawn);
        newState.board[from.row][to.col] = null;
        isCapture = true;
      }
    }

    // Standard capture
    if (capturedPiece) {
      newState.captures[piece.color].push(capturedPiece);
    }

    // Handle castling (king moves 2 squares)
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      // Move the rook
      if (to.col === 6) {
        // Kingside
        const rook = newState.board[from.row][7]!;
        newState.board[from.row][7] = null;
        newState.board[from.row][5] = { ...rook, hasMoved: true };
      } else if (to.col === 2) {
        // Queenside
        const rook = newState.board[from.row][0]!;
        newState.board[from.row][0] = null;
        newState.board[from.row][3] = { ...rook, hasMoved: true };
      }
    }

    // Set en passant target if pawn moves two squares
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
      newState.enPassantTarget = {
        row: (from.row + to.row) / 2,
        col: from.col,
      };
    } else {
      newState.enPassantTarget = null;
    }

    // Move the piece
    piece.hasMoved = true;
    newState.board[from.row][from.col] = null;

    // Handle pawn promotion (auto-promote to queen)
    const promotionRow = piece.color === 'white' ? 0 : 7;
    if (piece.type === 'pawn' && to.row === promotionRow) {
      piece.type = move.promotion || 'queen';
    }

    newState.board[to.row][to.col] = piece;

    // Update counters
    newState.moveCount++;
    if (isCapture || isPawnMove) {
      newState.halfMoveClock = 0;
    } else {
      newState.halfMoveClock++;
    }

    // Switch turns
    newState.currentTurn = oppositeColor(state.currentTurn);

    // Update check status for the new current player
    newState.inCheck = isKingInCheck(newState.board, newState.currentTurn);

    // Record last move
    newState.lastMove = { from: { ...from }, to: { ...to } };

    return newState;
  },

  getState(state: ChessState, _playerId: string): unknown {
    // Chess has no hidden information - both players see the full board
    return {
      board: state.board,
      currentTurn: state.currentTurn,
      players: state.players,
      captures: state.captures,
      winner: state.winner,
      winReason: state.winReason,
      enPassantTarget: state.enPassantTarget,
      moveCount: state.moveCount,
      halfMoveClock: state.halfMoveClock,
      inCheck: state.inCheck,
      lastMove: state.lastMove,
    };
  },

  checkWinner(state: ChessState): { winner: string | null; reason?: string } | null {
    const currentColor = state.currentTurn;
    const opponentColor = oppositeColor(currentColor);
    const hasLegal = hasAnyLegalMoves(state, currentColor);

    if (!hasLegal) {
      if (state.inCheck) {
        // Checkmate
        return {
          winner: state.players[opponentColor],
          reason: `Checkmate! ${opponentColor} wins.`,
        };
      } else {
        // Stalemate — draw
        return {
          winner: null,
          reason: 'Stalemate — the game is a draw.',
        };
      }
    }

    // 50-move rule
    if (state.halfMoveClock >= 100) {
      // 100 half-moves = 50 full moves
      return {
        winner: null,
        reason: 'Draw by the 50-move rule.',
      };
    }

    // Insufficient material check
    if (isInsufficientMaterial(state.board)) {
      return {
        winner: null,
        reason: 'Draw by insufficient material.',
      };
    }

    return null;
  },
};

// ---- Insufficient Material Detection ----

function isInsufficientMaterial(board: (ChessPiece | null)[][]): boolean {
  const pieces: ChessPiece[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) pieces.push(piece);
    }
  }

  // King vs King
  if (pieces.length === 2) return true;

  // King + Bishop vs King or King + Knight vs King
  if (pieces.length === 3) {
    const nonKings = pieces.filter(p => p.type !== 'king');
    if (nonKings.length === 1 && (nonKings[0].type === 'bishop' || nonKings[0].type === 'knight')) {
      return true;
    }
  }

  // King + Bishop vs King + Bishop (same color bishops)
  if (pieces.length === 4) {
    const bishops = pieces.filter(p => p.type === 'bishop');
    if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
      // Need to check if bishops are on same color squares
      const bishopPositions: { piece: ChessPiece; row: number; col: number }[] = [];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece && piece.type === 'bishop') {
            bishopPositions.push({ piece, row, col });
          }
        }
      }
      if (
        bishopPositions.length === 2 &&
        (bishopPositions[0].row + bishopPositions[0].col) % 2 ===
        (bishopPositions[1].row + bishopPositions[1].col) % 2
      ) {
        return true;
      }
    }
  }

  return false;
}
