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
} from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const MallView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
  const [subTab, setSubTab] = useState<MallSubTab>('casino');
  
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

  // SLOTS
  const [slotBet, setSlotBet] = useState(10000);
  const [reels, setReels] = useState<string[]>(['🍒', '🍋', '🍇']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWinText, setLastWinText] = useState<string | null>(null);

  // WHEEL
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  // BLACKJACK
  const [bjBet, setBjBet] = useState(10000);
  const [bjDeck, setBjDeck] = useState<Card[]>([]);
  const [bjPlayerHand, setBjPlayerHand] = useState<Card[]>([]);
  const [bjDealerHand, setBjDealerHand] = useState<Card[]>([]);
  const [bjStage, setBjStage] = useState<'bet' | 'player' | 'done'>('bet');
  const [bjOutcome, setBjOutcome] = useState<string | null>(null);

  // POKER
  const [pokerBet, setPokerBet] = useState(10000);
  const [pokerDeck, setPokerDeck] = useState<Card[]>([]);
  const [pokerPlayerHand, setPokerPlayerHand] = useState<Card[]>([]);
  const [pokerDealerHand, setPokerDealerHand] = useState<Card[]>([]);
  const [pokerCommunity, setPokerCommunity] = useState<Card[]>([]);
  const [pokerStage, setPokerStage] = useState<'bet' | 'flop' | 'turn' | 'river' | 'showdown'>('bet');
  const [pokerResult, setPokerResult] = useState<string | null>(null);

  // STATE ORE MARKET BUY
  const [selectedOreId, setSelectedOreId] = useState('ore_1');
  const [oreBuyQty, setOreBuyQty] = useState(100);

  // AUCTION CUSTOM PLATE
  const [customPlateMask, setCustomPlateMask] = useState('А777АА777');

  const currentPrestige = getPrestigeInfo(calcTotalCapital(state));
  const hasCasinoPass =
    state.casinoPassUntil > Date.now() ||
    state.inventory.includes('azart_pack') ||
    currentPrestige.num >= 6;

  // 1. SLOTS ENGINE
  const handleSpinSlots = () => {
    if (!hasCasinoPass) {
      setMsg({ text: 'Требуется входной билет в Казино или статус Магната (Престиж VI+)!', isError: true });
      return;
    }
    if (state.rub < slotBet) {
      setMsg({ text: 'Недостаточно рублей для ставки', isError: true });
      return;
    }

    setIsSpinning(true);
    setLastWinText(null);

    // Списание ставки
    onUpdateState((prev) => ({ ...prev, rub: prev.rub - slotBet }));

    // 11 исходов (таблица весов)
    const rand = Math.random() * 100;
    let baseMult = 0;
    let symbol = '🍒';

    if (rand < 22.0) {
      baseMult = 0.0;
    } else if (rand < 32.0) {
      baseMult = 0.25;
    } else if (rand < 44.0) {
      baseMult = 0.50;
    } else if (rand < 54.0) {
      baseMult = 0.75;
    } else if (rand < 64.0) {
      baseMult = 1.0;
      symbol = '🍒';
    } else if (rand < 79.0) {
      baseMult = 1.25;
      symbol = '🍋';
    } else if (rand < 90.0) {
      baseMult = 1.50;
      symbol = '🍇';
    } else if (rand < 96.0) {
      baseMult = 2.0;
      symbol = '🔔';
    } else if (rand < 98.5) {
      baseMult = 3.0;
      symbol = '💎';
    } else if (rand < 99.7) {
      baseMult = 5.0;
      symbol = '👑';
    } else {
      baseMult = 10.0;
      symbol = '7️⃣';
    }

    // Механика Сейв-Х (+0.15x на исходах < 1.0x)
    const hasSaveX = state.inventory.includes('azart_pack');
    let finalMult = baseMult;
    if (baseMult < 1.0 && hasSaveX) {
      finalMult += 0.15;
    }

    const winAmount = Math.floor(slotBet * finalMult);

    setTimeout(() => {
      setIsSpinning(false);
      if (baseMult >= 1.0) {
        setReels([symbol, symbol, symbol]);
      } else {
        setReels(['🍒', '🍋', '🍇']);
      }

      onUpdateState((prev) => ({
        ...prev,
        rub: prev.rub + winAmount,
      }));

      setLastWinText(
        winAmount > 0
          ? `Выигрыш: ${winAmount.toLocaleString('ru-RU')} ₽ (x${finalMult.toFixed(2)}${hasSaveX && baseMult < 1.0 ? ' с Сейв-Х' : ''})`
          : 'Проигрыш (x0.00)'
      );
    }, 600);
  };

  // 2. WHEEL ENGINE (Every 6h)
  const handleSpinWheel = () => {
    const now = Date.now();
    if (now - state.lastWheelSpinAt < 21600000) {
      const remHours = Math.ceil((21600000 - (now - state.lastWheelSpinAt)) / 3600000);
      setMsg({ text: `Колесо доступно раз в 6 часов! Осталось: ${remHours} ч.`, isError: true });
      return;
    }

    setWheelSpinning(true);
    const prizeIndex = Math.floor(Math.random() * 6); // 0 to 5
    const degrees = 1440 + prizeIndex * 60;
    setWheelRotation(degrees);

    setTimeout(() => {
      setWheelSpinning(false);
      onUpdateState((prev) => {
        const next = { ...prev, lastWheelSpinAt: Date.now() };

        if (prizeIndex === 0) {
          next.energy = Math.min(CONFIG.ENERGY_MAX, next.energy + 25);
          setMsg({ text: '🎁 Приз Колеса: +25 ⚡ Энергии!' });
        } else if (prizeIndex === 1) {
          next.rub += 25000;
          setMsg({ text: '🎁 Приз Колеса: +25 000 ₽!' });
        } else if (prizeIndex === 2) {
          if (next.car) {
            next.car.fuel = Math.min(40, next.car.fuel + 20);
            setMsg({ text: '🎁 Приз Колеса: +20 л топлива в бак!' });
          } else {
            next.rub += 15000;
            setMsg({ text: '🎁 Приз Колеса: +15 000 ₽ (компенсация за топливо)!' });
          }
        } else if (prizeIndex === 3) {
          next.ores.ore_1 = (next.ores.ore_1 || 0) + 150;
          setMsg({ text: '🎁 Приз Колеса: +150 шт. медной руды!' });
        } else if (prizeIndex === 4) {
          next.casinoPassUntil = Math.max(Date.now(), next.casinoPassUntil) + 86400000;
          setMsg({ text: '🎁 Приз Колеса: Билет в Казино на 24 часа!' });
        } else {
          next.rub += 100000;
          setMsg({ text: '🎁 Суперприз Колеса: +100 000 ₽!' });
        }

        return next;
      });
    }, 3100);
  };

  // 3. BLACKJACK 21
  const startBlackjack = () => {
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

    setBjDeck(deck);
    setBjPlayerHand(playerHand);
    setBjDealerHand(dealerHand);
    setBjStage('player');
    setBjOutcome(null);

    // Проверка естественного блекджека (21 с раздачи)
    const pScore = calcBlackjackScore(playerHand);
    const dScore = calcBlackjackScore(dealerHand);

    if (pScore === 21) {
      setBjStage('done');
      if (dScore === 21) {
        // Ничья (PUSH)
        onUpdateState((prev) => ({ ...prev, rub: prev.rub + bjBet }));
        setBjOutcome('Ничья (Push)! 21 у обоих игроков. Ставка возвращена.');
      } else {
        const win = Math.floor(bjBet * 2.25);
        onUpdateState((prev) => ({ ...prev, rub: prev.rub + win }));
        setBjOutcome(`БЛЕКДЖЕК! Выплата x2.25 (+${win.toLocaleString('ru-RU')} ₽)`);
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

  const bjStand = () => {
    if (bjStage !== 'player') return;
    setBjStage('done');

    let deck = [...bjDeck];
    let dHand = [...bjDealerHand];
    let dScore = calcBlackjackScore(dHand);

    // Дилер добирает до 17+
    while (dScore < 17 && deck.length > 0) {
      dHand.push(deck.pop()!);
      dScore = calcBlackjackScore(dHand);
    }

    setBjDealerHand(dHand);
    const pScore = calcBlackjackScore(bjPlayerHand);

    if (dScore > 21) {
      const win = bjBet * 2;
      onUpdateState((prev) => ({ ...prev, rub: prev.rub + win }));
      setBjOutcome(`Дилер перебрал (${dScore})! Вы выиграли ${win.toLocaleString('ru-RU')} ₽!`);
    } else if (pScore > dScore) {
      const win = bjBet * 2;
      onUpdateState((prev) => ({ ...prev, rub: prev.rub + win }));
      setBjOutcome(`Победа! (${pScore} против ${dScore}). Выигрыш: ${win.toLocaleString('ru-RU')} ₽!`);
    } else if (pScore === dScore) {
      onUpdateState((prev) => ({ ...prev, rub: prev.rub + bjBet }));
      setBjOutcome(`Ничья (${pScore} = ${dScore})! Ставка возвращена.`);
    } else {
      setBjOutcome(`Дилер победил (${dScore} против ${pScore}).`);
    }
  };

  // 4. TEXAS HOLD'EM POKER
  const startPoker = () => {
    if (state.rub < pokerBet) {
      setMsg({ text: 'Недостаточно средств на ставку Анте', isError: true });
      return;
    }

    const deck = createDeck();
    const p1 = deck.pop()!;
    const d1 = deck.pop()!;
    const p2 = deck.pop()!;
    const d2 = deck.pop()!;

    onUpdateState((prev) => ({ ...prev, rub: prev.rub - pokerBet }));

    setPokerDeck(deck);
    setPokerPlayerHand([p1, p2]);
    setPokerDealerHand([d1, d2]);
    setPokerCommunity([]);
    setPokerStage('flop');
    setPokerResult(null);
  };

  const pokerNextStreet = () => {
    const deck = [...pokerDeck];
    if (pokerStage === 'flop') {
      const c1 = deck.pop()!;
      const c2 = deck.pop()!;
      const c3 = deck.pop()!;
      setPokerCommunity([c1, c2, c3]);
      setPokerStage('turn');
    } else if (pokerStage === 'turn') {
      const c4 = deck.pop()!;
      setPokerCommunity((prev) => [...prev, c4]);
      setPokerStage('river');
    } else if (pokerStage === 'river') {
      const c5 = deck.pop()!;
      const finalCommunity = [...pokerCommunity, c5];
      setPokerCommunity(finalCommunity);
      setPokerStage('showdown');

      // Шоудаун
      const player7 = [...pokerPlayerHand, ...finalCommunity];
      const dealer7 = [...pokerDealerHand, ...finalCommunity];

      const pEval = evaluate7Cards(player7);
      const dEval = evaluate7Cards(dealer7);

      if (pEval.score > dEval.score) {
        const win = Math.floor(pokerBet * pEval.mult * 2);
        onUpdateState((prev) => ({ ...prev, rub: prev.rub + win }));
        setPokerResult(`Победа: ${pEval.name} бьет ${dEval.name}! Выплата: ${win.toLocaleString('ru-RU')} ₽`);
      } else if (pEval.score === dEval.score) {
        onUpdateState((prev) => ({ ...prev, rub: prev.rub + pokerBet }));
        setPokerResult(`Ничья (${pEval.name})! Ставка возвращена.`);
      } else {
        setPokerResult(`Дилер победил (${dEval.name} против ${pEval.name}).`);
      }
    }
    setPokerDeck(deck);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        {[
          { id: 'casino', label: 'Слоты (Сейв-Х)', icon: <Dices className="w-4 h-4 text-amber-400" /> },
          { id: 'wheel', label: 'Колесо Фортуны', icon: <CircleDollarSign className="w-4 h-4 text-emerald-400" /> },
          { id: 'blackjack', label: '21 / Blackjack', icon: <Layers className="w-4 h-4 text-sky-400" /> },
          { id: 'poker', label: 'Холдем Покер', icon: <Crown className="w-4 h-4 text-purple-400" /> },
          { id: 'market', label: 'Гос. Рынок руды', icon: <ShoppingBag className="w-4 h-4" /> },
          { id: 'black', label: 'Черный Рынок', icon: <Shield className="w-4 h-4 text-rose-400" /> },
          { id: 'auction', label: 'Премиум (€)', icon: <Gem className="w-4 h-4 text-blue-400" /> },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => setSubTab(tab.id as MallSubTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
              subTab === tab.id
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </div>



      {/* 1. SLOTS */}
      {subTab === 'casino' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 max-w-xl mx-auto text-center">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Dices className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Игровой Автомат Слотов</h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              RTP: {state.inventory.includes('azart_pack') ? '97.85% (Сейв-Х)' : '89.75%'}
            </span>
          </div>

          {/* Reels Display */}
          <div className="flex items-center justify-center gap-4 py-8">
            {reels.map((sym, idx) => (
              <div
                key={idx}
                className={`w-24 h-28 rounded-2xl glass-panel flex items-center justify-center text-5xl shadow-inner border border-white/20 select-none ${
                  isSpinning ? 'animate-pulse scale-95' : ''
                }`}
              >
                {sym}
              </div>
            ))}
          </div>

          {lastWinText && (
            <div className="text-sm font-bold font-mono text-emerald-400 animate-bounce">
              {lastWinText}
            </div>
          )}

          {/* Bet controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              {[10000, 50000, 250000, 1000000].map((b) => (
                <button
                  key={b}
                  onClick={() => setSlotBet(b)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                    slotBet === b ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {b.toLocaleString('ru-RU')} ₽
                </button>
              ))}
            </div>

            <button
              onClick={handleSpinSlots}
              disabled={isSpinning}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-base transition-all shadow-lg shadow-amber-500/25 active:scale-98"
            >
              {isSpinning ? 'Крутим барабаны...' : `Крутить слот (${slotBet.toLocaleString('ru-RU')} ₽)`}
            </button>
          </div>
        </div>
      )}

      {/* 2. WHEEL */}
      {subTab === 'wheel' && (
        <div className="glass-panel rounded-2xl p-6 text-center space-y-6 max-w-md mx-auto">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-base font-bold text-white">Колесо Фортуны</h3>
            <p className="text-xs text-slate-400 mt-1">Бесплатный спин каждые 6 часов!</p>
          </div>

          <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
            {/* Pointer */}
            <div className="absolute -top-3 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 filter drop-shadow" />

            <div
              className="w-full h-full rounded-full border-4 border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.2)] flex items-center justify-center relative overflow-hidden transition-transform duration-[3000ms] cubic-bezier(0.15, 0.9, 0.2, 1)"
              style={{ transform: `rotate(${wheelRotation}deg)` }}
            >
              <div className="text-xs font-bold text-white/80 p-6 grid grid-cols-2 gap-4">
                <span>⚡ +25 Энергии</span>
                <span>💰 25 000 ₽</span>
                <span>⛽ 20л Бензина</span>
                <span>⛏️ 150 Меди</span>
                <span>🎟️ Билет 24ч</span>
                <span>👑 100 000 ₽</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSpinWheel}
            disabled={wheelSpinning}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            {wheelSpinning ? 'Колесо вращается...' : 'Крутить Колесо Фортуны'}
          </button>
        </div>
      )}

      {/* 3. BLACKJACK 21 */}
      {subTab === 'blackjack' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-base font-bold text-white">Блекджек «21»</h3>
            <span className="text-xs text-slate-400">Мягкие тузы · Ничья (Push) · Выплата 1:1 или x2.25</span>
          </div>

          {bjStage === 'bet' ? (
            <div className="space-y-4 text-center py-6">
              <span className="text-xs text-slate-400">Выберите ставку:</span>
              <div className="flex justify-center gap-2">
                {[10000, 50000, 250000, 1000000].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBjBet(b)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                      bjBet === b ? 'bg-sky-500 text-white font-bold' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {b.toLocaleString('ru-RU')} ₽
                  </button>
                ))}
              </div>

              <button
                onClick={startBlackjack}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-colors"
              >
                Раздать карты ({bjBet.toLocaleString('ru-RU')} ₽)
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dealer Hand */}
              <div>
                <span className="text-xs text-slate-400">
                  Карты дилера ({bjStage === 'done' ? calcBlackjackScore(bjDealerHand) : '?'} очков):
                </span>
                <div className="flex gap-2 mt-2">
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
              <div>
                <span className="text-xs text-slate-400">
                  Ваши карты ({calcBlackjackScore(bjPlayerHand)} очков):
                </span>
                <div className="flex gap-2 mt-2">
                  {bjPlayerHand.map((c, idx) => (
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

              {bjOutcome && (
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center text-sm font-bold text-amber-300">
                  {bjOutcome}
                </div>
              )}

              <div className="flex gap-3">
                {bjStage === 'player' ? (
                  <>
                    <button
                      onClick={bjHit}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Еще карту (Hit)
                    </button>
                    <button
                      onClick={bjStand}
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      Хватит (Stand)
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setBjStage('bet')}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                  >
                    Сыграть снова
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TEXAS HOLD'EM POKER */}
      {subTab === 'poker' && (
        <div className="glass-panel rounded-2xl p-6 space-y-6 max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-base font-bold text-white">Техасский Холдем Покер</h3>
            <span className="text-xs text-purple-300 font-mono">До Роял-Флеша (x100)</span>
          </div>

          {pokerStage === 'bet' ? (
            <div className="space-y-4 text-center py-6">
              <span className="text-xs text-slate-400">Ставка Анте:</span>
              <div className="flex justify-center gap-2">
                {[10000, 50000, 250000, 1000000].map((b) => (
                  <button
                    key={b}
                    onClick={() => setPokerBet(b)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-colors ${
                      pokerBet === b ? 'bg-purple-600 text-white font-bold' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {b.toLocaleString('ru-RU')} ₽
                  </button>
                ))}
              </div>

              <button
                onClick={startPoker}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors"
              >
                Раздача карт Анте ({pokerBet.toLocaleString('ru-RU')} ₽)
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Community Cards */}
              <div>
                <span className="text-xs text-slate-400">Общие карты стола (Community):</span>
                <div className="flex gap-2 mt-2 min-h-[5rem]">
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
                      className="w-14 h-20 rounded-xl border border-white/10 border-dashed flex items-center justify-center text-slate-600 text-xs"
                    >
                      ?
                    </div>
                  ))}
                </div>
              </div>

              {/* Player Hole Cards */}
              <div>
                <span className="text-xs text-slate-400">Ваши карманные карты:</span>
                <div className="flex gap-2 mt-2">
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
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-center text-sm font-bold text-purple-200">
                  {pokerResult}
                </div>
              )}

              <div className="flex gap-3">
                {pokerStage !== 'showdown' ? (
                  <button
                    onClick={pokerNextStreet}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    {pokerStage === 'flop' ? 'Открыть Флоп (3 карты)' : pokerStage === 'turn' ? 'Открыть Терн (1 карта)' : 'Открыть Ривер (Шоудаун)'}
                  </button>
                ) : (
                  <button
                    onClick={() => setPokerStage('bet')}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                  >
                    Сыграть новый кон
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. STATE ORE MARKET (Гос. Рынок руды) */}
      {subTab === 'market' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-2">Государственный Рынок Руды</h3>
            <p className="text-xs text-slate-400 mb-6">
              Покупка любых минералов у государства с возможностью ручного ввода любого количества.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
              {ORES.map((ore) => {
                const isSelected = selectedOreId === ore.id;
                return (
                  <div
                    key={ore.id}
                    onClick={() => setSelectedOreId(ore.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-white shadow-lg shadow-sky-500/20'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs">{ore.name}</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
                      {ore.stateBuyPrice} ₽/шт.
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quantity Input and Buy */}
            {(() => {
              const selOre = ORES.find((o) => o.id === selectedOreId) || ORES[0];
              const totalCost = oreBuyQty * selOre.stateBuyPrice;

              return (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Выбрано: {selOre.name}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      Итого к оплате: {totalCost.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <input
                    type="number"
                    min={1}
                    value={oreBuyQty}
                    onChange={(e) => setOreBuyQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                  />

                  <div className="flex gap-2">
                    {[10, 50, 100, 500, 1000].map((q) => (
                      <button
                        key={q}
                        onClick={() => setOreBuyQty(q)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-slate-300"
                      >
                        +{q}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (state.rub < totalCost) {
                        setMsg({ text: 'Недостаточно средств для покупки руды!', isError: true });
                        return;
                      }
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub - totalCost,
                        ores: {
                          ...prev.ores,
                          [selOre.id]: (prev.ores[selOre.id] || 0) + oreBuyQty,
                        },
                      }));
                      setMsg({ text: `Куплено ${oreBuyQty} шт. руды [${selOre.name}] за ${totalCost.toLocaleString('ru-RU')} ₽` });
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                  >
                    Купить {oreBuyQty} шт. руды
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 6. BLACK MARKET */}
      {subTab === 'black' && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-base font-bold text-rose-300">Нелегальный Черный Рынок</h3>
            <p className="text-xs text-slate-400 mt-1">Расходники для нелегальных смен. Сгорают при каждой отработке.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'fake_passport', name: 'Поддельный военник', cost: 1000, desc: 'Для спекулянта билетами' },
              { id: 'contraband', name: 'Партия контрабанды', cost: 5000, desc: 'Для контрабандиста' },
              { id: 'module_fake', name: 'Модуль фальшивомонетчика', cost: 15000, desc: 'Для печати долларов' },
              { id: 'weapon_crate', name: 'Ящик армейского оружия', cost: 35000, desc: 'Для торговца оружием' },
              { id: 'chip_hack', name: 'Чип взлома терминалов', cost: 60000, desc: 'Для растратчика' },
              { id: 'soft_hacker', name: 'Софт «Хакер v4»', cost: 100000, desc: 'Для кибермошенника' },
              { id: 'pharma_batch', name: 'Партия спецпрепаратов', cost: 150000, desc: 'Для продажи лекарств' },
            ].map((item) => {
              const currentCount = state.inventory.filter((i) => i === item.id).length;
              return (
                <div key={item.id} className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{item.name}</span>
                      <span className="text-xs font-mono text-lime-400">{currentCount} шт.</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    <div className="text-xs font-mono font-bold text-rose-400 mt-2">
                      {item.cost.toLocaleString('ru-RU')} ₽ / шт.
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (state.rub < item.cost) {
                        setMsg({ text: 'Недостаточно средств', isError: true });
                        return;
                      }
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub - item.cost,
                        inventory: [...prev.inventory, item.id],
                      }));
                      setMsg({ text: `Куплено: 1 шт. [${item.name}]` });
                    }}
                    className="mt-3 w-full py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold"
                  >
                    Купить 1 шт.
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. PREMIUM AUCTION (€) */}
      {subTab === 'auction' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-2">Донат-Пакеты и Эксклюзивы (€)</h3>
            <p className="text-xs text-slate-400 mb-6">
              Покупки осуществляются за донатную валюту Евро (€). Баланс: <span className="font-bold text-blue-400">{state.eur} €</span>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DONATE_PACKS.map((pack) => (
                <div key={pack.id} className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">{pack.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {pack.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{pack.desc}</p>
                    <div className="text-sm font-bold font-mono text-blue-400 mb-3">
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
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
                  >
                    Активировать ({pack.costEur} €)
                  </button>
                </div>
              ))}

              {/* Spread 0% license */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">Лицензия «0% спреда»</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Пожизненный межбанковский клиринг в Обменнике Банка (0.5% комиссии вместо 6-10% спреда).
                  </p>
                  <div className="text-sm font-bold font-mono text-blue-400 mt-3">150 €</div>
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
                  className="mt-3 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  {state.inventory.includes('license_zero_spread') ? 'Активна' : 'Купить (150 €)'}
                </button>
              </div>

              {/* Server Rack Expansion */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">+10 Слотов Серверов</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Расширение серверного зала дата-центра (текущий лимит: {state.maxRacks} стоек, макс. 100).
                  </p>
                  <div className="text-sm font-bold font-mono text-blue-400 mt-3">150 €</div>
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
                  className="mt-3 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Расширить (+10 стоек)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
