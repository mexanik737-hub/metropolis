import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { CONFIG } from '../data/gameData';
import { calcTotalCapital, getMarketRates } from '../services/gameEngine';
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  Percent,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Lock,
  DollarSign,
  Scale,
  Clock,
  Sparkles,
  Coins,
} from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BankView: React.FC<Props> = ({ state, onUpdateState, onShowToast }) => {
  const notify = (text: string, isError = false) => {
    if (onShowToast) {
      onShowToast(text, isError ? 'error' : 'success');
    }
  };
  const setMsg = (val: { text: string; isError?: boolean } | null) => {
    if (val) {
      notify(val.text, !!val.isError);
    }
  };

  // Deposit
  const [depositAmount, setDepositAmount] = useState('');
  // Vault
  const [vaultCurrency, setVaultCurrency] = useState<'rub' | 'usd'>('rub');
  const [vaultRubAmount, setVaultRubAmount] = useState('');
  const [vaultUsdAmount, setVaultUsdAmount] = useState('');
  // Loan
  const [loanDesiredPct, setLoanDesiredPct] = useState(20);
  const [repayAmount, setRepayAmount] = useState('');
  // Offshore
  const [launderAmount, setLaunderAmount] = useState('');
  // FX Exchange
  const [fxCurrency, setFxCurrency] = useState<'usd' | 'btc'>('usd');
  const [fxUsdAmount, setFxUsdAmount] = useState('100');
  const [fxBtcAmount, setFxBtcAmount] = useState('0.1');

  const capital = calcTotalCapital(state);
  const maxLoanAvailable = Math.floor(capital * (loanDesiredPct / 100));
  const rates = getMarketRates(state.inventory.includes('license_zero_spread'));

  // Offshore fee discount for female
  const offshoreFee = state.gender === 'F' ? 0.10 : CONFIG.OFFSHORE_FEE_RATE;

  // 1. DEPOSIT HANDLERS
  const handleDepositAction = (isAdd: boolean) => {
    const amt = parseInt(depositAmount, 10);
    if (isNaN(amt) || amt <= 0) {
      setMsg({ text: 'Введите корректную сумму', isError: true });
      return;
    }

    if (isAdd) {
      if (amt < CONFIG.DEPOSIT_MIN_RUB && state.depositRub === 0) {
        setMsg({ text: `Минимальная сумма первого депозита: ${CONFIG.DEPOSIT_MIN_RUB.toLocaleString('ru-RU')} ₽`, isError: true });
        return;
      }
      if (amt > state.rub) {
        setMsg({ text: 'Недостаточно наличных рублей', isError: true });
        return;
      }
      if (state.depositRub + amt > CONFIG.DEPOSIT_MAX_RUB) {
        setMsg({ text: `Превышен лимит вклада (${CONFIG.DEPOSIT_MAX_RUB.toLocaleString('ru-RU')} ₽)!`, isError: true });
        return;
      }

      onUpdateState((prev) => ({
        ...prev,
        rub: prev.rub - amt,
        depositRub: prev.depositRub + amt,
      }));
      setMsg({ text: `Внесено на депозит: ${amt.toLocaleString('ru-RU')} ₽` });
    } else {
      if (amt > state.depositRub) {
        setMsg({ text: 'На депозите нет такой суммы', isError: true });
        return;
      }
      onUpdateState((prev) => ({
        ...prev,
        rub: prev.rub + amt,
        depositRub: prev.depositRub - amt,
      }));
      setMsg({ text: `Снято с депозита: ${amt.toLocaleString('ru-RU')} ₽` });
    }

    setDepositAmount('');
  };

  // 2. VAULT HANDLERS
  const handleVaultRub = (isAdd: boolean) => {
    const amt = parseInt(vaultRubAmount, 10);
    if (isNaN(amt) || amt <= 0) return;

    if (isAdd) {
      if (amt < 10_000_000 && state.vault.rub === 0) {
        setMsg({ text: 'Минимальный начальный взнос в Хранилище: 10 000 000 ₽', isError: true });
        return;
      }
      if (amt > state.rub) {
        setMsg({ text: 'Недостаточно наличных рублей', isError: true });
        return;
      }
      onUpdateState((prev) => ({
        ...prev,
        rub: prev.rub - amt,
        vault: { ...prev.vault, rub: prev.vault.rub + amt },
      }));
      setMsg({ text: `В хранилище размещено: ${amt.toLocaleString('ru-RU')} ₽` });
    } else {
      if (amt > state.vault.rub) {
        setMsg({ text: 'В хранилище недостаточно средств', isError: true });
        return;
      }
      onUpdateState((prev) => ({
        ...prev,
        rub: prev.rub + amt,
        vault: { ...prev.vault, rub: prev.vault.rub - amt },
      }));
      setMsg({ text: `Из хранилища выдано: ${amt.toLocaleString('ru-RU')} ₽` });
    }
    setVaultRubAmount('');
  };

  const handleVaultUsd = (isAdd: boolean) => {
    const amt = parseInt(vaultUsdAmount, 10);
    if (isNaN(amt) || amt <= 0) return;

    if (isAdd) {
      if (amt < 150_000 && state.vault.usd === 0) {
        setMsg({ text: 'Минимальный начальный взнос в Хранилище: 150 000 $', isError: true });
        return;
      }
      if (amt > state.usdOffshore) {
        setMsg({ text: 'Недостаточно долларов на Оффшорном счете', isError: true });
        return;
      }
      onUpdateState((prev) => ({
        ...prev,
        usdOffshore: prev.usdOffshore - amt,
        vault: { ...prev.vault, usd: prev.vault.usd + amt },
      }));
      setMsg({ text: `В долларовое хранилище внесено: ${amt.toLocaleString('ru-RU')} $` });
    } else {
      if (amt > state.vault.usd) {
        setMsg({ text: 'В хранилище недостаточно долларов', isError: true });
        return;
      }
      onUpdateState((prev) => ({
        ...prev,
        usdOffshore: prev.usdOffshore + amt,
        vault: { ...prev.vault, usd: prev.vault.usd - amt },
      }));
      setMsg({ text: `Из долларового хранилища выдано: ${amt.toLocaleString('ru-RU')} $` });
    }
    setVaultUsdAmount('');
  };

  // 3. LOAN HANDLERS
  const handleTakeLoan = () => {
    if (state.loan.active) {
      setMsg({ text: 'У вас уже есть активный кредит! Сначала погасите текущий долг.', isError: true });
      return;
    }
    if (maxLoanAvailable < 10000) {
      setMsg({ text: 'Недостаточный совокупный капитал для выдачи кредита', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub + maxLoanAvailable,
      loan: {
        active: true,
        principal: maxLoanAvailable,
        accruedInterest: 0,
        lastAccrualTime: Date.now(),
        borrowedAt: Date.now(),
        bankruptcyPending: false,
        bankruptcyExpiresAt: 0,
      },
    }));

    setMsg({ text: `Вам выдан банковский кредит: ${maxLoanAvailable.toLocaleString('ru-RU')} ₽!` });
  };

  const handleRepayLoan = () => {
    const amt = parseInt(repayAmount, 10);
    if (isNaN(amt) || amt <= 0) return;

    const totalDebt = state.loan.principal + state.loan.accruedInterest;
    if (amt > state.rub) {
      setMsg({ text: 'Недостаточно наличных рублей', isError: true });
      return;
    }

    const payAmt = Math.min(amt, totalDebt);
    const willBeFullyPaid = amt >= totalDebt;

    onUpdateState((prev) => {
      let remInterest = prev.loan.accruedInterest;
      let remPrincipal = prev.loan.principal;

      let toPay = payAmt;
      if (toPay <= remInterest) {
        remInterest -= toPay;
      } else {
        toPay -= remInterest;
        remInterest = 0;
        remPrincipal = Math.max(0, remPrincipal - toPay);
      }

      const isFullyPaid = willBeFullyPaid || (remPrincipal === 0 && remInterest === 0);

      return {
        ...prev,
        rub: prev.rub - payAmt,
        loan: {
          ...prev.loan,
          active: !isFullyPaid,
          principal: isFullyPaid ? 0 : remPrincipal,
          accruedInterest: isFullyPaid ? 0 : remInterest,
          bankruptcyPending: isFullyPaid ? false : prev.loan.bankruptcyPending,
          bankruptcyExpiresAt: isFullyPaid ? 0 : prev.loan.bankruptcyExpiresAt,
        },
      };
    });

    setMsg({
      text: willBeFullyPaid
        ? `🎉 Кредит полностью закрыт! Погашено ${payAmt.toLocaleString('ru-RU')} ₽.`
        : `Погашено ${payAmt.toLocaleString('ru-RU')} ₽ задолженности.`,
    });
    setRepayAmount('');
  };

  const handleStartBankruptcy = () => {
    if (!state.loan.active) {
      setMsg({ text: 'Процедура банкротства доступна только при наличии активного кредита!', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      loan: {
        ...prev.loan,
        bankruptcyPending: true,
        bankruptcyExpiresAt: Date.now() + CONFIG.BANKRUPTCY_WAIT_SEC * 1000,
      },
    }));

    setMsg({
      text: '⚠️ Запущена судебная процедура банкротства (5 минут). Вы можете отменить её до завершения таймера!',
      isError: true,
    });
  };

  // 4. OFFSHORE HANDLERS
  const handleLaunder = () => {
    const amt = parseInt(launderAmount, 10);
    if (isNaN(amt) || amt < 2) {
      setMsg({ text: 'Минимальная сумма перевода: 2 $', isError: true });
      return;
    }
    if (amt > state.usdCash) {
      setMsg({ text: 'Недостаточно наличных долларов', isError: true });
      return;
    }

    const clean = Math.floor(amt * (1 - offshoreFee));
    onUpdateState((prev) => ({
      ...prev,
      usdCash: prev.usdCash - amt,
      usdOffshore: prev.usdOffshore + clean,
    }));

    setMsg({
      text: `Легализовано ${amt} $ ➔ На Оффшорный счет зачислено ${clean} $ (комиссия ${Math.round(offshoreFee * 100)}%)`,
    });
    setLaunderAmount('');
  };

  // 5. FX HANDLERS
  const parsedUsd = Math.max(0, parseInt(fxUsdAmount, 10) || 0);
  const usdBuyCost = Math.ceil(parsedUsd * rates.usdBuy);
  const usdSellReturn = Math.floor(parsedUsd * rates.usdSell);

  const parsedBtc = Math.max(0, parseFloat(fxBtcAmount) || 0);
  const btcBuyCost = Math.ceil(parsedBtc * rates.btcBuy);
  const btcSellReturn = Math.floor(parsedBtc * rates.btcSell);

  const handleBuyUsd = () => {
    if (parsedUsd <= 0) return;
    if (state.rub < usdBuyCost) {
      setMsg({ text: `Недостаточно рублей (требуется ${usdBuyCost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - usdBuyCost,
      usdOffshore: prev.usdOffshore + parsedUsd,
    }));
    setMsg({ text: `Куплено ${parsedUsd} $ за ${usdBuyCost.toLocaleString('ru-RU')} ₽` });
  };

  const handleSellUsd = () => {
    if (parsedUsd <= 0) return;
    if (state.usdOffshore < parsedUsd) {
      setMsg({ text: 'Недостаточно долларов на Оффшорном счете (сначала легализуйте нал)', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub + usdSellReturn,
      usdOffshore: prev.usdOffshore - parsedUsd,
    }));
    setMsg({ text: `Продано ${parsedUsd} $ за ${usdSellReturn.toLocaleString('ru-RU')} ₽` });
  };

  const handleBuyBtc = () => {
    if (parsedBtc <= 0) return;
    if (state.rub < btcBuyCost) {
      setMsg({ text: `Недостаточно рублей (требуется ${btcBuyCost.toLocaleString('ru-RU')} ₽)`, isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - btcBuyCost,
      btc: prev.btc + parsedBtc,
    }));
    setMsg({ text: `Куплено ${parsedBtc} ₿ за ${btcBuyCost.toLocaleString('ru-RU')} ₽` });
  };

  const handleSellBtc = () => {
    if (parsedBtc <= 0) return;
    if (state.btc < parsedBtc) {
      setMsg({ text: 'Недостаточно биткоинов на балансе', isError: true });
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub + btcSellReturn,
      btc: prev.btc - parsedBtc,
    }));
    setMsg({ text: `Продано ${parsedBtc} ₿ за ${btcSellReturn.toLocaleString('ru-RU')} ₽` });
  };

  const totalDebt = state.loan.principal + state.loan.accruedInterest;

  return (
    <div className="space-y-6">
      {/* Grid: Deposit & Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deposit Card */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Банковский депозит</h3>
                  <span className="text-[11px] text-slate-400">Начисление процентов 24/7 (онлайн и офлайн)</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                +{state.activeFaction === 'f_fin' ? '1.00%' : '0.75%'} / сутки
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 mb-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Баланс на депозите:</span>
                <span className="font-mono text-slate-300">Лимит: {(CONFIG.DEPOSIT_MAX_RUB / 1_000_000).toFixed(0)} млн ₽</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {state.depositRub.toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Сумма в рублях..."
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                />
              </div>

              {/* Quick Percentage / Amount Buttons */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const remainingCap = Math.max(0, CONFIG.DEPOSIT_MAX_RUB - state.depositRub);
                    const quarter = Math.floor(Math.min(state.rub * 0.25, remainingCap));
                    if (quarter > 0) setDepositAmount(quarter.toString());
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const remainingCap = Math.max(0, CONFIG.DEPOSIT_MAX_RUB - state.depositRub);
                    const half = Math.floor(Math.min(state.rub * 0.5, remainingCap));
                    if (half > 0) setDepositAmount(half.toString());
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const remainingCap = Math.max(0, CONFIG.DEPOSIT_MAX_RUB - state.depositRub);
                    const maxAdd = Math.floor(Math.min(state.rub, remainingCap));
                    if (maxAdd > 0) setDepositAmount(maxAdd.toString());
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono font-bold transition-colors cursor-pointer"
                >
                  МАКС Нал
                </button>
                {state.depositRub > 0 && (
                  <button
                    type="button"
                    onClick={() => setDepositAmount(state.depositRub.toString())}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold transition-colors cursor-pointer ml-auto"
                  >
                    ВЕСЬ Вклад
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDepositAction(true)}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Внести
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDepositAction(false)}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors border border-white/10 cursor-pointer"
            >
              Снять
            </motion.button>
          </div>
        </motion.div>

        {/* Safe Vault Card */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Банковское хранилище</h3>
                  <span className="text-[11px] text-slate-400">Полная защита от карманников (₽ и $)</span>
                </div>
              </div>
              <span className="text-xs font-mono text-rose-400 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                -0.2% / день
              </span>
            </div>

            {/* Currency Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5 mb-3">
              <button
                type="button"
                onClick={() => setVaultCurrency('rub')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vaultCurrency === 'rub'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Рублевый сейф (₽)
              </button>
              <button
                type="button"
                onClick={() => setVaultCurrency('usd')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  vaultCurrency === 'usd'
                    ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Долларовый сейф ($)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3">
              <div className={`p-3 rounded-xl border transition-colors ${vaultCurrency === 'rub' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                <span className="text-xs text-slate-400 block">В хранилище (₽):</span>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {state.vault.rub.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className={`p-3 rounded-xl border transition-colors ${vaultCurrency === 'usd' ? 'bg-lime-500/10 border-lime-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                <span className="text-xs text-slate-400 block">В хранилище ($):</span>
                <div className="text-base font-bold font-mono text-lime-400 mt-0.5">
                  {state.vault.usd.toLocaleString('ru-RU')} $
                </div>
              </div>
            </div>

            {vaultCurrency === 'rub' ? (
              <div className="space-y-2 mb-3">
                <input
                  type="number"
                  placeholder="Сумма в рублях (мин. 10M)..."
                  value={vaultRubAmount}
                  onChange={(e) => setVaultRubAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                />
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setVaultRubAmount(Math.floor(state.rub * 0.5).toString())}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                  >
                    50% Нал
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultRubAmount(state.rub.toString())}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold transition-colors cursor-pointer"
                  >
                    МАКС Нал
                  </button>
                  {state.vault.rub > 0 && (
                    <button
                      type="button"
                      onClick={() => setVaultRubAmount(state.vault.rub.toString())}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer ml-auto"
                    >
                      ВЕСЬ Сейф
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <input
                  type="number"
                  placeholder="Сумма в $ с оффшора (мин. 150k)..."
                  value={vaultUsdAmount}
                  onChange={(e) => setVaultUsdAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                />
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setVaultUsdAmount(Math.floor(state.usdOffshore * 0.5).toString())}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                  >
                    50% Оффшор
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultUsdAmount(state.usdOffshore.toString())}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-lime-500/20 text-lime-300 border border-lime-500/30 font-mono font-bold transition-colors cursor-pointer"
                  >
                    МАКС Оффшор
                  </button>
                  {state.vault.usd > 0 && (
                    <button
                      type="button"
                      onClick={() => setVaultUsdAmount(state.vault.usd.toString())}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer ml-auto"
                    >
                      ВЕСЬ Сейф
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            {vaultCurrency === 'rub' ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVaultRub(true)}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-amber-600/20"
                >
                  Внести рубли
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVaultRub(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors border border-white/10 cursor-pointer"
                >
                  Снять рубли
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVaultUsd(true)}
                  className="flex-1 py-2.5 rounded-xl bg-lime-600 hover:bg-lime-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-lime-600/20"
                >
                  Внести $
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVaultUsd(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors border border-white/10 cursor-pointer"
                >
                  Снять $
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Credit Section */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="glass-panel rounded-2xl p-5 border-amber-500/20"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Кредитование и Банкротство</h3>
              <span className="text-[11px] text-slate-400">Заем под залог совокупного капитала бизнеса и активов</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-rose-400 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
            3.5% / 12ч
          </span>
        </div>

        {state.loan.active ? (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-rose-300 block">Текущий совокупный долг:</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {totalDebt.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">
                  Тело займа: {state.loan.principal.toLocaleString('ru-RU')} ₽ · Проценты: {state.loan.accruedInterest.toLocaleString('ru-RU')} ₽
                </div>
              </div>

              {state.loan.bankruptcyPending && (
                <div className="px-3 py-1.5 rounded-xl bg-rose-600/30 border border-rose-500/50 text-rose-200 text-xs font-bold animate-pulse text-center">
                  Банкротство: {Math.max(0, Math.ceil((state.loan.bankruptcyExpiresAt - Date.now()) / 1000))} с.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  placeholder="Сумма к погашению..."
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl glass-input text-sm font-mono"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRepayLoan}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Погасить
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartBankruptcy}
                  disabled={state.loan.bankruptcyPending}
                  className="px-5 py-2.5 rounded-xl bg-rose-950 border border-rose-500/30 hover:bg-rose-900 text-rose-300 font-bold text-xs transition-colors shrink-0 cursor-pointer"
                >
                  {state.loan.bankruptcyPending ? 'В процессе...' : 'Банкротство (1 раз)'}
                </motion.button>
              </div>

              {/* Quick Repay buttons */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRepayAmount(Math.ceil(totalDebt * 0.25).toString())}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  25% долга
                </button>
                <button
                  type="button"
                  onClick={() => setRepayAmount(Math.ceil(totalDebt * 0.5).toString())}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  50% долга
                </button>
                <button
                  type="button"
                  onClick={() => setRepayAmount(totalDebt.toString())}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold transition-colors cursor-pointer"
                >
                  ВЕСЬ ДОЛГ ({totalDebt.toLocaleString('ru-RU')} ₽)
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-300">Доля займа от капитала:</span>
              <div className="flex gap-1.5 flex-wrap">
                {[10, 15, 20, 25, 30].map((pct) => (
                  <motion.button
                    key={pct}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLoanDesiredPct(pct)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      loanDesiredPct === pct
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {pct}%
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-xs text-slate-400 block">Доступный лимит займа:</span>
                <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                  {maxLoanAvailable.toLocaleString('ru-RU')} ₽
                </div>
              </div>

              <motion.button
                whileHover={maxLoanAvailable >= 10000 ? { scale: 1.03 } : {}}
                whileTap={maxLoanAvailable >= 10000 ? { scale: 0.97 } : {}}
                onClick={handleTakeLoan}
                disabled={maxLoanAvailable < 10000}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-amber-600/20"
              >
                Получить кредит
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Offshore & Currency Exchange */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Offshore Gateway */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Оффшорный шлюз</h3>
                  <span className="text-[11px] text-slate-400">Легализация нелегальных долларов на оффшорный счет</span>
                </div>
              </div>
              <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                Комиссия: {Math.round(offshoreFee * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-3">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Нелегальные наличные:</span>
                <span className="font-mono font-bold text-lime-400 text-base">{state.usdCash.toLocaleString('ru-RU')} $</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs text-slate-400 block">Оффшорный счет:</span>
                <span className="font-mono font-bold text-cyan-400 text-base">{state.usdOffshore.toLocaleString('ru-RU')} $</span>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <input
                type="number"
                placeholder="Сумма к легализации в $..."
                value={launderAmount}
                onChange={(e) => setLaunderAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
              />

              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setLaunderAmount(Math.floor(state.usdCash * 0.25).toString())}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setLaunderAmount(Math.floor(state.usdCash * 0.5).toString())}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setLaunderAmount(Math.floor(state.usdCash * 0.75).toString())}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setLaunderAmount(state.usdCash.toString())}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold transition-colors cursor-pointer"
                >
                  МАКС Нал
                </button>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLaunder}
            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-cyan-600/20 mt-2"
          >
            Легализовать на Оффшор (-{Math.round(offshoreFee * 100)}%)
          </motion.button>
        </motion.div>

        {/* Currency Exchange (Dual Currency: USD & BTC) */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel rounded-2xl p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Биржа валют</h3>
                  <span className="text-[11px] text-slate-400">Прямой обмен рублей на USD и Биткоин</span>
                </div>
              </div>
              {rates.isZeroSpread && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Спред 0%
                </span>
              )}
            </div>

            {/* Currency Tab Selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/5 mb-3">
              <button
                type="button"
                onClick={() => setFxCurrency('usd')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  fxCurrency === 'usd'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Доллары ($)</span>
              </button>
              <button
                type="button"
                onClick={() => setFxCurrency('btc')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  fxCurrency === 'btc'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Биткоин (₿)</span>
              </button>
            </div>

            {/* Rates Table */}
            {fxCurrency === 'usd' ? (
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Покупка USD (Банк продает)</span>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{rates.usdBuy} ₽</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Продажа USD (Банк покупает)</span>
                  <div className="text-sm font-bold text-sky-400 mt-0.5">{rates.usdSell} ₽</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Покупка ₿ (Банк продает)</span>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{rates.btcBuy.toLocaleString('ru-RU')} ₽</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Продажа ₿ (Банк покупает)</span>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">{rates.btcSell.toLocaleString('ru-RU')} ₽</div>
                </div>
              </div>
            )}

            {/* Currency Specific Controls */}
            {fxCurrency === 'usd' ? (
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Объем ($):</span>
                  <span>На оффшоре: {state.usdOffshore.toLocaleString('ru-RU')} $</span>
                </div>
                <input
                  type="number"
                  placeholder="Сумма в $..."
                  value={fxUsdAmount}
                  onChange={(e) => setFxUsdAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                />

                <div className="flex gap-1.5 flex-wrap">
                  {[100, 500, 1000, 5000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFxUsdAmount(v.toString())}
                      className="text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                    >
                      +{v}$
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const maxBuy = Math.floor(state.rub / rates.usdBuy);
                      if (maxBuy > 0) setFxUsdAmount(maxBuy.toString());
                    }}
                    className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold transition-colors cursor-pointer"
                  >
                    МАКС Купить
                  </button>
                  {state.usdOffshore > 0 && (
                    <button
                      type="button"
                      onClick={() => setFxUsdAmount(state.usdOffshore.toString())}
                      className="text-[11px] px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono font-bold transition-colors cursor-pointer ml-auto"
                    >
                      МАКС Продать
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                  <span>К списанию: <b className="text-white">{usdBuyCost.toLocaleString('ru-RU')} ₽</b></span>
                  <span>К получению: <b className="text-emerald-400">{usdSellReturn.toLocaleString('ru-RU')} ₽</b></span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Объем (₿):</span>
                  <span>В кошельке: {state.btc.toFixed(4)} ₿</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Сумма в ₿..."
                  value={fxBtcAmount}
                  onChange={(e) => setFxBtcAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-sm font-mono"
                />

                <div className="flex gap-1.5 flex-wrap">
                  {[0.01, 0.05, 0.1, 0.5, 1.0].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFxBtcAmount(v.toString())}
                      className="text-[11px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-mono transition-colors cursor-pointer"
                    >
                      {v} ₿
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const maxBtc = +(state.rub / rates.btcBuy).toFixed(4);
                      if (maxBtc > 0) setFxBtcAmount(maxBtc.toString());
                    }}
                    className="text-[11px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold transition-colors cursor-pointer"
                  >
                    МАКС Купить
                  </button>
                  {state.btc > 0 && (
                    <button
                      type="button"
                      onClick={() => setFxBtcAmount(state.btc.toFixed(4))}
                      className="text-[11px] px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold transition-colors cursor-pointer ml-auto"
                    >
                      МАКС Продать
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                  <span>К списанию: <b className="text-white">{btcBuyCost.toLocaleString('ru-RU')} ₽</b></span>
                  <span>К получению: <b className="text-amber-400">{btcSellReturn.toLocaleString('ru-RU')} ₽</b></span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            {fxCurrency === 'usd' ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBuyUsd}
                  disabled={parsedUsd <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Купить {parsedUsd} $
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSellUsd}
                  disabled={parsedUsd <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors border border-white/10 cursor-pointer"
                >
                  Продать {parsedUsd} $
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBuyBtc}
                  disabled={parsedBtc <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  Купить {parsedBtc} ₿
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSellBtc}
                  disabled={parsedBtc <= 0}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors border border-white/10 cursor-pointer shadow-md shadow-amber-600/20"
                >
                  Продать {parsedBtc} ₿
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
