'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';

// ---- Types ----

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  suit: Suit;
  rank: Rank;
}

interface PeggingPlay {
  playerId: string;
  card: Card;
}

interface CribbageViewState {
  phase: 'dealing' | 'discarding' | 'pegging' | 'counting' | 'finished';
  players: { 1: string; 2: string };
  dealer: 1 | 2;
  myPlayerNum: 1 | 2;
  myHand: Card[];
  myPeggingHand?: Card[];
  opponentHand: (Card | null)[];
  opponentCardCount: number;
  crib: Card[] | null;
  cribCount: number;
  starterCard: Card | null;
  peggingCards: PeggingPlay[];
  peggingTotal: number;
  peggingTurn: 1 | 2;
  scores: { 1: number; 2: number };
  discarded: { 1: boolean; 2: boolean };
  peggingGo: { 1: boolean; 2: boolean };
  winner: string | null;
  winReason: string | null;
  lastPeggingScore: string | null;
  countingPhaseStep: number;
  countingResult: string | null;
  countingHands?: { 1: Card[]; 2: Card[] };
  roundNumber: number;
}

interface CribbageBoardProps {
  gameState: CribbageViewState;
  playerId: string;
  onMove: (from: { row: number; col: number }, to: { row: number; col: number }) => void;
  onQuit: () => void;
}

// ---- Constants ----

const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
  spades: '\u2660',
};

const WINNING_SCORE = 121;

// Inject keyframes
const CRIBBAGE_STYLE_ID = 'cribbage-keyframes';
function ensureCribbageAnimations() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(CRIBBAGE_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = CRIBBAGE_STYLE_ID;
  style.textContent = `
    @keyframes cribbage-score-pop {
      0% { opacity: 0; transform: translateY(8px) scale(0.8); }
      20% { opacity: 1; transform: translateY(0) scale(1.1); }
      40% { transform: translateY(0) scale(1); }
      80% { opacity: 1; }
      100% { opacity: 0; transform: translateY(-12px); }
    }
    @keyframes cribbage-card-play {
      0% { transform: scale(0.9); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes cribbage-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.4); }
      50% { box-shadow: 0 0 0 6px rgba(250, 204, 21, 0); }
    }
  `;
  document.head.appendChild(style);
}

// ---- Helper Functions ----

