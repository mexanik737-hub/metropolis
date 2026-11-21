import React, { useState } from 'react';
import { GameState } from '../types/game';
import { CARS, DRILLS, PRESSES, SERVERS, BUSINESSES } from '../data/gameData';
import { Wrench, Fuel, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
}

export const MaintenanceView: React.FC<Props> = ({ state, onUpdateState }) => {
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // 1. Car costs
  let carFuelCost = 0;
  let carRepairCost = 0;
  if (state.car) {
    const cDef = CARS.find((c) => c.id === state.car!.id);
    if (cDef) {
      const hasOilDepot = state.businesses.some((b) => b.id === 'b_10');
      const fuelRate = hasOilDepot ? 52 : 65;
      carFuelCost = Math.ceil((40 - state.car.fuel) * fuelRate);

      let repBase = 25000;
      if (cDef.repairDisc) repBase *= 1 - cDef.repairDisc;
      if (state.businesses.some((b) => b.id === 'b_4')) repBase *= 0.75;
      carRepairCost = Math.ceil(((100 - state.car.cond) / 100) * repBase);
    }
  }

  // 2. Drill costs
  let drillFuelCost = 0;
  let drillRepairCost = 0;
  if (state.drill) {
    const dDef = DRILLS.find((d) => d.id === state.drill!.id);
    if (dDef) {
      const fuelLostRatio = (32400 - state.drill.fuelSeconds) / 32400;
      drillFuelCost = Math.ceil(dDef.fuelCostTotal * fuelLostRatio);

      const wearRatio = (100 - state.drill.bitDurability) / 100;
      drillRepairCost = Math.ceil(dDef.repairRub * wearRatio);
    }
  }

  // 3. Printer costs
  let pressRepairCost = 0;
  if (state.press) {
    const pDef = PRESSES.find((p) => p.id === state.press!.id);
    if (pDef) {
      const wear = (100 - state.press.durability) / 100;
      pressRepairCost = Math.ceil(pDef.repRub * wear);
    }
  }

  // 4. Server electric OpEx bills
  let serverOpexCost = 0;
  let opexPerHour = 0;
  Object.entries(state.servers).forEach(([sId, count]) => {
    const sDef = SERVERS.find((s) => s.id === sId);
    if (sDef) opexPerHour += sDef.opexRub * count;
  });
  let discount = 1.0;
  state.businesses.forEach((b) => {
    const bDef = BUSINESSES.find((item) => item.id === b.id);
    if (bDef?.electricDiscount) discount = Math.min(discount, 1 - bDef.electricDiscount);
  });
  serverOpexCost = Math.floor(opexPerHour * (state.serverAccumSec / 3600) * discount);

  const grandTotal = carFuelCost + carRepairCost + drillFuelCost + drillRepairCost + pressRepairCost + serverOpexCost;

  const handleServiceAll = () => {
    if (grandTotal <= 0) {
      setMsg({ text: 'Все ваши активы полностью обслужены и исправны!', isError: false });
      return;
    }
    if (state.rub < grandTotal) {
      setMsg({
        text: `Недостаточно средств для полного обслуживания! Требуется ${grandTotal.toLocaleString('ru-RU')} ₽`,
        isError: true,
      });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - grandTotal,
      car: prev.car ? { ...prev.car, fuel: 40, cond: 100 } : null,
      drill: prev.drill ? { ...prev.drill, fuelSeconds: 32400, bitDurability: 100 } : null,
      press: prev.press ? { ...prev.press, durability: 100 } : null,
      serverAccumSec: 0,
      btc: prev.btc + prev.unclaimedBtc,
      unclaimedBtc: 0,
    }));

    setMsg({ text: `Все активы обслужены в 1 клик за ${grandTotal.toLocaleString('ru-RU')} ₽! Намайненный ₿ зачислен.` });
  };

  const handleFuelCar = () => {
    if (carFuelCost <= 0) return;
    if (state.rub < carFuelCost) {
      setMsg({ text: `Недостаточно средств на заправку (${carFuelCost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - carFuelCost,
      car: prev.car ? { ...prev.car, fuel: 40 } : null,
    }));
    setMsg({ text: `Бак авто заправлен до 40 л за ${carFuelCost.toLocaleString('ru-RU')} ₽` });
  };

  const handleRepairCar = () => {
    if (carRepairCost <= 0) return;
    if (state.rub < carRepairCost) {
      setMsg({ text: `Недостаточно средств на ремонт (${carRepairCost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - carRepairCost,
      car: prev.car ? { ...prev.car, cond: 100 } : null,
    }));
    setMsg({ text: `Автомобиль полностью отремонтирован за ${carRepairCost.toLocaleString('ru-RU')} ₽` });
  };

  const handleFuelDrill = () => {
    if (drillFuelCost <= 0) return;
    if (state.rub < drillFuelCost) {
      setMsg({ text: `Недостаточно средств на топливо бура (${drillFuelCost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - drillFuelCost,
      drill: prev.drill ? { ...prev.drill, fuelSeconds: 32400 } : null,
    }));
    setMsg({ text: `Бур заправлен на 9 часов работы за ${drillFuelCost.toLocaleString('ru-RU')} ₽` });
  };

  const handleRepairDrill = () => {
    if (drillRepairCost <= 0) return;
    if (state.rub < drillRepairCost) {
      setMsg({ text: `Недостаточно средств на ремонт коронки (${drillRepairCost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - drillRepairCost,
      drill: prev.drill ? { ...prev.drill, bitDurability: 100 } : null,
    }));
    setMsg({ text: `Коронка бура восстановлена до 100% за ${drillRepairCost.toLocaleString('ru-RU')} ₽` });
  };

  const handleRepairPress = () => {
    if (pressRepairCost <= 0) return;
    if (state.rub < pressRepairCost) {
      setMsg({ text: `Недостаточно средств на ремонт станка (${pressRepairCost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - pressRepairCost,
      press: prev.press ? { ...prev.press, durability: 100 } : null,
    }));
    setMsg({ text: `Печатный станок отремонтирован за ${pressRepairCost.toLocaleString('ru-RU')} ₽` });
  };

  const handlePayServers = () => {
    if (serverOpexCost <= 0 && state.unclaimedBtc <= 0) return;
    if (state.rub < serverOpexCost) {
      setMsg({ text: `Недостаточно средств на оплату электроэнергии (${serverOpexCost.toLocaleString('ru-RU')} ₽)!`, isError: true });
      return;
    }
    const claimed = state.unclaimedBtc;
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - serverOpexCost,
      serverAccumSec: 0,
      btc: prev.btc + prev.unclaimedBtc,
      unclaimedBtc: 0,
    }));
    setMsg({ text: `Счет за электричество оплачен (${serverOpexCost.toLocaleString('ru-RU')} ₽). Начислено +${claimed.toFixed(4)} ₿!` });
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-sm ${
            msg.isError ? 'bg-rose-950/40 border-rose-500/30 text-rose-300' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-xs opacity-70 hover:opacity-100">Закрыть</button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 border-sky-500/20">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Техническое Обслуживание & Сервис</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Комплексный сервис всех активов или раздельная заправка и ремонт
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400">Общая сумма:</span>
            <div className="text-xl font-bold font-mono text-amber-400">
              {grandTotal.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <button
            onClick={handleServiceAll}
            disabled={grandTotal <= 0}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
              grandTotal > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 cursor-pointer'
                : 'bg-white/5 text-slate-500 cursor-default'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Обслужить всё</span>
          </button>
        </div>
      </div>

      {/* Grid of services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Car Maintenance */}
        <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs sm:text-sm text-white">Автомобиль</span>
              <span className="text-xs font-mono text-slate-400">{state.car ? state.car.id : 'Нет авто'}</span>
            </div>

            <div className="text-xs font-mono space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Топливо ({state.car?.fuel || 0}/40л):</span>
                <span className={carFuelCost > 0 ? 'text-amber-400' : 'text-emerald-400'}>{carFuelCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ремонт ({state.car?.cond || 100}%):</span>
                <span className={carRepairCost > 0 ? 'text-amber-400' : 'text-emerald-400'}>{carRepairCost.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          {state.car && (
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button
                onClick={handleFuelCar}
                disabled={carFuelCost <= 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  carFuelCost > 0 ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer' : 'bg-white/5 text-slate-500 cursor-default'
                }`}
              >
                Заправить
              </button>
              <button
                onClick={handleRepairCar}
                disabled={carRepairCost <= 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  carRepairCost > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' : 'bg-white/5 text-slate-500 cursor-default'
                }`}
              >
                Починить
              </button>
            </div>
          )}
        </div>

        {/* Drill Maintenance */}
        <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs sm:text-sm text-white">Буровой комплекс</span>
              <span className="text-xs font-mono text-slate-400">{state.drill ? state.drill.id : 'Нет бура'}</span>
            </div>

            <div className="text-xs font-mono space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Топливо:</span>
                <span className={drillFuelCost > 0 ? 'text-amber-400' : 'text-emerald-400'}>{drillFuelCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Коронка ({state.drill?.bitDurability || 100}%):</span>
                <span className={drillRepairCost > 0 ? 'text-amber-400' : 'text-emerald-400'}>{drillRepairCost.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          {state.drill && (
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button
                onClick={handleFuelDrill}
                disabled={drillFuelCost <= 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  drillFuelCost > 0 ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer' : 'bg-white/5 text-slate-500 cursor-default'
                }`}
              >
                Заправить
              </button>
              <button
                onClick={handleRepairDrill}
                disabled={drillRepairCost <= 0}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  drillRepairCost > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' : 'bg-white/5 text-slate-500 cursor-default'
                }`}
              >
                Починить
              </button>
            </div>
          )}
        </div>

        {/* Printer Maintenance */}
        <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs sm:text-sm text-white">Печатный станок</span>
              <span className="text-xs font-mono text-slate-400">{state.press ? state.press.id : 'Нет станка'}</span>
            </div>

            <div className="text-xs font-mono space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Износ ({state.press?.durability || 100}%):</span>
                <span className={pressRepairCost > 0 ? 'text-amber-400' : 'text-emerald-400'}>{pressRepairCost.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          {state.press && (
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handleRepairPress}
                disabled={pressRepairCost <= 0}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pressRepairCost > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' : 'bg-white/5 text-slate-500 cursor-default'
                }`}
              >
                Обслужить станок
              </button>
            </div>
          )}
        </div>

        {/* Server Electricity Bill */}
        <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs sm:text-sm text-white">Серверы майнинга</span>
              <span className="text-xs font-mono text-slate-400">
                {Object.values(state.servers).reduce((a, b) => a + b, 0)} шт
              </span>
            </div>

            <div className="text-xs font-mono space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Счет за свет:</span>
                <span className={serverOpexCost > 0 ? 'text-amber-400' : 'text-emerald-400'}>{serverOpexCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Намайнено ₿:</span>
                <span className="text-amber-400 font-bold">{state.unclaimedBtc.toFixed(4)} ₿</span>
              </div>
            </div>
          </div>

          {Object.values(state.servers).some((cnt) => cnt > 0) && (
            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handlePayServers}
                disabled={serverOpexCost <= 0 && state.unclaimedBtc <= 0}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  serverOpexCost > 0 || state.unclaimedBtc > 0
                    ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                    : 'bg-white/5 text-slate-500 cursor-default'
                }`}
              >
                Оплатить счет & забрать ₿
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
