import { GameEngine, Position } from '../../types';

// ---- Naval Battle Types ----

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export interface Ship {
  name: string;
  size: number;
  positions: Position[];
  hits: number;
  sunk: boolean;
}

export interface PlayerBoard {
  grid: CellState[][]; // 10x10
  ships: Ship[];
}

export interface NavalBattleMove {
  from: Position; // unused
  to: Position;   // target cell to fire at
}

export interface NavalBattleState {
  boards: { [playerId: string]: PlayerBoard };
  currentTurn: string; // player ID whose turn it is
  players: { player1: string; player2: string };
  winner: string | null;
  winReason: string | null;
  lastShot: { playerId: string; pos: Position; result: 'hit' | 'miss' | 'sunk' } | null;
}

// ---- Constants ----

const BOARD_SIZE = 10;

const SHIP_TEMPLATES: { name: string; size: number }[] = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

// ---- Helper Functions ----

function createEmptyGrid(): CellState[][] {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill('empty' as CellState));
}

function cloneGrid(grid: CellState[][]): CellState[][] {
  return grid.map(row => [...row]);
}

function cloneShips(ships: Ship[]): Ship[] {
  return ships.map(ship => ({
    ...ship,
    positions: ship.positions.map(p => ({ ...p })),
  }));
}

