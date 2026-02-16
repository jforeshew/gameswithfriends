import { GameEngine, Position } from '../../types';

// ---- Go Types ----

export type GoColor = 'black' | 'white';

export interface GoMove {
  from: Position; // unused, will be {row:0, col:0}
  to: Position;   // the intersection to place a stone, or {row:-1, col:-1} for pass
}

export interface GoState {
  board: (GoColor | null)[][]; // 9x9 board
  currentTurn: GoColor;
  players: { black: string; white: string }; // player IDs
  captures: { black: number; white: number }; // stones captured BY each player
  previousBoard: (GoColor | null)[][] | null; // for ko detection
  consecutivePasses: number;
  winner: string | null;
  winReason: string | null;
  score: { black: number; white: number } | null;
  lastMove: Position | null; // for highlighting on the client
  moveCount: number;
}

// ---- Constants ----

const BOARD_SIZE = 9;
const KOMI = 6.5; // White's compensation

// 4 cardinal directions for adjacency
const DIRECTIONS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

// ---- Helper Functions ----

function createEmptyBoard(): (GoColor | null)[][] {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

function cloneBoard(board: (GoColor | null)[][]): (GoColor | null)[][] {
  return board.map(row => [...row]);
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOpponent(color: GoColor): GoColor {
  return color === 'black' ? 'white' : 'black';
}

function getPlayerColor(state: GoState, playerId: string): GoColor | null {
  if (state.players.black === playerId) return 'black';
  if (state.players.white === playerId) return 'white';
  return null;
}

function isPass(move: GoMove): boolean {
  return move.to.row === -1 && move.to.col === -1;
}

/**
 * Boards are equal if every cell matches.
 */
function boardsEqual(a: (GoColor | null)[][], b: (GoColor | null)[][]): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

/**
 * Find the connected group of stones of the same color starting from (row, col).
 * Returns the set of positions in the group and the set of their liberties.
 */
function getGroup(
  board: (GoColor | null)[][],
  row: number,
  col: number,
): { stones: Set<string>; liberties: Set<string> } {
  const color = board[row][col];
  if (color === null) {
    return { stones: new Set(), liberties: new Set() };
  }

  const stones = new Set<string>();
  const liberties = new Set<string>();
  const stack: [number, number][] = [[row, col]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (board[r][c] === color) {
      stones.add(key);
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!isInBounds(nr, nc)) continue;
        const nKey = `${nr},${nc}`;
        if (visited.has(nKey)) continue;
        if (board[nr][nc] === null) {
          liberties.add(nKey);
        } else if (board[nr][nc] === color) {
          stack.push([nr, nc]);
        }
      }
    }
  }

  return { stones, liberties };
}

/**
 * Remove a group of stones from the board. Returns the count of stones removed.
 */
function removeGroup(board: (GoColor | null)[][], stones: Set<string>): number {
  let count = 0;
  for (const key of stones) {
    const [r, c] = key.split(',').map(Number);
    board[r][c] = null;
    count++;
  }
  return count;
}

/**
 * Place a stone and capture any opponent groups with zero liberties.
 * Returns the new board and the number of stones captured.
 * Does NOT check for legality — caller must validate first.
 */
function placeStoneAndCapture(
  board: (GoColor | null)[][],
  row: number,
  col: number,
  color: GoColor,
): { newBoard: (GoColor | null)[][]; captured: number } {
  const newBoard = cloneBoard(board);
  newBoard[row][col] = color;
  const opponent = getOpponent(color);
  let captured = 0;

  // Check all adjacent opponent groups for capture
  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr;
    const nc = col + dc;
    if (!isInBounds(nr, nc)) continue;
    if (newBoard[nr][nc] !== opponent) continue;

    const group = getGroup(newBoard, nr, nc);
    if (group.liberties.size === 0) {
      captured += removeGroup(newBoard, group.stones);
    }
  }

  return { newBoard, captured };
}

/**
 * Check if placing a stone at (row, col) would be suicide.
 * Suicide means the placed stone's group has no liberties after captures.
 */
function isSuicide(
  board: (GoColor | null)[][],
  row: number,
  col: number,
  color: GoColor,
): boolean {
  const { newBoard, captured } = placeStoneAndCapture(board, row, col, color);

  // If we captured something, it's not suicide
  if (captured > 0) return false;

  // Check if the placed stone's group has any liberties
  const group = getGroup(newBoard, row, col);
  return group.liberties.size === 0;
}

/**
 * Check if a move violates the ko rule (simple ko).
 * After placing and capturing, the resulting board must not match the previous board state.
 */
function violatesKo(
  resultBoard: (GoColor | null)[][],
  previousBoard: (GoColor | null)[][] | null,
): boolean {
  if (!previousBoard) return false;
  return boardsEqual(resultBoard, previousBoard);
}

/**
 * Calculate territory using area scoring (Chinese rules).
 * Count stones on board + empty intersections surrounded entirely by one color.
 */
