'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { CheckersState, Position, PieceColor } from '@/lib/types';
import { getValidMoves } from '@/lib/validMoves';
import { Piece } from './Piece';

interface BoardProps {
  gameState: CheckersState;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

export function Board({ gameState, playerId, onMove, onQuit }: BoardProps) {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);

  // Auto-select the piece that must continue a multi-jump
  useEffect(() => {
    if (gameState.mustContinueFrom) {
      setSelectedPos(gameState.mustContinueFrom);
    }
  }, [gameState.mustContinueFrom]);

  const myColor: PieceColor | null = useMemo(() => {
    if (gameState.players.red === playerId) return 'red';
    if (gameState.players.black === playerId) return 'black';
    return null;
  }, [gameState.players, playerId]);

  const isMyTurn = myColor === gameState.currentTurn;

  const validMoves = useMemo(() => {
    if (!selectedPos || !isMyTurn) return [];
    return getValidMoves(gameState, selectedPos);
  }, [selectedPos, isMyTurn, gameState]);

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || gameState.winner) return;

      const clickedPiece = gameState.board[row][col];

      // If we have a selected piece and clicked on a valid move destination
      if (selectedPos) {
        const isValidDest = validMoves.some(m => m.row === row && m.col === col);
        if (isValidDest) {
          onMove(selectedPos, { row, col });
          setSelectedPos(null);
          return;
        }
      }

      // Click on own piece to select/deselect it
      if (clickedPiece && clickedPiece.color === myColor) {
        // Re-clicking the selected piece deselects it (unless forced multi-jump)
        if (selectedPos && selectedPos.row === row && selectedPos.col === col && !gameState.mustContinueFrom) {
          setSelectedPos(null);
          return;
        }
        const moves = getValidMoves(gameState, { row, col });
        if (moves.length > 0) {
          setSelectedPos({ row, col });
        } else {
          setSelectedPos(null);
        }
      } else {
        setSelectedPos(null);
      }
    },
    [isMyTurn, selectedPos, validMoves, myColor, gameState, onMove],
  );

  // Determine if we should flip the board (black player sees board flipped)
  const shouldFlip = myColor === 'black';

  const renderBoard = () => {
    const rows = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const row = shouldFlip ? 7 - r : r;
        const col = shouldFlip ? 7 - c : c;
        const isDark = (row + col) % 2 === 1;
        const piece = gameState.board[row][col];
        const isSelected =
          selectedPos !== null && selectedPos.row === row && selectedPos.col === col;
        const isValidDest = validMoves.some(m => m.row === row && m.col === col);
        const isMustContinue =
          gameState.mustContinueFrom !== null &&
          gameState.mustContinueFrom.row === row &&
          gameState.mustContinueFrom.col === col;

        rows.push(
          <div
            key={`${row}-${col}`}
            className={`
              aspect-square flex items-center justify-center relative
              ${isDark ? 'bg-board-dark' : 'bg-board-light'}
              ${isDark && isMyTurn && !gameState.winner ? 'cursor-pointer' : ''}
              transition-colors duration-150
            `}
            onClick={() => isDark && handleSquareClick(row, col)}
          >
            {/* Valid move indicator */}
            {isValidDest && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-[30%] h-[30%] rounded-full bg-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.4)]" />
              </div>
            )}

            {/* Must-continue highlight */}
            {isMustContinue && (
              <div className="absolute inset-0 ring-4 ring-inset ring-yellow-400/70 z-0" />
            )}

            {/* Piece */}
            {piece && (
              <div className="w-full h-full flex items-center justify-center z-20 transition-all duration-300">
                <Piece piece={piece} isSelected={isSelected} />
              </div>
            )}
          </div>,
        );
      }
    }
    return rows;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full ${
            gameState.currentTurn === 'red' ? 'bg-red-500' : 'bg-gray-800 border border-gray-600'
          }`}
        />
        <span className="text-cream-100 font-medium text-lg">
          {gameState.winner
            ? 'Game Over'
            : isMyTurn
              ? "Your turn"
              : "Opponent's turn"}
        </span>
        {gameState.mustContinueFrom && isMyTurn && (
          <span className="text-yellow-400 text-sm">(must continue jumping)</span>
        )}
      </div>

      {/* Board */}
      <div className="w-[min(85vw,75vh)] aspect-square mx-auto">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-4 border-wood-700 rounded-lg overflow-hidden shadow-2xl">
          {renderBoard()}
        </div>
      </div>

      {/* Capture counts */}
      <div className="flex gap-8 text-sm text-cream-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Red captured: {gameState.captures.red}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-800 border border-gray-600" />
          <span>Black captured: {gameState.captures.black}</span>
        </div>
      </div>

      {/* Player color + quit */}
      <div className="flex items-center gap-6">
        {myColor && (
          <div className="text-sm text-wood-300">
            You are playing as{' '}
            <span className={myColor === 'red' ? 'text-red-400 font-semibold' : 'text-gray-300 font-semibold'}>
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
