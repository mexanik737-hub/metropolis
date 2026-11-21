import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  X,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  ShieldCheck,
  Loader2,
  Copy,
  Table,
  Check,
} from 'lucide-react';
import {
  buildFullGameDatabase,
  exportGameDatabaseToGoogleSheets,
  downloadDatabaseAsCsv,
  downloadDatabaseAsJson,
  SheetData,
} from '../services/googleSheetsDatabase';
import { googleSignIn, getCachedToken, googleLogout, auth } from '../services/googleDrive';
import { onAuthStateChanged, User } from 'firebase/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoogleSheetsModal: React.FC<Props> = ({ isOpen, onClose, onShowToast }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const databaseSheets: SheetData[] = React.useMemo(() => buildFullGameDatabase(), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      const cached = getCachedToken();
      if (cached) setToken(cached);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        onShowToast?.(`Успешный вход через Google: ${res.user.email}`, 'success');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка авторизации Google');
      onShowToast?.('Не удалось авторизоваться в Google', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStartExport = () => {
    setErrorMsg(null);
    setShowConfirmDialog(true);
  };

  const handleConfirmExport = async () => {
    setShowConfirmDialog(false);
    let activeToken = token || getCachedToken();

    if (!activeToken) {
      // Need login first
      setIsLoggingIn(true);
      try {
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setIsLoggingIn(false);
          return;
        }
        activeToken = loginRes.accessToken;
        setToken(activeToken);
        setUser(loginRes.user);
      } catch (e: any) {
        setIsLoggingIn(false);
        setErrorMsg('Требуется авторизация в Google для создания таблицы на Диске');
        return;
      }
      setIsLoggingIn(false);
    }

    if (!activeToken) {
      setErrorMsg('Не удалось получить токен доступа Google');
      return;
    }

    setIsExporting(true);
    setProgressPercent(5);
    setProgressText('Подготовка к созданию таблицы...');

    try {
      const result = await exportGameDatabaseToGoogleSheets(activeToken, (step, pct) => {
        setProgressText(step);
        setProgressPercent(pct);
      });

      if (result.success && result.spreadsheetUrl) {
        setCreatedUrl(result.spreadsheetUrl);
        setCreatedId(result.spreadsheetId || null);
        onShowToast?.('Google Таблица успешно создана!', 'success');
      } else {
        setErrorMsg(result.error || 'Ошибка выгрузки таблицы');
        onShowToast?.(result.error || 'Ошибка создания Google Таблицы', 'error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка при экспорте');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdUrl) return;
    navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    onShowToast?.('Ссылка на Google Таблицу скопирована', 'info');
    setTimeout(() => setCopied(false), 2500);
  };

  const currentSheet = databaseSheets[selectedSheetIndex] || databaseSheets[0];
  const totalRowsCount = databaseSheets.reduce((sum, s) => sum + s.rows.length, 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090d16] border border-emerald-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-sky-950/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                База Данных Игры (Google Таблицы)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v0.17 Референс
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                19 листов · {totalRowsCount} записей · Все механики, константы, формулы и реестры без исключений
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice: No player data, purely game architecture & economy */}
        <div className="px-4 sm:px-6 py-2.5 bg-sky-950/30 border-b border-sky-500/20 flex items-center justify-between text-xs text-sky-200">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Чистый референс:</strong> личные данные и прогресс игрока исключены. Выгружаются только системные
              таблицы, алгоритмы и математика игры.
            </span>
          </span>
          {user && (
            <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
              Вход: {user.email}
            </span>
          )}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Success banner if spreadsheet was created */}
          {createdUrl && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 shadow-lg shadow-emerald-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Google Таблица успешно создана!</h3>
                  <p className="text-xs text-emerald-200/80">
                    Книга сохранена в корень вашего Google Диска со всеми 19 разделами.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Скопировано' : 'Копировать ссылку'}
                </button>
                <a
                  href={createdUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Открыть Google Таблицу
                </a>
              </div>
            </motion.div>
          )}

          {/* Progress bar during export */}
          {isExporting && (
            <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-emerald-300 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progressText}
                </span>
                <span className="font-mono text-emerald-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-sky-400"
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-xs text-rose-300 hover:text-white underline cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          )}

          {/* Action Hero Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  Выгрузка всей архитектуры игры в Google Таблицы
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Создаст на вашем Google Диске электронную таблицу со всеми 19 вкладками: бизнес, машины, недвижимость,
                  шахта, серверы, формулы окупаемости, вероятности казино и инфраструктура.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isExporting || isLoggingIn}
                  onClick={handleStartExport}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                  )}
                  {createdUrl ? 'Выгрузить повторно' : 'Создать Google Таблицу'}
                </motion.button>
              </div>
            </div>

            {/* Offline Fallback Download Options */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Также доступно скачивание без авторизации:</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    downloadDatabaseAsCsv();
                    onShowToast?.('Полная база данных скачана в формате .CSV', 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Table className="w-3.5 h-3.5 text-emerald-400" />
                  Скачать всю базу (.CSV)
                </button>
                <button
                  onClick={() => {
                    downloadDatabaseAsJson();
                    onShowToast?.('Полный дамп базы скачан в формате .JSON', 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Database className="w-3.5 h-3.5 text-sky-400" />
                  Скачать дамп (.JSON)
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Sheet Selector & Live Data Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                Содержание выгружаемой базы (19 вкладок):
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Выбрано: <strong>{currentSheet.title}</strong> ({currentSheet.rows.length} строк)
              </span>
            </div>

            {/* Badges tab strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {databaseSheets.map((sheet, idx) => (
                <button
                  key={sheet.title}
                  onClick={() => setSelectedSheetIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    selectedSheetIndex === idx
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 hover:text-white border-white/5 hover:border-white/15'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-60">#{idx + 1}</span>
                  <span>{sheet.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-slate-300">
                    {sheet.rows.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Table Preview Container */}
            <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
              <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white">{currentSheet.title}</span>
                  {currentSheet.description && (
                    <span className="text-slate-400 ml-2 hidden sm:inline text-[11px]">
                      — {currentSheet.description}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => downloadDatabaseAsCsv(currentSheet.title)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  Скачать эту таблицу (.CSV)
                </button>
              </div>

              <div className="max-h-60 overflow-auto scrollbar-thin">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0b1726] border-b border-white/10 text-slate-300 font-semibold sticky top-0">
                      {currentSheet.headers.map((h, i) => (
                        <th key={i} className="p-2.5 px-3 whitespace-nowrap text-[11px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px] text-slate-300">
                    {currentSheet.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2.5 px-3 whitespace-nowrap max-w-xs truncate">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Совместимо с Google Таблицами, Excel, LibreOffice и базами SQL.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer font-medium"
          >
            Закрыть
          </button>
        </div>

        {/* Explicit Confirmation Dialog (Mandatory per Workspace Skill for File Creation) */}
        <AnimatePresence>
          {showConfirmDialog && (
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-6 rounded-3xl bg-[#0c121e] border border-emerald-500/40 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Создать Google Таблицу?</h3>
                    <p className="text-xs text-slate-400">Google Drive & Google Sheets API</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Приложение создаст новый документ{' '}
                  <strong className="text-white">«METROPOLIS — Полная База Данных Игры (v0.17 Референс)»</strong> с 19
                  листами на вашем Google Диске (в аккаунте {user?.email || 'Google'}).
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleConfirmExport}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    Подтвердить и создать
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
