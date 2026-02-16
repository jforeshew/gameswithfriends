import { v4 as uuidv4 } from 'uuid';
import { Room, Player, GameType, ChatMessage } from '../types';

const rooms = new Map<string, Room>();
const socketIndex = new Map<string, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excluded confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Make sure the code is unique
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

export function createRoom(gameType: GameType, playerName: string): { room: Room; player: Player } {
  const code = generateRoomCode();
  const playerId = uuidv4();
  const sessionToken = uuidv4();

  const player: Player = {
    id: playerId,
    name: playerName,
    socketId: null,
    sessionToken,
    connected: true,
    disconnectedAt: null,
  };

  const room: Room = {
    code,
    gameType,
    status: 'waiting',
    players: [player],
    creatorId: playerId,
    gameState: null,
    chatMessages: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  rooms.set(code, room);
  return { room, player };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code: string, playerName: string): { room: Room; player: Player } | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 2) return { error: 'Room is full' };

  const playerId = uuidv4();
  const sessionToken = uuidv4();

  const player: Player = {
    id: playerId,
    name: playerName,
    socketId: null,
    sessionToken,
    connected: true,
    disconnectedAt: null,
  };

  room.players.push(player);
  room.lastActivity = Date.now();
  return { room, player };
}

export function reconnectPlayer(
  code: string,
  sessionToken: string
): { room: Room; player: Player } | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Room not found' };

  const player = room.players.find(p => p.sessionToken === sessionToken);
  if (!player) return { error: 'Session not found' };

  player.connected = true;
  player.disconnectedAt = null;
  room.lastActivity = Date.now();

  return { room, player };
}

export function disconnectPlayer(socketId: string): { room: Room; player: Player } | null {
  const entry = socketIndex.get(socketId);
  if (!entry) return null;

  const room = rooms.get(entry.roomCode);
  if (!room) {
    socketIndex.delete(socketId);
    return null;
  }

  const player = room.players.find(p => p.id === entry.playerId);
  if (!player) {
    socketIndex.delete(socketId);
    return null;
  }

  player.connected = false;
  player.disconnectedAt = Date.now();
  player.socketId = null;
  socketIndex.delete(socketId);
  room.lastActivity = Date.now();
  return { room, player };
}

export function removePlayerFromRoom(roomCode: string, playerId: string): Room | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players = room.players.filter(p => p.id !== playerId);
  room.lastActivity = Date.now();

  if (room.players.length === 0) {
    rooms.delete(roomCode);
    return null;
  }

  return room;
}

export function findRoomBySocketId(socketId: string): { room: Room; player: Player } | null {
  const entry = socketIndex.get(socketId);
  if (!entry) return null;

  const room = rooms.get(entry.roomCode);
  if (!room) {
    socketIndex.delete(socketId);
    return null;
  }

  const player = room.players.find(p => p.id === entry.playerId);
  if (!player) {
    socketIndex.delete(socketId);
    return null;
  }

  return { room, player };
}

export function updateSocketIndex(socketId: string, roomCode: string, playerId: string): void {
  socketIndex.set(socketId, { roomCode, playerId });
}

export function removeSocketIndex(socketId: string): void {
  socketIndex.delete(socketId);
}

export function addChatMessage(room: Room, playerName: string | null, text: string, isSystem: boolean): ChatMessage {
  const message: ChatMessage = {
    id: uuidv4(),
    playerName,
    text,
    timestamp: Date.now(),
    isSystem,
  };
  room.chatMessages.push(message);
  return message;
}

export function getPlayersInfo(room: Room) {
  return room.players.map(p => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
  }));
}

// Cleanup stale rooms every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const allDisconnected = room.players.every(p => !p.connected);
    if (allDisconnected && now - room.lastActivity > 5 * 60 * 1000) {
      // Clean up socket index entries for this room's players
      for (const player of room.players) {
        if (player.socketId) {
          socketIndex.delete(player.socketId);
        }
      }
      rooms.delete(code);
      console.log(`Cleaned up stale room: ${code}`);
    }
  }
}, 60_000);
