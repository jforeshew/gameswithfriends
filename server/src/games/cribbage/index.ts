import { GameEngine } from '../../types';

// ---- Card Types ----

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type CribbagePhase = 'dealing' | 'discarding' | 'pegging' | 'counting' | 'finished';

export interface CribbageState {
  phase: CribbagePhase;
  players: { 1: string; 2: string };
  dealer: 1 | 2;
  hands: { 1: Card[]; 2: Card[] };
  originalHands: { 1: Card[]; 2: Card[] }; // saved for counting phase
  crib: Card[];
  starterCard: Card | null;
  deck: Card[];
  peggingCards: { playerId: string; card: Card }[];
  peggingTotal: number;
  peggingTurn: 1 | 2;
  scores: { 1: number; 2: number };
  discarded: { 1: boolean; 2: boolean };
  pendingDiscards: { 1: Card[] | null; 2: Card[] | null };
  peggingGo: { 1: boolean; 2: boolean };
  peggingHands: { 1: Card[]; 2: Card[] }; // cards remaining during pegging
  winner: string | null;
  winReason: string | null;
  lastPeggingScore: string | null;
  countingPhaseStep: number; // 0=non-dealer hand, 1=dealer hand, 2=crib
  countingResult: string | null; // description of counting score for UI
  roundNumber: number;
}

export interface CribbageMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

// ---- Constants ----

const WINNING_SCORE = 121;

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// ---- Helper Functions ----

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
    case '10': case 'J': case 'Q': case 'K': return 10;
  }
}

function rankOrder(rank: Rank): number {
  return RANKS.indexOf(rank);
}

function cardEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

function cloneCard(card: Card): Card {
  return { suit: card.suit, rank: card.rank };
}

function cloneCards(cards: Card[]): Card[] {
  return cards.map(cloneCard);
}

function getPlayerNum(state: CribbageState, playerId: string): 1 | 2 | null {
  if (state.players[1] === playerId) return 1;
  if (state.players[2] === playerId) return 2;
  return null;
}

function otherPlayer(p: 1 | 2): 1 | 2 {
  return p === 1 ? 2 : 1;
}

function nonDealer(state: CribbageState): 1 | 2 {
  return otherPlayer(state.dealer);
}

function dealCards(state: CribbageState): CribbageState {
  const deck = shuffleDeck(createDeck());
  const hand1: Card[] = [];
  const hand2: Card[] = [];

  // Deal 6 cards to each player, alternating, starting with non-dealer
  const first = nonDealer(state);
  const second = state.dealer;

  for (let i = 0; i < 6; i++) {
    if (first === 1) {
      hand1.push(deck.pop()!);
      hand2.push(deck.pop()!);
    } else {
      hand2.push(deck.pop()!);
      hand1.push(deck.pop()!);
    }
  }

  return {
    ...state,
    phase: 'discarding',
    hands: { 1: hand1, 2: hand2 },
    originalHands: { 1: [], 2: [] },
    crib: [],
    starterCard: null,
    deck,
    peggingCards: [],
    peggingTotal: 0,
    peggingTurn: nonDealer(state),
    discarded: { 1: false, 2: false },
    pendingDiscards: { 1: null, 2: null },
    peggingGo: { 1: false, 2: false },
    peggingHands: { 1: [], 2: [] },
    lastPeggingScore: null,
    countingPhaseStep: 0,
    countingResult: null,
  };
}

function addScore(state: CribbageState, playerNum: 1 | 2, points: number): CribbageState {
  const newScores = { ...state.scores };
  newScores[playerNum] = Math.min(newScores[playerNum] + points, WINNING_SCORE);

  const newState = { ...state, scores: newScores };

  if (newScores[playerNum] >= WINNING_SCORE) {
    newState.winner = state.players[playerNum];
    newState.winReason = `Reached ${WINNING_SCORE} points!`;
    newState.phase = 'finished';
  }

  return newState;
}

// ---- Pegging Scoring ----

