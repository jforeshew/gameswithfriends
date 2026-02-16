'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGame } from '@/hooks/useGame';
import { Board } from '@/components/game/Board';
import { ChessBoard } from '@/components/game/ChessBoard';
import { Connect4Board } from '@/components/game/Connect4Board';
import { ReversiBoard } from '@/components/game/ReversiBoard';
import { TicTacToeBoard } from '@/components/game/TicTacToeBoard';
import { GomokuBoard } from '@/components/game/GomokuBoard';
import { MancalaBoard } from '@/components/game/MancalaBoard';
import { DotsBoxesBoard } from '@/components/game/DotsBoxesBoard';
import { NavalBattleBoard } from '@/components/game/NavalBattleBoard';
import { GoBoard } from '@/components/game/GoBoard';
import { BackgammonBoard } from '@/components/game/BackgammonBoard';
import { CribbageBoard } from '@/components/game/CribbageBoard';
import { Chat } from '@/components/game/Chat';
import { GameLobby } from '@/components/game/GameLobby';
import { GameOverModal } from '@/components/game/GameOverModal';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { GameType } from '@/lib/types';
import { ComponentType } from 'react';

interface BoardProps {
  gameState: unknown;
  playerId: string;
  onMove: (from: { row: number; col: number }, to: { row: number; col: number }) => void;
  onQuit: () => void;
}

const BOARD_COMPONENTS: Record<GameType, ComponentType<BoardProps>> = {
  checkers: Board as ComponentType<BoardProps>,
  chess: ChessBoard as ComponentType<BoardProps>,
  connect4: Connect4Board as ComponentType<BoardProps>,
  reversi: ReversiBoard as ComponentType<BoardProps>,
  tictactoe: TicTacToeBoard as ComponentType<BoardProps>,
  gomoku: GomokuBoard as ComponentType<BoardProps>,
  mancala: MancalaBoard as ComponentType<BoardProps>,
  dotsboxes: DotsBoxesBoard as ComponentType<BoardProps>,
  navalbattle: NavalBattleBoard as ComponentType<BoardProps>,
  go: GoBoard as ComponentType<BoardProps>,
  backgammon: BackgammonBoard as ComponentType<BoardProps>,
  cribbage: CribbageBoard as ComponentType<BoardProps>,
};

