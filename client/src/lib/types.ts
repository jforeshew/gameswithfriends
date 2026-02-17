export type GameType = 'checkers' | 'chess' | 'connect4' | 'reversi' | 'tictactoe' | 'gomoku' | 'mancala' | 'dotsboxes' | 'navalbattle' | 'go' | 'backgammon' | 'cribbage';
export type PieceColor = 'red' | 'black';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Position {
  row: number;
  col: number;
}

export interface CheckersPiece {
  color: PieceColor;
  isKing: boolean;
}

export interface CheckersState {
  board: (CheckersPiece | null)[][];
  currentTurn: PieceColor;
  players: {
    red: string;
    black: string;
  };
  captures: {
    red: number;
    black: number;
  };
  winner: string | null;
  winReason: string | null;
  mustContinueFrom: Position | null;
}

export interface PlayerInfo {
  id: string;
  name: string;
  connected: boolean;
}

export interface ChatMessage {
  playerName: string | null;
  text: string;
  timestamp: number;
  isSystem: boolean;
}
