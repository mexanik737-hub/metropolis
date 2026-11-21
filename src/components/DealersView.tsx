import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { CARS, CarDef } from '../data/gameData';
import { calcTotalCapital, getPrestigeInfo } from '../services/gameEngine';
import { Car, Zap, Trophy, ShieldCheck, CheckCircle2, Gauge, AlertTriangle } from 'lucide-react';
import { EntityPlate } from './common/EntityPlate';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DealersView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
  const notify = (text: string, isError = false) => {
    if (onShowToast) {
      onShowToast(text, isError ? 'error' : 'success');
    }
  };

  const [confirmCar, setConfirmCar] = useState<CarDef | null>(null);
  const [carFilter, setCarFilter] = useState<'all' | 'domestic' | 'foreign' | 'sport'>('all');

  const prestige = getPrestigeInfo(calcTotalCapital(state));
  const tradeInRate = prestige.tradeInRate;
  const isFinConsortium = state.activeFaction === 'f_fin';
  const getTargetCost = (c: number) => (isFinConsortium ? Math.floor(c * 0.98) : c);

  // Calculate current car trade-in value including tuning stages
  let currentCarTradeIn = 0;
  let currentCarDef: CarDef | null = null;
  if (state.car) {
    currentCarDef = CARS.find((c) => c.id === state.car!.id) || null;
    if (currentCarDef) {
      currentCarTradeIn = Math.floor(currentCarDef.cost * tradeInRate);
      if (state.car.stage === 1) currentCarTradeIn += Math.floor(150000 * tradeInRate);
      if (state.car.stage === 2) currentCarTradeIn += Math.floor((150000 + 300000) * tradeInRate);
      if (state.car.stage === 3) currentCarTradeIn += Math.floor((150000 + 300000 + 450000) * tradeInRate);
    }
  }

  // CAR BUY HANDLER
  const handleCarBuy = (target: CarDef) => {
    if (state.car?.id === target.id) return;

    const discountedCost = getTargetCost(target.cost);
    const netCost = Math.max(0, discountedCost - currentCarTradeIn);

    if (state.rub < netCost) {
      notify(`Недостаточно средств с учетом трейд-ин (требуется доплата ${netCost.toLocaleString('ru-RU')} ₽)`, true);
      return;
    }

    setConfirmCar(target);
  };

  const executeCarBuy = () => {
    if (!confirmCar) return;

    const savedPlate = state.car?.plateNumber || null;
    const discountedCost = getTargetCost(confirmCar.cost);
    const netCost = Math.max(0, discountedCost - currentCarTradeIn);

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

    notify(
      `Автомобиль «${confirmCar.name}» успешно приобретен! Зачтен трейд-ин +${currentCarTradeIn.toLocaleString('ru-RU')} ₽.${
        savedPlate ? ` Госномер «${savedPlate}» перенесен на новый авто.` : ''
      }`
    );
    setConfirmCar(null);
  };

  const filteredCars = CARS.filter((car) => {
    if (carFilter === 'domestic') return !car.isForeign;
    if (carFilter === 'foreign') return car.isForeign && car.cost < 5000000;
    if (carFilter === 'sport') return car.cost >= 5000000;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Dealership Header & Current Car Trade-in Status */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 to-teal-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Car className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Центральный Автосалон Метрополиса
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Дилер
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Новые автомобили от дилера с заводской гарантией и мгновенной оценкой Trade-In ({Math.round(tradeInRate * 100)}%).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono w-full md:w-auto">
            {state.car && currentCarDef ? (
              <div className="bg-black/40 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 w-full md:w-auto">
                <span className="text-slate-400 block text-[10px]">Ваш авто в трейд-ин:</span>
                <span className="text-white font-bold">{currentCarDef.name}</span>
                <span className="text-emerald-400 font-bold block mt-0.5">
                  +{currentCarTradeIn.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            ) : (
              <div className="bg-black/30 px-3.5 py-2 rounded-xl border border-white/10 text-slate-400 w-full md:w-auto text-center md:text-left">
                Гараж пуст · Сделка без трейд-ин
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs Slider */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5 text-xs overflow-x-auto no-scrollbar scroll-smooth shrink-0 max-w-full">
          {[
            { id: 'all' as const, label: 'Все модели' },
            { id: 'domestic' as const, label: 'Отечественные' },
            { id: 'foreign' as const, label: 'Иномарки' },
            { id: 'sport' as const, label: 'Спорт & Гиперкары' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCarFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                carFilter === tab.id
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-slate-400 self-end sm:self-auto">
          В наличии: {filteredCars.length} авто
        </span>
      </div>

      {/* Cars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCars.map((car) => {
          const isCurrent = state.car?.id === car.id;
          const discountedCost = getTargetCost(car.cost);
          const netCost = Math.max(0, discountedCost - (isCurrent ? 0 : currentCarTradeIn));
          const canAfford = state.rub >= netCost;

          return (
            <div
              key={car.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-xl shadow-emerald-500/10'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-bold text-white text-base tracking-wide">{car.name}</h4>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold block mt-0.5">
                      {car.isForeign ? 'Иномарка' : 'Отечественный'} · {car.hp} л.с.
                    </span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
                      В гараже
                    </span>
                  )}
                </div>

                {/* Car Specs */}
                <div className="space-y-1.5 py-3 border-y border-white/5 my-3 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Мощность:</span>
                    <span className="text-amber-400 font-bold">{car.hp} л.с.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Бонус к победе в гонках:</span>
                    <span className="text-sky-300 font-bold">+{Math.round(car.winBonus * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Множитель приза:</span>
                    <span className="text-emerald-400 font-bold">x{car.prizeMult.toFixed(2)}</span>
                  </div>
                  {car.dpsImmune && (
                    <div className="flex justify-between text-purple-400">
                      <span>Иммунитет ДПС:</span>
                      <span className="font-bold">Фантом ✓</span>
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <span className="text-xs text-slate-400 font-mono block">Цена автомобиля:</span>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {car.cost.toLocaleString('ru-RU')} ₽
                  </div>
                  {!isCurrent && currentCarTradeIn > 0 && (
                    <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                      Трейд-ин: -{currentCarTradeIn.toLocaleString('ru-RU')} ₽ (к доплате {netCost.toLocaleString('ru-RU')} ₽)
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5">
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold text-center border border-white/5">
                    Автомобиль припаркован в гараже ✓
                  </div>
                ) : (
                  <button
                    onClick={() => handleCarBuy(car)}
                    disabled={!canAfford}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      canAfford
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 active:scale-98'
                        : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>{state.car ? `Обменять (${netCost.toLocaleString('ru-RU')} ₽)` : `Купить (${car.cost.toLocaleString('ru-RU')} ₽)`}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Car Confirmation Modal */}
      <AnimatePresence>
        {confirmCar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmCar(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-panel rounded-2xl p-6 border border-emerald-500/30 w-full max-w-md z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Покупка автомобиля</h4>
                  <p className="text-xs text-slate-400">Оформление в автосалоне «{confirmCar.name}»</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Стоимость авто:</span>
                  <span className="text-white">{confirmCar.cost.toLocaleString('ru-RU')} ₽</span>
                </div>
                {state.car && currentCarDef && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Трейд-ин ({currentCarDef.name}):</span>
                    <span className="text-amber-400">
                      -{currentCarTradeIn.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-2 font-bold text-sm">
                  <span className="text-slate-300">Итого к доплате:</span>
                  <span className="text-emerald-400">
                    {Math.max(0, confirmCar.cost - currentCarTradeIn).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={executeCarBuy}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Оформить сделку
                </button>
                <button
                  onClick={() => setConfirmCar(null)}
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
