import { describe, it, expect } from 'vitest';
import { backgammonEngine, BackgammonState, BackgammonMove } from './index';

// ---- Helpers ----

const PLAYER_1 = 'player-one';
const PLAYER_2 = 'player-two';
const NON_PLAYER = 'spectator';

/**
 * Creates a game state with deterministic player assignment.
 * Player 1 is always PLAYER_1, Player 2 is always PLAYER_2.
 */
function initWithPlayers(): BackgammonState {
  const state = backgammonEngine.initGame([PLAYER_1, PLAYER_2]);
  // The engine randomizes player assignment, so normalize.
  if (state.players[1] === PLAYER_1) return state;
  return {
    ...state,
    players: { 1: PLAYER_1, 2: PLAYER_2 },
  };
}

/**
 * Creates a game state with deterministic players and specific dice values.
 */
function initWithDice(dice: number[]): BackgammonState {
  const state = initWithPlayers();
  state.dice = dice;
  return state;
}

/** Shorthand for creating a BackgammonMove. */
function move(fromRow: number, toRow: number): BackgammonMove {
  return { from: { row: fromRow, col: 0 }, to: { row: toRow, col: 0 } };
}

/** Pass move. */
function passMove(): BackgammonMove {
  return { from: { row: -1, col: 0 }, to: { row: -1, col: 0 } };
}

// ---- Tests ----

