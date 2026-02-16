'use client';

import { useState, useCallback, useMemo } from 'react';
import { Position } from '@/lib/types';

type GomokuColor = 'black' | 'white';

interface GomokuState {
  board: (GomokuColor | null)[][];
  currentTurn: GomokuColor;
  players: { black: string; white: string };
  winner: string | null;
  winReason: string | null;
  lastMove: Position | null;
  winningCells: Position[] | null;
  moveCount: number;
}

interface GomokuBoardProps {
  gameState: any;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

const BOARD_SIZE = 15;

// Standard hoshi (star point) positions for a 15x15 board
const STAR_POINTS: Position[] = [
  { row: 3, col: 3 },
  { row: 3, col: 7 },
  { row: 3, col: 11 },
  { row: 7, col: 3 },
  { row: 7, col: 7 },
  { row: 7, col: 11 },
  { row: 11, col: 3 },
  { row: 11, col: 7 },
  { row: 11, col: 11 },
];

const starPointSet = new Set(STAR_POINTS.map(p => `${p.row}-${p.col}`));

export function GomokuBoard({ gameState, playerId, onMove, onQuit }: GomokuBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);

  const state = gameState as GomokuState;

  const myColor = useMemo((): GomokuColor | null => {
    if (state.players.black === playerId) return 'black';
    if (state.players.white === playerId) return 'white';
    return null;
  }, [state.players, playerId]);

  const isMyTurn = myColor === state.currentTurn;
  const isGameOver = state.winner !== null || state.winReason !== null;
  const canInteract = isMyTurn && !isGameOver;

  const winningCellSet = useMemo(() => {
    const set = new Set<string>();
    if (state.winningCells) {
      for (const pos of state.winningCells) {
        set.add(`${pos.row}-${pos.col}`);
      }
    }
    return set;
  }, [state.winningCells]);

  const handleIntersectionClick = useCallback(
    (row: number, col: number) => {
      if (!canInteract) return;
      if (state.board[row][col] !== null) return;
      onMove({ row: 0, col: 0 }, { row, col });
    },
    [canInteract, state.board, onMove],
  );

  const isLastMove = useCallback(
    (row: number, col: number): boolean => {
      return state.lastMove !== null &&
        state.lastMove.row === row &&
        state.lastMove.col === col;
    },
    [state.lastMove],
  );

  const isWinningCell = useCallback(
    (row: number, col: number): boolean => {
      return winningCellSet.has(`${row}-${col}`);
    },
    [winningCellSet],
  );

  const turnLabel = useMemo(() => {
    if (isGameOver) {
      if (state.winner === null && state.winReason) return "It's a draw!";
      return 'Game Over';
    }
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  }, [isGameOver, isMyTurn, state.winner, state.winReason]);

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

      {/* Move count */}
      <div className="text-wood-300 text-sm">
        Move {state.moveCount}
      </div>

      {/* Board */}
      <div className="w-[min(85vw,75vh)] aspect-square mx-auto">
        <div className="w-full h-full bg-yellow-700/80 rounded-lg shadow-2xl border-4 border-wood-700 p-[clamp(6px,1.8vw,14px)] relative">
          {/*
            The board is a grid of intersections. We render a 15x15 grid of clickable
            intersection points. Grid lines are drawn as borders between cells.
            The visual grid lines span from the center of the first intersection
            to the center of the last intersection.
          */}
          <div
            className="w-full h-full relative"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)` }}
          >
            {Array.from({ length: BOARD_SIZE }).map((_, row) =>
              Array.from({ length: BOARD_SIZE }).map((_, col) => {
                const stone = state.board[row][col];
                const cellIsLastMove = isLastMove(row, col);
                const cellIsWinning = isWinningCell(row, col);
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
                    {/* Grid lines - drawn as pseudo-lines from center of cell */}
                    {/* Horizontal line */}
                    {col < BOARD_SIZE - 1 && (
                      <div
                        className="absolute bg-black/60 z-0"
                        style={{
                          top: '50%',
                          left: '50%',
                          right: '-50%',
                          height: '1px',
                          transform: 'translateY(-0.5px)',
                        }}
                      />
                    )}
                    {/* Vertical line */}
                    {row < BOARD_SIZE - 1 && (
                      <div
                        className="absolute bg-black/60 z-0"
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
                          width: '20%',
                          height: '20%',
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
                            ? 'bg-gradient-to-br from-gray-700 to-black shadow-[0_2px_6px_rgba(0,0,0,0.6)]'
                            : 'bg-gradient-to-br from-white to-gray-200 shadow-[0_2px_6px_rgba(0,0,0,0.3)]'
                        } ${
                          cellIsWinning ? 'ring-2 ring-yellow-400 animate-pulse' : ''
                        }`}
                        style={{
                          width: '82%',
                          height: '82%',
                        }}
                      >
                        {/* Inner shine for depth */}
                        <div
                          className={`absolute rounded-full ${
                            stone === 'black'
                              ? 'bg-gradient-to-br from-gray-500/30 to-transparent'
                              : 'bg-gradient-to-br from-white/80 to-transparent'
                          }`}
                          style={{
                            top: '10%',
                            left: '12%',
                            width: '35%',
                            height: '35%',
                          }}
                        />

                        {/* Last move marker - small colored dot */}
                        {cellIsLastMove && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div
                              className={`rounded-full ${
                                stone === 'black'
                                  ? 'bg-red-400/80'
                                  : 'bg-red-500/70'
                              }`}
                              style={{
                                width: '20%',
                                height: '20%',
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

      {/* Win reason */}
      {isGameOver && state.winReason && (
        <div className="text-yellow-400 text-sm font-semibold">
          {state.winReason}
        </div>
      )}

      {/* Player color label + Quit button */}
      <div className="flex items-center gap-6 mt-1">
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
    </div>
  );
}
