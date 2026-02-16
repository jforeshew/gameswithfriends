import { GameEngine } from '../../types';

// ---- Backgammon Types ----

interface PointState {
  player: 1 | 2 | null;
  count: number;
}

export interface BackgammonState {
  board: PointState[]; // 24 entries, index 0 = point 1, index 23 = point 24
  bar: { 1: number; 2: number };
  borneOff: { 1: number; 2: number };
  dice: number[]; // remaining dice values to use
  currentTurn: 1 | 2;
  players: { 1: string; 2: string };
  diceRolled: boolean;
  winner: string | null;
  winReason: string | null;
  turnMoves: number;
}

export interface BackgammonMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

// ---- Constants ----

// Standard backgammon starting positions
// Player 1 moves from point 24 toward point 1 (home board 1-6)
// Player 2 moves from point 1 toward point 24 (home board 19-24)
function createInitialBoard(): PointState[] {
  const board: PointState[] = Array(24)
    .fill(null)
    .map(() => ({ player: null, count: 0 }));

  // Standard setup:
  // Player 1 (moving toward point 1):
  //   2 on point 24, 5 on point 13, 3 on point 8, 5 on point 6
  board[23] = { player: 1, count: 2 }; // point 24
  board[12] = { player: 1, count: 5 }; // point 13
  board[7] = { player: 1, count: 3 };  // point 8
  board[5] = { player: 1, count: 5 };  // point 6

  // Player 2 (moving toward point 24):
  //   2 on point 1, 5 on point 12, 3 on point 17, 5 on point 19
  board[0] = { player: 2, count: 2 };  // point 1
  board[11] = { player: 2, count: 5 }; // point 12
  board[16] = { player: 2, count: 3 }; // point 17
  board[18] = { player: 2, count: 5 }; // point 19

  return board;
}

function rollDice(): number[] {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  if (d1 === d2) {
    return [d1, d1, d1, d1]; // doubles give 4 moves
  }
  return [d1, d2];
}

function cloneState(state: BackgammonState): BackgammonState {
  return {
    board: state.board.map(p => ({ ...p })),
    bar: { ...state.bar },
    borneOff: { ...state.borneOff },
    dice: [...state.dice],
    currentTurn: state.currentTurn,
    players: { ...state.players },
    diceRolled: state.diceRolled,
    winner: state.winner,
    winReason: state.winReason,
    turnMoves: state.turnMoves,
  };
}

function getPlayerNumber(state: BackgammonState, playerId: string): 1 | 2 | null {
  if (state.players[1] === playerId) return 1;
  if (state.players[2] === playerId) return 2;
  return null;
}

/**
 * Get the direction of movement for a player.
 * Player 1: moves from high points to low (24 -> 1), direction = -1
 * Player 2: moves from low points to high (1 -> 24), direction = +1
 */
function getMoveDirection(player: 1 | 2): number {
  return player === 1 ? -1 : 1;
}

/**
 * Get the bar entry point for a player.
 * Player 1 enters at point 24 side (must enter into opponent's home board, points 19-24)
 * Player 2 enters at point 1 side (must enter into opponent's home board, points 1-6)
 *
 * When entering from bar with die value d:
 * Player 1: enters at point (25 - d) -- so die=1 enters point 24, die=6 enters point 19
 * Player 2: enters at point d -- so die=1 enters point 1, die=6 enters point 6
 */
function getBarEntryPoint(player: 1 | 2, dieValue: number): number {
  if (player === 1) {
    return 25 - dieValue; // enters points 19-24
  } else {
    return dieValue; // enters points 1-6
  }
}

/**
 * Check if all of a player's checkers are in their home board.
 * Player 1: home board is points 1-6
 * Player 2: home board is points 19-24
 */
