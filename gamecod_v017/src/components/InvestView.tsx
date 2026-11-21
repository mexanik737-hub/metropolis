import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { INVEST_PLANS } from '../data/gameData';
import { TrendingUp, DollarSign, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const InvestView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
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
  const [selectedPlanId, setSelectedPlanId] = useState('inv_1');
  const [investAmount, setInvestAmount] = useState('100000');

  const handleInvest = () => {
    const plan = INVEST_PLANS.find((p) => p.id === selectedPlanId);
    if (!plan) return;

    const amt = parseInt(investAmount, 10);
    if (isNaN(amt) || amt < plan.minRub) {
      setMsg({ text: `Минимальная сумма для этого плана: ${plan.minRub.toLocaleString('ru-RU')} ₽`, isError: true });
      return;
    }
    if (state.rub < amt) {
      setMsg({ text: 'Недостаточно наличных рублей', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - amt,
      investments: [
        ...prev.investments,
        {
          id: plan.id,
          amountRub: amt,
          investedAt: Date.now(),
          accumulatedYield: 0,
        },
      ],
    }));

    setMsg({ text: `Успешно инвестировано ${amt.toLocaleString('ru-RU')} ₽ в «${plan.name}»!` });
  };

  const handleClaimYield = (idx: number) => {
    const inv = state.investments[idx];
    if (!inv) return;
    const y = Math.floor(inv.accumulatedYield);
    if (y <= 0) {
      setMsg({ text: 'Пока нет накопленной доходности', isError: true });
      return;
    }

    onUpdateState((prev) => {
      const nextInv = [...prev.investments];
      nextInv[idx] = { ...nextInv[idx], accumulatedYield: 0 };
      return {
        ...prev,
        rub: prev.rub + y,
        investments: nextInv,
      };
    });

    setMsg({ text: `Собрано +${y.toLocaleString('ru-RU')} ₽ инвестиционного дохода!` });
  };

  const handleClosePosition = (idx: number) => {
    const inv = state.investments[idx];
    if (!inv) return;
    const totalReturn = Math.floor(inv.amountRub + inv.accumulatedYield);

    onUpdateState((prev) => {
      const nextInv = [...prev.investments];
      nextInv.splice(idx, 1);
      return {
        ...prev,
        rub: prev.rub + totalReturn,
        investments: nextInv,
      };
    });

    setMsg({ text: `Позиция закрыта. На счет возвращено ${totalReturn.toLocaleString('ru-RU')} ₽.` });
  };

  return (
    <div className="space-y-6">


      {/* Hero */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-4">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          >
            <TrendingUp className="w-5 h-5" />
          </motion.div>
          <div>
            <h3 className="text-base font-bold text-white">Инвестиционный Портфель Мегаполиса</h3>
            <span className="text-[11px] text-slate-400">Вложение средств в фондовые портфели</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {INVEST_PLANS.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setInvestAmount(String(plan.minRub));
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{plan.name}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{Math.round(plan.dailyYield * 100 * 10) / 10}% / день
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{plan.desc}</p>
                </div>
                <div className="text-xs font-mono text-slate-400 mt-3 pt-2 border-t border-white/5">
                  Мин. вход: {plan.minRub.toLocaleString('ru-RU')} ₽
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Invest Input */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Сумма инвестиций:</span>
            <span className="font-mono text-emerald-400 font-bold">
              В кошельке: {state.rub.toLocaleString('ru-RU')} ₽
            </span>
          </div>

          <input
            type="number"
            value={investAmount}
            onChange={(e) => setInvestAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
          />

          <div className="flex gap-2 flex-wrap">
            {[100000, 500000, 1000000, 5000000].map((v) => (
              <motion.button
                key={v}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setInvestAmount(String(v))}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-slate-300 cursor-pointer transition-colors"
              >
                {v.toLocaleString('ru-RU')} ₽
              </motion.button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleInvest}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
          >
            Инвестировать средства
          </motion.button>
        </div>
      </motion.div>

      {/* Active Positions */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-6"
      >
        <h4 className="font-bold text-white text-sm mb-4">
          Активные Инвестиционные Позиции ({state.investments.length})
        </h4>

        {state.investments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6 italic">
            У вас пока нет открытых инвестиций. Выберите фонд в блоке выше!
          </p>
        ) : (
          <div className="space-y-3">
            {state.investments.map((inv, idx) => {
              const plan = INVEST_PLANS.find((p) => p.id === inv.id);
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.01 }}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-sm text-white">{plan?.name || inv.id}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      Тело вклада: {inv.amountRub.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Накопленный доход:</span>
                      <div className="text-sm font-mono font-bold text-emerald-400">
                        +{Math.floor(inv.accumulatedYield).toLocaleString('ru-RU')} ₽
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleClaimYield(idx)}
                      disabled={inv.accumulatedYield < 1}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/40 text-xs font-semibold cursor-pointer"
                    >
                      Снять доход
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleClosePosition(idx)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                    >
                      Закрыть позицию
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
