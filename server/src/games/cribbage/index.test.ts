import { describe, it, expect } from 'vitest';
import { cribbageEngine, CribbageState, CribbageMove, Card } from './index';

// ---- Helpers ----

const PLAYER_1 = 'player-one';
const PLAYER_2 = 'player-two';

/** Create a fresh game and return the state (should be in 'discarding' phase). */
function initGame(): CribbageState {
  return cribbageEngine.initGame([PLAYER_1, PLAYER_2]);
}

/** Build a CribbageMove from shorthand values. */
function move(fromRow: number, fromCol: number, toRow = 0, toCol = 0): CribbageMove {
  return { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
}

/**
 * Create a game state that has completed the discarding phase and is now
 * in the pegging phase with known, deterministic hands. This bypasses the
 * randomness of dealing so we can test pegging scoring precisely.
 */
function createPeggingState(overrides?: Partial<CribbageState>): CribbageState {
  const state: CribbageState = {
    phase: 'pegging',
    players: { 1: PLAYER_1, 2: PLAYER_2 },
    dealer: 2,
    hands: {
      1: [
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '6' },
        { suit: 'clubs', rank: '7' },
        { suit: 'spades', rank: '8' },
      ],
      2: [
        { suit: 'hearts', rank: '3' },
        { suit: 'diamonds', rank: '4' },
        { suit: 'clubs', rank: '9' },
        { suit: 'spades', rank: 'K' },
      ],
    },
    originalHands: {
      1: [
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '6' },
        { suit: 'clubs', rank: '7' },
        { suit: 'spades', rank: '8' },
      ],
      2: [
        { suit: 'hearts', rank: '3' },
        { suit: 'diamonds', rank: '4' },
        { suit: 'clubs', rank: '9' },
        { suit: 'spades', rank: 'K' },
      ],
    },
    crib: [
      { suit: 'hearts', rank: '2' },
      { suit: 'diamonds', rank: '2' },
      { suit: 'clubs', rank: 'J' },
      { suit: 'spades', rank: 'Q' },
    ],
    starterCard: { suit: 'hearts', rank: 'A' },
    deck: [],
    peggingCards: [],
    peggingTotal: 0,
    peggingTurn: 1, // non-dealer goes first
    scores: { 1: 0, 2: 0 },
    discarded: { 1: true, 2: true },
    pendingDiscards: { 1: null, 2: null },
    peggingGo: { 1: false, 2: false },
    peggingHands: {
      1: [
        { suit: 'hearts', rank: '5' },
        { suit: 'diamonds', rank: '6' },
        { suit: 'clubs', rank: '7' },
        { suit: 'spades', rank: '8' },
      ],
      2: [
        { suit: 'hearts', rank: '3' },
        { suit: 'diamonds', rank: '4' },
        { suit: 'clubs', rank: '9' },
        { suit: 'spades', rank: 'K' },
      ],
    },
    winner: null,
    winReason: null,
    lastPeggingScore: null,
    countingPhaseStep: 0,
    countingResult: null,
    roundNumber: 1,
    ...overrides,
  };

  return state;
}

// ---- Tests ----

