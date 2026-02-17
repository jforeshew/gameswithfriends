import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GameType,
  GameEngine,
  Position,
} from './types';
import {
  createRoom,
  getRoom,
  joinRoom,
  reconnectPlayer,
  disconnectPlayer,
  findRoomBySocketId,
  addChatMessage,
  getPlayersInfo,
  updateSocketIndex,
} from './rooms';
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

function getEngine(gameType: GameType): GameEngine<unknown, { from: Position; to: Position }> {
  switch (gameType) {
    case 'checkers': return checkersEngine;
    case 'chess': return chessEngine;
    case 'connect4': return connect4Engine;
    case 'reversi': return reversiEngine;
    case 'tictactoe': return tictactoeEngine;
    case 'gomoku': return gomokuEngine;
    case 'mancala': return mancalaEngine;
    case 'dotsboxes': return dotsboxesEngine;
    case 'navalbattle': return navalbattleEngine;
    case 'go': return goEngine;
    case 'backgammon': return backgammonEngine;
    case 'cribbage': return cribbageEngine;
    default: throw new Error(`Unknown game type: ${gameType}`);
  }
}

const PORT = parseInt(process.env.PORT || '3001', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// REST endpoint for checking room status (used when loading join page)
app.get('/api/rooms/:code', (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    code: room.code,
    gameType: room.gameType,
    status: room.status,
    playerCount: room.players.length,
    isFull: room.players.length >= 2,
  });
});

// Valid game types (must match GameType union)
const VALID_GAME_TYPES: Set<string> = new Set([
  'checkers', 'chess', 'connect4', 'reversi', 'tictactoe', 'gomoku',
  'mancala', 'dotsboxes', 'navalbattle', 'go', 'backgammon', 'cribbage',
]);

// Rate limiting
const lastEventTime = new Map<string, number>();

function isRateLimited(socketId: string, minIntervalMs = 100): boolean {
  const now = Date.now();
  const last = lastEventTime.get(socketId) || 0;
  if (now - last < minIntervalMs) return true;
  lastEventTime.set(socketId, now);
  return false;
}