function allCheckersInHomeBoard(state: BackgammonState, player: 1 | 2): boolean {
  if (state.bar[player] > 0) return false;

  for (let i = 0; i < 24; i++) {
    const point = i + 1; // 1-indexed
    const entry = state.board[i];
    if (entry.player === player && entry.count > 0) {
      if (player === 1 && point > 6) return false;
      if (player === 2 && point < 19) return false;
    }
  }

  return true;
}

/**
 * Get the point number a checker moves to given a die value.
 * Returns 0 if bearing off (past the board).
 * from = point number (1-24), 0 = bar
 */
function getDestination(from: number, dieValue: number, player: 1 | 2): number {
  if (from === 0) {
    // Entering from bar
    return getBarEntryPoint(player, dieValue);
  }

  const dir = getMoveDirection(player);
  const dest = from + dir * dieValue;

  // Check if bearing off
  if (player === 1 && dest < 1) return 0; // bearing off
  if (player === 2 && dest > 24) return 0; // bearing off

  return dest;
}

/**
 * Check if a specific move is valid (single checker move with a specific die value).
 * from: source point (1-24, 0 = bar)
 * dieValue: the die value being used
 * Returns: destination point (1-24) or 0 for bear off, or -1 if invalid
 */
function isValidSingleMove(
  state: BackgammonState,
  player: 1 | 2,
  from: number,
  dieValue: number,
): number {
  // If player has checkers on the bar, they must enter first
  if (state.bar[player] > 0 && from !== 0) {
    return -1;
  }

  // Check source has a checker
  if (from === 0) {
    if (state.bar[player] <= 0) return -1;
  } else {
    const srcIdx = from - 1;
    if (srcIdx < 0 || srcIdx >= 24) return -1;
    const srcEntry = state.board[srcIdx];
    if (srcEntry.player !== player || srcEntry.count <= 0) return -1;
  }

  const dest = getDestination(from, dieValue, player);

  if (dest === 0) {
    // Bearing off
    if (!allCheckersInHomeBoard(state, player)) return -1;

    // For bearing off, the die must be >= the distance to bear off
    // Player 1: bearing off from points 1-6, distance = point number
    // Player 2: bearing off from points 19-24, distance = 25 - point number
    if (player === 1) {
      const distance = from; // point number is the distance for player 1
      if (dieValue < distance) {
        // Can only bear off with exact or higher die if no checker on a higher point
        // "higher point" = farther from bearing off = higher point number for player 1
        let hasHigher = false;
        for (let p = from + 1; p <= 6; p++) {
          if (state.board[p - 1].player === player && state.board[p - 1].count > 0) {
            hasHigher = true;
            break;
          }
        }
        if (hasHigher) return -1;
      }
    } else {
      const distance = 25 - from; // distance for player 2
      if (dieValue < distance) {
        let hasHigher = false;
        for (let p = from - 1; p >= 19; p--) {
          if (state.board[p - 1].player === player && state.board[p - 1].count > 0) {
            hasHigher = true;
            break;
          }
        }
        if (hasHigher) return -1;
      }
    }

    return 0; // valid bear off
  }

  // Check destination is not blocked
  const destIdx = dest - 1;
  if (destIdx < 0 || destIdx >= 24) return -1;
  const destEntry = state.board[destIdx];
  const opponent: 1 | 2 = player === 1 ? 2 : 1;

  if (destEntry.player === opponent && destEntry.count >= 2) {
    return -1; // blocked
  }

  return dest;
}

/**
 * Get all valid moves for a player given the current dice.
 * Returns an array of { from, to, dieValue } objects.
 */
function getValidMovesForDie(
  state: BackgammonState,
  player: 1 | 2,
  dieValue: number,
): { from: number; to: number; dieValue: number }[] {
  const moves: { from: number; to: number; dieValue: number }[] = [];

  // If on bar, can only enter from bar
  if (state.bar[player] > 0) {
    const dest = isValidSingleMove(state, player, 0, dieValue);
    if (dest >= 0) {
      moves.push({ from: 0, to: dest, dieValue });
    }
    return moves;
  }

  // Try all points
  for (let point = 1; point <= 24; point++) {
    const entry = state.board[point - 1];
    if (entry.player === player && entry.count > 0) {
      const dest = isValidSingleMove(state, player, point, dieValue);
      if (dest >= 0) {
        moves.push({ from: point, to: dest, dieValue });
      }
    }
  }

  return moves;
}