describe('cribbageEngine', () => {
  // ========================================
  // initGame
  // ========================================
  describe('initGame', () => {
    it('returns a valid initial state in the discarding phase', () => {
      const state = initGame();

      expect(state.phase).toBe('discarding');
      expect(state.winner).toBeNull();
      expect(state.winReason).toBeNull();
      expect(state.scores).toEqual({ 1: 0, 2: 0 });
      expect(state.roundNumber).toBe(1);
      expect(state.peggingTotal).toBe(0);
      expect(state.starterCard).toBeNull();
    });

    it('assigns both players', () => {
      const state = initGame();
      const assignedPlayers = [state.players[1], state.players[2]].sort();
      expect(assignedPlayers).toEqual([PLAYER_1, PLAYER_2]);
    });

    it('deals 6 cards to each player', () => {
      const state = initGame();
      expect(state.hands[1]).toHaveLength(6);
      expect(state.hands[2]).toHaveLength(6);
    });

    it('sets dealer to either player 1 or 2', () => {
      const state = initGame();
      expect([1, 2]).toContain(state.dealer);
    });

    it('initializes both players as not having discarded', () => {
      const state = initGame();
      expect(state.discarded[1]).toBe(false);
      expect(state.discarded[2]).toBe(false);
    });
  });

  // ========================================
  // validateMove - discarding phase
  // ========================================
  describe('validateMove - discarding', () => {
    it('rejects moves from a non-player', () => {
      const state = initGame();
      const error = cribbageEngine.validateMove(state, 'stranger', move(0, 1));
      expect(error).toBe('You are not a player in this game');
    });

    it('rejects discarding when player has already discarded', () => {
      const state = initGame();
      const playerId = state.players[1];

      // First discard should be valid
      const firstError = cribbageEngine.validateMove(state, playerId, move(0, 1));
      expect(firstError).toBeNull();

      // Apply the first discard
      const afterDiscard = cribbageEngine.applyMove(state, playerId, move(0, 1));

      // Second discard should be rejected
      const secondError = cribbageEngine.validateMove(afterDiscard, playerId, move(2, 3));
      expect(secondError).toBe('You have already discarded');
    });

    it('rejects card index out of range', () => {
      const state = initGame();
      const playerId = state.players[1];

      const error = cribbageEngine.validateMove(state, playerId, move(0, 10));
      expect(error).toBe('Card index out of range');
    });

    it('rejects negative card indices', () => {
      const state = initGame();
      const playerId = state.players[1];

      const error = cribbageEngine.validateMove(state, playerId, move(-1, 2));
      expect(error).toBe('Card index out of range');
    });

    it('rejects discarding the same card twice', () => {
      const state = initGame();
      const playerId = state.players[1];

      const error = cribbageEngine.validateMove(state, playerId, move(3, 3));
      expect(error).toBe('Must discard two different cards');
    });

    it('allows a valid discard of two different cards', () => {
      const state = initGame();
      const playerId = state.players[1];

      const error = cribbageEngine.validateMove(state, playerId, move(0, 5));
      expect(error).toBeNull();
    });
  });

  // ========================================
  // applyMove - discarding to pegging transition
  // ========================================
  describe('applyMove - discarding phase', () => {
    it('transitions to pegging after both players discard', () => {
      const state = initGame();
      const p1 = state.players[1];
      const p2 = state.players[2];

      // Player 1 discards cards at index 0 and 1
      const afterP1 = cribbageEngine.applyMove(state, p1, move(0, 1));
      // Still in discarding since player 2 hasn't discarded
      expect(afterP1.phase).toBe('discarding');
      expect(afterP1.discarded[1]).toBe(true);
      expect(afterP1.discarded[2]).toBe(false);

      // Player 2 discards cards at index 0 and 1
      // Need to figure out which player number p2 is
      const p2Num = afterP1.players[1] === p2 ? 1 : 2;
      const afterP2 = cribbageEngine.applyMove(afterP1, p2, move(0, 1));

      // Now we should be in pegging phase
      expect(afterP2.phase).toBe('pegging');
      expect(afterP2.starterCard).not.toBeNull();
      // Each player should have 4 cards in hand after discarding 2
      expect(afterP2.hands[1]).toHaveLength(4);
      expect(afterP2.hands[2]).toHaveLength(4);
      // Crib should have 4 cards (2 from each player)
      expect(afterP2.crib).toHaveLength(4);
    });

    it('sets up pegging hands after both players discard', () => {
      const state = initGame();
      const p1 = state.players[1];
      const p2 = state.players[2];

      const afterP1 = cribbageEngine.applyMove(state, p1, move(0, 1));
      const afterP2 = cribbageEngine.applyMove(afterP1, p2, move(0, 1));

      // Pegging hands should be copies of the remaining hands
      expect(afterP2.peggingHands[1]).toHaveLength(4);
      expect(afterP2.peggingHands[2]).toHaveLength(4);
    });
  });

  // ========================================
  // validateMove - pegging phase
  // ========================================
  describe('validateMove - pegging', () => {
    it('rejects a move when it is not your turn', () => {
      const state = createPeggingState();
      // It is player 1's turn; player 2 tries to play
      const error = cribbageEngine.validateMove(state, PLAYER_2, move(0, 0));
      expect(error).toBe('It is not your turn');
    });

    it('rejects playing a card that would exceed 31', () => {
      const state = createPeggingState({
        peggingTotal: 25,
        peggingHands: {
          1: [{ suit: 'hearts', rank: '8' }],
          2: [{ suit: 'spades', rank: '3' }],
        },
      });

      // 8 would bring total to 33, which exceeds 31
      const error = cribbageEngine.validateMove(state, PLAYER_1, move(0, 0));
      expect(error).toBe('Playing this card would exceed 31');
    });

    it('rejects a "Go" when the player can still play a card', () => {
      const state = createPeggingState({ peggingTotal: 10 });
      // Player 1 has cards (5,6,7,8) and total is 10, can definitely play
      const error = cribbageEngine.validateMove(state, PLAYER_1, move(-1, 0));
      expect(error).toBe('You can still play a card');
    });

    it('allows a "Go" when no card can be played under 31', () => {
      const state = createPeggingState({
        peggingTotal: 28,
        peggingHands: {
          1: [{ suit: 'hearts', rank: '5' }],
          2: [{ suit: 'spades', rank: '2' }],
        },
      });

      // Player 1 has a 5. Total is 28. 28 + 5 = 33 > 31, so Go is valid.
      const error = cribbageEngine.validateMove(state, PLAYER_1, move(-1, 0));
      expect(error).toBeNull();
    });

    it('rejects an invalid card index', () => {
      const state = createPeggingState();
      const error = cribbageEngine.validateMove(state, PLAYER_1, move(99, 0));
      expect(error).toBe('Invalid card index');
    });
  });

  // ========================================
  // applyMove - pegging scoring
  // ========================================
  describe('applyMove - pegging scoring', () => {
    it('awards 2 points for hitting exactly 15', () => {
      // Set up: player 1 plays a 5 (value 5) after a total of 10
      const state = createPeggingState({
        peggingTotal: 10,
        peggingTurn: 1,
        peggingCards: [
          { playerId: PLAYER_2, card: { suit: 'hearts', rank: 'K' } },
        ],
        peggingHands: {
          1: [{ suit: 'hearts', rank: '5' }],
          2: [{ suit: 'spades', rank: 'K' }],
        },
      });

      const afterPlay = cribbageEngine.applyMove(state, PLAYER_1, move(0, 0));
      // Total should be 15
      expect(afterPlay.peggingTotal).toBe(15);
      // Player 1 should have earned 2 points for 15
      expect(afterPlay.scores[1]).toBe(2);
      expect(afterPlay.lastPeggingScore).toContain('15 for 2');
    });

    it('awards 2 points for hitting exactly 31', () => {
      // Set up: player 1 plays a card that brings total to exactly 31
      const state = createPeggingState({
        peggingTotal: 30,
        peggingTurn: 1,
        peggingCards: [
          { playerId: PLAYER_2, card: { suit: 'hearts', rank: 'K' } },
        ],
        peggingHands: {
          1: [{ suit: 'hearts', rank: 'A' }],
          2: [{ suit: 'spades', rank: '3' }],
        },
      });

      const afterPlay = cribbageEngine.applyMove(state, PLAYER_1, move(0, 0));
      // Player 1 should have earned 2 points for 31
      expect(afterPlay.scores[1]).toBe(2);
      expect(afterPlay.lastPeggingScore).toContain('31 for 2');
    });

    it('awards 2 points for a pair during pegging', () => {
      const state = createPeggingState({
        peggingTotal: 5,
        peggingTurn: 1,
        peggingCards: [
          { playerId: PLAYER_2, card: { suit: 'diamonds', rank: '5' } },
        ],
        peggingHands: {
          1: [{ suit: 'hearts', rank: '5' }],
          2: [{ suit: 'spades', rank: '3' }],
        },
      });

      const afterPlay = cribbageEngine.applyMove(state, PLAYER_1, move(0, 0));
      // 5 + 5 = 10, and we get a pair for 2 points
      expect(afterPlay.peggingTotal).toBe(10);
      // 2 points for pair
      expect(afterPlay.scores[1]).toBe(2);
      expect(afterPlay.lastPeggingScore).toContain('Pair for 2');
    });

    it('plays a card and removes it from pegging hand', () => {
      const state = createPeggingState();

      const handBefore = state.peggingHands[1].length;
      const afterPlay = cribbageEngine.applyMove(state, PLAYER_1, move(0, 0));

      // One fewer card in pegging hand
      expect(afterPlay.peggingHands[1]).toHaveLength(handBefore - 1);
      // Card added to pegging pile
      expect(afterPlay.peggingCards).toHaveLength(1);
      expect(afterPlay.peggingCards[0].playerId).toBe(PLAYER_1);
    });

    it('switches turn to the other player after playing a card', () => {
      const state = createPeggingState();

      const afterPlay = cribbageEngine.applyMove(state, PLAYER_1, move(0, 0));
      // Should switch to player 2 (if player 2 can play)
      expect(afterPlay.peggingTurn).toBe(2);
    });
  });

  // ========================================
  // applyMove - pegging Go
  // ========================================
  describe('applyMove - pegging Go', () => {
    it('handles a Go by setting the peggingGo flag', () => {
      const state = createPeggingState({
        peggingTotal: 28,
        peggingTurn: 1,
        peggingHands: {
          1: [{ suit: 'hearts', rank: '5' }],
          2: [{ suit: 'spades', rank: '2' }],
        },
      });

      const afterGo = cribbageEngine.applyMove(state, PLAYER_1, move(-1, 0));
      expect(afterGo.peggingGo[1]).toBe(true);
      // Turn should switch to player 2 (who can still play a 2 at total 28)
      expect(afterGo.peggingTurn).toBe(2);
    });
  });

  // ========================================
  // counting phase
  // ========================================
  describe('counting phase', () => {
    it('transitions from pegging to counting when all pegging cards are played', () => {
      // Build a state where both players have exactly 1 card left in pegging
      // so playing them results in transition to counting
      const state = createPeggingState({
        peggingTotal: 0,
        peggingTurn: 1,
        peggingCards: [],
        peggingHands: {
          1: [{ suit: 'hearts', rank: 'A' }],
          2: [],
        },
        peggingGo: { 1: false, 2: true },
      });

      // Player 1 plays their last card (Ace = 1)
      const afterPlay = cribbageEngine.applyMove(state, PLAYER_1, move(0, 0));
      // Both pegging hands should be empty; game should transition to counting
      expect(afterPlay.phase).toBe('counting');
      expect(afterPlay.countingPhaseStep).toBe(0);
      expect(afterPlay.countingResult).toBeTruthy();
    });

    it('counting step 0: non-dealer acknowledges, then moves to step 1', () => {
      // Create a counting state at step 0
      const state = createPeggingState({
        phase: 'counting',
        countingPhaseStep: 0,
        peggingTurn: 1, // non-dealer acknowledges
      });

      // Non-dealer (player 1, since dealer is 2) acknowledges
      const error = cribbageEngine.validateMove(state, PLAYER_1, move(-1, 0));
      expect(error).toBeNull();

      const afterAck = cribbageEngine.applyMove(state, PLAYER_1, move(-1, 0));
      expect(afterAck.countingPhaseStep).toBe(1);
    });

    it('rejects acknowledgment from the wrong player during counting', () => {
      const state = createPeggingState({
        phase: 'counting',
        countingPhaseStep: 0,
        peggingTurn: 1,
      });

      // Dealer (player 2) tries to acknowledge when it's non-dealer's turn
      const error = cribbageEngine.validateMove(state, PLAYER_2, move(-1, 0));
      expect(error).toBe('Waiting for the non-dealer to acknowledge');
    });
  });

  // ========================================
  // checkWinner
  // ========================================
  describe('checkWinner', () => {
    it('returns null for an in-progress game', () => {
      const state = initGame();
      const result = cribbageEngine.checkWinner(state);
      expect(result).toBeNull();
    });

    it('detects a winner when a player reaches 121 points', () => {
      const state = createPeggingState({
        scores: { 1: 121, 2: 50 },
        winner: PLAYER_1,
        winReason: 'Reached 121 points!',
        phase: 'finished',
      });

      const result = cribbageEngine.checkWinner(state);
      expect(result).not.toBeNull();
      expect(result!.winner).toBe(PLAYER_1);
      expect(result!.reason).toContain('121');
    });

    it('returns null when no player has won yet', () => {
      const state = createPeggingState({
        scores: { 1: 100, 2: 110 },
      });

      const result = cribbageEngine.checkWinner(state);
      expect(result).toBeNull();
    });
  });

  // ========================================
  // State immutability
  // ========================================
  describe('state immutability', () => {
    it('applyMove does not mutate the original state during discarding', () => {
      const state = initGame();
      const p1 = state.players[1];

      const originalPhase = state.phase;
      const originalDiscarded1 = state.discarded[1];
      const originalHandLength = state.hands[1].length;

      cribbageEngine.applyMove(state, p1, move(0, 1));

      expect(state.phase).toBe(originalPhase);
      expect(state.discarded[1]).toBe(originalDiscarded1);
      expect(state.hands[1]).toHaveLength(originalHandLength);
    });

    it('applyMove does not mutate the original state during pegging', () => {
      const state = createPeggingState();

      const originalPeggingTotal = state.peggingTotal;
      const originalPeggingCardsLength = state.peggingCards.length;
      const originalPeggingHandLength = state.peggingHands[1].length;
      const originalScore = state.scores[1];

      cribbageEngine.applyMove(state, PLAYER_1, move(0, 0));

      expect(state.peggingTotal).toBe(originalPeggingTotal);
      expect(state.peggingCards).toHaveLength(originalPeggingCardsLength);
      expect(state.peggingHands[1]).toHaveLength(originalPeggingHandLength);
      expect(state.scores[1]).toBe(originalScore);
    });
  });

  // ========================================
  // Edge cases
  // ========================================
  describe('edge cases', () => {
    it('rejects moves on a finished game', () => {
      const state = createPeggingState({
        phase: 'finished',
        winner: PLAYER_1,
        winReason: 'Reached 121 points!',
      });

      const error = cribbageEngine.validateMove(state, PLAYER_1, move(0, 0));
      expect(error).toBe('Game is already over');
    });

    it('getState hides opponent cards from a player during discarding', () => {
      const state = initGame();
      const p1 = state.players[1];

      const view = cribbageEngine.getState(state, p1) as Record<string, unknown>;
      const opponentHand = view.opponentHand as (Card | null)[];

      // Opponent hand should be hidden (array of nulls)
      expect(opponentHand.every((c: Card | null) => c === null)).toBe(true);
    });

    it('getState returns limited info for spectators', () => {
      const state = initGame();

      const view = cribbageEngine.getState(state, 'spectator') as Record<string, unknown>;
      // Spectators should see phase, players, scores, winner info
      expect(view.phase).toBe('discarding');
      expect(view.scores).toBeDefined();
      // But not hands
      expect(view.myHand).toBeUndefined();
    });
  });
});
