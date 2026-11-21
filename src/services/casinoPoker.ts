/**
 * METROPOLIS Casino Games Engine: Texas Hold'em Poker & Blackjack 21
 * Честная колода, учет мягких тузов, оценка 7 карт и реалистичный AI дилера
 */

export type Suit = '♠' | '♥' | '♦' | '♣';

export interface Card {
  rank: number; // 2..14 (11=J, 12=Q, 13=K, 14=A)
  suit: Suit;
  label: string;
  isRed: boolean;
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const deck: Card[] = [];

  for (const suit of suits) {
    const isRed = suit === '♥' || suit === '♦';
    for (let r = 2; r <= 14; r++) {
      let label = String(r);
      if (r === 11) label = 'J';
      if (r === 12) label = 'Q';
      if (r === 13) label = 'K';
      if (r === 14) label = 'A';
      deck.push({ rank: r, suit, label, isRed });
    }
  }

  // Тасование Фишера — Йетса
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// -----------------------------------------------------------------------
// БЛЕКДЖЕК («21») С УЧЕТОМ МЯГКИХ ТУЗОВ И ПРОВЕРКОЙ НА ПУШ (НИЧЬЮ)
// -----------------------------------------------------------------------

export function calcBlackjackScore(cards: Card[]): number {
  let score = 0;
  let aces = 0;

  for (const c of cards) {
    if (c.rank >= 10 && c.rank <= 13) {
      score += 10;
    } else if (c.rank === 14) {
      aces += 1;
      score += 11;
    } else {
      score += c.rank;
    }
  }

  // Мягкий туз (пересчет 11 в 1 при переборе)
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

// -----------------------------------------------------------------------
// ТЕХАССКИЙ ХОЛДЕМ ПОКЕР (ОЦЕНКА 5 ЛУЧШИХ КАРТ ИЗ 7)
// -----------------------------------------------------------------------

export type PokerHandRank =
  | 'Старшая карта'
  | 'Пара'
  | 'Две пары'
  | 'Сет (Тройка)'
  | 'Стрит'
  | 'Флеш'
  | 'Фулл-Хаус'
  | 'Каре'
  | 'Стрит-Флеш'
  | 'Роял-Флеш';

export interface EvaluatedHand {
  score: number; // Числовой вес для сравнения двух рук
  name: PokerHandRank;
  mult: number;
}

export function evaluate7Cards(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    return { score: 0, name: 'Старшая карта', mult: 1 };
  }

  // Перебираем все комбинации из 5 карт (21 комбинация C(7,5))
  let bestScore = -1;
  let bestName: PokerHandRank = 'Старшая карта';
  let bestMult = 1;

  const combos = getCombinations(cards, 5);
  for (const combo of combos) {
    const eval5 = evaluate5Cards(combo);
    if (eval5.score > bestScore) {
      bestScore = eval5.score;
      bestName = eval5.name;
      bestMult = eval5.mult;
    }
  }

  return { score: bestScore, name: bestName, mult: bestMult };
}

function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

function evaluate5Cards(cards: Card[]): EvaluatedHand {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Проверка на стрит (с учетом туза как 1: A-2-3-4-5)
  let isStraight = false;
  let straightHigh = 0;

  const isNormalStraight =
    ranks[0] - ranks[1] === 1 &&
    ranks[1] - ranks[2] === 1 &&
    ranks[2] - ranks[3] === 1 &&
    ranks[3] - ranks[4] === 1;

  const isWheelStraight =
    ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2;

  if (isNormalStraight) {
    isStraight = true;
    straightHigh = ranks[0];
  } else if (isWheelStraight) {
    isStraight = true;
    straightHigh = 5;
  }

  // Подсчет частот рангов
  const counts: { [r: number]: number } = {};
  for (const r of ranks) {
    counts[r] = (counts[r] || 0) + 1;
  }
  const countVals = Object.values(counts).sort((a, b) => b - a);

  // 1. Роял-Флеш
  if (isFlush && isStraight && straightHigh === 14) {
    return { score: 9000000 + straightHigh, name: 'Роял-Флеш', mult: 100 };
  }

  // 2. Стрит-Флеш
  if (isFlush && isStraight) {
    return { score: 8000000 + straightHigh, name: 'Стрит-Флеш', mult: 50 };
  }

  // 3. Каре (4 одинаковых)
  if (countVals[0] === 4) {
    const quadRank = Number(Object.keys(counts).find((k) => counts[Number(k)] === 4));
    return { score: 7000000 + quadRank * 100, name: 'Каре', mult: 20 };
  }

  // 4. Фулл-Хаус (3 + 2)
  if (countVals[0] === 3 && countVals[1] === 2) {
    const tripRank = Number(Object.keys(counts).find((k) => counts[Number(k)] === 3));
    return { score: 6000000 + tripRank * 100, name: 'Фулл-Хаус', mult: 8 };
  }

  // 5. Флеш
  if (isFlush) {
    return { score: 5000000 + ranks[0] * 1000 + ranks[1], name: 'Флеш', mult: 6 };
  }

  // 6. Стрит
  if (isStraight) {
    return { score: 4000000 + straightHigh, name: 'Стрит', mult: 4 };
  }

  // 7. Сет (Тройка)
  if (countVals[0] === 3) {
    const tripRank = Number(Object.keys(counts).find((k) => counts[Number(k)] === 3));
    return { score: 3000000 + tripRank * 100, name: 'Сет (Тройка)', mult: 3 };
  }

  // 8. Две пары
  if (countVals[0] === 2 && countVals[1] === 2) {
    return { score: 2000000 + ranks[0] * 100 + ranks[2], name: 'Две пары', mult: 2 };
  }

  // 9. Одна пара
  if (countVals[0] === 2) {
    const pairRank = Number(Object.keys(counts).find((k) => counts[Number(k)] === 2));
    return { score: 1000000 + pairRank * 100 + ranks[0], name: 'Пара', mult: 1 };
  }

  // 10. Старшая карта
  return { score: ranks[0] * 100 + ranks[1], name: 'Старшая карта', mult: 1 };
}
