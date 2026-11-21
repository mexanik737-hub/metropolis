import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { FACTIONS } from '../data/gameData';
import {
  Building2,
  Shield,
  FileCheck,
  AlertOctagon,
  Award,
  CreditCard,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { RussianPlateBadge } from './common/RussianPlateBadge';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GovView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
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

  const handleJoinFaction = (factionId: string) => {
    const fDef = FACTIONS.find((f) => f.id === factionId);
    if (!fDef) return;

    if (fDef.reqKarma && state.karma < fDef.reqKarma) {
      setMsg({ text: `Требуется карма не менее +${fDef.reqKarma}`, isError: true });
      return;
    }
    if (fDef.reqKarmaMax && state.karma > fDef.reqKarmaMax) {
      setMsg({ text: `Требуется карма не выше ${fDef.reqKarmaMax}`, isError: true });
      return;
    }
    if (fDef.reqMineXp && state.mineXp < fDef.reqMineXp) {
      setMsg({ text: `Требуется опыт шахты не менее ${fDef.reqMineXp} XP`, isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      activeFaction: factionId,
    }));
    setMsg({ text: `Вы успешно вступили во фракцию «${fDef.name}»!` });
  };

  const handleBuyLicense = () => {
    if (state.hasDriverLicense) {
      setMsg({ text: 'Водительские права уже получены!', isError: true });
      return;
    }
    if (state.rub < 15000) {
      setMsg({ text: 'Госпошлина за права составляет 15 000 ₽', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - 15000,
      hasDriverLicense: true,
    }));
    setMsg({ text: 'Водительские права (Кат. B) успешно оформлены в МВД!' });
  };

  const handleBuyMilitaryRub = () => {
    if (state.hasMilitaryTicket) {
      setMsg({ text: 'Военный билет уже оформлен!', isError: true });
      return;
    }
    if (state.karma < 200) {
      setMsg({ text: 'Требуется положительная карма не менее +200!', isError: true });
      return;
    }
    if (state.rub < 300000) {
      setMsg({ text: 'Госпошлина за военный билет: 300 000 ₽', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - 300000,
      hasMilitaryTicket: true,
    }));
    setMsg({ text: 'Военный билет РФ официально получен в военкомате!' });
  };

  const handleBuyMilitaryEur = () => {
    if (state.hasMilitaryTicket) {
      setMsg({ text: 'Военный билет уже оформлен!', isError: true });
      return;
    }
    if (state.eur < 150) {
      setMsg({ text: 'Недостаточно Евро (€)! Требуется 150 €', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      eur: prev.eur - 150,
      hasMilitaryTicket: true,
    }));
    setMsg({ text: 'Военный билет РФ оформлен по ускоренной спецпрограмме!' });
  };

  const handleRegisterPlate = () => {
    if (!state.car) {
      setMsg({ text: 'Сначала приобретите автомобиль в Автосалоне!', isError: true });
      return;
    }
    if (state.rub < 5000) {
      setMsg({ text: 'Госпошлина за госномер: 5 000 ₽', isError: true });
      return;
    }

    const letters = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х'];
    const l1 = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const l2 = letters[Math.floor(Math.random() * letters.length)];
    const l3 = letters[Math.floor(Math.random() * letters.length)];
    const plate = `${l1}${num}${l2}${l3}777`;

    onUpdateState((prev) => {
      const owned = [...prev.ownedPlates];
      if (!owned.includes(plate)) owned.push(plate);
      return {
        ...prev,
        rub: prev.rub - 5000,
        ownedPlates: owned,
        car: prev.car ? { ...prev.car, plateNumber: plate } : null,
      };
    });

    setMsg({ text: `Госномер «${plate}» зарегистрирован и установлен на авто!` });
  };

  return (
    <div className="space-y-6">


      {/* 4 City Factions */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 mb-4">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Фракции</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {FACTIONS.map((fac) => {
            const isMember = state.activeFaction === fac.id;

            return (
              <div
                key={fac.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isMember
                    ? 'bg-sky-950/30 border-sky-500/50 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">{fac.name}</span>
                    {isMember && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                        Текущая
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{fac.desc}</p>

                  <div className="space-y-1 mb-4">
                    {fac.perks.map((p, idx) => (
                      <div key={idx} className="text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={!isMember ? { scale: 1.02 } : {}}
                  whileTap={!isMember ? { scale: 0.98 } : {}}
                  onClick={() => handleJoinFaction(fac.id)}
                  disabled={isMember}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isMember
                      ? 'bg-white/5 text-slate-500 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  {isMember ? 'Состоите' : 'Вступить'}
                </motion.button>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* MVD Licensing & Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* МВД Documents */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">МВД</h3>
            </div>
          </div>

          {/* Driver License */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs sm:text-sm text-white truncate">Водительские права</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Кат. B (такси, автодром)</p>
            </div>
            <motion.button
              whileHover={!state.hasDriverLicense ? { scale: 1.05 } : {}}
              whileTap={!state.hasDriverLicense ? { scale: 0.95 } : {}}
              onClick={handleBuyLicense}
              disabled={state.hasDriverLicense}
              className={`px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer text-center ${
                state.hasDriverLicense
                  ? 'bg-white/5 text-slate-500 cursor-default'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
              }`}
            >
              {state.hasDriverLicense ? 'Оформлены' : '15 000 ₽'}
            </motion.button>
          </div>

          {/* Military Ticket (Rub) */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs sm:text-sm text-white truncate">Военный билет (₽)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Карма ≥ +200. Доступ в ВУЗ</p>
            </div>
            <motion.button
              whileHover={!state.hasMilitaryTicket ? { scale: 1.05 } : {}}
              whileTap={!state.hasMilitaryTicket ? { scale: 0.95 } : {}}
              onClick={handleBuyMilitaryRub}
              disabled={state.hasMilitaryTicket}
              className={`px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer text-center ${
                state.hasMilitaryTicket
                  ? 'bg-white/5 text-slate-500 cursor-default'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
              }`}
            >
              {state.hasMilitaryTicket ? 'Получен' : '300 000 ₽'}
            </motion.button>
          </div>

          {/* Military Ticket (EUR) */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs sm:text-sm text-white truncate">Военный билет (€)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Без требований к карме</p>
            </div>
            <motion.button
              whileHover={!state.hasMilitaryTicket ? { scale: 1.05 } : {}}
              whileTap={!state.hasMilitaryTicket ? { scale: 0.95 } : {}}
              onClick={handleBuyMilitaryEur}
              disabled={state.hasMilitaryTicket}
              className={`px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer text-center ${
                state.hasMilitaryTicket
                  ? 'bg-white/5 text-slate-500 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
              }`}
            >
              {state.hasMilitaryTicket ? 'Получен' : '150 €'}
            </motion.button>
          </div>

          {/* Vehicle License Plate (ГИБДД) */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-white">Госномер на авто (ГИБДД)</span>
                {state.car?.plateNumber && (
                  <RussianPlateBadge plate={state.car.plateNumber} size="sm" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {state.car?.plateNumber ? 'Номер официально внесен в базу ГИБДД' : 'Защита от штрафа 25% на автодроме'}
              </p>
            </div>
            <motion.button
              whileHover={state.car ? { scale: 1.05 } : {}}
              whileTap={state.car ? { scale: 0.95 } : {}}
              onClick={handleRegisterPlate}
              disabled={!state.car}
              className={`px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer text-center ${
                !state.car
                  ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
              }`}
            >
              {!state.car ? 'Нет авто' : '5 000 ₽'}
            </motion.button>
          </div>
        </motion.div>

        {/* Fines & Investigation Log */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 mb-3">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Штрафы и рейды</h3>
              </div>
            </div>

            {state.finesLog.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                Нет нарушений и штрафов.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {state.finesLog.slice(0, 10).map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-rose-300">[{f.source}]</span>
                      <p className="text-slate-300 mt-0.5 truncate">{f.desc}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-400 shrink-0">{f.amountText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Прокуратура: {state.raidCounters.prosecutorRaids}</span>
            <span>МВД: {state.raidCounters.mvdRaids}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
