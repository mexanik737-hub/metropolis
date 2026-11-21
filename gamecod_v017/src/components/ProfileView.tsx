import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { calcTotalCapital, getPrestigeInfo, getActiveBuffs } from '../services/gameEngine';
import { ESTATES } from '../data/gameData';
import {
  Shield,
  CreditCard,
  Lock,
  Coffee,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Phone,
  Flame,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Award,
  Zap,
} from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onSyncDrive: () => void;
  isDriveSyncing: boolean;
  driveUserEmail?: string | null;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ProfileView: React.FC<Props> = ({
  state,
  onUpdateState,
  onSyncDrive,
  isDriveSyncing,
  driveUserEmail,
  onShowToast,
}) => {
  const [safeModalOpen, setSafeModalOpen] = useState(false);
  const [safeMode, setSafeMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [safeAmount, setSafeAmount] = useState('');
  const [nickModalOpen, setNickModalOpen] = useState(false);
  const [newNick, setNewNick] = useState(state.username);

  const notify = (text: string, isError = false) => {
    onShowToast?.(text, isError ? 'error' : 'success');
  };

  const capital = calcTotalCapital(state);
  const prestige = getPrestigeInfo(capital);
  const est = ESTATES.find((e) => e.id === state.estateId) || ESTATES[0];
  const activeBuffs = getActiveBuffs(state);

  const handleCoffee = () => {
    if (!est.coffee) {
      notify('Кофемашина доступна с жилья №3 («Студия на окраине»)!', true);
      return;
    }
    const now = Date.now();
    if (now - state.lastCoffeeAt < 86400000) {
      const remainHours = Math.ceil((86400000 - (now - state.lastCoffeeAt)) / 3600000);
      notify(`Кофе уже выпит. До следующей чашки: ${remainHours} ч.`, true);
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      lastCoffeeAt: now,
      energy: Math.min(100, prev.energy + est.coffeeRestore),
    }));
    notify(`☕ Вы выпили домашний кофе: +${est.coffeeRestore} ⚡ энергии!`);
  };

  const handleSafeAction = () => {
    const amt = parseInt(safeAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      notify('Введите корректную сумму', true);
      return;
    }

    if (safeMode === 'deposit') {
      if (amt > state.rub) {
        notify('Недостаточно наличных рублей', true);
        return;
      }
      if (state.homeSafeRub + amt > est.safe) {
        notify(`Лимит сейфа (${est.safe.toLocaleString('ru-RU')} ₽) превышен!`, true);
        return;
      }
      onUpdateState((prev) => ({
        ...prev,
        rub: prev.rub - amt,
        homeSafeRub: prev.homeSafeRub + amt,
      }));
      notify(`В сейф внесено ${amt.toLocaleString('ru-RU')} ₽`);
    } else {
      if (amt > state.homeSafeRub) {
        notify('В сейфе нет такой суммы', true);
        return;
      }
      onUpdateState((prev) => ({
        ...prev,
        rub: prev.rub + amt,
        homeSafeRub: prev.homeSafeRub - amt,
      }));
      notify(`Из сейфа получено ${amt.toLocaleString('ru-RU')} ₽`);
    }

    setSafeModalOpen(false);
    setSafeAmount('');
  };

  const handleNickChange = () => {
    const cleaned = newNick.trim();
    if (cleaned.length < 3 || cleaned.length > 14) {
      notify('Никнейм должен быть от 3 до 14 символов', true);
      return;
    }
    const regex = /^[a-zA-Zа-яА-ЯёЁ0-9_\s-]+$/;
    if (!regex.test(cleaned)) {
      notify('Допустимы только русские, английские буквы и цифры', true);
      return;
    }

    // Первое изменение бесплатно, далее 50 €
    const isFree = state.username === 'Гражданин';
    if (!isFree && state.eur < 50) {
      notify('Для повторной смены никнейма требуется 50 €', true);
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      username: cleaned,
      eur: isFree ? prev.eur : prev.eur - 50,
    }));

    setNickModalOpen(false);
    notify(`Никнейм успешно изменен на «${cleaned}»!`);
  };

  return (
    <div className="space-y-6">

      {/* Grid: Passport & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Passport Card */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400"
                >
                  <FileText className="w-5 h-5" />
                </motion.div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">Паспорт Гражданина</h2>
                  <span className="text-[11px] text-slate-400">Официальный реестр Метрополиса</span>
                </div>
              </div>
              <span className="font-mono text-xs text-sky-300 font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 tracking-wider">
                {state.passportSerial}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Имя гражданина</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-white truncate text-base">{state.username}</span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setNewNick(state.username);
                      setNickModalOpen(true);
                    }}
                    className="p-1 rounded-md text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors cursor-pointer"
                    title="Сменить никнейм"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Идентификатор ID</span>
                <div className="font-mono font-bold text-amber-400 text-base mt-1">#{state.id}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Пол гражданина</span>
                <div className="font-medium text-slate-200 mt-1 text-xs">
                  {state.gender === 'M' ? 'Мужской (⚡ Реген)' : 'Женский (💎 Оффшор -5%)'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Номер телефона</span>
                <div className="font-mono text-slate-200 mt-1 text-xs">
                  {state.phone || (
                    <span className="text-slate-500 italic">Не оформлен в ТРЦ</span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Карма и статус</span>
                <div
                  className={`font-semibold mt-1 ${
                    state.karma >= 1000
                      ? 'text-emerald-400'
                      : state.karma >= 0
                      ? 'text-sky-400'
                      : 'text-rose-400'
                  }`}
                >
                  {state.karma >= 0 ? `+${state.karma}` : state.karma}
                  <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                    {state.karma >= 1000
                      ? '(Налог 6%)'
                      : state.karma >= 500
                      ? '(Налог 13%)'
                      : state.karma <= -500
                      ? '(Нелегал)'
                      : '(Нейтрал)'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Предупреждения (Варны)</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((w) => (
                      <motion.div
                        key={w}
                        whileHover={{ scale: 1.2 }}
                        className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                          state.warns >= w ? 'bg-rose-600 text-white' : 'bg-white/10 text-slate-500'
                        }`}
                      >
                        {w}
                      </motion.div>
                    ))}
                  </div>
                  <span className="text-[11px] text-slate-400">{state.warns}/3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prestige Status Strip */}
          <div className="mt-5 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[11px] text-slate-400">Ранг Престижа</div>
                <div className="text-sm font-bold text-amber-400">
                  {prestige.rank} · {prestige.title}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Совокупный капитал</div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                {capital.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          </div>
        </motion.div>

        {/* Real Estate & Safe Card */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <motion.div
                  whileHover={{ rotate: -10, scale: 1.1 }}
                  className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
                >
                  <Lock className="w-5 h-5" />
                </motion.div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Жилье и Домашний Сейф
                  </h2>
                  <span className="text-[11px] text-slate-400">Защита от уличных карманников</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {est.name}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-xs text-slate-400 block">Баланс в домашнем сейфе</span>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                    {state.homeSafeRub.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Вместимость сейфа (10%)</span>
                  <div className="text-sm font-mono text-slate-300 mt-0.5">
                    {est.safe.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block">Бонус к регенерации:</span>
                  <div className="font-semibold text-white mt-1">
                    +{est.sleepBonus}% ({Math.round(120 / (1 + est.sleepBonus / 100))}с за +1⚡)
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block">Домашний кофе:</span>
                  <div className="font-semibold text-amber-300 mt-1">
                    {est.coffee ? `+${est.coffeeRestore}⚡ раз в сутки` : 'Недоступен'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (est.safe <= 0) {
                  notify('В хостеле нет сейфа. Купите жилье в разделе Дилеры!', true);
                  return;
                }
                setSafeMode('deposit');
                setSafeModalOpen(true);
              }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Пополнить сейф</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (state.homeSafeRub <= 0) {
                  notify('В сейфе нет средств для снятия', true);
                  return;
                }
                setSafeMode('withdraw');
                setSafeModalOpen(true);
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Забрать из сейфа</span>
            </motion.button>

            <motion.button
              whileHover={est.coffee ? { scale: 1.08, rotate: 12 } : {}}
              whileTap={est.coffee ? { scale: 0.92 } : {}}
              onClick={handleCoffee}
              disabled={!est.coffee}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors ${
                est.coffee
                  ? 'bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30 cursor-pointer'
                  : 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed'
              }`}
              title="Выпить домашний кофе"
            >
              <Coffee className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Active System Buffs & Modifiers */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-6"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4 mb-4">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Действующие Системные Модификаторы и Баффы ({activeBuffs.length})
            </h2>
            <span className="text-[11px] text-slate-400">Активные эффекты на экономику и действия</span>
          </div>
        </div>

        {activeBuffs.length === 0 ? (
          <p className="text-xs text-slate-500">У вас пока нет активных модификаторов.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeBuffs.map((buff) => (
              <motion.div
                key={buff.id}
                whileHover={{ scale: 1.02 }}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 flex items-start gap-3 transition-colors"
              >
                <div className="text-xl shrink-0 p-1.5 rounded-lg bg-white/5">{buff.icon}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">{buff.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({buff.source})</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{buff.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Google Drive Personal Backup & Sync Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-sky-500/20"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400"
            >
              <Cloud className="w-5 h-5" />
            </motion.div>
            <div>
              <h3 className="text-sm font-bold text-white">Персональное Облако Google Диск</h3>
              <span className="text-[11px] text-slate-400">Автономное шифрование сохранений</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-xl leading-relaxed">
            Сохранение зашифрованного бэкапа и выгрузка официального Личного Дела Гражданина в вашу
            личную папку <span className="font-mono text-sky-300 font-semibold">game/</span> на Google Диске.
            Файлы защищены HMAC-SHA256 и доступны только вам.
          </p>
          {driveUserEmail && (
            <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Авторизован: {driveUserEmail}</span>
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSyncDrive}
          disabled={isDriveSyncing}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 shrink-0 cursor-pointer"
        >
          <Cloud className="w-4 h-4" />
          <span>{isDriveSyncing ? 'Синхронизация...' : driveUserEmail ? 'Синхронизировать сейчас' : 'Подключить Google Диск'}</span>
        </motion.button>
      </motion.div>

      {/* Safe Modal */}
      <AnimatePresence>
        {safeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-white/20"
            >
              <h3 className="text-base font-bold text-white">
                {safeMode === 'deposit' ? 'Внести в домашний сейф' : 'Забрать из сейфа'}
              </h3>

              <p className="text-xs text-slate-400">
                {safeMode === 'deposit'
                  ? `Доступно в сейфе места: ${(est.safe - state.homeSafeRub).toLocaleString('ru-RU')} ₽`
                  : `В сейфе лежит: ${state.homeSafeRub.toLocaleString('ru-RU')} ₽`}
              </p>

              <input
                type="number"
                placeholder="Сумма в рублях..."
                value={safeAmount}
                onChange={(e) => setSafeAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                autoFocus
              />

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setSafeAmount(
                      String(
                        safeMode === 'deposit'
                          ? Math.min(state.rub, est.safe - state.homeSafeRub)
                          : state.homeSafeRub
                      )
                    )
                  }
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 cursor-pointer transition-colors"
                >
                  Вся сумма
                </motion.button>
              </div>

              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSafeAction}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Подтвердить
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSafeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Nickname Modal */}
      <AnimatePresence>
        {nickModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="glass-panel rounded-2xl p-6 max-w-sm w-full space-y-4 border border-white/20"
            >
              <h3 className="text-base font-bold text-white">Смена имени гражданина</h3>
              <p className="text-xs text-slate-400">
                {state.username === 'Гражданин'
                  ? 'Первая регистрация никнейма бесплатна.'
                  : 'Повторная смена паспорта стоит 50 €.'}
              </p>

              <input
                type="text"
                maxLength={14}
                placeholder="Новое имя (3-14 символов)..."
                value={newNick}
                onChange={(e) => setNewNick(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                autoFocus
              />

              <div className="flex gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNickChange}
                  className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Сохранить
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setNickModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
