// ---- Common Game Interface ----

export interface GameEngine<TState, TMove> {
  initGame(playerIds: [string, string]): TState;
  validateMove(state: TState, playerId: string, move: TMove): string | null; // null = valid, string = error
  applyMove(state: TState, playerId: string, move: TMove): TState;
  getState(state: TState, playerId: string): unknown; // player-specific view if needed
  checkWinner(state: TState): { winner: string | null; reason?: string } | null;
}

// ---- Room Types ----

export type GameType = 'checkers' | 'chess' | 'connect4' | 'reversi' | 'tictactoe' | 'gomoku' | 'mancala' | 'dotsboxes' | 'navalbattle' | 'go' | 'backgammon' | 'cribbage';

export interface Player {
  id: string;
  name: string;
  socketId: string | null;
  sessionToken: string;
  connected: boolean;
  disconnectedAt: number | null;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  code: string;
  gameType: GameType;
  status: RoomStatus;
  players: Player[];
  creatorId: string;
  gameState: unknown;
  chatMessages: ChatMessage[];
  createdAt: number;
  lastActivity: number;
}

export interface ChatMessage {
  id: string;
  playerName: string | null; // null for system messages
  text: string;
  timestamp: number;
  isSystem: boolean;
}

// ---- Checkers Types ----

export type PieceColor = 'red' | 'black';

export interface CheckersPiece {
  color: PieceColor;
  isKing: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface CheckersMove {
  from: Position;
  to: Position;
}

export interface CheckersState {
  board: (CheckersPiece | null)[][];
  currentTurn: PieceColor;
  players: {
    red: string;   // player ID
    black: string;  // player ID
  };
  captures: {
    red: number;   // pieces captured BY red
    black: number; // pieces captured BY black
  };
  winner: string | null;
  winReason: string | null;
  mustContinueFrom: Position | null; // for multi-jumps
}

// ---- Socket Event Types ----

export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; gameType: GameType }) => void;
  'room:join': (data: { roomCode: string; playerName: string; sessionToken?: string }) => void;
  'game:move': (data: { from: Position; to: Position }) => void;
  'game:start': () => void;
  'game:restart': () => void;
  'game:switch-game': (data: { gameType: GameType }) => void;
  'game:request-state': () => void;
  'chat:message': (data: { text: string }) => void;
}

export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; playerId: string; sessionToken: string }) => void;
  'room:joined': (data: { players: { id: string; name: string; connected: boolean }[]; playerId: string; sessionToken: string; roomStatus: RoomStatus; creatorId: string; gameType: GameType }) => void;
  'room:player-joined': (data: { playerName: string; players: { id: string; name: string; connected: boolean }[] }) => void;
  'room:player-left': (data: { playerName: string; players: { id: string; name: string; connected: boolean }[] }) => void;
  'room:player-reconnected': (data: { playerName: string; players: { id: string; name: string; connected: boolean }[] }) => void;
  'room:player-disconnected': (data: { playerName: string; players: { id: string; name: string; connected: boolean }[] }) => void;
  'room:error': (data: { message: string }) => void;
  'game:state': (state: unknown) => void;
  'game:started': () => void;
  'game:over': (data: { winner: string; winnerName: string; reason: string }) => void;
  'game:restarted': (data?: { gameType?: GameType }) => void;
  'chat:message': (data: { playerName: string; text: string; timestamp: number }) => void;
  'chat:system': (data: { text: string; timestamp: number }) => void;
  'chat:history': (data: ChatMessage[]) => void;
}
