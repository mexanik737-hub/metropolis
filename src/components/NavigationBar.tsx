import React from 'react';
import { motion } from 'framer-motion';
import { ActiveTab } from '../types/game';
import { User, Building2, Globe2, HelpCircle, KeyRound } from 'lucide-react';

interface Props {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isAdmin: boolean;
  hasMegacity: boolean;
}

export const NavigationBar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  isAdmin,
  hasMegacity,
}) => {
  const tabs = [
    {
      id: 'profile' as ActiveTab,
      label: 'Профиль',
      icon: User,
      desc: 'Документы и активы',
    },
    {
      id: 'city' as ActiveTab,
      label: 'Районы',
      icon: Building2,
      desc: 'Районы и городские объекты',
    },
    {
      id: 'world' as ActiveTab,
      label: 'Мир',
      icon: Globe2,
      desc: 'Эндгейм мегапроект',
      badge: hasMegacity ? 'Открыт' : 'VII+',
    },
    {
      id: 'faq' as ActiveTab,
      label: 'Справка',
      icon: HelpCircle,
      desc: 'База знаний',
    },
  ];

  if (isAdmin) {
    tabs.push({
      id: 'admin' as ActiveTab,
      label: 'Админ',
      icon: KeyRound,
      desc: 'Панель управления',
      badge: 'ROOT',
    });
  }

  return (
    <nav className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1rem)] px-1 sm:px-2 py-1 sm:py-1.5 rounded-2xl bg-[#080d14]/92 backdrop-blur-2xl border border-white/15 shadow-[0_12px_45px_rgba(0,0,0,0.85)] flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const isActive =
          activeTab === tab.id ||
          (tab.id === 'city' &&
            ['career', 'bank', 'mall', 'gov', 'education', 'dealers', 'garage', 'maintenance', 'invest', 'estate'].includes(activeTab)) ||
          (tab.id === 'world' && activeTab === 'megacity');

        const Icon = tab.icon;

        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => onSelectTab(tab.id)}
            className={`group flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors select-none cursor-pointer shrink-0 ${
              isActive
                ? 'bg-sky-500/15 text-sky-300 border border-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:scale-115 ${
                isActive ? 'text-sky-400' : 'text-slate-400'
              }`}
            />
            <span className="font-semibold tracking-wide">{tab.label}</span>
            {tab.badge && (
              <span className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {tab.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </nav>
  );
};