/**
 * Apply a single checker move to a state (mutates a clone).
 */
function applySingleMove(
  state: BackgammonState,
  player: 1 | 2,
  from: number,
  to: number,
): BackgammonState {
  const newState = cloneState(state);
  const opponent: 1 | 2 = player === 1 ? 2 : 1;

  // Remove checker from source
  if (from === 0) {
    newState.bar[player]--;
  } else {
    newState.board[from - 1].count--;
    if (newState.board[from - 1].count === 0) {
      newState.board[from - 1].player = null;
    }
  }

  // Place checker at destination
  if (to === 0) {
    // Bearing off
    newState.borneOff[player]++;
  } else {
    const destIdx = to - 1;
    const destEntry = newState.board[destIdx];

    // Check if hitting an opponent's blot
    if (destEntry.player === opponent && destEntry.count === 1) {
      // Send opponent's checker to the bar
      newState.bar[opponent]++;
      newState.board[destIdx] = { player, count: 1 };
    } else {
      if (destEntry.player === player) {
        destEntry.count++;
      } else {
        newState.board[destIdx] = { player, count: 1 };
      }
    }
  }

  return newState;
}

/**
 * Check if a player has any valid moves with ANY of the remaining dice.
 */
function hasAnyValidMoves(state: BackgammonState, player: 1 | 2): boolean {
  const uniqueDice = Array.from(new Set(state.dice));
  for (const d of uniqueDice) {
    const moves = getValidMovesForDie(state, player, d);
    if (moves.length > 0) return true;
  }
  return false;
}

/**
 * Check which die values can be used for any valid move.
 * This helps enforce the "must use higher die" rule.
 */
function getUsableDice(state: BackgammonState, player: 1 | 2): number[] {
  const usable: number[] = [];
  const uniqueDice = Array.from(new Set(state.dice));
  for (const d of uniqueDice) {
    const moves = getValidMovesForDie(state, player, d);
    if (moves.length > 0) usable.push(d);
  }
  return usable;
}

/**
 * Check if using a specific die value would leave the player able to use the remaining dice.
 * This is important for the "must use all dice if possible" rule.
 */
function canUseAllDiceAfterMove(
  state: BackgammonState,
  player: 1 | 2,
  from: number,
  to: number,
  usedDieValue: number,
): boolean {
  const afterState = applySingleMove(state, player, from, to);
  const remainingDice = [...state.dice];
  const idx = remainingDice.indexOf(usedDieValue);
  if (idx !== -1) remainingDice.splice(idx, 1);
  afterState.dice = remainingDice;

  if (remainingDice.length === 0) return true;

  // Check if remaining dice can be used
  return hasAnyValidMoves(afterState, player);
}

/**
 * Determine which die value a move from -> to uses.
 * Returns the die value, or -1 if the move doesn't match any die.
 */
function getDieValueForMove(
  state: BackgammonState,
  player: 1 | 2,
  from: number,
  to: number,
): number {
  // Calculate the distance
  let distance: number;

  if (to === 0) {
    // Bearing off
    if (player === 1) {
      distance = from; // distance from point to bearing off for player 1
    } else {
      distance = 25 - from; // distance from point to bearing off for player 2
    }
  } else if (from === 0) {
    // Entering from bar
    if (player === 1) {
      distance = 25 - to; // player 1 enters into points 19-24
    } else {
      distance = to; // player 2 enters into points 1-6
    }
  } else {
    distance = Math.abs(to - from);
  }

  // Check if the exact distance matches a die
  if (state.dice.includes(distance)) {
    // Verify the move is valid with this die
    const dest = isValidSingleMove(state, player, from, distance);
    if ((to === 0 && dest === 0) || dest === to) {
      return distance;
    }
  }

  // For bearing off, a higher die value can be used if no checker on higher point
  if (to === 0) {
    // Try each die value >= distance
    const sortedDice = Array.from(new Set(state.dice)).sort((a, b) => a - b);
    for (const d of sortedDice) {
      if (d >= distance) {
        const dest = isValidSingleMove(state, player, from, d);
        if (dest === 0) {
          return d;
        }
      }
    }
  }

  return -1;
}

