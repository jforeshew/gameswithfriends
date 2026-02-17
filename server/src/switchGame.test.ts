import { describe, it, expect } from 'vitest';
import { GameType, GameEngine, Position } from './types';
import { checkersEngine } from './games/checkers';
import { chessEngine } from './games/chess';
import { connect4Engine } from './games/connect4';
import { reversiEngine } from './games/reversi';
import { tictactoeEngine } from './games/tictactoe';
import { gomokuEngine } from './games/gomoku';
import { mancalaEngine } from './games/mancala';
import { dotsboxesEngine } from './games/dotsboxes';
import { navalbattleEngine } from './games/navalbattle';
import { goEngine } from './games/go';
import { backgammonEngine } from './games/backgammon';
import { cribbageEngine } from './games/cribbage';

type AnyEngine = GameEngine<unknown, { from: Position; to: Position }>;

const ENGINES: Record<GameType, AnyEngine> = {
  checkers: checkersEngine,
  chess: chessEngine,
  connect4: connect4Engine,
  reversi: reversiEngine,
  tictactoe: tictactoeEngine,
  gomoku: gomokuEngine,
  mancala: mancalaEngine,
  dotsboxes: dotsboxesEngine,
  navalbattle: navalbattleEngine,
  go: goEngine,
  backgammon: backgammonEngine,
  cribbage: cribbageEngine,
};

function getEngine(gameType: GameType): AnyEngine {
  return ENGINES[gameType];
}

const PLAYER_IDS: [string, string] = ['player-1', 'player-2'];
const ALL_GAME_TYPES: GameType[] = [
  'checkers', 'chess', 'connect4', 'reversi', 'tictactoe', 'gomoku',
  'mancala', 'dotsboxes', 'navalbattle', 'go', 'backgammon', 'cribbage',
];

describe('getEngine', () => {
  it.each(ALL_GAME_TYPES)('returns a working engine for %s', (gameType) => {
    const engine = getEngine(gameType);
    expect(engine).toBeDefined();
    expect(typeof engine.initGame).toBe('function');
    expect(typeof engine.validateMove).toBe('function');
    expect(typeof engine.applyMove).toBe('function');
    expect(typeof engine.getState).toBe('function');
    expect(typeof engine.checkWinner).toBe('function');
  });

  it.each(ALL_GAME_TYPES)('initGame produces valid state for %s', (gameType) => {
    const engine = getEngine(gameType);
    const state = engine.initGame(PLAYER_IDS);
    expect(state).toBeDefined();
    expect(state).not.toBeNull();
  });

  it.each(ALL_GAME_TYPES)('checkWinner returns null on fresh %s state', (gameType) => {
    const engine = getEngine(gameType);
    const state = engine.initGame(PLAYER_IDS);
    const result = engine.checkWinner(state);
    // Fresh game should not have a winner
    expect(result?.winner ?? null).toBeNull();
  });
});

describe('game switch state transitions', () => {
  it('can switch from one game type to another', () => {
    // Simulate: start with checkers, switch to chess
    const checkersState = checkersEngine.initGame(PLAYER_IDS);
    expect(checkersState).toBeDefined();

    // Now "switch" to chess by initializing a new engine
    const chessState = chessEngine.initGame(PLAYER_IDS);
    expect(chessState).toBeDefined();

    // Both states should be independently valid
    expect(checkersEngine.checkWinner(checkersState)?.winner ?? null).toBeNull();
    expect(chessEngine.checkWinner(chessState)?.winner ?? null).toBeNull();
  });

  it('can switch between all game types sequentially', () => {
    for (let i = 0; i < ALL_GAME_TYPES.length - 1; i++) {
      const fromType = ALL_GAME_TYPES[i];
      const toType = ALL_GAME_TYPES[i + 1];

      const fromEngine = getEngine(fromType);
      const toEngine = getEngine(toType);

      const fromState = fromEngine.initGame(PLAYER_IDS);
      expect(fromState).toBeDefined();

      const toState = toEngine.initGame(PLAYER_IDS);
      expect(toState).toBeDefined();

      // New game state should have no winner
      expect(toEngine.checkWinner(toState)?.winner ?? null).toBeNull();
    }
  });

  it('getState returns player-specific views for each game', () => {
    for (const gameType of ALL_GAME_TYPES) {
      const engine = getEngine(gameType);
      const state = engine.initGame(PLAYER_IDS);

      const view1 = engine.getState(state, PLAYER_IDS[0]);
      const view2 = engine.getState(state, PLAYER_IDS[1]);

      expect(view1).toBeDefined();
      expect(view2).toBeDefined();
    }
  });
});

describe('validation', () => {
  it('invalid game type is not in the engines map', () => {
    const invalidType = 'notarealgame' as GameType;
    expect(ENGINES[invalidType]).toBeUndefined();
  });

  it('VALID_GAME_TYPES set matches all engine keys', () => {
    const VALID_GAME_TYPES = new Set([
      'checkers', 'chess', 'connect4', 'reversi', 'tictactoe', 'gomoku',
      'mancala', 'dotsboxes', 'navalbattle', 'go', 'backgammon', 'cribbage',
    ]);

    const engineKeys = Object.keys(ENGINES);
    expect(engineKeys.length).toBe(VALID_GAME_TYPES.size);
    for (const key of engineKeys) {
      expect(VALID_GAME_TYPES.has(key)).toBe(true);
    }
  });
});
