import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { calcTotalCapital } from '../services/gameEngine';
import { Globe2, Shield, Zap, Building2, Cpu, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

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
        className="glass-panel rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.8 }}
              className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
            >
              <Globe2 className="w-6 h-6" />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  onBlur={() => onUpdateState((prev) => ({ ...prev, megacity: { ...prev.megacity, cityName } }))}
                  className="text-lg font-extrabold text-white bg-transparent border-b border-dashed border-white/20 focus:border-amber-400 outline-none"
                />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Суверенный город-государство под вашим прямым управлением</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-400 block text-[11px]">Население:</span>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {state.megacity.population.toLocaleString('ru-RU')} жителей
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-400 block text-[11px]">Уровень города:</span>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                Тир {state.megacity.tier} / 5
              </div>
            </div>
          </div>
        </div>

        {/* Stylized Interactive Atlas Grid */}
        <div className="w-full h-44 rounded-xl bg-slate-950/80 border border-white/10 relative overflow-hidden flex items-center justify-center p-4">
          {/* Background grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

          <div className="relative z-10 text-center space-y-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Глобальная Мировая Карта</span>
            </motion.div>
            <div className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Ваш суверенный город виден в глобальном атласе. Каждый завершенный этап открывает новые технологии
              и привлекает высококлассных специалистов.
            </div>
          </div>
        </div>
      </motion.div>

      {/* 5 Construction Phases */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-6"
      >
        <h4 className="font-bold text-white text-base mb-4">Очереди Строительства Мегаполиса</h4>
        <div className="space-y-4">
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
    </div>
  );
};
