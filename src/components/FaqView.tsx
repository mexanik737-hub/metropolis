import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAQ_DATA } from '../data/gameData';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, FileSpreadsheet, Download, Database } from 'lucide-react';
import { downloadDatabaseAsCsv, downloadDatabaseAsJson } from '../services/googleSheetsDatabase';

interface Props {
  onOpenSheets?: () => void;
}

export const FaqView: React.FC<Props> = ({ onOpenSheets }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Database & Google Sheets Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-sky-950/30 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Полная База Данных Игры (Google Таблицы)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v0.17
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Выгрузка всех 19 разделов: константы, формулы, вероятности казино, бизнесы, машины, шахта, ранги и инфраструктура (без личных данных игрока).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onOpenSheets && (
              <button
                onClick={onOpenSheets}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                Google Таблицы
              </button>
            )}
            <button
              onClick={() => downloadDatabaseAsCsv()}
              className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-all flex items-center gap-1 cursor-pointer font-medium"
              title="Скачать всю базу данных в CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              .CSV
            </button>
            <button
              onClick={() => downloadDatabaseAsJson()}
              className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-all flex items-center gap-1 cursor-pointer font-medium"
              title="Скачать полный дамп в JSON"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              .JSON
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-4">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400"
          >
            <BookOpen className="w-5 h-5" />
          </motion.div>
          <div>
            <h3 className="text-base font-bold text-white">База Знаний и Руководство Гражданина (FAQ)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Подробные ответы на все вопросы по экономике, карьере, шахтам и банковской системе
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02] transition-colors"
              >
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 flex items-center justify-between text-left text-sm font-semibold text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-amber-400 font-mono text-xs font-bold">0{idx + 1}.</span>
                    <span className="leading-snug">{item.q}</span>
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  </motion.div>
                </motion.button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-white/5 bg-slate-950/40">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
