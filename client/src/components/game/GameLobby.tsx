'use client';

import { useState } from 'react';
import { PlayerInfo, GameType } from '@/lib/types';
import { Button } from '@/components/ui/Button';

const GAME_RULES: Record<string, { name: string; rules: string[] }> = {
  checkers: {
    name: 'Checkers',
    rules: [
      'Players take turns moving pieces diagonally on dark squares.',
      'Regular pieces move forward only; kings can move in any diagonal direction.',
      'Capture opponent pieces by jumping over them diagonally.',
      'If a capture is available, you must take it.',
      'Multi-jumps: if another capture is available after jumping, you must continue.',
      'Reach the opposite end of the board to promote a piece to a king.',
      'Win by capturing all opponent pieces or leaving them with no legal moves.',
    ],
  },
  chess: {
    name: 'Chess',
    rules: [
      'Each piece type moves differently: pawns forward, rooks in lines, knights in L-shapes, bishops diagonally, queens any direction, kings one square.',
      'Capture opponent pieces by moving onto their square.',
      'Pawns promote to a queen when they reach the opposite end.',
      'Castling: move the king two squares toward a rook to swap them (neither can have moved, no pieces between, king not in or through check).',
      'En passant: capture a pawn that just moved two squares by moving diagonally behind it.',
      'Check: your king is under attack. You must escape check on your next move.',
      'Checkmate: your king is in check with no escape — you lose.',
      'Stalemate (no legal moves but not in check) is a draw.',
    ],
  },
  connect4: {
    name: 'Four in a Row',
    rules: [
      'Players take turns dropping a colored disc into one of 7 columns.',
      'Pieces fall to the lowest available space in the column.',
      'The first player to connect 4 discs in a row wins — horizontally, vertically, or diagonally.',
      'If the board fills up with no winner, the game is a draw.',
      'Red always goes first.',
    ],
  },
  reversi: {
    name: 'Reversi',
    rules: [
      'Players take turns placing a disc on the board.',
      'You must place your disc so that it sandwiches at least one row of opponent discs between your new disc and another of your discs.',
      'All sandwiched opponent discs are flipped to your color — horizontally, vertically, and diagonally.',
      'If you have no valid moves, your turn is skipped.',
      'The game ends when neither player can move or the board is full.',
      'The player with the most discs on the board wins.',
      'Black always goes first.',
    ],
  },
  tictactoe: {
    name: 'Tic-Tac-Toe',
    rules: [
      'Players take turns placing their mark (X or O) on a 3x3 grid.',
      'The first player to get three marks in a row wins — horizontally, vertically, or diagonally.',
      'If all nine squares are filled with no winner, the game is a draw.',
      'X always goes first.',
    ],
  },
  gomoku: {
    name: 'Gomoku',
    rules: [
      'Players take turns placing a stone on a 15x15 board.',
      'The first player to get exactly five stones in a row wins — horizontally, vertically, or diagonally.',
      'Black always goes first.',
      'Strategy tip: control the center and build multiple threats at once.',
    ],
  },
  mancala: {
    name: 'Mancala',
    rules: [
      'Each player has 6 pits and a store (mancala) on their right side.',
      'On your turn, pick up all stones from one of your pits and sow them counter-clockwise, one per pit.',
      'Include your own store when sowing, but skip your opponent\'s store.',
      'If your last stone lands in your store, you get another turn.',
      'If your last stone lands in an empty pit on your side, capture that stone and all stones in the opposite pit.',
      'The game ends when one side is completely empty. Remaining stones go to that player\'s opponent.',
      'The player with the most stones in their store wins.',
    ],
  },
  dotsboxes: {
    name: 'Dots & Boxes',
    rules: [
      'Players take turns drawing a line between two adjacent dots on a grid.',
      'When you complete the fourth side of a box, you claim it and get a bonus turn.',
      'The game ends when all lines have been drawn.',
      'The player who claimed the most boxes wins.',
      'Strategy tip: avoid giving your opponent easy boxes by being careful about drawing third sides.',
    ],
  },
  navalbattle: {
    name: 'Naval Battle',
    rules: [
      'Each player has a fleet of ships placed randomly on a 10x10 grid.',
      'Players take turns firing at coordinates on the opponent\'s grid.',
      'A hit is marked when you strike a ship; a miss when you hit open water.',
      'When all squares of a ship are hit, it is sunk.',
      'The first player to sink all of the opponent\'s ships wins.',
      'You cannot see your opponent\'s ships until you hit them.',
    ],
  },
  go: {
    name: 'Go',
    rules: [
      'Two players (Black and White) take turns placing stones on empty intersections of a 9x9 grid.',
      'Black always plays first.',
      'A group of connected stones is captured and removed when it has no empty adjacent intersections (liberties).',
      'Suicide is not allowed: you cannot place a stone that would have no liberties, unless it captures opponent stones.',
      'Ko rule: you cannot make a move that recreates the exact previous board position.',
      'You may pass your turn instead of placing a stone.',
      'The game ends when both players pass consecutively.',
      'Scoring uses Chinese area rules: count your stones on the board plus empty territory you surround. White receives 6.5 komi (compensation for going second).',
    ],
  },
  backgammon: {
    name: 'Backgammon',
    rules: [
      'Each player has 15 checkers that move along 24 points based on dice rolls.',
      'Roll two dice at the start of your turn. Doubles give you 4 moves instead of 2.',
      'Move your checkers toward your home board, then bear them off.',
      'You cannot land on a point occupied by 2 or more opponent checkers.',
      'Landing on a single opponent checker sends it to the bar — it must re-enter before other moves.',
      'When all your checkers are in your home board, you can start bearing them off.',
      'The first player to bear off all 15 checkers wins.',
    ],
  },
  cribbage: {
    name: 'Cribbage',
    rules: [
      'Each player is dealt 6 cards and discards 2 to the crib (belongs to the dealer).',
      'A starter card is cut from the deck. If it\'s a Jack, the dealer scores 2 points.',
      'Pegging: players alternate playing cards, keeping a running total up to 31. Score points for 15s, 31s, pairs, and runs.',
      'If you can\'t play without exceeding 31, say "Go" — opponent gets 1 point and the count resets.',
      'After pegging, count your hand: 15s (2 pts), pairs (2 pts), runs (length), flushes (4-5 pts), and nobs (Jack of starter suit, 1 pt).',
      'Non-dealer counts first, then dealer, then dealer counts the crib.',
      'First player to reach 121 points wins — even mid-count!',
    ],
  },
};

