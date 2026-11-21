import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CareerSubTab, GameState } from '../types/game';
import {
  BUSINESSES,
  CARS,
  CONFIG,
  DRILLS,
  JOBS_ILLEGAL,
  JOBS_LEGAL,
  ORES,
  PRESSES,
  SERVERS,
} from '../data/gameData';
import { calcTotalCapital, getPrestigeInfo } from '../services/gameEngine';
import {
  Briefcase,
  Building,
  Pickaxe,
  Printer,
  Server,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Fuel,
  Wrench,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { EntityPlate } from './common/EntityPlate';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CareerView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
  const [subTab, setSubTab] = useState<CareerSubTab>('work');
  const [jobFilter, setJobFilter] = useState<'all' | 'legal' | 'illegal'>('all');
  
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

  // Modals
  const [sellOreModal, setSellOreModal] = useState<{ oreId: string; maxQty: number; price: number } | null>(null);
  const [sellQty, setSellQty] = useState(1);
  const [buyOreModal, setBuyOreModal] = useState<{ oreId: string; price: number } | null>(null);
  const [buyQty, setBuyQty] = useState(10);
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const [sector1Choice, setSector1Choice] = useState('ore_1');
  const [sector2Choice, setSector2Choice] = useState('ore_2');

  // Manual Mine drop feedback
  const [mineFeedback, setMineFeedback] = useState<string | null>(null);

  // WORK Handlers
  const handleWorkShift = (jobId: string, isIllegal: boolean) => {
    if (state.energy < 20) {
      setMsg({ text: 'Недостаточно энергии! Требуется 20 ⚡', isError: true });
      return;
    }

    if (isIllegal) {
      const job = JOBS_ILLEGAL.find((j) => j.id === jobId);
      if (!job) return;

      // Проверка расходника
      if (job.consumeItem) {
        const itemIdx = state.inventory.indexOf(job.consumeItem);
        if (itemIdx === -1) {
          setMsg({ text: `Отсутствует расходник: ${job.consumeItem}. Купите на Черном рынке!`, isError: true });
          return;
        }
      }

      // Проверка ПК
      if (job.reqItem && !state.inventory.includes(job.reqItem)) {
        setMsg({ text: 'Требуется Персональный компьютер (ПК)!', isError: true });
        return;
      }

      // Проверка принтера
      if (job.reqPress && !state.press) {
        setMsg({ text: 'Требуется собранный Принтер в цехе!', isError: true });
        return;
      }

      // Рейд МВД (5% - 20%)
      const mvdChance = CONFIG.MVD_MIN_CHANCE + (Math.abs(state.karma) / 10000) * (CONFIG.MVD_MAX_CHANCE - CONFIG.MVD_MIN_CHANCE);
      const isMvdRaid = Math.random() < mvdChance;

      let earnedUsd = job.salary;
      if (state.activeFaction === 'f_synd') {
        earnedUsd = Math.floor(earnedUsd * 1.15); // +15% Синдикат
      }
      if (isMvdRaid) {
        earnedUsd = Math.floor(earnedUsd * 0.5);
      }

      onUpdateState((prev) => {
        const inv = [...prev.inventory];
        if (job.consumeItem) {
          const idx = inv.indexOf(job.consumeItem);
          if (idx !== -1) inv.splice(idx, 1);
        }

        const nextState: GameState = {
          ...prev,
          energy: prev.energy - 20,
          karma: prev.karma + job.karma,
          usdCash: prev.usdCash + earnedUsd,
          inventory: inv,
          jobShifts: {
            ...prev.jobShifts,
            [job.id]: (prev.jobShifts[job.id] || 0) + 1,
          },
        };

        if (isMvdRaid) {
          nextState.raidCounters.mvdRaids += 1;
          nextState.finesLog.unshift({
            id: 'mvd_' + Date.now(),
            time: Date.now(),
            source: 'МВД',
            desc: `Рейд полиции на нелегальной смене «${job.name}». Изъято 50% заработка.`,
            amountText: `-${job.salary - earnedUsd} $`,
          });
        }

        return nextState;
      });

      if (isMvdRaid) {
        setMsg({
          text: `🚨 Внимание: Рейд МВД! Изъято 50% выручки. Получено чистыми: ${earnedUsd} $`,
          isError: true,
        });
      } else {
        setMsg({ text: `Смена «${job.name}» отработана: +${earnedUsd} $ наличными!` });
      }
    } else {
      // Легальная работа
      const job = JOBS_LEGAL.find((j) => j.id === jobId);
      if (!job) return;

      // Проверка требуемого предмета
      if (job.reqItem && !state.inventory.includes(job.reqItem)) {
        const itemName = job.reqItem === 'bicycle' ? 'Велосипед' : job.reqItem === 'pc' ? 'ПК' : job.reqItem;
        setMsg({ text: `Для работы требуется «${itemName}»! Купите в ТРЦ.`, isError: true });
        return;
      }

      // Проверка авто для такси (leg_5)
      if (job.reqCarIds && (!state.car || !job.reqCarIds.includes(state.car.id))) {
        setMsg({ text: 'Для работы в такси требуется отечественное авто (ВАЗ-2107, 2114 или Lada Vesta)!', isError: true });
        return;
      }

      // Проверка иномарки для частного водителя (leg_6)
      if (job.reqForeignCar) {
        const carDef = state.car ? CARS.find((c) => c.id === state.car!.id) : null;
        if (!carDef || !carDef.isForeign) {
          setMsg({ text: 'Для работы частным водителем требуется иномарка в гараже!', isError: true });
          return;
        }
      }

      // Проверка авто для водителей
      let payMult = 1.0;
      let fuelCost = 0;
      let wearCost = 0;

      if (job.fuelDrain || job.wearDrain) {
        if (!state.car) {
          setMsg({ text: 'Для работы требуется автомобиль в гараже!', isError: true });
          return;
        }
        if (state.car.fuel < (job.fuelDrain || 2)) {
          setMsg({ text: 'Недостаточно бензина в баке!', isError: true });
          return;
        }
        if (state.car.cond <= 5) {
          setMsg({ text: 'Автомобиль сломан! Требуется ремонт в Гараже.', isError: true });
          return;
        }

        fuelCost = job.fuelDrain || 2;
        wearCost = job.wearDrain || 1;

        // Перки авто
        const carDef = CARS.find((c) => c.id === state.car!.id);
        if (carDef?.fuelSave) fuelCost = Math.max(1, Math.floor(fuelCost / 2));
        if (carDef?.noShiftWear) wearCost = 0;
        if (carDef?.taxiBonus && job.id === 'leg_5') payMult += carDef.taxiBonus;
        if (carDef?.driverBonus && job.id === 'leg_6') payMult += carDef.driverBonus;
      }

      const totalPay = Math.floor(job.salary * payMult);

      onUpdateState((prev) => {
        let updatedCar = prev.car;
        if (updatedCar && (fuelCost > 0 || wearCost > 0)) {
          updatedCar = {
            ...updatedCar,
            fuel: Math.max(0, updatedCar.fuel - fuelCost),
            cond: Math.max(0, updatedCar.cond - wearCost),
          };
        }

        return {
          ...prev,
          energy: prev.energy - 20,
          rub: prev.rub + totalPay,
          karma: prev.karma + job.karma,
          car: updatedCar,
          jobShifts: {
            ...prev.jobShifts,
            [job.id]: (prev.jobShifts[job.id] || 0) + 1,
          },
        };
      });

      setMsg({ text: `Смена отработана: +${totalPay.toLocaleString('ru-RU')} ₽ (+${job.karma} кармы)` });
    }
  };

  // BUSINESS Handlers
  const handleBuyBusiness = (bizId: string) => {
    const bDef = BUSINESSES.find((b) => b.id === bizId);
    if (!bDef) return;

    if (state.businesses.some((b) => b.id === bizId)) {
      setMsg({ text: 'Вы уже приобрели это предприятие!', isError: true });
      return;
    }

    if (state.rub < bDef.cost) {
      setMsg({ text: 'Недостаточно средств для покупки!', isError: true });
      return;
    }

    if (bDef.reqKarma && state.karma < bDef.reqKarma) {
      setMsg({ text: `Требуется карма не менее +${bDef.reqKarma}`, isError: true });
      return;
    }
    if (bDef.reqKarmaMax && state.karma > bDef.reqKarmaMax) {
      setMsg({ text: `Требуется отрицательная карма не выше ${bDef.reqKarmaMax}`, isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - bDef.cost,
      businesses: [
        ...prev.businesses,
        {
          id: bDef.id,
          cashboxRub: 0,
          cashboxUsd: 0,
          nextRaidRoll: Math.random(),
          openedAt: Date.now(),
        },
      ],
      purchaseDates: {
        ...prev.purchaseDates,
        [bDef.id]: Date.now(),
      },
    }));

    setMsg({ text: `Предприятие «${bDef.name}» успешно приобретено!` });
  };

  const handleCollectCashbox = (bizIdx: number) => {
    const b = state.businesses[bizIdx];
    if (!b) return;
    const bDef = BUSINESSES.find((item) => item.id === b.id);
    if (!bDef) return;

    if (bDef.isUsd) {
      // Нелегальный бизнес: проверка Прокурора
      let raidChance = CONFIG.PROCURATOR_MIN_CHANCE + (Math.abs(state.karma) / 10000) * (CONFIG.PROCURATOR_MAX_CHANCE - CONFIG.PROCURATOR_MIN_CHANCE);

      // Перк Mercedes G63
      if (state.car?.id === 'c_13') raidChance = Math.max(0.1, raidChance - 0.05);
      // Перк Фракции Нелегального Синдиката
      if (state.activeFaction === 'f_synd') raidChance = Math.max(0.1, raidChance - 0.15);

      const roll = b.nextRaidRoll;
      const isRaid = roll < raidChance;

      let payout = Math.floor(b.cashboxUsd);
      let confiscated = 0;

      if (isRaid) {
        confiscated = Math.floor(payout * 0.5);
        payout = payout - confiscated;
      }

      onUpdateState((prev) => {
        const nextBiz = [...prev.businesses];
        nextBiz[bizIdx] = {
          ...nextBiz[bizIdx],
          cashboxUsd: 0,
          nextRaidRoll: Math.random(), // Seed for next collection
        };

        const nextState: GameState = {
          ...prev,
          usdCash: prev.usdCash + payout,
          businesses: nextBiz,
        };

        if (isRaid) {
          nextState.raidCounters.prosecutorRaids += 1;
          nextState.finesLog.unshift({
            id: 'fine_' + Date.now(),
            time: Date.now(),
            source: 'Прокуратура',
            desc: `Рейд Прокурора на предприятии «${bDef.name}». Изъято 50% кассы.`,
            amountText: `-${confiscated} $`,
          });
        }

        return nextState;
      });

      if (isRaid) {
        setMsg({
          text: `⚖️ Внимание: Прокурорская проверка! Изъято 50% кассы (-${confiscated} $). Получено: ${payout} $`,
          isError: true,
        });
      } else {
        setMsg({ text: `Касса предприятия «${bDef.name}» снята: +${payout.toLocaleString('ru-RU')} $` });
      }
    } else {
      // Легальный бизнес: налог 13% или 6% при карме >= 1000 или Мэрии
      const taxRate = state.karma >= 1000 || state.activeFaction === 'f_gov' ? 0.06 : 0.13;
      const gross = Math.floor(b.cashboxRub);
      const tax = Math.floor(gross * taxRate);
      const clean = gross - tax;

      onUpdateState((prev) => {
        const nextBiz = [...prev.businesses];
        nextBiz[bizIdx] = {
          ...nextBiz[bizIdx],
          cashboxRub: 0,
        };
        return {
          ...prev,
          rub: prev.rub + clean,
          businesses: nextBiz,
        };
      });

      setMsg({
        text: `Снята касса «${bDef.name}»: +${clean.toLocaleString('ru-RU')} ₽ (налог ${Math.round(taxRate * 100)}% составил ${tax.toLocaleString('ru-RU')} ₽)`,
      });
    }
  };

  const handleSellBusiness = (bizIdx: number) => {
    const b = state.businesses[bizIdx];
    if (!b) return;
    const bDef = BUSINESSES.find((item) => item.id === b.id);
    if (!bDef) return;

    // Трейд-ин 70% или 80% (Престиж VIII+) + авто-снятие кассы
    const prestige = getPrestigeInfo(calcTotalCapital(state));
    const refund = Math.floor(bDef.cost * prestige.tradeInRate);
    const rubCash = Math.floor(b.cashboxRub);
    const usdCash = Math.floor(b.cashboxUsd);

    onUpdateState((prev) => {
      const nextBiz = [...prev.businesses];
      nextBiz.splice(bizIdx, 1);
      return {
        ...prev,
        rub: prev.rub + refund + rubCash,
        usdCash: prev.usdCash + usdCash,
        businesses: nextBiz,
      };
    });

    setMsg({
      text: `Предприятие «${bDef.name}» продано за ${refund.toLocaleString('ru-RU')} ₽ (возврат ${Math.round(prestige.tradeInRate * 100)}%). Остатки кассы зачислены на счет!`,
    });
  };

  // MINE Handlers
  const handleMineManual = () => {
    if (state.energy < 2) {
      setMsg({ text: 'Недостаточно энергии (требуется 2 ⚡)!', isError: true });
      return;
    }
    if (state.vein <= 0) {
      setMsg({ text: 'Жила истощена! Проведите взрывные работы.', isError: true });
      return;
    }

    // Доступный макс. тир по опыту
    let maxTier = 1;
    for (const o of ORES) {
      if (state.mineXp >= o.xpReq) maxTier = o.tier;
    }

    const dropTier = Math.floor(1 + Math.random() * maxTier);
    const dropOre = ORES.find((o) => o.tier === dropTier) || ORES[0];
    let dropCount = Math.min(state.vein, Math.floor(1 + Math.random() * 25));
    if (state.activeFaction === 'f_mine') {
      dropCount = Math.max(1, Math.floor(dropCount * 1.10)); // +10% Шахтерский Профсоюз
    }

    onUpdateState((prev) => ({
      ...prev,
      energy: prev.energy - 2,
      vein: Math.max(0, prev.vein - dropCount),
      mineXp: prev.mineXp + 5,
      ores: {
        ...prev.ores,
        [dropOre.id]: (prev.ores[dropOre.id] || 0) + dropCount,
      },
    }));

    setMineFeedback(`⛏️ Добыто: +${dropCount} шт. [${dropOre.name}] (+5 XP${state.activeFaction === 'f_mine' ? ' · Профсоюз +10%' : ''})`);
    setTimeout(() => setMineFeedback(null), 1500);
  };

  const handleBlastVein = () => {
    if (state.rub < 250000) {
      setMsg({ text: 'Взрывные работы стоят 250 000 ₽!', isError: true });
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - 250000,
      vein: 50000,
    }));
    setMsg({ text: '💥 Взрывные работы проведены! Жила восстановлена до 50 000 ед.' });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'work', label: 'Вакансии', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'business', label: 'Бизнес', icon: <Building className="w-4 h-4" /> },
          { id: 'mine', label: 'Шахта', icon: <Pickaxe className="w-4 h-4" /> },
          { id: 'printers', label: 'Печать', icon: <Printer className="w-4 h-4" /> },
          { id: 'servers', label: 'Серверы', icon: <Server className="w-4 h-4" /> },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => setSubTab(tab.id as CareerSubTab)}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
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

      {/* 1. WORK SUBTAB */}
      {subTab === 'work' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
              {[
                { id: 'all', label: `Все (${JOBS_LEGAL.length + JOBS_ILLEGAL.length})` },
                { id: 'legal', label: `Легальные (${JOBS_LEGAL.length})` },
                { id: 'illegal', label: `Нелегальные (${JOBS_ILLEGAL.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setJobFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    jobFilter === f.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono text-slate-400">Расход: -20⚡ за смену</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Legal Jobs */}
            {(jobFilter === 'all' || jobFilter === 'legal') &&
              JOBS_LEGAL.map((job) => {
                const isCurrent = state.jobId === job.id;
                const shifts = state.jobShifts[job.id] || 0;

                let locked = false;
                let lockReason = '';
                if (job.reqCourse && !state.unlockedCourses.includes(job.reqCourse)) {
                  locked = true;
                  lockReason = 'Требуется курс';
                }
                if (job.reqEdu && state.eduLevel < job.reqEdu) {
                  locked = true;
                  lockReason = `ВУЗ ступени ${job.reqEdu}`;
                }
                if (job.reqSpec && !state.unlockedSpecs.includes(job.reqSpec)) {
                  locked = true;
                  lockReason = 'Спецподготовка';
                }
                if (job.reqLicense && !state.hasDriverLicense) {
                  locked = true;
                  lockReason = 'Права Кат. B';
                }
                if (job.reqKarma && state.karma < job.reqKarma) {
                  locked = true;
                  lockReason = `Карма +${job.reqKarma}`;
                }
                if (job.reqItem && !state.inventory.includes(job.reqItem)) {
                  locked = true;
                  lockReason = job.reqItem === 'bicycle' ? 'Нужен Велосипед (ТРЦ)' : job.reqItem === 'pc' ? 'Нужен ПК (ТРЦ)' : 'Нужен предмет';
                }
                if (job.reqCarIds && (!state.car || !job.reqCarIds.includes(state.car.id))) {
                  locked = true;
                  lockReason = 'Нужен ВАЗ / Vesta';
                }
                if (job.reqForeignCar) {
                  const isForeign = state.car ? !!CARS.find((c) => c.id === state.car!.id)?.isForeign : false;
                  if (!isForeign) {
                    locked = true;
                    lockReason = 'Нужна иномарка';
                  }
                }

                return (
                  <EntityPlate
                    key={job.id}
                    icon={<Briefcase className="w-5 h-5 text-sky-400" />}
                    title={job.name}
                    active={isCurrent}
                    badge={
                      isCurrent ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          Текущая
                        </span>
                      ) : undefined
                    }
                    params={[
                      { label: 'Доход', value: `+${job.salary.toLocaleString('ru-RU')} ₽`, highlight: 'emerald' },
                      { label: 'Карма', value: `+${job.karma}`, highlight: 'sky' },
                      { label: 'Смен', value: shifts, highlight: 'slate' },
                    ]}
                    action={
                      locked ? (
                        <span className="text-xs text-rose-400 font-medium px-2 py-1">{lockReason}</span>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleWorkShift(job.id, false)}
                          className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>Работать</span>
                        </motion.button>
                      )
                    }
                  />
                );
              })}

            {/* Illegal Jobs */}
            {(jobFilter === 'all' || jobFilter === 'illegal') &&
              JOBS_ILLEGAL.map((job) => {
                const consumeCount = job.consumeItem
                  ? state.inventory.filter((i) => i === job.consumeItem).length
                  : 0;

                let locked = false;
                let lockReason = '';
                if (job.reqKarmaMax && state.karma > job.reqKarmaMax) {
                  locked = true;
                  lockReason = `Карма до ${job.reqKarmaMax}`;
                }
                if (job.consumeItem && consumeCount === 0) {
                  locked = true;
                  lockReason = 'Нет расходников (ТРЦ)';
                }
                if (job.reqPress && !state.press) {
                  locked = true;
                  lockReason = 'Нужен станок (Печать)';
                }
                if (job.reqItem && !state.inventory.includes(job.reqItem)) {
                  locked = true;
                  lockReason = 'Нужен ПК (ТРЦ)';
                }

                return (
                  <EntityPlate
                    key={job.id}
                    danger
                    icon={<ShieldAlert className="w-5 h-5 text-rose-400" />}
                    title={job.name}
                    badge={
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Нелегальная
                      </span>
                    }
                    params={[
                      { label: 'Доход', value: `+${job.salary.toLocaleString('ru-RU')} $`, highlight: 'yellow' },
                      { label: 'Карма', value: job.karma, highlight: 'rose' },
                      ...(job.consumeItem
                        ? [{ label: 'Расходник', value: `${consumeCount} шт.`, highlight: consumeCount > 0 ? ('slate' as const) : ('rose' as const) }]
                        : []),
                    ]}
                    action={
                      locked ? (
                        <span className="text-xs text-amber-400 font-medium px-2 py-1">{lockReason}</span>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleWorkShift(job.id, true)}
                          className="px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>Работать</span>
                        </motion.button>
                      )
                    }
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* 2. BUSINESS SUBTAB */}
      {subTab === 'business' && (
        <div className="space-y-5">
          {/* Active Businesses */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Мои объекты ({state.businesses.length})</h3>
              {state.businesses.length > 1 && (
                <span className="text-xs font-mono text-emerald-400">
                  Синергия: +{(state.businesses.length - 1) * 2}%
                </span>
              )}
            </div>

            {state.businesses.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 text-xs">
                Нет приобретенных предприятий. Выберите объект в каталоге ниже.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {state.businesses.map((b, idx) => {
                  const bDef = BUSINESSES.find((item) => item.id === b.id);
                  if (!bDef) return null;

                  const isUsd = bDef.isUsd;
                  const currentCash = isUsd ? b.cashboxUsd : b.cashboxRub;
                  const maxCash = bDef.income * 24;
                  const pct = Math.min(100, Math.round((currentCash / maxCash) * 100));

                  return (
                    <EntityPlate
                      key={idx}
                      icon={<Building className="w-5 h-5 text-sky-400" />}
                      title={bDef.name}
                      badge={<span className="text-xs font-mono font-bold text-sky-400">{pct}%</span>}
                      params={[
                        {
                          label: 'Касса',
                          value: `${Math.floor(currentCash).toLocaleString('ru-RU')} ${isUsd ? '$' : '₽'}`,
                          highlight: isUsd ? 'yellow' : 'emerald',
                        },
                        {
                          label: 'Доход',
                          value: `+${bDef.income.toLocaleString('ru-RU')} ${isUsd ? '$/ч' : '₽/ч'}`,
                          highlight: 'slate',
                        },
                      ]}
                      footer={
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full transition-all ${isUsd ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      }
                      action={
                        <div className="flex items-center gap-1.5">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCollectCashbox(idx)}
                            disabled={currentCash < bDef.income}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              currentCash >= bDef.income
                                ? isUsd
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                : 'bg-white/5 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {currentCash >= bDef.income ? 'Собрать' : 'Мин. 1ч'}
                          </motion.button>
                          <button
                            onClick={() => handleSellBusiness(idx)}
                            className="px-2 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/20 hover:bg-rose-900/50 text-rose-300 text-xs transition-colors cursor-pointer"
                          >
                            Продать
                          </button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Business Catalog */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Каталог предприятий</h3>
              <span className="text-xs font-mono text-slate-400">
                Доступно объектов: {BUSINESSES.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {BUSINESSES.map((biz) => {
                const alreadyOwned = state.businesses.some((b) => b.id === biz.id);

                return (
                  <EntityPlate
                    key={biz.id}
                    icon={<Building className="w-5 h-5 text-slate-400" />}
                    title={biz.name}
                    badge={
                      <div className="flex items-center gap-1.5">
                        {alreadyOwned && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            Владелец
                          </span>
                        )}
                        {biz.isUsd && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Нелегал
                          </span>
                        )}
                      </div>
                    }
                    params={[
                      {
                        label: 'Доход',
                        value: `+${biz.income.toLocaleString('ru-RU')} ${biz.isUsd ? '$/ч' : '₽/ч'}`,
                        highlight: 'emerald',
                      },
                      {
                        label: 'Цена',
                        value: `${biz.cost.toLocaleString('ru-RU')} ₽`,
                        highlight: 'slate',
                      },
                    ]}
                    action={
                      alreadyOwned ? (
                        <span className="text-xs text-slate-500 font-semibold px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                          Владелец ✓
                        </span>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleBuyBusiness(biz.id)}
                          disabled={state.rub < biz.cost}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            state.rub >= biz.cost
                              ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-md shadow-sky-600/20'
                              : 'bg-white/5 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Купить ({biz.cost.toLocaleString('ru-RU')} ₽)
                        </motion.button>
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. MINE SUBTAB */}
      {subTab === 'mine' && (
        <div className="space-y-6">
          {/* Mining Header & Manual Dig */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div>
              <div className="flex items-center gap-2">
                <Pickaxe className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Шахта</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Жила: <span className="font-mono font-bold text-amber-300">{state.vein.toLocaleString('ru-RU')} / 50 000</span>
                {' · '}Опыт: <span className="font-mono text-sky-300">{state.mineXp} XP</span>
              </p>

              {/* Vein progress bar */}
              <div className="w-64 h-2 rounded-full bg-white/10 mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
                  style={{ width: `${(state.vein / 50000) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {state.vein === 0 ? (
                <button
                  onClick={handleBlastVein}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  <Flame className="w-4 h-4" />
                  <span>Взрыв · 250 000 ₽</span>
                </button>
              ) : (
                <button
                  onClick={handleMineManual}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Pickaxe className="w-4 h-4" />
                  <span>Удар · 2⚡</span>
                </button>
              )}
            </div>

            {mineFeedback && (
              <div className="absolute bottom-1 left-5 text-xs font-bold text-amber-300">
                {mineFeedback}
              </div>
            )}
          </div>

          {/* Ore Warehouse */}
          <div className="glass-panel rounded-2xl p-5">
            {(() => {
              const totalOreValue = ORES.reduce((acc, o) => acc + (state.ores[o.id] || 0) * o.sellPrice, 0);
              return (
                <>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">Склад руды</h4>
                      <span className="text-xs text-slate-400">Нажмите на карточку для поштучной продажи</span>
                    </div>
                    {totalOreValue > 0 && (
                      <button
                        onClick={() => {
                          onUpdateState((prev) => {
                            const clearedOres: Record<string, number> = {};
                            ORES.forEach((o) => {
                              clearedOres[o.id] = 0;
                            });
                            return {
                              ...prev,
                              rub: prev.rub + totalOreValue,
                              ores: clearedOres,
                            };
                          });
                          setMsg({ text: `Вся руда со склада ликвидирована за +${totalOreValue.toLocaleString('ru-RU')} ₽!` });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        Продать всю руду (+{totalOreValue.toLocaleString('ru-RU')} ₽)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {ORES.map((ore) => {
                      const count = state.ores[ore.id] || 0;
                      return (
                        <div
                          key={ore.id}
                          onClick={() => {
                            if (count > 0) {
                              setSellOreModal({ oreId: ore.id, maxQty: count, price: ore.sellPrice });
                              setSellQty(count);
                            }
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            count > 0
                              ? 'bg-white/[0.03] border-white/10 hover:border-amber-400/50 hover:bg-white/[0.05]'
                              : 'bg-white/[0.01] border-white/5 opacity-50 cursor-default'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-white">{ore.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">Т{ore.tier}</span>
                          </div>
                          <div className="text-sm font-extrabold font-mono text-amber-300">{count} шт.</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ore.sellPrice} ₽/шт.</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Drill Section */}
          <div className="space-y-4">
            {state.drill && (() => {
              const dDef = DRILLS.find((d) => d.id === state.drill!.id);
              const prestige = getPrestigeInfo(calcTotalCapital(state));
              const drillSellRefund = Math.floor((dDef?.cost || 0) * prestige.tradeInRate * (state.drill.bitDurability / 100));

              return (
                <div className="glass-panel rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">Активная буровая установка</h4>
                      <p className="text-xs text-slate-400">
                        Автоматическая добыча в 2 выбранных сектора (50% / 50%).
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      {dDef?.name || state.drill.id}
                    </span>
                  </div>

                  {/* Calibration banner if in 5-min warmup */}
                  {Date.now() < state.drill.reconfigUntil && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between">
                      <span>⚙️ Технологическая калибровка секторов...</span>
                      <span>{Math.max(1, Math.ceil((state.drill.reconfigUntil - Date.now()) / 60000))} мин</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400 block text-[11px]">Бак топлива</span>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {Math.floor(state.drill.fuelSeconds / 60)} мин (из 540)
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400 block text-[11px]">Прочность коронки</span>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {state.drill.bitDurability.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400 block text-[11px]">Сектор 1 (50%)</span>
                      <div className="text-sm font-bold text-amber-300 mt-0.5">
                        {ORES.find((o) => o.id === state.drill!.sector1Ore)?.name || 'Руда'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400 block text-[11px]">Сектор 2 (50%)</span>
                      <div className="text-sm font-bold text-amber-300 mt-0.5">
                        {ORES.find((o) => o.id === state.drill!.sector2Ore)?.name || 'Руда'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => {
                        if (!dDef) return;
                        const fuelLostRatio = (32400 - state.drill!.fuelSeconds) / 32400;
                        const cost = Math.ceil(dDef.fuelCostTotal * fuelLostRatio);
                        if (state.rub < cost) {
                          setMsg({ text: `Недостаточно средств на заправку (${cost} ₽)`, isError: true });
                          return;
                        }
                        onUpdateState((prev) => ({
                          ...prev,
                          rub: prev.rub - cost,
                          drill: prev.drill ? { ...prev.drill, fuelSeconds: 32400 } : null,
                        }));
                        setMsg({ text: 'Бур полностью заправлен топливом!' });
                      }}
                      className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Заправить
                    </button>

                    <button
                      onClick={() => {
                        if (!dDef) return;
                        const wearRatio = (100 - state.drill!.bitDurability) / 100;
                        const rubCost = Math.ceil(dDef.repairRub * wearRatio);
                        if (state.rub < rubCost) {
                          setMsg({ text: `Недостаточно средств на ремонт (${rubCost} ₽)`, isError: true });
                          return;
                        }
                        onUpdateState((prev) => ({
                          ...prev,
                          rub: prev.rub - rubCost,
                          drill: prev.drill ? { ...prev.drill, bitDurability: 100 } : null,
                        }));
                        setMsg({ text: 'Коронка бура отремонтирована до 100%!' });
                      }}
                      className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Ремонт
                    </button>

                    <button
                      onClick={() => {
                        if (!state.drill) return;
                        const isCooldown = Date.now() < state.drill.swapCooldownUntil;
                        if (isCooldown) {
                          const remainMins = Math.ceil((state.drill.swapCooldownUntil - Date.now()) / 60000);
                          setMsg({ text: `Смена секторов доступна раз в час (осталось: ${remainMins} мин)`, isError: true });
                          return;
                        }
                        setSector1Choice(state.drill.sector1Ore);
                        setSector2Choice(state.drill.sector2Ore);
                        setDrillModalOpen(true);
                      }}
                      className="flex-1 py-2 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/30 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {Date.now() < state.drill.swapCooldownUntil
                        ? `КД: ${Math.ceil((state.drill.swapCooldownUntil - Date.now()) / 60000)} мин`
                        : 'Настройка секторов'}
                    </button>

                    <button
                      onClick={() => {
                        onUpdateState((prev) => ({
                          ...prev,
                          rub: prev.rub + drillSellRefund,
                          drill: null,
                        }));
                        setMsg({ text: `Бур «${dDef?.name}» продан за +${drillSellRefund.toLocaleString('ru-RU')} ₽!` });
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Продать (+{drillSellRefund.toLocaleString('ru-RU')} ₽)
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Drill Catalogue (Always Available to view and compare) */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Каталог буровых установок</h4>
                  <p className="text-xs text-slate-400">
                    Установки для автономной разработки жилы шахты.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Доступно моделей: {DRILLS.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {DRILLS.map((dr) => {
                  const isCurrent = state.drill?.id === dr.id;
                  const prestige = getPrestigeInfo(calcTotalCapital(state));
                  const currentDrillDef = state.drill ? DRILLS.find((d) => d.id === state.drill!.id) : null;
                  const currentRefund = state.drill
                    ? Math.floor((currentDrillDef?.cost || 0) * prestige.tradeInRate * (state.drill.bitDurability / 100))
                    : 0;
                  const netCost = Math.max(0, dr.cost - currentRefund);

                  return (
                    <div key={dr.id} className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-sky-950/30 border-sky-500/50 shadow-lg shadow-sky-500/10'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-bold text-white text-sm">{dr.name}</h5>
                          {isCurrent && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              Активен
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 font-mono space-y-1 mt-2">
                          <div>Добыча: <b className="text-amber-400">{dr.rate} шт./ч</b></div>
                          <div>Поддержка руд: <b className="text-sky-300">до Тира {dr.maxTier}</b></div>
                          <div className="text-slate-400">Бак: {(dr.fuelCostTotal).toLocaleString('ru-RU')} ₽ / 9ч</div>
                        </div>
                        <div className="text-sm text-emerald-400 font-mono mt-2 font-bold">
                          {dr.cost.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="mt-4 w-full py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold text-center border border-white/5">
                          Установлен на вышке ✓
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (state.rub < netCost) {
                              setMsg({ text: `Недостаточно средств! Требуется доплата ${netCost.toLocaleString('ru-RU')} ₽`, isError: true });
                              return;
                            }
                            onUpdateState((prev) => ({
                              ...prev,
                              rub: prev.rub - netCost,
                              drill: {
                                id: dr.id,
                                fuelSeconds: 32400,
                                bitDurability: 100,
                                sector1Ore: 'ore_1',
                                sector2Ore: 'ore_2',
                                lastSwapTime: Date.now(),
                                swapCooldownUntil: 0,
                                reconfigUntil: 0,
                              },
                            }));
                            setMsg({
                              text: state.drill
                                ? `Установка заменена на «${dr.name}» (зачтен трейд-ин +${currentRefund.toLocaleString('ru-RU')} ₽)!`
                                : `Бур «${dr.name}» успешно приобретен и смонтирован!`,
                            });
                          }}
                          className="mt-4 w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-sky-600/20"
                        >
                          {state.drill ? `Заменить (${netCost.toLocaleString('ru-RU')} ₽)` : `Купить (${dr.cost.toLocaleString('ru-RU')} ₽)`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drill Sector Reconfiguration Modal */}
          <AnimatePresence>
            {drillModalOpen && state.drill && (() => {
              const dDef = DRILLS.find((d) => d.id === state.drill!.id);
              const maxTier = dDef ? dDef.maxTier : 3;
              const availableOres = ORES.filter((o) => o.tier <= maxTier);

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    className="glass-panel rounded-2xl p-6 max-w-md w-full space-y-4 border border-white/20"
                  >
                    <h3 className="text-base font-bold text-white">Настройка секторов бура</h3>
                    <p className="text-xs text-slate-400">
                      Установка «{dDef?.name}» поддерживает руды до Тира {maxTier}. Добыча распределяется по 50% в каждый сектор. После смены требуется 5 минут калибровки.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Сектор 1 (50% добычи):</label>
                        <select
                          value={sector1Choice}
                          onChange={(e) => setSector1Choice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono bg-slate-900 border border-white/10 text-white"
                        >
                          {availableOres.map((ore) => (
                            <option key={ore.id} value={ore.id} className="bg-slate-900 text-white">
                              {ore.name} (Тир {ore.tier} · {ore.sellPrice} ₽)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Сектор 2 (50% добычи):</label>
                        <select
                          value={sector2Choice}
                          onChange={(e) => setSector2Choice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono bg-slate-900 border border-white/10 text-white"
                        >
                          {availableOres.map((ore) => (
                            <option key={ore.id} value={ore.id} className="bg-slate-900 text-white">
                              {ore.name} (Тир {ore.tier} · {ore.sellPrice} ₽)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          onUpdateState((prev) => {
                            if (!prev.drill) return prev;
                            return {
                              ...prev,
                              drill: {
                                ...prev.drill,
                                sector1Ore: sector1Choice,
                                sector2Ore: sector2Choice,
                                lastSwapTime: Date.now(),
                                swapCooldownUntil: Date.now() + 3600000, // 1 hr CD
                                reconfigUntil: Date.now() + 300000, // 5 min warmup
                              },
                            };
                          });
                          setMsg({ text: 'Секторы бура перенастроены! Запущена 5-минутная калибровка.' });
                          setDrillModalOpen(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Применить
                      </button>
                      <button
                        onClick={() => setDrillModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs cursor-pointer hover:bg-white/20"
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
      )}

      {/* 4. PRINTERS SUBTAB */}
      {subTab === 'printers' && (
        <div className="space-y-6">
          {/* Active Press status if owned */}
          {state.press && (() => {
            const pDef = PRESSES.find((p) => p.id === state.press!.id);
            const prestige = getPrestigeInfo(calcTotalCapital(state));
            const pressSellRefund = pDef
              ? Math.floor(pDef.cost * prestige.tradeInRate * (state.press.durability / 100))
              : 0;

            return (
              <div className="glass-panel rounded-2xl p-5 space-y-4 border border-emerald-500/30 bg-emerald-950/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        {pDef?.name || state.press.id}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        В работе
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-300 font-mono mt-1">
                      <span>Производительность: <b className="text-emerald-400">+{pDef?.income.toLocaleString('ru-RU')} ₽/ч</b></span>
                      <span>·</span>
                      <span>Износ валов: <b className={state.press.durability < 20 ? 'text-rose-400' : 'text-sky-300'}>{state.press.durability.toFixed(1)}%</b></span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-slate-400">Накоплено в лотке:</span>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      {Math.floor(state.press.trayRub).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      const cash = Math.floor(state.press!.trayRub);
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub + cash,
                        press: prev.press ? { ...prev.press, trayRub: 0 } : null,
                      }));
                      setMsg({ text: `Собрано из лотка: +${cash.toLocaleString('ru-RU')} ₽` });
                    }}
                    disabled={state.press.trayRub < 1}
                    className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Собрать выручку
                  </button>

                  <button
                    onClick={() => {
                      if (!pDef) return;
                      const wear = (100 - state.press!.durability) / 100;
                      const repCost = Math.ceil(pDef.repRub * wear);
                      if (state.rub < repCost) {
                        setMsg({ text: `Недостаточно средств (${repCost.toLocaleString('ru-RU')} ₽)`, isError: true });
                        return;
                      }
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub - repCost,
                        press: prev.press ? { ...prev.press, durability: 100 } : null,
                      }));
                      setMsg({ text: 'Валы станка отремонтированы до 100%!' });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    Ремонт валов
                  </button>

                  <button
                    onClick={() => {
                      const cashInTray = Math.floor(state.press!.trayRub);
                      const totalRefund = pressSellRefund + cashInTray;
                      onUpdateState((prev) => ({
                        ...prev,
                        rub: prev.rub + totalRefund,
                        press: null,
                      }));
                      setMsg({
                        text: `Станок «${pDef?.name}» продан за +${pressSellRefund.toLocaleString('ru-RU')} ₽!${
                          cashInTray > 0 ? ` (из лотка возвращено +${cashInTray.toLocaleString('ru-RU')} ₽)` : ''
                        }`,
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Продать станок (+{pressSellRefund.toLocaleString('ru-RU')} ₽)
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Presses Catalogue (Always Available to browse and assemble/replace) */}
          <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">Каталог печатных станков</h4>
                <p className="text-xs text-slate-400">
                  Оборудование для автономной печати наличных рублей из добытых в шахте металлов.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Моделей: {PRESSES.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {PRESSES.map((pr) => {
                const isCurrent = state.press?.id === pr.id;
                const prestige = getPrestigeInfo(calcTotalCapital(state));
                const currentPressDef = state.press ? PRESSES.find((p) => p.id === state.press!.id) : null;
                const currentRefund = state.press
                  ? Math.floor((currentPressDef?.cost || 0) * prestige.tradeInRate * (state.press.durability / 100))
                  : 0;
                const netCost = Math.max(0, pr.cost - currentRefund);

                const canAffordMoney = state.rub >= netCost;
                let missingMaterial = false;
                for (const [oreId, qty] of Object.entries(pr.mats)) {
                  if ((state.ores[oreId] || 0) < qty) {
                    missingMaterial = true;
                    break;
                  }
                }
                const canAssemble = canAffordMoney && !missingMaterial;

                return (
                  <div
                    key={pr.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-white text-sm">{pr.name}</h4>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            Активен
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-emerald-400 font-mono font-bold mt-1">
                        +{pr.income.toLocaleString('ru-RU')} ₽/ч
                      </div>

                      <div className="text-xs text-slate-400 font-mono mt-1">
                        Стоимость шасси: {pr.cost.toLocaleString('ru-RU')} ₽
                        {state.press && !isCurrent && currentRefund > 0 && (
                          <span className="text-amber-400 block text-[11px]">
                            Трейд-ин старого станка: -{currentRefund.toLocaleString('ru-RU')} ₽ (к доплате {netCost.toLocaleString('ru-RU')} ₽)
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-2 space-y-1">
                        <div className="text-slate-400">Требуемые руды для сборки:</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(pr.mats).map(([oreId, reqQty]) => {
                            const oreDef = ORES.find((o) => o.id === oreId);
                            const hasCount = state.ores[oreId] || 0;
                            const isEnough = hasCount >= reqQty;
                            return (
                              <span
                                key={oreId}
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  isEnough
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                }`}
                              >
                                {oreDef?.name || oreId}: {hasCount}/{reqQty}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <div className="mt-4 w-full py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-semibold text-center border border-white/5">
                        Установлен на производстве ✓
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!canAffordMoney) {
                            setMsg({
                              text: `Недостаточно средств на шасси! Требуется доплата ${netCost.toLocaleString('ru-RU')} ₽`,
                              isError: true,
                            });
                            return;
                          }
                          for (const [oreId, qty] of Object.entries(pr.mats)) {
                            if ((state.ores[oreId] || 0) < qty) {
                              const oreDef = ORES.find((o) => o.id === oreId);
                              setMsg({
                                text: `Недостаточно руды «${oreDef?.name || oreId}» (требуется ${qty} шт.)`,
                                isError: true,
                              });
                              return;
                            }
                          }

                          onUpdateState((prev) => {
                            const nextOres = { ...prev.ores };
                            for (const [oreId, qty] of Object.entries(pr.mats)) {
                              nextOres[oreId] -= qty;
                            }
                            const oldTray = prev.press ? Math.floor(prev.press.trayRub) : 0;
                            return {
                              ...prev,
                              rub: prev.rub - netCost + oldTray,
                              ores: nextOres,
                              press: { id: pr.id, durability: 100, trayRub: 0 },
                            };
                          });
                          setMsg({
                            text: state.press
                              ? `Станок заменен на «${pr.name}» (зачтен трейд-ин +${currentRefund.toLocaleString('ru-RU')} ₽)!`
                              : `Станок «${pr.name}» успешно собран и запущен!`,
                          });
                        }}
                        className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          canAssemble
                            ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {isCurrent
                          ? 'Установлен'
                          : state.press
                          ? `Заменить (${netCost.toLocaleString('ru-RU')} ₽)`
                          : canAssemble
                          ? `Собрать (${pr.cost.toLocaleString('ru-RU')} ₽)`
                          : !canAffordMoney
                          ? 'Не хватает средств'
                          : 'Не хватает руды'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. SERVERS SUBTAB */}
      {subTab === 'servers' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Серверный Парк Биткоина ₿</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Накоплено в бункере: <span className="font-mono font-bold text-amber-300">{state.unclaimedBtc.toFixed(6)} ₿</span>
                {' · '}Буфер: <span className="font-mono text-slate-300">{Math.floor(state.serverAccumSec / 3600)} ч. / 24 ч.</span>
              </p>
            </div>

            <button
              onClick={() => {
                if (state.unclaimedBtc <= 0) {
                  setMsg({ text: 'В бункере нет намайненного биткоина', isError: true });
                  return;
                }

                // OpEx расчет
                let opexPerHour = 0;
                Object.entries(state.servers).forEach(([sId, count]) => {
                  const sDef = SERVERS.find((s) => s.id === sId);
                  if (sDef) opexPerHour += sDef.opexRub * count;
                });

                // Скидка ГЭС/АЭС
                let discount = 1.0;
                state.businesses.forEach((b) => {
                  const bDef = BUSINESSES.find((item) => item.id === b.id);
                  if (bDef?.electricDiscount) discount = Math.min(discount, 1 - bDef.electricDiscount);
                });

                const hours = state.serverAccumSec / 3600;
                const totalOpex = Math.floor(opexPerHour * hours * discount);

                if (state.rub < totalOpex) {
                  setMsg({
                    text: `Недостаточно рублей на оплату света (${totalOpex.toLocaleString('ru-RU')} ₽)! Пополните баланс.`,
                    isError: true,
                  });
                  return;
                }

                const btcClaimed = state.unclaimedBtc;
                onUpdateState((prev) => ({
                  ...prev,
                  rub: prev.rub - totalOpex,
                  btc: prev.btc + btcClaimed,
                  unclaimedBtc: 0,
                  serverAccumSec: 0,
                }));

                setMsg({
                  text: `Успешно собрано +${btcClaimed.toFixed(4)} ₿! Оплачен счет за свет: ${totalOpex.toLocaleString('ru-RU')} ₽`,
                });
              }}
              disabled={state.unclaimedBtc <= 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Собрать намайненный ₿ (Оплатить свет)
            </button>
          </div>

          {/* 1. MY SERVER RACKS & DATA CENTER OVERVIEW */}
          {(() => {
            const totalRacks = Object.values(state.servers).reduce((a, b) => a + b, 0);
            let totalHashRate = 0;
            let totalOpExPerHour = 0;
            Object.entries(state.servers).forEach(([sId, count]) => {
              const sDef = SERVERS.find((s) => s.id === sId);
              if (sDef) {
                totalHashRate += sDef.btcPerHour * count;
                totalOpExPerHour += sDef.opexRub * count;
              }
            });

            let electricDiscount = 1.0;
            state.businesses.forEach((b) => {
              const bDef = BUSINESSES.find((item) => item.id === b.id);
              if (bDef?.electricDiscount) electricDiscount = Math.min(electricDiscount, 1 - bDef.electricDiscount);
            });
            const netOpExPerHour = Math.floor(totalOpExPerHour * electricDiscount);

            const ownedServerTypes = SERVERS.filter((s) => (state.servers[s.id] || 0) > 0);

            return (
              <div className="space-y-5">
                <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-yellow-950/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-amber-400" />
                        <h4 className="font-bold text-white text-base">Мой Дата-Центр & Смонтированные Стойки</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Пул автономного оборудования для майнинга Bitcoin
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-300">
                        Стойки: <b className="text-amber-400 font-bold text-sm">{totalRacks}</b> / {state.maxRacks} шт.
                      </span>
                      {totalRacks >= state.maxRacks && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          Лимит достигнут
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rack Utilization Bar */}
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-4">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalRacks / state.maxRacks) * 100)}%` }}
                    />
                  </div>

                  {/* Datacenter Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 font-mono">
                      <span className="text-[11px] text-slate-400 block">Суммарный хешрейт:</span>
                      <span className="text-sm font-bold text-amber-300">
                        +{totalHashRate.toFixed(4)} ₿/ч
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 font-mono">
                      <span className="text-[11px] text-slate-400 block">Расход на свет (OpEx):</span>
                      <span className="text-sm font-bold text-rose-300">
                        -{netOpExPerHour.toLocaleString('ru-RU')} ₽/ч
                      </span>
                      {electricDiscount < 1.0 && (
                        <span className="text-[10px] text-emerald-400 block">
                          Скидка ГЭС/АЭС: {Math.round((1 - electricDiscount) * 100)}%
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 font-mono">
                      <span className="text-[11px] text-slate-400 block">Свободных слотов:</span>
                      <span className="text-sm font-bold text-sky-300">
                        {state.maxRacks - totalRacks} стоек
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mounted Racks Grid */}
                <div>
                  <h4 className="font-bold text-white text-sm mb-3">Оборудование в стойках</h4>

                  {ownedServerTypes.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-slate-400 space-y-2">
                      <Server className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs">В вашем дата-центре пока нет установленных стоек.</p>
                      <p className="text-[11px] text-slate-500">
                        Смонтируйте стойки из каталога ниже для автономной добычи Bitcoin.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {ownedServerTypes.map((srv) => {
                        const count = state.servers[srv.id] || 0;
                        const srvHash = (count * srv.btcPerHour).toFixed(4);
                        const srvOpex = count * srv.opexRub;
                        const refundCost = Math.floor(srv.cost * 0.5);

                        return (
                          <div
                            key={srv.id}
                            className="p-4 rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-amber-500/30 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                  <h5 className="font-bold text-white text-sm">{srv.name}</h5>
                                </div>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                  {count} шт.
                                </span>
                              </div>

                              <div className="space-y-1 text-xs font-mono text-slate-300 pt-2 border-t border-white/10">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Добыча пула:</span>
                                  <span className="text-amber-400 font-bold">+{srvHash} ₿/ч</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Свет пула:</span>
                                  <span className="text-slate-300">-{srvOpex.toLocaleString('ru-RU')} ₽/ч</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-400">
                                  <span>1 стойка:</span>
                                  <span>+{srv.btcPerHour} ₿/ч</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                onUpdateState((prev) => ({
                                  ...prev,
                                  rub: prev.rub + refundCost,
                                  servers: {
                                    ...prev.servers,
                                    [srv.id]: Math.max(0, (prev.servers[srv.id] || 0) - 1),
                                  },
                                }));
                                setMsg({
                                  text: `1 стойка «${srv.name}» демонтирована. Возвращено +${refundCost.toLocaleString('ru-RU')} ₽.`,
                                });
                              }}
                              className="mt-3.5 w-full py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/20 hover:bg-rose-900/40 text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Демонтировать 1 шт. (+{refundCost.toLocaleString('ru-RU')} ₽)
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. SERVER CATALOGUE FOR MOUNTING */}
                <div className="glass-panel rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">Каталог оборудования (Монтаж стоек)</h4>
                      <p className="text-xs text-slate-400">
                        Покупка и расширение вычислительных мощностей. Требуется добытое Золото из шахты.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SERVERS.map((srv) => {
                      const count = state.servers[srv.id] || 0;
                      const hasGold = (state.ores.ore_7 || 0) >= srv.goldReq;
                      const canAfford = state.rub >= srv.cost;
                      const canBuy = canAfford && hasGold && totalRacks < state.maxRacks;

                      return (
                        <div key={srv.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-white">{srv.name}</span>
                              {count > 0 && (
                                <span className="text-xs font-mono text-amber-400 font-bold">{count} шт.</span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-300 mt-2 space-y-1">
                              <div>Выработка: <b className="text-amber-400">+{srv.btcPerHour} ₿/ч</b></div>
                              <div>Свет: {srv.opexRub.toLocaleString('ru-RU')} ₽/ч</div>
                              <div className={`flex items-center gap-1 font-semibold ${hasGold ? 'text-amber-300' : 'text-rose-400'}`}>
                                <span>Золото:</span>
                                <span>{state.ores.ore_7 || 0} / {srv.goldReq} шт.</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const curTotal = Object.values(state.servers).reduce((a, b) => a + b, 0);
                              if (curTotal >= state.maxRacks) {
                                setMsg({ text: `Достигнут лимит стоек (${state.maxRacks}). Расширьте лимит на Премиум-Аукционе ТРЦ!`, isError: true });
                                return;
                              }
                              if (state.rub < srv.cost) {
                                setMsg({ text: 'Недостаточно средств для покупки стойки!', isError: true });
                                return;
                              }
                              if ((state.ores.ore_7 || 0) < srv.goldReq) {
                                setMsg({ text: `Недостаточно Золота: требуется ${srv.goldReq} шт. (в наличии: ${state.ores.ore_7 || 0}). Добудьте в шахте!`, isError: true });
                                return;
                              }

                              onUpdateState((prev) => ({
                                ...prev,
                                rub: prev.rub - srv.cost,
                                ores: {
                                  ...prev.ores,
                                  ore_7: prev.ores.ore_7 - srv.goldReq,
                                },
                                servers: {
                                  ...prev.servers,
                                  [srv.id]: (prev.servers[srv.id] || 0) + 1,
                                },
                              }));

                              setMsg({ text: `Стойка «${srv.name}» успешно смонтирована!` });
                            }}
                            className={`mt-4 w-full py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                              canBuy
                                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                          >
                            Купить ({srv.cost.toLocaleString('ru-RU')} ₽)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal: Partial Ore Sell */}
      {sellOreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-white/20">
            <h3 className="text-base font-bold text-white">Продажа руды</h3>
            <p className="text-xs text-slate-400">
              Цена скупки: <span className="font-bold text-emerald-400">{sellOreModal.price} ₽/шт.</span>
              {' · '}На складе: {sellOreModal.maxQty} шт.
            </p>

            <div className="space-y-2">
              <input
                type="number"
                min={1}
                max={sellOreModal.maxQty}
                value={sellQty}
                onChange={(e) => setSellQty(Math.max(1, Math.min(sellOreModal.maxQty, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
              />

              <div className="flex gap-2">
                <button onClick={() => setSellQty(Math.min(10, sellOreModal.maxQty))} className="text-xs px-2.5 py-1 rounded bg-white/10 text-slate-300">+10</button>
                <button onClick={() => setSellQty(Math.min(100, sellOreModal.maxQty))} className="text-xs px-2.5 py-1 rounded bg-white/10 text-slate-300">+100</button>
                <button onClick={() => setSellQty(sellOreModal.maxQty)} className="text-xs px-2.5 py-1 rounded bg-white/10 text-slate-300">Всё</button>
              </div>

              <div className="text-sm font-mono text-emerald-400 font-bold pt-2">
                Итого к выплате: {(sellQty * sellOreModal.price).toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const earn = sellQty * sellOreModal.price;
                  onUpdateState((prev) => ({
                    ...prev,
                    rub: prev.rub + earn,
                    ores: {
                      ...prev.ores,
                      [sellOreModal.oreId]: prev.ores[sellOreModal.oreId] - sellQty,
                    },
                  }));
                  setMsg({ text: `Продано ${sellQty} шт. руды за ${earn.toLocaleString('ru-RU')} ₽` });
                  setSellOreModal(null);
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                Продать
              </button>
              <button onClick={() => setSellOreModal(null)} className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
