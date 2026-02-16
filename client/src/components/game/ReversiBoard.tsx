'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Position } from '@/lib/types';

interface ReversiState {
  board: ('black' | 'white' | null)[][];
  currentTurn: 'black' | 'white';
  players: { black: string; white: string };
  winner: string | null;
  winReason: string | null;
  scores: { black: number; white: number };
  lastMove: Position | null;
  flippedCells: Position[];
  validMoves: Position[];
  skippedLastTurn: boolean;
}

interface ReversiBoardProps {
  gameState: ReversiState;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

// Inject the flip animation keyframes into the document once
const FLIP_STYLE_ID = 'reversi-flip-keyframes';
function ensureFlipAnimation() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FLIP_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = FLIP_STYLE_ID;
  style.textContent = `
    @keyframes reversi-flip {
      0% { transform: scale(1); }
      25% { transform: scale(1.15); }
      50% { transform: scale(0.85); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

export function ReversiBoard({ gameState, playerId, onMove, onQuit }: ReversiBoardProps) {
  const [showSkipMessage, setShowSkipMessage] = useState(false);
  const [animatingCells, setAnimatingCells] = useState<Set<string>>(new Set());
  const prevBoardRef = useRef<('black' | 'white' | null)[][] | null>(null);

  // Inject keyframes on mount
  useEffect(() => {
    ensureFlipAnimation();
  }, []);

  const myColor = useMemo(() => {
    if (gameState.players.black === playerId) return 'black' as const;
    if (gameState.players.white === playerId) return 'white' as const;
    return null;
  }, [gameState.players, playerId]);

  const isMyTurn = myColor === gameState.currentTurn;

  // Set of valid move positions for quick lookup
  const validMoveSet = useMemo(() => {
    const set = new Set<string>();
    if (gameState.validMoves) {
      for (const pos of gameState.validMoves) {
        set.add(`${pos.row}-${pos.col}`);
      }
    }
    return set;
  }, [gameState.validMoves]);

  // Track flipped cells for animation
  useEffect(() => {
    if (gameState.flippedCells && gameState.flippedCells.length > 0) {
      const cellKeys = new Set(gameState.flippedCells.map(c => `${c.row}-${c.col}`));
      setAnimatingCells(cellKeys);

      const timer = setTimeout(() => {
        setAnimatingCells(new Set());
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [gameState.flippedCells, gameState.lastMove]);

  // Show skip message when a turn is skipped
  useEffect(() => {
    if (gameState.skippedLastTurn) {
      setShowSkipMessage(true);
      const timer = setTimeout(() => {
        setShowSkipMessage(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState.skippedLastTurn, gameState.lastMove]);

  // Track previous board state
  useEffect(() => {
    prevBoardRef.current = gameState.board;
  }, [gameState.board]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || gameState.winner) return;

      // Only allow clicks on valid moves
      if (validMoveSet.has(`${row}-${col}`)) {
        onMove({ row: 0, col: 0 }, { row, col });
      }
    },
    [isMyTurn, gameState.winner, validMoveSet, onMove],
  );

  const isLastMove = useCallback(
    (row: number, col: number): boolean => {
      return gameState.lastMove !== null &&
        gameState.lastMove.row === row &&
        gameState.lastMove.col === col;
    },
    [gameState.lastMove],
  );

  const isFlipping = useCallback(
    (row: number, col: number): boolean => {
      return animatingCells.has(`${row}-${col}`);
    },
    [animatingCells],
  );

  const isValidMove = useCallback(
    (row: number, col: number): boolean => {
      return validMoveSet.has(`${row}-${col}`);
    },
    [validMoveSet],
  );

  const renderCell = (row: number, col: number) => {
    const piece = gameState.board[row][col];
    const cellIsLastMove = isLastMove(row, col);
    const cellIsFlipping = isFlipping(row, col);
    const cellIsValidMove = isValidMove(row, col) && isMyTurn && !gameState.winner;

    return (
      <div
        key={`${row}-${col}`}
        className={`
          aspect-square flex items-center justify-center relative
          bg-emerald-700
          border border-emerald-900/50
          ${cellIsValidMove ? 'cursor-pointer hover:bg-emerald-600' : ''}
          transition-colors duration-150
        `}
        onClick={() => handleCellClick(row, col)}
      >
        {/* Piece */}
        {piece && (
          <div
            className={`
              w-[82%] h-[82%] rounded-full relative
              transition-all duration-300
              ${piece === 'black'
                ? 'bg-gradient-to-br from-gray-700 via-gray-900 to-black shadow-[0_3px_8px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.15)]'
                : 'bg-gradient-to-br from-white via-gray-100 to-gray-200 shadow-[0_3px_8px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.8)]'
              }
            `}
            style={cellIsFlipping ? { animation: 'reversi-flip 0.5s ease-in-out' } : undefined}
          >
            {/* Inner circle for depth */}
            <div
              className={`
                absolute inset-[18%] rounded-full
                ${piece === 'black'
                  ? 'bg-gradient-to-br from-gray-600 to-gray-900 border border-white/5'
                  : 'bg-gradient-to-br from-white to-gray-100 border border-gray-300/50'
                }
              `}
            />
            {/* Last move marker */}
            {cellIsLastMove && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={`
                    w-[18%] h-[18%] rounded-full
                    ${piece === 'black' ? 'bg-emerald-400/70' : 'bg-emerald-700/60'}
                  `}
                />
              </div>
            )}
          </div>
        )}

        {/* Valid move indicator */}
        {cellIsValidMove && !piece && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`
                w-[30%] h-[30%] rounded-full
                ${myColor === 'black'
                  ? 'bg-gray-900/30 border border-gray-900/20'
                  : 'bg-white/30 border border-white/20'
                }
              `}
            />
          </div>
        )}
      </div>
    );
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        cells.push(renderCell(row, col));
      }
    }
    return cells;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator with scores */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`
              w-5 h-5 rounded-full
              bg-gradient-to-br from-gray-700 to-black
              shadow-md
              ${gameState.currentTurn === 'black' ? 'ring-2 ring-yellow-400' : ''}
            `}
          />
          <span className="text-cream-100 font-semibold text-lg">{gameState.scores.black}</span>
        </div>

        <span className="text-cream-100 font-medium text-lg">
          {gameState.winner
            ? 'Game Over'
            : isMyTurn
              ? 'Your turn'
              : "Opponent's turn"}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-cream-100 font-semibold text-lg">{gameState.scores.white}</span>
          <div
            className={`
              w-5 h-5 rounded-full
              bg-gradient-to-br from-white to-gray-200
              shadow-md
              ${gameState.currentTurn === 'white' ? 'ring-2 ring-yellow-400' : ''}
            `}
          />
        </div>
      </div>

      {/* Skip turn message */}
      {showSkipMessage && (
        <div className="text-yellow-400 text-sm font-medium animate-pulse">
          Turn skipped — no valid moves
        </div>
      )}

      {/* Board */}
      <div className="w-[min(85vw,75vh)] aspect-square mx-auto">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-4 border-wood-700 rounded-lg overflow-hidden shadow-2xl">
          {renderBoard()}
        </div>
      </div>

      {/* Score display */}
      <div className="flex gap-8 text-sm text-cream-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-700 to-black" />
          <span>Black: {gameState.scores.black} pieces</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-white to-gray-200 border border-gray-400" />
          <span>White: {gameState.scores.white} pieces</span>
        </div>
      </div>

      {/* Player color + quit */}
      <div className="flex items-center gap-6">
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
