import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface Props {
  stolenRub: number;
  stolenUsd: number;
  onClose: () => void;
}

export const TheftModal: React.FC<Props> = ({ stolenRub, stolenUsd, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-rose-500/40 text-center shadow-[0_0_50px_rgba(244,63,94,0.25)]">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-white">Внимание: Уличная Кража!</h3>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            В переходе метро карманники незаметно разрезали карман и похитили часть ваших наличных сбережений:
          </p>
        </div>

        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 font-mono text-sm space-y-1">
          {stolenRub > 0 && (
            <div className="text-rose-400 font-bold">
              -{stolenRub.toLocaleString('ru-RU')} ₽
            </div>
          )}
          {stolenUsd > 0 && (
            <div className="text-lime-400 font-bold">
              -{stolenUsd.toLocaleString('ru-RU')} $
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 italic">
          Совет: Храните крупные суммы в домашнем Сейфе или Хранилище Банка. Наложен кулдаун 6 часов.
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/30"
        >
          Принять потерю и быть бдительнее
        </button>
      </div>
    </div>
  );
};