/** Check for pairs/trips/quads at the end of the pegging sequence */
function scorePeggingPairs(peggingCards: { playerId: string; card: Card }[]): { points: number; desc: string } {
  if (peggingCards.length < 2) return { points: 0, desc: '' };

  const lastRank = peggingCards[peggingCards.length - 1].card.rank;
  let count = 0;

  for (let i = peggingCards.length - 1; i >= 0; i--) {
    if (peggingCards[i].card.rank === lastRank) {
      count++;
    } else {
      break;
    }
  }

  if (count >= 4) return { points: 12, desc: 'Four of a kind for 12!' };
  if (count >= 3) return { points: 6, desc: 'Three of a kind for 6!' };
  if (count >= 2) return { points: 2, desc: 'Pair for 2!' };
  return { points: 0, desc: '' };
}

/** Check for runs at the end of the pegging sequence */
function scorePeggingRuns(peggingCards: { playerId: string; card: Card }[]): { points: number; desc: string } {
  if (peggingCards.length < 3) return { points: 0, desc: '' };

  // Try longest possible run first (from the end of played cards)
  for (let length = peggingCards.length; length >= 3; length--) {
    const subset = peggingCards.slice(peggingCards.length - length);
    const orders = subset.map(pc => rankOrder(pc.card.rank)).sort((a, b) => a - b);

    let isRun = true;
    for (let i = 1; i < orders.length; i++) {
      if (orders[i] !== orders[i - 1] + 1) {
        isRun = false;
        break;
      }
    }
    // Also check for no duplicates
    const unique = new Set(orders);
    if (isRun && unique.size === orders.length) {
      return { points: length, desc: `Run of ${length} for ${length}!` };
    }
  }

  return { points: 0, desc: '' };
}

/** Check if a player can play any card without exceeding 31 */
function canPlayAny(hand: Card[], total: number): boolean {
  return hand.some(card => total + cardValue(card) <= 31);
}

// ---- Hand Counting ----

/** Get all combinations of given size from an array */
function combinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (arr.length === 0) return [];

  const result: T[][] = [];
  const [first, ...rest] = arr;

  // Combinations including first
  for (const combo of combinations(rest, size - 1)) {
    result.push([first, ...combo]);
  }
  // Combinations excluding first
  for (const combo of combinations(rest, size)) {
    result.push(combo);
  }

  return result;
}

/** Count 15s in a hand (with starter) */
function countFifteens(cards: Card[]): { points: number; desc: string } {
  let count = 0;

  for (let size = 2; size <= cards.length; size++) {
    for (const combo of combinations(cards, size)) {
      const sum = combo.reduce((acc, c) => acc + cardValue(c), 0);
      if (sum === 15) count++;
    }
  }

  const points = count * 2;
  return {
    points,
    desc: count > 0 ? `${count} fifteen${count > 1 ? 's' : ''} for ${points}` : '',
  };
}

/** Count pairs in a hand (with starter) */
function countPairs(cards: Card[]): { points: number; desc: string } {
  let count = 0;

  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) {
        count++;
      }
    }
  }

  const points = count * 2;
  return {
    points,
    desc: count > 0 ? `${count} pair${count > 1 ? 's' : ''} for ${points}` : '',
  };
}

/** Count runs in a hand (with starter) */
function countRuns(cards: Card[]): { points: number; desc: string } {
  // Find the longest run length, and how many runs of that length exist
  // We need to find runs accounting for duplicates (e.g., 3,4,5,5 = two runs of 3)

  let bestLength = 0;
  let bestPoints = 0;

  // Check from longest to shortest
  for (let length = cards.length; length >= 3; length--) {
    let totalPoints = 0;
    for (const combo of combinations(cards, length)) {
      const orders = combo.map(c => rankOrder(c.rank)).sort((a, b) => a - b);
      let isRun = true;
      for (let i = 1; i < orders.length; i++) {
        if (orders[i] !== orders[i - 1] + 1) {
          isRun = false;
          break;
        }
      }
      if (isRun) {
        totalPoints += length;
      }
    }
    if (totalPoints > 0 && length > bestLength) {
      bestLength = length;
      bestPoints = totalPoints;
    }
  }

  const numRuns = bestLength > 0 ? bestPoints / bestLength : 0;
  return {
    points: bestPoints,
    desc: bestPoints > 0
      ? (numRuns > 1
        ? `${numRuns} runs of ${bestLength} for ${bestPoints}`
        : `Run of ${bestLength} for ${bestPoints}`)
      : '',
  };
}

