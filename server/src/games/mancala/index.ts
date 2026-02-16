import { GameEngine, Position } from '../../types';

// ---- Mancala Types ----

export type MancalaSide = 'top' | 'bottom';

export interface MancalaMove {
  from: Position; // unused, will be {row:0,col:0}
  to: Position;   // to.row = 0 (top) or 1 (bottom), to.col = pit index (0-5)
}

export interface MancalaState {
  // pits[0] = top player's 6 pits (left to right from top player's view)
  // pits[1] = bottom player's 6 pits (left to right from bottom player's view)
  pits: [number[], number[]];
  stores: [number, number]; // stores[0] = top player's store, stores[1] = bottom player's store
  currentTurn: MancalaSide;
  players: { top: string; bottom: string }; // player IDs
  winner: string | null;
  winReason: string | null;
  lastMove: { side: number; pit: number } | null;
}

// ---- Constants ----

const NUM_PITS = 6;
const INITIAL_STONES = 4;

// ---- Helper Functions ----

function getPlayerSide(state: MancalaState, playerId: string): MancalaSide | null {
  if (state.players.top === playerId) return 'top';
  if (state.players.bottom === playerId) return 'bottom';
  return null;
}

function sideIndex(side: MancalaSide): number {
  return side === 'top' ? 0 : 1;
}

function oppositeSide(side: MancalaSide): MancalaSide {
  return side === 'top' ? 'bottom' : 'top';
}

/**
 * Check if all pits on a given side are empty.
 */
function isSideEmpty(pits: number[]): boolean {
  return pits.every(count => count === 0);
}

/**
 * Deep clone the mancala state to avoid mutating the original.
 */
function cloneState(state: MancalaState): MancalaState {
  return {
    pits: [
      [...state.pits[0]],
      [...state.pits[1]],
    ],
    stores: [state.stores[0], state.stores[1]],
    currentTurn: state.currentTurn,
    players: { ...state.players },
    winner: state.winner,
    winReason: state.winReason,
    lastMove: state.lastMove ? { ...state.lastMove } : null,
  };
}

/**
 * Sow stones counterclockwise from the chosen pit.
 *
 * Board layout (from the perspective of the sowing logic):
 *
 *   Top pits:    [0] [1] [2] [3] [4] [5]   <- top player's pits (index 0)
 *   Top store                                <- stores[0]
 *   Bottom pits: [0] [1] [2] [3] [4] [5]   <- bottom player's pits (index 1)
 *   Bottom store                             <- stores[1]
 *
 * Sowing direction for a player:
 *   - Start from the chosen pit, move right along their own row
 *   - Drop into their own store
 *   - Continue along the opponent's row (left to right from their perspective)
 *   - Skip the opponent's store
 *   - Continue back to their own row
 *
 * Since the board is represented with pits going left-to-right from each player's
 * perspective, and sowing goes counterclockwise:
 *
 * For the BOTTOM player picking pit i:
 *   - Go right through bottom pits: i+1, i+2, ..., 5
 *   - Into bottom store (stores[1])
 *   - Through top pits: 5, 4, 3, 2, 1, 0 (right-to-left in array = counterclockwise from bottom's view)
 *   - Skip top store (stores[0])
 *   - Back to bottom pits: 0, 1, 2, ...
 *
 * For the TOP player picking pit i:
 *   - Go right through top pits: i+1, i+2, ..., 5
 *   - Into top store (stores[0])
 *   - Through bottom pits: 5, 4, 3, 2, 1, 0 (right-to-left in array = counterclockwise from top's view)
 *   - Skip bottom store (stores[1])
 *   - Back to top pits: 0, 1, 2, ...
 */
function sowStones(
  state: MancalaState,
  side: MancalaSide,
  pitIndex: number,
): MancalaState {
  const newState = cloneState(state);
  const si = sideIndex(side);
  const opponentSi = sideIndex(oppositeSide(side));

  // Pick up all stones from the chosen pit
  let stones = newState.pits[si][pitIndex];
  newState.pits[si][pitIndex] = 0;
  newState.lastMove = { side: si, pit: pitIndex };

  // Build the sowing sequence as a list of positions to visit.
  // Each position is either { type: 'pit', side: number, index: number }
  // or { type: 'store', side: number }.
  type SowPos =
    | { type: 'pit'; side: number; index: number }
    | { type: 'store'; side: number };

  const sequence: SowPos[] = [];

  // 1. Remaining pits on player's side (moving right from pitIndex+1 to 5)
  for (let i = pitIndex + 1; i < NUM_PITS; i++) {
    sequence.push({ type: 'pit', side: si, index: i });
  }

  // 2. Player's own store
  sequence.push({ type: 'store', side: si });

  // 3. Opponent's pits (traversed in reverse: 5, 4, 3, 2, 1, 0)
  //    This represents counterclockwise movement across the opponent's side
  for (let i = NUM_PITS - 1; i >= 0; i--) {
    sequence.push({ type: 'pit', side: opponentSi, index: i });
  }

  // 4. Skip opponent's store (not added to sequence)

  // 5. Player's own pits from 0 to pitIndex (wrapping around)
  for (let i = 0; i <= pitIndex; i++) {
    sequence.push({ type: 'pit', side: si, index: i });
  }

  // Now distribute stones, cycling through the sequence
  let seqIdx = 0;
  let lastPos: SowPos | null = null;

  while (stones > 0) {
    const pos = sequence[seqIdx % sequence.length];
    if (pos.type === 'pit') {
      newState.pits[pos.side][pos.index]++;
    } else {
      newState.stores[pos.side]++;
    }
    stones--;
    lastPos = pos;
    seqIdx++;
  }

  // Determine if the player gets another turn (last stone in own store)
  const landsInOwnStore =
    lastPos !== null &&
    lastPos.type === 'store' &&
    lastPos.side === si;

  // Capture rule: last stone lands in an empty pit on the player's own side,
  // and the opposite pit on the opponent's side has stones.
  if (
    lastPos !== null &&
    lastPos.type === 'pit' &&
    lastPos.side === si
  ) {
    const landedPitIndex = lastPos.index;
    // The pit should now have exactly 1 stone (the one just placed)
    if (newState.pits[si][landedPitIndex] === 1) {
      // The opposite pit: since pits are indexed left-to-right from each player's
      // perspective, and the board wraps around, the opposite pit is at
      // (NUM_PITS - 1 - landedPitIndex) on the opponent's side.
      const oppositePitIndex = NUM_PITS - 1 - landedPitIndex;
      const oppositePitStones = newState.pits[opponentSi][oppositePitIndex];

      if (oppositePitStones > 0) {
        // Capture: move the last stone and all opposite stones to player's store
        newState.stores[si] += 1 + oppositePitStones;
        newState.pits[si][landedPitIndex] = 0;
        newState.pits[opponentSi][oppositePitIndex] = 0;
      }
    }
  }

  // Set next turn
  if (!landsInOwnStore) {
    newState.currentTurn = oppositeSide(side);
  }
  // If landsInOwnStore, the current player gets another turn (currentTurn stays the same)

  return newState;
}

