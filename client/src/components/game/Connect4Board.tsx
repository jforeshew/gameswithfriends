'use client';

import { useState, useCallback, useMemo } from 'react';
import { Position } from '@/lib/types';

type Connect4Color = 'red' | 'yellow';

interface Connect4State {
  board: (Connect4Color | null)[][];
  currentTurn: Connect4Color;
  players: { red: string; yellow: string };
  winner: string | null;
  winReason: string | null;
  lastMove: Position | null;
  winningCells: Position[] | null;
}

interface Connect4BoardProps {
  gameState: Connect4State;
  playerId: string;
  onMove: (from: Position, to: Position) => void; // from is unused, to.col = column
  onQuit: () => void;
}

const ROWS = 6;
const COLS = 7;

export function Connect4Board({ gameState, playerId, onMove, onQuit }: Connect4BoardProps) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const myColor: Connect4Color | null = useMemo(() => {
    if (gameState.players.red === playerId) return 'red';
    if (gameState.players.yellow === playerId) return 'yellow';
    return null;
  }, [gameState.players, playerId]);

  const isMyTurn = myColor === gameState.currentTurn;
  const isGameOver = gameState.winner !== null || gameState.winReason !== null;
  const canInteract = isMyTurn && !isGameOver;

  /**
   * Determine which row a piece would land in for a given column.
   * Returns -1 if the column is full.
   */
  const getLandingRow = useCallback(
    (col: number): number => {
      for (let row = ROWS - 1; row >= 0; row--) {
        if (gameState.board[row][col] === null) {
          return row;
        }
      }
      return -1;
    },
    [gameState.board],
  );

  const handleColumnClick = useCallback(
    (col: number) => {
      if (!canInteract) return;
      if (getLandingRow(col) === -1) return;
      onMove({ row: 0, col: 0 }, { row: 0, col });
    },
    [canInteract, getLandingRow, onMove],
  );

  const handleColumnHover = useCallback(
    (col: number | null) => {
      if (!canInteract) {
        setHoveredCol(null);
        return;
      }
      setHoveredCol(col);
    },
    [canInteract],
  );

  /** Check if a cell is part of the winning line. */
  const isWinningCell = useCallback(
    (row: number, col: number): boolean => {
      if (!gameState.winningCells) return false;
      return gameState.winningCells.some(
        (cell: Position) => cell.row === row && cell.col === col,
      );
    },
    [gameState.winningCells],
  );

  /** Check if a cell is the last move played. */
  const isLastMove = useCallback(
    (row: number, col: number): boolean => {
      if (!gameState.lastMove) return false;
      return gameState.lastMove.row === row && gameState.lastMove.col === col;
    },
    [gameState.lastMove],
  );

  /** Determine if a column can still accept pieces. */
  const isColumnPlayable = useCallback(
    (col: number): boolean => {
      return gameState.board[0][col] === null;
    },
    [gameState.board],
  );

  const turnLabel = useMemo(() => {
    if (isGameOver) {
      if (gameState.winner === null) return "It's a draw!";
      return 'Game Over';
    }
    return isMyTurn ? "Your turn" : "Opponent's turn";
  }, [isGameOver, isMyTurn, gameState.winner]);

  const turnColor = useMemo((): Connect4Color => {
    return gameState.currentTurn;
  }, [gameState.currentTurn]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 ${
            turnColor === 'red'
              ? 'bg-red-500 border-red-400'
              : 'bg-yellow-400 border-yellow-300'
          }`}
        />
        <span className="text-cream-100 font-medium text-lg">
          {turnLabel}
        </span>
      </div>

      {/* Board container */}
      <div className="w-[min(85vw,75vh)]">
        {/* Ghost piece row (preview of where piece will drop) */}
        <div className="grid grid-cols-7 mb-1">
          {Array.from({ length: COLS }).map((_, col) => {
            const showGhost =
              canInteract &&
              hoveredCol === col &&
              isColumnPlayable(col);

            return (
              <div
                key={`ghost-${col}`}
                className="flex items-center justify-center aspect-square"
              >
                {showGhost && myColor && (
                  <div
                    className={`w-[70%] h-[70%] rounded-full transition-all duration-150 ${
                      myColor === 'red'
                        ? 'bg-red-500/40 border-2 border-red-400/40'
                        : 'bg-yellow-400/40 border-2 border-yellow-300/40'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Main board frame */}
        <div className="bg-indigo-800 rounded-xl p-[clamp(4px,1.2vw,10px)] shadow-2xl border-2 border-indigo-600">
          <div className="grid grid-cols-7 gap-[clamp(2px,0.6vw,6px)]">
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const cell = gameState.board[row][col] as Connect4Color | null;
                const winning = isWinningCell(row, col);
                const lastPlayed = isLastMove(row, col);
                const landingRow = hoveredCol === col ? getLandingRow(col) : -1;
                const isLandingPreview =
                  canInteract &&
                  hoveredCol === col &&
                  landingRow === row &&
                  cell === null;

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`
                      aspect-square rounded-full flex items-center justify-center
                      ${canInteract && isColumnPlayable(col) ? 'cursor-pointer' : 'cursor-default'}
                      transition-all duration-150
                    `}
                    onClick={() => handleColumnClick(col)}
                    onMouseEnter={() => handleColumnHover(col)}
                    onMouseLeave={() => handleColumnHover(null)}
                  >
                    <div
                      className={`
                        w-[92%] h-[92%] rounded-full relative transition-all duration-200
                        ${
                          cell === 'red'
                            ? `bg-red-500 border-[3px] border-red-400 shadow-inner ${
                                winning
                                  ? 'ring-[3px] ring-white animate-pulse'
                                  : lastPlayed
                                    ? 'ring-2 ring-white/60'
                                    : ''
                              }`
                            : cell === 'yellow'
                              ? `bg-yellow-400 border-[3px] border-yellow-300 shadow-inner ${
                                  winning
                                    ? 'ring-[3px] ring-white animate-pulse'
                                    : lastPlayed
                                      ? 'ring-2 ring-white/60'
                                      : ''
                                }`
                              : isLandingPreview && myColor
                                ? myColor === 'red'
                                  ? 'bg-red-500/20 border-2 border-red-400/30'
                                  : 'bg-yellow-400/20 border-2 border-yellow-300/30'
                                : 'bg-white/90 border-[3px] border-indigo-300/30 shadow-inner'
                        }
                      `}
                    >
                      {/* Inner shine/depth effect for placed pieces */}
                      {cell && (
                        <div
                          className={`
                            absolute top-[12%] left-[15%] w-[35%] h-[35%] rounded-full
                            ${cell === 'red' ? 'bg-red-300/30' : 'bg-yellow-200/40'}
                          `}
                        />
                      )}
                    </div>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      {/* Player color label + Quit button */}
      <div className="flex items-center gap-6 mt-1">
        {myColor && (
          <div className="text-sm text-wood-300">
            You are playing as{' '}
            <span
              className={
                myColor === 'red'
                  ? 'text-red-400 font-semibold'
                  : 'text-yellow-300 font-semibold'
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
