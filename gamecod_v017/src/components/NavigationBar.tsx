import React from 'react';
import { motion } from 'framer-motion';
import { ActiveTab } from '../types/game';
import { User, Map, Globe2, HelpCircle, KeyRound } from 'lucide-react';

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
      label: 'Город',
      icon: Map,
      desc: 'Карта и районы',
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
    <nav className="w-full border-b border-white/10 bg-black/60 backdrop-blur-xl px-3 sm:px-6 sticky top-[57px] z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between sm:justify-start gap-2 py-2">
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'city' &&
              ['career', 'bank', 'mall', 'gov', 'education', 'dealers', 'garage', 'maintenance', 'invest'].includes(activeTab)) ||
            (tab.id === 'world' && activeTab === 'megacity');

          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => onSelectTab(tab.id)}
              className={`group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors select-none cursor-pointer ${
                isActive
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-transform duration-200 group-hover:scale-115 ${
                  isActive ? 'text-sky-400' : 'text-slate-400'
                }`}
              />
              <span className="font-semibold tracking-wide">{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {tab.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