export default function RoomPage({ params }: { params: Promise<{ roomCode: string }> }) {
  const { roomCode } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket, connected } = useSocket();
  const game = useGame({ socket });

  const [nameInput, setNameInput] = useState(searchParams.get('name') || '');
  const [hasJoined, setHasJoined] = useState(() => {
    // If we have cached game state for this room, consider ourselves joined
    const savedRoom = sessionStorage.getItem('roomCode');
    return savedRoom === roomCode.toUpperCase() && !!sessionStorage.getItem('sessionToken');
  });
  const [nameError, setNameError] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [checking, setChecking] = useState(() => {
    // Skip REST check if we have a session for this room
    const savedRoom = sessionStorage.getItem('roomCode');
    return !(savedRoom === roomCode.toUpperCase() && !!sessionStorage.getItem('sessionToken'));
  });

  const code = roomCode.toUpperCase();

  // Track previous connection state to detect reconnections
  const wasConnected = useRef(false);

  // Check if the room exists
  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
    fetch(`${serverUrl}/api/rooms/${code}`)
      .then(res => {
        if (!res.ok) {
          setRoomError('Room not found');
        }
        return res.json();
      })
      .then(data => {
        if (data.error) {
          setRoomError(data.error);
        } else if (data.isFull) {
          const savedRoom = sessionStorage.getItem('roomCode');
          const savedToken = sessionStorage.getItem('sessionToken');
          if (savedRoom === code && savedToken) {
            // This might be a reconnection, let socket handle it
          } else {
            setRoomError('Room is full');
          }
        }
      })
      .catch(() => {
        setRoomError('Could not connect to server');
      })
      .finally(() => {
        setChecking(false);
      });
  }, [code]);

  // Auto-join if we have a session token for this room (reconnection)
  useEffect(() => {
    if (!socket || !connected || hasJoined || checking) return;

    const savedRoom = sessionStorage.getItem('roomCode');
    const savedToken = sessionStorage.getItem('sessionToken');

    if (savedRoom === code && savedToken) {
      socket.emit('room:join', {
        roomCode: code,
        playerName: 'reconnecting',
        sessionToken: savedToken,
      });
      setHasJoined(true);
    }
  }, [socket, connected, code, hasJoined, checking]);

  // Also try auto-join if name is provided in URL
  useEffect(() => {
    if (!socket || !connected || hasJoined || checking || roomError) return;

    const urlName = searchParams.get('name');
    if (urlName && urlName.trim().length >= 3) {
      game.joinRoom(code, urlName.trim());
      setHasJoined(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, code, hasJoined, checking, roomError, searchParams]);

  // Re-join room when socket reconnects (e.g. after server restart)
  useEffect(() => {
    if (!socket) return;

    if (wasConnected.current && !connected) {
      // Just disconnected — nothing to do yet
    }

    if (!wasConnected.current && connected && hasJoined) {
      // Socket reconnected after a disconnect — re-join the room
      const savedToken = sessionStorage.getItem('sessionToken');
      const savedRoom = sessionStorage.getItem('roomCode');
      if (savedToken && savedRoom === code) {
        socket.emit('room:join', {
          roomCode: code,
          playerName: 'reconnecting',
          sessionToken: savedToken,
        });
      }
    }

    wasConnected.current = connected;
  }, [socket, connected, hasJoined, code]);

  // Track when we successfully join
  useEffect(() => {
    if (game.players.length > 0) {
      setHasJoined(true);
      game.setRoomCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.players, code]);

  const handleJoin = useCallback(() => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setNameError('Name must be 3-20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      setNameError('Only letters, numbers, and spaces');
      return;
    }
    game.joinRoom(code, trimmed);
    setHasJoined(true);
  }, [nameInput, code, game]);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleLeave = () => {
    if (game.roomStatus === 'playing' && !showLeaveConfirm) {
      setShowLeaveConfirm(true);
      return;
    }
    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('roomCode');
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('players');
    sessionStorage.removeItem('roomStatus');
    sessionStorage.removeItem('gameState');
    sessionStorage.removeItem('creatorId');
    sessionStorage.removeItem('gameType');
    router.push('/');
  };

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-wood-400 text-lg animate-pulse">Loading room...</div>
      </div>
    );
  }

  // Room error
  if (roomError && !hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-cream-100 mb-2">{roomError}</h2>
          <p className="text-wood-400 mb-6">
            {roomError === 'Room not found'
              ? 'This room does not exist or has expired.'
              : 'This room already has two players.'}
          </p>
          <Button onClick={() => router.push('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  // Join form (if not yet joined)
  if (!hasJoined || game.players.length === 0) {
    const isReconnecting = hasJoined && game.players.length === 0;

    if (isReconnecting) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-wood-400 text-lg animate-pulse">Connecting to room...</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-wood-900/60 border border-wood-700 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-cream-100 mb-2">Join Room</h2>
          <p className="text-wood-400 text-sm mb-6">
            Room code: <span className="font-mono font-bold text-cream-200">{code}</span>
          </p>

          <div className="mb-6">
            <Input
              id="join-name"
              label="Your Display Name"
              placeholder="Enter your name"
              value={nameInput}
              onChange={e => {
                setNameInput(e.target.value);
                setNameError('');
              }}
              maxLength={20}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
            {game.error && <p className="text-red-400 text-sm mt-1">{game.error}</p>}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleJoin} disabled={!nameInput.trim()}>
              Join Game
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // creatorId comes from the server via room:joined
  const creatorId = game.creatorId || game.players[0]?.id || '';

  // Determine opponent connection status
  const opponent = game.players.find(p => p.id !== game.playerId);
  const opponentDisconnected = opponent && !opponent.connected;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-wood-800 bg-wood-950/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-cream-100 font-bold text-lg hover:text-wood-300 transition-colors"
          >
            GWF
          </button>
          <span className="text-wood-500 text-sm">|</span>
          <span className="font-mono text-wood-300 text-sm tracking-wider">{code}</span>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus connected={connected} />
          <Button variant="ghost" size="sm" onClick={handleLeave}>
            Leave
          </Button>
        </div>
      </header>

      {/* Error banner */}
      {game.error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-center text-red-200 text-sm">
          {game.error}
        </div>
      )}

      {/* Disconnection banner */}
      {opponentDisconnected && game.roomStatus === 'playing' && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 px-4 py-2 text-center text-yellow-200 text-sm">
          {opponent.name} disconnected — waiting for reconnection (forfeit in 60s)...
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4">
        {game.roomStatus === 'waiting' && (
          <div className="py-8">
            <GameLobby
              roomCode={code}
              players={game.players}
              playerId={game.playerId || ''}
              creatorId={creatorId}
              gameType={game.gameType}
              onStart={game.startGame}
            />
          </div>
        )}

        {(game.roomStatus === 'playing' || game.roomStatus === 'finished') && game.gameState && (
          <div className="flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto">
            {/* Game Board */}
            <div className="flex-1 flex items-start justify-center">
              <ErrorBoundary>
                {(() => {
                  const gameType = game.gameType || 'checkers';
                  const BoardComponent = BOARD_COMPONENTS[gameType as GameType];
                  if (!BoardComponent) return null;
                  return (
                    <BoardComponent
                      gameState={game.gameState}
                      playerId={game.playerId || ''}
                      onMove={game.makeMove}
                      onQuit={handleLeave}
                    />
                  );
                })()}
              </ErrorBoundary>
            </div>

            {/* Chat */}
            <div className="lg:w-80 shrink-0">
              <Chat
                messages={game.chatMessages}
                onSend={game.sendMessage}
                isCollapsed={chatCollapsed}
                onToggle={() => setChatCollapsed(!chatCollapsed)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <Modal open={true}>
          <div className="text-center">
            <h2 className="text-xl font-bold text-cream-100 mb-3">Leave Game?</h2>
            <p className="text-cream-200 text-sm mb-6">
              This will end the game for both players. Are you sure you want to leave?
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeave();
                }}
              >
                Yes, Leave
              </Button>
              <Button variant="secondary" onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Game Over Modal */}
      {game.gameOver && (
        <GameOverModal
          open={true}
          winnerName={game.gameOver.winnerName}
          reason={game.gameOver.reason}
          isWinner={game.gameOver.winner === game.playerId}
          onPlayAgain={game.restartGame}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
