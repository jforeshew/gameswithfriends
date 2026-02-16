import { describe, it, expect } from 'vitest';
import { chessEngine, ChessState, ChessMove, ChessPiece } from './index';

// ---- Helpers ----

const PLAYER_WHITE = 'player-white';
const PLAYER_BLACK = 'player-black';

/**
 * Creates a game state with deterministic color assignment.
 * White is always PLAYER_WHITE, black is always PLAYER_BLACK.
 */
function initWithColors(): ChessState {
  const state = chessEngine.initGame([PLAYER_WHITE, PLAYER_BLACK]);
  // The engine randomizes colors, so normalize to a known assignment.
  if (state.players.white === PLAYER_WHITE) return state;
  return {
    ...state,
    players: { white: PLAYER_WHITE, black: PLAYER_BLACK },
  };
}

/** Shorthand for a position. */
function pos(row: number, col: number) {
  return { row, col };
}

/** Apply a sequence of moves, alternating between white and black players. */
function playMoves(state: ChessState, moves: ChessMove[]): ChessState {
  let current = state;
  for (const move of moves) {
    const playerId = current.currentTurn === 'white' ? current.players.white : current.players.black;
    const error = chessEngine.validateMove(current, playerId, move);
    if (error) {
      throw new Error(`Move validation failed: ${error} (move: ${JSON.stringify(move)}, turn: ${current.currentTurn})`);
    }
    current = chessEngine.applyMove(current, playerId, move);
  }
  return current;
}

// ---- Tests ----

