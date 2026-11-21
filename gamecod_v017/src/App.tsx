/**
 * METROPOLIS v0.16 — Главный компонент приложения
 * Ролевая игра, симулятор жизни и экономическая экосистема
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActiveTab, GameState, DistrictId } from './types/game';
import {
  loadStateFromStorage,
  saveStateToStorage,
  simulateSecond,
  processOfflineProgress,
  checkStreetTheft,
  calcTotalCapital,
} from './services/gameEngine';
import {
  initAuth,
  googleSignIn,
  saveGameToGoogleDrive,
  getCachedToken,
} from './services/googleDrive';
import { HeaderHUD } from './components/HeaderHUD';
import { NavigationBar } from './components/NavigationBar';
import { MegacityMap } from './components/MegacityMap';
import { ProfileView } from './components/ProfileView';
import { CareerView } from './components/CareerView';
import { BankView } from './components/BankView';
import { MallView } from './components/MallView';
import { GovView } from './components/GovView';
import { EducationView } from './components/EducationView';
import { GarageView } from './components/GarageView';
import { DealersView } from './components/DealersView';
import { InvestView } from './components/InvestView';
import { MegacityView } from './components/MegacityView';
import { FaqView } from './components/FaqView';
import { AdminConsoleModal } from './components/AdminConsoleModal';
import { CriticalAlertModal, CriticalAlertData } from './components/CriticalAlertModal';
import { ToastNotifications, ToastItem } from './components/ToastNotifications';
import { BanOverlay } from './components/BanOverlay';
import { OnboardingModal } from './components/OnboardingModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { CONFIG } from './data/gameData';
import { X, Landmark, Factory, ShoppingBag, Car, Building2, GraduationCap } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const raw = loadStateFromStorage();
    return processOfflineProgress(raw);
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('city');
  const [activeDistrictModal, setActiveDistrictModal] = useState<DistrictId | null>(null);
  const [garageSubTab, setGarageSubTab] = useState<'garage' | 'dealers'>('garage');
  const [bankSubTab, setBankSubTab] = useState<'bank' | 'invest'>('bank');

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);

  // Google Drive Auth & Sync
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);

  // Critical Modal Alerts (Centered, z-[100])
  const [criticalAlert, setCriticalAlert] = useState<CriticalAlertData | null>(null);

  // Bottom-Right Toast Notifications (z-[90])
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // State ref for ticker to prevent stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Helper to add toast
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Initialize Auth on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, _token) => {
        setDriveUserEmail(user.email);
        if (user.email && user.email.toLowerCase() === CONFIG.CREATOR_EMAIL.toLowerCase()) {
          setIsAdminAuthenticated(true);
        }
      },
      () => {
        setDriveUserEmail(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 2. Main 1-Second Simulation Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const next = simulateSecond(prev);
        saveStateToStorage(next);

        // Check for bankruptcy alert trigger
        if (next.loan.active && next.loan.bankruptcyPending && !prev.loan.bankruptcyPending) {
          setCriticalAlert({
            id: 'bankruptcy_' + Date.now(),
            type: 'bankruptcy',
            title: 'Кредитный дефолт и банкротство!',
            description:
              'Срок обязательств по кредиту истек. Запущен 5-минутный регламент банкротства. При списании долга будет изъято 50% активов.',
            details: [
              { label: 'Текущий долг с процентами', value: `${(next.loan.principal + next.loan.accruedInterest).toLocaleString('ru-RU')} ₽`, isNegative: true },
            ],
            actionLabel: 'Перейти в банк',
            onAction: () => setActiveDistrictModal('center'),
          });
        }

        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Tab Switching with Street Theft Check
  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === 'admin') {
      setAdminModalOpen(true);
      return;
    }

    // Street theft check (5% chance when navigating)
    const theftResult = checkStreetTheft(stateRef.current);
    if (theftResult.occurred) {
      setState(theftResult.newState);
      setCriticalAlert({
        id: 'theft_' + Date.now(),
        type: 'theft',
        title: 'Уличная кража в Метрополисе!',
        description:
          'При перемещении по улицам города карманники совершили нападение и похитили незащищенную наличную валюту.',
        details: [
          {
            label: 'Похищено рублей',
            value: `-${theftResult.stolenRub.toLocaleString('ru-RU')} ₽`,
            isNegative: true,
          },
          ...(theftResult.stolenUsd > 0
            ? [
                {
                  label: 'Похищено долларов',
                  value: `-${theftResult.stolenUsd.toLocaleString('ru-RU')} $`,
                  isNegative: true,
                },
              ]
            : []),
        ],
        actionLabel: 'Хранить деньги в сейфе',
        onAction: () => {
          setActiveTab('profile');
        },
      });
    }

    setActiveDistrictModal(null);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 4. Google Drive Sync Trigger
  const handleSyncDrive = async () => {
    try {
      setIsDriveSyncing(true);
      let token = getCachedToken();

      if (!token) {
        const loginRes = await googleSignIn();
        if (!loginRes) {
          setIsDriveSyncing(false);
          return;
        }
        token = loginRes.accessToken;
        setDriveUserEmail(loginRes.user.email);
        if (loginRes.user.email?.toLowerCase() === CONFIG.CREATOR_EMAIL.toLowerCase()) {
          setIsAdminAuthenticated(true);
        }
      }

      if (!token) {
        setIsDriveSyncing(false);
        addToast('Не удалось получить токен доступа Google Диска', 'error');
        return;
      }

      const saveRes = await saveGameToGoogleDrive(stateRef.current, token);
      setIsDriveSyncing(false);

      if (saveRes.success) {
        addToast('Успешно синхронизировано с Google Диском в папку game/', 'success');
      } else {
        addToast(`Ошибка синхронизации: ${saveRes.error || 'Сбой сети'}`, 'error');
      }
    } catch (err: any) {
      setIsDriveSyncing(false);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      addToast(`Ошибка Google Диска: ${err?.message || err}`, 'error');
    }
  };

  // 5. Onboarding completion
  const handleOnboardingComplete = (username: string, gender: 'M' | 'F') => {
    setState((prev) => {
      const next = {
        ...prev,
        username,
        gender,
        isRegistered: true,
      };
      saveStateToStorage(next);
      return next;
    });
    addToast(`Добро пожаловать в Метрополис, гражданин ${username}!`, 'success');
  };

  const capital = calcTotalCapital(state);
  const hasMegacity = capital >= 432_000_000 || state.megacity.unlocked;

  // District details for modal header
  const getDistrictInfo = (dId: DistrictId) => {
    switch (dId) {
      case 'center':
        return { name: 'Центр', icon: Landmark, color: 'text-sky-400', border: 'border-sky-500/30' };
      case 'industry':
        return { name: 'Промзона', icon: Factory, color: 'text-amber-400', border: 'border-amber-500/30' };
      case 'mall':
        return { name: 'Молл', icon: ShoppingBag, color: 'text-purple-400', border: 'border-purple-500/30' };
      case 'garage':
        return { name: 'Гараж', icon: Car, color: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'gov':
        return { name: 'Мэрия', icon: Building2, color: 'text-rose-400', border: 'border-rose-500/30' };
      case 'campus':
      default:
        return { name: 'Кампус', icon: GraduationCap, color: 'text-indigo-400', border: 'border-indigo-500/30' };
    }
  };

  return (
    <div className="min-h-screen bg-[#05070b] text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-white">
      {/* GPU Accelerated Aurora Mesh Background */}
      <div className="fixed inset-0 pointer-events-none z-0 aurora-mesh" />

      {/* Onboarding Screen */}
      {!state.isRegistered && <OnboardingModal onComplete={handleOnboardingComplete} />}

      {/* Ban Freeze Overlay */}
      {state.isBanned && <BanOverlay reason={state.banReason} expiresAt={state.banExpiresAt} />}

      {/* Critical Alert Modal Centered at z-[100] */}
      <CriticalAlertModal alert={criticalAlert} onClose={() => setCriticalAlert(null)} />

      {/* Toast Notifications Bottom-Right at z-[90] */}
      <ToastNotifications toasts={toasts} onDismiss={dismissToast} />

      {/* Admin Panel Modal */}
      <AdminConsoleModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        state={state}
        onUpdateState={(fn) => setState((prev) => fn(prev))}
        isAdminAuthenticated={isAdminAuthenticated}
        onAuthenticateAdmin={() => setIsAdminAuthenticated(true)}
        userEmail={driveUserEmail}
      />

      {/* Google Sheets Database Export Modal */}
      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        onShowToast={addToast}
      />

      {/* Top Glass HUD */}
      <HeaderHUD
        state={state}
        isAdmin={isAdminAuthenticated}
        onOpenAdmin={() => setAdminModalOpen(true)}
        onSyncDrive={handleSyncDrive}
        onOpenSheets={() => setSheetsModalOpen(true)}
        isDriveSyncing={isDriveSyncing}
        driveUserEmail={driveUserEmail}
      />

      {/* Streamlined Navigation Bar: [Профиль] [Город] [Мир] [Справка] */}
      <NavigationBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isAdmin={isAdminAuthenticated}
        hasMegacity={hasMegacity}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 relative z-10">
        {/* TAB 1: Profile View */}
        {activeTab === 'profile' && (
          <ProfileView
            state={state}
            onUpdateState={(fn) => setState((prev) => fn(prev))}
            onSyncDrive={handleSyncDrive}
            isDriveSyncing={isDriveSyncing}
            driveUserEmail={driveUserEmail}
            onShowToast={addToast}
          />
        )}

        {/* TAB 2: City Map (MegacityMap with 6 Districts & Infrastructure) */}
        {activeTab === 'city' && (
          <MegacityMap
            state={state}
            onUpdateState={(fn) => setState((prev) => fn(prev))}
            onOpenDistrict={(dId) => setActiveDistrictModal(dId)}
            onShowToast={addToast}
          />
        )}

        {/* TAB 3: World Map (Endgame Megacity) */}
        {activeTab === 'world' && (
          <MegacityView
            state={state}
            onUpdateState={(fn) => setState((prev) => fn(prev))}
            onShowToast={addToast}
          />
        )}

        {/* TAB 4: Knowledge Base FAQ */}
        {activeTab === 'faq' && <FaqView onOpenSheets={() => setSheetsModalOpen(true)} />}
      </main>

      {/* DISTRICT MODAL OVERLAY: Opens over the city map with Framer Motion */}
      <AnimatePresence>
        {activeDistrictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDistrictModal(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-xl"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={`glass-panel rounded-2xl w-full max-w-6xl my-6 border ${
                getDistrictInfo(activeDistrictModal).border
              } shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 relative`}
            >
              {/* District Modal Header Bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-black/60 shrink-0">
                <div className="flex items-center gap-3">
                  {React.createElement(getDistrictInfo(activeDistrictModal).icon, {
                    className: `w-5 h-5 ${getDistrictInfo(activeDistrictModal).color}`,
                  })}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                      Район «{getDistrictInfo(activeDistrictModal).name}»
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      Официальный сектор Метрополиса v0.16
                    </span>
                  </div>
                </div>

                {/* District Internal Subtabs if applicable */}
                <div className="flex items-center gap-2">
                  {activeDistrictModal === 'garage' && (
                    <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGarageSubTab('garage')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                          garageSubTab === 'garage' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Гараж
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGarageSubTab('dealers')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                          garageSubTab === 'dealers' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Автосалон
                      </motion.button>
                    </div>
                  )}

                  {activeDistrictModal === 'center' && (
                    <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setBankSubTab('bank')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                          bankSubTab === 'bank' ? 'bg-sky-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Банк
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setBankSubTab('invest')}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                          bankSubTab === 'invest' ? 'bg-sky-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Инвестиции
                      </motion.button>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.15, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveDistrictModal(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors ml-2 cursor-pointer"
                    title="Вернуться на карту города"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* District View Inner Content */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {activeDistrictModal === 'center' &&
                  (bankSubTab === 'bank' ? (
                    <BankView
                      state={state}
                      onUpdateState={(fn) => setState((prev) => fn(prev))}
                      onShowToast={addToast}
                    />
                  ) : (
                    <InvestView
                      state={state}
                      onUpdateState={(fn) => setState((prev) => fn(prev))}
                      onShowToast={addToast}
                    />
                  ))}

                {activeDistrictModal === 'industry' && (
                  <CareerView
                    state={state}
                    onUpdateState={(fn) => setState((prev) => fn(prev))}
                    onShowToast={addToast}
                  />
                )}

                {activeDistrictModal === 'mall' && (
                  <MallView
                    state={state}
                    onUpdateState={(fn) => setState((prev) => fn(prev))}
                    onShowToast={addToast}
                  />
                )}

                {activeDistrictModal === 'garage' &&
                  (garageSubTab === 'garage' ? (
                    <GarageView
                      state={state}
                      onUpdateState={(fn) => setState((prev) => fn(prev))}
                      onShowToast={addToast}
                    />
                  ) : (
                    <DealersView
                      state={state}
                      onUpdateState={(fn) => setState((prev) => fn(prev))}
                      onShowToast={addToast}
                    />
                  ))}

                {activeDistrictModal === 'gov' && (
                  <GovView
                    state={state}
                    onUpdateState={(fn) => setState((prev) => fn(prev))}
                    onShowToast={addToast}
                  />
                )}

                {activeDistrictModal === 'campus' && (
                  <EducationView
                    state={state}
                    onUpdateState={(fn) => setState((prev) => fn(prev))}
                    onShowToast={addToast}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Compact Quiet Footer */}
      <footer className="w-full border-t border-white/5 py-4 px-6 text-center text-[11px] text-slate-500 font-mono relative z-10">
        METROPOLIS v0.16 · Roleplay Life Simulation & Autonomous Economy Engine
      </footer>
    </div>
  );
}
