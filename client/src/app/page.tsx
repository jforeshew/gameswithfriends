'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSocket } from '@/hooks/useSocket';
import { useGame } from '@/hooks/useGame';
import { GameIcon } from '@/components/ui/GameIcons';

type View = 'home' | 'create' | 'join';

const GAMES = [
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

export default function Home() {
  const router = useRouter();
  const { socket } = useSocket();
  const { createRoom, joinRoom, roomCode, players, error } = useGame({ socket });

  const [view, setView] = useState<View>('home');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedGame, setSelectedGame] = useState('checkers');
  const [nameError, setNameError] = useState('');

  const validateName = (name: string): boolean => {
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setNameError('Name must be 3-20 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      setNameError('Name can only contain letters, numbers, and spaces');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleCreate = () => {
    if (!validateName(playerName)) return;
    createRoom(playerName.trim(), selectedGame);
  };

  const handleJoin = () => {
    if (!validateName(playerName)) return;
    if (joinCode.trim().length !== 6) {
      setNameError('Room code must be 6 characters');
      return;
    }
    router.push(`/${joinCode.trim().toUpperCase()}?name=${encodeURIComponent(playerName.trim())}`);
  };

  // Redirect once the room is fully created and joined
  if (roomCode && players.length > 0) {
    router.push(`/${roomCode}`);
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-cream-50 mb-3 tracking-tight">
            Your Turn
          </h1>
          <p className="text-wood-300 text-lg">
            Play classic board games together — no sign-up required
          </p>
        </div>

        {view === 'home' && (
          <>
            {/* Available Games */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-cream-200 mb-4 text-center">
                Choose a Game
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {GAMES.map(game => (
                  <button
                    key={game.id}
                    onClick={() => game.available && setSelectedGame(game.id)}
                    disabled={!game.available}
                    className={`
                      relative rounded-xl border p-5 text-center transition-all
                      ${
                        !game.available
                          ? 'bg-wood-900/30 border-wood-800 opacity-50 cursor-default'
                          : selectedGame === game.id
                            ? 'bg-wood-700/60 border-yellow-500 ring-2 ring-yellow-500/40 cursor-pointer'
                            : 'bg-wood-800/40 border-wood-600 hover:border-wood-400 hover:bg-wood-800/60 cursor-pointer'
                      }
                    `}
                  >
                    <div className="mb-2">
                      <GameIcon gameId={game.id} />
                    </div>
                    <h3 className="text-cream-100 font-medium mb-1">{game.name}</h3>
                    <p className="text-wood-400 text-xs">{game.description}</p>
                    {!game.available && (
                      <span className="absolute top-2 right-2 text-xs bg-wood-700 text-wood-400 px-2 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => setView('create')}>
                Create Room
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setView('join')}>
                Join Room
              </Button>
            </div>
          </>
        )}

        {view === 'create' && (
          <div className="max-w-sm mx-auto bg-wood-900/60 border border-wood-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-cream-100 mb-2">Create a Room</h2>
            <p className="text-wood-400 text-sm mb-6">
              Playing: <span className="text-cream-200 font-medium">{GAMES.find(g => g.id === selectedGame)?.name}</span>
            </p>

            {/* Name Input */}
            <div className="mb-6">
              <Input
                id="create-name"
                label="Your Display Name"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => {
                  setPlayerName(e.target.value);
                  setNameError('');
                }}
                maxLength={20}
              />
              {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={!playerName.trim()}>
                Create
              </Button>
              <Button variant="ghost" onClick={() => setView('home')}>
                Back
              </Button>
            </div>
          </div>
        )}

        {view === 'join' && (
          <div className="max-w-sm mx-auto bg-wood-900/60 border border-wood-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-cream-100 mb-6">Join a Room</h2>

            <div className="space-y-4 mb-6">
              <Input
                id="join-code"
                label="Room Code"
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={e => {
                  setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                  setNameError('');
                }}
                maxLength={6}
                className="text-center font-mono text-2xl tracking-widest uppercase"
              />
              <Input
                id="join-name"
                label="Your Display Name"
                placeholder="Enter your name"
                value={playerName}
                onChange={e => {
                  setPlayerName(e.target.value);
                  setNameError('');
                }}
                maxLength={20}
              />
              {nameError && <p className="text-red-400 text-sm mt-1">{nameError}</p>}
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <Button onClick={handleJoin} disabled={!playerName.trim() || joinCode.length !== 6}>
                Join
              </Button>
              <Button variant="ghost" onClick={() => setView('home')}>
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