/** Count flush points */
function countFlush(hand: Card[], starter: Card, isCrib: boolean): { points: number; desc: string } {
  // Check if all 4 cards in hand are same suit
  const handSuit = hand[0]?.suit;
  const allHandSameSuit = hand.length === 4 && hand.every(c => c.suit === handSuit);

  if (!allHandSameSuit) return { points: 0, desc: '' };

  // For crib, all 5 must match
  if (isCrib) {
    if (starter.suit === handSuit) {
      return { points: 5, desc: 'Flush for 5' };
    }
    return { points: 0, desc: '' };
  }

  // Regular hand: 4 for hand flush, 5 if starter matches
  if (starter.suit === handSuit) {
    return { points: 5, desc: 'Flush for 5' };
  }
  return { points: 4, desc: 'Flush for 4' };
}

/** Count nobs (Jack of starter suit in hand) */
function countNobs(hand: Card[], starter: Card): { points: number; desc: string } {
  const hasNobs = hand.some(c => c.rank === 'J' && c.suit === starter.suit);
  return {
    points: hasNobs ? 1 : 0,
    desc: hasNobs ? 'Nobs for 1' : '',
  };
}

/** Count total points for a hand + starter */
function countHand(hand: Card[], starter: Card, isCrib: boolean): { points: number; breakdown: string[] } {
  const allCards = [...hand, starter];
  const breakdown: string[] = [];
  let total = 0;

  const fifteens = countFifteens(allCards);
  if (fifteens.points > 0) {
    total += fifteens.points;
    breakdown.push(fifteens.desc);
  }

  const pairs = countPairs(allCards);
  if (pairs.points > 0) {
    total += pairs.points;
    breakdown.push(pairs.desc);
  }

  const runs = countRuns(allCards);
  if (runs.points > 0) {
    total += runs.points;
    breakdown.push(runs.desc);
  }

  const flush = countFlush(hand, starter, isCrib);
  if (flush.points > 0) {
    total += flush.points;
    breakdown.push(flush.desc);
  }

  const nobs = countNobs(hand, starter);
  if (nobs.points > 0) {
    total += nobs.points;
    breakdown.push(nobs.desc);
  }

  if (total === 0) {
    breakdown.push('Zero points');
  }

  return { points: total, breakdown };
}

// ---- Deep Clone State ----

function cloneState(state: CribbageState): CribbageState {
  return {
    phase: state.phase,
    players: { ...state.players },
    dealer: state.dealer,
    hands: {
      1: cloneCards(state.hands[1]),
      2: cloneCards(state.hands[2]),
    },
    originalHands: {
      1: cloneCards(state.originalHands[1]),
      2: cloneCards(state.originalHands[2]),
    },
    crib: cloneCards(state.crib),
    starterCard: state.starterCard ? cloneCard(state.starterCard) : null,
    deck: cloneCards(state.deck),
    peggingCards: state.peggingCards.map(pc => ({
      playerId: pc.playerId,
      card: cloneCard(pc.card),
    })),
    peggingTotal: state.peggingTotal,
    peggingTurn: state.peggingTurn,
    scores: { ...state.scores },
    discarded: { ...state.discarded },
    pendingDiscards: {
      1: state.pendingDiscards[1] ? cloneCards(state.pendingDiscards[1]) : null,
      2: state.pendingDiscards[2] ? cloneCards(state.pendingDiscards[2]) : null,
    },
    peggingGo: { ...state.peggingGo },
    peggingHands: {
      1: cloneCards(state.peggingHands[1]),
      2: cloneCards(state.peggingHands[2]),
    },
    winner: state.winner,
    winReason: state.winReason,
    lastPeggingScore: state.lastPeggingScore,
    countingPhaseStep: state.countingPhaseStep,
    countingResult: state.countingResult,
    roundNumber: state.roundNumber,
  };
}

// ---- Check if pegging round is complete ----

function checkPeggingComplete(state: CribbageState): boolean {
  return state.peggingHands[1].length === 0 && state.peggingHands[2].length === 0;
}

