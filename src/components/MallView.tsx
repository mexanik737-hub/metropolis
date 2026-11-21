import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, MallSubTab } from '../types/game';
import { CONFIG, DONATE_PACKS, ORES } from '../data/gameData';
import { calcTotalCapital, getPrestigeInfo } from '../services/gameEngine';
import { calcBlackjackScore, createDeck, Card, evaluate7Cards, EvaluatedHand } from '../services/casinoPoker';
import {
  ShoppingBag,
  Dices,
  CircleDollarSign,
  Crown,
  Sparkles,
  Lock,
  Layers,
  ArrowRight,
  Shield,
  HelpCircle,
  Gem,
  Award,
  Zap,
  Package,
  Laptop,
  Bike,
  Ticket,
  Clock,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { formatRussianPlateInput, isValidRussianPlate, PRESET_VIP_PLATES } from '../utils/plateFormatter';
import { RussianPlateBadge } from './common/RussianPlateBadge';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialSubTab?: MallSubTab;
}

export const MallView: React.FC<Props> = ({ state, onUpdateState, onShowToast, initialSubTab }) => {
  const [subTab, setSubTab] = useState<MallSubTab>(initialSubTab || 'casino');

  React.useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  const notify = (text: string, isError = false) => {
    if (onShowToast) {
      onShowToast(text, isError ? 'error' : 'success');
    }
  };
  const setMsg = (val: { text: string; isError?: boolean } | null) => {
    if (val) {
      notify(val.text, !!val.isError);
    }
  };



  // STATE ORE MARKET (BUY & SELL)
  const [selectedOreId, setSelectedOreId] = useState('ore_1');
  const [oreTradeQty, setOreTradeQty] = useState(100);
  const [oreTradeMode, setOreTradeMode] = useState<'buy' | 'sell'>('buy');
  const [oreTradeCurrency, setOreTradeCurrency] = useState<'rub' | 'usd'>('rub');

  // BLACK MARKET (BUY & SELL)
  const [blackMarketMode, setBlackMarketMode] = useState<'buy' | 'sell'>('buy');
  const [blackMarketQty, setBlackMarketQty] = useState<number>(1);
  const [blackMarketCurrency, setBlackMarketCurrency] = useState<'rub' | 'usd'>('rub');

  // AUCTION CUSTOM PLATE (ГОСТ Р 50577: 12 букв А, В, Е, К, М, Н, О, Р, С, Т, У, Х)
  const [customPlateMask, setCustomPlateMask] = useState('А777АА777');

  // CASINO PASS & TICKETS
  const currentPrestige = getPrestigeInfo(calcTotalCapital(state));
  const hasCasinoPass =
    state.casinoPassUntil > Date.now() ||
    state.inventory.includes('azart_pack') ||
    currentPrestige.num >= 6;

  const handleBuyCasinoPass = (durationHours: number, cost: number, title: string) => {
    if (state.inventory.includes('azart_pack') || currentPrestige.num >= 6) {
      setMsg({ text: 'У вас уже действует постоянный VIP-доступ в казино!', isError: true });
      return;
    }
    // Block buying if ticket is already active and has > 2 hours left
    if (state.casinoPassUntil > Date.now() && state.casinoPassUntil - Date.now() >= 7200000) {
      const remHours = Math.ceil((state.casinoPassUntil - Date.now()) / 3600000);
      setMsg({
        text: `Билет уже активен (осталось ${remHours} ч.). Повторная покупка не требуется!`,
        isError: true,
      });
      return;
    }
    if (state.rub < cost) {
      setMsg({ text: `Недостаточно рублей для покупки: требуется ${cost.toLocaleString('ru-RU')} ₽`, isError: true });
      return;
    }
    onUpdateState((prev) => {
      const baseTime = prev.casinoPassUntil > Date.now() ? prev.casinoPassUntil : Date.now();
      return {
        ...prev,
        rub: prev.rub - cost,
        casinoPassUntil: baseTime + durationHours * 3600000,
      };
    });
    setMsg({ text: `Билет «${title}» оформлен! Добро пожаловать в игровой зал казино.` });
  };

  const handleBuyAzartPack = () => {
    const cost = 350000;
    if (state.inventory.includes('azart_pack')) {
      setMsg({ text: 'У вас уже есть вечный VIP-пропуск Azart-Pack!', isError: true });
      return;
    }
    if (state.rub < cost) {
      setMsg({ text: `Недостаточно средств на Azart-Pack (${cost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - cost,
      inventory: [...prev.inventory, 'azart_pack'],
    }));
    setMsg({ text: 'Приобретен пожизненный VIP-пропуск Azart-Pack с бонусом Сейв-Х!' });
  };

  // 1. SLOTS ENGINE WITH REEL ROLLING ANIMATION
  const [slotBet, setSlotBet] = useState(10000);
  const [reels, setReels] = useState<string[]>(['🍒', '🍋', '🍇']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelSpinning, setReelSpinning] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [lastWinText, setLastWinText] = useState<string | null>(null);
  const [isJackpotHit, setIsJackpotHit] = useState(false);

  const handleSpinSlots = () => {
    if (!hasCasinoPass) {
      setMsg({ text: 'Вход воспрещен! Приобретите входной билет в кассе казино.', isError: true });
      return;
    }
    if (state.rub < slotBet) {
      setMsg({ text: 'Недостаточно рублей для ставки', isError: true });
      return;
    }

    setIsSpinning(true);
    setReelSpinning([true, true, true]);
    setLastWinText(null);
    setIsJackpotHit(false);

    // Списание ставки
    onUpdateState((prev) => ({ ...prev, rub: prev.rub - slotBet }));

    // Честный математический RTP слотов казино: ~52% (преимущество казино)
    const rand = Math.random() * 100;
    let baseMult = 0;
    let targetReels = ['🍒', '🍋', '🍇'];

    // Честный математический RTP слотов казино: ~48% (преимущество казино)
    if (rand < 86.0) {
      // Проигрыш (86% случаев - нет совпадающих символов)
      baseMult = 0.0;
      const missSymbols = ['🍒', '🍋', '🍇', '🔔', '💎', '👑', '7️⃣'];
      const r1 = missSymbols[Math.floor(Math.random() * missSymbols.length)];
      let r2 = missSymbols[Math.floor(Math.random() * missSymbols.length)];
      while (r2 === r1) r2 = missSymbols[Math.floor(Math.random() * missSymbols.length)];
      const r3 = missSymbols[Math.floor(Math.random() * missSymbols.length)];
      targetReels = [r1, r2, r3];
    } else if (rand < 93.0) {
      // 🍒 x1.0 (возврат ставки)
      baseMult = 1.0;
      targetReels = ['🍒', '🍒', '🍒'];
    } else if (rand < 96.5) {
      // 🍋 x1.5
      baseMult = 1.5;
      targetReels = ['🍋', '🍋', '🍋'];
    } else if (rand < 98.5) {
      // 🍇 x2.2
      baseMult = 2.2;
      targetReels = ['🍇', '🍇', '🍇'];
    } else if (rand < 99.5) {
      // 🔔 x4.0
      baseMult = 4.0;
      targetReels = ['🔔', '🔔', '🔔'];
    } else if (rand < 99.85) {
      // 💎 x8.0
      baseMult = 8.0;
      targetReels = ['💎', '💎', '💎'];
    } else if (rand < 99.97) {
      // 👑 x15.0
      baseMult = 15.0;
      targetReels = ['👑', '👑', '👑'];
    } else {
      // 7️⃣ РЕДКИЙ ДЖЕКПОТ x35.0
      baseMult = 35.0;
      targetReels = ['7️⃣', '7️⃣', '7️⃣'];
    }

    // Механика Сейв-Х (+0.15x при проигрыше для VIP)
    const hasSaveX = state.inventory.includes('azart_pack');
    let finalMult = baseMult;
    if (baseMult === 0 && hasSaveX) {
      finalMult = 0.15;
    }

    const winAmount = Math.floor(slotBet * finalMult);

    // Staggered sequential reel stopping
    setTimeout(() => {
      setReels((prev) => [targetReels[0], prev[1], prev[2]]);
      setReelSpinning([false, true, true]);
    }, 800);

    setTimeout(() => {
      setReels((prev) => [targetReels[0], targetReels[1], prev[2]]);
      setReelSpinning([false, false, true]);
    }, 1300);

    setTimeout(() => {
      setReels(targetReels);
      setReelSpinning([false, false, false]);
      setIsSpinning(false);

      if (winAmount > 0) {
        onUpdateState((prev) => ({
          ...prev,
          rub: prev.rub + winAmount,
        }));
        if (baseMult >= 25.0) {
          setIsJackpotHit(true);
        }
        setLastWinText(
          `ВЫИГРЫШ: +${winAmount.toLocaleString('ru-RU')} ₽ (x${finalMult.toFixed(2)}${hasSaveX && baseMult === 0 ? ' со страховкой Сейв-Х' : ''})`
        );
      } else {
        setLastWinText('Не повезло! Попробуйте еще раз');
      }
    }, 1800);
  };

  // 2. LUXURY WHEEL OF FORTUNE (8 Sectors)
  const WHEEL_SECTORS = [
    { id: 0, label: '50 000 ₽', icon: '💰', color: '#f59e0b', textColor: '#ffffff' },
    { id: 1, label: 'Билет 24ч', icon: '🎟️', color: '#e11d48', textColor: '#ffffff' },
    { id: 2, label: '25л Бензина', icon: '⛽', color: '#10b981', textColor: '#ffffff' },
    { id: 3, label: '200 Руды', icon: '⛏️', color: '#0284c7', textColor: '#ffffff' },
    { id: 4, label: '100 000 ₽', icon: '💰', color: '#8b5cf6', textColor: '#ffffff' },
    { id: 5, label: 'VIP 7 дней', icon: '🎫', color: '#d97706', textColor: '#ffffff' },
    { id: 6, label: '50 Титана', icon: '⛏️', color: '#0d9488', textColor: '#ffffff' },
    { id: 7, label: '500 000 ₽', icon: '👑', color: '#b45309', textColor: '#fef08a' },
  ];

  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelResultMsg, setWheelResultMsg] = useState<string | null>(null);

  const handleSpinWheel = () => {
    if (!hasCasinoPass) {
      setMsg({ text: 'Вход воспрещен! Приобретите входной билет в кассе казино.', isError: true });
      return;
    }

    const now = Date.now();
    if (now - state.lastWheelSpinAt < 21600000) {
      const remHours = Math.ceil((21600000 - (now - state.lastWheelSpinAt)) / 3600000);
      setMsg({ text: `Колесо доступно раз в 6 часов! Осталось: ${remHours} ч.`, isError: true });
      return;
    }

    setWheelSpinning(true);
    setWheelResultMsg(null);

    // Веса секторов (0 to 7)
    const weights = [30, 20, 20, 15, 8, 4, 2.5, 0.5];
    const totalW = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalW;
    let prizeIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      if (rand < weights[i]) {
        prizeIndex = i;
        break;
      }
      rand -= weights[i];
    }

    // Exact needle angle math for top 12 o'clock pointer:
    // Sector i center is at: i * 45 + 22.5 deg.
    // To position it at top (270 deg), rotate by: 360*5 + 247.5 - prizeIndex * 45
    const baseDegrees = 360 * 6 + 247.5 - prizeIndex * 45;
    setWheelRotation(baseDegrees);

    setTimeout(() => {
      setWheelSpinning(false);
      onUpdateState((prev) => {
        const next = { ...prev, lastWheelSpinAt: Date.now() };

        if (prizeIndex === 0) {
          next.rub += 50000;
          setWheelResultMsg('🎉 Приз: +50 000 ₽!');
        } else if (prizeIndex === 1) {
          next.casinoPassUntil = Math.max(Date.now(), next.casinoPassUntil) + 86400000;
          setWheelResultMsg('🎉 Приз: Входной билет в Казино на 24 часа!');
        } else if (prizeIndex === 2) {
          if (next.car) {
            next.car.fuel = Math.min(40, next.car.fuel + 25);
            setWheelResultMsg('🎉 Приз: +25 л премиального бензина в бак!');
          } else {
            next.rub += 25000;
            setWheelResultMsg('🎉 Приз: +25 000 ₽ (компенсация за топливо)!');
          }
        } else if (prizeIndex === 3) {
          next.ores.ore_1 = (next.ores.ore_1 || 0) + 200;
          setWheelResultMsg('🎉 Приз: +200 шт. медной руды!');
        } else if (prizeIndex === 4) {
          next.rub += 100000;
          setWheelResultMsg('🎉 Приз: +100 000 ₽ на счет!');
        } else if (prizeIndex === 5) {
          next.casinoPassUntil = Math.max(Date.now(), next.casinoPassUntil) + 7 * 86400000;
          setWheelResultMsg('🎉 Приз: VIP-абонемент в Казино на 7 дней!');
        } else if (prizeIndex === 6) {
          next.ores.ore_2 = (next.ores.ore_2 || 0) + 50;
          setWheelResultMsg('🎉 Приз: +50 шт. редкого титана!');
        } else {
          next.rub += 500000;
          setWheelResultMsg('👑 СУПЕРПРИЗ КОЛЕСА ФОРТУНЫ: +500 000 ₽!');
        }

        return next;
      });
    }, 4200);
  };

  // 3. BLACKJACK 21 WITH DOUBLE DOWN & SURRENDER
  const [bjBet, setBjBet] = useState(10000);
  const [bjCurrentBet, setBjCurrentBet] = useState(10000);
  const [bjDeck, setBjDeck] = useState<Card[]>([]);
  const [bjPlayerHand, setBjPlayerHand] = useState<Card[]>([]);
  const [bjDealerHand, setBjDealerHand] = useState<Card[]>([]);
  const [bjStage, setBjStage] = useState<'bet' | 'player' | 'done'>('bet');
  const [bjOutcome, setBjOutcome] = useState<string | null>(null);

  const startBlackjack = () => {
    if (!hasCasinoPass) {
      setMsg({ text: 'Вход воспрещен! Приобретите входной билет в кассе казино.', isError: true });
      return;
    }
    if (state.rub < bjBet) {
      setMsg({ text: 'Недостаточно средств для ставки', isError: true });
      return;
    }

    const deck = createDeck();
    const p1 = deck.pop()!;
    const d1 = deck.pop()!;
    const p2 = deck.pop()!;
    const d2 = deck.pop()!;

    const playerHand = [p1, p2];
    const dealerHand = [d1, d2];

    onUpdateState((prev) => ({ ...prev, rub: prev.rub - bjBet }));

    setBjCurrentBet(bjBet);
    setBjDeck(deck);
    setBjPlayerHand(playerHand);
    setBjDealerHand(dealerHand);
    setBjStage('player');
    setBjOutcome(null);

    // Natural 21 Blackjack check
    const pScore = calcBlackjackScore(playerHand);
    const dScore = calcBlackjackScore(dealerHand);

    if (pScore === 21) {
      setBjStage('done');
      if (dScore === 21) {
        onUpdateState((prev) => ({ ...prev, rub: prev.rub + bjBet }));
        setBjOutcome('Ничья (Push)! 21 у обоих. Ставка возвращена.');
      } else {
        const win = Math.floor(bjBet * 2.5); // 3:2 payout (+150%)
        onUpdateState((prev) => ({ ...prev, rub: prev.rub + win }));
        setBjOutcome(`БЛЭКДЖЕК 21! Выплата 3:2 (+${(win - bjBet).toLocaleString('ru-RU')} ₽)`);
      }
    }
  };

  const bjHit = () => {
    if (bjStage !== 'player') return;
    const deck = [...bjDeck];
    const card = deck.pop()!;
    const newHand = [...bjPlayerHand, card];
    setBjDeck(deck);
    setBjPlayerHand(newHand);

    const score = calcBlackjackScore(newHand);
    if (score > 21) {
      setBjStage('done');
      setBjOutcome(`Перебор (${score})! Ставка проиграна.`);
    }
  };

  const bjDoubleDown = () => {
    if (bjStage !== 'player' || bjPlayerHand.length !== 2) return;
    if (state.rub < bjCurrentBet) {
      setMsg({ text: 'Недостаточно средств для удвоения ставки!', isError: true });
      return;
    }

    onUpdateState((prev) => ({ ...prev, rub: prev.rub - bjCurrentBet }));
    const doubled = bjCurrentBet * 2;
    setBjCurrentBet(doubled);

    const deck = [...bjDeck];
    const card = deck.pop()!;
    const newHand = [...bjPlayerHand, card];
    setBjPlayerHand(newHand);
    setBjDeck(deck);

    const pScore = calcBlackjackScore(newHand);
    if (pScore > 21) {
      setBjStage('done');
      setBjOutcome(`Перебор при удвоении (${pScore})! Ставка проиграна.`);
      return;
    }

    // Dealer turn
    executeDealerTurn(newHand, deck, doubled);
  };

  const bjSurrender = () => {
    if (bjStage !== 'player' || bjPlayerHand.length !== 2) return;
    const refund = Math.floor(bjCurrentBet / 2);
    onUpdateState((prev) => ({ ...prev, rub: prev.rub + refund }));
    setBjStage('done');
    setBjOutcome(`Сдались (Пас). Возвращено 50% ставки (+${refund.toLocaleString('ru-RU')} ₽).`);
  };

  const bjStand = () => {
    if (bjStage !== 'player') return;
    executeDealerTurn(bjPlayerHand, bjDeck, bjCurrentBet);
  };

  const executeDealerTurn = (playerHand: Card[], currentDeck: Card[], stake: number) => {
    setBjStage('done');

    let deck = [...currentDeck];
    let dHand = [...bjDealerHand];
    let dScore = calcBlackjackScore(dHand);

    // Dealer draws to soft/hard 17
    while (dScore < 17 && deck.length > 0) {
      dHand.push(deck.pop()!);
      dScore = calcBlackjackScore(dHand);
    }

    setBjDealerHand(dHand);
    const pScore = calcBlackjackScore(playerHand);

    if (dScore > 21) {
      const win = stake * 2;
      onUpdateState((prev) => ({ ...prev, rub: prev.rub + win }));
      setBjOutcome(`Дилер перебрал (${dScore})! Вы выиграли ${win.toLocaleString('ru-RU')} ₽!`);
    } else if (pScore > dScore) {
      const win = stake * 2;
      onUpdateState((prev) => ({ ...prev, rub: prev.rub + win }));
      setBjOutcome(`Победа! (${pScore} против ${dScore}). Выигрыш: ${win.toLocaleString('ru-RU')} ₽!`);
    } else if (pScore === dScore) {
      onUpdateState((prev) => ({ ...prev, rub: prev.rub + stake }));
      setBjOutcome(`Ничья (${pScore} = ${dScore})! Ставка возвращена.`);
    } else {
      setBjOutcome(`Дилер победил (${dScore} против ${pScore}).`);
    }
  };

  // 4. TEXAS HOLD'EM POKER WITH REAL FOLD & CALL RULES
  const [pokerBet, setPokerBet] = useState(10000);
  const [pokerDeck, setPokerDeck] = useState<Card[]>([]);
  const [pokerPlayerHand, setPokerPlayerHand] = useState<Card[]>([]);
  const [pokerDealerHand, setPokerDealerHand] = useState<Card[]>([]);
  const [pokerCommunity, setPokerCommunity] = useState<Card[]>([]);
  const [pokerStage, setPokerStage] = useState<'bet' | 'decision' | 'showdown'>('bet');
  const [pokerResult, setPokerResult] = useState<string | null>(null);

  const startPoker = () => {
    if (!hasCasinoPass) {
      setMsg({ text: 'Вход воспрещен! Приобретите входной билет в кассе казино.', isError: true });
      return;
    }
    if (state.rub < pokerBet) {
      setMsg({ text: 'Недостаточно средств на ставку Анте', isError: true });
      return;
    }

    const deck = createDeck();
    const p1 = deck.pop()!;
    const d1 = deck.pop()!;
    const p2 = deck.pop()!;
    const d2 = deck.pop()!;

    // Раздача Флопа (3 карты)
    const f1 = deck.pop()!;
    const f2 = deck.pop()!;
    const f3 = deck.pop()!;

    onUpdateState((prev) => ({ ...prev, rub: prev.rub - pokerBet }));

    setPokerDeck(deck);
    setPokerPlayerHand([p1, p2]);
    setPokerDealerHand([d1, d2]);
    setPokerCommunity([f1, f2, f3]);
    setPokerStage('decision');
    setPokerResult(null);
  };

  // ПАС (FOLD): Сброс карт, потеря Анте
  const pokerFold = () => {
    if (pokerStage !== 'decision') return;
    setPokerStage('showdown');
    setPokerResult('Вы сбросили карты (Пас). Ставка Анте потеряна.');
  };

  // КОЛЛ (CALL): Ставка 2x Анте, додача Терна и Ривера, шоудаун
  const pokerCall = () => {
    if (pokerStage !== 'decision') return;
    const callCost = pokerBet * 2;
    if (state.rub < callCost) {
      setMsg({ text: `Недостаточно средств для Колла (${callCost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }

    onUpdateState((prev) => ({ ...prev, rub: prev.rub - callCost }));

    const deck = [...pokerDeck];
    const turn = deck.pop()!;
    const river = deck.pop()!;
    const finalCommunity = [...pokerCommunity, turn, river];

    setPokerCommunity(finalCommunity);
    setPokerDeck(deck);
    setPokerStage('showdown');

    // Оценка рук
    const pEval = evaluate7Cards([...pokerPlayerHand, ...finalCommunity]);
    const dEval = evaluate7Cards([...pokerDealerHand, ...finalCommunity]);

    // Правило квалификации дилера (пара четверок или лучше: score >= 1000400)
    const dealerQualifies = dEval.score >= 1000400;

    if (!dealerQualifies) {
      // Дилер не квалифицировался: Анте выигрывает 1:1, Колл возвращается (Push)
      const anteWin = pokerBet * 2; // Возврат анте + выигрыш
      const callPush = callCost;    // Возврат колла
      const totalReturn = anteWin + callPush;

      onUpdateState((prev) => ({ ...prev, rub: prev.rub + totalReturn }));
      setPokerResult(
        `Дилер не квалифицировался (${dEval.name} слабее пары 4-ок)! Анте выиграла, Колл возвращен (+${(totalReturn - pokerBet - callCost).toLocaleString('ru-RU')} ₽ прибыли).`
      );
      return;
    }

    // Дилер квалифицировался
    if (pEval.score > dEval.score) {
      // Игрок победил!
      // Выплата Колла: 1:1
      const callPayout = callCost * 2;

      // Выплата Анте по таблице:
      // Роял-флеш: 20x, Каре: 10x, Фулл-хаус: 3x, Флеш: 2x, Стрит и ниже: 1x
      let anteMult = 1;
      if (pEval.name === 'Роял-Флеш' || pEval.name === 'Стрит-Флеш') anteMult = 20;
      else if (pEval.name === 'Каре') anteMult = 10;
      else if (pEval.name === 'Фулл-Хаус') anteMult = 3;
      else if (pEval.name === 'Флеш') anteMult = 2;

      const antePayout = pokerBet * (1 + anteMult);
      const totalWin = callPayout + antePayout;

      onUpdateState((prev) => ({ ...prev, rub: prev.rub + totalWin }));
      setPokerResult(
        `ПОБЕДА! ${pEval.name} бьет ${dEval.name}! Чистая выплата: +${(totalWin - pokerBet - callCost).toLocaleString('ru-RU')} ₽`
      );
    } else if (pEval.score === dEval.score) {
      // Ничья
      const totalPush = pokerBet + callCost;
      onUpdateState((prev) => ({ ...prev, rub: prev.rub + totalPush }));
      setPokerResult(`Ничья (${pEval.name})! Все ставки возвращены.`);
    } else {
      // Дилер победил
      setPokerResult(`Дилер победил (${dEval.name} бьет ${pEval.name}). Ставки утеряны.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subtab navigation — Horizontal Touch Slider */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'casino' as MallSubTab, label: 'Слоты', icon: Sparkles },
          { id: 'wheel' as MallSubTab, label: 'Колесо удачи', icon: CircleDollarSign },
          { id: 'blackjack' as MallSubTab, label: 'Блэкджек', icon: Dices },
          { id: 'poker' as MallSubTab, label: 'Покер Холдем', icon: Crown },
          { id: 'market' as MallSubTab, label: 'Рынок руды', icon: Gem },
          { id: 'store' as MallSubTab, label: 'Товары', icon: ShoppingBag },
          { id: 'black' as MallSubTab, label: 'Нелегальный рынок', icon: Shield },
          { id: 'auction' as MallSubTab, label: 'Премиум', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/20 to-sky-500/20 text-white border border-teal-500/30 shadow-md shadow-teal-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>
      {/* CASINO PASS ENTRY BANNER (Visible on all casino subtabs) */}
      {['casino', 'wheel', 'blackjack', 'poker'].includes(subTab) && (
        <div className={`p-4 rounded-2xl border transition-all ${
          hasCasinoPass
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-500/10'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                hasCasinoPass ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
              }`}>
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Касса Казино & Контроль Доступа</h4>
                  {hasCasinoPass ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Доступ открыт
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Вход закрыт
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {hasCasinoPass ? (
                    state.inventory.includes('azart_pack') || currentPrestige.num >= 6 ? (
                      <span className="text-amber-300 font-semibold">Пожизненный VIP-пропуск Магната активирован! Все игры и слоты открыты.</span>
                    ) : (
                      <span className="text-emerald-300 font-mono">
                        Билет активен до {new Date(state.casinoPassUntil).toLocaleString('ru-RU')} (осталось{' '}
                        {Math.max(1, Math.ceil((state.casinoPassUntil - Date.now()) / 3600000))} ч.)
                      </span>
                    )
                  ) : (
                    <span className="text-amber-200">
                      Для игры в слоты, блэкджек, покер и вращения колеса приобретите входной билет:
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Ticket purchase controls: only show purchase buttons if pass is NOT active */}
            <div className="flex items-center gap-2 flex-wrap">
              {state.inventory.includes('azart_pack') || currentPrestige.num >= 6 ? (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIP Доступ открыт бессрочно</span>
                </div>
              ) : state.casinoPassUntil > Date.now() ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Повторная покупка не требуется</span>
                  </div>
                  {/* Allow extending only if less than 2 hours remain on ticket */}
                  {state.casinoPassUntil - Date.now() < 7200000 && (
                    <button
                      onClick={() => handleBuyCasinoPass(24, 25000, 'Продление на 24 часа')}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-sky-600/20"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Продлить на 24ч (25 000 ₽)</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleBuyCasinoPass(24, 25000, 'Билет на 24 часа')}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Билет 24ч (25 000 ₽)</span>
                  </button>
                  <button
                    onClick={() => handleBuyCasinoPass(168, 120000, 'VIP-абонемент на 7 дней')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold text-amber-300 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>VIP 7 дней (120 000 ₽)</span>
                  </button>
                  {!state.inventory.includes('azart_pack') && currentPrestige.num < 6 && (
                    <button
                      onClick={handleBuyAzartPack}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-extrabold transition-all cursor-pointer shadow-md shadow-amber-500/20"
                    >
                      <span>Azart-Pack VIP (350 000 ₽)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. SLOTS WITH AUTHENTIC ROLLING MECHANICAL REELS */}
      {subTab === 'casino' && (
        <div className="glass-panel rounded-2xl p-5 space-y-5 max-w-xl mx-auto text-center">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Dices className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Игровой автомат «Золотой Лас-Вегас»</h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              RTP: {state.inventory.includes('azart_pack') ? '96.5% (VIP)' : '94.5%'}
            </span>
          </div>

          {/* Mechanical Rolling Reels Container */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-black border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] overflow-hidden">
            {/* Payline indicator across reels */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent pointer-events-none z-10" />

            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {[0, 1, 2].map((idx) => {
                const isReelSpinning = reelSpinning[idx];
                const currentSymbol = reels[idx];
                return (
                  <div
                    key={idx}
                    className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 border border-white/20 shadow-inner flex flex-col items-center justify-center relative overflow-hidden select-none"
                  >
                    {/* Shadow overlay at top and bottom of cylinder reel */}
                    <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />

                    {isReelSpinning ? (
                      <motion.div
                        animate={{ y: [0, -180] }}
                        transition={{ repeat: Infinity, duration: 0.18, ease: 'linear' }}
                        className="flex flex-col items-center gap-6 blur-[1px]"
                      >
                        <span className="text-5xl">🍒</span>
                        <span className="text-5xl">🍋</span>
                        <span className="text-5xl">🍇</span>
                        <span className="text-5xl">🔔</span>
                        <span className="text-5xl">💎</span>
                        <span className="text-5xl">👑</span>
                        <span className="text-5xl">7️⃣</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ y: -30, scale: 0.8 }}
                        animate={{ y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className={`text-5xl sm:text-6xl ${
                          isJackpotHit ? 'animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]' : ''
                        }`}
                      >
                        {currentSymbol}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Payline hit indicator lights */}
            <div className="flex items-center justify-between px-3 mt-4 text-[10px] font-mono text-slate-400">
              <span>Линия выплат 1</span>
              <span>7️⃣ x77 · 👑 x25 · 💎 x12 · 🔔 x6 · 🍇 x3.5 · 🍋 x2 · 🍒 x1.5</span>
            </div>
          </div>

          {lastWinText && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-3 rounded-xl border text-sm font-bold font-mono ${
                lastWinText.includes('ВЫИГРЫШ')
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              {lastWinText}
            </motion.div>
          )}

          {/* Bet selector & Spin button */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
              {[10000, 50000, 250000, 1000000].map((b) => (
                <button
                  key={b}
                  onClick={() => setSlotBet(b)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-mono text-[11px] sm:text-xs transition-colors cursor-pointer ${
                    slotBet === b ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {b.toLocaleString('ru-RU')} ₽
                </button>
              ))}
            </div>

            <button
              onClick={handleSpinSlots}
              disabled={isSpinning}
              className={`w-full py-3 sm:py-3.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all shadow-lg cursor-pointer ${
                isSpinning
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/25 active:scale-98'
              }`}
            >
              {isSpinning ? 'Барабаны вращаются...' : `Крутить слот (${slotBet.toLocaleString('ru-RU')} ₽)`}
            </button>
          </div>
        </div>
      )}

      {/* 2. LUXURY SVG WHEEL OF FORTUNE (8 COLORED WEDGES WITH PRECISE TICKER NEEDLE) */}
      {subTab === 'wheel' && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 text-center space-y-4 sm:space-y-5 max-w-lg mx-auto">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Колесо Фортуны</h3>
            </div>
            <span className="text-xs font-mono text-emerald-400">1 спин в 6 часов</span>
          </div>

          {/* Authentic SVG Casino Wheel */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center my-2">
            {/* Top Pointer Needle (Ticker) */}
            <div className="absolute -top-4 z-30 flex flex-col items-center">
              <div
                className={`w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[26px] border-t-amber-300 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] transition-transform ${
                  wheelSpinning ? 'animate-bounce' : ''
                }`}
              />
              <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-100 -mt-7 z-40 shadow" />
            </div>

            {/* Rotating Wheel Disc Container */}
            <div
              className="w-full h-full rounded-full transition-transform duration-[4000ms] cubic-bezier(0.12, 0.95, 0.18, 1) relative shadow-[0_0_50px_rgba(245,158,11,0.25)]"
              style={{ transform: `rotate(${wheelRotation}deg)` }}
            >
              <svg viewBox="-160 -160 320 320" className="w-full h-full">
                <defs>
                  <radialGradient id="wheel-center-gold" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#78350f" />
                  </radialGradient>
                  <linearGradient id="rim-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#451a03" />
                    <stop offset="50%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                </defs>

                {/* Outer Rim */}
                <circle cx="0" cy="0" r="158" fill="url(#rim-gradient)" stroke="#facc15" strokeWidth="4" />

                {/* 8 Colored Radial Wedges */}
                {WHEEL_SECTORS.map((sector, idx) => {
                  const startAngle = idx * 45;
                  const endAngle = (idx + 1) * 45;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const r = 150;

                  const x1 = r * Math.cos(startRad);
                  const y1 = r * Math.sin(startRad);
                  const x2 = r * Math.cos(endRad);
                  const y2 = r * Math.sin(endRad);

                  const pathData = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
                  const midAngle = startAngle + 22.5;

                  return (
                    <g key={sector.id}>
                      {/* Sector Wedge */}
                      <path d={pathData} fill={sector.color} stroke="#facc15" strokeWidth="1.5" />

                      {/* Text & Icon oriented radially */}
                      <g transform={`rotate(${midAngle}) translate(95, 0)`}>
                        <text
                          x="0"
                          y="-2"
                          fill={sector.textColor}
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          transform="rotate(90)"
                          className="font-mono tracking-tight select-none"
                        >
                          {sector.icon} {sector.label}
                        </text>
                      </g>

                      {/* Brass rivet bolt on rim */}
                      <circle cx={x1} cy={y1} r="3" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                    </g>
                  );
                })}

                {/* Outer LED Light Bulbs around rim (24 lights) */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i * 15 * Math.PI) / 180;
                  const lx = 154 * Math.cos(a);
                  const ly = 154 * Math.sin(a);
                  const isGold = i % 2 === 0;
                  return (
                    <circle
                      key={i}
                      cx={lx}
                      cy={ly}
                      r="2.5"
                      fill={isGold ? '#fef08a' : '#ffffff'}
                      className={wheelSpinning ? 'animate-ping' : ''}
                    />
                  );
                })}

                {/* Center Brass Medallion */}
                <circle cx="0" cy="0" r="32" fill="url(#wheel-center-gold)" stroke="#ffffff" strokeWidth="2" />
                <circle cx="0" cy="0" r="26" fill="#1e1b4b" stroke="#facc15" strokeWidth="1.5" />
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fill="#facc15"
                  fontSize="16"
                  fontWeight="bold"
                >
                  ★
                </text>
              </svg>
            </div>
          </div>

          {wheelResultMsg && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-sm font-bold text-emerald-300 font-mono"
            >
              {wheelResultMsg}
            </motion.div>
          )}

          <button
            onClick={handleSpinWheel}
            disabled={wheelSpinning}
            className={`w-full py-3.5 rounded-xl font-extrabold text-sm transition-all shadow-lg cursor-pointer ${
              wheelSpinning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-98'
            }`}
          >
            {wheelSpinning ? 'Колесо фортуны вращается...' : 'Вращать Колесо Фортуны (Бесплатно)'}
          </button>
        </div>
      )}

      {/* 3. BLACKJACK 21 WITH DOUBLE DOWN & SURRENDER */}
      {subTab === 'blackjack' && (
        <div className="glass-panel rounded-2xl p-5 space-y-5 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Блэкджек «21»</h3>
              <p className="text-xs text-slate-400">Европейские правила: выплата 3:2 за 21, удвоение и пас</p>
            </div>
            <span className="text-xs font-mono text-sky-400 font-bold">RTP: ~99.2%</span>
          </div>

          {bjStage === 'bet' ? (
            <div className="space-y-4 text-center py-5">
              <span className="text-xs text-slate-300">Выберите ставку фишек:</span>
              <div className="flex justify-center gap-1.5">
                {[10000, 50000, 250000, 1000000].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBjBet(b)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                      bjBet === b ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {b.toLocaleString('ru-RU')} ₽
                  </button>
                ))}
              </div>

              <button
                onClick={startBlackjack}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-sky-600/20"
              >
                Раздать карты ({bjBet.toLocaleString('ru-RU')} ₽)
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Dealer Hand */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Дилер:</span>
                  <span className="font-mono font-bold text-white">
                    {bjStage === 'done' ? calcBlackjackScore(bjDealerHand) : 'Скрыто'}
                  </span>
                </div>
                <div className="flex gap-2 min-h-[5.5rem]">
                  {bjDealerHand.map((c, idx) => (
                    <div
                      key={idx}
                      className={`w-14 h-20 rounded-xl bg-slate-900 border border-white/20 flex flex-col items-center justify-between p-2 font-mono font-bold shadow-md ${
                        bjStage === 'player' && idx === 1 ? 'bg-indigo-950 text-indigo-400' : c.isRed ? 'text-rose-400' : 'text-slate-100'
                      }`}
                    >
                      {bjStage === 'player' && idx === 1 ? (
                        <span className="my-auto text-xl">🂠</span>
                      ) : (
                        <>
                          <span className="text-xs self-start">{c.label}</span>
                          <span className="text-lg">{c.suit}</span>
                          <span className="text-xs self-end">{c.label}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Hand */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-sky-500/30">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Вы (Текущая ставка: {bjCurrentBet.toLocaleString('ru-RU')} ₽):</span>
                  <span className="font-mono font-bold text-sky-400">
                    {calcBlackjackScore(bjPlayerHand)}
                  </span>
                </div>
                <div className="flex gap-2 min-h-[5.5rem]">
                  {bjPlayerHand.map((c, idx) => (
                    <div
                      key={idx}
                      className={`w-14 h-20 rounded-xl bg-slate-900 border border-sky-400/40 flex flex-col items-center justify-between p-2 font-mono font-bold shadow-md ${
                        c.isRed ? 'text-rose-400' : 'text-slate-100'
                      }`}
                    >
                      <span className="text-xs self-start">{c.label}</span>
                      <span className="text-lg">{c.suit}</span>
                      <span className="text-xs self-end">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {bjOutcome && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center text-xs sm:text-sm font-bold text-amber-300"
                >
                  {bjOutcome}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {bjStage === 'player' ? (
                  <>
                    <button
                      onClick={bjHit}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      Еще карту (Hit)
                    </button>
                    <button
                      onClick={bjStand}
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-amber-600/20"
                    >
                      Хватит (Stand)
                    </button>
                    {bjPlayerHand.length === 2 && state.rub >= bjCurrentBet && (
                      <button
                        onClick={bjDoubleDown}
                        className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                      >
                        Удвоить x2
                      </button>
                    )}
                    {bjPlayerHand.length === 2 && (
                      <button
                        onClick={bjSurrender}
                        className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-300 font-bold text-xs cursor-pointer"
                      >
                        Пас (-50%)
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setBjStage('bet')}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Новая раздача
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TEXAS HOLD'EM POKER (CASINO HOLD'EM WITH FOLD & CALL) */}
      {subTab === 'poker' && (
        <div className="glass-panel rounded-2xl p-5 space-y-5 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Казино Холдем Покер</h3>
              <p className="text-xs text-slate-400">Правила против дилера: Анте, Флоп, Пас или Колл x2</p>
            </div>
            <span className="text-xs text-purple-300 font-mono">До Роял-Флеша (x20)</span>
          </div>

          {pokerStage === 'bet' ? (
            <div className="space-y-4 text-center py-5">
              <span className="text-xs text-slate-300">Ставка Анте:</span>
              <div className="flex justify-center gap-1.5">
                {[10000, 50000, 250000, 1000000].map((b) => (
                  <button
                    key={b}
                    onClick={() => setPokerBet(b)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                      pokerBet === b ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {b.toLocaleString('ru-RU')} ₽
                  </button>
                ))}
              </div>

              <button
                onClick={startPoker}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-purple-600/20"
              >
                Раздать Анте ({pokerBet.toLocaleString('ru-RU')} ₽)
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Community Table Cards */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Общие карты стола (Борд):</span>
                  <span className="font-mono text-xs text-purple-300">
                    {pokerStage === 'decision' ? 'Флоп открыт' : 'Ривер открыт'}
                  </span>
                </div>
                <div className="flex gap-2 min-h-[5.5rem]">
                  {pokerCommunity.map((c, idx) => (
                    <div
                      key={idx}
                      className={`w-14 h-20 rounded-xl bg-slate-900 border border-white/20 flex flex-col items-center justify-between p-2 font-mono font-bold shadow-md ${
                        c.isRed ? 'text-rose-400' : 'text-slate-100'
                      }`}
                    >
                      <span className="text-xs self-start">{c.label}</span>
                      <span className="text-lg">{c.suit}</span>
                      <span className="text-xs self-end">{c.label}</span>
                    </div>
                  ))}
                  {Array.from({ length: 5 - pokerCommunity.length }).map((_, i) => (
                    <div
                      key={i}
                      className="w-14 h-20 rounded-xl border border-white/10 border-dashed flex items-center justify-center text-slate-600 text-sm font-bold bg-white/[0.01]"
                    >
                      🂠
                    </div>
                  ))}
                </div>
              </div>

              {/* Dealer Cards at Showdown */}
              {pokerStage === 'showdown' && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-xs text-slate-400 block mb-2">Карты Дилера:</span>
                  <div className="flex gap-2">
                    {pokerDealerHand.map((c, idx) => (
                      <div
                        key={idx}
                        className={`w-14 h-20 rounded-xl bg-slate-900 border border-white/20 flex flex-col items-center justify-between p-2 font-mono font-bold shadow-md ${
                          c.isRed ? 'text-rose-400' : 'text-slate-100'
                        }`}
                      >
                        <span className="text-xs self-start">{c.label}</span>
                        <span className="text-lg">{c.suit}</span>
                        <span className="text-xs self-end">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Player Hole Cards */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/30">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Ваши карты на руках (Анте: {pokerBet.toLocaleString('ru-RU')} ₽):</span>
                  {pokerStage === 'showdown' && (
                    <span className="text-xs font-mono font-bold text-purple-300">
                      {evaluate7Cards([...pokerPlayerHand, ...pokerCommunity]).name}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {pokerPlayerHand.map((c, idx) => (
                    <div
                      key={idx}
                      className={`w-14 h-20 rounded-xl bg-slate-900 border border-purple-500/40 flex flex-col items-center justify-between p-2 font-mono font-bold shadow-md ${
                        c.isRed ? 'text-rose-400' : 'text-slate-100'
                      }`}
                    >
                      <span className="text-xs self-start">{c.label}</span>
                      <span className="text-lg">{c.suit}</span>
                      <span className="text-xs self-end">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {pokerResult && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-center text-xs sm:text-sm font-bold text-purple-200"
                >
                  {pokerResult}
                </motion.div>
              )}

              {/* Poker Action Buttons: Fold (Пас) vs Call (Колл 2x) */}
              <div className="flex gap-2.5">
                {pokerStage === 'decision' ? (
                  <>
                    <button
                      onClick={pokerFold}
                      className="flex-1 py-3 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/30 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Пас (Сбросить руку)
                    </button>
                    <button
                      onClick={pokerCall}
                      className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-lg shadow-purple-600/25"
                    >
                      Колл (Ставка {(pokerBet * 2).toLocaleString('ru-RU')} ₽)
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setPokerStage('bet')}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Новая раздача покера
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. STATE ORE MARKET (BUY & SELL, DUAL CURRENCY) */}
      {subTab === 'market' && (
        <div className="space-y-5">
          <div className="glass-panel rounded-2xl p-5 border border-teal-500/20 space-y-5">
            {/* Market Header with Mode and Currency Toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gem className="w-5 h-5 text-teal-400" />
                  <span>Товарно-Сырьевая Биржа Руды</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Покупка и продажа всех 10 видов руды за рубли (₽) или экспортные доллары ($)
                </p>
              </div>

              {/* Toggles: Buy/Sell and Currency */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Buy / Sell Mode Toggle */}
                <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                  <button
                    onClick={() => setOreTradeMode('buy')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      oreTradeMode === 'buy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Покупка
                  </button>
                  <button
                    onClick={() => setOreTradeMode('sell')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      oreTradeMode === 'sell' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Продажа
                  </button>
                </div>

                {/* Currency Toggle (RUB / USD) */}
                <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold">
                  <button
                    onClick={() => setOreTradeCurrency('rub')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      oreTradeCurrency === 'rub' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ₽ (RUB)
                  </button>
                  <button
                    onClick={() => setOreTradeCurrency('usd')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      oreTradeCurrency === 'usd' ? 'bg-lime-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    $ (USD)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Liquidation Banner for Sellers */}
            {oreTradeMode === 'sell' && (() => {
              let totalSellRub = 0;
              let totalOresCount = 0;
              ORES.forEach((o) => {
                const count = state.ores[o.id] || 0;
                totalSellRub += count * o.sellPrice;
                totalOresCount += count;
              });
              const totalSellUsd = Math.floor(totalSellRub / 100);

              return (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-amber-300 font-bold block">Склад руды: {totalOresCount} шт.</span>
                    <span className="text-[11px] text-slate-400">
                      Ликвидационная стоимость: {totalSellRub.toLocaleString('ru-RU')} ₽ (~{totalSellUsd.toLocaleString('ru-RU')} $)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (totalOresCount <= 0) {
                        setMsg({ text: 'На складе нет руды для продажи!', isError: true });
                        return;
                      }
                      if (oreTradeCurrency === 'rub') {
                        onUpdateState((prev) => ({
                          ...prev,
                          rub: prev.rub + totalSellRub,
                          ores: { ore_1: 0, ore_2: 0, ore_3: 0, ore_4: 0, ore_5: 0, ore_6: 0, ore_7: 0, ore_8: 0, ore_9: 0, ore_10: 0 },
                        }));
                        setMsg({ text: `Все запасы руды проданы! Получено +${totalSellRub.toLocaleString('ru-RU')} ₽` });
                      } else {
                        onUpdateState((prev) => ({
                          ...prev,
                          usdCash: prev.usdCash + totalSellUsd,
                          ores: { ore_1: 0, ore_2: 0, ore_3: 0, ore_4: 0, ore_5: 0, ore_6: 0, ore_7: 0, ore_8: 0, ore_9: 0, ore_10: 0 },
                        }));
                        setMsg({ text: `Все запасы руды экспортированы! Получено +${totalSellUsd.toLocaleString('ru-RU')} $` });
                      }
                    }}
                    disabled={totalOresCount <= 0}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      totalOresCount > 0 ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md' : 'bg-white/5 text-slate-500 cursor-default'
                    }`}
                  >
                    Продать всё в 1 клик
                  </button>
                </div>
              );
            })()}

            {/* Ores 10-Item Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ORES.map((ore) => {
                const isSelected = selectedOreId === ore.id;
                const inStock = state.ores[ore.id] || 0;
                const priceRub = oreTradeMode === 'buy' ? ore.stateBuyPrice : ore.sellPrice;
                const priceUsd = Math.max(0.1, Number((priceRub / 100).toFixed(2)));

                return (
                  <div
                    key={ore.id}
                    onClick={() => setSelectedOreId(ore.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-white shadow-lg shadow-sky-500/20'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs truncate text-white">{ore.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                          Т{ore.tier}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        На складе: <span className="font-mono font-bold text-amber-300">{inStock}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 mt-2 flex items-center justify-between font-mono text-xs font-bold">
                      <span className="text-slate-400">{oreTradeMode === 'buy' ? 'Купить:' : 'Сдать:'}</span>
                      <span className={oreTradeCurrency === 'rub' ? 'text-emerald-400' : 'text-lime-400'}>
                        {oreTradeCurrency === 'rub' ? `${priceRub} ₽` : `${priceUsd} $`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trading Action Box */}
            {(() => {
              const selOre = ORES.find((o) => o.id === selectedOreId) || ORES[0];
              const inStock = state.ores[selOre.id] || 0;
              const unitPriceRub = oreTradeMode === 'buy' ? selOre.stateBuyPrice : selOre.sellPrice;
              const unitPriceUsd = Math.max(0.1, Number((unitPriceRub / 100).toFixed(2)));

              const totalRub = Math.ceil(oreTradeQty * unitPriceRub);
              const totalUsd = Math.ceil(oreTradeQty * unitPriceUsd);

              const canAfford = oreTradeCurrency === 'rub' ? state.rub >= totalRub : state.usdCash >= totalUsd;
              const canSell = inStock >= oreTradeQty;

              return (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Выбрано: </span>
                      <span className="font-bold text-white text-sm">{selOre.name} (Тир {selOre.tier})</span>
                      <span className="text-slate-400 ml-2 font-mono">На складе: {inStock} шт.</span>
                    </div>
                    <div className="font-mono font-bold text-sm">
                      <span className="text-slate-400 mr-1.5">{oreTradeMode === 'buy' ? 'К оплате:' : 'К получению:'}</span>
                      <span className={oreTradeCurrency === 'rub' ? 'text-emerald-400' : 'text-lime-400'}>
                        {oreTradeCurrency === 'rub' ? `${totalRub.toLocaleString('ru-RU')} ₽` : `${totalUsd.toLocaleString('ru-RU')} $`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={1}
                      max={oreTradeMode === 'sell' ? inStock : 100000}
                      value={oreTradeQty}
                      onChange={(e) => setOreTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-3 py-2 rounded-xl glass-input text-sm font-mono"
                    />

                    {/* Quick quantity modifiers */}
                    <div className="flex gap-1.5">
                      {[10, 50, 100, 500].map((q) => (
                        <button
                          key={q}
                          onClick={() => setOreTradeQty(q)}
                          className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 cursor-pointer"
                        >
                          {q}
                        </button>
                      ))}
                      {oreTradeMode === 'sell' && (
                        <button
                          onClick={() => setOreTradeQty(Math.max(1, inStock))}
                          className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs font-mono cursor-pointer"
                        >
                          Всё
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  {oreTradeMode === 'buy' ? (
                    <button
                      onClick={() => {
                        if (oreTradeCurrency === 'rub') {
                          if (state.rub < totalRub) {
                            setMsg({ text: `Недостаточно рублей (требуется ${totalRub.toLocaleString('ru-RU')} ₽)!`, isError: true });
                            return;
                          }
                          onUpdateState((prev) => ({
                            ...prev,
                            rub: prev.rub - totalRub,
                            ores: { ...prev.ores, [selOre.id]: (prev.ores[selOre.id] || 0) + oreTradeQty },
                          }));
                          setMsg({ text: `Куплено ${oreTradeQty} шт. [${selOre.name}] за ${totalRub.toLocaleString('ru-RU')} ₽` });
                        } else {
                          if (state.usdCash < totalUsd) {
                            setMsg({ text: `Недостаточно долларов (требуется ${totalUsd.toLocaleString('ru-RU')} $)!`, isError: true });
                            return;
                          }
                          onUpdateState((prev) => ({
                            ...prev,
                            usdCash: prev.usdCash - totalUsd,
                            ores: { ...prev.ores, [selOre.id]: (prev.ores[selOre.id] || 0) + oreTradeQty },
                          }));
                          setMsg({ text: `Куплено ${oreTradeQty} шт. [${selOre.name}] за ${totalUsd.toLocaleString('ru-RU')} $` });
                        }
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Купить {oreTradeQty} шт. {selOre.name} ({oreTradeCurrency === 'rub' ? `${totalRub.toLocaleString('ru-RU')} ₽` : `${totalUsd.toLocaleString('ru-RU')} $`})
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!canSell) {
                          setMsg({ text: `На складе недостаточно руды [${selOre.name}] (в наличии: ${inStock} шт.)!`, isError: true });
                          return;
                        }
                        if (oreTradeCurrency === 'rub') {
                          onUpdateState((prev) => ({
                            ...prev,
                            rub: prev.rub + totalRub,
                            ores: { ...prev.ores, [selOre.id]: prev.ores[selOre.id] - oreTradeQty },
                          }));
                          setMsg({ text: `Продано ${oreTradeQty} шт. [${selOre.name}] за ${totalRub.toLocaleString('ru-RU')} ₽` });
                        } else {
                          onUpdateState((prev) => ({
                            ...prev,
                            usdCash: prev.usdCash + totalUsd,
                            ores: { ...prev.ores, [selOre.id]: prev.ores[selOre.id] - oreTradeQty },
                          }));
                          setMsg({ text: `Экспортировано ${oreTradeQty} шт. [${selOre.name}] за ${totalUsd.toLocaleString('ru-RU')} $` });
                        }
                      }}
                      disabled={!canSell}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        canSell
                          ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-600/20'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Продать {oreTradeQty} шт. {selOre.name} (+{oreTradeCurrency === 'rub' ? `${totalRub.toLocaleString('ru-RU')} ₽` : `${totalUsd.toLocaleString('ru-RU')} $`})
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 6. GOODS & ELECTRONICS STORE */}
      {subTab === 'store' && (
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-teal-300">Товары и Электроника</h3>
              <p className="text-xs text-slate-400 mt-0.5">Оборудование для карьеры, билеты и лицензии</p>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              Баланс: {state.rub.toLocaleString('ru-RU')} ₽ · {state.eur} €
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bicycle */}
            {(() => {
              const hasBike = state.inventory.includes('bicycle');
              const cost = 25000;
              return (
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  hasBike ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bike className="w-5 h-5 text-teal-400" />
                        <span className="font-bold text-sm text-white">Велосипед «Stels Navigator»</span>
                      </div>
                      {hasBike && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          В инвентаре ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Городской скоростной велосипед. Открывает доступ к вакансии «Курьер на велосипеде» (2 200 ₽/смена).
                    </p>
                    <div className="text-sm font-mono font-bold text-emerald-400 mt-3">
                      {cost.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (hasBike) {
                        setMsg({ text: 'Велосипед уже есть в вашем инвентаре!', isError: true });
                        return;
                      }
                      if (state.rub < cost) {
                        setMsg({ text: 'Недостаточно рублей!', isError: true });
                        return;
                      }
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub - cost,
                        inventory: [...prev.inventory, 'bicycle'],
                      }));
                      setMsg({ text: 'Велосипед приобретен! Доступна работа курьером.' });
                    }}
                    disabled={hasBike}
                    className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      hasBike
                        ? 'bg-white/5 text-slate-500 cursor-default'
                        : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20'
                    }`}
                  >
                    {hasBike ? 'Уже куплен' : 'Купить велосипед'}
                  </button>
                </div>
              );
            })()}

            {/* Laptop PC */}
            {(() => {
              const hasPc = state.inventory.includes('pc');
              const cost = 120000;
              return (
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  hasPc ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Laptop className="w-5 h-5 text-sky-400" />
                        <span className="font-bold text-sm text-white">Ноутбук «MacBook Pro M-Max»</span>
                      </div>
                      {hasPc && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          В инвентаре ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Мощная рабочая станция разработчика. Необходим для профессии Программиста (18 000 ₽/смена) и кибер-профессий («Растратчик», «Мошенник»).
                    </p>
                    <div className="text-sm font-mono font-bold text-sky-400 mt-3">
                      {cost.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (hasPc) {
                        setMsg({ text: 'Ноутбук уже есть в вашем инвентаре!', isError: true });
                        return;
                      }
                      if (state.rub < cost) {
                        setMsg({ text: 'Недостаточно рублей!', isError: true });
                        return;
                      }
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub - cost,
                        inventory: [...prev.inventory, 'pc'],
                      }));
                      setMsg({ text: 'Ноутбук приобретен! Открыта профессия программиста.' });
                    }}
                    disabled={hasPc}
                    className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      hasPc
                        ? 'bg-white/5 text-slate-500 cursor-default'
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                    }`}
                  >
                    {hasPc ? 'Уже куплен' : 'Купить ноутбук'}
                  </button>
                </div>
              );
            })()}

            {/* Casino Entrance Ticket (24h / 7d) */}
            {(() => {
              const isActive = state.casinoPassUntil > Date.now() || state.inventory.includes('azart_pack') || currentPrestige.num >= 6;
              const cost24 = 25000;
              const costWeek = 120000;
              return (
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  isActive ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-amber-400" />
                        <span className="font-bold text-sm text-white">Входной Билет в Казино «Рояль»</span>
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          Активен ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Официальный пропуск в игровой зал казино. Открывает слоты, блэкджек, техасский покер и ежедневное Колесо Фортуны.
                    </p>
                    <div className="flex items-center gap-3 text-sm font-mono font-bold text-amber-400 mt-3">
                      <span>25 000 ₽ / 24ч</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-amber-300">120 000 ₽ / 7 дней</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleBuyCasinoPass(24, cost24, 'Билет на 24 часа')}
                      disabled={isActive}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white/5 text-slate-500 cursor-default'
                          : 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-600/20'
                      }`}
                    >
                      {isActive ? 'Уже действует' : `Купить 24ч (${cost24.toLocaleString('ru-RU')} ₽)`}
                    </button>
                    <button
                      onClick={() => handleBuyCasinoPass(168, costWeek, 'VIP-абонемент на 7 дней')}
                      disabled={isActive}
                      className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white/5 text-slate-500 cursor-default'
                          : 'bg-white/10 hover:bg-white/20 text-slate-200'
                      }`}
                    >
                      {isActive ? 'Активен ✓' : 'VIP 7 дней'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Store Pawnshop / Resell section */}
            {(() => {
              const resalable = [
                { id: 'bicycle', name: 'Велосипед', originalPrice: 50000 },
                { id: 'smartphone', name: 'Смартфон «Флагман»', originalPrice: 75000 },
                { id: 'pc', name: 'Ноутбук MacBook Pro', originalPrice: 120000 },
              ].filter((item) => state.inventory.includes(item.id));

              if (resalable.length === 0) return null;

              return (
                <div className="md:col-span-2 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-400" />
                      Скупка / Ломбард ТРЦ (выкуп за 70% стоимости)
                    </span>
                    <span className="text-xs text-amber-300 font-mono">Доступно: {resalable.length} шт.</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {resalable.map((item) => {
                      const refund = Math.floor(item.originalPrice * 0.70);
                      return (
                        <div key={item.id} className="p-3 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-semibold text-white block">{item.name}</span>
                            <span className="text-xs font-mono text-emerald-400 font-bold">+{refund.toLocaleString('ru-RU')} ₽</span>
                          </div>
                          <button
                            onClick={() => {
                              onUpdateState((prev) => {
                                const inv = [...prev.inventory];
                                const idx = inv.indexOf(item.id);
                                if (idx !== -1) inv.splice(idx, 1);
                                return {
                                  ...prev,
                                  rub: prev.rub + refund,
                                  inventory: inv,
                                };
                              });
                              setMsg({ text: `Предмет «${item.name}» сдан в скупку ТРЦ (+${refund.toLocaleString('ru-RU')} ₽)!` });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Продать
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Zero Spread Interbank License */}
            {(() => {
              const hasLicense = state.inventory.includes('license_zero_spread');
              const rubCost = 5000000;
              const eurCost = 100;
              return (
                <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                  hasLicense ? 'bg-purple-950/20 border-purple-500/30' : 'bg-white/[0.02] border-white/10'
                }`}>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span className="font-bold text-sm text-white">Межбанковская Лицензия ЦБ</span>
                      </div>
                      {hasLicense && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                          Активирована ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Премиальный межбанковский валютный шлюз. Снижает спред обмена USD и BTC в Банке до рекордных 0.5% клиринга (без дилерской наценки)!
                    </p>
                    <div className="flex items-center gap-3 text-sm font-mono font-bold mt-3">
                      <span className="text-purple-400">{rubCost.toLocaleString('ru-RU')} ₽</span>
                      <span className="text-slate-500">или</span>
                      <span className="text-blue-400">{eurCost} €</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        if (hasLicense) return;
                        if (state.rub < rubCost) {
                          setMsg({ text: 'Недостаточно рублей (5 000 000 ₽)!', isError: true });
                          return;
                        }
                        onUpdateState((prev) => ({
                          ...prev,
                          rub: prev.rub - rubCost,
                          inventory: [...prev.inventory, 'license_zero_spread'],
                        }));
                        setMsg({ text: 'Межбанковская лицензия получена! Спред обмена валют снижен до 0.5%.' });
                      }}
                      disabled={hasLicense}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        hasLicense
                          ? 'bg-white/5 text-slate-500 cursor-default'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
                      }`}
                    >
                      {hasLicense ? 'Активирована' : 'За 5M ₽'}
                    </button>
                    {!hasLicense && (
                      <button
                        onClick={() => {
                          if (state.eur < eurCost) {
                            setMsg({ text: 'Недостаточно Евро (100 €)!', isError: true });
                            return;
                          }
                          onUpdateState((prev) => ({
                            ...prev,
                            eur: prev.eur - eurCost,
                            inventory: [...prev.inventory, 'license_zero_spread'],
                          }));
                          setMsg({ text: 'Межбанковская лицензия получена за 100 €! Спред снижен до 0.5%.' });
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        За 100 €
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 7. BLACK MARKET (BUY & SELL CONTRABAND, DUAL CURRENCY) */}
      {subTab === 'black' && (
        <div className="glass-panel rounded-2xl p-5 border border-rose-500/20 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
                <Shield className="w-5 h-5 text-rose-400" />
                <span>Нелегальный Черный Рынок & Скупщик Синдиката</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Покупка расходников для нелегальных профессий и сбыт контрабанды за рубли (₽) или доллары ($)
              </p>
            </div>

            {/* Mode & Currency toggles */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                <button
                  onClick={() => setBlackMarketMode('buy')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    blackMarketMode === 'buy' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Покупка
                </button>
                <button
                  onClick={() => setBlackMarketMode('sell')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    blackMarketMode === 'sell' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Сбыт (Скупщик)
                </button>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold">
                <button
                  onClick={() => setBlackMarketCurrency('rub')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    blackMarketCurrency === 'rub' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ₽
                </button>
                <button
                  onClick={() => setBlackMarketCurrency('usd')}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    blackMarketCurrency === 'usd' ? 'bg-lime-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  $
                </button>
              </div>
            </div>
          </div>

          {/* Quantity Selector for Buy Mode */}
          {blackMarketMode === 'buy' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Объем партии:</span>
              {[1, 5, 10, 25, 50].map((q) => (
                <button
                  key={q}
                  onClick={() => setBlackMarketQty(q)}
                  className={`px-3 py-1 rounded-lg font-mono font-bold text-xs transition-colors cursor-pointer ${
                    blackMarketQty === q ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  x{q}
                </button>
              ))}
            </div>
          )}

          {/* Mode 1: BUY CONTRABAND GOODS */}
          {blackMarketMode === 'buy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[
                { id: 'fake_passport', name: 'Поддельный военник', costRub: 1000, desc: 'Расходник для профессии «Спекулянт билетами»' },
                { id: 'contraband', name: 'Партия контрабанды', costRub: 5000, desc: 'Расходник для профессии «Контрабандист»' },
                { id: 'module_fake', name: 'Модуль фальшивомонетчика', costRub: 15000, desc: 'Расходник для печати валюты в цехе' },
                { id: 'weapon_crate', name: 'Ящик армейского оружия', costRub: 35000, desc: 'Расходник для профессии «Торговец оружием»' },
                { id: 'chip_hack', name: 'Чип взлома терминалов', costRub: 60000, desc: 'Расходник для кибер-краж и взлома' },
                { id: 'soft_hacker', name: 'Софт «Хакер v4»', costRub: 100000, desc: 'Расходник для профессии «Кибермошенник»' },
                { id: 'pharma_batch', name: 'Партия спецпрепаратов', costRub: 150000, desc: 'Расходник для нелегальной торговли' },
              ].map((item) => {
                const currentCount = state.inventory.filter((i) => i === item.id).length;
                const totalCostRub = item.costRub * blackMarketQty;
                const totalCostUsd = Math.ceil(totalCostRub / 100);
                const canAfford = blackMarketCurrency === 'rub' ? state.rub >= totalCostRub : state.usdCash >= totalCostUsd;

                return (
                  <div key={item.id} className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white truncate">{item.name}</span>
                        <span className="text-xs font-mono text-lime-400 font-bold shrink-0">{currentCount} шт.</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                      <div className="text-xs font-mono font-bold text-rose-300 mt-2.5">
                        {blackMarketCurrency === 'rub' ? `${totalCostRub.toLocaleString('ru-RU')} ₽` : `${totalCostUsd.toLocaleString('ru-RU')} $`}
                        {blackMarketQty > 1 && <span className="text-slate-500 ml-1 font-normal">({blackMarketQty} шт.)</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (blackMarketCurrency === 'rub') {
                          if (state.rub < totalCostRub) {
                            setMsg({ text: `Недостаточно рублей (требуется ${totalCostRub.toLocaleString('ru-RU')} ₽)!`, isError: true });
                            return;
                          }
                          const newItems = Array(blackMarketQty).fill(item.id);
                          onUpdateState((prev) => ({
                            ...prev,
                            rub: prev.rub - totalCostRub,
                            inventory: [...prev.inventory, ...newItems],
                          }));
                          setMsg({ text: `Куплено ${blackMarketQty} шт. [${item.name}] за ${totalCostRub.toLocaleString('ru-RU')} ₽` });
                        } else {
                          if (state.usdCash < totalCostUsd) {
                            setMsg({ text: `Недостаточно долларов (требуется ${totalCostUsd.toLocaleString('ru-RU')} $)!`, isError: true });
                            return;
                          }
                          const newItems = Array(blackMarketQty).fill(item.id);
                          onUpdateState((prev) => ({
                            ...prev,
                            usdCash: prev.usdCash - totalCostUsd,
                            inventory: [...prev.inventory, ...newItems],
                          }));
                          setMsg({ text: `Куплено ${blackMarketQty} шт. [${item.name}] за ${totalCostUsd.toLocaleString('ru-RU')} $` });
                        }
                      }}
                      disabled={!canAfford}
                      className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                        canAfford
                          ? 'bg-rose-700 hover:bg-rose-600 text-white shadow-md shadow-rose-900/30'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Купить {blackMarketQty} шт. ({blackMarketCurrency === 'rub' ? `${totalCostRub.toLocaleString('ru-RU')} ₽` : `${totalCostUsd.toLocaleString('ru-RU')} $`})
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode 2: SELL / FENCE CONTRABAND GOODS */}
          {blackMarketMode === 'sell' && (() => {
            const BLACK_ITEMS = [
              { id: 'fake_passport', name: 'Поддельный военник', baseRub: 1000 },
              { id: 'contraband', name: 'Партия контрабанды', baseRub: 5000 },
              { id: 'module_fake', name: 'Модуль фальшивомонетчика', baseRub: 15000 },
              { id: 'weapon_crate', name: 'Ящик армейского оружия', baseRub: 35000 },
              { id: 'chip_hack', name: 'Чип взлома терминалов', baseRub: 60000 },
              { id: 'soft_hacker', name: 'Софт «Хакер v4»', baseRub: 100000 },
              { id: 'pharma_batch', name: 'Партия спецпрепаратов', baseRub: 150000 },
            ];

            const ownedContraband = BLACK_ITEMS.filter((item) => state.inventory.includes(item.id));

            return (
              <div className="space-y-4">
                {ownedContraband.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white/[0.02] border border-white/5 rounded-2xl">
                    В вашем инвентаре нет нелегальных товаров или расходников для сбыта скупщику.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {ownedContraband.map((item) => {
                      const count = state.inventory.filter((i) => i === item.id).length;
                      const sellUnitPriceRub = Math.floor(item.baseRub * 0.75);
                      const sellUnitPriceUsd = Math.max(1, Math.floor(sellUnitPriceRub / 100));

                      const totalEarnRub = sellUnitPriceRub * count;
                      const totalEarnUsd = sellUnitPriceUsd * count;

                      return (
                        <div key={item.id} className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-white">{item.name}</span>
                              <span className="text-xs font-mono text-amber-300 font-bold">{count} шт.</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              Скупка (75%): <span className="font-mono text-emerald-400 font-bold">
                                {blackMarketCurrency === 'rub' ? `${sellUnitPriceRub.toLocaleString('ru-RU')} ₽` : `${sellUnitPriceUsd.toLocaleString('ru-RU')} $`}
                              </span> / шт.
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-2 border-t border-white/5">
                            <button
                              onClick={() => {
                                onUpdateState((prev) => {
                                  const inv = [...prev.inventory];
                                  const idx = inv.indexOf(item.id);
                                  if (idx !== -1) inv.splice(idx, 1);
                                  return {
                                    ...prev,
                                    rub: blackMarketCurrency === 'rub' ? prev.rub + sellUnitPriceRub : prev.rub,
                                    usdCash: blackMarketCurrency === 'usd' ? prev.usdCash + sellUnitPriceUsd : prev.usdCash,
                                    inventory: inv,
                                  };
                                });
                                setMsg({ text: `Сдан 1 шт. [${item.name}] скупщику (+${blackMarketCurrency === 'rub' ? `${sellUnitPriceRub} ₽` : `${sellUnitPriceUsd} $`})` });
                              }}
                              className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Сдать 1 шт.
                            </button>
                            {count > 1 && (
                              <button
                                onClick={() => {
                                  onUpdateState((prev) => {
                                    const inv = prev.inventory.filter((i) => i !== item.id);
                                    return {
                                      ...prev,
                                      rub: blackMarketCurrency === 'rub' ? prev.rub + totalEarnRub : prev.rub,
                                      usdCash: blackMarketCurrency === 'usd' ? prev.usdCash + totalEarnUsd : prev.usdCash,
                                      inventory: inv,
                                    };
                                  });
                                  setMsg({ text: `Сдано ${count} шт. [${item.name}] скупщику (+${blackMarketCurrency === 'rub' ? `${totalEarnRub.toLocaleString('ru-RU')} ₽` : `${totalEarnUsd.toLocaleString('ru-RU')} $`})` });
                                }}
                                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors cursor-pointer"
                              >
                                Всё ({count})
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 7. PREMIUM AUCTION (€) */}
      {subTab === 'auction' && (
        <div className="space-y-5">
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Премиум</h3>
              <span className="text-xs font-mono font-bold text-blue-400">
                Баланс: {state.eur} €
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {DONATE_PACKS.map((pack) => (
                <div key={pack.id} className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs sm:text-sm text-white">{pack.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {pack.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{pack.desc}</p>
                    <div className="text-xs font-bold font-mono text-blue-400 mb-3">
                      {pack.costEur} €
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (state.eur < pack.costEur) {
                        setMsg({ text: 'Недостаточно Евро (€)! Пополните баланс в Dev-панели.', isError: true });
                        return;
                      }

                      onUpdateState((prev) => {
                        let nextRub = prev.rub + (pack.rubCash || 0);
                        let nextUsd = prev.usdOffshore + (pack.usdOffshore || 0);
                        let nextEur = prev.eur - pack.costEur + (pack.eurCashback || 0);
                        let nextInv = [...prev.inventory];
                        if (pack.permanentItem && !nextInv.includes(pack.permanentItem)) {
                          nextInv.push(pack.permanentItem);
                        }

                        let nextBiz = [...prev.businesses];
                        if (pack.businessId && !nextBiz.some((b) => b.id === pack.businessId)) {
                          nextBiz.push({
                            id: pack.businessId,
                            cashboxRub: 0,
                            cashboxUsd: 0,
                            nextRaidRoll: Math.random(),
                            openedAt: Date.now(),
                          });
                        }

                        let nextPress = prev.press;
                        if (pack.pressId) {
                          nextPress = { id: pack.pressId, durability: 100, trayRub: 0 };
                        }

                        return {
                          ...prev,
                          rub: nextRub,
                          usdOffshore: nextUsd,
                          eur: nextEur,
                          inventory: nextInv,
                          businesses: nextBiz,
                          press: nextPress,
                        };
                      });

                      setMsg({ text: `Пакет «${pack.name}» успешно активирован!` });
                    }}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Купить ({pack.costEur} €)
                  </button>
                </div>
              ))}

              {/* Spread 0% license */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white">Лицензия «0% спреда»</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    0.5% комиссии в Обменнике вместо 6-10%.
                  </p>
                  <div className="text-xs font-bold font-mono text-blue-400 mt-2">150 €</div>
                </div>

                <button
                  onClick={() => {
                    if (state.inventory.includes('license_zero_spread')) {
                      setMsg({ text: 'Лицензия уже активна!', isError: true });
                      return;
                    }
                    if (state.eur < 150) {
                      setMsg({ text: 'Недостаточно Евро (€)!', isError: true });
                      return;
                    }
                    onUpdateState((prev) => ({
                      ...prev,
                      eur: prev.eur - 150,
                      inventory: [...prev.inventory, 'license_zero_spread'],
                    }));
                    setMsg({ text: 'Лицензия «0% спреда» успешно активирована!' });
                  }}
                  disabled={state.inventory.includes('license_zero_spread')}
                  className="mt-3 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
                >
                  {state.inventory.includes('license_zero_spread') ? 'Активна' : 'Купить (150 €)'}
                </button>
              </div>

              {/* Server Rack Expansion */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white">+10 Стоек Серверов</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Лимит: {state.maxRacks} стоек (макс. 100).
                  </p>
                  <div className="text-xs font-bold font-mono text-blue-400 mt-2">150 €</div>
                </div>

                <button
                  onClick={() => {
                    if (state.maxRacks >= 100) {
                      setMsg({ text: 'Достигнут максимальный потолок дата-центра (100 стоек)!', isError: true });
                      return;
                    }
                    if (state.eur < 150) {
                      setMsg({ text: 'Недостаточно Евро (€)!', isError: true });
                      return;
                    }
                    onUpdateState((prev) => ({
                      ...prev,
                      eur: prev.eur - 150,
                      maxRacks: Math.min(100, prev.maxRacks + 10),
                    }));
                    setMsg({ text: `Лимит стоек расширен до ${state.maxRacks + 10}!` });
                  }}
                  className="mt-3 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
                >
                  Купить (+10)
                </button>
              </div>

              {/* VIP Custom Plate Auction */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white">VIP Госномер</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Индивидуальная серия для авто (на выбор в Гараже).
                  </p>

                  <div className="flex justify-center my-2">
                    <RussianPlateBadge plate={customPlateMask} size="md" />
                  </div>

                  <input
                    type="text"
                    maxLength={9}
                    value={customPlateMask}
                    onChange={(e) => setCustomPlateMask(formatRussianPlateInput(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-lg glass-input text-xs font-mono font-bold text-amber-300 tracking-widest text-center uppercase"
                    placeholder="А777АА777"
                  />
                  <div className="text-[10px] text-slate-400 mt-1.5 text-center leading-tight">
                    ГОСТ: 1 буква, 3 цифры, 2 буквы, 2-3 цифры региона (буквы: А, В, Е, К, М, Н, О, Р, С, Т, У, Х)
                  </div>

                  {/* Quick Preset VIP Plates */}
                  <div className="flex gap-1.5 flex-wrap justify-center mt-2">
                    {PRESET_VIP_PLATES.slice(0, 6).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCustomPlateMask(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                          customPlateMask === preset
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] font-mono text-blue-300 mt-2 text-center font-bold">
                    100 € или 5 000 000 ₽
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      const plate = customPlateMask.trim();
                      if (!isValidRussianPlate(plate)) {
                        setMsg({
                          text: 'Неверный формат госномера РФ! Формат: 1 буква, 3 цифры, 2 буквы, регион 2-3 цифры (пример: А777АА777, О001ОО77). Разрешены только буквы: А, В, Е, К, М, Н, О, Р, С, Т, У, Х',
                          isError: true,
                        });
                        return;
                      }
                      if (state.eur < 100) {
                        setMsg({ text: 'Недостаточно Евро (€)!', isError: true });
                        return;
                      }
                      onUpdateState((prev) => {
                        const owned = [...prev.ownedPlates];
                        if (!owned.includes(plate)) owned.push(plate);
                        return {
                          ...prev,
                          eur: prev.eur - 100,
                          ownedPlates: owned,
                          car: prev.car ? { ...prev.car, plateNumber: plate } : null,
                        };
                      });
                      setMsg({ text: `VIP Госномер «${plate}» приобретен за 100 €!` });
                    }}
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    100 €
                  </button>

                  <button
                    onClick={() => {
                      const plate = customPlateMask.trim();
                      if (!isValidRussianPlate(plate)) {
                        setMsg({
                          text: 'Неверный формат госномера РФ! Формат: 1 буква, 3 цифры, 2 буквы, регион 2-3 цифры (пример: А777АА777, О001ОО77). Разрешены только буквы: А, В, Е, К, М, Н, О, Р, С, Т, У, Х',
                          isError: true,
                        });
                        return;
                      }
                      if (state.rub < 5000000) {
                        setMsg({ text: 'Недостаточно рублей (требуется 5 000 000 ₽)!', isError: true });
                        return;
                      }
                      onUpdateState((prev) => {
                        const owned = [...prev.ownedPlates];
                        if (!owned.includes(plate)) owned.push(plate);
                        return {
                          ...prev,
                          rub: prev.rub - 5000000,
                          ownedPlates: owned,
                          car: prev.car ? { ...prev.car, plateNumber: plate } : null,
                        };
                      });
                      setMsg({ text: `VIP Госномер «${plate}» приобретен за 5 млн ₽!` });
                    }}
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-amber-600/20"
                  >
                    5M ₽
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
