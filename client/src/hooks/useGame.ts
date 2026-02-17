'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import {
  GameType,
  PlayerInfo,
  ChatMessage,
  RoomStatus,
  Position,
} from '@/lib/types';

interface GameOverData {
  winner: string;
  winnerName: string;
  reason: string;
}

interface UseGameOptions {
  socket: Socket | null;
}

const isBrowser = typeof window !== 'undefined';

function loadCached<T>(key: string): T | null {
  if (!isBrowser) return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadString(key: string): string | null {
  if (!isBrowser) return null;
  return sessionStorage.getItem(key);
}

function saveCache(key: string, value: unknown) {
  if (!isBrowser) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function useGame({ socket }: UseGameOptions) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(
    () => loadString('playerId'),
  );
  const [creatorId, setCreatorId] = useState<string | null>(
    () => loadCached<string>('creatorId'),
  );
  const [players, setPlayers] = useState<PlayerInfo[]>(
    () => loadCached<PlayerInfo[]>('players') || [],
  );
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(
    () => loadCached<RoomStatus>('roomStatus') || 'waiting',
  );
  const [gameType, setGameType] = useState<GameType | null>(
    () => loadCached<GameType>('gameType'),
  );
  const [gameState, setGameState] = useState<unknown>(
    () => loadCached<unknown>('gameState'),
  );
  const [gameOver, setGameOver] = useState<GameOverData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [switchingGame, setSwitchingGame] = useState(false);
  const switchStartRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Store handler references so cleanup only removes OUR handlers
  const handlersRef = useRef<Record<string, (...args: any[]) => void>>({});

  useEffect(() => {
    if (!socket) return;

    const handlers: Record<string, (...args: any[]) => void> = {
      'room:created': ({ roomCode: code, playerId: pid, sessionToken }: {
        roomCode: string; playerId: string; sessionToken: string;
      }) => {
        setRoomCode(code);
        setPlayerId(pid);
        if (isBrowser) {
          sessionStorage.setItem('sessionToken', sessionToken);
          sessionStorage.setItem('roomCode', code);
          sessionStorage.setItem('playerId', pid);
        }
      },

      'room:joined': (data: {
        players: PlayerInfo[];
        playerId: string;
        sessionToken: string;
        roomStatus: RoomStatus;
        creatorId: string;
        gameType: GameType;
      }) => {
        setPlayers(data.players);
        setPlayerId(data.playerId);
        setRoomStatus(data.roomStatus);
        setCreatorId(data.creatorId);
        if (data.gameType) {
          setGameType(data.gameType);
          saveCache('gameType', data.gameType);
        }
        if (isBrowser) {
          sessionStorage.setItem('sessionToken', data.sessionToken);
          sessionStorage.setItem('playerId', data.playerId);
        }
        saveCache('players', data.players);
        saveCache('roomStatus', data.roomStatus);
        saveCache('creatorId', data.creatorId);
      },

      'room:player-joined': ({ players: p }: { players: PlayerInfo[] }) => {
        setPlayers(p);
        saveCache('players', p);
      },

      'room:player-left': ({ players: p }: { players: PlayerInfo[] }) => {
        setPlayers(p);
        saveCache('players', p);
      },

      'room:player-reconnected': ({ players: p }: { players: PlayerInfo[] }) => {
        setPlayers(p);
        saveCache('players', p);
      },

      'room:player-disconnected': ({ players: p }: { players: PlayerInfo[] }) => {
        setPlayers(p);
        saveCache('players', p);
      },

      'room:error': ({ message }: { message: string }) => {
        setError(message);
        setTimeout(() => setError(null), 4000);
      },

      'game:state': (state: unknown) => {
        setGameState(state);
        setRoomStatus('playing');
        saveCache('gameState', state);
        saveCache('roomStatus', 'playing');

        // Ensure switching screen shows for at least 600ms
        const elapsed = Date.now() - switchStartRef.current;
        if (switchStartRef.current > 0 && elapsed < 600) {
          setTimeout(() => {
            setSwitchingGame(false);
            switchStartRef.current = 0;
          }, 600 - elapsed);
        } else {
          setSwitchingGame(false);
          switchStartRef.current = 0;
        }
      },

      'game:started': () => {
        // Reliable room-level broadcast that the game has started.
        // If we haven't received game:state yet, request it.
        setRoomStatus('playing');
        saveCache('roomStatus', 'playing');
        setGameState((current: unknown) => {
          if (!current) {
            // We missed the individual game:state — request it
            socket.emit('game:request-state');
          }
          return current;
        });
      },

      'game:over': (data: unknown) => {
        setGameOver(data as GameOverData);
        setRoomStatus('finished');
      },

      'game:restarted': (data?: { gameType?: string }) => {
        setGameOver(null);
        if (data?.gameType) {
          // Clear old game state before switching board component
          setGameState(null);
          setGameType(data.gameType as GameType);
          saveCache('gameType', data.gameType);
          if (!switchStartRef.current) {
            switchStartRef.current = Date.now();
          }
          setSwitchingGame(true);
        }
      },

      'chat:message': (msg: unknown) => {
        const m = msg as { playerName: string; text: string; timestamp: number };
        setChatMessages(prev => [...prev, { ...m, isSystem: false }]);
      },

      'chat:system': (msg: unknown) => {
        const m = msg as { text: string; timestamp: number };
        setChatMessages(prev => [...prev, { ...m, playerName: null, isSystem: true }]);
      },

      'chat:history': (history: unknown) => {
        setChatMessages(history as ChatMessage[]);
      },
    };

    // Attach all handlers
    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler);
    }
    handlersRef.current = handlers;

    // Cleanup: only remove OUR specific handler references
    return () => {
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler);
      }
      handlersRef.current = {};
    };
  }, [socket]);

  const createRoom = useCallback(
    (playerName: string, gameType: string) => {
      if (!socket) return;
      socket.emit('room:create', { playerName, gameType });
    },
    [socket],
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      if (!socket) return;
      const sessionToken = isBrowser ? sessionStorage.getItem('sessionToken') : null;
      const savedRoom = isBrowser ? sessionStorage.getItem('roomCode') : null;

      if (sessionToken && savedRoom === code.toUpperCase()) {
        socket.emit('room:join', { roomCode: code, playerName, sessionToken });
      } else {
        socket.emit('room:join', { roomCode: code, playerName });
      }
    },
    [socket],
  );

  const makeMove = useCallback(
    (from: Position, to: Position) => {
      if (!socket) return;
      socket.emit('game:move', { from, to });
    },
    [socket],
  );

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit('game:start');
  }, [socket]);

  const restartGame = useCallback(() => {
    if (!socket) return;
    socket.emit('game:restart');
  }, [socket]);

  const switchGame = useCallback(
    (gameType: string) => {
      if (!socket) return;
      switchStartRef.current = Date.now();
      setSwitchingGame(true);
      socket.emit('game:switch-game', { gameType });
    },
    [socket],
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket) return;
      socket.emit('chat:message', { text });
    },
    [socket],
  );

  return {
    roomCode,
    setRoomCode,
    playerId,
    creatorId,
    players,
    roomStatus,
    gameType,
    gameState,
    gameOver,
    switchingGame,
    chatMessages,
    error,
    createRoom,
    joinRoom,
    makeMove,
    startGame,
    restartGame,
    switchGame,
    sendMessage,
  };
}