/** Handle the "Go" logic and count reset when both players can't play */
function handlePeggingReset(state: CribbageState): CribbageState {
  let newState = cloneState(state);

  // If both players have said go (or can't play), reset the count
  const p1CanPlay = canPlayAny(newState.peggingHands[1], newState.peggingTotal);
  const p2CanPlay = canPlayAny(newState.peggingHands[2], newState.peggingTotal);

  if (!p1CanPlay && !p2CanPlay) {
    // Last card point goes to the last player who played (if not 31 which already scored)
    if (newState.peggingTotal !== 31 && newState.peggingCards.length > 0) {
      const lastPlayer = newState.peggingCards[newState.peggingCards.length - 1].playerId;
      const lastPlayerNum = getPlayerNum(newState, lastPlayer)!;
      newState = addScore(newState, lastPlayerNum, 1);
      if (newState.phase === 'finished') return newState;
      newState.lastPeggingScore = 'Last card for 1!';
    }

    // Check if pegging is done (all cards played)
    if (checkPeggingComplete(newState)) {
      // Move to counting phase
      newState.phase = 'counting';
      newState.countingPhaseStep = 0;

      // Score the non-dealer's hand
      const nd = nonDealer(newState);
      const ndHand = newState.originalHands[nd];
      const result = countHand(ndHand, newState.starterCard!, false);
      newState = addScore(newState, nd, result.points);
      if (newState.phase === 'finished') return newState;
      newState.countingResult = `${result.breakdown.join(', ')} = ${result.points} points`;
      // peggingTurn used to track whose turn it is to acknowledge
      newState.peggingTurn = nd;
      return newState;
    }

    // Reset for next round of pegging
    newState.peggingTotal = 0;
    newState.peggingGo = { 1: false, 2: false };
    newState.peggingCards = [];

    // The player who didn't play last leads
    // Actually in cribbage, the person who didn't get the go leads next
    // More precisely: after a go, the count resets and the non-go player leads
    // If both couldn't play, the other player from the last card player leads
    if (newState.peggingCards.length === 0) {
      // After reset, find who has cards and can lead
      if (newState.peggingHands[1].length > 0 && newState.peggingHands[2].length > 0) {
        // The player who didn't play the last card leads
        // Since we cleared peggingCards, use the old state
        const lastPlayer = state.peggingCards[state.peggingCards.length - 1]?.playerId;
        const lastPlayerNum = lastPlayer ? getPlayerNum(newState, lastPlayer) : null;
        newState.peggingTurn = lastPlayerNum ? otherPlayer(lastPlayerNum) : nonDealer(newState);
      } else if (newState.peggingHands[1].length > 0) {
        newState.peggingTurn = 1;
      } else {
        newState.peggingTurn = 2;
      }
    }
  }

  return newState;
}

// ---- Game Engine ----

