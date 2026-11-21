import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DealersSubTab, GameState } from '../types/game';
import { CARS, ESTATES, EstateDef, CarDef } from '../data/gameData';
import { Home, Car, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DealersView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
  const [subTab, setSubTab] = useState<DealersSubTab>('estate');
  
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

  // Confirmation Modals
  const [confirmEstate, setConfirmEstate] = useState<EstateDef | null>(null);
  const [confirmCar, setConfirmCar] = useState<CarDef | null>(null);

  const currentEst = ESTATES.find((e) => e.id === state.estateId) || ESTATES[0];

  // ESTATE BUY HANDLER
  const handleEstateBuy = (target: EstateDef) => {
    if (state.estateId === target.id) return;

    // Проверка лимита сейфа при даунгрейде
    if (target.safe < state.homeSafeRub) {
      setMsg({
        text: `Сделка заблокирована! В вашем сейфе лежит ${state.homeSafeRub.toLocaleString('ru-RU')} ₽, а новый сейф вмещает только ${target.safe.toLocaleString('ru-RU')} ₽. Сначала заберите излишек на руки!`,
        isError: true,
      });
      return;
    }

    const tradeInRefund = Math.floor(currentEst.cost * 0.70);
    const netCost = target.cost - tradeInRefund;

    if (state.rub < netCost) {
      setMsg({ text: `Недостаточно средств с учетом трейд-ин (требуется доплата ${netCost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }

    setConfirmEstate(target);
  };

  const executeEstateBuy = () => {
    if (!confirmEstate) return;
    const tradeInRefund = Math.floor(currentEst.cost * 0.70);
    const netCost = confirmEstate.cost - tradeInRefund;

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - netCost,
      estateId: confirmEstate.id,
      purchaseDates: {
        ...prev.purchaseDates,
        [confirmEstate.id]: Date.now(),
      },
    }));

    setMsg({ text: `Сделка оформлена! Вы успешно переехали в «${confirmEstate.name}» (Трейд-ин возврат: +${tradeInRefund.toLocaleString('ru-RU')} ₽).` });
    setConfirmEstate(null);
  };

  // CAR BUY HANDLER
  const handleCarBuy = (target: CarDef) => {
    if (state.car?.id === target.id) return;

    let tradeInRefund = 0;
    if (state.car) {
      const oldCarDef = CARS.find((c) => c.id === state.car!.id);
      if (oldCarDef) {
        tradeInRefund = Math.floor(oldCarDef.cost * 0.70);
        if (state.car.stage === 1) tradeInRefund += Math.floor(150000 * 0.7);
        if (state.car.stage === 2) tradeInRefund += Math.floor((150000 + 300000) * 0.7);
        if (state.car.stage === 3) tradeInRefund += Math.floor((150000 + 300000 + 450000) * 0.7);
      }
    }

    const netCost = target.cost - tradeInRefund;
    if (state.rub < netCost) {
      setMsg({ text: `Недостаточно средств (требуется доплата ${netCost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }

    setConfirmCar(target);
  };

  const executeCarBuy = () => {
    if (!confirmCar) return;

    let tradeInRefund = 0;
    let savedPlate = state.car?.plateNumber || null;

    if (state.car) {
      const oldCarDef = CARS.find((c) => c.id === state.car!.id);
      if (oldCarDef) {
        tradeInRefund = Math.floor(oldCarDef.cost * 0.70);
        if (state.car.stage === 1) tradeInRefund += Math.floor(150000 * 0.7);
        if (state.car.stage === 2) tradeInRefund += Math.floor((150000 + 300000) * 0.7);
        if (state.car.stage === 3) tradeInRefund += Math.floor((150000 + 300000 + 450000) * 0.7);
      }
    }

    const netCost = confirmCar.cost - tradeInRefund;

    onUpdateState((prev) => {
      const plates = [...prev.ownedPlates];
      if (savedPlate && !plates.includes(savedPlate)) {
        plates.push(savedPlate);
      }

      return {
        ...prev,
        rub: prev.rub - netCost,
        car: {
          id: confirmCar.id,
          hp: confirmCar.hp,
          stage: 0,
          fuel: 40,
          cond: 100,
          plateNumber: plates[0] || null,
          purchasedAt: Date.now(),
        },
        ownedPlates: plates,
        purchaseDates: {
          ...prev.purchaseDates,
          [confirmCar.id]: Date.now(),
        },
      };
    });

    setMsg({ text: `Автомобиль «${confirmCar.name}» успешно приобретен! Трейд-ин старого авто составил +${tradeInRefund.toLocaleString('ru-RU')} ₽.` });
    setConfirmCar(null);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setSubTab('estate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
            subTab === 'estate'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Недвижимость (10 объектов)</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setSubTab('cars')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
            subTab === 'cars'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Автосалон (20 моделей)</span>
        </motion.button>
      </div>



      {/* 1. REAL ESTATE CATALOGUE */}
      {subTab === 'estate' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ESTATES.map((est) => {
            const isCurrent = state.estateId === est.id;
            const refund = Math.floor(currentEst.cost * 0.70);
            const netPrice = Math.max(0, est.cost - refund);

            return (
              <motion.div
                key={est.id}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-sky-950/30 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{est.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Ваше жилье
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{est.desc}</p>

                  <div className="text-xs font-mono space-y-1 mb-4 text-slate-300">
                    <div>
                      Цена покупки: <span className="font-bold text-white">{est.cost.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div>
                      Сейф (10%): <span className="text-emerald-400 font-bold">{est.safe.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div>
                      Регенерация: <span className="text-yellow-400">+{est.sleepBonus}%</span>
                    </div>
                    <div>
                      Кофе: <span className="text-amber-400">{est.coffee ? `+${est.coffeeRestore}⚡ раз в сутки` : 'Нет'}</span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={!isCurrent ? { scale: 1.02 } : {}}
                  whileTap={!isCurrent ? { scale: 0.98 } : {}}
                  onClick={() => handleEstateBuy(est)}
                  disabled={isCurrent}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-white/5 text-slate-500 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  {isCurrent ? 'Текущее место' : `Переехать (доплата ${netPrice.toLocaleString('ru-RU')} ₽)`}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 2. CARS CATALOGUE */}
      {subTab === 'cars' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARS.map((car) => {
            const isCurrent = state.car?.id === car.id;

            return (
              <motion.div
                key={car.id}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-sky-950/30 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{car.name}</span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{car.hp} л.с.</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{car.desc}</p>

                  <div className="text-xs font-mono space-y-1 mb-4 text-slate-300">
                    <div>
                      Цена в салоне: <span className="font-bold text-white">{car.cost.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div>
                      Бонус к гонке: <span className="text-sky-400">+{Math.round(car.winBonus * 100)}%</span>
                    </div>
                    <div>
                      Множитель приза: <span className="text-emerald-400">x{car.prizeMult.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={!isCurrent ? { scale: 1.02 } : {}}
                  whileTap={!isCurrent ? { scale: 0.98 } : {}}
                  onClick={() => handleCarBuy(car)}
                  disabled={isCurrent}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-white/5 text-slate-500 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  {isCurrent ? 'В вашем гараже' : `Купить (${car.cost.toLocaleString('ru-RU')} ₽)`}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Estate Confirmation Modal */}
      <AnimatePresence>
        {confirmEstate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-white/20"
            >
              <h3 className="text-base font-bold text-white">Подтверждение сделки с недвижимостью</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Вы переезжаете в «{confirmEstate.name}». Старое жилье автоматически сдается в трейд-ин со ставкой возврата 70%.
              </p>

              <div className="text-xs font-mono space-y-1 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div>Новое жилье: {confirmEstate.cost.toLocaleString('ru-RU')} ₽</div>
                <div>Трейд-ин старого: -{Math.floor(currentEst.cost * 0.70).toLocaleString('ru-RU')} ₽</div>
                <div className="text-emerald-400 font-bold pt-1 border-t border-white/10">
                  Итого к доплате: {Math.max(0, confirmEstate.cost - Math.floor(currentEst.cost * 0.70)).toLocaleString('ru-RU')} ₽
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={executeEstateBuy}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Оформить сделку
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmEstate(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs cursor-pointer"
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Car Confirmation Modal */}
      <AnimatePresence>
        {confirmCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-white/20"
            >
              <h3 className="text-base font-bold text-white">Подтверждение покупки автомобиля</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                При покупке «{confirmCar.name}» старое авто сдается в трейд-ин с учетом 70% от всех ранее установленных тюнингов Stage!
              </p>

              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={executeCarBuy}
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
                >
                  Подтвердить покупку
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmCar(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs cursor-pointer"
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
