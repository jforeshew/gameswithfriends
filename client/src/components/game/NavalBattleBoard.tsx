'use client';

import { useState, useCallback, useMemo, useEffect, Fragment } from 'react';
import { Position } from '@/lib/types';

// ---- Types matching server getState output ----

type CellState = 'empty' | 'ship' | 'hit' | 'miss';
type OpponentCellState = 'unknown' | 'hit' | 'miss';

interface Ship {
  name: string;
  size: number;
  positions: Position[];
  hits: number;
  sunk: boolean;
}

interface NavalBattleViewState {
  myBoard: {
    grid: CellState[][];
    ships: Ship[];
  };
  opponentBoard: {
    grid: OpponentCellState[][];
  };
  currentTurn: string;
  myId: string;
  winner: string | null;
  winReason: string | null;
  lastShot: {
    playerId: string;
    pos: Position;
    result: 'hit' | 'miss' | 'sunk';
  } | null;
  opponentShipsSunk: Ship[];
}

interface NavalBattleBoardProps {
  gameState: NavalBattleViewState;
  playerId: string;
  onMove: (from: Position, to: Position) => void;
  onQuit: () => void;
}

// ---- Constants ----

const BOARD_SIZE = 10;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const ALL_SHIPS = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];

// Inject keyframes for animations
const NAVAL_STYLE_ID = 'naval-battle-keyframes';
function ensureNavalAnimations() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(NAVAL_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = NAVAL_STYLE_ID;
  style.textContent = `
    @keyframes naval-splash {
      0% { transform: scale(0); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes naval-fade-in-out {
      0% { opacity: 0; transform: translateY(8px) scale(0.9); }
      15% { opacity: 1; transform: translateY(0) scale(1.05); }
      25% { transform: translateY(0) scale(1); }
      80% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(style);
}

export function NavalBattleBoard({ gameState, playerId, onMove, onQuit }: NavalBattleBoardProps) {
  const state = gameState as NavalBattleViewState;

  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const [shotFeedback, setShotFeedback] = useState<{ text: string; type: 'hit' | 'miss' | 'sunk' } | null>(null);

  // Inject animation keyframes
  useEffect(() => {
    ensureNavalAnimations();
  }, []);

  const isMyTurn = state.currentTurn === playerId;
  const isGameOver = state.winner !== null;

  // Show shot feedback when lastShot changes
  useEffect(() => {
    if (state.lastShot) {
      const { result } = state.lastShot;
      let text: string;
      if (result === 'sunk') {
        text = 'SUNK!';
      } else if (result === 'hit') {
        text = 'HIT!';
      } else {
        text = 'MISS!';
      }
      setShotFeedback({ text, type: result === 'sunk' ? 'hit' : result });

      const timer = setTimeout(() => {
        setShotFeedback(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [state.lastShot]);

  // Build a set of sunk ship positions on opponent board for highlighting
  const opponentSunkPositionSet = useMemo(() => {
    const set = new Set<string>();
    if (state.opponentShipsSunk) {
      for (const ship of state.opponentShipsSunk) {
        for (const pos of ship.positions) {
          set.add(`${pos.row}-${pos.col}`);
        }
      }
    }
    return set;
  }, [state.opponentShipsSunk]);

  // Build a set of positions for my ships that are sunk, for styling
  const mySunkPositionSet = useMemo(() => {
    const set = new Set<string>();
    if (state.myBoard.ships) {
      for (const ship of state.myBoard.ships) {
        if (ship.sunk) {
          for (const pos of ship.positions) {
            set.add(`${pos.row}-${pos.col}`);
          }
        }
      }
    }
    return set;
  }, [state.myBoard.ships]);

  // Build a set of my ship positions for quick lookup
  const myShipPositionSet = useMemo(() => {
    const set = new Set<string>();
    if (state.myBoard.ships) {
      for (const ship of state.myBoard.ships) {
        for (const pos of ship.positions) {
          set.add(`${pos.row}-${pos.col}`);
        }
      }
    }
    return set;
  }, [state.myBoard.ships]);

  const handleEnemyCellClick = useCallback(
    (row: number, col: number) => {
      if (!isMyTurn || isGameOver) return;

      const cell = state.opponentBoard.grid[row][col];
      if (cell === 'hit' || cell === 'miss') return;

      onMove({ row: 0, col: 0 }, { row, col });
    },
    [isMyTurn, isGameOver, state.opponentBoard.grid, onMove],
  );

  // Count sunk ships for each side
  const myShipsSunkCount = state.myBoard.ships.filter(s => s.sunk).length;
  const opponentShipsSunkCount = state.opponentShipsSunk ? state.opponentShipsSunk.length : 0;

  // ---- Render helpers ----

  const renderMyCell = (row: number, col: number) => {
    const cell = state.myBoard.grid[row][col];
    const isShipPos = myShipPositionSet.has(`${row}-${col}`);
    const isSunkPos = mySunkPositionSet.has(`${row}-${col}`);

    let bgClass = 'bg-blue-900/40'; // water
    let content = null;

    if (cell === 'hit') {
      bgClass = isSunkPos ? 'bg-red-800' : 'bg-red-500';
      content = (
        <span className="text-white font-bold text-[clamp(8px,1.5vw,14px)] leading-none select-none">X</span>
      );
    } else if (cell === 'miss') {
      bgClass = 'bg-blue-300/30';
      content = (
        <span className="text-blue-200/60 text-[clamp(10px,2vw,18px)] leading-none select-none">.</span>
      );
    } else if (cell === 'ship' || isShipPos) {
      bgClass = isSunkPos ? 'bg-gray-600' : 'bg-gray-500';
    }

    return (
      <div
        key={`my-${row}-${col}`}
        className={`aspect-square flex items-center justify-center border border-blue-800/30 ${bgClass} transition-colors duration-100`}
      >
        {content}
      </div>
    );
  };

  const renderEnemyCell = (row: number, col: number) => {
    const cell = state.opponentBoard.grid[row][col];
    const isSunkPos = opponentSunkPositionSet.has(`${row}-${col}`);
    const isHovered =
      hoveredCell !== null &&
      hoveredCell.row === row &&
      hoveredCell.col === col;
    const canTarget = isMyTurn && !isGameOver && cell === 'unknown';
    const isLastShotHere =
      state.lastShot !== null &&
      state.lastShot.pos.row === row &&
      state.lastShot.pos.col === col;

    let bgClass = 'bg-blue-900/40'; // unknown water
    let content = null;

    if (cell === 'hit') {
      bgClass = isSunkPos ? 'bg-orange-700' : 'bg-red-500';
      content = (
        <span
          className="text-white font-bold text-[clamp(8px,1.5vw,14px)] leading-none select-none"
          style={isLastShotHere ? { animation: 'naval-splash 0.4s ease-out' } : undefined}
        >
          X
        </span>
      );
    } else if (cell === 'miss') {
      bgClass = 'bg-blue-300/30';
      content = (
        <span
          className="text-blue-200/60 text-[clamp(10px,2vw,18px)] leading-none select-none"
          style={isLastShotHere ? { animation: 'naval-splash 0.4s ease-out' } : undefined}
        >
          .
        </span>
      );
    }

    return (
      <div
        key={`enemy-${row}-${col}`}
        className={`
          aspect-square flex items-center justify-center relative
          border border-blue-800/30
          ${bgClass}
          ${canTarget ? 'cursor-crosshair' : ''}
          ${canTarget && isHovered ? 'bg-yellow-400/30 border-yellow-400/60' : ''}
          transition-colors duration-100
        `}
        onClick={() => handleEnemyCellClick(row, col)}
        onMouseEnter={() => setHoveredCell({ row, col })}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {content}
        {/* Crosshair indicator on hover for valid targets */}
        {canTarget && isHovered && !content && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[40%] h-[40%] rounded-full border-2 border-yellow-400/70" />
          </div>
        )}
      </div>
    );
  };

  const renderGrid = (
    renderCell: (row: number, col: number) => React.ReactNode,
    label: string,
  ) => {
    return (
      <div className="flex flex-col items-center">
        <h3 className="text-cream-100 font-semibold text-sm mb-1.5 tracking-wide uppercase">
          {label}
        </h3>
        <div className="w-[min(42vw,35vh)] aspect-square">
          {/* Column headers */}
          <div
            className="grid mb-0.5"
            style={{ gridTemplateColumns: `1.5em repeat(${BOARD_SIZE}, 1fr)` }}
          >
            <div /> {/* empty corner */}
            {COL_LABELS.map(letter => (
              <div
                key={letter}
                className="text-center text-wood-300 text-[clamp(7px,1vw,11px)] font-medium select-none"
              >
                {letter}
              </div>
            ))}
          </div>

          {/* Rows with row headers */}
          <div
            className="grid bg-slate-800 rounded border-2 border-blue-900/60"
            style={{
              gridTemplateColumns: `1.5em repeat(${BOARD_SIZE}, 1fr)`,
              gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
            }}
          >
            {Array.from({ length: BOARD_SIZE }).map((_, row) => (
              <Fragment key={`row-${row}`}>
                {/* Row header */}
                <div
                  className="flex items-center justify-center text-wood-300 text-[clamp(7px,1vw,11px)] font-medium select-none"
                >
                  {row + 1}
                </div>
                {/* Row cells */}
                {Array.from({ length: BOARD_SIZE }).map((_, col) =>
                  renderCell(row, col),
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderShipStatus = (
    ships: Ship[],
    label: string,
    sunkShips?: Ship[],
  ) => {
    // If we're showing opponent ships, we only know about sunk ones
    const shipSizes: { [name: string]: number } = {
      Carrier: 5,
      Battleship: 4,
      Cruiser: 3,
      Submarine: 3,
      Destroyer: 2,
    };
    const displayShips = sunkShips !== undefined
      ? ALL_SHIPS.map(name => {
          const sunkShip = sunkShips.find(s => s.name === name);
          return {
            name,
            sunk: !!sunkShip,
            size: sunkShip?.size ?? shipSizes[name] ?? 3,
          };
        })
      : ships.map(s => ({ name: s.name, sunk: s.sunk, size: s.size }));

    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-wood-300 text-[clamp(8px,1vw,11px)] font-medium uppercase tracking-wide mb-0.5">
          {label}
        </span>
        {displayShips.map(ship => (
          <div key={ship.name} className="flex items-center gap-1.5">
            {/* Ship size indicator: small squares */}
            <div className="flex gap-px">
              {Array.from({ length: ship.size }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[clamp(5px,0.7vw,8px)] h-[clamp(5px,0.7vw,8px)] rounded-sm ${
                    ship.sunk ? 'bg-red-500/60' : 'bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <span
              className={`text-[clamp(8px,1vw,11px)] ${
                ship.sunk
                  ? 'text-red-400 line-through'
                  : 'text-cream-100'
              }`}
            >
              {ship.name}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn indicator */}
      <div className="flex items-center gap-3">
        <span className="text-cream-100 font-medium text-lg">
          {isGameOver
            ? 'Game Over'
            : isMyTurn
              ? 'Your turn — fire at the enemy!'
              : "Opponent's turn — stand by..."}
        </span>
      </div>

      {/* Shot feedback */}
      {shotFeedback && (
        <div
          className={`font-bold text-xl ${
            shotFeedback.type === 'hit'
              ? 'text-red-400'
              : 'text-blue-300'
          }`}
          style={{ animation: 'naval-fade-in-out 1.8s ease-out forwards' }}
        >
          {shotFeedback.text}
        </div>
      )}

      {/* Boards container: side by side on wide screens, stacked on mobile */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        {/* My Fleet */}
        {renderGrid(renderMyCell, 'Your Fleet')}

        {/* Enemy Waters */}
        {renderGrid(renderEnemyCell, 'Enemy Waters')}
      </div>

      {/* Ship status panels */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-10 mt-1">
        {renderShipStatus(state.myBoard.ships, 'Your Ships')}
        {renderShipStatus([], 'Enemy Ships', state.opponentShipsSunk)}
      </div>

      {/* Score summary */}
      <div className="flex gap-6 text-sm text-cream-200">
        <span>Your ships lost: {myShipsSunkCount}/5</span>
        <span>Enemy ships sunk: {opponentShipsSunkCount}/5</span>
      </div>

      {/* Win reason */}
      {isGameOver && state.winReason && (
        <div className="text-yellow-400 text-sm font-semibold">
          {state.winReason}
        </div>
      )}

      {/* Quit button */}
      <div className="flex items-center gap-6 mt-1">
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
