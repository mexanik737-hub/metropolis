import React from 'react';
import { motion } from 'framer-motion';
import { GameState, DistrictId } from '../types/game';
import {
  BUSINESSES,
  CITY_INFRASTRUCTURE_PROJECTS,
  CityInfraProject,
  calcInfrastructureMultiplier,
  CONFIG,
} from '../data/gameData';
import {
  Building2,
  Factory,
  ShoppingBag,
  Car,
  Landmark,
  GraduationCap,
  Sparkles,
  Coins,
  ChevronRight,
  Zap,
  CheckCircle2,
  HardHat,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Shield,
  Layers,
} from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onOpenDistrict: (districtId: DistrictId, subTabHint?: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface DistrictFeature {
  label: string;
  subTab?: string;
  icon?: string;
}

interface DistrictConfig {
  id: DistrictId;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  description: string;
  poiList: DistrictFeature[];
}

const DISTRICTS: DistrictConfig[] = [
  {
    id: 'center',
    name: 'Центральный Сити',
    tagline: 'Финансовый центр, банки, инвестиции и недвижимость',
    icon: Landmark,
    accentColor: 'from-sky-500 to-blue-600',
    glowColor: 'rgba(56, 189, 248, 0.3)',
    borderColor: 'border-sky-500/30',
    description: 'Сердце экономики Метрополиса. Здесь расположены Центробанк, биржа обмена валют Forex, депозиты, институциональные инвестиционные планы и агентство элитной недвижимости.',
    poiList: [
      { label: 'Банк & Обменник', subTab: 'bank', icon: '🏦' },
      { label: 'Инвестиции', subTab: 'invest', icon: '📈' },
      { label: 'Недвижимость', subTab: 'estate', icon: '🏢' },
      { label: 'Хранилище слитков', subTab: 'bank', icon: '🔒' },
      { label: 'Оффшорный счет', subTab: 'bank', icon: '🏛️' },
    ],
  },
  {
    id: 'industry',
    name: 'Индустриальная Промзона',
    tagline: 'Добыча руды, тяжелые заводы, станки и сервера',
    icon: Factory,
    accentColor: 'from-amber-500 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    borderColor: 'border-amber-500/30',
    description: 'Горнодобывающий кластер, автоматизированные буровые платформы, цеха печати валюты и серверные дата-центры для добычи Bitcoin.',
    poiList: [
      { label: 'Шахта & Буры', subTab: 'mine', icon: '⛏️' },
      { label: 'Вакансии цеха', subTab: 'work', icon: '💼' },
      { label: 'Печатный цех', subTab: 'printers', icon: '🖨️' },
      { label: 'Серверный парк ₿', subTab: 'servers', icon: '🖥️' },
    ],
  },
  {
    id: 'mall',
    name: 'ТРЦ «Молл» & Казино',
    tagline: 'Развлечения, азартные игры, рынки и аукционы',
    icon: ShoppingBag,
    accentColor: 'from-purple-500 to-pink-600',
    glowColor: 'rgba(168, 85, 247, 0.3)',
    borderColor: 'border-purple-500/30',
    description: 'Крупнейший торгово-развлекательный комплекс: казино «Рояль», слоты, колесо фортуны, рынок руды, закрытый нелегальный сектор и аукцион госномеров.',
    poiList: [
      { label: 'Казино «Рояль»', subTab: 'casino', icon: '🎰' },
      { label: 'Колесо Фортуны', subTab: 'wheel', icon: '🎡' },
      { label: 'Покер & Блэкджек', subTab: 'blackjack', icon: '🃏' },
      { label: 'Рынок руды', subTab: 'market', icon: '💎' },
      { label: 'Магазин техники', subTab: 'store', icon: '🛍️' },
      { label: 'Нелегальный рынок', subTab: 'black', icon: '🕶️' },
    ],
  },
  {
    id: 'garage',
    name: 'Гаражный Квартал & Автосалон',
    tagline: 'Автосалон суперкаров, тюнинг Stage 1-3 и обслуживание',
    icon: Car,
    accentColor: 'from-emerald-500 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    borderColor: 'border-emerald-500/30',
    description: 'Эпицентр автокультуры Метрополиса. Официальный автосалон и дилер суперкаров, чип-тюнинг, заезды на автодроме и станции ТО.',
    poiList: [
      { label: 'Автосалон', subTab: 'dealers', icon: '🚗' },
      { label: 'Гараж & Тюнинг', subTab: 'garage', icon: '🏎️' },
      { label: 'Обслуживание ТО', subTab: 'maintenance', icon: '🔧' },
    ],
  },
  {
    id: 'gov',
    name: 'Мэрия & Ведомства',
    tagline: 'Паспортный стол, МВД, фракции и налоги',
    icon: Building2,
    accentColor: 'from-rose-500 to-red-600',
    glowColor: 'rgba(244, 63, 94, 0.3)',
    borderColor: 'border-rose-500/30',
    description: 'Официальные органы власти Метрополиса. Оформление водительских прав в МВД, получение военного билета, регистрация госномеров и вступление во фракции.',
    poiList: [
      { label: 'Паспортный стол', icon: '🏛️' },
      { label: 'МВД (Права Кат. B)', icon: '🛡️' },
      { label: 'Военкомат', icon: '🎖️' },
      { label: 'Фракции мегаполиса', icon: '🤝' },
    ],
  },
  {
    id: 'campus',
    name: 'Кампус Университета',
    tagline: 'Высшее образование, курсы и спецподготовка',
    icon: GraduationCap,
    accentColor: 'from-indigo-500 to-violet-600',
    glowColor: 'rgba(99, 102, 241, 0.3)',
    borderColor: 'border-indigo-500/30',
    description: 'Академический центр Метрополиса. Дипломы ВУЗа I–V ступеней, сертификаты IT и финансового анализа, доступ к высшим высокооплачиваемым вакансиям.',
    poiList: [
      { label: 'Высшее образование', icon: '🎓' },
      { label: 'Профессиональные курсы', icon: '📚' },
      { label: 'Спецподготовка', icon: '🔬' },
    ],
  },
];

export const MegacityMap: React.FC<Props> = ({
  state,
  onUpdateState,
  onOpenDistrict,
  onShowToast,
}) => {
  const infraMultiplier = calcInfrastructureMultiplier(state.cityInfrastructure);
  const totalProjects = CITY_INFRASTRUCTURE_PROJECTS.length;
  const completedProjects = Object.values(state.cityInfrastructure || {}).filter(Boolean).length;

  // Calculate total cashbox across all businesses
  let totalCashboxRub = 0;
  let totalCashboxUsd = 0;
  state.businesses.forEach((b) => {
    totalCashboxRub += Math.floor(b.cashboxRub);
    totalCashboxUsd += Math.floor(b.cashboxUsd);
  });
  const hasAnyCash = totalCashboxRub > 0 || totalCashboxUsd > 0;

  // Single business collection
  const handleCollectSingleBusinessCash = (bizId: string) => {
    const matching = state.businesses.filter((item) => item.id === bizId);
    if (matching.length === 0) return;
    const bDef = BUSINESSES.find((item) => item.id === bizId);
    if (!bDef) return;

    let rubCash = 0;
    let usdCash = 0;
    matching.forEach((item) => {
      rubCash += Math.floor(item.cashboxRub);
      usdCash += Math.floor(item.cashboxUsd);
    });

    if (rubCash === 0 && usdCash === 0) {
      onShowToast(`Касса «${bDef.name}» уже собрана!`, 'info');
      return;
    }

    const taxRate = state.karma >= 1000 || state.activeFaction === 'f_gov' ? 0.06 : 0.13;
    let netRub = 0;
    let taxRub = 0;
    let netUsd = 0;
    let isRaid = false;
    let confiscatedUsd = 0;
    const newFinesLog = [...state.finesLog];

    if (!bDef.isUsd) {
      taxRub = Math.floor(rubCash * taxRate);
      netRub = rubCash - taxRub;
    } else {
      let raidChance = CONFIG.PROCURATOR_MIN_CHANCE + (Math.abs(state.karma) / 10000) * (CONFIG.PROCURATOR_MAX_CHANCE - CONFIG.PROCURATOR_MIN_CHANCE);
      if (state.car?.id === 'c_13') raidChance = Math.max(0.1, raidChance - 0.05);
      if (state.activeFaction === 'f_synd') raidChance = Math.max(0.1, raidChance - 0.15);

      const firstBiz = matching[0];
      isRaid = firstBiz.nextRaidRoll < raidChance;
      netUsd = usdCash;
      if (isRaid && netUsd > 0) {
        confiscatedUsd = Math.floor(netUsd * 0.5);
        netUsd -= confiscatedUsd;
        newFinesLog.unshift({
          id: 'fine_' + Date.now() + '_' + bizId,
          time: Date.now(),
          source: 'Прокуратура',
          desc: `Рейд Прокурора при инкассации «${bDef.name}». Изъято 50% кассы.`,
          amountText: `-${confiscatedUsd} $`,
        });
      }
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub + netRub,
      usdCash: prev.usdCash + netUsd,
      businesses: prev.businesses.map((item) =>
        item.id === bizId ? { ...item, cashboxRub: 0, cashboxUsd: 0, nextRaidRoll: Math.random() } : item
      ),
      finesLog: newFinesLog,
      raidCounters: {
        ...prev.raidCounters,
        prosecutorRaids: prev.raidCounters.prosecutorRaids + (isRaid ? 1 : 0),
      },
    }));

    if (netRub > 0) {
      onShowToast(`Собрана выручка «${bDef.name}»: +${netRub.toLocaleString('ru-RU')} ₽ (налог ${Math.round(taxRate * 100)}%: ${taxRub.toLocaleString('ru-RU')} ₽)`, 'success');
    } else if (netUsd > 0) {
      onShowToast(`Собрана выручка «${bDef.name}»: +${netUsd.toLocaleString('ru-RU')} $${isRaid ? ` (Рейд: -${confiscatedUsd} $)` : ''}`, isRaid ? 'error' : 'success');
    }
  };

  // Collect All Cash in 1 Click!
  const handleCollectAllCash = () => {
    if (!hasAnyCash) {
      onShowToast('Во всех кассах предприятий сейчас пусто!', 'info');
      return;
    }

    const taxRate = state.karma >= 1000 || state.activeFaction === 'f_gov' ? 0.06 : 0.13;
    let totalNetRub = 0;
    let totalTaxRub = 0;
    let totalNetUsd = 0;
    let totalRaids = 0;
    let totalConfiscatedUsd = 0;
    const newFines = [...state.finesLog];

    const updatedBusinesses = state.businesses.map((b) => {
      const bDef = BUSINESSES.find((item) => item.id === b.id);
      if (!bDef) return b;

      const rubCash = Math.floor(b.cashboxRub);
      const usdCash = Math.floor(b.cashboxUsd);

      if (!bDef.isUsd) {
        const tax = Math.floor(rubCash * taxRate);
        totalTaxRub += tax;
        totalNetRub += rubCash - tax;
      } else {
        let raidChance = CONFIG.PROCURATOR_MIN_CHANCE + (Math.abs(state.karma) / 10000) * (CONFIG.PROCURATOR_MAX_CHANCE - CONFIG.PROCURATOR_MIN_CHANCE);
        if (state.car?.id === 'c_13') raidChance = Math.max(0.1, raidChance - 0.05);
        if (state.activeFaction === 'f_synd') raidChance = Math.max(0.1, raidChance - 0.15);

        const isRaid = b.nextRaidRoll < raidChance;
        let collectedUsd = usdCash;
        if (isRaid && collectedUsd > 0) {
          totalRaids++;
          const confiscated = Math.floor(collectedUsd * 0.5);
          totalConfiscatedUsd += confiscated;
          collectedUsd -= confiscated;
          newFines.unshift({
            id: 'fine_' + Date.now() + '_' + b.id,
            time: Date.now(),
            source: 'Прокуратура',
            desc: `Рейд Прокурора при инкассации «${bDef.name}». Изъято 50% кассы.`,
            amountText: `-${confiscated} $`,
          });
        }
        totalNetUsd += collectedUsd;
      }

      return {
        ...b,
        cashboxRub: 0,
        cashboxUsd: 0,
        nextRaidRoll: Math.random(),
      };
    });

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub + totalNetRub,
      usdCash: prev.usdCash + totalNetUsd,
      businesses: updatedBusinesses,
      finesLog: newFines,
      raidCounters: {
        ...prev.raidCounters,
        prosecutorRaids: prev.raidCounters.prosecutorRaids + totalRaids,
      },
    }));

    const msgs: string[] = [];
    if (totalNetRub > 0) msgs.push(`+${totalNetRub.toLocaleString('ru-RU')} ₽ (налог: ${totalTaxRub.toLocaleString('ru-RU')} ₽)`);
    if (totalNetUsd > 0) msgs.push(`+${totalNetUsd.toLocaleString('ru-RU')} $`);
    if (totalConfiscatedUsd > 0) msgs.push(`Рейды прокуратуры: -${totalConfiscatedUsd} $`);

    onShowToast(`Собрана вся выручка со всех объектов: ${msgs.join(' · ')}`, totalRaids > 0 ? 'info' : 'success');
  };

  // Invest in infrastructure
  const handleInvestProject = (project: CityInfraProject) => {
    const isBuilt = !!state.cityInfrastructure?.[project.id];
    if (isBuilt) return;

    if (state.rub < project.costRub) {
      onShowToast(`Недостаточно рублей! Требуется ${project.costRub.toLocaleString('ru-RU')} ₽`, 'error');
      return;
    }

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub - project.costRub,
      cityInfrastructure: {
        ...(prev.cityInfrastructure || {}),
        [project.id]: true,
      },
    }));

    onShowToast(`Проект «${project.name}» успешно профинансирован! Бонус: ${project.bonusDescription}`, 'success');
  };

  // Get businesses belonging to a district (match by ID prefix or known mapping)
  const getDistrictBusinesses = (districtId: DistrictId) => {
    return state.businesses.filter((b) => {
      if (districtId === 'center') {
        return ['b_2', 'b_3', 'b_5', 'b_8', 'b_9', 'b_12'].includes(b.id);
      }
      if (districtId === 'industry') {
        return ['b_1', 'b_13', 'b_15', 'b_16', 'b_17', 'b_18', 'ill_b_3'].includes(b.id);
      }
      if (districtId === 'mall') {
        return ['b_6', 'b_7', 'b_11', 'b_14', 'ill_b_1', 'ill_b_2'].includes(b.id);
      }
      if (districtId === 'garage') {
        return ['b_4', 'b_10'].includes(b.id);
      }
      return false;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & GLOBAL CASH COLLECTOR */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  Районы Метрополиса · Каталог Округов
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  6 специализированных городских районов, коммерческие объекты и городские инфраструктурные проекты
                </p>
              </div>
            </div>
          </div>

          {/* Quick Global Actions & Stats */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono">
              <span className="text-slate-400">В кассах: </span>
              <span className="text-emerald-400 font-bold">
                +{totalCashboxRub.toLocaleString('ru-RU')} ₽
              </span>
              {totalCashboxUsd > 0 && (
                <span className="text-amber-400 font-bold ml-1.5">
                  +{totalCashboxUsd.toLocaleString('ru-RU')} $
                </span>
              )}
            </div>

            <button
              onClick={handleCollectAllCash}
              disabled={!hasAnyCash}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                hasAnyCash
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 active:scale-98'
                  : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Собрать всю выручку</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 6 DISTRICT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {DISTRICTS.map((d) => {
          const Icon = d.icon;
          const districtBusinesses = getDistrictBusinesses(d.id);
          let districtCashboxRub = 0;
          let districtCashboxUsd = 0;
          districtBusinesses.forEach((b) => {
            districtCashboxRub += Math.floor(b.cashboxRub);
            districtCashboxUsd += Math.floor(b.cashboxUsd);
          });

          return (
            <div
              key={d.id}
              className={`glass-panel rounded-2xl p-5 border ${d.borderColor} flex flex-col justify-between select-none transition-all hover:border-white/20`}
            >
              <div>
                {/* District Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${d.accentColor} text-white shadow-md`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-wide">
                        {d.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 line-clamp-1">
                        {d.tagline}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {d.description}
                </p>

                {/* Points of Interest (Fast Jump Buttons) */}
                <div className="mb-4 space-y-1.5">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                    Объекты района:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {d.poiList.map((poi, idx) => (
                      <button
                        key={idx}
                        onClick={() => onOpenDistrict(d.id, poi.subTab)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/5 hover:border-white/15 text-left text-xs text-slate-200 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          {poi.icon && <span className="text-xs">{poi.icon}</span>}
                          <span>{poi.label}</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* User's Businesses in this District */}
                {districtBusinesses.length > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Ваши объекты в районе:</span>
                      <span className="font-mono text-white font-bold">{districtBusinesses.length} шт.</span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {districtBusinesses.map((b) => {
                        const bDef = BUSINESSES.find((item) => item.id === b.id);
                        if (!bDef) return null;
                        const isUsd = bDef.isUsd;
                        const cash = isUsd ? Math.floor(b.cashboxUsd) : Math.floor(b.cashboxRub);

                        return (
                          <div
                            key={b.id}
                            className="p-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-white font-semibold truncate block">{bDef.name}</span>
                              <span className={`font-mono text-[11px] ${isUsd ? 'text-amber-400' : 'text-emerald-400'}`}>
                                Касса: {cash.toLocaleString('ru-RU')} {isUsd ? '$' : '₽'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleCollectSingleBusinessCash(b.id)}
                              disabled={cash <= 0}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
                                cash > 0
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-white/5 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              Собрать
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Enter District Button */}
              <div className="pt-3 border-t border-white/5 mt-auto">
                <button
                  onClick={() => onOpenDistrict(d.id)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 group"
                >
                  <span>Войти в район «{d.name}»</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. CITY INFRASTRUCTURE PROJECTS SECTION */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Городские Инфраструктурные Проекты
              </h3>
              <p className="text-xs text-slate-400">
                Финансирование масштабных проектов увеличивает глобальный пассивный доход всей вашей бизнес-империи
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Построено: {completedProjects} из {totalProjects}
            </span>
            <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
              +{Math.round((infraMultiplier - 1) * 100)}% к доходу
            </div>
          </div>
        </div>

        {/* Projects Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITY_INFRASTRUCTURE_PROJECTS.map((project) => {
            const isBuilt = !!state.cityInfrastructure?.[project.id];
            const canAfford = state.rub >= project.costRub;

            return (
              <div
                key={project.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isBuilt
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">{project.name}</span>
                    {isBuilt ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Построено
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        Район: {project.districtName}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {project.desc}
                  </p>

                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-1 mb-4 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Стоимость:</span>
                      <span className="text-white font-bold">{project.costRub.toLocaleString('ru-RU')} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Эффект:</span>
                      <span className="text-emerald-400 font-bold">{project.bonusDescription}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-2">
                  <button
                    onClick={() => handleInvestProject(project)}
                    disabled={isBuilt || !canAfford}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isBuilt
                        ? 'bg-white/5 text-slate-500 border border-white/5 cursor-default'
                        : canAfford
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md shadow-amber-600/20'
                        : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {isBuilt ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Проект введен в эксплуатацию</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-slate-950" />
                        <span>Инвестировать ({project.costRub.toLocaleString('ru-RU')} ₽)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
