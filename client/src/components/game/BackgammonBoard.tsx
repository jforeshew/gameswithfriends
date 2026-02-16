'use client';

import { useState, useCallback, useMemo } from 'react';
import { Position } from '@/lib/types';

interface PointState {
  player: 1 | 2 | null;
  count: number;
}

interface BackgammonGameState {
  board: PointState[];
  bar: { 1: number; 2: number };
  borneOff: { 1: number; 2: number };
  dice: number[];
  currentTurn: 1 | 2;
  players: { 1: string; 2: string };
  diceRolled: boolean;
  winner: string | null;
  winReason: string | null;
  turnMoves: number;
}

interface BackgammonBoardProps {
  gameState: BackgammonGameState;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

// Maximum visible checkers stacked on a point before showing a count badge
const MAX_VISIBLE_CHECKERS = 5;

/**
 * Get the direction of movement for a player.
 * Player 1: moves from high points to low (24 -> 1), home board = 1-6
 * Player 2: moves from low points to high (1 -> 24), home board = 19-24
 */
function getMoveDirection(player: 1 | 2): number {
  return player === 1 ? -1 : 1;
}

function getBarEntryPoint(player: 1 | 2, dieValue: number): number {
  if (player === 1) return 25 - dieValue;
  return dieValue;
}

function getDestination(from: number, dieValue: number, player: 1 | 2): number {
  if (from === 0) return getBarEntryPoint(player, dieValue);
  const dir = getMoveDirection(player);
  const dest = from + dir * dieValue;
  if (player === 1 && dest < 1) return 0;
  if (player === 2 && dest > 24) return 0;
  return dest;
}

function allCheckersInHomeBoard(state: BackgammonGameState, player: 1 | 2): boolean {
  if (state.bar[player] > 0) return false;
  for (let i = 0; i < 24; i++) {
    const point = i + 1;
    const entry = state.board[i];
    if (entry.player === player && entry.count > 0) {
      if (player === 1 && point > 6) return false;
      if (player === 2 && point < 19) return false;
    }
  }
  return true;
}

function isValidSingleMove(
  state: BackgammonGameState,
  player: 1 | 2,
  from: number,
  dieValue: number,
): number {
  if (state.bar[player] > 0 && from !== 0) return -1;

  if (from === 0) {
    if (state.bar[player] <= 0) return -1;
  } else {
    const srcIdx = from - 1;
    if (srcIdx < 0 || srcIdx >= 24) return -1;
    const srcEntry = state.board[srcIdx];
    if (srcEntry.player !== player || srcEntry.count <= 0) return -1;
  }

  const dest = getDestination(from, dieValue, player);
  const opponent: 1 | 2 = player === 1 ? 2 : 1;

  if (dest === 0) {
    if (!allCheckersInHomeBoard(state, player)) return -1;
    if (player === 1) {
      const distance = from;
      if (dieValue < distance) {
        for (let p = from + 1; p <= 6; p++) {
          if (state.board[p - 1].player === player && state.board[p - 1].count > 0) return -1;
        }
      }
    } else {
      const distance = 25 - from;
      if (dieValue < distance) {
        for (let p = from - 1; p >= 19; p--) {
          if (state.board[p - 1].player === player && state.board[p - 1].count > 0) return -1;
        }
      }
    }
    return 0;
  }

  const destIdx = dest - 1;
  if (destIdx < 0 || destIdx >= 24) return -1;
  const destEntry = state.board[destIdx];
  if (destEntry.player === opponent && destEntry.count >= 2) return -1;

  return dest;
}

/**
 * Compute all valid destination points for a given source point.
 */
function getValidDestinations(
  state: BackgammonGameState,
  player: 1 | 2,
  from: number,
): { to: number; dieValue: number }[] {
  const dests: { to: number; dieValue: number }[] = [];
  const seenDice = new Set<number>();

  for (const d of state.dice) {
    if (seenDice.has(d)) continue;
    seenDice.add(d);
    const dest = isValidSingleMove(state, player, from, d);
    if (dest >= 0) {
      // Avoid duplicate destinations
      if (!dests.some(dd => dd.to === dest)) {
        dests.push({ to: dest, dieValue: d });
      }
    }
  }

  return dests;
}

/**
 * Check if the player has any valid moves at all.
 */
function hasAnyValidMoves(state: BackgammonGameState, player: 1 | 2): boolean {
  const uniqueDice = Array.from(new Set(state.dice));
  if (state.bar[player] > 0) {
    for (const d of uniqueDice) {
      if (isValidSingleMove(state, player, 0, d) >= 0) return true;
    }
    return false;
  }
  for (let point = 1; point <= 24; point++) {
    const entry = state.board[point - 1];
    if (entry.player === player && entry.count > 0) {
      for (const d of uniqueDice) {
        if (isValidSingleMove(state, player, point, d) >= 0) return true;
      }
    }
  }
  return false;
}

export function BackgammonBoard({ gameState, playerId, onMove, onQuit }: BackgammonBoardProps) {
  const state = gameState as BackgammonGameState;
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null); // point number or 0 for bar