function isRedSuit(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

function cardValue(card: Card): number {
  switch (card.rank) {
    case 'A': return 1;
    case '2': return 2;
    case '3': return 3;
    case '4': return 4;
    case '5': return 5;
    case '6': return 6;
    case '7': return 7;
    case '8': return 8;
    case '9': return 9;
    default: return 10;
  }
}

// ---- Sub-Components ----

function CardFace({
  card,
  size = 'normal',
  dimmed = false,
  highlighted = false,
  selected = false,
  onClick,
  interactive = false,
  pulsing = false,
}: {
  card: Card;
  size?: 'small' | 'normal' | 'large';
  dimmed?: boolean;
  highlighted?: boolean;
  selected?: boolean;
  onClick?: () => void;
  interactive?: boolean;
  pulsing?: boolean;
}) {
  const red = isRedSuit(card.suit);
  const symbol = SUIT_SYMBOLS[card.suit];

  const sizeClasses = {
    small: 'w-10 h-14 text-xs',
    normal: 'w-14 h-20 text-sm',
    large: 'w-16 h-24 text-base',
  };

  const suitSizeClasses = {
    small: 'text-lg',
    normal: 'text-2xl',
    large: 'text-3xl',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-lg relative flex flex-col items-center justify-between
        p-1 select-none transition-all duration-150
        ${dimmed ? 'opacity-40' : ''}
        ${selected
          ? 'bg-yellow-100 ring-2 ring-yellow-400 -translate-y-3 shadow-lg shadow-yellow-400/30'
          : highlighted
            ? 'bg-cream-50 ring-2 ring-green-400 shadow-md'
            : 'bg-cream-50 shadow-md'
        }
        ${interactive && !dimmed ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg active:translate-y-0' : ''}
        ${pulsing ? '' : ''}
        border border-gray-200
      `}
      style={pulsing ? { animation: 'cribbage-pulse 1.5s ease-in-out infinite' } : undefined}
      onClick={interactive && !dimmed ? onClick : undefined}
    >
      {/* Top-left rank + suit */}
      <div className={`self-start leading-none font-bold ${red ? 'text-red-600' : 'text-gray-900'}`}>
        <div className="text-[0.65em] leading-tight">{card.rank}</div>
        <div className="text-[0.55em] leading-tight">{symbol}</div>
      </div>

      {/* Center suit */}
      <div className={`${suitSizeClasses[size]} ${red ? 'text-red-600' : 'text-gray-900'} leading-none`}>
        {symbol}
      </div>

      {/* Bottom-right rank + suit (inverted) */}
      <div className={`self-end leading-none font-bold rotate-180 ${red ? 'text-red-600' : 'text-gray-900'}`}>
        <div className="text-[0.65em] leading-tight">{card.rank}</div>
        <div className="text-[0.55em] leading-tight">{symbol}</div>
      </div>
    </div>
  );
}

function CardBack({ size = 'normal' }: { size?: 'small' | 'normal' }) {
  const sizeClasses = {
    small: 'w-10 h-14',
    normal: 'w-14 h-20',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-lg shadow-md border border-blue-900
        bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900
        flex items-center justify-center select-none
      `}
    >
      <div className="w-[75%] h-[80%] rounded border border-blue-400/30 bg-blue-800/50 flex items-center justify-center">
        <div className="text-blue-300/40 text-lg font-serif">GWF</div>
      </div>
    </div>
  );
}

/**
 * Classic cribbage board with a prominent S-shaped carved groove.
 * Track winds: right → curves down → left → curves down → right → finish.
 * Two parallel rows per lane (one per player), holes in groups of 5.
 */
function CribbageBoardTrack({ score1, score2, myNum }: { score1: number; score2: number; myNum: 1 | 2 }) {
  const myScore = Math.min(myNum === 1 ? score1 : score2, 121);
  const oppScore = Math.min(myNum === 1 ? score2 : score1, 121);

  const W = 560;
  const H = 148;
  const HOLE_R = 2.3;
  const PEG_R = 3.6;
  const ROW_OFF = 4.5; // offset from lane center for each player's row

  // Lane center Y positions for the 3 streets
  const LY = [38, 74, 110];
  // Horizontal extent of holes in each lane
  const XL = 70;  // left edge of hole area
  const XR = 490; // right edge of hole area
  // Curve radii (half the vertical gap between lanes)
  const CR = (LY[1] - LY[0]) / 2; // 18

  // The continuous S-groove path (center line through the track)
  // Street 1: left to right, curve right, Street 2: right to left, curve left, Street 3: left to right
  const groovePath = [
    `M ${XL - 8},${LY[0]}`,          // start
    `L ${XR},${LY[0]}`,              // street 1 →
    `A ${CR},${CR} 0 0,1 ${XR},${LY[1]}`, // right curve ↓
    `L ${XL},${LY[1]}`,              // street 2 ←
    `A ${CR},${CR} 0 0,0 ${XL},${LY[2]}`, // left curve ↓
    `L ${XR + 8},${LY[2]}`,          // street 3 →
  ].join(' ');

  // Compute x for a position within a 40-hole street (0-39), in groups of 5
  function holeX(pos: number): number {
    const grp = Math.floor(pos / 5);
    const inGrp = pos % 5;
    const span = XR - XL;
    const grpW = (span - 7 * 7) / 8; // 8 groups, 7 inter-group gaps of 7px
    const hGap = grpW / 4;
    return XL + grp * (grpW + 7) + inGrp * hGap;
  }

  // Get pixel position for a score value and a player row offset
  function pegPos(score: number, yOff: number): { x: number; y: number } {
    if (score <= 0) return { x: XL - 14, y: LY[0] + yOff };
    if (score >= 121) return { x: XR + 14, y: LY[2] + yOff };

    const street = Math.ceil(score / 40) - 1;
    const pos = (score - 1) % 40;
    const rawX = holeX(pos);
    const y = LY[street] + yOff;
    // Street 0 & 2: left→right; Street 1: right→left (mirror)
    if (street === 1) {
      return { x: XL + (XR - rawX), y };
    }
    return { x: rawX, y };
  }

  // Build hole list
  const holes: { x: number; y: number; s: number; r: number }[] = [];
  for (let s = 1; s <= 120; s++) {
    const p1 = pegPos(s, -ROW_OFF);
    const p2 = pegPos(s, ROW_OFF);
    holes.push({ ...p1, s, r: 1 });
    holes.push({ ...p2, s, r: 2 });
  }

  const myPeg = pegPos(myScore, -ROW_OFF);
  const oppPeg = pegPos(oppScore, ROW_OFF);

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      {/* Score labels */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow border border-blue-300" />
          <span className="text-cream-100 font-semibold">You: <span className="text-blue-300">{myScore}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow border border-red-300" />
          <span className="text-cream-100 font-semibold">Opp: <span className="text-red-300">{oppScore}</span></span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl">
        <defs>
          {/* Board wood — warm maple */}
          <linearGradient id="cbW" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a06c" />
            <stop offset="40%" stopColor="#ba8d52" />
            <stop offset="100%" stopColor="#a07840" />
          </linearGradient>
          <linearGradient id="cbE" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a6030" />
            <stop offset="100%" stopColor="#6b4a25" />
          </linearGradient>
          {/* Groove channel — darker carved wood */}
          <linearGradient id="cbGrv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a5832" />
            <stop offset="50%" stopColor="#6b4a28" />
            <stop offset="100%" stopColor="#7a5832" />
          </linearGradient>
          <radialGradient id="cbH">
            <stop offset="0%" stopColor="#2e1608" />
            <stop offset="100%" stopColor="#5a3d22" />
          </radialGradient>
          <radialGradient id="cbPB" cx="0.35" cy="0.3" r="0.65">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </radialGradient>
          <radialGradient id="cbPR" cx="0.35" cy="0.3" r="0.65">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </radialGradient>
          <filter id="cbSh">
            <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
          </filter>
          <filter id="cbPS">
            <feDropShadow dx="0.3" dy="0.6" stdDeviation="0.6" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Board body */}
        <rect x="6" y="4" width={W - 12} height={H - 8} rx="30" ry="30"
          fill="url(#cbW)" filter="url(#cbSh)" />
        <rect x="6" y="4" width={W - 12} height={H - 8} rx="30" ry="30"
          fill="none" stroke="url(#cbE)" strokeWidth="2.5" />
        <rect x="10" y="8" width={W - 20} height={H - 16} rx="26" ry="26"
          fill="none" stroke="#d4a86a" strokeWidth="0.5" opacity="0.35" />

        {/* Wood grain */}
        {[18, 32, 48, 62, 78, 92, 108, 122, 136].map(y => (
          <line key={`g${y}`} x1="32" y1={y} x2={W - 32} y2={y + (y % 3 === 0 ? 0.5 : -0.3)}
            stroke="#8a6535" strokeWidth="0.35" opacity="0.18" />
        ))}

        {/* ===== S-SHAPED GROOVE ===== */}
        {/* Outer shadow of groove */}
        <path d={groovePath} fill="none" stroke="#4a3018" strokeWidth="22"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
        {/* Groove walls */}
        <path d={groovePath} fill="none" stroke="#6b4a28" strokeWidth="18"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
        {/* Groove floor (lighter) */}
        <path d={groovePath} fill="none" stroke="#8a6838" strokeWidth="14"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        {/* Groove inner highlight */}
        <path d={groovePath} fill="none" stroke="#c4a470" strokeWidth="10"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.08" />

        {/* Center divider within groove (separates player rows) */}
        <path d={groovePath} fill="none" stroke="#7a5832" strokeWidth="0.8"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />

        {/* Start label + holes */}
        <text x={XL - 14} y={LY[0] - 12} textAnchor="middle"
          fontSize="6" fill="#7a5530" fontWeight="bold" opacity="0.6">S</text>
        <circle cx={XL - 14} cy={LY[0] - ROW_OFF} r={HOLE_R + 0.3} fill="url(#cbH)" />
        <circle cx={XL - 14} cy={LY[0] + ROW_OFF} r={HOLE_R + 0.3} fill="url(#cbH)" />

        {/* Finish label + holes */}
        <text x={XR + 14} y={LY[2] - 12} textAnchor="middle"
          fontSize="6" fill="#7a5530" fontWeight="bold" opacity="0.6">F</text>
        <circle cx={XR + 14} cy={LY[2] - ROW_OFF} r={HOLE_R + 0.5} fill="url(#cbH)" />
        <circle cx={XR + 14} cy={LY[2] + ROW_OFF} r={HOLE_R + 0.5} fill="url(#cbH)" />

        {/* All track holes */}
        {holes.map(h => (
          <circle key={`h${h.r}-${h.s}`} cx={h.x} cy={h.y} r={HOLE_R} fill="url(#cbH)" />
        ))}

        {/* Score markers every 5 on street 1 */}
        {[5, 10, 15, 20, 25, 30, 35, 40].map(n => {
          const p = pegPos(n, ROW_OFF + 10);
          return <text key={`m${n}`} x={p.x} y={p.y} textAnchor="middle"
            fontSize="5" fill="#7a5530" opacity="0.45" fontWeight="bold">{n}</text>;
        })}

        {/* My peg (blue) */}
        <g filter="url(#cbPS)">
          <circle cx={myPeg.x} cy={myPeg.y} r={PEG_R} fill="url(#cbPB)" stroke="#1e3a8a" strokeWidth="0.7" />
          <ellipse cx={myPeg.x - 1} cy={myPeg.y - 1} rx="1.5" ry="1" fill="white" opacity="0.5" />
        </g>

        {/* Opponent peg (red) */}
        <g filter="url(#cbPS)">
          <circle cx={oppPeg.x} cy={oppPeg.y} r={PEG_R} fill="url(#cbPR)" stroke="#7f1d1d" strokeWidth="0.7" />
          <ellipse cx={oppPeg.x - 1} cy={oppPeg.y - 1} rx="1.5" ry="1" fill="white" opacity="0.45" />
        </g>
      </svg>
    </div>
  );
}

