import { GameEngine, CheckersState, CheckersMove, CheckersPiece, PieceColor, Position } from '../../types';

function createInitialBoard(): (CheckersPiece | null)[][] {
  const board: (CheckersPiece | null)[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Place black pieces (rows 0-2)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', isKing: false };
      }
    }
  }

  // Place red pieces (rows 5-7)
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'red', isKing: false };
      }
    }
  }

  return board;
}

function cloneBoard(board: (CheckersPiece | null)[][]): (CheckersPiece | null)[][] {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function isInBounds(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
}

function getPlayerColor(state: CheckersState, playerId: string): PieceColor | null {
  if (state.players.red === playerId) return 'red';
  if (state.players.black === playerId) return 'black';
  return null;
}

function getJumpsForPiece(board: (CheckersPiece | null)[][], pos: Position, piece: CheckersPiece): Position[] {
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

function getSimpleMovesForPiece(board: (CheckersPiece | null)[][], pos: Position, piece: CheckersPiece): Position[] {
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

function playerHasJumps(board: (CheckersPiece | null)[][], color: PieceColor): boolean {
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

function playerHasAnyMoves(board: (CheckersPiece | null)[][], color: PieceColor): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        if (getJumpsForPiece(board, { row, col }, piece).length > 0) return true;
        if (getSimpleMovesForPiece(board, { row, col }, piece).length > 0) return true;
      }
    }
  }
  return false;
}

function playerHasPieces(board: (CheckersPiece | null)[][], color: PieceColor): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) return true;
    }
  }
  return false;
}

export function getValidMoves(state: CheckersState, pos: Position): Position[] {
  const piece = state.board[pos.row][pos.col];
  if (!piece || piece.color !== state.currentTurn) return [];

  // If we must continue a multi-jump with a specific piece
  if (state.mustContinueFrom) {
    if (pos.row !== state.mustContinueFrom.row || pos.col !== state.mustContinueFrom.col) {
      return [];
    }
    return getJumpsForPiece(state.board, pos, piece);
  }

  // If any piece can jump, only jumps are allowed (mandatory capture)
  const hasJumps = playerHasJumps(state.board, state.currentTurn);
  if (hasJumps) {
    return getJumpsForPiece(state.board, pos, piece);
  }

  return getSimpleMovesForPiece(state.board, pos, piece);
}

export const checkersEngine: GameEngine<CheckersState, CheckersMove> = {
  initGame(playerIds: [string, string]): CheckersState {
    // Randomly assign colors
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];
    return {
      board: createInitialBoard(),
      currentTurn: 'red', // red always moves first
      players: {
        red: shuffled[0],
        black: shuffled[1],
      },
      captures: { red: 0, black: 0 },
      winner: null,
      winReason: null,
      mustContinueFrom: null,
    };
  },

  validateMove(state: CheckersState, playerId: string, move: CheckersMove): string | null {
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

  applyMove(state: CheckersState, playerId: string, move: CheckersMove): CheckersState {
    const newBoard = cloneBoard(state.board);
    const { from, to } = move;
    const piece = { ...newBoard[from.row][from.col]! };
    const newCaptures = { ...state.captures };

    const isJump = Math.abs(to.row - from.row) === 2;

    // Move piece
    newBoard[from.row][from.col] = null;

    // Handle capture
    if (isJump) {
      const midRow = (from.row + to.row) / 2;
      const midCol = (from.col + to.col) / 2;
      newBoard[midRow][midCol] = null;
      newCaptures[piece.color]++;
    }

    // Check for king promotion
    if (piece.color === 'red' && to.row === 0) {
      piece.isKing = true;
    } else if (piece.color === 'black' && to.row === 7) {
      piece.isKing = true;
    }

    newBoard[to.row][to.col] = piece;

    // Check for multi-jump
    let mustContinueFrom: Position | null = null;
    let nextTurn = state.currentTurn === 'red' ? 'black' : 'red';

    if (isJump) {
      const furtherJumps = getJumpsForPiece(newBoard, to, piece);
      if (furtherJumps.length > 0) {
        mustContinueFrom = to;
        nextTurn = state.currentTurn; // same player continues
      }
    }

    return {
      ...state,
      board: newBoard,
      currentTurn: nextTurn as PieceColor,
      captures: newCaptures,
      mustContinueFrom,
    };
  },

  getState(state: CheckersState, _playerId: string): unknown {
    // Both players see the full board - no hidden information in checkers
    return {
      board: state.board,
      currentTurn: state.currentTurn,
      players: state.players,
      captures: state.captures,
      winner: state.winner,
      winReason: state.winReason,
      mustContinueFrom: state.mustContinueFrom,
    };
  },

  checkWinner(state: CheckersState): { winner: string; reason: string } | null {
    const opponent: PieceColor = state.currentTurn === 'red' ? 'black' : 'red';

    // Current player has no pieces
    if (!playerHasPieces(state.board, state.currentTurn)) {
      return {
        winner: state.players[opponent],
        reason: `${state.currentTurn} has no pieces remaining`,
      };
    }

    // Current player has no legal moves
    if (!playerHasAnyMoves(state.board, state.currentTurn)) {
      return {
        winner: state.players[opponent],
        reason: `${state.currentTurn} has no legal moves`,
      };
    }

    return null;
  },
};