  const myPlayer: 1 | 2 | null = useMemo(() => {
    if (state.players[1] === playerId) return 1;
    if (state.players[2] === playerId) return 2;
    return null;
  }, [state.players, playerId]);

  const isMyTurn = myPlayer === state.currentTurn;
  const isGameOver = state.winner !== null;
  const canInteract = isMyTurn && !isGameOver && state.dice.length > 0;

  const canPass = useMemo(() => {
    if (!canInteract || !myPlayer) return false;
    return !hasAnyValidMoves(state, myPlayer);
  }, [canInteract, myPlayer, state]);

  // Valid destinations for the selected point
  const validDestinations = useMemo(() => {
    if (selectedPoint === null || !canInteract || !myPlayer) return [];
    return getValidDestinations(state, myPlayer, selectedPoint);
  }, [selectedPoint, canInteract, myPlayer, state]);

  const validDestSet = useMemo(() => {
    return new Set(validDestinations.map(d => d.to));
  }, [validDestinations]);

  // Check which points have valid moves (for highlighting selectable checkers)
  const selectablePoints = useMemo(() => {
    if (!canInteract || !myPlayer) return new Set<number>();
    const points = new Set<number>();

    if (state.bar[myPlayer] > 0) {
      // Must move from bar
      const dests = getValidDestinations(state, myPlayer, 0);
      if (dests.length > 0) points.add(0);
      return points;
    }

    for (let point = 1; point <= 24; point++) {
      const entry = state.board[point - 1];
      if (entry.player === myPlayer && entry.count > 0) {
        const dests = getValidDestinations(state, myPlayer, point);
        if (dests.length > 0) points.add(point);
      }
    }
    return points;
  }, [canInteract, myPlayer, state]);

  const handlePointClick = useCallback(
    (point: number) => {
      if (!canInteract || !myPlayer) return;

      // If clicking a valid destination
      if (selectedPoint !== null && validDestSet.has(point)) {
        // Convert bearing off: point 0 means bearing off
        const toRow = point;
        onMove({ row: selectedPoint, col: 0 }, { row: toRow, col: 0 });
        setSelectedPoint(null);
        return;
      }

      // If clicking a selectable source
      if (selectablePoints.has(point)) {
        if (selectedPoint === point) {
          setSelectedPoint(null);
        } else {
          setSelectedPoint(point);
        }
        return;
      }

      // Deselect
      setSelectedPoint(null);
    },
    [canInteract, myPlayer, selectedPoint, validDestSet, selectablePoints, onMove],
  );

  const handleBarClick = useCallback(() => {
    handlePointClick(0);
  }, [handlePointClick]);

  const handleBearOffClick = useCallback(() => {
    if (selectedPoint !== null && validDestSet.has(0)) {
      onMove({ row: selectedPoint, col: 0 }, { row: 0, col: 0 });
      setSelectedPoint(null);
    }
  }, [selectedPoint, validDestSet, onMove]);

  const handlePass = useCallback(() => {
    onMove({ row: -1, col: 0 }, { row: -1, col: 0 });
  }, [onMove]);

  // Compute which original dice values have been used
  // We track this by comparing dice length to expected
  const originalDiceCount = useMemo(() => {
    // If doubles (4 dice originally), or 2 dice
    // We can infer from turnMoves and current dice
    return state.dice.length + state.turnMoves;
  }, [state.dice, state.turnMoves]);

