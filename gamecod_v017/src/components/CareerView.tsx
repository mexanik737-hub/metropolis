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

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CareerView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
  const [subTab, setSubTab] = useState<CareerSubTab>('work');
  
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
      if (isMvdRaid) {
        earnedUsd = Math.floor(job.salary * 0.5);
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

    // Трейд-ин 70% или 80% + авто-снятие кассы
    const refund = Math.floor(bDef.cost * 0.70);
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
      text: `Предприятие «${bDef.name}» продано за ${refund.toLocaleString('ru-RU')} ₽. Остатки кассы зачислены на счет!`,
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
    const dropCount = Math.min(state.vein, Math.floor(1 + Math.random() * 25));

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

    setMineFeedback(`⛏️ Добыто: +${dropCount} шт. [${dropOre.name}] (+5 XP)`);
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
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        {[
          { id: 'work', label: 'Работа', icon: <Briefcase className="w-4 h-4" /> },
          { id: 'business', label: `Бизнес (${state.businesses.length})`, icon: <Building className="w-4 h-4" /> },
          { id: 'mine', label: 'Шахта и Буры', icon: <Pickaxe className="w-4 h-4" /> },
          { id: 'printers', label: 'Принтеры', icon: <Printer className="w-4 h-4" /> },
          { id: 'servers', label: 'Серверы ₿', icon: <Server className="w-4 h-4" /> },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => setSubTab(tab.id as CareerSubTab)}
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



      {/* 1. WORK SUBTAB */}
      {subTab === 'work' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-2">Легальные Профессии (16 вакансий)</h3>
            <p className="text-xs text-slate-400 mb-6">
              Отработка смен расходует 20 ⚡ энергии и повышает карму. Для водительских должностей требуется
              автомобиль и бензин.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {JOBS_LEGAL.map((job) => {
                const isCurrent = state.jobId === job.id;
                const shifts = state.jobShifts[job.id] || 0;

                // Проверка доступности
                let locked = false;
                let lockReason = '';

                if (job.reqCourse && !state.unlockedCourses.includes(job.reqCourse)) {
                  locked = true;
                  lockReason = 'Требуется курс в Образовании';
                }
                if (job.reqEdu && state.eduLevel < job.reqEdu) {
                  locked = true;
                  lockReason = `Требуется ВУЗ ${job.reqEdu} ступени`;
                }
                if (job.reqSpec && !state.unlockedSpecs.includes(job.reqSpec)) {
                  locked = true;
                  lockReason = 'Требуется Спецподготовка';
                }
                if (job.reqLicense && !state.hasDriverLicense) {
                  locked = true;
                  lockReason = 'Требуются Права Кат. B';
                }
                if (job.reqKarma && state.karma < job.reqKarma) {
                  locked = true;
                  lockReason = `Карма не менее +${job.reqKarma}`;
                }

                return (
                  <div
                    key={job.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-sky-950/30 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                        : locked
                        ? 'bg-white/[0.01] border-white/5 opacity-60'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-sm text-white">{job.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Текущая
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{job.desc}</p>
                      <div className="flex items-center gap-2 text-xs font-mono mb-2">
                        <span className="text-emerald-400 font-bold">+{job.salary.toLocaleString('ru-RU')} ₽</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-sky-400">+{job.karma} кармы</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">Смен: {shifts}</span>
                      {locked ? (
                        <span className="text-[11px] text-rose-400 italic">{lockReason}</span>
                      ) : (
                        <button
                          onClick={() => handleWorkShift(job.id, false)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>Смена (-20⚡)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Illegal Jobs Section */}
          <div className="glass-panel rounded-2xl p-6 border-rose-500/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-bold text-white">Теневой Сектор (7 нелегальных вакансий)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Выплаты производятся в Наличных долларах ($). Каждая смена сжигает расходник, снижает карму и несет
              риск облавы МВД (5%–20%) с изъятием половины заработка.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {JOBS_ILLEGAL.map((job) => {
                const consumeCount = job.consumeItem
                  ? state.inventory.filter((i) => i === job.consumeItem).length
                  : 0;

                let locked = false;
                let lockReason = '';

                if (job.reqKarmaMax && state.karma > job.reqKarmaMax) {
                  locked = true;
                  lockReason = `Карма не выше ${job.reqKarmaMax}`;
                }
                if (job.consumeItem && consumeCount === 0) {
                  locked = true;
                  lockReason = 'Нет расходников';
                }

                return (
                  <div
                    key={job.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                      locked
                        ? 'bg-white/[0.01] border-white/5 opacity-60'
                        : 'bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-sm text-rose-200">{job.name}</span>
                        <span className="text-[11px] font-mono text-lime-400 font-bold">
                          +{job.salary.toLocaleString('ru-RU')} $
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">{job.desc}</p>
                      <div className="text-[11px] font-mono text-slate-400 mb-2">
                        Расходник в наличии: <span className="text-white font-bold">{consumeCount} шт.</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-rose-400 font-mono">{job.karma} кармы</span>
                      {locked ? (
                        <span className="text-[11px] text-amber-400 italic">{lockReason}</span>
                      ) : (
                        <button
                          onClick={() => handleWorkShift(job.id, true)}
                          className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>Смена (-20⚡)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. BUSINESS SUBTAB */}
      {subTab === 'business' && (
        <div className="space-y-6">
          {/* Active Businesses */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Мои Предприятия ({state.businesses.length})</h3>
                <p className="text-xs text-slate-400">
                  Синергия холдинга: +{(state.businesses.length > 1 ? (state.businesses.length - 1) * 2 : 0)}% к
                  выработке каждого объекта. Касса копится до 24 часов.
                </p>
              </div>
            </div>

            {state.businesses.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-white/5 text-slate-500 text-sm">
                У вас пока нет купленных предприятий. Выберите объект в каталоге ниже!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.businesses.map((b, idx) => {
                  const bDef = BUSINESSES.find((item) => item.id === b.id);
                  if (!bDef) return null;

                  const isUsd = bDef.isUsd;
                  const currentCash = isUsd ? b.cashboxUsd : b.cashboxRub;
                  const maxCash = isUsd ? bDef.income * 24 : bDef.income * 24;
                  const pct = Math.min(100, Math.round((currentCash / maxCash) * 100));

                  return (
                    <div key={idx} className="p-4 rounded-xl glass-panel-subtle border border-white/10 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{bDef.name}</h4>
                          <span className="text-xs text-slate-400 font-mono">
                            Выработка: {bDef.income.toLocaleString('ru-RU')} {isUsd ? '$/ч' : '₽/ч'}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-sky-400">{pct}% кассы</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isUsd ? 'bg-lime-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">В кассе:</span>
                        <span className="font-bold text-white">
                          {Math.floor(currentCash).toLocaleString('ru-RU')} {isUsd ? '$' : '₽'}
                        </span>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleCollectCashbox(idx)}
                          disabled={currentCash < bDef.income} // Мин 1 час
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            currentCash >= bDef.income
                              ? isUsd
                                ? 'bg-lime-600 hover:bg-lime-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-white/5 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          {currentCash < bDef.income ? 'Накопление (мин. 1ч)' : 'Снять кассу'}
                        </button>

                        <button
                          onClick={() => handleSellBusiness(idx)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/20 hover:bg-rose-900/50 text-rose-300 text-xs transition-colors"
                        >
                          Трейд-ин (70%)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Business Catalog */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4">Каталог Предприятий Мегаполиса</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BUSINESSES.map((biz) => {
                const alreadyOwned = state.businesses.some((b) => b.id === biz.id);

                return (
                  <div
                    key={biz.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-sm text-white">{biz.name}</span>
                        {biz.isUsd && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                            Нелегал
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{biz.desc}</p>
                      <div className="text-xs font-mono space-y-0.5 mb-3">
                        <div className="text-slate-300">
                          Цена: <span className="font-bold text-white">{biz.cost.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div className="text-emerald-400">
                          Доход: +{biz.income.toLocaleString('ru-RU')} {biz.isUsd ? '$/ч' : '₽/ч'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyBusiness(biz.id)}
                      disabled={alreadyOwned || state.rub < biz.cost}
                      className={`w-full py-2 rounded-xl text-xs font-semibold transition-all ${
                        alreadyOwned
                          ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                          : state.rub >= biz.cost
                          ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {alreadyOwned ? 'Уже куплен' : 'Купить предприятие'}
                    </button>
                  </div>
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
          <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div>
              <div className="flex items-center gap-2">
                <Pickaxe className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Городской Горный Разрез</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Остаток жилы горизонта: <span className="font-mono font-bold text-amber-300">{state.vein.toLocaleString('ru-RU')} / 50 000 ед.</span>
                {' · '}Опыт шахтера: <span className="font-mono text-sky-300">{state.mineXp} XP</span>
              </p>

              {/* Vein progress bar */}
              <div className="w-64 h-2 rounded-full bg-white/10 mt-3 overflow-hidden">
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
                  className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all"
                >
                  <Flame className="w-4 h-4" />
                  <span>Взрывные работы (250 000 ₽)</span>
                </button>
              ) : (
                <button
                  onClick={handleMineManual}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition-all"
                >
                  <Pickaxe className="w-4 h-4" />
                  <span>Удар киркой (-2⚡)</span>
                </button>
              )}
            </div>

            {mineFeedback && (
              <div className="absolute bottom-2 left-6 text-xs font-bold text-amber-300 animate-bounce">
                {mineFeedback}
              </div>
            )}
          </div>

          {/* Ore Warehouse */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-white text-sm">Склад Руды (10 тиров)</h4>
              <span className="text-xs text-slate-400">Нажмите на руду для частичной продажи</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      count > 0
                        ? 'bg-white/[0.03] border-white/10 hover:border-amber-400/50 hover:bg-white/[0.05]'
                        : 'bg-white/[0.01] border-white/5 opacity-50 cursor-default'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">{ore.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">Тир {ore.tier}</span>
                    </div>
                    <div className="text-base font-extrabold font-mono text-amber-300">{count} шт.</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ore.sellPrice} ₽/шт.</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dual-Sector Drill */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">Двухсекторная Буровая Установка</h4>
                <p className="text-xs text-slate-400">
                  Автоматически добывает руду в 2 выбранных сектора (50% / 50%).
                </p>
              </div>
              {state.drill && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {state.drill.id}
                </span>
              )}
            </div>

            {!state.drill ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {DRILLS.map((dr) => (
                  <div key={dr.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                    <div>
                      <h5 className="font-bold text-white text-sm">{dr.name}</h5>
                      <span className="text-xs text-slate-400 font-mono">Скорость: {dr.rate} шт./ч</span>
                      <div className="text-xs text-amber-300 font-mono mt-1 font-bold">
                        {dr.cost.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (state.rub < dr.cost) {
                          setMsg({ text: 'Недостаточно средств для покупки бура!', isError: true });
                          return;
                        }
                        onUpdateState((prev) => ({
                          ...prev,
                          rub: prev.rub - dr.cost,
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
                        setMsg({ text: `Бур «${dr.name}» успешно приобретен и смонтирован!` });
                      }}
                      className="mt-3 w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
                    >
                      Купить бур
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Топливный бак:</span>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {Math.floor(state.drill.fuelSeconds / 60)} мин (из 540)
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Прочность коронки:</span>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {state.drill.bitDurability.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Сектор 1 (50%):</span>
                    <div className="text-sm font-bold text-amber-300 mt-0.5">
                      {ORES.find((o) => o.id === state.drill!.sector1Ore)?.name}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Сектор 2 (50%):</span>
                    <div className="text-sm font-bold text-amber-300 mt-0.5">
                      {ORES.find((o) => o.id === state.drill!.sector2Ore)?.name}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const dDef = DRILLS.find((d) => d.id === state.drill!.id);
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
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  >
                    Заправить бак
                  </button>

                  <button
                    onClick={() => {
                      const dDef = DRILLS.find((d) => d.id === state.drill!.id);
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
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                  >
                    Ремонт коронки
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PRINTERS SUBTAB */}
      {subTab === 'printers' && (
        <div className="space-y-6">
          {state.press ? (
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Активный Печатный Станок: {state.press.id}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    Прочность валов: {state.press.durability.toFixed(1)}% (износ 1% в час)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">В лотке:</span>
                  <div className="text-lg font-bold font-mono text-emerald-400">
                    {Math.floor(state.press.trayRub).toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
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
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                >
                  Забрать наличные из лотка
                </button>

                <button
                  onClick={() => {
                    const pDef = PRESSES.find((p) => p.id === state.press!.id);
                    if (!pDef) return;
                    const wear = (100 - state.press!.durability) / 100;
                    const repCost = Math.ceil(pDef.repRub * wear);
                    if (state.rub < repCost) {
                      setMsg({ text: `Недостаточно средств (${repCost} ₽)`, isError: true });
                      return;
                    }
                    onUpdateState((prev) => ({
                      ...prev,
                      rub: prev.rub - repCost,
                      press: prev.press ? { ...prev.press, durability: 100 } : null,
                    }));
                    setMsg({ text: 'Валы станка отремонтированы!' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                >
                  Ремонт валов
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-2">Верстак Сборки Принтеров (7 моделей)</h3>
              <p className="text-xs text-slate-400 mb-6">
                Сборка требует рублевой стоимости шасси и комплекта руды со склада шахты.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PRESSES.map((pr) => (
                  <div key={pr.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{pr.name}</h4>
                      <div className="text-xs text-emerald-400 font-mono font-bold mt-1">
                        Выработка: +{pr.income.toLocaleString('ru-RU')} ₽/ч
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-2">
                        Шасси: {pr.cost.toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="text-[11px] text-slate-400 mt-2">
                        Рецепт руды:
                        <div className="text-slate-300 font-mono">
                          {Object.entries(pr.mats).map(([oreId, qty]) => `${oreId}: ${qty}`).join(', ')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (state.rub < pr.cost) {
                          setMsg({ text: 'Недостаточно средств на шасси!', isError: true });
                          return;
                        }
                        // Проверка руды
                        for (const [oreId, qty] of Object.entries(pr.mats)) {
                          if ((state.ores[oreId] || 0) < qty) {
                            setMsg({ text: `Недостаточно руды ${oreId} (требуется ${qty})`, isError: true });
                            return;
                          }
                        }

                        onUpdateState((prev) => {
                          const nextOres = { ...prev.ores };
                          for (const [oreId, qty] of Object.entries(pr.mats)) {
                            nextOres[oreId] -= qty;
                          }
                          return {
                            ...prev,
                            rub: prev.rub - pr.cost,
                            ores: nextOres,
                            press: { id: pr.id, durability: 100, trayRub: 0 },
                          };
                        });
                        setMsg({ text: `Принтер «${pr.name}» успешно собран и запущен!` });
                      }}
                      className="mt-4 w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
                    >
                      Собрать станок
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
                {' · '}Время бункера: <span className="font-mono text-slate-300">{Math.floor(state.serverAccumSec / 3600)} ч. / 24 ч.</span>
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-amber-500/20"
            >
              Собрать намайненный ₿ (Оплатить счет)
            </button>
          </div>

          {/* Server Catalogue */}
          <div className="glass-panel rounded-2xl p-6">
            <h4 className="font-bold text-white text-sm mb-4">Каталог Серверных Пулов (Лимит: {Object.values(state.servers).reduce((a, b) => a + b, 0)} / {state.maxRacks} стоек)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {SERVERS.map((srv) => {
                const count = state.servers[srv.id] || 0;
                return (
                  <div key={srv.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{srv.name}</span>
                        <span className="text-xs font-mono text-amber-400 font-bold">{count} шт.</span>
                      </div>
                      <div className="text-xs font-mono text-slate-300 mt-2 space-y-1">
                        <div>Выработка: +{srv.btcPerHour} ₿/ч</div>
                        <div>Свет: {srv.opexRub.toLocaleString('ru-RU')} ₽/ч</div>
                        <div className="text-amber-300">Золото: {srv.goldReq} шт.</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const totalRacks = Object.values(state.servers).reduce((a, b) => a + b, 0);
                        if (totalRacks >= state.maxRacks) {
                          setMsg({ text: `Достигнут лимит стоек (${state.maxRacks}). Расширьте лимит на Аукционе ТРЦ!`, isError: true });
                          return;
                        }
                        if (state.rub < srv.cost) {
                          setMsg({ text: 'Недостаточно средств для покупки стойки!', isError: true });
                          return;
                        }
                        if ((state.ores.ore_7 || 0) < srv.goldReq) {
                          setMsg({ text: `Недостаточно Золота (ore_7): требуется ${srv.goldReq} шт. Добудьте в шахте!`, isError: true });
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
                      className="mt-4 w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
                    >
                      Купить ({srv.cost.toLocaleString('ru-RU')} ₽)
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
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