interface GameLobbyProps {
  roomCode: string;
  players: PlayerInfo[];
  playerId: string;
  creatorId: string;
  gameType: string | null;
  onStart: () => void;
}

export function GameLobby({ roomCode, players, playerId, creatorId, gameType, onStart }: GameLobbyProps) {
  const [copied, setCopied] = useState(false);
  const isCreator = playerId === creatorId;
  const canStart = players.length === 2;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${roomCode}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto">
      <h2 className="text-3xl font-bold text-cream-100">Game Lobby</h2>

      {/* Room Code */}
      <div className="text-center">
        <p className="text-wood-300 text-sm mb-2">Room Code</p>
        <div className="text-5xl font-mono font-bold text-cream-50 tracking-widest mb-3">
          {roomCode}
        </div>
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Join Link'}
        </Button>
      </div>

      {/* Players */}
      <div className="w-full bg-wood-900/60 rounded-xl border border-wood-700 p-6">
        <h3 className="text-lg font-semibold text-cream-100 mb-4">Players</h3>
        <div className="space-y-3">
          {/* Player 1 */}
          <div className="flex items-center gap-3 bg-wood-800/50 rounded-lg p-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-cream-100 font-medium">{players[0]?.name}</span>
            {players[0]?.id === creatorId && (
              <span className="text-xs bg-wood-600 text-cream-200 px-2 py-0.5 rounded-full ml-auto">
                Host
              </span>
            )}
          </div>

          {/* Player 2 */}
          {players.length >= 2 ? (
            <div className="flex items-center gap-3 bg-wood-800/50 rounded-lg p-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-cream-100 font-medium">{players[1]?.name}</span>
              {players[1]?.id === creatorId && (
                <span className="text-xs bg-wood-600 text-cream-200 px-2 py-0.5 rounded-full ml-auto">
                  Host
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-wood-800/30 rounded-lg p-3 border border-dashed border-wood-600">
              <div className="w-3 h-3 rounded-full bg-wood-600 animate-pulse" />
              <span className="text-wood-400 italic">Waiting for opponent...</span>
            </div>
          )}
        </div>
      </div>

      {/* Game Rules */}
      {gameType && GAME_RULES[gameType] && (
        <div className="w-full bg-wood-900/60 rounded-xl border border-wood-700 p-6">
          <h3 className="text-lg font-semibold text-cream-100 mb-3">
            How to Play {GAME_RULES[gameType].name}
          </h3>
          <ul className="space-y-2">
            {GAME_RULES[gameType].rules.map((rule, i) => (
              <li key={i} className="flex gap-2 text-sm text-cream-200/80">
                <span className="text-wood-400 shrink-0">{i + 1}.</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Start button */}
      {isCreator && (
        <Button size="lg" onClick={onStart} disabled={!canStart}>
          {canStart ? 'Start Game' : 'Waiting for another player...'}
        </Button>
      )}
      {!isCreator && (
        <p className="text-wood-400 text-sm">Waiting for the host to start the game...</p>
      )}
    </div>
  );
}
