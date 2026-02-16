'use client';

import { useState, useCallback, useMemo } from 'react';
import { Position } from '@/lib/types';

type GoColor = 'black' | 'white';

interface GoState {
  board: (GoColor | null)[][];
  currentTurn: GoColor;
  players: { black: string; white: string };
  captures: { black: number; white: number };
  consecutivePasses: number;
  winner: string | null;
  winReason: string | null;
  score: { black: number; white: number } | null;
  lastMove: Position | null;
  moveCount: number;
}

interface GoBoardProps {
  gameState: GoState;
  playerId: string;
  onMove: (from: { row: number; col: number }, to: { row: number; col: number }) => void;
  onQuit: () => void;
}

const BOARD_SIZE = 9;

// Standard star points (hoshi) for a 9x9 board
const STAR_POINTS: Position[] = [
  { row: 2, col: 2 },
  { row: 2, col: 6 },
  { row: 6, col: 2 },
  { row: 6, col: 6 },
  { row: 4, col: 4 }, // tengen (center)
];

const starPointSet = new Set(STAR_POINTS.map(p => `${p.row}-${p.col}`));

export function GoBoard({ gameState, playerId, onMove, onQuit }: GoBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);

  const state = gameState as GoState;

  const myColor = useMemo((): GoColor | null => {
    if (state.players.black === playerId) return 'black';
    if (state.players.white === playerId) return 'white';
    return null;
  }, [state.players, playerId]);

  const isMyTurn = myColor === state.currentTurn;
  const isGameOver = state.winner !== null || (state.consecutivePasses >= 2);
  const canInteract = isMyTurn && !isGameOver;

  const lastMoveIsPass = state.lastMove !== null && state.lastMove.row === -1 && state.lastMove.col === -1;

  const handleIntersectionClick = useCallback(
    (row: number, col: number) => {
      if (!canInteract) return;
      if (state.board[row][col] !== null) return;
      onMove({ row: 0, col: 0 }, { row, col });
    },
    [canInteract, state.board, onMove],
  );

  const handlePass = useCallback(() => {
    if (!canInteract) return;
    onMove({ row: 0, col: 0 }, { row: -1, col: -1 });
  }, [canInteract, onMove]);

  const isLastMove = useCallback(
    (row: number, col: number): boolean => {
      return state.lastMove !== null &&
        state.lastMove.row === row &&
        state.lastMove.col === col;
    },
    [state.lastMove],
  );

  const turnLabel = useMemo(() => {
    if (isGameOver) {
      if (state.winner === null && state.winReason) return "It's a draw!";
      return 'Game Over';
    }
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  }, [isGameOver, isMyTurn, state.winner, state.winReason]);

  const playerNames = useMemo(() => {
    // We don't have player name data in the game state, so show color + ID prefix
    return {
      black: state.players.black === playerId ? 'You' : 'Opponent',
      white: state.players.white === playerId ? 'You' : 'Opponent',
    };
  }, [state.players, playerId]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full shadow-md ${
            state.currentTurn === 'black'
              ? 'bg-gradient-to-br from-gray-700 to-black'
              : 'bg-gradient-to-br from-white to-gray-200 border border-gray-400'
          } ${
            !isGameOver ? 'ring-2 ring-yellow-400' : ''
          }`}
        />
        <span className="text-cream-100 font-medium text-lg">
          {turnLabel}
        </span>
      </div>

      {/* Captures and score info */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-gray-700 to-black shadow-sm" />
          <span className="text-cream-200">
            {playerNames.black}
          </span>
          <span className="text-wood-300">
            Captures: {state.captures.black}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-white to-gray-200 border border-gray-400 shadow-sm" />
          <span className="text-cream-200">
            {playerNames.white}
          </span>
          <span className="text-wood-300">
            Captures: {state.captures.white}
          </span>
        </div>
      </div>

      {/* Pass notification */}
      {lastMoveIsPass && !isGameOver && (
        <div className="text-yellow-400 text-sm font-medium animate-pulse">
          Opponent passed their turn
        </div>
      )}

      {/* Board */}
      <div className="w-[min(85vw,75vh)] aspect-square mx-auto">
        <div className="w-full h-full bg-[#dcb76a] rounded-lg shadow-2xl border-4 border-wood-700 p-[clamp(6px,1.8vw,14px)] relative">
          {/* Subtle wood grain overlay */}
          <div
            className="absolute inset-0 rounded-lg opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(120,80,30,0.3) 8px, rgba(120,80,30,0.3) 9px)',
            }}
          />

          <div
            className="w-full h-full relative"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
            }}
          >
            {Array.from({ length: BOARD_SIZE }).map((_, row) =>
              Array.from({ length: BOARD_SIZE }).map((_, col) => {
                const stone = state.board[row][col];
                const cellIsLastMove = isLastMove(row, col);
                const isStarPoint = starPointSet.has(`${row}-${col}`);
                const isHovered =
                  hoveredCell !== null &&
                  hoveredCell.row === row &&
                  hoveredCell.col === col;
                const showGhost =
                  canInteract && isHovered && stone === null;

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`relative flex items-center justify-center ${
                      canInteract && stone === null ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => handleIntersectionClick(row, col)}
                    onMouseEnter={() => setHoveredCell({ row, col })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {/* Grid lines */}
                    {/* Horizontal line to the right */}
                    {col < BOARD_SIZE - 1 && (
                      <div
                        className="absolute bg-black/50 z-0"
                        style={{
                          top: '50%',
                          left: '50%',
                          right: '-50%',
                          height: '1px',
                          transform: 'translateY(-0.5px)',
                        }}
                      />
                    )}
                    {/* Vertical line downward */}
                    {row < BOARD_SIZE - 1 && (
                      <div
                        className="absolute bg-black/50 z-0"
                        style={{
                          left: '50%',
                          top: '50%',
                          bottom: '-50%',
                          width: '1px',
                          transform: 'translateX(-0.5px)',
                        }}
                      />
                    )}

                    {/* Star point (hoshi) */}
                    {isStarPoint && !stone && (
                      <div
                        className="absolute z-[1] rounded-full bg-black/70"
                        style={{
                          width: '22%',
                          height: '22%',
                        }}
                      />
                    )}

                    {/* Ghost stone on hover */}
                    {showGhost && myColor && (
                      <div
                        className={`absolute z-[2] rounded-full ${
                          myColor === 'black'
                            ? 'bg-gray-900/30 border border-gray-900/20'
                            : 'bg-white/40 border border-white/30'
                        }`}
                        style={{
                          width: '78%',
                          height: '78%',
                        }}
                      />
                    )}

                    {/* Placed stone */}
                    {stone && (
                      <div
                        className={`absolute z-[3] rounded-full ${
                          stone === 'black'
                            ? 'bg-gradient-to-br from-gray-600 via-gray-800 to-black shadow-[0_2px_6px_rgba(0,0,0,0.6)]'
                            : 'bg-gradient-to-br from-white via-gray-50 to-gray-200 shadow-[0_2px_6px_rgba(0,0,0,0.3)]'
                        }`}
                        style={{
                          width: '84%',
                          height: '84%',
                        }}
                      >
                        {/* Inner shine for depth — radial highlight */}
                        <div
                          className={`absolute rounded-full ${
                            stone === 'black'
                              ? 'bg-gradient-to-br from-gray-500/30 to-transparent'
                              : 'bg-gradient-to-br from-white/80 to-transparent'
                          }`}
                          style={{
                            top: '8%',
                            left: '10%',
                            width: '40%',
                            height: '40%',
                          }}
                        />

                        {/* Last move marker — small colored dot in center */}
                        {cellIsLastMove && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className={`rounded-full ${
                                stone === 'black'
                                  ? 'bg-red-400/80'
                                  : 'bg-red-500/70'
                              }`}
                              style={{
                                width: '22%',
                                height: '22%',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Score display (shown when game is over) */}
      {isGameOver && state.score && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-700 to-black" />
            <span className="text-cream-200">Black: {state.score.black}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-white to-gray-200 border border-gray-400" />
            <span className="text-cream-200">White: {state.score.white} (incl. 6.5 komi)</span>
          </div>
        </div>
      )}

      {/* Win reason */}
      {isGameOver && state.winReason && (
        <div className="text-yellow-400 text-sm font-semibold text-center max-w-sm">
          {state.winReason}
        </div>
      )}

      {/* Pass button + player info + quit */}
      <div className="flex items-center gap-4 mt-1">
        {/* Pass button */}
        {!isGameOver && (
          <button
            onClick={handlePass}
            disabled={!canInteract}
            className={`px-5 py-2 text-sm font-semibold rounded-lg border transition-colors ${
              canInteract
                ? 'bg-wood-700 hover:bg-wood-600 text-cream-100 border-wood-500 cursor-pointer'
                : 'bg-wood-900/50 text-wood-500 border-wood-700 cursor-not-allowed'
            }`}
          >
            Pass
          </button>
        )}

        {myColor && (
          <div className="text-sm text-wood-300">
            You are playing as{' '}
            <span
              className={
                myColor === 'black'
                  ? 'text-gray-300 font-semibold'
                  : 'text-white font-semibold'
              }
            >
              {myColor}
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

      {/* Move count */}
      <div className="text-wood-300 text-xs">
        Move {state.moveCount}
      </div>
    </div>
  );
}
