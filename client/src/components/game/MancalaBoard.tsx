'use client';

import { useMemo, useCallback } from 'react';
import { Position } from '@/lib/types';

type MancalaSide = 'top' | 'bottom';

interface MancalaState {
  pits: [number[], number[]];
  stores: [number, number];
  currentTurn: MancalaSide;
  players: { top: string; bottom: string };
  winner: string | null;
  winReason: string | null;
  lastMove: { side: number; pit: number } | null;
}

interface MancalaBoardProps {
  gameState: MancalaState;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

const NUM_PITS = 6;

export function MancalaBoard({ gameState, playerId, onMove, onQuit }: MancalaBoardProps) {
  const mySide: MancalaSide | null = useMemo(() => {
    if (gameState.players.top === playerId) return 'top';
    if (gameState.players.bottom === playerId) return 'bottom';
    return null;
  }, [gameState.players, playerId]);

  const isMyTurn = mySide === gameState.currentTurn;
  const isGameOver = gameState.winner !== null || gameState.winReason !== null;
  const canInteract = isMyTurn && !isGameOver;

  /**
   * Map from visual row (0=top row on screen, 1=bottom row on screen)
   * to the data indices.
   *
   * Board orientation:
   * - The bottom player sees their pits on the bottom row.
   * - The bottom player's store is on the right.
   * - The top player's pits are on the top row (shown in reverse order so
   *   counterclockwise flow reads naturally).
   *
   * Visual layout (from bottom player's perspective):
   *
   *   [Top Store]  [top pit 5] [top pit 4] ... [top pit 0]  [       ]
   *   [         ]  [bot pit 0] [bot pit 1] ... [bot pit 5]  [Bot Store]
   *
   * The top row pits are displayed in reverse (5..0) so the board reads
   * counterclockwise visually.
   */

  // Get the pits for the visual top row (opponent for bottom player, self for top player)
  // and visual bottom row.
  const visualTopRowSideIndex = mySide === 'top' ? 1 : 0; // opponent's side on top
  const visualBottomRowSideIndex = mySide === 'top' ? 0 : 1; // own side on bottom

  // The top row pits are displayed in REVERSE order
  const visualTopPits = useMemo(() => {
    return [...gameState.pits[visualTopRowSideIndex]].reverse();
  }, [gameState.pits, visualTopRowSideIndex]);

  // The bottom row pits are displayed left to right
  const visualBottomPits = useMemo(() => {
    return [...gameState.pits[visualBottomRowSideIndex]];
  }, [gameState.pits, visualBottomRowSideIndex]);

  // Left store = opponent's store, Right store = my store (from bottom player's perspective)
  const leftStoreIndex = mySide === 'top' ? 1 : 0;   // opponent's store on the left
  const rightStoreIndex = mySide === 'top' ? 0 : 1;   // my store on the right

  const leftStoreCount = gameState.stores[leftStoreIndex];
  const rightStoreCount = gameState.stores[rightStoreIndex];

  // Determine if a pit is clickable (belongs to current player and is non-empty)
  const isPitClickable = useCallback(
    (visualRow: 'top' | 'bottom', visualCol: number): boolean => {
      if (!canInteract) return false;
      // Only the bottom visual row is the current player's pits
      if (visualRow !== 'bottom') return false;
      const actualPitIndex = visualCol;
      return gameState.pits[visualBottomRowSideIndex][actualPitIndex] > 0;
    },
    [canInteract, gameState.pits, visualBottomRowSideIndex],
  );

  const handlePitClick = useCallback(
    (visualRow: 'top' | 'bottom', visualCol: number) => {
      if (visualRow !== 'bottom' || !canInteract) return;
      const actualSideIndex = visualBottomRowSideIndex;
      const actualPitIndex = visualCol;
      if (gameState.pits[actualSideIndex][actualPitIndex] === 0) return;
      onMove({ row: 0, col: 0 }, { row: actualSideIndex, col: actualPitIndex });
    },
    [canInteract, visualBottomRowSideIndex, gameState.pits, onMove],
  );

  // Check if a pit was the last move
  const isLastMovePit = useCallback(
    (sideIndex: number, pitIndex: number): boolean => {
      if (!gameState.lastMove) return false;
      return gameState.lastMove.side === sideIndex && gameState.lastMove.pit === pitIndex;
    },
    [gameState.lastMove],
  );

  const turnLabel = useMemo(() => {
    if (isGameOver) {
      if (gameState.winner === null) return "It's a draw!";
      return 'Game Over';
    }
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  }, [isGameOver, isMyTurn, gameState.winner]);

  const sideLabel = useMemo(() => {
    if (!mySide) return null;
    return mySide === 'bottom' ? 'Bottom' : 'Top';
  }, [mySide]);

  // Render a single pit
  const renderPit = (
    stoneCount: number,
    visualRow: 'top' | 'bottom',
    visualCol: number,
    actualSideIndex: number,
    actualPitIndex: number,
  ) => {
    const clickable = isPitClickable(visualRow, visualCol);
    const isLast = isLastMovePit(actualSideIndex, actualPitIndex);

    return (
      <button
        key={`${visualRow}-${visualCol}`}
        disabled={!clickable}
        onClick={() => handlePitClick(visualRow, visualCol)}
        className={`
          aspect-square rounded-full flex items-center justify-center
          transition-all duration-200 relative
          bg-amber-900/60 border-2 border-amber-950/40
          shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)]
          ${clickable
            ? 'hover:bg-amber-700/70 hover:border-amber-600/60 hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] cursor-pointer hover:scale-105'
            : 'cursor-default'
          }
          ${isLast ? 'ring-2 ring-amber-400/70' : ''}
        `}
      >
        <span
          className={`
            text-lg font-bold select-none
            ${stoneCount > 0 ? 'text-amber-100' : 'text-amber-800/40'}
          `}
        >
          {stoneCount}
        </span>
      </button>
    );
  };

  // Render a store (mancala)
  const renderStore = (stoneCount: number, position: 'left' | 'right') => {
    const isMyStore = position === 'right';

    return (
      <div
        className={`
          flex items-center justify-center
          bg-amber-900/50 border-2 border-amber-950/40
          shadow-[inset_0_6px_12px_rgba(0,0,0,0.4)]
          rounded-[2rem] w-full h-full min-h-[80px]
          ${isMyStore ? 'ring-1 ring-amber-600/30' : ''}
        `}
      >
        <span className="text-2xl font-bold text-amber-100 select-none">
          {stoneCount}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`
            w-3 h-3 rounded-full
            ${isMyTurn && !isGameOver
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
              : 'bg-amber-800/60'
            }
          `}
        />
        <span className="text-cream-100 font-medium text-lg">
          {turnLabel}
        </span>
      </div>

      {/* Board container */}
      <div className="w-[min(90vw,600px)]">
        {/* Opponent label */}
        <div className="text-center text-sm text-wood-300/70 mb-1">
          Opponent
        </div>

        {/* Main board frame */}
        <div className="bg-amber-800 rounded-2xl p-[clamp(8px,2vw,16px)] shadow-2xl border-4 border-amber-900/80 relative overflow-hidden">
          {/* Wood grain texture overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-br from-yellow-600 via-transparent to-amber-950 rounded-2xl" />

          <div className="grid grid-cols-[1fr_4fr_1fr] gap-[clamp(4px,1vw,8px)] relative">
            {/* Left store (opponent's) */}
            <div className="row-span-2 flex flex-col justify-center py-1">
              {renderStore(leftStoreCount, 'left')}
            </div>

            {/* Top row: opponent's pits (reversed) */}
            <div className="grid grid-cols-6 gap-[clamp(3px,0.8vw,6px)] py-[clamp(2px,0.5vw,6px)]">
              {visualTopPits.map((count: number, i: number) => {
                // Reverse mapping: visual col i maps to actual pit index (5 - i) on the top visual side
                const actualPitIndex = NUM_PITS - 1 - i;
                return renderPit(count, 'top', i, visualTopRowSideIndex, actualPitIndex);
              })}
            </div>

            {/* Right store (my store) */}
            <div className="row-span-2 flex flex-col justify-center py-1">
              {renderStore(rightStoreCount, 'right')}
            </div>

            {/* Bottom row: my pits */}
            <div className="grid grid-cols-6 gap-[clamp(3px,0.8vw,6px)] py-[clamp(2px,0.5vw,6px)]">
              {visualBottomPits.map((count: number, i: number) =>
                renderPit(count, 'bottom', i, visualBottomRowSideIndex, i),
              )}
            </div>
          </div>
        </div>

        {/* Player label */}
        <div className="text-center text-sm text-wood-300/70 mt-1">
          Your side
        </div>
      </div>

      {/* Player info + quit */}
      <div className="flex items-center gap-6 mt-1">
        {mySide && (
          <div className="text-sm text-wood-300">
            Your side:{' '}
            <span className="text-amber-300 font-semibold">
              {sideLabel}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-wood-300">
          <span>Your store:</span>
          <span className="text-amber-300 font-bold">{rightStoreCount}</span>
          <span className="mx-1 text-wood-300/40">|</span>
          <span>Opponent:</span>
          <span className="text-amber-300 font-bold">{leftStoreCount}</span>
        </div>
      </div>

      <button
        onClick={onQuit}
        className="px-4 py-1.5 text-sm rounded-lg bg-wood-800 hover:bg-wood-700 text-red-400 border border-wood-600 transition-colors"
      >
        Quit Game
      </button>
    </div>
  );
}
