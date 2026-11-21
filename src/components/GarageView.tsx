import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { CARS } from '../data/gameData';
import { calcTotalCapital, getPrestigeInfo } from '../services/gameEngine';
import { Car, Fuel, Wrench, Trophy, AlertTriangle, ShieldCheck, Zap, Gauge } from 'lucide-react';
import { RussianPlateBadge } from './common/RussianPlateBadge';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GarageView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
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
  const [raceBet, setRaceBet] = useState(10000);
  const [raceResult, setRaceResult] = useState<string | null>(null);
  const [confirmSellCar, setConfirmSellCar] = useState(false);

  if (!state.car) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-8 text-center space-y-4"
      >
        <Car className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">В вашем гараже пусто</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Приобретите отечественный автомобиль или премиальную иномарку в разделе «Автосалон»!
        </p>
      </motion.div>
    );
  }

  const carDef = CARS.find((c) => c.id === state.car!.id) || CARS[0];

  // Discounts
  const hasOilDepot = state.businesses.some((b) => b.id === 'b_10');
  const fuelLiterCost = hasOilDepot ? 52 : 65;

  const hasAutoService = state.businesses.some((b) => b.id === 'b_4');
  let repairBaseCost = 25000;
  if (carDef.repairDisc) repairBaseCost *= 1 - carDef.repairDisc;
  if (hasAutoService) repairBaseCost *= 0.75;

  const stageCosts = [150000, 300000, 450000];
  const nextStageCost = state.car.stage < 3 ? stageCosts[state.car.stage] : null;

  // REFUEL HANDLER
  const handleRefuel = () => {
    const needLiters = 40 - state.car!.fuel;
    if (needLiters <= 0) {
      setMsg({ text: 'Бак уже полностью полон!', isError: true });
      return;
    }
    const cost = Math.ceil(needLiters * fuelLiterCost);
    if (state.rub < cost) {
      setMsg({ text: `Недостаточно средств на заправку (${cost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - cost,
      car: prev.car ? { ...prev.car, fuel: 40 } : null,
    }));
    setMsg({ text: `Бак автомобиля заправлен до 40 л за ${cost.toLocaleString('ru-RU')} ₽` });
  };

  // REPAIR HANDLER
  const handleRepair = () => {
    const wear = 100 - state.car!.cond;
    if (wear <= 0) {
      setMsg({ text: 'Автомобиль в идеальном техническом состоянии (100%)!', isError: true });
      return;
    }
    const cost = Math.ceil((wear / 100) * repairBaseCost);
    if (state.rub < cost) {
      setMsg({ text: `Недостаточно средств на ремонт (${cost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - cost,
      car: prev.car ? { ...prev.car, cond: 100 } : null,
    }));
    setMsg({ text: `Автомобиль полностью отремонтирован за ${cost.toLocaleString('ru-RU')} ₽` });
  };

  // STAGE UPGRADE HANDLER
  const handleStageUpgrade = () => {
    if (!state.car || !nextStageCost || state.car.stage >= 3) return;
    const currentStage = state.car.stage;
    if (state.rub < nextStageCost) {
      setMsg({ text: `Недостаточно средств на Stage ${currentStage + 1} (${nextStageCost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }

    const hpMultiplier = carDef.stageBoost || 0.15;
    const addedHp = Math.round(carDef.hp * hpMultiplier);

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - nextStageCost,
      car: prev.car
        ? {
            ...prev.car,
            stage: prev.car.stage + 1,
            hp: prev.car.hp + addedHp,
          }
        : null,
    }));

    setMsg({ text: `Тюнинг Stage ${currentStage + 1} установлен! Мощность увеличена на +${addedHp} л.с.` });
  };

  // RACE HANDLER
  const handleRace = () => {
    if (state.car!.fuel < 5) {
      setMsg({ text: 'Недостаточно бензина для заезда (требуется 5 л)!', isError: true });
      return;
    }
    if (state.car!.cond < 20) {
      setMsg({ text: 'Состояние авто ниже 20%! Требуется ремонт.', isError: true });
      return;
    }
    if (state.rub < raceBet) {
      setMsg({ text: 'Недостаточно средств для ставки на заезд', isError: true });
      return;
    }

    // Проверка документов (права и госномер)
    const hasPlate = !!state.car!.plateNumber;
    const hasLicense = state.hasDriverLicense;
    const isPhantom = carDef.dpsImmune || state.activeFaction === 'f_gov';

    // Штраф ГИБДД (25%) при отсутствии документов
    if (!isPhantom && (!hasPlate || !hasLicense) && Math.random() < 0.25) {
      const fineAmount = Math.floor(carDef.cost * 0.25);
      onUpdateState((prev) => ({
        ...prev,
        rub: Math.max(0, prev.rub - fineAmount),
        car: prev.car ? { ...prev.car, cond: Math.max(0, prev.car.cond - 15) } : null,
        finesLog: [
          {
            id: 'dps_' + Date.now(),
            time: Date.now(),
            source: 'ГИБДД',
            desc: `Перехват на Автодроме за езду ${!hasLicense ? 'без прав' : ''} ${!hasPlate ? 'без госномера' : ''}. Машина повреждена (-15%).`,
            amountText: `-${fineAmount.toLocaleString('ru-RU')} ₽`,
          },
          ...prev.finesLog,
        ],
      }));

      setRaceResult(`🚨 Заезд прерван патрулем ГИБДД! Выписан штраф ${fineAmount.toLocaleString('ru-RU')} ₽ и повреждено авто.`);
      return;
    }

    // Расчет шанса победы
    const hpBoostBonus = 0.25 * ((state.car!.hp - carDef.hp) / carDef.hp);
    const drivingBonus = state.drivingXp / 1000;
    const winChance = Math.min(0.85, 0.45 + hpBoostBonus + carDef.winBonus + drivingBonus);

    // Списание ставки, бензина и износа
    const raceWear = carDef.halfRaceWear ? 1.5 : carDef.noShiftWear ? 2.0 : 3.0;
    const isWin = Math.random() < winChance;

    onUpdateState((prev) => {
      let nextRub = prev.rub - raceBet;
      let nextXp = prev.drivingXp;
      let nextCar = prev.car
        ? {
            ...prev.car,
            fuel: Math.max(0, prev.car.fuel - 5),
            cond: Math.max(0, prev.car.cond - raceWear),
          }
        : null;

      if (isWin) {
        const prize = Math.floor(raceBet * 1.90 * carDef.prizeMult);
        nextRub += prize;
        nextXp = Math.min(100, nextXp + 2);
      }

      return {
        ...prev,
        rub: nextRub,
        drivingXp: nextXp,
        car: nextCar,
      };
    });

    if (isWin) {
      const prize = Math.floor(raceBet * 1.90 * carDef.prizeMult);
      setRaceResult(`🏁 ПОБЕДА! Выигрыш: ${prize.toLocaleString('ru-RU')} ₽ (+2 Опыта вождения)`);
    } else {
      setRaceResult(`❌ Поражение на треке. Ставка ${raceBet.toLocaleString('ru-RU')} ₽ проиграна.`);
    }
  };

  return (
    <div className="space-y-6">


      {/* Vehicle Hero Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              >
                <Car className="w-5 h-5" />
              </motion.div>
              <h2 className="text-lg font-bold text-white">{carDef.name}</h2>
              {state.car.stage > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  Stage {state.car.stage}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{carDef.desc}</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {state.car.plateNumber && (
              <RussianPlateBadge plate={state.car.plateNumber} size="md" />
            )}
            {state.ownedPlates && state.ownedPlates.length > 0 ? (
              <select
                value={state.car.plateNumber || ''}
                onChange={(e) => {
                  const selected = e.target.value || null;
                  onUpdateState((prev) => ({
                    ...prev,
                    car: prev.car ? { ...prev.car, plateNumber: selected } : null,
                  }));
                  setMsg({ text: selected ? `Установлен госномер «${selected}»` : 'Номер снят' });
                }}
                className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-900 border border-white/20 text-amber-300 font-bold tracking-wider cursor-pointer"
                title="Сменить номерной знак"
              >
                <option value="">БЕЗ НОМЕРА</option>
                {state.ownedPlates.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white font-mono">
                    {p}
                  </option>
                ))}
              </select>
            ) : !state.car.plateNumber ? (
              <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 font-bold tracking-wider">
                БЕЗ НОМЕРА
              </span>
            ) : null}
          </div>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[11px]">Мощность</span>
            <div className="text-base font-bold text-white mt-0.5">{state.car.hp} л.с.</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[11px]">Топливо</span>
            <div className="text-base font-bold text-amber-300 mt-0.5">{state.car.fuel} / 40 л</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[11px]">Состояние</span>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{state.car.cond.toFixed(1)}%</div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[11px]">Опыт</span>
            <div className="text-base font-bold text-sky-400 mt-0.5">{state.drivingXp} / 100 XP</div>
          </div>
        </div>

        {/* Maintenance Actions */}
        <div className="flex flex-wrap gap-2.5 mt-5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRefuel}
            className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-amber-600/20"
          >
            <Fuel className="w-4 h-4" />
            <span>Заправить ({fuelLiterCost} ₽/л)</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRepair}
            className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-emerald-400" />
            <span>Ремонт</span>
          </motion.button>

          {nextStageCost && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStageUpgrade}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>Тюнинг Stage {state.car.stage + 1} ({nextStageCost.toLocaleString('ru-RU')} ₽)</span>
            </motion.button>
          )}

          {(() => {
            const prestige = getPrestigeInfo(calcTotalCapital(state));
            let sellRefund = Math.floor(carDef.cost * prestige.tradeInRate);
            if (state.car.stage === 1) sellRefund += Math.floor(150000 * prestige.tradeInRate);
            if (state.car.stage === 2) sellRefund += Math.floor((150000 + 300000) * prestige.tradeInRate);
            if (state.car.stage === 3) sellRefund += Math.floor((150000 + 300000 + 450000) * prestige.tradeInRate);

            return (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setConfirmSellCar(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-950/40 border border-rose-500/20 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Продать авто (+{sellRefund.toLocaleString('ru-RU')} ₽)</span>
              </motion.button>
            );
          })()}
        </div>
      </motion.div>

      {/* Autodrome PvE Races */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5 space-y-4 border-amber-500/20"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Автодром</h3>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            Множитель: x{carDef.prizeMult.toFixed(2)}
          </span>
        </div>

        {raceResult && (
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-center font-bold text-xs sm:text-sm text-amber-300">
            {raceResult}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 max-w-full">
            {[10000, 50000, 250000, 1000000].map((b) => (
              <button
                key={b}
                onClick={() => setRaceBet(b)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  raceBet === b
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {b.toLocaleString('ru-RU')} ₽
              </button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRace}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer text-center"
          >
            Старт ({raceBet.toLocaleString('ru-RU')} ₽)
          </motion.button>
        </div>
      </motion.div>

      {/* Confirmation Modal: Sell Car */}
      <AnimatePresence>
        {confirmSellCar && (() => {
          const prestige = getPrestigeInfo(calcTotalCapital(state));
          let sellRefund = Math.floor(carDef.cost * prestige.tradeInRate);
          if (state.car.stage === 1) sellRefund += Math.floor(150000 * prestige.tradeInRate);
          if (state.car.stage === 2) sellRefund += Math.floor((150000 + 300000) * prestige.tradeInRate);
          if (state.car.stage === 3) sellRefund += Math.floor((150000 + 300000 + 450000) * prestige.tradeInRate);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-white/20"
              >
                <h3 className="text-base font-bold text-white">Продажа автомобиля</h3>
                <p className="text-xs text-slate-300">
                  Вы действительно хотите продать «{carDef.name}» дилеру по ставке трейд-ин {Math.round(prestige.tradeInRate * 100)}%?
                </p>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-sm text-emerald-400 font-bold">
                  К выплате: +{sellRefund.toLocaleString('ru-RU')} ₽
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub + sellRefund,
                        car: null,
                      }));
                      setMsg({ text: `Автомобиль «${carDef.name}» успешно продан за +${sellRefund.toLocaleString('ru-RU')} ₽!` });
                      setConfirmSellCar(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Продать
                  </button>
                  <button
                    onClick={() => setConfirmSellCar(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
