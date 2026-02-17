'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameIcon } from '@/components/ui/GameIcons';
import { GAMES } from '@/lib/games';

interface GameOverModalProps {
  open: boolean;
  winnerName: string;
  reason: string;
  isWinner: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
  onSwitchGame?: (gameType: string) => void;
  currentGameType?: string;
  isCreator?: boolean;
}

export function GameOverModal({
  open,
  winnerName,
  reason,
  isWinner,
  onPlayAgain,
  onLeave,
  onSwitchGame,
  currentGameType,
  isCreator,
}: GameOverModalProps) {
  const [showPicker, setShowPicker] = useState(false);

  if (showPicker && onSwitchGame) {
    return (
      <Modal open={open}>
        <div className="text-center">
          <h2 className="text-xl font-bold text-cream-100 mb-4">Choose a Game</h2>
          <div className="grid grid-cols-3 gap-2 mb-4 max-h-[60vh] overflow-y-auto">
            {GAMES.filter(g => g.available).map(game => (
              <button
                key={game.id}
                onClick={() => {
                  if (game.id !== currentGameType) {
                    onSwitchGame(game.id);
                  }
                }}
                className={`
                  rounded-lg border p-3 text-center transition-all
                  ${
                    game.id === currentGameType
                      ? 'bg-wood-700/60 border-wood-500 opacity-50 cursor-default'
                      : 'bg-wood-800/40 border-wood-600 hover:border-yellow-500 hover:bg-wood-700/60 cursor-pointer'
                  }
                `}
              >
                <div className="mb-1 [&_svg]:w-10 [&_svg]:h-10">
                  <GameIcon gameId={game.id} />
                </div>
                <p className="text-cream-100 text-xs font-medium">{game.name}</p>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowPicker(false)}>
            Back
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open}>
      <div className="text-center">
        <div className="text-5xl mb-4">{isWinner ? '🎉' : '😔'}</div>
        <h2 className="text-2xl font-bold text-cream-100 mb-2">
          {isWinner ? 'You Win!' : 'You Lose'}
        </h2>
        <p className="text-cream-200 mb-1">{winnerName} wins!</p>
        <p className="text-wood-400 text-sm mb-8">{reason}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {isCreator && <Button onClick={onPlayAgain}>Play Again</Button>}
          {isCreator && onSwitchGame && (
            <Button variant="secondary" onClick={() => setShowPicker(true)}>
              Different Game
            </Button>
          )}
          {!isCreator && (
            <p className="text-wood-400 text-sm mb-2">Waiting for host to start next game...</p>
          )}
          <Button variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>
    </Modal>
  );
}
