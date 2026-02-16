'use client';

import { useState, useCallback, useMemo } from 'react';
import { Position } from '@/lib/types';
import { getValidMoves, ChessState, ChessPiece, ChessColor } from '@/lib/chessValidMoves';

interface ChessBoardProps {
  gameState: any;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

const PIECE_SYMBOLS: Record<string, Record<string, string>> = {
  white: {
    king: '\u2654',
    queen: '\u2655',
    rook: '\u2656',
    bishop: '\u2657',
    knight: '\u2658',
    pawn: '\u2659',
  },
  black: {
    king: '\u265A',
    queen: '\u265B',
    rook: '\u265C',
    bishop: '\u265D',
    knight: '\u265E',
    pawn: '\u265F',
  },
};

function getPieceSymbol(piece: ChessPiece): string {
  return PIECE_SYMBOLS[piece.color]?.[piece.type] ?? '?';
}

// Piece value for sorting captured pieces display
const PIECE_VALUES: Record<string, number> = {
  queen: 9,
  rook: 5,
  bishop: 3,
  knight: 3,
  pawn: 1,
};

export function ChessBoard({ gameState, playerId, onMove, onQuit }: ChessBoardProps) {
  const state = gameState as ChessState;
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);

  const myColor: ChessColor | null = useMemo(() => {
    if (state.players.white === playerId) return 'white';
    if (state.players.black === playerId) return 'black';
    return null;
  }, [state.players, playerId]);

  const isMyTurn = myColor === state.currentTurn;

  const validMoves = useMemo(() => {
    if (!selectedPos || !isMyTurn) return [];
    return getValidMoves(state, selectedPos);
  }, [selectedPos, isMyTurn, state]);

