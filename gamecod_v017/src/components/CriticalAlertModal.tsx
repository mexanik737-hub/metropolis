import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Coins, Ban, X, Check } from 'lucide-react';

export interface CriticalAlertData {
  id: string;
  type: 'raid' | 'bankruptcy' | 'ban' | 'theft' | 'warn';
  title: string;
  description: string;
  details?: { label: string; value: string; isNegative?: boolean }[];
  actionLabel?: string;
  onAction?: () => void;
}

interface Props {
  alert: CriticalAlertData | null;
  onClose: () => void;
}

export const CriticalAlertModal: React.FC<Props> = ({ alert, onClose }) => {
  const getAlertIcon = () => {
    if (!alert) return null;
    switch (alert.type) {
      case 'ban':
        return <Ban className="w-8 h-8 text-rose-400" />;
      case 'raid':
        return <ShieldAlert className="w-8 h-8 text-rose-400" />;
      case 'theft':
        return <Coins className="w-8 h-8 text-amber-400" />;
      case 'bankruptcy':
      case 'warn':
      default:
        return <AlertTriangle className="w-8 h-8 text-amber-400" />;
    }
  };

  const getBorderColor = () => {
    if (!alert) return '';
    switch (alert.type) {
      case 'ban':
      case 'raid':
        return 'border-rose-500/50 shadow-rose-950/70';
      case 'theft':
      case 'bankruptcy':
      case 'warn':
      default:
        return 'border-amber-500/50 shadow-amber-950/70';
    }
  };

  return (
    <AnimatePresence>
      {alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop with Framer Motion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`glass-panel rounded-2xl p-6 sm:p-7 max-w-lg w-full border ${getBorderColor()} shadow-2xl relative space-y-5 z-10`}
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              title="Закрыть уведомление"
            >
              <X className="w-4 h-4" />
            </motion.button>

            {/* Header with Icon and Title */}
            <div className="flex items-start gap-4 pr-6">
              <motion.div
                initial={{ rotate: -15, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0 shadow-lg"
              >
                {getAlertIcon()}
              </motion.div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Критическое уведомление
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide mt-0.5">
                  {alert.title}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {alert.description}
            </p>

            {/* Structured Details if provided */}
            {alert.details && alert.details.length > 0 && (
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                {alert.details.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{item.label}</span>
                    <span
                      className={`font-mono font-bold ${
                        item.isNegative ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2 flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (alert.onAction) alert.onAction();
                  onClose();
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-lg shadow-rose-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{alert.actionLabel || 'Понятно'}</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
