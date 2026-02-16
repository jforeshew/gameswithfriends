'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface GameOverModalProps {
  open: boolean;
  winnerName: string;
  reason: string;
  isWinner: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function GameOverModal({
  open,
  winnerName,
  reason,
  isWinner,
  onPlayAgain,
  onLeave,
}: GameOverModalProps) {
  return (
    <Modal open={open}>
      <div className="text-center">
        <div className="text-5xl mb-4">{isWinner ? '🎉' : '😔'}</div>
        <h2 className="text-2xl font-bold text-cream-100 mb-2">
          {isWinner ? 'You Win!' : 'You Lose'}
        </h2>
        <p className="text-cream-200 mb-1">{winnerName} wins!</p>
        <p className="text-wood-400 text-sm mb-8">{reason}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={onPlayAgain}>Play Again</Button>
          <Button variant="secondary" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>
    </Modal>
  );
}