  // Find the king position for check highlighting
  const checkedKingPos = useMemo(() => {
    if (!state.inCheck) return null;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = state.board[row][col];
        if (piece && piece.type === 'king' && piece.color === state.currentTurn) {
          return { row, col };
        }
      }
    }
    return null;
  }, [state.board, state.currentTurn, state.inCheck]);

  const handleSquareClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || state.winner) return;

      const clickedPiece = state.board[row][col];

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
        if (selectedPos && selectedPos.row === row && selectedPos.col === col) {
          setSelectedPos(null);
          return;
        }
        const moves = getValidMoves(state, { row, col });
        if (moves.length > 0) {
          setSelectedPos({ row, col });
        } else {
          setSelectedPos(null);
        }
      } else {
        setSelectedPos(null);
      }
    },
    [isMyTurn, selectedPos, validMoves, myColor, state, onMove],
  );

  // Flip board for black player
  const shouldFlip = myColor === 'black';

  const renderBoard = () => {
    const squares = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const row = shouldFlip ? 7 - r : r;
        const col = shouldFlip ? 7 - c : c;
        const isLight = (row + col) % 2 === 0;
        const piece = state.board[row][col];
        const isSelected =
          selectedPos !== null && selectedPos.row === row && selectedPos.col === col;
        const isValidDest = validMoves.some(m => m.row === row && m.col === col);
        const isLastMoveFrom =
          state.lastMove !== null &&
          state.lastMove.from.row === row &&
          state.lastMove.from.col === col;
        const isLastMoveTo =
          state.lastMove !== null &&
          state.lastMove.to.row === row &&
          state.lastMove.to.col === col;
        const isCheckedKing =
          checkedKingPos !== null &&
          checkedKingPos.row === row &&
          checkedKingPos.col === col;

        squares.push(
          <div
            key={`${row}-${col}`}
            className={`
              aspect-square flex items-center justify-center relative
              ${isLight ? 'bg-board-light' : 'bg-board-dark'}
              ${isMyTurn && !state.winner ? 'cursor-pointer' : ''}
              ${(isLastMoveFrom || isLastMoveTo) && !isSelected ? 'bg-yellow-600/20' : ''}
              transition-colors duration-150
            `}
            onClick={() => handleSquareClick(row, col)}
          >
            {/* Valid move indicator */}
            {isValidDest && !piece && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-[30%] h-[30%] rounded-full bg-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.4)]" />
              </div>
            )}

            {/* Valid capture indicator (ring on squares with enemy pieces) */}
            {isValidDest && piece && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-[85%] h-[85%] rounded-full border-[3px] border-yellow-400/60" />
              </div>
            )}

            {/* Check indicator on the king */}
            {isCheckedKing && (
              <div className="absolute inset-0 bg-red-500/30 ring-2 ring-inset ring-red-500/70 z-0" />
            )}

            {/* Piece */}
            {piece && (
              <div
                className={`
                  w-full h-full flex items-center justify-center z-20 transition-all duration-150
                  ${isSelected ? 'ring-4 ring-inset ring-yellow-400 ring-opacity-80 scale-105' : ''}
                `}
              >
                <span
                  className={`
                    text-3xl sm:text-4xl select-none drop-shadow-lg
                    ${piece.color === 'white' ? 'text-cream-100' : 'text-gray-900'}
                  `}
                  style={{ filter: piece.color === 'white' ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                >
                  {getPieceSymbol(piece)}
                </span>
              </div>
            )}
          </div>,
        );
      }
    }
    return squares;
  };

  // Sort captured pieces by value (highest first)
  const sortCaptured = (pieces: ChessPiece[]): ChessPiece[] => {
    return [...pieces].sort((a, b) => (PIECE_VALUES[b.type] || 0) - (PIECE_VALUES[a.type] || 0));
  };

  const whiteCaptured = sortCaptured(state.captures.white || []);
  const blackCaptured = sortCaptured(state.captures.black || []);

  // Calculate material advantage
  const whiteMaterial = whiteCaptured.reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);
  const blackMaterial = blackCaptured.reduce((sum, p) => sum + (PIECE_VALUES[p.type] || 0), 0);
  const materialDiff = whiteMaterial - blackMaterial;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-sm border ${
            state.currentTurn === 'white'
              ? 'bg-cream-100 border-cream-200'
              : 'bg-gray-900 border-gray-600'
          }`}
        />
        <span className="text-cream-100 font-medium text-lg">
          {state.winner
            ? 'Game Over'
            : isMyTurn
              ? "Your turn"
              : "Opponent's turn"}
        </span>
        {state.inCheck && !state.winner && (
          <span className="text-red-400 font-semibold text-sm animate-pulse">Check!</span>
        )}
      </div>

      {/* Opponent's captured pieces (pieces opponent has taken from you) */}
      <div className="flex items-center gap-1 min-h-[28px] px-2">
        {myColor && sortCaptured(state.captures[oppositeColorFn(myColor)] || []).map((piece, i) => (
          <span
            key={i}
            className="text-lg opacity-80"
            style={{ filter: piece.color === 'white' ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' : undefined }}
          >
            {getPieceSymbol(piece)}
          </span>
        ))}
        {myColor && (
          oppositeColorFn(myColor) === 'white'
            ? (materialDiff > 0 && <span className="text-xs text-wood-400 ml-1">+{materialDiff}</span>)
            : (materialDiff < 0 && <span className="text-xs text-wood-400 ml-1">+{Math.abs(materialDiff)}</span>)
        )}
      </div>

      {/* Board */}
      <div className="w-[min(85vw,75vh)] aspect-square mx-auto">
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-4 border-wood-700 rounded-lg overflow-hidden shadow-2xl">
          {renderBoard()}
        </div>
      </div>

      {/* My captured pieces (pieces I have taken) */}
      <div className="flex items-center gap-1 min-h-[28px] px-2">
        {myColor && sortCaptured(state.captures[myColor] || []).map((piece, i) => (
          <span
            key={i}
            className="text-lg opacity-80"
            style={{ filter: piece.color === 'white' ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' : undefined }}
          >
            {getPieceSymbol(piece)}
          </span>
        ))}
        {myColor && (
          myColor === 'white'
            ? (materialDiff > 0 && <span className="text-xs text-wood-400 ml-1">+{materialDiff}</span>)
            : (materialDiff < 0 && <span className="text-xs text-wood-400 ml-1">+{Math.abs(materialDiff)}</span>)
        )}
      </div>

      {/* Player color + quit */}
      <div className="flex items-center gap-6">
        {myColor && (
          <div className="text-sm text-wood-300">
            You are playing as{' '}
            <span className={myColor === 'white' ? 'text-cream-100 font-semibold' : 'text-gray-300 font-semibold'}>
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

function oppositeColorFn(color: ChessColor): ChessColor {
  return color === 'white' ? 'black' : 'white';
}
