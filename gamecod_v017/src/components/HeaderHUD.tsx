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

  return (
    <header className="sticky top-0 z-40 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 px-3 py-2.5 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Zone 1: Brand & Prestige */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAdmin}
              className="text-lg sm:text-xl font-black tracking-wider bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent cursor-pointer select-none transition-opacity"
              title="METROPOLIS — Нажмите для управления"
            >
              METROPOLIS
            </motion.span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10 font-bold">
              {CONFIG.VERSION_STRING}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Prestige Level */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-slate-300 font-medium group hover:border-amber-500/30 transition-all cursor-default"
              title={`Совокупный капитал: ${capital.toLocaleString('ru-RU')} ₽`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400 transition-transform group-hover:scale-110" />
              <span className="text-amber-400 font-bold font-mono">{prestige.rank}</span>
              <span className="hidden sm:inline text-slate-400">·</span>
              <span className="hidden sm:inline text-slate-300">{prestige.title}</span>
            </motion.div>

            {/* Admin Badge */}
            {isAdmin && (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={onOpenAdmin}
                className="group flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl hover:bg-amber-500/20 transition-all cursor-pointer"
                title="Панель администратора"
              >
                <KeyRound className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                <span>ROOT</span>
              </motion.button>
            )}

            {/* Google Drive Status Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSyncDrive}
              disabled={isDriveSyncing}
              className={`group flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                driveUserEmail
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
              }`}
              title={driveUserEmail ? `Синхронизировано: ${driveUserEmail}` : 'Подключить Google Диск'}
            >
              {isDriveSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : driveUserEmail ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover:scale-110" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-blue-400 transition-transform group-hover:scale-110" />
              )}
              <span className="hidden sm:inline font-medium">
                {isDriveSyncing ? 'Синхронизация' : driveUserEmail ? 'Диск' : 'Google Диск'}
              </span>
            </motion.button>

            {/* Google Sheets Database Button */}
            {onOpenSheets && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenSheets}
                className="group flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-sm shadow-emerald-950/40"
                title="База Данных Игры: выгрузка всех 19 таблиц, механик и формул в Google Таблицы"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline font-medium">Google Таблицы</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Zone 2: Currency & Energy Bar with Pure Glyphs & Micro-Animations */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 text-xs font-mono tabular-nums">
          {/* Rubles */}
          <motion.div
            whileHover={{ scale: 1.05, y: -1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 shadow-sm cursor-default"
            title="Наличные рубли (₽)"
          >
            <span className="font-bold text-emerald-400 text-sm">₽</span>
            <span className="font-semibold">{state.rub.toLocaleString('ru-RU')}</span>
          </motion.div>

          {/* Cash USD */}
          <motion.div
            whileHover={{ scale: 1.05, y: -1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-lime-950/40 border border-lime-500/30 text-lime-300 shadow-sm cursor-default"
            title="Наличные доллары ($)"
          >
            <span className="font-bold text-lime-400 text-sm">$</span>
            <span>{state.usdCash.toLocaleString('ru-RU')}</span>
          </motion.div>

          {/* Offshore USD */}
          {state.usdOffshore > 0 && (
            <motion.div
              whileHover={{ scale: 1.05, y: -1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 shadow-sm cursor-default"
              title="Оффшорный счет ($)"
            >
              <span className="font-bold text-cyan-400 text-sm">🏛️$</span>
              <span>{state.usdOffshore.toLocaleString('ru-RU')}</span>
            </motion.div>
          )}

          {/* Bitcoin */}
          <motion.div
            whileHover={{ scale: 1.05, y: -1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 shadow-sm cursor-default"
            title="Биткоин (₿)"
          >
            <span className="font-bold text-amber-400 text-sm">₿</span>
            <span>{state.btc.toFixed(4)}</span>
          </motion.div>

          {/* Donate Euro */}
          <motion.div
            whileHover={{ scale: 1.05, y: -1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 shadow-sm cursor-default"
            title="Премиум евро (€, 1€ = 1 рубль)"
          >
            <span className="font-bold text-blue-400 text-sm">€</span>
            <span>{state.eur}</span>
          </motion.div>

          {/* Energy Indicator */}
          <motion.div
            whileHover={{ scale: 1.05, y: -1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-yellow-950/40 border border-yellow-500/30 text-yellow-300 shadow-sm group cursor-default"
            title="Энергия гражданина"
          >
            <Zap className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 transition-transform group-hover:scale-125" />
            <span className="font-bold">{state.energy}/100</span>
            {state.energy < CONFIG.ENERGY_MAX && (
              <span className="text-[10px] text-yellow-400/70 hidden sm:inline">
                ({secondsToNextEnergy}с)
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  );
};
