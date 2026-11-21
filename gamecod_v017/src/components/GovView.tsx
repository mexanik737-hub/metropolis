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

  return (
    <div className="space-y-6">


      {/* 4 City Factions */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-4">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400"
          >
            <Users className="w-5 h-5" />
          </motion.div>
          <div>
            <h3 className="text-base font-bold text-white">Городские Фракции Мегаполиса</h3>
            <span className="text-[11px] text-slate-400">Влияние, лоббизм и уникальные бонусы</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FACTIONS.map((fac) => {
            const isMember = state.activeFaction === fac.id;

            return (
              <motion.div
                key={fac.id}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
                        Ваша Фракция
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{fac.desc}</p>

                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-semibold text-slate-300">Привилегии фракции:</span>
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
                  {isMember ? 'Вы состоите во фракции' : 'Вступить во фракцию'}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* MVD Licensing & Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* МВД Documents */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400"
            >
              <Shield className="w-5 h-5" />
            </motion.div>
            <div>
              <h3 className="text-base font-bold text-white">Управление МВД: Оформление Документов</h3>
              <span className="text-[11px] text-slate-400">Государственные лицензии и свидетельства</span>
            </div>
          </div>

          {/* Driver License */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm text-white">Водительские Права (Кат. B)</div>
              <p className="text-xs text-slate-400 mt-0.5">Открывает работу в такси и защищает от штрафов ГИБДД</p>
            </div>
            <motion.button
              whileHover={!state.hasDriverLicense ? { scale: 1.05 } : {}}
              whileTap={!state.hasDriverLicense ? { scale: 0.95 } : {}}
              onClick={handleBuyLicense}
              disabled={state.hasDriverLicense}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                state.hasDriverLicense
                  ? 'bg-white/5 text-slate-500 cursor-default'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
              }`}
            >
              {state.hasDriverLicense ? 'Оформлены' : '15 000 ₽'}
            </motion.button>
          </div>

          {/* Military Ticket (Rub) */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm text-white">Военный билет РФ (за рубли)</div>
              <p className="text-xs text-slate-400 mt-0.5">Требует карму ≥ +200. Открывает поступление в ВУЗ</p>
            </div>
            <motion.button
              whileHover={!state.hasMilitaryTicket ? { scale: 1.05 } : {}}
              whileTap={!state.hasMilitaryTicket ? { scale: 0.95 } : {}}
              onClick={handleBuyMilitaryRub}
              disabled={state.hasMilitaryTicket}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                state.hasMilitaryTicket
                  ? 'bg-white/5 text-slate-500 cursor-default'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
              }`}
            >
              {state.hasMilitaryTicket ? 'Получен' : '300 000 ₽'}
            </motion.button>
          </div>

          {/* Military Ticket (EUR) */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-sm text-white">Военный билет (Спецпрограмма €)</div>
              <p className="text-xs text-slate-400 mt-0.5">Без требований к карме (доступен нелегалам)</p>
            </div>
            <motion.button
              whileHover={!state.hasMilitaryTicket ? { scale: 1.05 } : {}}
              whileTap={!state.hasMilitaryTicket ? { scale: 0.95 } : {}}
              onClick={handleBuyMilitaryEur}
              disabled={state.hasMilitaryTicket}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                state.hasMilitaryTicket
                  ? 'bg-white/5 text-slate-500 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
              }`}
            >
              {state.hasMilitaryTicket ? 'Получен' : '150 €'}
            </motion.button>
          </div>
        </motion.div>

        {/* Fines & Investigation Log */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-4">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400"
              >
                <AlertOctagon className="w-5 h-5" />
              </motion.div>
              <div>
                <h3 className="text-base font-bold text-white">Реестр Штрафов и Рейдов</h3>
                <span className="text-[11px] text-slate-400">Протоколы силовых ведомств</span>
              </div>
            </div>

            {state.finesLog.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center italic">
                У вас нет зафиксированных нарушений и штрафов силовых ведомств.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {state.finesLog.slice(0, 10).map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-rose-300">[{f.source}]</span>
                      <p className="text-slate-300 mt-0.5">{f.desc}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-400 shrink-0">{f.amountText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Рейдов Прокуратуры: {state.raidCounters.prosecutorRaids}</span>
            <span>Рейдов МВД: {state.raidCounters.mvdRaids}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
