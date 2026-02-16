'use client';

import { CheckersPiece } from '@/lib/types';

interface PieceProps {
  piece: CheckersPiece;
  isSelected: boolean;
}

export function Piece({ piece, isSelected }: PieceProps) {
  const baseColor = piece.color === 'red' ? 'bg-red-600' : 'bg-gray-900';
  const borderColor = piece.color === 'red' ? 'border-red-400' : 'border-gray-600';
  const innerColor = piece.color === 'red' ? 'bg-red-500' : 'bg-gray-800';

  return (
    <div
      className={`
        w-[80%] h-[80%] rounded-full relative
        ${baseColor} border-2 ${borderColor}
        shadow-lg
        ${isSelected ? 'ring-4 ring-yellow-400 ring-opacity-80 scale-105' : ''}
        transition-all duration-150
      `}
    >
      {/* Inner circle for depth */}
      <div
        className={`
          absolute inset-[15%] rounded-full ${innerColor}
          border border-white/10
        `}
      />
      {/* King marker */}
      {piece.isKing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            className="w-[55%] h-[55%] text-yellow-400 drop-shadow-md"
            fill="currentColor"
          >
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
          </svg>
        </div>
      )}
    </div>
  );
}
