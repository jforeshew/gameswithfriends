export interface GameInfo {
  id: string;
  name: string;
  description: string;
  available: boolean;
}

export const GAMES: GameInfo[] = [
  {
    id: 'checkers',
    name: 'Checkers',
    description: 'Classic American Checkers on an 8x8 board',
    available: true,
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'The ultimate strategy game',
    available: true,
  },
  {
    id: 'connect4',
    name: 'Four in a Row',
    description: 'Drop pieces and line up four to win',
    available: true,
  },
  {
    id: 'reversi',
    name: 'Reversi',
    description: 'Flip your way to victory',
    available: true,
  },
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    description: 'Classic X and O on a 3x3 grid',
    available: true,
  },
  {
    id: 'gomoku',
    name: 'Gomoku',
    description: 'Get five in a row on a 15x15 board',
    available: true,
  },
  {
    id: 'mancala',
    name: 'Mancala',
    description: 'Ancient stone-sowing strategy game',
    available: true,
  },
  {
    id: 'dotsboxes',
    name: 'Dots & Boxes',
    description: 'Connect dots to claim boxes',
    available: true,
  },
  {
    id: 'navalbattle',
    name: 'Naval Battle',
    description: 'Find and sink your opponent\'s fleet',
    available: true,
  },
  {
    id: 'go',
    name: 'Go',
    description: 'Ancient strategy game on a 9x9 board',
    available: true,
  },
  {
    id: 'backgammon',
    name: 'Backgammon',
    description: 'Classic dice-and-strategy race game',
    available: true,
  },
  {
    id: 'cribbage',
    name: 'Cribbage',
    description: 'Classic card game of pegging and counting',
    available: true,
  },
];
