'use client';

import { useState, useCallback, useMemo } from 'react';
import { Position } from '@/lib/types';

type DotsBoxesColor = 'red' | 'blue';

interface DotsBoxesBoardProps {
  gameState: any;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

/**
 * Normalize a line key so the "smaller" position comes first.
 * Must match the server's normalization logic exactly.
 */
function normalizeLineKey(from: Position, to: Position): string {
  if (from.row < to.row || (from.row === to.row && from.col < to.col)) {
    return `${from.row},${from.col}-${to.row},${to.col}`;
  }
  return `${to.row},${to.col}-${from.row},${from.col}`;
}

export function DotsBoxesBoard({ gameState, playerId, onMove, onQuit }: DotsBoxesBoardProps) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);

  const gridSize: number = gameState.gridSize ?? 5;
  const boxSize = gridSize - 1;
  // The CSS grid has (2 * gridSize - 1) = 9 rows and 9 columns
  const cssGridSize = 2 * gridSize - 1;

  const myColor: DotsBoxesColor | null = useMemo(() => {
    if (gameState.players.red === playerId) return 'red';
    if (gameState.players.blue === playerId) return 'blue';
    return null;
  }, [gameState.players, playerId]);

  const isMyTurn = myColor === gameState.currentTurn;
  const isGameOver = gameState.winner !== null || gameState.winReason !== null;
  const canInteract = isMyTurn && !isGameOver;

  // Set of drawn lines for quick lookup
  const lineSet = useMemo(() => {
    return new Set<string>(gameState.lines ?? []);
  }, [gameState.lines]);

  const lineOwners: Record<string, DotsBoxesColor> = gameState.lineOwners ?? {};

  const handleLineClick = useCallback(
    (from: Position, to: Position) => {
      if (!canInteract) return;
      const key = normalizeLineKey(from, to);
      if (lineSet.has(key)) return;
      onMove(from, to);
    },
    [canInteract, lineSet, onMove],
  );

  const handleLineHover = useCallback(
    (from: Position, to: Position, entering: boolean) => {
      if (!canInteract) {
        setHoveredLine(null);
        return;
      }
      const key = normalizeLineKey(from, to);
      if (lineSet.has(key)) {
        setHoveredLine(null);
        return;
      }
      setHoveredLine(entering ? key : null);
    },
    [canInteract, lineSet],
  );

  /**
   * Get the color class for a drawn line.
   */
  const getLineColorClass = useCallback(
    (key: string): string => {
      const owner = lineOwners[key];
      if (owner === 'red') return 'bg-red-400';
      if (owner === 'blue') return 'bg-blue-400';
      return 'bg-cream-100';
    },
    [lineOwners],
  );

  /**
   * Get the box color for a claimed box.
   */
  const getBoxClasses = useCallback(
    (boxRow: number, boxCol: number): { bg: string; text: string; label: string } => {
      const owner: DotsBoxesColor | null = gameState.boxes?.[boxRow]?.[boxCol] ?? null;
      if (owner === 'red') return { bg: 'bg-red-400/20', text: 'text-red-400', label: 'R' };
      if (owner === 'blue') return { bg: 'bg-blue-400/20', text: 'text-blue-400', label: 'B' };
      return { bg: '', text: '', label: '' };
    },
    [gameState.boxes],
  );

  const turnLabel = useMemo(() => {
    if (isGameOver) {
      if (gameState.winner === null && gameState.winReason) return "It's a draw!";
      return 'Game Over';
    }
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  }, [isGameOver, isMyTurn, gameState.winner, gameState.winReason]);

  /**
   * Render the 9x9 CSS grid cells.
   * Even row + even col = dot
   * Even row + odd col = horizontal line slot
   * Odd row + even col = vertical line slot
   * Odd row + odd col = box area
   */
  const renderGridCells = () => {
    const cells: React.ReactNode[] = [];

    for (let gridRow = 0; gridRow < cssGridSize; gridRow++) {
      for (let gridCol = 0; gridCol < cssGridSize; gridCol++) {
        const isEvenRow = gridRow % 2 === 0;
        const isEvenCol = gridCol % 2 === 0;

        if (isEvenRow && isEvenCol) {
          // DOT
          const dotRow = gridRow / 2;
          const dotCol = gridCol / 2;
          cells.push(
            <div
              key={`dot-${dotRow}-${dotCol}`}
              className="flex items-center justify-center z-10"
            >
              <div className="w-3 h-3 rounded-full bg-cream-100" />
            </div>,
          );
        } else if (isEvenRow && !isEvenCol) {
          // HORIZONTAL LINE SLOT (between dots in the same row)
          const dotRow = gridRow / 2;
          const dotColLeft = (gridCol - 1) / 2;
          const dotColRight = dotColLeft + 1;
          const from: Position = { row: dotRow, col: dotColLeft };
          const to: Position = { row: dotRow, col: dotColRight };
          const key = normalizeLineKey(from, to);
          const isDrawn = lineSet.has(key);
          const isHovered = hoveredLine === key;
          const isLast = gameState.lastLine === key;

          cells.push(
            <div
              key={`hline-${dotRow}-${dotColLeft}`}
              className="flex items-center justify-center cursor-pointer"
              onClick={() => handleLineClick(from, to)}
              onMouseEnter={() => handleLineHover(from, to, true)}
              onMouseLeave={() => handleLineHover(from, to, false)}
            >
              <div
                className={`
                  w-full rounded-full transition-all duration-150
                  ${isDrawn
                    ? `h-[5px] ${getLineColorClass(key)} ${isLast ? 'shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`
                    : isHovered && canInteract
                      ? `h-[5px] ${myColor === 'red' ? 'bg-red-400/50' : 'bg-blue-400/50'}`
                      : 'h-[3px] bg-wood-600/40 hover:bg-wood-500/60'
                  }
                `}
              />
            </div>,
          );
        } else if (!isEvenRow && isEvenCol) {
          // VERTICAL LINE SLOT (between dots in the same column)
          const dotRowTop = (gridRow - 1) / 2;
          const dotRowBottom = dotRowTop + 1;
          const dotCol = gridCol / 2;
          const from: Position = { row: dotRowTop, col: dotCol };
          const to: Position = { row: dotRowBottom, col: dotCol };
          const key = normalizeLineKey(from, to);
          const isDrawn = lineSet.has(key);
          const isHovered = hoveredLine === key;
          const isLast = gameState.lastLine === key;

          cells.push(
            <div
              key={`vline-${dotRowTop}-${dotCol}`}
              className="flex items-center justify-center cursor-pointer"
              onClick={() => handleLineClick(from, to)}
              onMouseEnter={() => handleLineHover(from, to, true)}
              onMouseLeave={() => handleLineHover(from, to, false)}
            >
              <div
                className={`
                  h-full rounded-full transition-all duration-150
                  ${isDrawn
                    ? `w-[5px] ${getLineColorClass(key)} ${isLast ? 'shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`
                    : isHovered && canInteract
                      ? `w-[5px] ${myColor === 'red' ? 'bg-red-400/50' : 'bg-blue-400/50'}`
                      : 'w-[3px] bg-wood-600/40 hover:bg-wood-500/60'
                  }
                `}
              />
            </div>,
          );
        } else {
          // BOX AREA (odd row, odd col)
          const boxRow = (gridRow - 1) / 2;
          const boxCol = (gridCol - 1) / 2;
          const { bg, text, label } = getBoxClasses(boxRow, boxCol);

          cells.push(
            <div
              key={`box-${boxRow}-${boxCol}`}
              className={`
                flex items-center justify-center rounded-sm transition-colors duration-300
                ${bg}
              `}
            >
              {label && (
                <span className={`text-sm font-bold ${text} select-none`}>
                  {label}
                </span>
              )}
            </div>,
          );
        }
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
              w-5 h-5 rounded-full bg-red-400
              ${gameState.currentTurn === 'red' ? 'ring-2 ring-yellow-400' : ''}
            `}
          />
          <span className="text-cream-100 font-semibold text-lg">{gameState.scores?.red ?? 0}</span>
        </div>

        <span className="text-cream-100 font-medium text-lg">
          {turnLabel}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-cream-100 font-semibold text-lg">{gameState.scores?.blue ?? 0}</span>
          <div
            className={`
              w-5 h-5 rounded-full bg-blue-400
              ${gameState.currentTurn === 'blue' ? 'ring-2 ring-yellow-400' : ''}
            `}
          />
        </div>
      </div>

      {/* Board */}
      <div className="w-[min(80vw,65vh)] aspect-square mx-auto">
        <div
          className="w-full h-full"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cssGridSize}, 1fr)`,
            gridTemplateRows: `repeat(${cssGridSize}, 1fr)`,
          }}
        >
          {renderGridCells()}
        </div>
      </div>

      {/* Score display */}
      <div className="flex gap-8 text-sm text-cream-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span>Red: {gameState.scores?.red ?? 0} boxes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span>Blue: {gameState.scores?.blue ?? 0} boxes</span>
        </div>
      </div>

      {/* Player color + quit */}
      <div className="flex items-center gap-6">
        {myColor && (
          <div className="text-sm text-wood-300">
            You are playing as{' '}
            <span
              className={
                myColor === 'red'
                  ? 'text-red-400 font-semibold'
                  : 'text-blue-400 font-semibold'
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
