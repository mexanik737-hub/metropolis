import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState, DistrictId } from '../types/game';
import {
  BUSINESSES,
  CITY_INFRASTRUCTURE_PROJECTS,
  CityInfraProject,
  calcInfrastructureMultiplier,
} from '../data/gameData';
import {
  Building2,
  Factory,
  ShoppingBag,
  Car,
  Landmark,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Coins,
  ShieldCheck,
  ChevronRight,
  Zap,
  CheckCircle2,
  HardHat,
  MapPin,
  Flame,
  ArrowUpRight,
  Eye,
  Layers,
  Crosshair,
  Radio,
  Plus,
} from 'lucide-react';

interface Props {
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  onOpenDistrict: (districtId: DistrictId) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface DistrictConfig {
  id: DistrictId;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  features: string[];
  mapCoords: { x: number; y: number; width: number; height: number };
}

const DISTRICTS: DistrictConfig[] = [
  {
    id: 'center',
    name: 'Центр',
    tagline: 'Финансовый сити, банк и инвестиции',
    icon: Landmark,
    accentColor: 'from-sky-500 to-blue-600',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    borderColor: 'border-sky-500/40',
    features: ['Банк', 'Депозиты', 'Хранилище', 'Кредиты', 'Инвестиции'],
    mapCoords: { x: 380, y: 190, width: 240, height: 210 },
  },
  {
    id: 'industry',
    name: 'Промзона',
    tagline: 'Шахта, фабрики, станки и сервера',
    icon: Factory,
    accentColor: 'from-amber-500 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    borderColor: 'border-amber-500/40',
    features: ['Шахта', 'Буры', 'Станки', 'Сервера', 'Заводы'],
    mapCoords: { x: 360, y: 440, width: 280, height: 200 },
  },
  {
    id: 'mall',
    name: 'Молл',
    tagline: 'Торговый центр, казино и покер',
    icon: ShoppingBag,
    accentColor: 'from-purple-500 to-pink-600',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: 'border-purple-500/40',
    features: ['ТРЦ', 'Казино', 'Покер', 'Рынок руды', 'Аукцион'],
    mapCoords: { x: 670, y: 320, width: 280, height: 260 },
  },
  {
    id: 'garage',
    name: 'Гараж',
    tagline: 'Автосалон, тюнинг и стритрейсинг',
    icon: Car,
    accentColor: 'from-emerald-500 to-teal-600',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    borderColor: 'border-emerald-500/40',
    features: ['Автосалон', 'Stage 1-3', 'Гонки', 'Ремонт', 'Номера'],
    mapCoords: { x: 80, y: 370, width: 260, height: 240 },
  },
  {
    id: 'gov',
    name: 'Мэрия',
    tagline: 'Администрация, фракции и налоги',
    icon: Building2,
    accentColor: 'from-rose-500 to-red-600',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    borderColor: 'border-rose-500/40',
    features: ['Мэрия', 'Фракции', 'Паспортный стол', 'Лицензии', 'Налоги'],
    mapCoords: { x: 80, y: 70, width: 270, height: 230 },
  },
  {
    id: 'campus',
    name: 'Кампус',
    tagline: 'Университет и военная подготовка',
    icon: GraduationCap,
    accentColor: 'from-indigo-500 to-violet-600',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    borderColor: 'border-indigo-500/40',
    features: ['Высшее образование', 'Курсы', 'Военный билет', 'Спецподготовка'],
    mapCoords: { x: 670, y: 70, width: 270, height: 220 },
  },
];

// Business precise coordinates on map (x, y)
const BUSINESS_MAP_POSITIONS: Record<string, { x: number; y: number; districtId: DistrictId }> = {
  // Center
  b_2: { x: 440, y: 260, districtId: 'center' }, // Кофейня
  b_3: { x: 550, y: 250, districtId: 'center' }, // Барбершоп
  b_5: { x: 430, y: 325, districtId: 'center' }, // Ресторан
  b_8: { x: 565, y: 320, districtId: 'center' }, // Отель
  b_9: { x: 500, y: 235, districtId: 'center' }, // IT-компания
  b_12: { x: 500, y: 355, districtId: 'center' }, // Телеканал
  // Industry
  b_1: { x: 410, y: 495, districtId: 'industry' }, // Ларек
  b_13: { x: 590, y: 490, districtId: 'industry' }, // Оружейный завод
  b_15: { x: 395, y: 570, districtId: 'industry' }, // ГЭС
  b_16: { x: 615, y: 575, districtId: 'industry' }, // АЭС
  b_17: { x: 500, y: 565, districtId: 'industry' }, // Концерн бронетехники
  b_18: { x: 510, y: 615, districtId: 'industry' }, // Космодром
  ill_b_3: { x: 450, y: 535, districtId: 'industry' }, // Лесозаготовки
  // Mall
  b_6: { x: 745, y: 395, districtId: 'mall' }, // Аптеки
  b_7: { x: 840, y: 385, districtId: 'mall' }, // Супермаркет
  ill_b_2: { x: 775, y: 480, districtId: 'mall' }, // Подпольное казино
  ill_b_5: { x: 865, y: 470, districtId: 'mall' }, // Пиратская продукция
  // Garage
  b_4: { x: 165, y: 440, districtId: 'garage' }, // Автосервис
  b_10: { x: 265, y: 435, districtId: 'garage' }, // Нефтебаза
  b_11: { x: 180, y: 530, districtId: 'garage' }, // Автосалон
  ill_b_1: { x: 260, y: 525, districtId: 'garage' }, // Траффикинг
  // Gov
  b_14: { x: 170, y: 220, districtId: 'gov' }, // Порт
  ill_b_6: { x: 280, y: 220, districtId: 'gov' }, // Синдикат
};

// Infrastructure project landmarks on map
const INFRA_LANDMARK_POSITIONS: Record<string, { x: number; y: number }> = {
  infra_center_grid: { x: 500, y: 175 },
  infra_industry_logistics: { x: 505, y: 455 },
  infra_mall_hub: { x: 880, y: 335 },
  infra_garage_ring: { x: 110, y: 495 },
  infra_campus_datacenter: { x: 875, y: 115 },
  infra_gov_embankment: { x: 250, y: 275 },
};

export const MegacityMap: React.FC<Props> = ({
  state,
  onUpdateState,
  onOpenDistrict,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [filterMode, setFilterMode] = useState<'all' | 'player' | 'infra'>('all');
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictId | null>(null);
  const [hoveredBusiness, setHoveredBusiness] = useState<string | null>(null);

  const infraMultiplier = calcInfrastructureMultiplier(state.cityInfrastructure);
  const totalProjects = CITY_INFRASTRUCTURE_PROJECTS.length;
  const completedProjects = CITY_INFRASTRUCTURE_PROJECTS.filter(
    (p) => state.cityInfrastructure?.[p.id]
  ).length;

  // Calculate total cashbox ready for collection
  let totalPendingRub = 0;
  let totalPendingUsd = 0;
  state.businesses.forEach((b) => {
    totalPendingRub += Math.floor(b.cashboxRub);
    totalPendingUsd += Math.floor(b.cashboxUsd);
  });

  // Collect all businesses cashbox in 1 click
  const handleCollectAllCash = () => {
    if (totalPendingRub === 0 && totalPendingUsd === 0) {
      onShowToast('Все кассы предприятий уже собраны!', 'info');
      return;
    }

    const rubToCollect = totalPendingRub;
    const usdToCollect = totalPendingUsd;

    onUpdateState((prev) => ({
      ...prev,
      rub: prev.rub + rubToCollect,
      usdCash: prev.usdCash + usdToCollect,
      businesses: prev.businesses.map((b) => ({
        ...b,
        cashboxRub: 0,
        cashboxUsd: 0,
      })),
    }));

    let msg = `Городская инкассация: собрано +${rubToCollect.toLocaleString('ru-RU')} ₽`;
    if (usdToCollect > 0) msg += ` и +${usdToCollect.toLocaleString('ru-RU')} $`;
    onShowToast(msg, 'success');
  };

  // Build an infrastructure project
  const handleBuildProject = (project: CityInfraProject) => {
    if (state.cityInfrastructure?.[project.id]) return;

    if (state.rub < project.costRub) {
      onShowToast(
        `Недостаточно рублей для строительства: требуется ${project.costRub.toLocaleString('ru-RU')} ₽`,
        'error'
      );
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

    onShowToast(
      `Проект «${project.name}» сдан в эксплуатацию! Множитель экономики увеличен на +${Math.round(
        project.bonusMultiplier * 100
      )}%`,
      'success'
    );
  };

  // Get businesses belonging to a district
  const getDistrictBusinesses = (dId: DistrictId) => {
    return state.businesses.filter((b) => {
      const pos = BUSINESS_MAP_POSITIONS[b.id];
      return pos?.districtId === dId;
    });
  };

  return (
    <div className="space-y-4">
      {/* City Map Header HUD */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-white/10"
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-md shadow-sky-500/10 shrink-0"
          >
            <MapPin className="w-6 h-6" />
          </motion.div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Карта Метрополиса
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                Векторная модель
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              6 районов · {state.businesses.length} предприятий · Множитель:{' '}
              <span className="text-emerald-400 font-mono font-bold">
                +{Math.round((infraMultiplier - 1) * 100)}%
              </span>
            </p>
          </div>
        </div>

        {/* View Switch, Filters & Cashbox Collection */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Map Filters */}
          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                filterMode === 'all' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilterMode('player')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filterMode === 'player' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3 text-sky-300" />
              Мой бизнес ({state.businesses.length})
            </button>
            <button
              onClick={() => setFilterMode('infra')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filterMode === 'infra' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardHat className="w-3 h-3 text-amber-300" />
              Инфра ({completedProjects}/{totalProjects})
            </button>
          </div>

          {/* Mode Switch: Interactive Map vs List View */}
          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'map'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Карта</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Списком</span>
            </motion.button>
          </div>

          {/* Collect All Cashbox Button */}
          <motion.button
            whileHover={totalPendingRub > 0 || totalPendingUsd > 0 ? { scale: 1.04 } : {}}
            whileTap={totalPendingRub > 0 || totalPendingUsd > 0 ? { scale: 0.96 } : {}}
            onClick={handleCollectAllCash}
            disabled={totalPendingRub === 0 && totalPendingUsd === 0}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              totalPendingRub > 0 || totalPendingUsd > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-600/25 cursor-pointer'
                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Инкассация</span>
            {(totalPendingRub > 0 || totalPendingUsd > 0) && (
              <span className="font-mono ml-1 text-slate-950 font-extrabold">
                (+{totalPendingRub.toLocaleString('ru-RU')} ₽)
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* VIEW 1: INTERACTIVE VECTOR CITY MAP */}
      {viewMode === 'map' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="glass-panel rounded-2xl p-2 sm:p-4 border border-white/10 relative overflow-hidden select-none"
        >
          {/* Active District Quick Floating Info Bar */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            {hoveredDistrict ? (
              <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-xs flex items-center gap-2 text-white">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className="font-bold">
                  {DISTRICTS.find((d) => d.id === hoveredDistrict)?.name}:
                </span>
                <span className="text-slate-300">
                  {DISTRICTS.find((d) => d.id === hoveredDistrict)?.tagline} · Нажмите для перехода
                </span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-400 flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                <span>Наведите на район или предприятие для инспекции</span>
              </div>
            )}
          </div>

          {/* SVG Map Container */}
          <div className="w-full relative aspect-[1000/680] rounded-xl overflow-hidden bg-[#070b12] border border-white/10">
            <svg
              viewBox="0 0 1000 680"
              className="w-full h-full object-cover"
              style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))' }}
            >
              <defs>
                {/* City Blueprint Grid */}
                <pattern id="meta-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.8" />
                </pattern>

                {/* River Water Gradient */}
                <linearGradient id="river-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#081b2d" />
                  <stop offset="50%" stopColor="#0a253d" />
                  <stop offset="100%" stopColor="#071726" />
                </linearGradient>

                {/* District Sector Gradients */}
                <radialGradient id="center-zone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.22)" />
                  <stop offset="100%" stopColor="rgba(56, 189, 248, 0.04)" />
                </radialGradient>
                <radialGradient id="industry-zone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.22)" />
                  <stop offset="100%" stopColor="rgba(245, 158, 11, 0.04)" />
                </radialGradient>
                <radialGradient id="mall-zone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(168, 85, 247, 0.22)" />
                  <stop offset="100%" stopColor="rgba(168, 85, 247, 0.04)" />
                </radialGradient>
                <radialGradient id="garage-zone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.22)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.04)" />
                </radialGradient>
                <radialGradient id="gov-zone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(244, 63, 94, 0.22)" />
                  <stop offset="100%" stopColor="rgba(244, 63, 94, 0.04)" />
                </radialGradient>
                <radialGradient id="campus-zone" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.22)" />
                  <stop offset="100%" stopColor="rgba(99, 102, 241, 0.04)" />
                </radialGradient>

                {/* Building Block Patterns */}
                <pattern id="building-blocks" width="12" height="12" patternUnits="userSpaceOnUse">
                  <rect x="2" y="2" width="8" height="8" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                </pattern>
              </defs>

              {/* 1. Blueprint Grid Background */}
              <rect width="1000" height="680" fill="#080c14" />
              <rect width="1000" height="680" fill="url(#meta-grid)" />

              {/* 2. Metropolis River Waterway */}
              <path
                d="M -20,290 C 150,290 280,340 370,300 C 470,250 530,240 630,300 C 720,350 850,290 1020,310 L 1020,380 C 850,360 720,420 630,370 C 530,310 470,320 370,370 C 280,410 150,360 -20,360 Z"
                fill="url(#river-grad)"
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="1.5"
              />
              {/* Secondary Harbor Canal */}
              <path
                d="M 220,370 C 210,430 200,490 190,680 L 130,680 C 140,490 150,430 160,370 Z"
                fill="url(#river-grad)"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeWidth="1"
              />

              {/* 3. District Territories with Interactive Hovers & Clicks */}
              {DISTRICTS.map((d) => {
                const isHovered = hoveredDistrict === d.id;
                const { x, y, width, height } = d.mapCoords;
                let gradientId = `url(#${d.id}-zone)`;

                return (
                  <g
                    key={d.id}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredDistrict(d.id)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    onClick={() => onOpenDistrict(d.id)}
                  >
                    {/* District Zone Outline & Fill */}
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx="24"
                      fill={gradientId}
                      stroke={isHovered ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.12)'}
                      strokeWidth={isHovered ? 2.5 : 1}
                      strokeDasharray={isHovered ? 'none' : '4,4'}
                      className="transition-all duration-300"
                    />

                    {/* Architectural Blocks Texture Inside District */}
                    <rect
                      x={x + 12}
                      y={y + 12}
                      width={width - 24}
                      height={height - 24}
                      rx="16"
                      fill="url(#building-blocks)"
                      opacity={isHovered ? 0.8 : 0.35}
                    />

                    {/* District Center Badge */}
                    <g transform={`translate(${x + width / 2}, ${y + 36})`}>
                      <rect
                        x="-70"
                        y="-16"
                        width="140"
                        height="32"
                        rx="16"
                        fill="rgba(10, 15, 25, 0.85)"
                        stroke={isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'}
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="13"
                        fontWeight="bold"
                        letterSpacing="0.5"
                      >
                        {d.name.toUpperCase()}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* 4. Illuminated Bridges over Waterways */}
              {/* Central North Bridge */}
              <g>
                <rect x="485" y="270" width="30" height="45" rx="4" fill="#152238" stroke="#38bdf8" strokeWidth="1" />
                <line x1="492" y1="270" x2="492" y2="315" stroke="#facc15" strokeDasharray="3,3" strokeWidth="1.2" />
                <line x1="508" y1="270" x2="508" y2="315" stroke="#facc15" strokeDasharray="3,3" strokeWidth="1.2" />
              </g>
              {/* Central South Bridge */}
              <g>
                <rect x="485" y="380" width="30" height="45" rx="4" fill="#152238" stroke="#38bdf8" strokeWidth="1" />
                <line x1="492" y1="380" x2="492" y2="425" stroke="#facc15" strokeDasharray="3,3" strokeWidth="1.2" />
                <line x1="508" y1="380" x2="508" y2="425" stroke="#facc15" strokeDasharray="3,3" strokeWidth="1.2" />
              </g>
              {/* East Mall Bridge */}
              <g>
                <rect x="635" y="325" width="40" height="26" rx="4" fill="#152238" stroke="#38bdf8" strokeWidth="1" />
                <line x1="635" y1="338" x2="675" y2="338" stroke="#facc15" strokeDasharray="3,3" strokeWidth="1.2" />
              </g>
              {/* West Harbor Bridge */}
              <g>
                <rect x="335" y="335" width="45" height="26" rx="4" fill="#152238" stroke="#38bdf8" strokeWidth="1" />
                <line x1="335" y1="348" x2="380" y2="348" stroke="#facc15" strokeDasharray="3,3" strokeWidth="1.2" />
              </g>

              {/* 5. Highway Network Arteries */}
              <path
                d="M 220,180 L 485,180 L 500,270 M 500,415 L 500,530 M 340,490 L 500,530 L 780,450 M 500,270 L 780,180 M 780,180 L 780,320"
                fill="none"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Animated Traffic Data Pulses along highways */}
              <path
                d="M 220,180 L 485,180 L 500,270 M 500,415 L 500,530 M 340,490 L 500,530 L 780,450 M 500,270 L 780,180 M 780,180 L 780,320"
                fill="none"
                stroke="rgba(56, 189, 248, 0.7)"
                strokeWidth="2"
                strokeDasharray="8,16"
                className="traffic-flow"
              />

              {/* 6. Infrastructure Megaproject Landmarks */}
              {(filterMode === 'all' || filterMode === 'infra') &&
                CITY_INFRASTRUCTURE_PROJECTS.map((proj) => {
                  const pos = INFRA_LANDMARK_POSITIONS[proj.id];
                  if (!pos) return null;
                  const isBuilt = !!state.cityInfrastructure?.[proj.id];

                  return (
                    <g
                      key={proj.id}
                      className="cursor-pointer"
                      onClick={() => handleBuildProject(proj)}
                    >
                      {/* Aura beam if built */}
                      {isBuilt && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="22"
                          fill="none"
                          stroke="rgba(250, 204, 21, 0.4)"
                          strokeWidth="2"
                          className="animate-pulse"
                        />
                      )}

                      {/* Landmark Core Pin */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="14"
                        fill={isBuilt ? '#854d0e' : '#1e293b'}
                        stroke={isBuilt ? '#facc15' : 'rgba(255,255,255,0.3)'}
                        strokeWidth="2"
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 4}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {isBuilt ? '★' : '⚙'}
                      </text>

                      {/* Tag label */}
                      <rect
                        x={pos.x - 45}
                        y={pos.y - 30}
                        width="90"
                        height="18"
                        rx="6"
                        fill="rgba(15, 23, 42, 0.9)"
                        stroke={isBuilt ? 'rgba(250, 204, 21, 0.6)' : 'rgba(255,255,255,0.2)'}
                        strokeWidth="0.8"
                      />
                      <text
                        x={pos.x}
                        y={pos.y - 17}
                        textAnchor="middle"
                        fill={isBuilt ? '#facc15' : '#94a3b8'}
                        fontSize="9"
                        fontWeight="600"
                      >
                        {proj.name} {isBuilt ? '✓' : `(${(proj.costRub / 1_000_000).toFixed(0)}M)`}
                      </text>
                    </g>
                  );
                })}

              {/* 7. Player Owned Businesses (Pulsing Nodes with Cashbox Counters) */}
              {(filterMode === 'all' || filterMode === 'player') &&
                state.businesses.map((b) => {
                  const bDef = BUSINESSES.find((item) => item.id === b.id);
                  if (!bDef) return null;
                  const pos = BUSINESS_MAP_POSITIONS[b.id];
                  if (!pos) return null;

                  const isHovered = hoveredBusiness === b.id;
                  const hasCash = b.cashboxRub > 0 || b.cashboxUsd > 0;
                  const cashLabel = b.cashboxRub > 0
                    ? `+${Math.floor(b.cashboxRub).toLocaleString('ru-RU')} ₽`
                    : b.cashboxUsd > 0
                    ? `+${Math.floor(b.cashboxUsd).toLocaleString('ru-RU')} $`
                    : 'Работает';

                  return (
                    <g
                      key={b.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredBusiness(b.id)}
                      onMouseLeave={() => setHoveredBusiness(null)}
                      onClick={() => onOpenDistrict(pos.districtId)}
                    >
                      {/* Pulsing Radar Ring for Owned Business */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={hasCash ? '18' : '14'}
                        fill="none"
                        stroke={hasCash ? 'rgba(16, 185, 129, 0.5)' : 'rgba(56, 189, 248, 0.4)'}
                        strokeWidth="1.5"
                        className="animate-ping"
                      />

                      {/* Main Business Node */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="11"
                        fill={hasCash ? '#064e3b' : '#0369a1'}
                        stroke={hasCash ? '#10b981' : '#38bdf8'}
                        strokeWidth={isHovered ? 3 : 1.5}
                      />
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="4"
                        fill="#ffffff"
                      />

                      {/* Floating Cashbox Tag above Node */}
                      <g transform={`translate(${pos.x}, ${pos.y - 18})`}>
                        <rect
                          x="-45"
                          y="-16"
                          width="90"
                          height="18"
                          rx="9"
                          fill="rgba(6, 10, 18, 0.95)"
                          stroke={hasCash ? '#10b981' : 'rgba(255,255,255,0.2)'}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="-4"
                          textAnchor="middle"
                          fill={hasCash ? '#34d399' : '#e2e8f0'}
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {cashLabel}
                        </text>
                      </g>
                    </g>
                  );
                })}
            </svg>
          </div>

          {/* Map Footer Helper Bar */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-2 flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ваш бизнес ({state.businesses.length})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Инфраструктурные узлы</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Районы мегаполиса</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Масштаб 1:1 · Нажмите на любой район или предприятие
            </span>
          </div>
        </motion.div>
      )}

      {/* VIEW 2: DISTRICT CARDS LIST & INFRASTRUCTURE PROJECTS */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* 6 District Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISTRICTS.map((d) => {
              const Icon = d.icon;
              const districtBusinesses = getDistrictBusinesses(d.id);
              let districtCashboxRub = 0;
              districtBusinesses.forEach((b) => {
                districtCashboxRub += Math.floor(b.cashboxRub);
              });

              return (
                <motion.div
                  key={d.id}
                  whileHover={{ y: -4, scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => onOpenDistrict(d.id)}
                  className={`group relative rounded-2xl p-5 border cursor-pointer flex flex-col justify-between select-none bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <motion.div
                          whileHover={{ rotate: 12, scale: 1.15 }}
                          className={`p-2.5 rounded-xl bg-gradient-to-br ${d.accentColor} text-white shadow-md`}
                        >
                          <Icon className="w-5 h-5" />
                        </motion.div>
                        <div>
                          <h3 className="text-base font-bold text-white tracking-wide group-hover:text-sky-300 transition-colors">
                            {d.name}
                          </h3>
                          <span className="text-[11px] text-slate-400 line-clamp-1">
                            {d.tagline}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-slate-400 group-hover:text-white transition-colors">
                        <span className="text-[10px] font-mono uppercase tracking-wider hidden sm:inline">Войти</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1.5 mb-4 text-[11px] text-slate-400">
                      {d.features.slice(0, 4).map((f, i) => (
                        <span key={f} className="inline-flex items-center">
                          {f}
                          {i < 3 && <span className="mx-1 text-slate-600">·</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Ваши предприятия:</span>
                      <span className="font-mono text-white font-bold">
                        {districtBusinesses.length} шт.
                      </span>
                    </div>

                    {districtBusinesses.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">В кассах района:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          +{districtCashboxRub.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Infrastructure Projects Section */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Городские Инфраструктурные Проекты
                  </h3>
                  <p className="text-xs text-slate-400">
                    Инвестиции повышают глобальный пассивный доход всех бизнесов в мегаполисе
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-bold text-emerald-400">
                +{Math.round((infraMultiplier - 1) * 100)}% к доходу
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CITY_INFRASTRUCTURE_PROJECTS.map((proj) => {
                const isBuilt = !!state.cityInfrastructure?.[proj.id];
                const canAfford = state.rub >= proj.costRub;

                return (
                  <motion.div
                    key={proj.id}
                    whileHover={{ y: -4, scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`rounded-2xl p-5 border flex flex-col justify-between ${
                      isBuilt
                        ? 'bg-emerald-950/20 border-emerald-500/30 shadow-lg shadow-emerald-950/20'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                          {proj.districtName}
                        </span>
                        {isBuilt ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Введено
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">
                            {proj.costRub.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white mb-1">{proj.name}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{proj.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {proj.bonusDescription}
                      </span>

                      {!isBuilt && (
                        <motion.button
                          whileHover={canAfford ? { scale: 1.05 } : {}}
                          whileTap={canAfford ? { scale: 0.95 } : {}}
                          onClick={() => handleBuildProject(proj)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer'
                              : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                          }`}
                        >
                          Построить
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
