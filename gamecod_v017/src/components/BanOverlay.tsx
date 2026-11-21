import React from 'react';
import { ShieldAlert, Lock, Clock } from 'lucide-react';

interface Props {
  reason: string;
  expiresAt: number;
}

export const BanOverlay: React.FC<Props> = ({ reason, expiresAt }) => {
  const isPermanent = expiresAt > Date.now() + 86400000 * 365;
  const remainingHours = Math.max(0, Math.ceil((expiresAt - Date.now()) / 3600000));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 text-center select-none">
      <div className="glass-panel rounded-3xl p-8 max-w-md w-full border border-rose-600/50 space-y-6 shadow-[0_0_80px_rgba(225,29,72,0.35)]">
        <div className="w-20 h-20 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-500 animate-pulse">
          <Lock className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-mono tracking-widest text-rose-400 font-bold uppercase">
            Управление Государственной Безопасности
          </span>
          <h2 className="text-2xl font-black text-white mt-1">АККАУНТ ЗАБЛОКИРОВАН</h2>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/20 text-xs text-rose-200 text-left space-y-2">
          <div>
            <span className="text-slate-400">Причина блокировки:</span>
            <div className="font-semibold text-white mt-0.5">{reason || 'Нарушение регламента мегаполиса'}</div>
          </div>
          <div>
            <span className="text-slate-400">Срок ограничения:</span>
            <div className="font-mono font-bold text-amber-300 mt-0.5">
              {isPermanent ? 'Перманентный бан (Бессрочно)' : `Осталось: ${remainingHours} ч.`}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Внимание: На время блокировки игровое время полностью заморожено. Начисление ресурсов, касс и майнинга
          приостановлено.
        </p>
      </div>
    </div>
  );
};
