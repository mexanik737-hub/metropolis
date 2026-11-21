import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { COURSES, UNI_LEVELS, SPECS } from '../data/gameData';
import { GraduationCap, BookOpen, Award, CheckCircle2, Lock } from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const EducationView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
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

  const handleBuyCourse = (cId: string, cost: number, name: string) => {
    if (state.unlockedCourses.includes(cId)) return;
    if (state.rub < cost) {
      setMsg({ text: 'Недостаточно средств для оплаты курса!', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - cost,
      unlockedCourses: [...prev.unlockedCourses, cId],
    }));
    setMsg({ text: `«${name}» успешно пройден! Открыта новая вакансия.` });
  };

  const handleStudyUni = (level: number, cost: number, name: string) => {
    if (!state.hasMilitaryTicket) {
      setMsg({ text: 'Для поступления в ВУЗ необходим Военный билет РФ! Оформите в МВД.', isError: true });
      return;
    }
    if (state.eduLevel !== level - 1) {
      setMsg({ text: 'Ступени ВУЗа необходимо проходить строго последовательно!', isError: true });
      return;
    }
    if (state.rub < cost) {
      setMsg({ text: 'Недостаточно средств для оплаты семестра!', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - cost,
      eduLevel: level,
    }));
    setMsg({ text: `Диплом «${name}» успешно получен!` });
  };

  const handleBuySpec = (specId: string, cost: number, name: string) => {
    if (state.unlockedSpecs.includes(specId)) return;
    if (state.eduLevel < 5) {
      setMsg({ text: 'Для Спецподготовки требуется оконченный ВУЗ V ступени (Профессура)!', isError: true });
      return;
    }
    if (state.rub < cost) {
      setMsg({ text: 'Недостаточно средств для оплаты программы!', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - cost,
      unlockedSpecs: [...prev.unlockedSpecs, specId],
    }));
    setMsg({ text: `Программа «${name}» успешно освоена!` });
  };

  return (
    <div className="space-y-6">


      {/* Courses */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 mb-4">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Курсы</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {COURSES.map((c) => {
            const isOwned = state.unlockedCourses.includes(c.id);
            return (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-white truncate">{c.name}</div>
                  <div className="text-xs font-mono text-emerald-400 mt-0.5">
                    {c.cost.toLocaleString('ru-RU')} ₽
                  </div>
                </div>

                <motion.button
                  whileHover={!isOwned ? { scale: 1.05 } : {}}
                  whileTap={!isOwned ? { scale: 0.95 } : {}}
                  onClick={() => handleBuyCourse(c.id, c.cost, c.name)}
                  disabled={isOwned}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
                    isOwned
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  {isOwned ? 'Пройден' : 'Изучить'}
                </motion.button>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Higher Education */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">ВУЗ</h3>
            </div>
          </div>
          <span className="text-xs font-mono">
            {state.hasMilitaryTicket ? (
              <span className="text-emerald-400 font-semibold">Военный билет ✓</span>
            ) : (
              <span className="text-rose-400 font-semibold">Нужен Военный билет ✕</span>
            )}
          </span>
        </div>

        <div className="space-y-2.5">
          {UNI_LEVELS.map((uni) => {
            const isCompleted = state.eduLevel >= uni.level;
            const canStudy = state.hasMilitaryTicket && state.eduLevel === uni.level - 1;

            return (
              <div
                key={uni.level}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/20'
                    : canStudy
                    ? 'bg-white/[0.03] border-white/10'
                    : 'bg-white/[0.01] border-white/5 opacity-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-white truncate">{uni.name}</div>
                  <div className="text-xs font-mono text-amber-400 mt-0.5">
                    {uni.cost.toLocaleString('ru-RU')} ₽
                  </div>
                </div>

                <motion.button
                  whileHover={!isCompleted && canStudy ? { scale: 1.05 } : {}}
                  whileTap={!isCompleted && canStudy ? { scale: 0.95 } : {}}
                  onClick={() => handleStudyUni(uni.level, uni.cost, uni.name)}
                  disabled={isCompleted || !canStudy}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                      : canStudy
                      ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-600/20'
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? 'Окончен' : 'Поступить'}
                </motion.button>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Special Preparation */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 mb-4">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Спецподготовка</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SPECS.map((spec) => {
            const isOwned = state.unlockedSpecs.includes(spec.id);
            const canBuy = state.eduLevel >= 5;

            return (
              <div
                key={spec.id}
                className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs sm:text-sm text-white">{spec.name}</div>
                  <div className="text-xs font-mono font-bold text-purple-300 mt-2">
                    {spec.cost.toLocaleString('ru-RU')} ₽
                  </div>
                </div>

                <motion.button
                  whileHover={!isOwned && canBuy ? { scale: 1.03 } : {}}
                  whileTap={!isOwned && canBuy ? { scale: 0.97 } : {}}
                  onClick={() => handleBuySpec(spec.id, spec.cost, spec.name)}
                  disabled={isOwned || !canBuy}
                  className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    isOwned
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : canBuy
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20'
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isOwned ? 'Пройдена' : canBuy ? 'Зачислиться' : 'Требуется ВУЗ V'}
                </motion.button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