function calculateScore(board: (GoColor | null)[][]): { black: number; white: number } {
  let blackStones = 0;
  let whiteStones = 0;

  // Count stones on the board
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 'black') blackStones++;
      else if (board[r][c] === 'white') whiteStones++;
    }
  }

  // Flood-fill empty regions to determine territory
  const visited = new Set<string>();
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) continue;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;

      // BFS to find connected empty region
      const region: [number, number][] = [];
      const queue: [number, number][] = [[r, c]];
      const regionVisited = new Set<string>();
      regionVisited.add(key);
      let touchesBlack = false;
      let touchesWhite = false;

      while (queue.length > 0) {
        const [cr, cc] = queue.shift()!;
        region.push([cr, cc]);

        for (const [dr, dc] of DIRECTIONS) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (!isInBounds(nr, nc)) continue;

          const nKey = `${nr},${nc}`;
          if (board[nr][nc] === 'black') {
            touchesBlack = true;
          } else if (board[nr][nc] === 'white') {
            touchesWhite = true;
          } else if (!regionVisited.has(nKey)) {
            regionVisited.add(nKey);
            queue.push([nr, nc]);
          }
        }
      }

      // Mark all cells in this region as visited
      for (const [er, ec] of region) {
        visited.add(`${er},${ec}`);
      }

      // Territory belongs to a color only if the region is surrounded by only that color
      if (touchesBlack && !touchesWhite) {
        blackTerritory += region.length;
      } else if (touchesWhite && !touchesBlack) {
        whiteTerritory += region.length;
      }
      // If it touches both or neither, it's neutral (dame) — not counted
    }
  }

  return {
    black: blackStones + blackTerritory,
    white: whiteStones + whiteTerritory + KOMI,
  };
}

// ---- Game Engine ----

export const goEngine: GameEngine<GoState, GoMove> = {
  initGame(playerIds: [string, string]): GoState {
    // Randomly assign colors
    const shuffled = Math.random() < 0.5 ? playerIds : [playerIds[1], playerIds[0]];

    return {
      board: createEmptyBoard(),
      currentTurn: 'black', // black always goes first
      players: {
        black: shuffled[0],
        white: shuffled[1],
      },
      captures: { black: 0, white: 0 },
      previousBoard: null,
      consecutivePasses: 0,
      winner: null,
      winReason: null,
      score: null,
      lastMove: null,
      moveCount: 0,
    };
  },

  validateMove(state: GoState, playerId: string, move: GoMove): string | null {
    if (state.winner) return 'Game is already over';

    const color = getPlayerColor(state, playerId);
    if (!color) return 'You are not a player in this game';
    if (color !== state.currentTurn) return 'It is not your turn';

    // Pass is always valid
    if (isPass(move)) return null;

    const { row, col } = move.to;

    // Validate position bounds
    if (!Number.isInteger(row) || !Number.isInteger(col) || !isInBounds(row, col)) {
      return 'Position out of bounds';
    }

    // Check if the intersection is empty
    if (state.board[row][col] !== null) {
      return 'That intersection is already occupied';
    }

    // Check for suicide
    if (isSuicide(state.board, row, col, color)) {
      return 'Suicide is not allowed: that move would leave your stone with no liberties';
    }

    // Check for ko violation
    const { newBoard } = placeStoneAndCapture(state.board, row, col, color);
    if (violatesKo(newBoard, state.previousBoard)) {
      return 'Ko rule violation: cannot repeat the previous board position';
    }

    return null;
  },

  applyMove(state: GoState, playerId: string, move: GoMove): GoState {
    const color = getPlayerColor(state, playerId)!;

    // Handle pass
    if (isPass(move)) {
      const newConsecutivePasses = state.consecutivePasses + 1;

      const newState: GoState = {
        ...state,
        currentTurn: getOpponent(color),
        consecutivePasses: newConsecutivePasses,
        lastMove: { row: -1, col: -1 }, // sentinel for pass
        moveCount: state.moveCount + 1,
        // Do NOT update previousBoard on a pass (ko only applies to stone placements)
      };

      // If both players passed, calculate the score and end the game
      if (newConsecutivePasses >= 2) {
        const score = calculateScore(state.board);
        newState.score = score;

        if (score.black > score.white) {
          newState.winner = state.players.black;
          newState.winReason = `Black wins ${score.black} to ${score.white} (area scoring with ${KOMI} komi)`;
        } else if (score.white > score.black) {
          newState.winner = state.players.white;
          newState.winReason = `White wins ${score.white} to ${score.black} (area scoring with ${KOMI} komi)`;
        } else {
          // Exact tie (extremely rare with 0.5 komi, but handle it)
          newState.winner = null;
          newState.winReason = `Draw! Both players scored ${score.black} (area scoring with ${KOMI} komi)`;
        }
      }

      return newState;
    }

    // Place a stone
    const { row, col } = move.to;
    const { newBoard, captured } = placeStoneAndCapture(state.board, row, col, color);

    return {
      ...state,
      board: newBoard,
      currentTurn: getOpponent(color),
      captures: {
        ...state.captures,
        [color]: state.captures[color] + captured,
      },
      previousBoard: cloneBoard(state.board), // save current board for ko detection
      consecutivePasses: 0, // reset on stone placement
      lastMove: { row, col },
      moveCount: state.moveCount + 1,
    };
  },

  getState(state: GoState, _playerId: string): unknown {
    // Both players see the full board — no hidden information in Go
    return {
      board: state.board,
      currentTurn: state.currentTurn,
      players: state.players,
      captures: state.captures,
      consecutivePasses: state.consecutivePasses,
      winner: state.winner,
      winReason: state.winReason,
      score: state.score,
      lastMove: state.lastMove,
      moveCount: state.moveCount,
    };
  },

  checkWinner(state: GoState): { winner: string | null; reason?: string } | null {
    // Winner is determined in applyMove when both players pass
    if (state.winner) {
      return {
        winner: state.winner,
        reason: state.winReason || 'Game over',
      };
    }

    // Check for draw (both passed but exact tie)
    if (state.consecutivePasses >= 2 && state.score) {
      return {
        winner: null,
        reason: state.winReason || 'Draw',
      };
    }

    // Game is still in progress
    return null;
  },
};
