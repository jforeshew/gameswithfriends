'use client';

import { useState, useCallback, useMemo } from 'react';
import { Position } from '@/lib/types';

type TicTacToeMark = 'X' | 'O';

interface TicTacToeBoardProps {
  gameState: any;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

const SIZE = 3;

export function TicTacToeBoard({ gameState, playerId, onMove, onQuit }: TicTacToeBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const myMark: TicTacToeMark | null = useMemo(() => {
    if (gameState.players.X === playerId) return 'X';
    if (gameState.players.O === playerId) return 'O';
    return null;
  }, [gameState.players, playerId]);

  const isMyTurn = myMark === gameState.currentTurn;
  const isGameOver = gameState.winner !== null || gameState.winReason !== null;
  const canInteract = isMyTurn && !isGameOver;

  const isWinningCell = useCallback(
    (row: number, col: number): boolean => {
      if (!gameState.winningCells) return false;
      return gameState.winningCells.some(
        (cell: Position) => cell.row === row && cell.col === col,
      );
    },
    [gameState.winningCells],
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!canInteract) return;
      if (gameState.board[row][col] !== null) return;
      onMove({ row: 0, col: 0 }, { row, col });
    },
    [canInteract, gameState.board, onMove],
  );

  const handleCellHover = useCallback(
    (row: number, col: number) => {
      if (!canInteract) {
        setHoveredCell(null);
        return;
      }
      if (gameState.board[row][col] !== null) {
        setHoveredCell(null);
        return;
      }
      setHoveredCell({ row, col });
    },
    [canInteract, gameState.board],
  );

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const turnLabel = useMemo(() => {
    if (isGameOver) {
      if (gameState.winner === null) return "It's a draw!";
      return 'Game Over';
    }
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  }, [isGameOver, isMyTurn, gameState.winner]);

  const renderMark = (mark: TicTacToeMark, ghost = false) => {
    if (mark === 'X') {
      return (
        <span
          className={`text-6xl font-bold select-none leading-none ${
            ghost ? 'text-red-400/25' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]'
          }`}
        >
          X
        </span>
      );
    }
    return (
      <span
        className={`text-6xl font-bold select-none leading-none ${
          ghost ? 'text-blue-400/25' : 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]'
        }`}
      >
        O
      </span>
    );
  };

  /**
   * Build the border classes for each cell to create the classic
   * tic-tac-toe hash/grid look (only inner borders visible).
   */
  const getCellBorders = (row: number, col: number): string => {
    const borders: string[] = [];
    if (row < SIZE - 1) borders.push('border-b-[3px]');
    if (col < SIZE - 1) borders.push('border-r-[3px]');
    return borders.join(' ');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <span
          className={`text-2xl font-bold select-none ${
            gameState.currentTurn === 'X' ? 'text-red-400' : 'text-blue-400'
          }`}
        >
          {gameState.currentTurn}
        </span>
        <span className="text-cream-100 font-medium text-lg">
          {turnLabel}
        </span>
      </div>

      {/* Board */}
      <div className="w-[min(70vw,60vh)] aspect-square mx-auto">
        <div className="w-full h-full grid grid-cols-3 grid-rows-3">
          {Array.from({ length: SIZE }).map((_, row) =>
            Array.from({ length: SIZE }).map((_, col) => {
              const cell = gameState.board[row][col] as TicTacToeMark | null;
              const winning = isWinningCell(row, col);
              const isHovered =
                hoveredCell !== null &&
                hoveredCell.row === row &&
                hoveredCell.col === col;
              const isEmpty = cell === null;
              const showGhost = canInteract && isHovered && isEmpty && myMark;

              return (
                <div
                  key={`${row}-${col}`}
                  className={`
                    flex items-center justify-center
                    border-wood-500 ${getCellBorders(row, col)}
                    ${canInteract && isEmpty ? 'cursor-pointer' : 'cursor-default'}
                    ${winning ? 'bg-yellow-400/15 animate-pulse' : 'bg-transparent'}
                    transition-colors duration-150
                    hover:${canInteract && isEmpty ? 'bg-wood-800/40' : ''}
                  `}
                  onClick={() => handleCellClick(row, col)}
                  onMouseEnter={() => handleCellHover(row, col)}
                  onMouseLeave={handleCellLeave}
                >
                  {cell && renderMark(cell)}
                  {showGhost && myMark && renderMark(myMark, true)}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* Player mark label + Quit button */}
      <div className="flex items-center gap-6 mt-1">
        {myMark && (
          <div className="text-sm text-wood-300">
            You are playing as{' '}
            <span
              className={`font-semibold ${
                myMark === 'X' ? 'text-red-400' : 'text-blue-400'
              }`}
            >
              {myMark}
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
