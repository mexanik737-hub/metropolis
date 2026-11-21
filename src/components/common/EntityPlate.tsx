import React from 'react';
import { motion } from 'framer-motion';

export interface EntityParam {
  label?: string;
  value: React.ReactNode;
  highlight?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' | 'yellow';
}

interface EntityPlateProps {
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  params: EntityParam[];
  action?: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
  className?: string;
  footer?: React.ReactNode;
}

const HIGHLIGHT_STYLES = {
  emerald: 'text-emerald-400 font-semibold',
  amber: 'text-amber-400 font-semibold',
  sky: 'text-sky-400 font-semibold',
  rose: 'text-rose-400 font-semibold',
  yellow: 'text-yellow-400 font-semibold',
  slate: 'text-slate-400',
};

/**
 * METROPOLIS — Унифицированная плашка сущности (Entity Plate)
 * Строгий компактный модульный стандарт для работ, бизнесов, машин, недвижимости и услуг.
 * - Все текстовые блоки строго внутри карточки (overflow-hidden, truncate).
 * - Слева: иконка + заголовок + лаконичные параметры через разделитель `·`.
 * - Справа: унифицированная кнопка действия.
 */
export const EntityPlate: React.FC<EntityPlateProps> = ({
  icon,
  title,
  badge,
  params,
  action,
  disabled = false,
  active = false,
  danger = false,
  onClick,
  className = '',
  footer,
}) => {
  return (
    <motion.div
      whileHover={!disabled && onClick ? { y: -1 } : undefined}
      transition={{ duration: 0.15 }}
      onClick={!disabled ? onClick : undefined}
      className={`relative w-full rounded-xl border p-3.5 transition-all overflow-hidden flex flex-col justify-between ${
        active
          ? 'bg-sky-950/30 border-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.12)]'
          : danger
          ? 'bg-rose-950/20 border-rose-500/25'
          : disabled
          ? 'bg-white/[0.01] border-white/5 opacity-55'
          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.035]'
      } ${onClick && !disabled ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        {/* Left / Info Side */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon && (
            <div className="shrink-0 p-2 rounded-lg bg-white/5 border border-white/10 text-slate-300">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm text-white truncate" title={title}>
                {title}
              </span>
              {badge && <span className="shrink-0">{badge}</span>}
            </div>

            {/* Parameters Line with separators */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-1 min-w-0">
              {params.map((param, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-slate-600 select-none">·</span>}
                  <span className="inline-flex items-center gap-1 truncate">
                    {param.label && <span className="text-slate-500">{param.label}:</span>}
                    <span className={param.highlight ? HIGHLIGHT_STYLES[param.highlight] : 'text-slate-300'}>
                      {param.value}
                    </span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Right / Action Side */}
        {action && (
          <div className="shrink-0 flex items-center justify-end sm:self-center">
            {action}
          </div>
        )}
      </div>

      {/* Optional Compact Footer (e.g. progress bar, small status line) */}
      {footer && (
        <div className="mt-2.5 pt-2 border-t border-white/5 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </motion.div>
  );
};