  const allDiceValues = useMemo(() => {
    // Reconstruct original dice: current dice + turnMoves used
    // We can't know exact original values, but we know count
    // Just show remaining dice prominently
    return state.dice;
  }, [state.dice]);

  // Board layout: the board is oriented so current player's home board is bottom-right
  // Player 1 home = points 1-6, Player 2 home = points 19-24
  // We flip the board perspective based on which player we are
  const isFlipped = myPlayer === 2;

  /**
   * Board layout (from Player 1's perspective):
   *
   *   Top row (left to right): points 13, 14, 15, 16, 17, 18 | BAR | 19, 20, 21, 22, 23, 24
   *   Bottom row (left to right): points 12, 11, 10, 9, 8, 7 | BAR | 6, 5, 4, 3, 2, 1
   *
   * Player 1's home board (1-6) is at bottom right.
   *
   * From Player 2's perspective (flipped):
   *   Top row: points 12, 11, 10, 9, 8, 7 | BAR | 6, 5, 4, 3, 2, 1
   *   Bottom row: points 13, 14, 15, 16, 17, 18 | BAR | 19, 20, 21, 22, 23, 24
   *
   * Player 2's home board (19-24) is at bottom right.
   */

  // Points for top row (left to right), then bottom row (left to right)
  const topRowPoints = useMemo(() => {
    if (!isFlipped) {
      return [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    } else {
      return [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    }
  }, [isFlipped]);

  const bottomRowPoints = useMemo(() => {
    if (!isFlipped) {
      return [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    } else {
      return [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    }
  }, [isFlipped]);

  // Render a single die face
  const renderDie = (value: number, index: number) => {
    const dotPositions: Record<number, [number, number][]> = {
      1: [[1, 1]],
      2: [[0, 2], [2, 0]],
      3: [[0, 2], [1, 1], [2, 0]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]],
      5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
    };
    const dots = dotPositions[value] || [];

    return (
      <div
        key={index}
        className="w-10 h-10 bg-cream-100 rounded-lg shadow-lg border border-cream-200 flex items-center justify-center relative"
      >
        <div className="grid grid-cols-3 grid-rows-3 gap-[2px] w-7 h-7">
          {[0, 1, 2].map(r =>
            [0, 1, 2].map(c => {
              const hasDot = dots.some(([dr, dc]) => dr === r && dc === c);
              return (
                <div key={`${r}-${c}`} className="flex items-center justify-center">
                  {hasDot && (
                    <div className="w-[6px] h-[6px] rounded-full bg-gray-900" />
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>
    );
  };

  // Render stacked checkers on a point
  const renderCheckers = (
    pointNum: number,
    entry: PointState,
    isTop: boolean,
  ) => {
    if (entry.count === 0) return null;

    const isPlayer1 = entry.player === 1;
    const visibleCount = Math.min(entry.count, MAX_VISIBLE_CHECKERS);
    const checkers = [];

    for (let i = 0; i < visibleCount; i++) {
      const offset = isTop ? i * 22 : -i * 22;
      checkers.push(
        <div
          key={i}
          className={`
            w-8 h-8 sm:w-9 sm:h-9 rounded-full absolute left-1/2 -translate-x-1/2 border-2
            transition-all duration-150
            ${isPlayer1
              ? 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-950 border-gray-600 shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.1)]'
              : 'bg-gradient-to-br from-cream-50 via-cream-100 to-cream-200 border-cream-300 shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.6)]'
            }
          `}
          style={{
            [isTop ? 'top' : 'bottom']: `${Math.abs(offset) + 2}px`,
          }}
        />
      );
    }

    // Count badge for overflow
    if (entry.count > MAX_VISIBLE_CHECKERS) {
      const badgeOffset = isTop ? (visibleCount - 1) * 22 + 2 : -((visibleCount - 1) * 22 + 2);
      checkers.push(
        <div
          key="badge"
          className="absolute left-1/2 -translate-x-1/2 z-10 w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-gray-900 flex items-center justify-center shadow-md"
          style={{
            [isTop ? 'top' : 'bottom']: `${Math.abs(badgeOffset) + 12}px`,
          }}
        >
          {entry.count}
        </div>,
      );
    }

    return checkers;
  };

  // Render a single triangular point
  const renderPoint = (pointNum: number, position: number, isTop: boolean) => {
    const entry = state.board[pointNum - 1];
    const isSelected = selectedPoint === pointNum;
    const isValidDest = validDestSet.has(pointNum);
    const isSelectable = selectablePoints.has(pointNum);

    // Alternating triangle colors
    // Points on the left half of each quadrant alternate differently
    const isDarkTriangle = position % 2 === 0;

    return (
      <div
        key={pointNum}
        className={`
          relative flex-1 min-w-0 cursor-pointer
          ${isTop ? 'pt-0' : 'pb-0'}
        `}
        style={{ height: '100%' }}
        onClick={() => handlePointClick(pointNum)}
      >
        {/* Triangle */}
        <div
          className={`
            absolute left-0 right-0
            ${isTop ? 'top-0' : 'bottom-0'}
          `}
          style={{ height: '85%' }}
        >
          <svg
            viewBox="0 0 40 120"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <polygon
              points={isTop ? '0,0 40,0 20,120' : '0,120 40,120 20,0'}
              fill={isDarkTriangle ? '#8b5a2b' : '#e8cba0'}
              stroke={
                isSelected
                  ? '#facc15'
                  : isValidDest
                    ? '#4ade80'
                    : 'rgba(0,0,0,0.2)'
              }
              strokeWidth={isSelected || isValidDest ? '3' : '1'}
            />
          </svg>
        </div>

        {/* Highlight overlay for valid destination */}
        {isValidDest && (
          <div
            className={`
              absolute left-0 right-0 z-20 flex items-center justify-center
              ${isTop ? 'top-[40%]' : 'bottom-[40%]'}
            `}
          >
            <div className="w-6 h-6 rounded-full bg-green-400/60 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse" />
          </div>
        )}

        {/* Selectable indicator */}
        {isSelectable && !isSelected && (
          <div
            className={`
              absolute left-0 right-0 pointer-events-none z-10
              ${isTop ? 'top-0' : 'bottom-0'}
            `}
            style={{ height: '85%' }}
          >
            <div className="w-full h-full rounded-sm ring-2 ring-inset ring-yellow-400/40" />
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div
            className={`
              absolute left-0 right-0 pointer-events-none z-10
              ${isTop ? 'top-0' : 'bottom-0'}
            `}
            style={{ height: '85%' }}
          >
            <div className="w-full h-full rounded-sm ring-2 ring-inset ring-yellow-400/80 bg-yellow-400/10" />
          </div>
        )}

        {/* Checkers */}
        <div className="absolute left-0 right-0 top-0 bottom-0 z-20 pointer-events-none">
          {renderCheckers(pointNum, entry, isTop)}
        </div>

        {/* Point number (subtle) */}
        <div
          className={`
            absolute left-0 right-0 text-center text-[9px] text-wood-400/60 font-mono select-none z-0
            ${isTop ? 'top-[-14px]' : 'bottom-[-14px]'}
          `}
        >
          {pointNum}
        </div>
      </div>
    );
  };

  // Render bar area (checkers on bar)
  const renderBar = () => {
    const myBarCount = myPlayer ? state.bar[myPlayer] : 0;
    const opponentPlayer: 1 | 2 = myPlayer === 1 ? 2 : 1;
    const opponentBarCount = myPlayer ? state.bar[opponentPlayer] : 0;

    const barIsSelected = selectedPoint === 0;
    const barIsSelectable = selectablePoints.has(0);

    return (
      <div
        className={`
          w-10 sm:w-12 flex flex-col items-center justify-between py-2
          bg-amber-950/80 border-x-2 border-amber-900/60 relative
          ${barIsSelectable ? 'cursor-pointer' : ''}
          ${barIsSelected ? 'ring-2 ring-inset ring-yellow-400/80 bg-yellow-400/10' : ''}
        `}
        onClick={handleBarClick}
      >
        {/* Opponent's bar checkers (top) */}
        <div className="flex flex-col items-center gap-1">
          {opponentBarCount > 0 &&
            Array.from({ length: Math.min(opponentBarCount, 3) }).map((_, i) => (
              <div
                key={`opp-bar-${i}`}
                className={`
                  w-7 h-7 rounded-full border-2
                  ${opponentPlayer === 1
                    ? 'bg-gradient-to-br from-gray-700 to-gray-950 border-gray-600'
                    : 'bg-gradient-to-br from-cream-50 to-cream-200 border-cream-300'
                  }
                `}
              />
            ))}
          {opponentBarCount > 3 && (
            <span className="text-xs text-cream-200 font-bold">{opponentBarCount}</span>
          )}
        </div>

        <span className="text-[10px] text-wood-400/50 select-none">BAR</span>

        {/* My bar checkers (bottom) */}
        <div className="flex flex-col items-center gap-1">
          {myBarCount > 0 &&
            Array.from({ length: Math.min(myBarCount, 3) }).map((_, i) => (
              <div
                key={`my-bar-${i}`}
                className={`
                  w-7 h-7 rounded-full border-2
                  ${myPlayer === 1
                    ? 'bg-gradient-to-br from-gray-700 to-gray-950 border-gray-600'
                    : 'bg-gradient-to-br from-cream-50 to-cream-200 border-cream-300'
                  }
                `}
              />
            ))}
          {myBarCount > 3 && (
            <span className="text-xs text-cream-200 font-bold">{myBarCount}</span>
          )}
          {barIsSelectable && !barIsSelected && (
            <div className="absolute inset-0 ring-2 ring-inset ring-yellow-400/40 rounded pointer-events-none" />
          )}
        </div>
      </div>
    );
  };

  // Render borne-off area
  const renderBorneOff = () => {
    const myBorneOff = myPlayer ? state.borneOff[myPlayer] : 0;
    const opponentPlayer: 1 | 2 = myPlayer === 1 ? 2 : 1;
    const opponentBorneOff = myPlayer ? state.borneOff[opponentPlayer] : 0;
    const isBearOffDest = validDestSet.has(0);

    return (
      <div
        className={`
          w-12 sm:w-14 flex flex-col items-center justify-between py-2
          bg-amber-950/60 border-l-2 border-amber-900/60 relative rounded-r-xl
          ${isBearOffDest ? 'cursor-pointer ring-2 ring-inset ring-green-400/60' : ''}
        `}
        onClick={handleBearOffClick}
      >
        {/* Opponent's borne off (top) */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-wood-400/50 select-none">OFF</span>
          <div className="flex flex-col items-center">
            {opponentBorneOff > 0 && (
              <div className="flex items-center gap-1">
                <div
                  className={`
                    w-5 h-5 rounded-full border
                    ${opponentPlayer === 1
                      ? 'bg-gradient-to-br from-gray-700 to-gray-950 border-gray-600'
                      : 'bg-gradient-to-br from-cream-50 to-cream-200 border-cream-300'
                    }
                  `}
                />
                <span className="text-xs text-cream-200 font-bold">{opponentBorneOff}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bear off valid destination indicator */}
        {isBearOffDest && (
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-green-400/60 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse" />
          </div>
        )}

        {/* My borne off (bottom) */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1">
            {myBorneOff > 0 && (
              <>
                <div
                  className={`
                    w-5 h-5 rounded-full border
                    ${myPlayer === 1
                      ? 'bg-gradient-to-br from-gray-700 to-gray-950 border-gray-600'
                      : 'bg-gradient-to-br from-cream-50 to-cream-200 border-cream-300'
                    }
                  `}
                />
                <span className="text-xs text-cream-200 font-bold">{myBorneOff}</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-wood-400/50 select-none">OFF</span>
        </div>
      </div>
    );
  };

  const turnLabel = useMemo(() => {
    if (isGameOver) return 'Game Over';
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  }, [isGameOver, isMyTurn]);

  const playerLabel = useMemo(() => {
    if (!myPlayer) return null;
    return myPlayer === 1 ? 'Dark' : 'Light';
  }, [myPlayer]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`
            w-4 h-4 rounded-full border-2
            ${state.currentTurn === 1
              ? 'bg-gradient-to-br from-gray-700 to-gray-950 border-gray-500'
              : 'bg-gradient-to-br from-cream-50 to-cream-200 border-cream-300'
            }
          `}
        />
        <span className="text-cream-100 font-medium text-lg">
          {turnLabel}
        </span>
        {isMyTurn && !isGameOver && state.dice.length > 0 && (
          <span className="text-wood-300 text-sm">
            ({state.dice.length} move{state.dice.length !== 1 ? 's' : ''} left)
          </span>
        )}
      </div>

      {/* Dice display */}
      {state.diceRolled && !isGameOver && (
        <div className="flex items-center gap-3">
          <span className="text-wood-300 text-sm">Dice:</span>
          <div className="flex items-center gap-2">
            {allDiceValues.map((d, i) => renderDie(d, i))}
          </div>
          {state.dice.length === 0 && state.turnMoves > 0 && (
            <span className="text-wood-400 text-xs italic">All used</span>
          )}
        </div>
      )}

      {/* Opponent label */}
      <div className="text-center text-sm text-wood-300/70">
        Opponent
      </div>

      {/* Board */}
      <div className="w-[min(92vw,640px)]">
        <div className="bg-amber-800 rounded-2xl p-2 sm:p-3 shadow-2xl border-4 border-amber-900/80 relative overflow-hidden">
          {/* Wood grain texture overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-br from-yellow-600 via-transparent to-amber-950 rounded-2xl" />

          <div className="flex relative" style={{ height: 'clamp(280px, 50vw, 380px)' }}>
            {/* Left quadrants (points) */}
            <div className="flex-1 flex flex-col relative">
              {/* Top row - left half */}
              <div className="flex-1 flex gap-[1px] relative">
                {topRowPoints.slice(0, 6).map((point, i) =>
                  renderPoint(point, i, true),
                )}
              </div>
              {/* Bottom row - left half */}
              <div className="flex-1 flex gap-[1px] relative">
                {bottomRowPoints.slice(0, 6).map((point, i) =>
                  renderPoint(point, i, false),
                )}
              </div>
            </div>

            {/* Bar */}
            {renderBar()}

            {/* Right quadrants (points) */}
            <div className="flex-1 flex flex-col relative">
              {/* Top row - right half */}
              <div className="flex-1 flex gap-[1px] relative">
                {topRowPoints.slice(6, 12).map((point, i) =>
                  renderPoint(point, i + 6, true),
                )}
              </div>
              {/* Bottom row - right half */}
              <div className="flex-1 flex gap-[1px] relative">
                {bottomRowPoints.slice(6, 12).map((point, i) =>
                  renderPoint(point, i + 6, false),
                )}
              </div>
            </div>

            {/* Borne-off tray */}
            {renderBorneOff()}
          </div>
        </div>
      </div>

      {/* Your side label */}
      <div className="text-center text-sm text-wood-300/70">
        Your side
      </div>

      {/* Borne-off progress */}
      <div className="flex gap-6 text-sm text-cream-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-700 to-gray-950 border border-gray-600" />
          <span>Dark off: {state.borneOff[1]}/15</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cream-50 to-cream-200 border border-cream-300" />
          <span>Light off: {state.borneOff[2]}/15</span>
        </div>
      </div>

      {/* Bar info */}
      {(state.bar[1] > 0 || state.bar[2] > 0) && (
        <div className="flex gap-4 text-sm text-cream-200">
          {state.bar[1] > 0 && (
            <span className="text-yellow-400">Dark on bar: {state.bar[1]}</span>
          )}
          {state.bar[2] > 0 && (
            <span className="text-yellow-400">Light on bar: {state.bar[2]}</span>
          )}
        </div>
      )}

      {/* Pass button */}
      {canPass && (
        <button
          onClick={handlePass}
          className="px-6 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-cream-100 font-medium border border-amber-600 transition-colors shadow-md"
        >
          No valid moves — Pass
        </button>
      )}

      {/* Player info + quit */}
      <div className="flex items-center gap-6">
        {myPlayer && (
          <div className="text-sm text-wood-300">
            You are playing as{' '}
            <span
              className={`font-semibold ${myPlayer === 1 ? 'text-gray-300' : 'text-cream-100'}`}
            >
              {playerLabel}
            </span>
          </div>
        )}
        <button
          onClick={onQuit}
          className="px-4 py-1.5 text-sm rounded-lg bg-wood-800 hover:bg-wood-700 text-red-400 border border-wood-600 transition-colors"
        >
          Quit Game
        </button>
      </div>
    </div>
  );
}
