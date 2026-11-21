import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastNotifications: React.FC<Props> = ({ toasts, onDismiss }) => {
  return (
    <aside
      aria-label="Игровые уведомления"
      className="fixed bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-2rem)] sm:w-full space-y-2 pointer-events-none flex flex-col items-center"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const getStyles = () => {
            switch (toast.type) {
              case 'success':
                return 'bg-[#061912]/95 border-emerald-500/50 text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.3)]';
              case 'error':
                return 'bg-[#220a0d]/95 border-rose-500/50 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.3)]';
              case 'info':
              default:
                return 'bg-[#081829]/95 border-sky-500/50 text-sky-100 shadow-[0_10px_30px_rgba(56,189,248,0.3)]';
            }
          };

          const getIcon = () => {
            switch (toast.type) {
              case 'success':
                return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
              case 'error':
                return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
              case 'info':
              default:
                return <Info className="w-4 h-4 text-sky-400 shrink-0" />;
            }
          };

          const getProgressBarColor = () => {
            switch (toast.type) {
              case 'success':
                return 'bg-emerald-400';
              case 'error':
                return 'bg-rose-400';
              case 'info':
              default:
                return 'bg-sky-400';
            }
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 35, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.92, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 480, damping: 28 }}
              className={`pointer-events-auto relative overflow-hidden p-3.5 rounded-2xl border backdrop-blur-2xl flex items-center justify-between gap-3 w-full select-none ${getStyles()}`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {getIcon()}
                <span className="text-xs font-medium leading-snug line-clamp-2">{toast.message}</span>
              </div>
              
              {/* Close Button: Sleek 'X' cross icon, no text */}
              <motion.button
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                title="Закрыть"
                aria-label="Закрыть уведомление"
              >
                <X className="w-4 h-4" />
              </motion.button>

              {/* 4-second Auto-dismiss Countdown Progress Bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4.0, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 opacity-60 ${getProgressBarColor()}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
};