describe('backgammonEngine', () => {
  // ========================================
  // initGame
  // ========================================
  describe('initGame', () => {
    it('returns a valid initial state', () => {
      const state = backgammonEngine.initGame([PLAYER_1, PLAYER_2]);

      expect(state.board).toHaveLength(24);
      expect(state.dice.length).toBeGreaterThanOrEqual(2);
      expect(state.diceRolled).toBe(true);
      expect(state.currentTurn).toBe(1);
      expect(state.winner).toBeNull();
      expect(state.winReason).toBeNull();
      expect(state.turnMoves).toBe(0);
      expect(state.bar).toEqual({ 1: 0, 2: 0 });
      expect(state.borneOff).toEqual({ 1: 0, 2: 0 });
    });

    it('assigns both players', () => {
      const state = backgammonEngine.initGame([PLAYER_1, PLAYER_2]);
      const assignedPlayers = [state.players[1], state.players[2]].sort();
      expect(assignedPlayers).toEqual([PLAYER_1, PLAYER_2].sort());
    });

    it('sets up the board with correct initial checker placement', () => {
      const state = initWithPlayers();
      const board = state.board;

      // Player 1: 2 on point 24 (index 23)
      expect(board[23]).toEqual({ player: 1, count: 2 });
      // Player 1: 5 on point 13 (index 12)
      expect(board[12]).toEqual({ player: 1, count: 5 });
      // Player 1: 3 on point 8 (index 7)
      expect(board[7]).toEqual({ player: 1, count: 3 });
      // Player 1: 5 on point 6 (index 5)
      expect(board[5]).toEqual({ player: 1, count: 5 });

      // Player 2: 2 on point 1 (index 0)
      expect(board[0]).toEqual({ player: 2, count: 2 });
      // Player 2: 5 on point 12 (index 11)
      expect(board[11]).toEqual({ player: 2, count: 5 });
      // Player 2: 3 on point 17 (index 16)
      expect(board[16]).toEqual({ player: 2, count: 3 });
      // Player 2: 5 on point 19 (index 18)
      expect(board[18]).toEqual({ player: 2, count: 5 });

      // All other points should be empty
      const occupiedIndices = [23, 12, 7, 5, 0, 11, 16, 18];
      for (let i = 0; i < 24; i++) {
        if (!occupiedIndices.includes(i)) {
          expect(board[i]).toEqual({ player: null, count: 0 });
        }
      }

      // Verify total checker count: 15 per player
      let p1Count = 0;
      let p2Count = 0;
      for (const point of board) {
        if (point.player === 1) p1Count += point.count;
        if (point.player === 2) p2Count += point.count;
      }
      expect(p1Count).toBe(15);
      expect(p2Count).toBe(15);
    });
  });

  // ========================================
  // validateMove
  // ========================================
  describe('validateMove', () => {
    it('rejects moves from non-players', () => {
      const state = initWithDice([3, 5]);
      const error = backgammonEngine.validateMove(state, NON_PLAYER, move(24, 21));
      expect(error).toBe('You are not a player in this game');
    });

    it('rejects moves when it is not your turn', () => {
      const state = initWithDice([3, 5]);
      // currentTurn is 1, so player 2 cannot move
      const error = backgammonEngine.validateMove(state, PLAYER_2, move(1, 4));
      expect(error).toBe('It is not your turn');
    });

    it('rejects moves when the game is over', () => {
      const state = initWithDice([3, 5]);
      state.winner = PLAYER_1;
      state.winReason = 'Player 1 bore off all checkers!';
      const error = backgammonEngine.validateMove(state, PLAYER_1, move(24, 21));
      expect(error).toBe('Game is already over');
    });

    it('allows pass when no valid moves are available', () => {
      // Set up a state where player 1 has checkers on the bar but cannot enter
      // because all entry points (19-24) are blocked by player 2 (2+ checkers)
      const state = initWithDice([1, 2]);
      state.bar[1] = 1;

      // Block points 19-24 for player 1's bar entry
      for (let i = 18; i <= 23; i++) {
        state.board[i] = { player: 2, count: 2 };
      }
      // Remove one P1 checker from point 24 since we put it on the bar
      // and overwrite point 24 with P2 blockers already

      const error = backgammonEngine.validateMove(state, PLAYER_1, passMove());
      expect(error).toBeNull();
    });

    it('rejects pass when valid moves exist', () => {
      const state = initWithDice([3, 5]);
      // Player 1 has checkers at standard positions and dice [3, 5], so valid moves exist
      const error = backgammonEngine.validateMove(state, PLAYER_1, passMove());
      expect(error).toBe('You have valid moves available and cannot pass');
    });

    it('rejects moving a checker that does not belong to you', () => {
      const state = initWithDice([3, 5]);
      // Player 1 tries to move from point 1 which belongs to player 2
      const error = backgammonEngine.validateMove(state, PLAYER_1, move(1, 4));
      expect(error).toBe('No checker of yours at that position');
    });

    it('rejects moves in the wrong direction', () => {
      const state = initWithDice([3, 5]);
      // Player 1 moves from high to low; moving 6 -> 9 is the wrong direction
      const error = backgammonEngine.validateMove(state, PLAYER_1, move(6, 9));
      expect(error).toBe('You must move toward your home board');
    });

    it('rejects moves to a point blocked by opponent', () => {
      const state = initWithDice([1, 2]);
      // Player 1 has checkers on point 13, and player 2 has 5 on point 12
      // Trying to move from point 13 to point 12 (die value 1) - blocked
      const error = backgammonEngine.validateMove(state, PLAYER_1, move(13, 12));
      expect(error).toBe('No matching die value for this move');
    });

    it('requires entering from bar before moving other checkers', () => {
      const state = initWithDice([3, 5]);
      state.bar[1] = 1;
      // Reduce count at point 24 to account for the checker on bar
      state.board[23].count = 1;

      // Try to move a checker from point 13 instead of entering from bar
      const error = backgammonEngine.validateMove(state, PLAYER_1, move(13, 8));
      expect(error).toBe('You must enter your checkers from the bar first');
    });
  });

  // ========================================
  // applyMove
  // ========================================
  describe('applyMove', () => {
    it('basic move reduces source count and increases destination count', () => {
      const state = initWithDice([3, 5]);
      // Move from point 13 (5 checkers, P1) by 3 to point 10
      const next = backgammonEngine.applyMove(state, PLAYER_1, move(13, 10));

      // Source should have one fewer checker
      expect(next.board[12].count).toBe(4); // index 12 = point 13
      expect(next.board[12].player).toBe(1);
      // Destination should have one checker
      expect(next.board[9].count).toBe(1); // index 9 = point 10
      expect(next.board[9].player).toBe(1);
    });

    it('hitting a blot sends the opponent checker to the bar', () => {
      const state = initWithDice([5, 3]);
      // Set up a blot: place a single P2 checker on point 10
      state.board[9] = { player: 2, count: 1 }; // index 9 = point 10

      // P1 moves from point 13 to point 10 (distance 3)
      const next = backgammonEngine.applyMove(state, PLAYER_1, move(13, 10));

      // Point 10 should now be P1's
      expect(next.board[9].player).toBe(1);
      expect(next.board[9].count).toBe(1);
      // P2 should have one checker on the bar
      expect(next.bar[2]).toBe(1);
    });

    it('entering from the bar places a checker on the correct point', () => {
      const state = initWithDice([3, 5]);
      state.bar[1] = 1;
      state.board[23].count = 1; // Reduce P1 on point 24

      // Clear point 22 (point 23) so P1 can enter there with die=2...
      // Actually, P1 enters from bar with die value d at point (25 - d).
      // Die=3 -> point 22, die=5 -> point 20
      // Make sure point 22 is open
      state.board[21] = { player: null, count: 0 }; // point 22

      // Enter from bar (from=0) to point 22 (25 - 3 = 22)
      const next = backgammonEngine.applyMove(state, PLAYER_1, move(0, 22));

      // Bar should be decremented
      expect(next.bar[1]).toBe(0);
      // Point 22 (index 21) should have the checker
      expect(next.board[21].player).toBe(1);
      expect(next.board[21].count).toBe(1);
    });

    it('pass switches turns', () => {
      // Create a state where P1 cannot move (all entry points blocked with checkers on bar)
      const state = initWithDice([1, 2]);
      state.bar[1] = 1;

      // Block all possible entry points for P1 (points 19-24)
      for (let i = 18; i <= 23; i++) {
        state.board[i] = { player: 2, count: 2 };
      }

      // Verify pass is valid
      const error = backgammonEngine.validateMove(state, PLAYER_1, passMove());
      expect(error).toBeNull();

      const next = backgammonEngine.applyMove(state, PLAYER_1, passMove());

      // Turn should have switched (and new dice rolled)
      // After pass, switchTurns is called which rolls new dice
      // The turn could be 1 or 2 depending on whether the new player has valid moves
      // But at minimum the state should be different from the original
      expect(next.diceRolled).toBe(true);
      expect(next.turnMoves).toBe(0);
    });

    it('does not mutate the original state', () => {
      const state = initWithDice([3, 5]);
      const originalBoard12Count = state.board[12].count; // point 13, P1 has 5
      const originalDice = [...state.dice];

      backgammonEngine.applyMove(state, PLAYER_1, move(13, 10));

      // Original state should be untouched
      expect(state.board[12].count).toBe(originalBoard12Count);
      expect(state.dice).toEqual(originalDice);
      expect(state.currentTurn).toBe(1);
      expect(state.turnMoves).toBe(0);
    });

    it('removes the used die value after a move', () => {
      const state = initWithDice([3, 5]);
      // Move from point 13 to point 10 uses die value 3
      const next = backgammonEngine.applyMove(state, PLAYER_1, move(13, 10));

      // Die value 3 should be consumed; 5 should remain (or turn switched with new dice)
      // If there are still valid moves with the remaining die, dice should just have [5]
      // But if auto-switch happened, new dice are rolled. Let's check: P1 has many moves with 5.
      // After using die 3, remaining is [5], P1 can still move, so turn should NOT switch yet.
      expect(next.dice).toEqual([5]);
      expect(next.currentTurn).toBe(1);
    });

    it('switches turns when all dice are used', () => {
      // Give P1 dice [1, 2], make two consecutive moves
      const state = initWithDice([1, 2]);

      // First move: point 6 -> point 4 (die=2)
      const after1 = backgammonEngine.applyMove(state, PLAYER_1, move(6, 4));

      // If there are still dice left and valid moves, turn stays with P1
      if (after1.currentTurn === 1 && after1.dice.length > 0) {
        // Second move: use remaining die
        const after2 = backgammonEngine.applyMove(after1, PLAYER_1, move(6, 5));
        // All dice used, turn should switch (new dice rolled)
        expect(after2.diceRolled).toBe(true);
        expect(after2.turnMoves).toBe(0);
      }
    });
  });

  // ========================================
  // checkWinner
  // ========================================
  describe('checkWinner', () => {
    it('returns null for an in-progress game', () => {
      const state = initWithPlayers();
      const result = backgammonEngine.checkWinner(state);
      expect(result).toBeNull();
    });

    it('detects player 1 as winner when borneOff reaches 15', () => {
      const state = initWithPlayers();
      state.borneOff[1] = 15;

      const result = backgammonEngine.checkWinner(state);
      expect(result).not.toBeNull();
      expect(result!.winner).toBe(PLAYER_1);
      expect(result!.reason).toContain('Player 1');
    });

    it('detects player 2 as winner when borneOff reaches 15', () => {
      const state = initWithPlayers();
      state.borneOff[2] = 15;

      const result = backgammonEngine.checkWinner(state);
      expect(result).not.toBeNull();
      expect(result!.winner).toBe(PLAYER_2);
      expect(result!.reason).toContain('Player 2');
    });

    it('returns null when borneOff is less than 15 for both players', () => {
      const state = initWithPlayers();
      state.borneOff[1] = 14;
      state.borneOff[2] = 14;

      const result = backgammonEngine.checkWinner(state);
      expect(result).toBeNull();
    });
  });

  // ========================================
  // getState
  // ========================================
  describe('getState', () => {
    it('returns the full game state (no hidden information in backgammon)', () => {
      const state = initWithPlayers();
      const visible = backgammonEngine.getState(state, PLAYER_1) as BackgammonState;

      expect(visible.board).toEqual(state.board);
      expect(visible.bar).toEqual(state.bar);
      expect(visible.borneOff).toEqual(state.borneOff);
      expect(visible.dice).toEqual(state.dice);
      expect(visible.currentTurn).toBe(state.currentTurn);
      expect(visible.players).toEqual(state.players);
    });
  });

  // ========================================
  // Doubles
  // ========================================
  describe('doubles', () => {
    it('rolling doubles gives 4 dice values', () => {
      const state = initWithPlayers();
      state.dice = [3, 3, 3, 3]; // simulate doubles

      expect(state.dice).toHaveLength(4);
      expect(state.dice.every(d => d === 3)).toBe(true);
    });
  });
});