describe('chessEngine', () => {
  // ========================================
  // initGame
  // ========================================
  describe('initGame', () => {
    it('returns a valid initial state', () => {
      const state = chessEngine.initGame([PLAYER_WHITE, PLAYER_BLACK]);

      expect(state.currentTurn).toBe('white');
      expect(state.winner).toBeNull();
      expect(state.winReason).toBeNull();
      expect(state.moveCount).toBe(0);
      expect(state.halfMoveClock).toBe(0);
      expect(state.inCheck).toBe(false);
      expect(state.lastMove).toBeNull();
      expect(state.enPassantTarget).toBeNull();
      expect(state.captures).toEqual({ white: [], black: [] });
    });

    it('assigns both players to white and black', () => {
      const state = chessEngine.initGame([PLAYER_WHITE, PLAYER_BLACK]);
      const assignedPlayers = [state.players.white, state.players.black].sort();
      expect(assignedPlayers).toEqual([PLAYER_BLACK, PLAYER_WHITE]);
    });

    it('sets up the board with correct piece placement', () => {
      const state = initWithColors();
      const board = state.board;

      // Board dimensions
      expect(board).toHaveLength(8);
      board.forEach(row => expect(row).toHaveLength(8));

      // Black back rank (row 0)
      const expectedBackRank: ChessPiece['type'][] = [
        'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
      ];
      for (let col = 0; col < 8; col++) {
        expect(board[0][col]).toMatchObject({ type: expectedBackRank[col], color: 'black' });
      }

      // Black pawns (row 1)
      for (let col = 0; col < 8; col++) {
        expect(board[1][col]).toMatchObject({ type: 'pawn', color: 'black' });
      }

      // Empty middle rows (rows 2-5)
      for (let row = 2; row <= 5; row++) {
        for (let col = 0; col < 8; col++) {
          expect(board[row][col]).toBeNull();
        }
      }

      // White pawns (row 6)
      for (let col = 0; col < 8; col++) {
        expect(board[6][col]).toMatchObject({ type: 'pawn', color: 'white' });
      }

      // White back rank (row 7)
      for (let col = 0; col < 8; col++) {
        expect(board[7][col]).toMatchObject({ type: expectedBackRank[col], color: 'white' });
      }
    });
  });

  // ========================================
  // validateMove
  // ========================================
  describe('validateMove', () => {
    it('rejects a move when it is not your turn', () => {
      const state = initWithColors();
      // It is white's turn; black tries to move
      const move: ChessMove = { from: pos(1, 4), to: pos(3, 4) };
      const error = chessEngine.validateMove(state, PLAYER_BLACK, move);
      expect(error).toBe('It is not your turn');
    });

    it('rejects out-of-bounds positions', () => {
      const state = initWithColors();
      const move: ChessMove = { from: pos(6, 0), to: pos(-1, 0) };
      const error = chessEngine.validateMove(state, PLAYER_WHITE, move);
      expect(error).toBe('Position out of bounds');
    });

    it('rejects moving an opponent piece', () => {
      const state = initWithColors();
      // White tries to move a black pawn
      const move: ChessMove = { from: pos(1, 0), to: pos(2, 0) };
      const error = chessEngine.validateMove(state, PLAYER_WHITE, move);
      expect(error).toBe('That is not your piece');
    });

    it('allows a legal pawn opening move', () => {
      const state = initWithColors();
      const move: ChessMove = { from: pos(6, 4), to: pos(4, 4) };
      const error = chessEngine.validateMove(state, PLAYER_WHITE, move);
      expect(error).toBeNull();
    });

    it('rejects an illegal pawn move (three squares forward)', () => {
      const state = initWithColors();
      const move: ChessMove = { from: pos(6, 4), to: pos(3, 4) };
      const error = chessEngine.validateMove(state, PLAYER_WHITE, move);
      expect(error).toBe('Invalid move');
    });
  });

  // ========================================
  // applyMove
  // ========================================
  describe('applyMove', () => {
    it('advances a pawn and updates the board', () => {
      const state = initWithColors();
      const move: ChessMove = { from: pos(6, 4), to: pos(4, 4) };
      const next = chessEngine.applyMove(state, PLAYER_WHITE, move);

      expect(next.board[6][4]).toBeNull();
      expect(next.board[4][4]).toMatchObject({ type: 'pawn', color: 'white' });
    });

    it('switches the turn after a move', () => {
      const state = initWithColors();
      const move: ChessMove = { from: pos(6, 4), to: pos(4, 4) };
      const next = chessEngine.applyMove(state, PLAYER_WHITE, move);
      expect(next.currentTurn).toBe('black');
    });

    it('records a capture', () => {
      // Set up: e4, d5, exd5 (white pawn captures black pawn)
      const state = initWithColors();
      const afterMoves = playMoves(state, [
        { from: pos(6, 4), to: pos(4, 4) }, // e4
        { from: pos(1, 3), to: pos(3, 3) }, // d5
        { from: pos(4, 4), to: pos(3, 3) }, // exd5
      ]);

      expect(afterMoves.captures.white).toHaveLength(1);
      expect(afterMoves.captures.white[0]).toMatchObject({ type: 'pawn', color: 'black' });
      expect(afterMoves.board[3][3]).toMatchObject({ type: 'pawn', color: 'white' });
    });

    it('increments the move count', () => {
      const state = initWithColors();
      const after = playMoves(state, [
        { from: pos(6, 4), to: pos(4, 4) }, // e4
        { from: pos(1, 4), to: pos(3, 4) }, // e5
      ]);
      expect(after.moveCount).toBe(2);
    });

    it('records lastMove', () => {
      const state = initWithColors();
      const move: ChessMove = { from: pos(6, 4), to: pos(4, 4) };
      const next = chessEngine.applyMove(state, PLAYER_WHITE, move);
      expect(next.lastMove).toEqual({ from: pos(6, 4), to: pos(4, 4) });
    });

    it('does not mutate the original state', () => {
      const state = initWithColors();
      const originalBoard00 = state.board[6][4];
      const move: ChessMove = { from: pos(6, 4), to: pos(4, 4) };
      chessEngine.applyMove(state, PLAYER_WHITE, move);

      // Original state should be untouched
      expect(state.board[6][4]).toBe(originalBoard00);
      expect(state.currentTurn).toBe('white');
      expect(state.moveCount).toBe(0);
    });
  });

  // ========================================
  // checkWinner
  // ========================================
  describe('checkWinner', () => {
    it('returns null for an in-progress game', () => {
      const state = initWithColors();
      const result = chessEngine.checkWinner(state);
      expect(result).toBeNull();
    });

    it('detects checkmate (scholar\'s mate)', () => {
      const state = initWithColors();

      // Scholar's mate sequence:
      // 1. e4  2. e5  3. Bc4  4. Nc6  5. Qh5  6. Nf6  7. Qxf7#
      const afterMate = playMoves(state, [
        { from: pos(6, 4), to: pos(4, 4) }, // 1. e4
        { from: pos(1, 4), to: pos(3, 4) }, // 1...e5
        { from: pos(7, 5), to: pos(4, 2) }, // 2. Bc4
        { from: pos(0, 1), to: pos(2, 2) }, // 2...Nc6
        { from: pos(7, 3), to: pos(3, 7) }, // 3. Qh5
        { from: pos(0, 6), to: pos(2, 5) }, // 3...Nf6
        { from: pos(3, 7), to: pos(1, 5) }, // 4. Qxf7#
      ]);

      expect(afterMate.inCheck).toBe(true);

      const result = chessEngine.checkWinner(afterMate);
      expect(result).not.toBeNull();
      expect(result!.winner).toBe(PLAYER_WHITE);
      expect(result!.reason).toContain('Checkmate');
    });

    it('detects stalemate', () => {
      // Construct a minimal stalemate position manually:
      // Black king on a8 (row 0, col 0), White king on c7 (row 1, col 2),
      // White queen on b6 (row 2, col 1). Black to move - no legal moves, not in check.
      const state = initWithColors();

      // Clear the board
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          state.board[r][c] = null;
        }
      }

      // Place pieces for stalemate
      state.board[0][0] = { type: 'king', color: 'black', hasMoved: true };
      state.board[1][2] = { type: 'king', color: 'white', hasMoved: true };
      state.board[2][1] = { type: 'queen', color: 'white', hasMoved: true };

      state.currentTurn = 'black';
      state.inCheck = false;

      const result = chessEngine.checkWinner(state);
      expect(result).not.toBeNull();
      expect(result!.winner).toBeNull();
      expect(result!.reason).toContain('Stalemate');
    });
  });

  // ========================================
  // Special moves
  // ========================================
  describe('special moves', () => {
    describe('en passant', () => {
      it('allows en passant capture', () => {
        const state = initWithColors();

        // Set up en passant:
        // 1. e4  2. a6  3. e5  4. d5 (black double-push next to white pawn)  5. exd6 (en passant)
        const afterEP = playMoves(state, [
          { from: pos(6, 4), to: pos(4, 4) }, // 1. e4
          { from: pos(1, 0), to: pos(2, 0) }, // 1...a6
          { from: pos(4, 4), to: pos(3, 4) }, // 2. e5
          { from: pos(1, 3), to: pos(3, 3) }, // 2...d5 (enables en passant)
          { from: pos(3, 4), to: pos(2, 3) }, // 3. exd6 (en passant capture)
        ]);

        // The white pawn should now be at row 2 col 3
        expect(afterEP.board[2][3]).toMatchObject({ type: 'pawn', color: 'white' });
        // The black pawn at row 3 col 3 should be gone (captured en passant)
        expect(afterEP.board[3][3]).toBeNull();
        // The capture was recorded
        expect(afterEP.captures.white).toHaveLength(1);
        expect(afterEP.captures.white[0]).toMatchObject({ type: 'pawn', color: 'black' });
      });
    });

    describe('castling', () => {
      it('allows kingside castling', () => {
        const state = initWithColors();

        // Clear the path for kingside castling (remove knight and bishop between king and rook)
        // White king is at row 7 col 4, white rook at row 7 col 7
        // Need to clear row 7 col 5 (bishop) and row 7 col 6 (knight)
        state.board[7][5] = null;
        state.board[7][6] = null;

        // Castle kingside: king e1 -> g1
        const move: ChessMove = { from: pos(7, 4), to: pos(7, 6) };
        const error = chessEngine.validateMove(state, PLAYER_WHITE, move);
        expect(error).toBeNull();

        const after = chessEngine.applyMove(state, PLAYER_WHITE, move);

        // King should be at g1 (row 7 col 6)
        expect(after.board[7][6]).toMatchObject({ type: 'king', color: 'white' });
        // Rook should have moved from h1 to f1 (row 7 col 5)
        expect(after.board[7][5]).toMatchObject({ type: 'rook', color: 'white' });
        // Original positions should be empty
        expect(after.board[7][4]).toBeNull();
        expect(after.board[7][7]).toBeNull();
      });
    });

    describe('pawn promotion', () => {
      it('promotes a pawn to queen on reaching the last rank', () => {
        const state = initWithColors();

        // Clear the board and set up a white pawn about to promote
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            state.board[r][c] = null;
          }
        }

        // Place kings (required for legal game state)
        state.board[7][4] = { type: 'king', color: 'white', hasMoved: true };
        state.board[0][4] = { type: 'king', color: 'black', hasMoved: true };
        // White pawn on row 1 col 0, about to promote
        state.board[1][0] = { type: 'pawn', color: 'white', hasMoved: true };

        state.currentTurn = 'white';

        const move: ChessMove = { from: pos(1, 0), to: pos(0, 0), promotion: 'queen' };
        const error = chessEngine.validateMove(state, PLAYER_WHITE, move);
        expect(error).toBeNull();

        const after = chessEngine.applyMove(state, PLAYER_WHITE, move);
        expect(after.board[0][0]).toMatchObject({ type: 'queen', color: 'white' });
        expect(after.board[1][0]).toBeNull();
      });

      it('promotes to a knight when specified', () => {
        const state = initWithColors();

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            state.board[r][c] = null;
          }
        }

        state.board[7][4] = { type: 'king', color: 'white', hasMoved: true };
        state.board[0][4] = { type: 'king', color: 'black', hasMoved: true };
        state.board[1][0] = { type: 'pawn', color: 'white', hasMoved: true };
        state.currentTurn = 'white';

        const move: ChessMove = { from: pos(1, 0), to: pos(0, 0), promotion: 'knight' };
        const after = chessEngine.applyMove(state, PLAYER_WHITE, move);
        expect(after.board[0][0]).toMatchObject({ type: 'knight', color: 'white' });
      });
    });
  });
});