// ---- Main Component ----

export function CribbageBoard({ gameState, playerId, onMove, onQuit }: CribbageBoardProps) {
  const state = gameState as CribbageViewState;

  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [scoreFeedback, setScoreFeedback] = useState<string | null>(null);

  useEffect(() => {
    ensureCribbageAnimations();
  }, []);

  // Show pegging score feedback
  useEffect(() => {
    if (state.lastPeggingScore) {
      setScoreFeedback(state.lastPeggingScore);
      const timer = setTimeout(() => setScoreFeedback(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [state.lastPeggingScore]);

  // Reset selection when phase changes
  useEffect(() => {
    setSelectedCards([]);
  }, [state.phase, state.roundNumber]);

  const myNum = state.myPlayerNum;
  const oppNum = myNum === 1 ? 2 : 1;
  const isMyTurn = state.peggingTurn === myNum;
  const amDealer = state.dealer === myNum;
  const isGameOver = state.phase === 'finished';

  // Discarding logic
  const canDiscard = state.phase === 'discarding' && !state.discarded[myNum];

  const toggleCardSelection = useCallback(
    (idx: number) => {
      if (!canDiscard) return;
      setSelectedCards(prev => {
        if (prev.includes(idx)) {
          return prev.filter(i => i !== idx);
        }
        if (prev.length >= 2) return prev;
        return [...prev, idx];
      });
    },
    [canDiscard],
  );

  const handleDiscard = useCallback(() => {
    if (selectedCards.length !== 2) return;
    onMove(
      { row: selectedCards[0], col: selectedCards[1] },
      { row: 0, col: 0 },
    );
    setSelectedCards([]);
  }, [selectedCards, onMove]);

  // Pegging logic
  const myPeggingHand = state.myPeggingHand || [];

  const canPlayCard = useCallback(
    (card: Card): boolean => {
      if (state.phase !== 'pegging') return false;
      if (!isMyTurn) return false;
      return state.peggingTotal + cardValue(card) <= 31;
    },
    [state.phase, isMyTurn, state.peggingTotal],
  );

  const canPlayAnyCard = useMemo(() => {
    return myPeggingHand.some(card => canPlayCard(card));
  }, [myPeggingHand, canPlayCard]);

  const mustSayGo = state.phase === 'pegging' && isMyTurn && !canPlayAnyCard && myPeggingHand.length > 0;
  const showGoButton = state.phase === 'pegging' && isMyTurn && !canPlayAnyCard;

  const handlePlayCard = useCallback(
    (idx: number) => {
      if (state.phase !== 'pegging' || !isMyTurn) return;
      const card = myPeggingHand[idx];
      if (!card || !canPlayCard(card)) return;
      onMove({ row: idx, col: 0 }, { row: 0, col: 0 });
    },
    [state.phase, isMyTurn, myPeggingHand, canPlayCard, onMove],
  );

  const handleGo = useCallback(() => {
    onMove({ row: -1, col: 0 }, { row: 0, col: 0 });
  }, [onMove]);

  // Counting logic
  const handleCountingContinue = useCallback(() => {
    onMove({ row: 0, col: 0 }, { row: 0, col: 0 });
  }, [onMove]);

  const isMyCountingTurn = useMemo(() => {
    if (state.phase !== 'counting') return false;
    const nd = state.dealer === 1 ? 2 : 1;
    if (state.countingPhaseStep === 0) return myNum === nd;
    if (state.countingPhaseStep === 1 || state.countingPhaseStep === 2) return myNum === state.dealer;
    return false;
  }, [state.phase, state.countingPhaseStep, state.dealer, myNum]);

  // Phase description
  const phaseLabel = useMemo(() => {
    switch (state.phase) {
      case 'dealing':
        return 'Dealing cards...';
      case 'discarding':
        if (state.discarded[myNum]) return 'Waiting for opponent to discard...';
        return 'Select 2 cards to send to the crib';
      case 'pegging': {
        if (isMyTurn) {
          if (showGoButton) return "You can't play -- say Go";
          return 'Your turn to play a card';
        }
        return "Opponent's turn";
      }
      case 'counting': {
        const nd = state.dealer === 1 ? 2 : 1;
        if (state.countingPhaseStep === 0) {
          const label = nd === myNum ? 'Your' : "Opponent's";
          return `Counting ${label} hand (non-dealer)`;
        }
        if (state.countingPhaseStep === 1) {
          const label = state.dealer === myNum ? 'Your' : "Opponent's";
          return `Counting ${label} hand (dealer)`;
        }
        return 'Counting the crib';
      }
      case 'finished':
        return 'Game Over';
      default:
        return '';
    }
  }, [state.phase, state.discarded, myNum, isMyTurn, showGoButton, state.dealer, state.countingPhaseStep]);

  // Which hand is being shown during counting
  const countingDisplayHand = useMemo((): Card[] | null => {
    if (state.phase !== 'counting' || !state.countingHands) return null;
    const nd = state.dealer === 1 ? 2 : 1;
    if (state.countingPhaseStep === 0) return state.countingHands[nd];
    if (state.countingPhaseStep === 1) return state.countingHands[state.dealer];
    if (state.countingPhaseStep === 2) return state.crib;
    return null;
  }, [state.phase, state.countingPhaseStep, state.countingHands, state.dealer, state.crib]);

  // Determine which cards to show as "my hand"
  const displayHand = useMemo((): Card[] => {
    if (state.phase === 'pegging') return myPeggingHand;
    if (state.phase === 'discarding') return state.myHand;
    if (state.phase === 'counting' || state.phase === 'finished') {
      if (state.countingHands) return state.countingHands[myNum];
      return state.myHand;
    }
    return state.myHand;
  }, [state.phase, state.myHand, myPeggingHand, state.countingHands, myNum]);

  // Opponent display hand
  const oppDisplayHand = useMemo((): (Card | null)[] => {
    if (state.phase === 'counting' || state.phase === 'finished') {
      if (state.countingHands) return state.countingHands[oppNum];
    }
    // During pegging, show face-down cards based on remaining count
    if (state.phase === 'pegging') {
      return Array.from({ length: state.opponentCardCount }, () => null);
    }
    return state.opponentHand;
  }, [state.phase, state.opponentHand, state.opponentCardCount, state.countingHands, oppNum]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto">
      {/* Cribbage Board Score Track */}
      <CribbageBoardTrack score1={state.scores[1]} score2={state.scores[2]} myNum={myNum} />

      {/* Phase Indicator */}
      <div className="text-center">
        <div className="text-cream-100 font-semibold text-lg">{phaseLabel}</div>
        <div className="flex items-center justify-center gap-3 mt-1">
          <span className="text-wood-400 text-xs">
            Round {state.roundNumber}
          </span>
          <span className="text-wood-600 text-xs">|</span>
          <span className="text-wood-400 text-xs">
            {amDealer ? 'You are dealer' : 'Opponent is dealer'}
          </span>
        </div>
      </div>

      {/* Score Feedback */}
      {scoreFeedback && (
        <div
          className="text-yellow-300 font-bold text-lg text-center"
          style={{ animation: 'cribbage-score-pop 2.5s ease-out forwards' }}
        >
          {scoreFeedback}
        </div>
      )}

      {/* Main Table Area */}
      <div
        className="w-full rounded-2xl p-4 sm:p-6 space-y-4 border-2 border-green-900/60"
        style={{ background: 'radial-gradient(ellipse at center, #2d6a30 0%, #1a4a1d 60%, #0f2e11 100%)' }}
      >
        {/* Opponent's Hand */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-green-200/60 text-xs font-medium uppercase tracking-wide">
            Opponent {state.dealer === oppNum ? '(Dealer)' : ''}
          </span>
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {oppDisplayHand.map((card, idx) => (
              <div key={`opp-${idx}`}>
                {card ? (
                  <CardFace card={card} size="small" />
                ) : (
                  <CardBack size="small" />
                )}
              </div>
            ))}
            {oppDisplayHand.length === 0 && (
              <span className="text-green-300/40 text-xs italic">No cards</span>
            )}
          </div>
        </div>

        {/* Center Area: Starter + Crib + Pegging */}
        <div className="flex items-start justify-center gap-6 sm:gap-10 min-h-[120px]">
          {/* Crib */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-green-200/60 text-[10px] font-medium uppercase tracking-wide">
              Crib {amDealer ? '(yours)' : ''}
            </span>
            <div className="relative w-14 h-20">
              {state.crib && state.crib.length > 0 ? (
                // Show crib cards face up during counting step 2
                <div className="flex gap-0.5">
                  {state.crib.map((card, idx) => (
                    <div
                      key={`crib-${idx}`}
                      className="absolute"
                      style={{ left: idx * 4, top: idx * 1 }}
                    >
                      <CardFace card={card} size="small" />
                    </div>
                  ))}
                </div>
              ) : state.cribCount > 0 ? (
                // Face-down stack
                <>
                  {Array.from({ length: Math.min(state.cribCount, 4) }).map((_, i) => (
                    <div
                      key={`crib-back-${i}`}
                      className="absolute"
                      style={{ left: i * 2, top: i * 1 }}
                    >
                      <CardBack size="small" />
                    </div>
                  ))}
                </>
              ) : (
                <div className="w-10 h-14 rounded-lg border-2 border-dashed border-green-600/40 flex items-center justify-center">
                  <span className="text-green-500/30 text-[9px]">Crib</span>
                </div>
              )}
            </div>
          </div>

          {/* Starter Card */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-green-200/60 text-[10px] font-medium uppercase tracking-wide">Starter</span>
            {state.starterCard ? (
              <CardFace card={state.starterCard} size="normal" highlighted />
            ) : (
              <div className="w-14 h-20 rounded-lg border-2 border-dashed border-green-600/40 flex items-center justify-center">
                <span className="text-green-500/30 text-[10px]">Cut</span>
              </div>
            )}
          </div>

          {/* Pegging Area */}
          {state.phase === 'pegging' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-green-200/60 text-[10px] font-medium uppercase tracking-wide">
                Play ({state.peggingTotal})
              </span>
              <div className="flex items-end gap-0.5 flex-wrap max-w-[160px] min-h-[56px]">
                {state.peggingCards.length === 0 && (
                  <span className="text-green-300/30 text-xs italic">No cards played</span>
                )}
                {state.peggingCards.map((pc, idx) => (
                  <div
                    key={`peg-${idx}`}
                    style={idx === state.peggingCards.length - 1 ? { animation: 'cribbage-card-play 0.3s ease-out' } : undefined}
                  >
                    <CardFace
                      card={pc.card}
                      size="small"
                      highlighted={pc.playerId === playerId}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Counting Display */}
        {state.phase === 'counting' && countingDisplayHand && (
          <div className="flex flex-col items-center gap-2 bg-green-900/40 rounded-xl p-3 border border-green-700/40">
            <span className="text-green-200/80 text-xs font-medium uppercase tracking-wide">
              {state.countingPhaseStep === 0
                ? (state.dealer === myNum ? "Opponent's Hand" : 'Your Hand')
                : state.countingPhaseStep === 1
                  ? (state.dealer === myNum ? 'Your Hand' : "Opponent's Hand")
                  : 'The Crib'}
            </span>
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {countingDisplayHand.map((card, idx) => (
                <CardFace key={`count-${idx}`} card={card} size="normal" />
              ))}
              {state.starterCard && (
                <div className="ml-2 border-l-2 border-green-500/30 pl-2">
                  <CardFace card={state.starterCard} size="normal" highlighted />
                </div>
              )}
            </div>
            {state.countingResult && (
              <div className="text-yellow-300 text-sm font-semibold text-center mt-1">
                {state.countingResult}
              </div>
            )}
            {isMyCountingTurn && (
              <button
                onClick={handleCountingContinue}
                className="mt-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* My Hand */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-green-200/60 text-xs font-medium uppercase tracking-wide">
            Your Hand {amDealer ? '(Dealer)' : ''}
          </span>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {displayHand.map((card, idx) => {
              const isSelected = selectedCards.includes(idx);
              const canPlay = state.phase === 'pegging' && isMyTurn && canPlayCard(card);
              const cantPlay = state.phase === 'pegging' && isMyTurn && !canPlayCard(card);

              return (
                <div key={`my-${idx}-${card.rank}-${card.suit}`}>
                  <CardFace
                    card={card}
                    size="normal"
                    selected={isSelected}
                    dimmed={cantPlay}
                    interactive={canDiscard || canPlay}
                    pulsing={canPlay}
                    onClick={() => {
                      if (canDiscard) {
                        toggleCardSelection(idx);
                      } else if (canPlay) {
                        handlePlayCard(idx);
                      }
                    }}
                  />
                </div>
              );
            })}
            {displayHand.length === 0 && (
              <span className="text-green-300/40 text-xs italic">No cards remaining</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-1">
            {/* Discard Button */}
            {canDiscard && (
              <button
                onClick={handleDiscard}
                disabled={selectedCards.length !== 2}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg ${
                  selectedCards.length === 2
                    ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                    : 'bg-wood-700 text-wood-400 cursor-not-allowed'
                }`}
              >
                Discard {selectedCards.length}/2
              </button>
            )}

            {/* Waiting indicator after discarding */}
            {state.phase === 'discarding' && state.discarded[myNum] && (
              <span className="text-green-300/60 text-sm animate-pulse">
                Waiting for opponent...
              </span>
            )}

            {/* Go Button */}
            {showGoButton && (
              <button
                onClick={handleGo}
                className="px-5 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold text-sm transition-colors shadow-lg"
              >
                {mustSayGo ? 'Go!' : "Can't play -- Go"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Game Over Info */}
      {isGameOver && state.winReason && (
        <div className="text-center">
          <div className="text-yellow-400 font-bold text-lg">{state.winReason}</div>
          <div className="text-cream-200 text-sm mt-1">
            Final Score: You {state.scores[myNum]} - Opponent {state.scores[oppNum]}
          </div>
        </div>
      )}

      {/* Quit Button */}
      <div className="flex items-center gap-6">
        <button
          onClick={onQuit}
          className="px-4 py-1.5 text-sm rounded-lg bg-wood-800 hover:bg-wood-700 text-red-400 border border-wood-600 transition-colors"
        >
          Quit Game
        </button>
      </div>
    </div>
  );
}