// Disconnection timers
const disconnectTimers = new Map<string, NodeJS.Timeout>();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Immediately associate socket with player if auth info provided
  // This ensures socketId is always up-to-date, even after silent reconnections
  const { sessionToken, roomCode: authRoomCode } = socket.handshake.auth || {};
  if (sessionToken && authRoomCode) {
    const reconnResult = reconnectPlayer(authRoomCode.toUpperCase(), sessionToken);
    if ('room' in reconnResult) {
      const { room, player } = reconnResult;
      player.socketId = socket.id;
      updateSocketIndex(socket.id, room.code, player.id);
      socket.join(room.code);
      console.log(`[auth] auto-associated ${player.name} with socket ${socket.id} in room ${room.code}`);

      // Clear any pending disconnect timer
      const timerId = `${room.code}:${player.id}`;
      const timer = disconnectTimers.get(timerId);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(timerId);
      }
    }
  }

  // --- Room Creation ---
  socket.on('room:create', ({ playerName, gameType }) => {
    if (isRateLimited(socket.id, 2000)) {
      socket.emit('room:error', { message: 'Too many requests, slow down' });
      return;
    }

    if (!playerName || playerName.trim().length < 3 || playerName.trim().length > 20) {
      socket.emit('room:error', { message: 'Display name must be 3-20 characters' });
      return;
    }

    if (!VALID_GAME_TYPES.has(gameType)) {
      socket.emit('room:error', { message: 'Invalid game type' });
      return;
    }

    const { room, player } = createRoom(gameType, playerName.trim());
    player.socketId = socket.id;
    updateSocketIndex(socket.id, room.code, player.id);
    socket.join(room.code);

    addChatMessage(room, null, `${player.name} created the room`, true);

    socket.emit('room:created', {
      roomCode: room.code,
      playerId: player.id,
      sessionToken: player.sessionToken,
    });

    socket.emit('room:joined', {
      players: getPlayersInfo(room),
      playerId: player.id,
      sessionToken: player.sessionToken,
      roomStatus: room.status,
      creatorId: room.creatorId,
      gameType: room.gameType,
    });

    socket.emit('chat:history', room.chatMessages);
  });

  // --- Room Joining ---
  socket.on('room:join', ({ roomCode, playerName, sessionToken }) => {
    if (isRateLimited(socket.id, 2000)) {
      socket.emit('room:error', { message: 'Too many requests, slow down' });
      return;
    }

    const code = roomCode.toUpperCase();

    // Try reconnection first
    if (sessionToken) {
      const reconnResult = reconnectPlayer(code, sessionToken);
      if ('room' in reconnResult) {
        const { room, player } = reconnResult;
        player.socketId = socket.id;
        updateSocketIndex(socket.id, room.code, player.id);
        socket.join(room.code);

        // Clear disconnect timer
        const timerId = `${room.code}:${player.id}`;
        const timer = disconnectTimers.get(timerId);
        if (timer) {
          clearTimeout(timer);
          disconnectTimers.delete(timerId);
        }

        socket.emit('room:joined', {
          players: getPlayersInfo(room),
          playerId: player.id,
          sessionToken: player.sessionToken,
          roomStatus: room.status,
          creatorId: room.creatorId,
          gameType: room.gameType,
        });

        socket.to(room.code).emit('room:player-reconnected', {
          playerName: player.name,
          players: getPlayersInfo(room),
        });

        // Send current game state if game is in progress
        if (room.status === 'playing' && room.gameState) {
          const engine = getEngine(room.gameType);
          socket.emit('game:state', engine.getState(room.gameState, player.id));
        }

        socket.emit('chat:history', room.chatMessages);

        return;
      }
    }

    // New join
    if (!playerName || playerName.trim().length < 3 || playerName.trim().length > 20) {
      socket.emit('room:error', { message: 'Display name must be 3-20 characters' });
      return;
    }

    const result = joinRoom(code, playerName.trim());
    if ('error' in result) {
      socket.emit('room:error', { message: result.error });
      return;
    }

    const { room, player } = result;
    player.socketId = socket.id;
    updateSocketIndex(socket.id, room.code, player.id);
    socket.join(room.code);

    addChatMessage(room, null, `${player.name} joined the room`, true);

    socket.emit('room:joined', {
      players: getPlayersInfo(room),
      playerId: player.id,
      sessionToken: player.sessionToken,
      roomStatus: room.status,
      creatorId: room.creatorId,
      gameType: room.gameType,
    });

    socket.to(room.code).emit('room:player-joined', {
      playerName: player.name,
      players: getPlayersInfo(room),
    });

    socket.emit('chat:history', room.chatMessages);
    io.to(room.code).emit('chat:system', {
      text: `${player.name} joined the room`,
      timestamp: Date.now(),
    });
  });

  // --- Game Start ---
  socket.on('game:start', () => {
    console.log(`[game:start] socket.id=${socket.id}`);
    const found = findRoomBySocketId(socket.id);
    if (!found) {
      console.log(`[game:start] ERROR: findRoomBySocketId returned null for ${socket.id}`);
      socket.emit('room:error', { message: 'Not in a room' });
      return;
    }

    const { room, player } = found;
    console.log(`[game:start] room=${room.code}, player=${player.name}, creatorId=${room.creatorId}, playerId=${player.id}, playerCount=${room.players.length}, status=${room.status}`);

    if (player.id !== room.creatorId) {
      console.log(`[game:start] ERROR: not creator`);
      socket.emit('room:error', { message: 'Only the room creator can start the game' });
      return;
    }

    if (room.players.length < 2) {
      console.log(`[game:start] ERROR: not enough players`);
      socket.emit('room:error', { message: 'Need 2 players to start' });
      return;
    }

    if (room.status === 'playing') {
      socket.emit('room:error', { message: 'Game is already in progress' });
      return;
    }

    const engine = getEngine(room.gameType);
    const playerIds: [string, string] = [room.players[0].id, room.players[1].id];

    let gameState;
    try {
      gameState = engine.initGame(playerIds);
    } catch (err) {
      console.error(`[game:start] Engine error in ${room.gameType}:`, err);
      socket.emit('room:error', { message: 'Failed to initialize game' });
      return;
    }
    room.gameState = gameState;
    room.status = 'playing';

    addChatMessage(room, null, 'Game started!', true);

    // Send game state to each player individually
    for (const p of room.players) {
      console.log(`[game:start] sending game:state to ${p.name} (socketId=${p.socketId})`);
      if (p.socketId) {
        io.to(p.socketId).emit('game:state', engine.getState(room.gameState, p.id));
      }
    }

    // Also broadcast game:started to the entire room as a reliable fallback
    // (room broadcast uses socket.join membership, not stored socketIds)
    io.to(room.code).emit('game:started');

    io.to(room.code).emit('chat:system', {
      text: 'Game started!',
      timestamp: Date.now(),
    });
  });

  // --- Game Move ---
  socket.on('game:move', ({ from, to }) => {
    if (isRateLimited(socket.id, 100)) {
      socket.emit('room:error', { message: 'Too fast, slow down' });
      return;
    }

    // Validate move input types
    if (!from || !to ||
        typeof from.row !== 'number' || typeof from.col !== 'number' ||
        typeof to.row !== 'number' || typeof to.col !== 'number' ||
        !isFinite(from.row) || !isFinite(from.col) ||
        !isFinite(to.row) || !isFinite(to.col)) {
      socket.emit('room:error', { message: 'Invalid move format' });
      return;
    }

    const found = findRoomBySocketId(socket.id);
    if (!found) {
      socket.emit('room:error', { message: 'Not in a room' });
      return;
    }

    const { room, player } = found;

    if (room.status !== 'playing' || !room.gameState) {
      socket.emit('room:error', { message: 'Game is not in progress' });
      return;
    }

    const engine = getEngine(room.gameType);
    const move = { from, to };

    const error = engine.validateMove(room.gameState, player.id, move);
    if (error) {
      socket.emit('room:error', { message: error });
      return;
    }

    let newState;
    try {
      newState = engine.applyMove(room.gameState, player.id, move);
    } catch (err) {
      console.error(`[game:move] Engine error in ${room.gameType}:`, err);
      socket.emit('room:error', { message: 'Game engine error' });
      return;
    }
    room.gameState = newState;
    room.lastActivity = Date.now();

    // Send updated state to all players
    for (const p of room.players) {
      if (p.socketId) {
        io.to(p.socketId).emit('game:state', engine.getState(newState, p.id));
      }
    }

    // Check for winner
    let winResult;
    try {
      winResult = engine.checkWinner(newState);
    } catch (err) {
      console.error(`[game:move] Winner check error in ${room.gameType}:`, err);
      // Don't return — game state was already updated and sent to players
    }
    if (winResult && winResult.winner) {
      const stateObj = newState as Record<string, unknown>;
      stateObj.winner = winResult.winner;
      stateObj.winReason = winResult.reason ?? null;
      room.status = 'finished';

      const winnerId = winResult.winner;
      const winReason = winResult.reason ?? 'Game over';
      const winnerPlayer = room.players.find(p => p.id === winnerId);

      // Send final state
      for (const p of room.players) {
        if (p.socketId) {
          io.to(p.socketId).emit('game:state', engine.getState(newState, p.id));
        }
      }

      io.to(room.code).emit('game:over', {
        winner: winnerId,
        winnerName: winnerPlayer?.name || 'Unknown',
        reason: winReason,
      });

      addChatMessage(room, null, `Game over! ${winnerPlayer?.name} wins — ${winResult.reason}`, true);
      io.to(room.code).emit('chat:system', {
        text: `Game over! ${winnerPlayer?.name} wins — ${winResult.reason}`,
        timestamp: Date.now(),
      });
    }

    // Handle draw (winner is null but game is over)
    if (winResult && !winResult.winner) {
      room.status = 'finished';
      const drawReason = winResult.reason ?? 'Draw';

      for (const p of room.players) {
        if (p.socketId) {
          io.to(p.socketId).emit('game:state', engine.getState(newState, p.id));
        }
      }

      io.to(room.code).emit('game:over', {
        winner: '',
        winnerName: 'Draw',
        reason: drawReason,
      });

      addChatMessage(room, null, `Game over! ${drawReason}`, true);
      io.to(room.code).emit('chat:system', {
        text: `Game over! ${drawReason}`,
        timestamp: Date.now(),
      });
    }
  });

  // --- Game State Request (fallback for missed game:state) ---
  socket.on('game:request-state', () => {
    const found = findRoomBySocketId(socket.id);
    if (!found) return;

    const { room, player } = found;
    if (room.status === 'playing' && room.gameState) {
      const engine = getEngine(room.gameType);
      console.log(`[game:request-state] sending state to ${player.name}`);
      socket.emit('game:state', engine.getState(room.gameState, player.id));
    }
  });

  // --- Game Restart ---
  socket.on('game:restart', () => {
    const found = findRoomBySocketId(socket.id);
    if (!found) return;

    const { room, player } = found;
    if (room.players.length < 2) return;

    if (player.id !== room.creatorId) {
      socket.emit('room:error', { message: 'Only the room creator can restart the game' });
      return;
    }

    if (room.status !== 'finished') {
      socket.emit('room:error', { message: 'Game must be finished to restart' });
      return;
    }

    const engine = getEngine(room.gameType);
    const playerIds: [string, string] = [room.players[0].id, room.players[1].id];

    let gameState;
    try {
      gameState = engine.initGame(playerIds);
    } catch (err) {
      console.error(`[game:restart] Engine error in ${room.gameType}:`, err);
      socket.emit('room:error', { message: 'Failed to initialize game' });
      return;
    }
    room.gameState = gameState;
    room.status = 'playing';

    addChatMessage(room, null, 'New game started!', true);

    for (const p of room.players) {
      if (p.socketId) {
        io.to(p.socketId).emit('game:state', engine.getState(room.gameState, p.id));
      }
    }

    io.to(room.code).emit('game:started');
    io.to(room.code).emit('game:restarted');
    io.to(room.code).emit('chat:system', {
      text: 'New game started!',
      timestamp: Date.now(),
    });
  });

  // --- Chat ---
  socket.on('chat:message', ({ text }) => {
    if (isRateLimited(socket.id, 500)) return;
    if (!text || text.trim().length === 0 || text.trim().length > 500) return;

    const found = findRoomBySocketId(socket.id);
    if (!found) return;

    const { room, player } = found;
    const sanitizedText = text.trim();

    addChatMessage(room, player.name, sanitizedText, false);

    io.to(room.code).emit('chat:message', {
      playerName: player.name,
      text: sanitizedText,
      timestamp: Date.now(),
    });
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    lastEventTime.delete(socket.id);

    const result = disconnectPlayer(socket.id);
    if (!result) return;

    const { room, player } = result;

    addChatMessage(room, null, `${player.name} disconnected`, true);

    io.to(room.code).emit('room:player-disconnected', {
      playerName: player.name,
      players: getPlayersInfo(room),
    });

    io.to(room.code).emit('chat:system', {
      text: `${player.name} disconnected`,
      timestamp: Date.now(),
    });

    // Start forfeit timer if game is in progress
    if (room.status === 'playing') {
      const timerId = `${room.code}:${player.id}`;
      const timer = setTimeout(() => {
        disconnectTimers.delete(timerId);

        // Check if still disconnected
        const currentRoom = getRoom(room.code);
        if (!currentRoom) return;

        const disconnectedPlayer = currentRoom.players.find(p => p.id === player.id);
        if (!disconnectedPlayer || disconnectedPlayer.connected) return;

        // Forfeit — the other player wins
        const otherPlayer = currentRoom.players.find(p => p.id !== player.id);
        if (!otherPlayer) return;

        if (currentRoom.gameState && typeof currentRoom.gameState === 'object') {
          try {
            const state = currentRoom.gameState as Record<string, unknown>;
            state.winner = otherPlayer.id;
            state.winReason = `${player.name} disconnected (forfeit)`;
          } catch (err) {
            console.error(`[forfeit] Error updating game state:`, err);
          }
        }
        currentRoom.status = 'finished';

        addChatMessage(currentRoom, null, `${player.name} forfeited (disconnected for too long)`, true);

        io.to(currentRoom.code).emit('game:over', {
          winner: otherPlayer.id,
          winnerName: otherPlayer.name,
          reason: `${player.name} disconnected (forfeit)`,
        });

        io.to(currentRoom.code).emit('chat:system', {
          text: `${player.name} forfeited (disconnected for too long)`,
          timestamp: Date.now(),
        });
      }, 60_000); // 60 second timeout

      disconnectTimers.set(timerId, timer);
    }
  });
});

// Process-level error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