/**
 * Finalize the game: when one side is empty, move all remaining stones
 * on the other side into that player's store.
 */
function finalizeGame(state: MancalaState): MancalaState {
  const newState = cloneState(state);

  for (let s = 0; s < 2; s++) {
    if (isSideEmpty(newState.pits[s])) {
      // The other side sweeps remaining stones
      const other = 1 - s;
      for (let i = 0; i < NUM_PITS; i++) {
        newState.stores[other] += newState.pits[other][i];
        newState.pits[other][i] = 0;
      }
      break;
    }
  }

  return newState;
}

// ---- Game Engine ----

export const mancalaEngine: GameEngine<MancalaState, MancalaMove> = {
  initGame(playerIds: [string, string]): MancalaState {
    // Randomly assign top/bottom
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];

    return {
      pits: [
        Array(NUM_PITS).fill(INITIAL_STONES), // top player's pits
        Array(NUM_PITS).fill(INITIAL_STONES), // bottom player's pits
      ],
      stores: [0, 0],
      currentTurn: 'bottom', // bottom player goes first
      players: {
        top: shuffled[0],
        bottom: shuffled[1],
      },
      winner: null,
      winReason: null,
      lastMove: null,
    };
  },

  validateMove(state: MancalaState, playerId: string, move: MancalaMove): string | null {
    if (state.winner) return 'Game is already over';

    const side = getPlayerSide(state, playerId);
    if (!side) return 'You are not a player in this game';
    if (side !== state.currentTurn) return 'It is not your turn';

    const si = sideIndex(side);
    const pitIndex = move.to.col;
    const rowIndex = move.to.row;

    // Validate that the player is selecting from their own side
    if (rowIndex !== si) {
      return 'You can only pick from your own pits';
    }

    // Validate pit index
    if (pitIndex < 0 || pitIndex >= NUM_PITS || !Number.isInteger(pitIndex)) {
      return 'Invalid pit index';
    }

    // Check if the pit is empty
    if (state.pits[si][pitIndex] === 0) {
      return 'That pit is empty';
    }

    return null;
  },

  applyMove(state: MancalaState, playerId: string, move: MancalaMove): MancalaState {
    const side = getPlayerSide(state, playerId)!;
    const pitIndex = move.to.col;

    const newState = sowStones(state, side, pitIndex);

    // If either side is now empty, finalize by sweeping remaining stones
    if (isSideEmpty(newState.pits[0]) || isSideEmpty(newState.pits[1])) {
      return finalizeGame(newState);
    }

    return newState;
  },

  getState(state: MancalaState, _playerId: string): unknown {
    // Both players see the full board - no hidden information in Mancala
    return {
      pits: state.pits,
      stores: state.stores,
      currentTurn: state.currentTurn,
      players: state.players,
      winner: state.winner,
      winReason: state.winReason,
      lastMove: state.lastMove,
    };
  },

  checkWinner(state: MancalaState): { winner: string | null; reason?: string } | null {
    const topEmpty = isSideEmpty(state.pits[0]);
    const bottomEmpty = isSideEmpty(state.pits[1]);

    // Game continues if neither side is empty
    if (!topEmpty && !bottomEmpty) {
      return null;
    }

    // State is already finalized by applyMove — read scores directly
    const topScore = state.stores[0];
    const bottomScore = state.stores[1];

    if (topScore > bottomScore) {
      return {
        winner: state.players.top,
        reason: `Top wins ${topScore} to ${bottomScore}!`,
      };
    } else if (bottomScore > topScore) {
      return {
        winner: state.players.bottom,
        reason: `Bottom wins ${bottomScore} to ${topScore}!`,
      };
    } else {
      return {
        winner: null,
        reason: `It's a draw! Both players have ${topScore} stones.`,
      };
    }
  },
};
