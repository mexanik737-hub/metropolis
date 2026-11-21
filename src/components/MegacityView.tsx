import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { calcTotalCapital } from '../services/gameEngine';
import { Globe2, Shield, Zap, Building2, Cpu, CheckCircle2, AlertTriangle, Sparkles, Coins, TrendingUp, Landmark } from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const MegacityView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
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
  const [cityName, setCityName] = useState(state.megacity.cityName || 'Новый Метрополис');
  const [bondBuyAmount, setBondBuyAmount] = useState('50000000');
  const [bondSellAmount, setBondSellAmount] = useState('');

  const currentBonds = state.megacity.sovereignBondsRub || 0;
  const popBonus = Math.min(0.02, (state.megacity.population / 1000000) * 0.01);
  const bondDailyRate = (0.01 + popBonus) * 100; // in %

  const handleBuyBonds = () => {
    const amt = parseInt(bondBuyAmount, 10);
    if (isNaN(amt) || amt < 10000000) {
      setMsg({ text: 'Минимальный объем эмиссии облигаций: 10 000 000 ₽', isError: true });
      return;
    }
    if (state.rub < amt) {
      setMsg({ text: 'Недостаточно свободных рублей!', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - amt,
      megacity: {
        ...prev.megacity,
        sovereignBondsRub: (prev.megacity.sovereignBondsRub || 0) + amt,
      },
    }));

    setMsg({ text: `Приобретены суверенные облигации на сумму ${amt.toLocaleString('ru-RU')} ₽! Начисляются дивиденды.` });
  };

  const handleSellBonds = () => {
    const amt = parseInt(bondSellAmount, 10);
    if (isNaN(amt) || amt <= 0) return;
    if (amt > currentBonds) {
      setMsg({ text: 'В портфеле нет такого объема облигаций!', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub + amt,
      megacity: {
        ...prev.megacity,
        sovereignBondsRub: Math.max(0, (prev.megacity.sovereignBondsRub || 0) - amt),
      },
    }));

    setMsg({ text: `Погашены облигации на ${amt.toLocaleString('ru-RU')} ₽. Средства зачислены на счет!` });
    setBondSellAmount('');
  };

  const capital = calcTotalCapital(state);
  const isUnlocked = capital >= 432_000_000 || state.megacity.unlocked;

  const phases = [
    {
      id: 'p1',
      name: 'I. Отвод земли и магистрали',
      rubCost: 500_000_000,
      oreCost: { ore_3: 50000 },
      populationBonus: 25000,
      desc: 'Выкуп пригородных территорий и прокладка скоростных шоссе',
    },
    {
      id: 'p2',
      name: 'II. Автономная энергосистема',
      rubCost: 2_000_000_000,
      oreCost: { ore_7: 10000, ore_6: 5000 },
      populationBonus: 75000,
      desc: 'Строительство термоядерных подстанций и распределительной сети',
    },
    {
      id: 'p3',
      name: 'III. Международный Финансовый Сити',
      rubCost: 10_000_000_000,
      usdCost: 50_000_000,
      oreCost: { ore_8: 5000 },
      populationBonus: 200000,
      desc: 'Строительство 100-этажных небоскребов и свободной офшорной зоны',
    },
    {
      id: 'p4',
      name: 'IV. Индустриально-космический кластер',
      rubCost: 50_000_000_000,
      btcCost: 2500,
      oreCost: { ore_10: 1000 },
      populationBonus: 600000,
      desc: 'Космодром тяжелых челноков и заводы микроэлектроники',
    },
    {
      id: 'p5',
      name: 'V. ИИ-Ядро суверенного управления',
      rubCost: 200_000_000_000,
      btcCost: 10000,
      populationBonus: 1500000,
      desc: 'Квантовый суперкомпьютер для автоматического планирования экономики',
    },
  ];

  if (!isUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-10 text-center space-y-4 max-w-lg mx-auto"
      >
        <Globe2 className="w-16 h-16 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">Мегапроект «Основание Мегаполиса» заблокирован</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Выход на глобальную мировую карту и строительство собственного города-спутника открывается по
          достижении ранга <span className="text-amber-400 font-bold">Престижа VII (Олигарх)</span> — совокупный
          капитал от <span className="font-mono text-emerald-400 font-bold">432 000 000 ₽</span>.
        </p>
      </motion.div>
    );
  }

  const handleBuildPhase = (p: (typeof phases)[0]) => {
    if (state.megacity.phaseProgress[p.id]) return;

    if (state.rub < p.rubCost) {
      setMsg({ text: `Недостаточно рублей (требуется ${p.rubCost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }
    if (p.usdCost && state.usdOffshore < p.usdCost) {
      setMsg({ text: `Недостаточно оффшорных долларов (требуется ${p.usdCost.toLocaleString('ru-RU')} $)`, isError: true });
      return;
    }
    if (p.btcCost && state.btc < p.btcCost) {
      setMsg({ text: `Недостаточно Биткоина (требуется ${p.btcCost} ₿)`, isError: true });
      return;
    }

    // Ore check
    if (p.oreCost) {
      for (const [oId, qty] of Object.entries(p.oreCost)) {
        if ((state.ores[oId] || 0) < qty) {
          setMsg({ text: `Недостаточно руды ${oId} (требуется ${qty} шт.)`, isError: true });
          return;
        }
      }
    }

    onUpdateState((prev) => {
      const nextOres = { ...prev.ores };
      if (p.oreCost) {
        for (const [oId, qty] of Object.entries(p.oreCost)) {
          nextOres[oId] -= qty;
        }
      }

      return {
        ...prev,
        rub: prev.rub - p.rubCost,
        usdOffshore: p.usdCost ? prev.usdOffshore - p.usdCost : prev.usdOffshore,
        btc: p.btcCost ? prev.btc - p.btcCost : prev.btc,
        ores: nextOres,
        megacity: {
          ...prev.megacity,
          unlocked: true,
          tier: Math.max(prev.megacity.tier, phases.indexOf(p) + 1),
          population: prev.megacity.population + p.populationBonus,
          phaseProgress: {
            ...prev.megacity.phaseProgress,
            [p.id]: true,
          },
        },
      };
    });

    setMsg({ text: `Очередь строительства «${p.name}» успешно завершена! Население выросло на +${p.populationBonus.toLocaleString('ru-RU')} чел.` });
  };

  return (
    <div className="space-y-6">


      {/* World Map & City Overview */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  onBlur={() => onUpdateState((prev) => ({ ...prev, megacity: { ...prev.megacity, cityName } }))}
                  className="text-base sm:text-lg font-extrabold text-white bg-transparent border-b border-dashed border-white/20 focus:border-amber-400 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-400 block text-[11px]">Население</span>
              <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                {state.megacity.population.toLocaleString('ru-RU')}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-400 block text-[11px]">Уровень</span>
              <div className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5">
                Тир {state.megacity.tier} / 5
              </div>
            </div>
          </div>
        </div>

        {/* Stylized Interactive Atlas Grid */}
        <div className="w-full h-36 rounded-xl bg-slate-950/80 border border-white/10 relative overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

          <div className="relative z-10 text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Мировая Карта</span>
            </div>
            <div className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Завершенные этапы привлекают жителей и открывают глобальные технологии.
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5 Construction Phases */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5"
      >
        <h4 className="font-bold text-white text-base mb-3">Строительство</h4>
        <div className="space-y-3">
          {phases.map((p) => {
            const isDone = !!state.megacity.phaseProgress[p.id];

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{p.name}</span>
                    {isDone && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        Построено
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
                  <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-300 mt-2">
                    <span>₽: {p.rubCost.toLocaleString('ru-RU')}</span>
                    {p.usdCost && <span>· $: {p.usdCost.toLocaleString('ru-RU')}</span>}
                    {p.btcCost && <span>· ₿: {p.btcCost}</span>}
                    {p.oreCost && (
                      <span>
                        · Руда:{' '}
                        {Object.entries(p.oreCost)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <motion.button
                  whileHover={!isDone ? { scale: 1.03 } : {}}
                  whileTap={!isDone ? { scale: 0.97 } : {}}
                  onClick={() => handleBuildPhase(p)}
                  disabled={isDone}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-md shadow-amber-500/20'
                  }`}
                >
                  {isDone ? 'Завершено' : 'Начать строительство'}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Sovereign City Bonds */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5 border-amber-500/20"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Суверенные Облигации Мегаполиса</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Государственные облигации города. Обеспечивают постоянный налоговый доход от населения.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-400 block text-[11px]">В портфеле</span>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                {currentBonds.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-400 block text-[11px]">Ставка</span>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                +{bondDailyRate.toFixed(2)}% / сут.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Issue/Buy Bonds */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Выпуск и покупка облигаций</span>
              <span className="font-mono text-slate-400">Мин: 10 000 000 ₽</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Сумма инвестиций в облигации..."
                value={bondBuyAmount}
                onChange={(e) => setBondBuyAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl glass-input text-xs font-mono"
              />
              <button
                onClick={handleBuyBonds}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              >
                Купить
              </button>
            </div>

            <div className="flex gap-2">
              {[50000000, 100000000, 500000000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBondBuyAmount(String(amt))}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-slate-300 transition-colors"
                >
                  {(amt / 1000000)}M ₽
                </button>
              ))}
            </div>
          </div>

          {/* Redeem/Sell Bonds */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Погашение облигаций</span>
              <span className="font-mono text-emerald-400">Доступно: {currentBonds.toLocaleString('ru-RU')} ₽</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Сумма к погашению..."
                value={bondSellAmount}
                onChange={(e) => setBondSellAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl glass-input text-xs font-mono"
              />
              <button
                onClick={handleSellBonds}
                disabled={currentBonds <= 0}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Погасить
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBondSellAmount(String(currentBonds))}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-slate-300 transition-colors"
              >
                Вся сумма
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