/**
 * Switch turns and roll new dice. If the new player has no valid moves, auto-pass.
 */
function switchTurns(state: BackgammonState): BackgammonState {
  const newState = cloneState(state);
  newState.currentTurn = newState.currentTurn === 1 ? 2 : 1;
  newState.dice = rollDice();
  newState.diceRolled = true;
  newState.turnMoves = 0;

  // Auto-pass if no valid moves
  if (!hasAnyValidMoves(newState, newState.currentTurn)) {
    // Switch again
    newState.currentTurn = newState.currentTurn === 1 ? 2 : 1;
    newState.dice = rollDice();
    newState.diceRolled = true;
    newState.turnMoves = 0;

    // If still no valid moves for either player (extremely rare), just keep state
    // The game would be in a deadlock situation
  }

  return newState;
}

// ---- Game Engine ----

export const backgammonEngine: GameEngine<BackgammonState, BackgammonMove> = {
  initGame(playerIds: [string, string]): BackgammonState {
    // Randomly assign player 1 / player 2
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];

    const dice = rollDice();

    const state: BackgammonState = {
      board: createInitialBoard(),
      bar: { 1: 0, 2: 0 },
      borneOff: { 1: 0, 2: 0 },
      dice,
      currentTurn: 1, // player 1 goes first
      players: { 1: shuffled[0], 2: shuffled[1] },
      diceRolled: true,
      winner: null,
      winReason: null,
      turnMoves: 0,
    };

    // If player 1 has no valid moves at the start, auto-pass
    if (!hasAnyValidMoves(state, state.currentTurn)) {
      return switchTurns(state);
    }

    return state;
  },

  validateMove(state: BackgammonState, playerId: string, move: BackgammonMove): string | null {
    if (state.winner) return 'Game is already over';

    const player = getPlayerNumber(state, playerId);
    if (!player) return 'You are not a player in this game';
    if (player !== state.currentTurn) return 'It is not your turn';

    const from = move.from.row;
    const to = move.to.row;

    // Pass move
    if (from === -1 && to === -1) {
      if (hasAnyValidMoves(state, player)) {
        return 'You have valid moves available and cannot pass';
      }
      return null;
    }

    // Validate source
    if (from === 0) {
      // From bar
      if (state.bar[player] <= 0) return 'You have no checkers on the bar';
    } else if (from >= 1 && from <= 24) {
      const srcEntry = state.board[from - 1];
      if (srcEntry.player !== player || srcEntry.count <= 0) {
        return 'No checker of yours at that position';
      }
      // Must enter from bar first
      if (state.bar[player] > 0) {
        return 'You must enter your checkers from the bar first';
      }
    } else {
      return 'Invalid source position';
    }

    // Validate destination
    if (to === 0) {
      // Bearing off
      if (!allCheckersInHomeBoard(state, player)) {
        return 'All checkers must be in your home board to bear off';
      }
    } else if (to < 1 || to > 24) {
      return 'Invalid destination position';
    }

    // Check direction
    if (to !== 0 && from !== 0) {
      const dir = getMoveDirection(player);
      if (dir === -1 && to >= from) return 'You must move toward your home board';
      if (dir === 1 && to <= from) return 'You must move toward your home board';
    }

    // Find which die value this move uses
    const dieValue = getDieValueForMove(state, player, from, to);
    if (dieValue === -1) {
      return 'No matching die value for this move';
    }

    // Verify the move is valid
    const validDest = isValidSingleMove(state, player, from, dieValue);
    if (validDest === -1) {
      return 'Invalid move';
    }
    if (to === 0 && validDest !== 0) {
      return 'Cannot bear off with this move';
    }
    if (to !== 0 && validDest !== to) {
      return 'Invalid destination for this die value';
    }

    // Check "must use higher die" rule:
    // If only one die can be used (not both), must use the higher value if possible
    const usableDice = getUsableDice(state, player);
    if (usableDice.length === 1 && state.dice.length === 2) {
      // Only one die is usable. The rules say must use the higher die if possible.
      const higherDie = Math.max(...state.dice);
      const lowerDie = Math.min(...state.dice);
      if (higherDie !== lowerDie) {
        // Check if the higher die is usable
        const higherUsable = getValidMovesForDie(state, player, higherDie).length > 0;
        if (higherUsable && dieValue === lowerDie) {
          return 'You must use the higher die value when only one can be used';
        }
      }
    }

    // Check "must use all dice if possible" rule:
    // If using this die prevents using remaining dice, but using a different die wouldn't,
    // then this move may be invalid (only if there are exactly 2 different dice left)
    if (state.dice.length === 2 && state.dice[0] !== state.dice[1]) {
      const canUseAll = canUseAllDiceAfterMove(state, player, from, to, dieValue);
      if (!canUseAll) {
        // Check if the other die value could lead to using both
        const otherDie = state.dice.find(d => d !== dieValue);
        if (otherDie !== undefined) {
          const otherMoves = getValidMovesForDie(state, player, otherDie);
          for (const otherMove of otherMoves) {
            if (canUseAllDiceAfterMove(state, player, otherMove.from, otherMove.to, otherDie)) {
              return 'You must use both dice if possible. Try a different move.';
            }
          }
        }
        // If neither order allows using both, it's fine to use just one
      }
    }

    return null;
  },

  applyMove(state: BackgammonState, playerId: string, move: BackgammonMove): BackgammonState {
    const player = getPlayerNumber(state, playerId)!;
    const from = move.from.row;
    const to = move.to.row;

    // Handle pass
    if (from === -1 && to === -1) {
      return switchTurns(state);
    }

    // Find the die value used
    const dieValue = getDieValueForMove(state, player, from, to);

    // Apply the move
    let newState = applySingleMove(state, player, from, to);

    // Remove the used die
    const diceRemaining = [...state.dice];
    const dieIdx = diceRemaining.indexOf(dieValue);
    if (dieIdx !== -1) diceRemaining.splice(dieIdx, 1);
    newState.dice = diceRemaining;
    newState.turnMoves = state.turnMoves + 1;

    // Check if turn should end
    if (diceRemaining.length === 0 || !hasAnyValidMoves(newState, player)) {
      // All dice used or no more valid moves - switch turns
      if (newState.borneOff[player] < 15) {
        // Game isn't over yet, switch turns
        newState = switchTurns(newState);
      }
    }

    return newState;
  },

  getState(state: BackgammonState, _playerId: string): unknown {
    // Both players see the full board - no hidden information in backgammon
    return {
      board: state.board,
      bar: state.bar,
      borneOff: state.borneOff,
      dice: state.dice,
      currentTurn: state.currentTurn,
      players: state.players,
      diceRolled: state.diceRolled,
      winner: state.winner,
      winReason: state.winReason,
      turnMoves: state.turnMoves,
    };
  },

  checkWinner(state: BackgammonState): { winner: string | null; reason?: string } | null {
    if (state.borneOff[1] >= 15) {
      return {
        winner: state.players[1],
        reason: 'Player 1 bore off all checkers!',
      };
    }
    if (state.borneOff[2] >= 15) {
      return {
        winner: state.players[2],
        reason: 'Player 2 bore off all checkers!',
      };
    }
    return null;
  },
};