export const cribbageEngine: GameEngine<CribbageState, CribbageMove> = {
  initGame(playerIds: [string, string]): CribbageState {
    // Randomly choose first dealer
    const dealerIdx = Math.random() < 0.5 ? 0 : 1;

    const initialState: CribbageState = {
      phase: 'dealing',
      players: { 1: playerIds[0], 2: playerIds[1] },
      dealer: (dealerIdx + 1) as 1 | 2,
      hands: { 1: [], 2: [] },
      originalHands: { 1: [], 2: [] },
      crib: [],
      starterCard: null,
      deck: [],
      peggingCards: [],
      peggingTotal: 0,
      peggingTurn: 1,
      scores: { 1: 0, 2: 0 },
      discarded: { 1: false, 2: false },
      pendingDiscards: { 1: null, 2: null },
      peggingGo: { 1: false, 2: false },
      peggingHands: { 1: [], 2: [] },
      winner: null,
      winReason: null,
      lastPeggingScore: null,
      countingPhaseStep: 0,
      countingResult: null,
      roundNumber: 1,
    };

    // Immediately deal
    return dealCards(initialState);
  },

  validateMove(state: CribbageState, playerId: string, move: CribbageMove): string | null {
    if (state.winner) return 'Game is already over';

    const playerNum = getPlayerNum(state, playerId);
    if (playerNum === null) return 'You are not a player in this game';

    if (state.phase === 'discarding') {
      if (state.discarded[playerNum]) return 'You have already discarded';

      const idx1 = move.from.row;
      const idx2 = move.from.col;

      if (!Number.isInteger(idx1) || !Number.isInteger(idx2)) {
        return 'Invalid card indices';
      }

      const hand = state.hands[playerNum];
      if (idx1 < 0 || idx1 >= hand.length || idx2 < 0 || idx2 >= hand.length) {
        return 'Card index out of range';
      }

      if (idx1 === idx2) return 'Must discard two different cards';

      return null;
    }

    if (state.phase === 'pegging') {
      if (state.peggingTurn !== playerNum) return 'It is not your turn';

      const cardIdx = move.from.row;

      // Go
      if (cardIdx === -1) {
        if (canPlayAny(state.peggingHands[playerNum], state.peggingTotal)) {
          return 'You can still play a card';
        }
        return null;
      }

      if (!Number.isInteger(cardIdx) || cardIdx < 0 || cardIdx >= state.peggingHands[playerNum].length) {
        return 'Invalid card index';
      }

      const card = state.peggingHands[playerNum][cardIdx];
      if (state.peggingTotal + cardValue(card) > 31) {
        return 'Playing this card would exceed 31';
      }

      return null;
    }

    if (state.phase === 'counting') {
      // Only the player whose hand is being counted can acknowledge
      // Step 0: non-dealer, Step 1: dealer, Step 2: dealer (crib)
      const nd = nonDealer(state);
      const d = state.dealer;

      if (state.countingPhaseStep === 0 && playerNum !== nd) {
        return 'Waiting for the non-dealer to acknowledge';
      }
      if (state.countingPhaseStep === 1 && playerNum !== d) {
        return 'Waiting for the dealer to acknowledge';
      }
      if (state.countingPhaseStep === 2 && playerNum !== d) {
        return 'Waiting for the dealer to acknowledge the crib';
      }

      return null;
    }

    return 'Invalid move for current phase';
  },

  applyMove(state: CribbageState, playerId: string, move: CribbageMove): CribbageState {
    let newState = cloneState(state);
    const playerNum = getPlayerNum(newState, playerId)!;

    if (newState.phase === 'discarding') {
      const idx1 = move.from.row;
      const idx2 = move.from.col;

      const hand = newState.hands[playerNum];
      const card1 = hand[idx1];
      const card2 = hand[idx2];

      // Store the discards but don't apply yet
      newState.pendingDiscards[playerNum] = [cloneCard(card1), cloneCard(card2)];
      newState.discarded[playerNum] = true;

      // If both players have discarded, apply the discards and move to pegging
      if (newState.discarded[1] && newState.discarded[2]) {
        // Apply discards for both players
        for (const pn of [1, 2] as const) {
          const discards = newState.pendingDiscards[pn]!;
          // Remove discarded cards from hand
          newState.hands[pn] = newState.hands[pn].filter(
            c => !discards.some(d => cardEqual(c, d))
          );
          // Add to crib
          newState.crib.push(...discards);
        }

        // Save hands for counting
        newState.originalHands = {
          1: cloneCards(newState.hands[1]),
          2: cloneCards(newState.hands[2]),
        };

        // Cut the starter card
        const deckCopy = cloneCards(newState.deck);
        const cutIndex = Math.floor(Math.random() * deckCopy.length);
        newState.starterCard = deckCopy[cutIndex];
        deckCopy.splice(cutIndex, 1);
        newState.deck = deckCopy;

        // His Heels: if starter is a Jack, dealer gets 2 points
        if (newState.starterCard.rank === 'J') {
          newState = addScore(newState, newState.dealer, 2);
          if (newState.phase === 'finished') return newState;
          newState.lastPeggingScore = "His Heels! Dealer gets 2 points!";
        }

        // Set up pegging
        newState.phase = 'pegging';
        newState.peggingHands = {
          1: cloneCards(newState.hands[1]),
          2: cloneCards(newState.hands[2]),
        };
        newState.peggingTurn = nonDealer(newState);
      }

      return newState;
    }

    if (newState.phase === 'pegging') {
      const cardIdx = move.from.row;

      // "Go"
      if (cardIdx === -1) {
        newState.peggingGo[playerNum] = true;

        // Give the other player a turn, or handle both-go
        const otherP = otherPlayer(playerNum);

        if (newState.peggingGo[otherP]) {
          // Both have said go. Award 1 point to the last player who played a card
          // (This is handled in handlePeggingReset)
          newState = handlePeggingReset(newState);
        } else {
          // Check if other player can play
          if (canPlayAny(newState.peggingHands[otherP], newState.peggingTotal)) {
            newState.peggingTurn = otherP;
          } else {
            // Other player also can't play - auto-go
            newState.peggingGo[otherP] = true;
            newState = handlePeggingReset(newState);
          }
        }

        return newState;
      }

      // Play a card
      const card = newState.peggingHands[playerNum][cardIdx];
      newState.peggingHands[playerNum] = newState.peggingHands[playerNum].filter(
        (_, i) => i !== cardIdx
      );

      newState.peggingCards.push({ playerId, card: cloneCard(card) });
      newState.peggingTotal += cardValue(card);
      newState.lastPeggingScore = null;

      const scoreDescriptions: string[] = [];

      // Score: exactly 15
      if (newState.peggingTotal === 15) {
        newState = addScore(newState, playerNum, 2);
        if (newState.phase === 'finished') return newState;
        scoreDescriptions.push('15 for 2!');
      }

      // Score: exactly 31
      if (newState.peggingTotal === 31) {
        newState = addScore(newState, playerNum, 2);
        if (newState.phase === 'finished') return newState;
        scoreDescriptions.push('31 for 2!');
      }

      // Score: pairs
      const pairScore = scorePeggingPairs(newState.peggingCards);
      if (pairScore.points > 0) {
        newState = addScore(newState, playerNum, pairScore.points);
        if (newState.phase === 'finished') return newState;
        scoreDescriptions.push(pairScore.desc);
      }

      // Score: runs
      const runScore = scorePeggingRuns(newState.peggingCards);
      if (runScore.points > 0) {
        newState = addScore(newState, playerNum, runScore.points);
        if (newState.phase === 'finished') return newState;
        scoreDescriptions.push(runScore.desc);
      }

      if (scoreDescriptions.length > 0) {
        newState.lastPeggingScore = scoreDescriptions.join(' ');
      }

      // If total is 31, reset
      if (newState.peggingTotal === 31) {
        if (checkPeggingComplete(newState)) {
          // Move to counting
          newState.phase = 'counting';
          newState.countingPhaseStep = 0;
          const nd = nonDealer(newState);
          const ndHand = newState.originalHands[nd];
          const result = countHand(ndHand, newState.starterCard!, false);
          newState = addScore(newState, nd, result.points);
          if (newState.phase === 'finished') return newState;
          newState.countingResult = `${result.breakdown.join(', ')} = ${result.points} points`;
          newState.peggingTurn = nd;
          return newState;
        }

        newState.peggingTotal = 0;
        newState.peggingGo = { 1: false, 2: false };
        newState.peggingCards = [];

        // Other player leads
        const otherP = otherPlayer(playerNum);
        if (newState.peggingHands[otherP].length > 0) {
          newState.peggingTurn = otherP;
        } else if (newState.peggingHands[playerNum].length > 0) {
          newState.peggingTurn = playerNum;
        }
        return newState;
      }

      // Reset go flags since a card was played
      newState.peggingGo = { 1: false, 2: false };

      // Determine next turn
      const otherP = otherPlayer(playerNum);

      if (canPlayAny(newState.peggingHands[otherP], newState.peggingTotal)) {
        newState.peggingTurn = otherP;
      } else if (canPlayAny(newState.peggingHands[playerNum], newState.peggingTotal)) {
        // Other player can't play, but current player can
        // Other player needs to say "Go" first, which gives 1 point
        // Actually, since we detect they can't play, we auto-assign go
        newState.peggingGo[otherP] = true;
        newState.peggingTurn = playerNum;
      } else {
        // Neither can play
        newState.peggingGo[1] = true;
        newState.peggingGo[2] = true;
        newState = handlePeggingReset(newState);
      }

      return newState;
    }

    if (newState.phase === 'counting') {
      // Acknowledge current counting step and move to next
      if (newState.countingPhaseStep === 0) {
        // Non-dealer acknowledged their hand score. Now score dealer's hand.
        newState.countingPhaseStep = 1;
        const d = newState.dealer;
        const dHand = newState.originalHands[d];
        const result = countHand(dHand, newState.starterCard!, false);
        newState = addScore(newState, d, result.points);
        if (newState.phase === 'finished') return newState;
        newState.countingResult = `${result.breakdown.join(', ')} = ${result.points} points`;
        newState.peggingTurn = d;
      } else if (newState.countingPhaseStep === 1) {
        // Dealer acknowledged their hand score. Now score crib.
        newState.countingPhaseStep = 2;
        const d = newState.dealer;
        const result = countHand(newState.crib, newState.starterCard!, true);
        newState = addScore(newState, d, result.points);
        if (newState.phase === 'finished') return newState;
        newState.countingResult = `Crib: ${result.breakdown.join(', ')} = ${result.points} points`;
        newState.peggingTurn = d;
      } else if (newState.countingPhaseStep === 2) {
        // Crib acknowledged. Start a new round.
        newState.dealer = otherPlayer(newState.dealer);
        newState.roundNumber++;
        newState = dealCards(newState);
      }

      return newState;
    }

    return newState;
  },

  getState(state: CribbageState, playerId: string): unknown {
    const playerNum = getPlayerNum(state, playerId);

    if (playerNum === null) {
      // Spectator view - hide everything
      return {
        phase: state.phase,
        players: state.players,
        scores: state.scores,
        winner: state.winner,
        winReason: state.winReason,
      };
    }

    const otherP = otherPlayer(playerNum);

    // Build opponent hand - show cards face down during discarding/pegging
    // Only reveal opponent's hand after their counting step completes
    let opponentHand: (Card | null)[];
    if (state.phase === 'finished') {
      opponentHand = cloneCards(state.originalHands[otherP]);
    } else if (state.phase === 'counting') {
      const nd = nonDealer(state);
      const d = state.dealer;
      // Non-dealer's hand is revealed at step 0+ (counted first)
      // Dealer's hand is revealed at step 1+ (counted second)
      const shouldReveal =
        (otherP === nd && state.countingPhaseStep >= 0) ||
        (otherP === d && state.countingPhaseStep >= 1);
      opponentHand = shouldReveal ? cloneCards(state.originalHands[otherP]) : state.hands[otherP].map(() => null);
    } else {
      opponentHand = state.hands[otherP].map(() => null); // hidden
    }

    // Crib - only show during counting step 2
    let cribVisible: Card[] | null = null;
    if (state.phase === 'counting' && state.countingPhaseStep === 2) {
      cribVisible = cloneCards(state.crib);
    } else if (state.phase === 'finished') {
      cribVisible = cloneCards(state.crib);
    }

    // My pegging hand during pegging phase
    let myPeggingHand: Card[] | undefined;
    if (state.phase === 'pegging') {
      myPeggingHand = cloneCards(state.peggingHands[playerNum]);
    }

    // All original hands visible during counting
    let countingHands: { 1: Card[]; 2: Card[] } | undefined;
    if (state.phase === 'counting' || state.phase === 'finished') {
      countingHands = {
        1: cloneCards(state.originalHands[1]),
        2: cloneCards(state.originalHands[2]),
      };
    }

    return {
      phase: state.phase,
      players: state.players,
      dealer: state.dealer,
      myPlayerNum: playerNum,
      myHand: cloneCards(state.hands[playerNum]),
      myPeggingHand,
      opponentHand,
      opponentCardCount: state.phase === 'pegging'
        ? state.peggingHands[otherP].length
        : state.hands[otherP].length,
      crib: cribVisible,
      cribCount: state.crib.length,
      starterCard: state.starterCard ? cloneCard(state.starterCard) : null,
      peggingCards: state.peggingCards.map(pc => ({
        playerId: pc.playerId,
        card: cloneCard(pc.card),
      })),
      peggingTotal: state.peggingTotal,
      peggingTurn: state.peggingTurn,
      scores: { ...state.scores },
      discarded: { ...state.discarded },
      peggingGo: { ...state.peggingGo },
      winner: state.winner,
      winReason: state.winReason,
      lastPeggingScore: state.lastPeggingScore,
      countingPhaseStep: state.countingPhaseStep,
      countingResult: state.countingResult,
      countingHands,
      roundNumber: state.roundNumber,
    };
  },

  checkWinner(state: CribbageState): { winner: string | null; reason?: string } | null {
    if (state.winner) {
      return {
        winner: state.winner,
        reason: state.winReason || `Reached ${WINNING_SCORE} points!`,
      };
    }
    return null;
  },
};
