import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { ESTATES, EstateDef } from '../data/gameData';
import { calcTotalCapital, getPrestigeInfo } from '../services/gameEngine';
import { Home, ShieldCheck, Coffee, Sparkles, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RealEstateView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
  const notify = (text: string, isError = false) => {
    if (onShowToast) {
      onShowToast(text, isError ? 'error' : 'success');
    }
  };

  const [confirmEstate, setConfirmEstate] = useState<EstateDef | null>(null);

  const currentEst = ESTATES.find((e) => e.id === state.estateId) || ESTATES[0];
  const prestige = getPrestigeInfo(calcTotalCapital(state));
  const tradeInRate = prestige.tradeInRate;
  const isFinConsortium = state.activeFaction === 'f_fin';
  const getTargetCost = (c: number) => (isFinConsortium ? Math.floor(c * 0.98) : c);

  const handleEstateBuy = (target: EstateDef) => {
    if (state.estateId === target.id) return;

    // Check safe limit when downgrading
    if (target.safe < state.homeSafeRub) {
      notify(
        `Сделка заблокирована! В вашем сейфе лежит ${state.homeSafeRub.toLocaleString('ru-RU')} ₽, а новый сейф вмещает только ${target.safe.toLocaleString('ru-RU')} ₽. Сначала заберите излишек!`,
        true
      );
      return;
    }

    const discountedCost = getTargetCost(target.cost);
    const tradeInRefund = Math.floor(currentEst.cost * tradeInRate);
    const netCost = Math.max(0, discountedCost - tradeInRefund);

    if (state.rub < netCost) {
      notify(`Недостаточно средств с учетом трейд-ин (требуется доплата ${netCost.toLocaleString('ru-RU')} ₽)`, true);
      return;
    }

    setConfirmEstate(target);
  };

  const executeEstateBuy = () => {
    if (!confirmEstate) return;
    const discountedCost = getTargetCost(confirmEstate.cost);
    const tradeInRefund = Math.floor(currentEst.cost * tradeInRate);
    const netCost = Math.max(0, discountedCost - tradeInRefund);

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - netCost,
      estateId: confirmEstate.id,
      purchaseDates: {
        ...prev.purchaseDates,
        [confirmEstate.id]: Date.now(),
      },
    }));

    notify(
      `Сделка оформлена! Вы успешно переехали в «${confirmEstate.name}» (зачтен трейд-ин +${tradeInRefund.toLocaleString('ru-RU')} ₽${
        isFinConsortium ? ', скидка 2%' : ''
      }).`
    );
    setConfirmEstate(null);
  };

  return (
    <div className="space-y-6">
      {/* Current Residence Overview Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-sky-500/30 bg-gradient-to-r from-sky-950/20 to-blue-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Текущее жилье: {currentEst.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Прописка
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {currentEst.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-black/30 px-3.5 py-2 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px]">Вместимость сейфа</span>
              <span className="text-amber-400 font-bold">
                {currentEst.safe.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className="bg-black/30 px-3.5 py-2 rounded-xl border border-white/10">
              <span className="text-slate-400 block text-[10px]">Бонус сна</span>
              <span className="text-sky-300 font-bold">
                +{currentEst.sleepBonus}% скорости
              </span>
            </div>
            {currentEst.coffee && (
              <div className="bg-amber-500/10 px-3.5 py-2 rounded-xl border border-amber-500/20 text-amber-300 font-bold flex items-center gap-1.5">
                <Coffee className="w-4 h-4" />
                <span>Кофеварка</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real Estate Catalogue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white text-base">Каталог элитной недвижимости Метрополиса</h4>
            <p className="text-xs text-slate-400">
              Покупка апартаментов, коттеджей и вилл. Старое жилье автоматически принимается в трейд-ин ({Math.round(tradeInRate * 100)}%).
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Объектов: {ESTATES.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ESTATES.map((est) => {
            const isCurrent = state.estateId === est.id;
            const discountedCost = getTargetCost(est.cost);
            const tradeInRefund = isCurrent ? 0 : Math.floor(currentEst.cost * tradeInRate);
            const netCost = Math.max(0, discountedCost - tradeInRefund);
            const canAfford = state.rub >= netCost;

            return (
              <div
                key={est.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-sky-950/20 border-sky-500/40 shadow-xl shadow-sky-500/10'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm tracking-wide">{est.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{est.desc}</p>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                        Текущее
                      </span>
                    )}
                  </div>

                  {/* Estate Specifications */}
                  <div className="space-y-1.5 py-3 border-y border-white/5 my-3 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Сейф для наличных:</span>
                      <span className="text-amber-400 font-bold">
                        {est.safe > 0 ? `${est.safe.toLocaleString('ru-RU')} ₽` : 'Отсутствует'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Бонус ко сну:</span>
                      <span className="text-sky-300 font-bold">+{est.sleepBonus}% скорости</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Домашний кофе:</span>
                      <span className={est.coffee ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                        {est.coffee ? `Включен (+${est.coffeeRestore}⚡)` : 'Нет'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="text-xs text-slate-400 font-mono block">Стоимость объекта:</span>
                    <div className="text-base font-bold font-mono text-emerald-400">
                      {est.cost.toLocaleString('ru-RU')} ₽
                    </div>
                    {!isCurrent && tradeInRefund > 0 && (
                      <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                        Трейд-ин текущего: -{tradeInRefund.toLocaleString('ru-RU')} ₽ (к доплате {netCost.toLocaleString('ru-RU')} ₽)
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold text-center border border-white/5">
                      Ваше текущее место жительства ✓
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEstateBuy(est)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        canAfford
                          ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 active:scale-98'
                          : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Переехать ({netCost.toLocaleString('ru-RU')} ₽)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmEstate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmEstate(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel rounded-2xl p-6 border border-sky-500/30 w-full max-w-md z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Оформление сделки</h4>
                  <p className="text-xs text-slate-400">Переезд в «{confirmEstate.name}»</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Стоимость недвижимости:</span>
                  <span className="text-white">{confirmEstate.cost.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Зачет трейд-ин ({currentEst.name}):</span>
                  <span className="text-amber-400">
                    -{Math.floor(currentEst.cost * tradeInRate).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-sm">
                  <span className="text-slate-300">Итого к оплате:</span>
                  <span className="text-emerald-400">
                    {Math.max(0, confirmEstate.cost - Math.floor(currentEst.cost * tradeInRate)).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={executeEstateBuy}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Подтвердить покупку
                </button>
                <button
                  onClick={() => setConfirmEstate(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