function cloneBoard(board: PlayerBoard): PlayerBoard {
  return {
    grid: cloneGrid(board.grid),
    ships: cloneShips(board.ships),
  };
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Attempt to place a ship on the grid at a random position and orientation.
 * Returns true if placement was successful, false if it could not be placed.
 */
function tryPlaceShip(
  grid: CellState[][],
  size: number,
): Position[] | null {
  // Pick random orientation: 0 = horizontal, 1 = vertical
  const horizontal = Math.random() < 0.5;

  const maxRow = horizontal ? BOARD_SIZE : BOARD_SIZE - size;
  const maxCol = horizontal ? BOARD_SIZE - size : BOARD_SIZE;

  const startRow = Math.floor(Math.random() * maxRow);
  const startCol = Math.floor(Math.random() * maxCol);

  const positions: Position[] = [];

  for (let i = 0; i < size; i++) {
    const row = horizontal ? startRow : startRow + i;
    const col = horizontal ? startCol + i : startCol;

    // Check if cell is already occupied
    if (grid[row][col] !== 'empty') {
      return null;
    }

    positions.push({ row, col });
  }

  return positions;
}

/**
 * Place a ship randomly on the grid. Retries until a valid position is found.
 */
function placeShipRandomly(grid: CellState[][], size: number): Position[] {
  let positions: Position[] | null = null;
  let attempts = 0;
  const maxAttempts = 1000;

  while (positions === null && attempts < maxAttempts) {
    positions = tryPlaceShip(grid, size);
    attempts++;
  }

  if (positions === null) {
    // Extremely unlikely on a 10x10 board with standard ships, but handle gracefully
    throw new Error('Failed to place ship after maximum attempts');
  }

  // Mark the cells as occupied
  for (const pos of positions) {
    grid[pos.row][pos.col] = 'ship';
  }

  return positions;
}

/**
 * Generate a complete board with all ships placed randomly.
 */
function generateBoard(): PlayerBoard {
  const grid = createEmptyGrid();
  const ships: Ship[] = [];

  for (const template of SHIP_TEMPLATES) {
    const positions = placeShipRandomly(grid, template.size);
    ships.push({
      name: template.name,
      size: template.size,
      positions,
      hits: 0,
      sunk: false,
    });
  }

  return { grid, ships };
}

/**
 * Check if all ships on a board are sunk.
 */
function allShipsSunk(board: PlayerBoard): boolean {
  return board.ships.every(ship => ship.sunk);
}

/**
 * Get the opponent's player ID.
 */
function getOpponentId(state: NavalBattleState, playerId: string): string {
  return state.players.player1 === playerId
    ? state.players.player2
    : state.players.player1;
}

// ---- Game Engine ----

export const navalbattleEngine: GameEngine<NavalBattleState, NavalBattleMove> = {
  initGame(playerIds: [string, string]): NavalBattleState {
    // Randomly decide who goes first
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];

    const boards: { [playerId: string]: PlayerBoard } = {};
    boards[shuffled[0]] = generateBoard();
    boards[shuffled[1]] = generateBoard();

    return {
      boards,
      currentTurn: shuffled[0], // player1 goes first
      players: {
        player1: shuffled[0],
        player2: shuffled[1],
      },
      winner: null,
      winReason: null,
      lastShot: null,
    };
  },

  validateMove(state: NavalBattleState, playerId: string, move: NavalBattleMove): string | null {
    if (state.winner) return 'Game is already over';

    // Check the player is in the game
    if (state.players.player1 !== playerId && state.players.player2 !== playerId) {
      return 'You are not a player in this game';
    }

    // Check it's this player's turn
    if (state.currentTurn !== playerId) {
      return 'It is not your turn';
    }

    const { row, col } = move.to;

    // Validate position bounds
    if (!Number.isInteger(row) || !Number.isInteger(col) || !isInBounds(row, col)) {
      return 'Position out of bounds';
    }

    // Fire at opponent's board
    const opponentId = getOpponentId(state, playerId);
    const opponentBoard = state.boards[opponentId];
    const cellState = opponentBoard.grid[row][col];

    // Can't fire at already-hit or already-missed cells
    if (cellState === 'hit' || cellState === 'miss') {
      return 'You have already fired at this position';
    }

    return null;
  },

  applyMove(state: NavalBattleState, playerId: string, move: NavalBattleMove): NavalBattleState {
    const { row, col } = move.to;
    const opponentId = getOpponentId(state, playerId);

    // Deep clone the boards
    const newBoards: { [playerId: string]: PlayerBoard } = {};
    for (const pid of [state.players.player1, state.players.player2]) {
      newBoards[pid] = cloneBoard(state.boards[pid]);
    }

    const opponentBoard = newBoards[opponentId];
    const cellState = opponentBoard.grid[row][col];

    let shotResult: 'hit' | 'miss' | 'sunk';

    if (cellState === 'ship') {
      // It's a hit
      opponentBoard.grid[row][col] = 'hit';

      // Find which ship was hit and update it
      let sunkShipName: string | null = null;
      for (const ship of opponentBoard.ships) {
        const hitPos = ship.positions.find(p => p.row === row && p.col === col);
        if (hitPos) {
          ship.hits++;
          if (ship.hits >= ship.size) {
            ship.sunk = true;
            sunkShipName = ship.name;
          }
          break;
        }
      }

      shotResult = sunkShipName ? 'sunk' : 'hit';
    } else {
      // It's a miss (cell was 'empty')
      opponentBoard.grid[row][col] = 'miss';
      shotResult = 'miss';
    }

    // Switch turns to the opponent
    const nextTurn = opponentId;

    const newState: NavalBattleState = {
      boards: newBoards,
      currentTurn: nextTurn,
      players: { ...state.players },
      winner: null,
      winReason: null,
      lastShot: {
        playerId,
        pos: { row, col },
        result: shotResult,
      },
    };

    // Check if all opponent ships are sunk
    if (allShipsSunk(opponentBoard)) {
      newState.winner = playerId;
      newState.winReason = 'All enemy ships have been sunk!';
    }

    return newState;
  },

  getState(state: NavalBattleState, playerId: string): unknown {
    // This game has HIDDEN INFORMATION.
    // Players can only see their own ships, and hits/misses on the opponent's board.

    const opponentId = getOpponentId(state, playerId);
    const myBoard = state.boards[playerId];
    const opponentBoard = state.boards[opponentId];

    // Build the opponent's visible grid: only show hits and misses, not ship positions
    const opponentVisibleGrid: ('unknown' | 'hit' | 'miss')[][] = Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill('unknown' as const));

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = opponentBoard.grid[r][c];
        if (cell === 'hit') {
          opponentVisibleGrid[r][c] = 'hit';
        } else if (cell === 'miss') {
          opponentVisibleGrid[r][c] = 'miss';
        }
        // 'empty' and 'ship' both appear as 'unknown' to the opponent
      }
    }

    // Only reveal sunk ships to the opponent
    const opponentShipsSunk: Ship[] = opponentBoard.ships
      .filter(ship => ship.sunk)
      .map(ship => ({
        name: ship.name,
        size: ship.size,
        positions: ship.positions.map(p => ({ ...p })),
        hits: ship.hits,
        sunk: true,
      }));

    return {
      myBoard: {
        grid: myBoard.grid,
        ships: myBoard.ships,
      },
      opponentBoard: {
        grid: opponentVisibleGrid,
      },
      currentTurn: state.currentTurn,
      myId: playerId,
      winner: state.winner,
      winReason: state.winReason,
      lastShot: state.lastShot,
      opponentShipsSunk,
    };
  },

  checkWinner(state: NavalBattleState): { winner: string | null; reason?: string } | null {
    if (state.winner) {
      return {
        winner: state.winner,
        reason: state.winReason || 'All enemy ships have been sunk!',
      };
    }

    // Game is still in progress
    return null;
  },
};
