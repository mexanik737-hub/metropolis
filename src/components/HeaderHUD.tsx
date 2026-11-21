import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameState } from '../types/game';
import { getPrestigeInfo, getEnergyRegenSec, calcTotalCapital, CONFIG } from '../services/gameEngine';
import { Zap, KeyRound, Cloud, CloudCheck, RefreshCw, Award, FileSpreadsheet } from 'lucide-react';

interface Props {
  state: GameState;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onSyncDrive: () => void;
  onOpenSheets?: () => void;
  isDriveSyncing: boolean;
  driveUserEmail?: string | null;
}

export const HeaderHUD: React.FC<Props> = ({
  state,
  isAdmin,
  onOpenAdmin,
  onSyncDrive,
  onOpenSheets,
  isDriveSyncing,
  driveUserEmail,
}) => {
  const [secondsToNextEnergy, setSecondsToNextEnergy] = useState(0);
  const capital = calcTotalCapital(state);
  const prestige = getPrestigeInfo(capital);
  const regenSec = getEnergyRegenSec(state);

  useEffect(() => {
    const updateCountdown = () => {
      if (state.energy >= CONFIG.ENERGY_MAX) {
        setSecondsToNextEnergy(0);
        return;
      }
      const now = Date.now();
      const elapsedMs = now - state.lastEnergyTick;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const remain = Math.max(0, regenSec - (elapsedSec % regenSec));
      setSecondsToNextEnergy(remain);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [state.energy, state.lastEnergyTick, regenSec]);

  const energyPercent = Math.min(100, Math.max(0, state.energy));

  return (
    <header className="sticky top-0 z-40 w-full bg-black/85 backdrop-blur-2xl border-b border-white/10 px-2.5 py-2 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* ROW 1: Brand & Tools Navigation Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Version */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <motion.span
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenAdmin}
              className="text-base sm:text-xl font-black tracking-wider bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent cursor-pointer select-none"
              title="METROPOLIS — Панель управления"
            >
              METROPOLIS
            </motion.span>
            <span className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 font-bold">
              {CONFIG.VERSION_STRING}
            </span>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Prestige Level Badge */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-medium hover:border-amber-500/30 transition-all cursor-default"
              title={`Совокупный капитал: ${capital.toLocaleString('ru-RU')} ₽ · ${prestige.title}`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-bold font-mono">{prestige.rank}</span>
              <span className="hidden md:inline text-slate-400">·</span>
              <span className="hidden md:inline text-slate-300 truncate max-w-[110px]">{prestige.title}</span>
            </motion.div>

            {/* Admin Badge */}
            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenAdmin}
                className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 sm:py-1 rounded-xl hover:bg-amber-500/25 transition-all cursor-pointer"
                title="Панель администратора"
              >
                <KeyRound className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                <span>ROOT</span>
              </motion.button>
            )}

            {/* Google Drive Status Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSyncDrive}
              disabled={isDriveSyncing}
              className={`flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border transition-all cursor-pointer ${
                driveUserEmail
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
              }`}
              title={driveUserEmail ? `Синхронизировано: ${driveUserEmail}` : 'Подключить Google Диск'}
            >
              {isDriveSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
              ) : driveUserEmail ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span className="hidden sm:inline font-medium">
                {isDriveSyncing ? 'Синхр.' : driveUserEmail ? 'Диск' : 'Google Диск'}
              </span>
            </motion.button>

            {/* Google Sheets Database Button */}
            {onOpenSheets && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenSheets}
                className="flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
                title="База Данных: выгрузка 19 таблиц игры в Google Таблицы"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline font-medium">Таблицы</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* ROW 2: Currency Carousel & Concise Energy Progress Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
          {/* Currencies: Horizontal touch slider on mobile, flex-wrap on desktop */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth text-xs font-mono tabular-nums py-0.5">
            {/* Rubles */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 shadow-sm shrink-0 cursor-default"
              title="Наличные рубли (₽)"
            >
              <span className="font-bold text-emerald-400">₽</span>
              <span className="font-semibold">{state.rub.toLocaleString('ru-RU')}</span>
            </motion.div>

            {/* Cash USD */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-lime-950/40 border border-lime-500/30 text-lime-300 shadow-sm shrink-0 cursor-default"
              title="Наличные доллары ($)"
            >
              <span className="font-bold text-lime-400">$</span>
              <span>{state.usdCash.toLocaleString('ru-RU')}</span>
            </motion.div>

            {/* Offshore USD */}
            {state.usdOffshore > 0 && (
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 shadow-sm shrink-0 cursor-default"
                title="Оффшорный счет ($)"
              >
                <span className="font-bold text-cyan-400">🏛️$</span>
                <span>{state.usdOffshore.toLocaleString('ru-RU')}</span>
              </motion.div>
            )}

            {/* Bitcoin */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 shadow-sm shrink-0 cursor-default"
              title="Биткоин (₿)"
            >
              <span className="font-bold text-amber-400">₿</span>
              <span>{state.btc.toFixed(4)}</span>
            </motion.div>

            {/* Euro */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 shadow-sm shrink-0 cursor-default"
              title="Премиум евро (€)"
            >
              <span className="font-bold text-blue-400">€</span>
              <span>{state.eur}</span>
            </motion.div>
          </div>

          {/* Energy Widget: Concise Progress Bar */}
          <div
            className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-amber-500/25 shrink-0 self-end sm:self-auto w-full sm:w-auto sm:min-w-[190px]"
            title={`Энергия: ${state.energy} из 100 ⚡${state.energy < CONFIG.ENERGY_MAX ? ` · Восстановление +1 через ${secondsToNextEnergy}с` : ' (Максимум)'}`}
          >
            <Zap className={`w-3.5 h-3.5 shrink-0 ${state.energy < CONFIG.ENERGY_MAX ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-emerald-400 fill-emerald-400'}`} />
            <div className="flex-1 min-w-[90px]">
              <div className="flex items-center justify-between text-[11px] font-mono leading-none mb-1">
                <span className="font-bold text-amber-300">{state.energy} / 100 ⚡</span>
                {state.energy < CONFIG.ENERGY_MAX ? (
                  <span className="text-[10px] text-slate-400 font-mono">+{secondsToNextEnergy}с</span>
                ) : (
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">MAX</span>
                )}
              </div>
              {/* Sleek Gradient Progress Bar */}
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  className={`h-full rounded-full transition-all duration-300 ${
                    energyPercent > 60
                      ? 'bg-gradient-to-r from-amber-400 to-emerald-400'
                      : energyPercent > 25
                      ? 'bg-gradient-to-r from-orange-400 to-amber-400'
                      : 'bg-gradient-to-r from-rose-600 to-rose-400'
                  }`}
                  style={{ width: `${energyPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
