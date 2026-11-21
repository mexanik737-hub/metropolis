/**
 * METROPOLIS v0.16 — Полная база данных, реестры и конфигурационные матрицы
 */

export const CONFIG = {
  VERSION_STRING: 'v0.16',
  COOLDOWN_MS: 1500,
  ENERGY_MAX: 100,
  ENERGY_BASE_REGEN_SEC: 120,
  PROCURATOR_MIN_CHANCE: 0.25,
  PROCURATOR_MAX_CHANCE: 0.40,
  MVD_MIN_CHANCE: 0.05,
  MVD_MAX_CHANCE: 0.20,
  OFFSHORE_FEE_RATE: 0.15,
  CASINO_BET_MIN: 10_000,
  CASINO_BET_MAX: 50_000_000,
  CASINO_BET_STEP: 10_000,
  MAX_OFFLINE_SEC: 86400, // 24 hours
  VAULT_DAILY_FEE_RATE: 0.002, // 0.2% per day
  DEPOSIT_DAILY_RATE: 0.0075, // 0.75% per day
  DEPOSIT_MIN_RUB: 50_000,
  DEPOSIT_MAX_RUB: 50_000_000,
  LOAN_HALF_DAY_RATE: 0.035, // 3.5% per 12 hours
  BANKRUPTCY_WAIT_SEC: 300, // 5 minutes
  THEFT_CHANCE: 0.05, // 5% chance on navigation
  THEFT_COOLDOWN_SEC: 21600, // 6 hours
  THEFT_RATE: 0.15, // 15% of cash
  THEFT_RUB_MIN: 1_000,
  THEFT_RUB_MAX: 5_000_000,
  THEFT_USD_MAX: 65_000,
  ADMIN_MASTER_CODE: 'm1rfol159036',
  CREATOR_EMAIL: 'mexanik737@yandex.ru',
};

export interface JobDef {
  id: string;
  name: string;
  salary: number; // in RUB or USD
  isUsd?: boolean;
  karma: number;
  reqCourse?: string;
  reqEdu?: number;
  reqSpec?: string;
  reqLicense?: boolean;
  reqCarIds?: string[];
  reqForeignCar?: boolean;
  reqItem?: string;
  consumeItem?: string;
  reqPress?: boolean;
  reqKarma?: number;
  reqKarmaMax?: number;
  fuelDrain?: number;
  wearDrain?: number;
  desc: string;
}

export const JOBS_LEGAL: JobDef[] = [
  { id: 'leg_1', name: 'Раздача листовок', salary: 250, karma: 0, desc: 'Начальная работа у метро без требований' },
  { id: 'leg_2', name: 'Расклейка объявлений', salary: 500, karma: 1, reqCourse: 'course_2', desc: 'Расклейка афиш по району' },
  { id: 'leg_3', name: 'Доставщик пиццы', salary: 1200, karma: 1, reqCourse: 'course_3', desc: 'Пешая доставка заказов' },
  { id: 'leg_4', name: 'Курьер на велосипеде', salary: 2200, karma: 2, reqCourse: 'course_4', reqItem: 'bicycle', desc: 'Экспресс-доставка по городу' },
  { id: 'leg_5', name: 'Водитель такси', salary: 4500, karma: 2, reqCourse: 'course_5', reqLicense: true, reqCarIds: ['c_1', 'c_2', 'c_3'], fuelDrain: 2, wearDrain: 1, desc: 'Смены в городском таксопарке' },
  { id: 'leg_6', name: 'Частный водитель', salary: 9000, karma: 3, reqCourse: 'course_6', reqLicense: true, reqForeignCar: true, fuelDrain: 2, wearDrain: 1, desc: 'VIP-перевозка предпринимателей' },
  { id: 'leg_7', name: 'Программист', salary: 18000, karma: 3, reqCourse: 'course_7', reqItem: 'pc', desc: 'Разработка коммерческих систем' },
  { id: 'leg_8', name: 'Общественник', salary: 25000, karma: 15, reqCourse: 'course_8', desc: 'Быстрое восстановление репутации (+15 кармы)' },
  { id: 'leg_9', name: 'Муниципальный служащий', salary: 45000, karma: 5, reqEdu: 1, desc: 'Работа в районной администрации' },
  { id: 'leg_10', name: 'Член муниципалитета', salary: 70000, karma: 8, reqEdu: 2, desc: 'Управление городскими инициативами' },
  { id: 'leg_11', name: 'Инженер-робототехник', salary: 120000, karma: 12, reqEdu: 3, reqKarma: 500, desc: 'Разработка автоматизированных комплексов' },
  { id: 'leg_12', name: 'Нейробиолог', salary: 220000, karma: 20, reqEdu: 4, reqKarma: 1000, desc: 'Передовые научные исследования' },
  { id: 'leg_13', name: 'Зам. главы компании', salary: 350000, karma: 30, reqEdu: 5, reqKarma: 3000, desc: 'Корпоративное стратегическое управление' },
  { id: 'leg_14', name: 'Депутат Госдумы', salary: 550000, karma: 15, reqSpec: 'spec_1', reqEdu: 5, reqKarma: 1500, desc: 'Законодательная деятельность' },
  { id: 'leg_15', name: 'Мэр города', salary: 900000, karma: 25, reqSpec: 'spec_2', reqEdu: 5, reqKarma: 2000, desc: 'Полное руководство инфраструктурой' },
  { id: 'leg_16', name: 'Министр', salary: 2000000, karma: 40, reqSpec: 'spec_3', reqEdu: 5, reqKarma: 4000, desc: 'Высшая государственная должность страны' },
];

export const JOBS_ILLEGAL: JobDef[] = [
  { id: 'ill_1', name: 'Спекулянт билетами', salary: 40, isUsd: true, karma: -15, consumeItem: 'fake_passport', desc: 'Перепродажа поддельных билетов' },
  { id: 'ill_2', name: 'Контрабандист', salary: 120, isUsd: true, karma: -25, reqKarmaMax: -200, consumeItem: 'contraband', desc: 'Транспортировка закрытых грузов' },
  { id: 'ill_3', name: 'Фальшивомонетчик', salary: 350, isUsd: true, karma: -40, reqPress: true, consumeItem: 'module_fake', desc: 'Печать фальшивых купюр в паре с принтером' },
  { id: 'ill_4', name: 'Торговец оружием', salary: 800, isUsd: true, karma: -60, reqKarmaMax: -1000, consumeItem: 'weapon_crate', desc: 'Оптовые поставки армейского арсенала' },
  { id: 'ill_5', name: 'Растратчик', salary: 1800, isUsd: true, karma: -80, reqKarmaMax: -2000, reqItem: 'pc', consumeItem: 'chip_hack', desc: 'Взлом банкоматов и терминалов' },
  { id: 'ill_6', name: 'Мошенник', salary: 3200, isUsd: true, karma: -100, reqKarmaMax: -1500, reqItem: 'pc', consumeItem: 'soft_hacker', desc: 'Кибератаки на банковские шлюзы' },
  { id: 'ill_7', name: 'Продажа лекарств', salary: 5500, isUsd: true, karma: -150, reqKarmaMax: -3500, consumeItem: 'pharma_batch', desc: 'Нелегальный фармацевтический картель' },
];

export interface BusinessDef {
  id: string;
  name: string;
  cost: number;
  income: number; // RUB/hr or USD/hr
  isUsd?: boolean;
  reqKarma?: number;
  reqKarmaMax?: number;
  unlocksServers?: boolean;
  oilDepot?: boolean;
  autoService?: boolean;
  electricDiscount?: number;
  desc: string;
}

export const BUSINESSES: BusinessDef[] = [
  { id: 'b_1', name: 'Ларек с прессой', cost: 150_000, income: 2_500, reqKarma: 500, desc: 'Начальная точка розничной торговли' },
  { id: 'b_2', name: 'Кофейня', cost: 400_000, income: 5_500, reqKarma: 500, desc: 'Уютная кофейня в центре' },
  { id: 'b_3', name: 'Барбершоп', cost: 1_100_000, income: 12_000, reqKarma: 500, desc: 'Мужская парикмахерская премиум-класса' },
  { id: 'b_4', name: 'Автосервис', cost: 2_750_000, income: 26_000, reqKarma: 500, autoService: true, desc: 'Скидка 25% на ремонт авто владельцу' },
  { id: 'b_5', name: 'Ресторан', cost: 5_000_000, income: 42_000, reqKarma: 500, desc: 'Заведение высокой кухни' },
  { id: 'b_6', name: 'Сеть аптек', cost: 8_500_000, income: 68_000, reqKarma: 500, desc: 'Сеть фармацевтических пунктов' },
  { id: 'b_7', name: 'Супермаркет', cost: 15_000_000, income: 110_000, reqKarma: 500, desc: 'Крупный продуктовый гипермаркет' },
  { id: 'b_8', name: 'Отель', cost: 25_000_000, income: 175_000, reqKarma: 500, desc: 'Гостиничный комплекс на 150 номеров' },
  { id: 'b_9', name: 'IT-компания', cost: 45_000_000, income: 300_000, reqKarma: 500, unlocksServers: true, desc: 'Открывает доступ к Серверам ₿' },
  { id: 'b_10', name: 'Нефтебаза', cost: 85_000_000, income: 520_000, reqKarma: 500, unlocksServers: true, oilDepot: true, desc: 'Скидка 20% на топливо авто и буров' },
  { id: 'b_11', name: 'Автосалон', cost: 140_000_000, income: 820_000, reqKarma: 500, unlocksServers: true, desc: 'Дилерский центр иномарок' },
  { id: 'b_12', name: 'Телеканал', cost: 220_000_000, income: 1_250_000, reqKarma: 500, unlocksServers: true, desc: 'Федеральный вещательный медиахолдинг' },
  { id: 'b_13', name: 'Оружейный завод', cost: 320_000_000, income: 1_750_000, reqKarma: 500, unlocksServers: true, desc: 'Производство спецтехники и вооружения' },
  { id: 'b_14', name: 'Морской порт', cost: 420_000_000, income: 2_250_000, reqKarma: 500, unlocksServers: true, desc: 'Международный логистический терминал' },
  { id: 'b_15', name: 'ГЭС', cost: 600_000_000, income: 3_100_000, reqKarma: 500, unlocksServers: true, electricDiscount: 0.25, desc: 'Скидка 25% на оплату света серверов (OpEx)' },
  { id: 'b_16', name: 'АЭС', cost: 900_000_000, income: 4_400_000, reqKarma: 500, unlocksServers: true, electricDiscount: 0.50, desc: 'Скидка 50% на оплату света серверов (OpEx)' },
  { id: 'b_17', name: 'Концерн бронетехники', cost: 1_200_000_000, income: 5_600_000, reqKarma: 500, unlocksServers: true, desc: 'Тяжелый машиностроительный холдинг' },
  { id: 'b_18', name: 'Космодром', cost: 1_800_000_000, income: 8_000_000, reqKarma: 500, unlocksServers: true, desc: 'Высший коммерческий объект мегаполиса' },

  // Нелегальный бизнес
  { id: 'ill_b_1', name: 'Траффикинг', cost: 50_000_000, income: 3_500, isUsd: true, reqKarmaMax: -500, desc: 'Нелегальная логистическая сеть' },
  { id: 'ill_b_2', name: 'Подпольное казино', cost: 160_000_000, income: 10_500, isUsd: true, reqKarmaMax: -1500, desc: 'Игорный синдикат' },
  { id: 'ill_b_3', name: 'Лесозаготовки', cost: 420_000_000, income: 25_000, isUsd: true, reqKarmaMax: -3000, desc: 'Нелегальный экспорт кругляка' },
  { id: 'ill_b_4', name: 'Нелегальное оружие', cost: 1_100_000_000, income: 58_000, isUsd: true, reqKarmaMax: -5000, desc: 'Контрабанда спецвооружения' },
  { id: 'ill_b_5', name: 'Пиратская продукция', cost: 2_700_000_000, income: 135_000, isUsd: true, reqKarmaMax: -7500, desc: 'Крупнейший подпольный дата-хаб' },
  { id: 'ill_b_6', name: 'Торговля лекарствами', cost: 6_500_000_000, income: 310_000, isUsd: true, reqKarmaMax: -10000, desc: 'Международный синдикат препаратов' },
];

export interface OreDef {
  id: string;
  name: string;
  tier: number;
  xpReq: number;
  sellPrice: number;
  stateBuyPrice: number;
  color: string;
}

export const ORES: OreDef[] = [
  { id: 'ore_1', name: 'Медь', tier: 1, xpReq: 0, sellPrice: 10, stateBuyPrice: 12, color: '#f97316' },
  { id: 'ore_2', name: 'Олово', tier: 2, xpReq: 250, sellPrice: 20, stateBuyPrice: 24, color: '#94a3b8' },
  { id: 'ore_3', name: 'Железо', tier: 3, xpReq: 750, sellPrice: 30, stateBuyPrice: 36, color: '#64748b' },
  { id: 'ore_4', name: 'Свинец', tier: 4, xpReq: 1500, sellPrice: 40, stateBuyPrice: 48, color: '#475569' },
  { id: 'ore_5', name: 'Серебро', tier: 5, xpReq: 3000, sellPrice: 50, stateBuyPrice: 60, color: '#e2e8f0' },
  { id: 'ore_6', name: 'Вольфрам', tier: 6, xpReq: 5000, sellPrice: 60, stateBuyPrice: 72, color: '#38bdf8' },
  { id: 'ore_7', name: 'Золото', tier: 7, xpReq: 7550, sellPrice: 70, stateBuyPrice: 84, color: '#eab308' },
  { id: 'ore_8', name: 'Платина', tier: 8, xpReq: 10000, sellPrice: 80, stateBuyPrice: 96, color: '#a855f7' },
  { id: 'ore_9', name: 'Алмаз', tier: 9, xpReq: 12500, sellPrice: 90, stateBuyPrice: 108, color: '#06b6d4' },
  { id: 'ore_10', name: 'Изумруд', tier: 10, xpReq: 15000, sellPrice: 100, stateBuyPrice: 120, color: '#10b981' },
];

export interface DrillDef {
  id: string;
  name: string;
  cost: number;
  rate: number; // units/hr total
  maxTier: number;
  fuelCostTotal: number;
  repairRub: number;
  repairOre?: { id: string; qty: number };
}

export const DRILLS: DrillDef[] = [
  { id: 'dr_1', name: 'Мотобур «Крот-1»', cost: 250_000, rate: 120, maxTier: 3, fuelCostTotal: 7_200, repairRub: 15_000 },
  { id: 'dr_2', name: 'Карьерный «Витязь-200»', cost: 1_800_000, rate: 350, maxTier: 6, fuelCostTotal: 36_000, repairRub: 50_000, repairOre: { id: 'ore_4', qty: 100 } },
  { id: 'dr_3', name: 'Роторный «Урал-М»', cost: 8_500_000, rate: 900, maxTier: 8, fuelCostTotal: 162_000, repairRub: 150_000, repairOre: { id: 'ore_6', qty: 50 } },
  { id: 'dr_4', name: 'Комбайн «Титан-10»', cost: 35_000_000, rate: 2200, maxTier: 10, fuelCostTotal: 540_000, repairRub: 400_000, repairOre: { id: 'ore_9', qty: 20 } },
];

export interface PressDef {
  id: string;
  name: string;
  cost: number;
  income: number;
  mats: { [oreId: string]: number };
  repRub: number;
  repMats: { [oreId: string]: number };
}

export const PRESSES: PressDef[] = [
  { id: 'pr_1', name: 'KBA-NotaSys SA', cost: 250_000, income: 3_500, mats: { ore_1: 5000, ore_3: 500 }, repRub: 15_000, repMats: { ore_4: 200 } },
  { id: 'pr_2', name: 'Inter', cost: 750_000, income: 8_500, mats: { ore_2: 5000, ore_4: 500 }, repRub: 35_000, repMats: { ore_4: 500, ore_5: 100 } },
  { id: 'pr_3', name: 'New World', cost: 1_500_000, income: 16_000, mats: { ore_2: 5000, ore_3: 10000, ore_4: 1000 }, repRub: 60_000, repMats: { ore_4: 800, ore_5: 200 } },
  { id: 'pr_4', name: 'Versa-SP', cost: 5_000_000, income: 50_000, mats: { ore_3: 10000, ore_5: 1000, ore_6: 300 }, repRub: 150_000, repMats: { ore_5: 500, ore_6: 150 } },
  { id: 'pr_5', name: 'Sensys LBP-1', cost: 12_000_000, income: 115_000, mats: { ore_4: 5000, ore_5: 2000, ore_6: 1000, ore_7: 500 }, repRub: 300_000, repMats: { ore_6: 300, ore_7: 200 } },
  { id: 'pr_6', name: 'Epson Industrial', cost: 35_000_000, income: 320_000, mats: { ore_5: 20000, ore_7: 2000, ore_8: 2500, ore_9: 200 }, repRub: 800_000, repMats: { ore_7: 500, ore_8: 300, ore_9: 50 } },
  { id: 'pr_7', name: 'SICPA Flagship', cost: 120_000_000, income: 1_000_000, mats: { ore_3: 50000, ore_7: 5000, ore_8: 5000, ore_10: 1000 }, repRub: 2_500_000, repMats: { ore_8: 500, ore_9: 200, ore_10: 150 } },
];

export interface ServerDef {
  id: string;
  name: string;
  cost: number;
  goldReq: number;
  btcPerHour: number;
  opexRub: number;
}

export const SERVERS: ServerDef[] = [
  { id: 'srv_1', name: 'GBMiners', cost: 15_000_000, goldReq: 50, btcPerHour: 0.12, opexRub: 18_000 },
  { id: 'srv_2', name: 'Slush Pool', cost: 45_000_000, goldReq: 150, btcPerHour: 0.35, opexRub: 52_500 },
  { id: 'srv_3', name: 'ViaBTC', cost: 120_000_000, goldReq: 300, btcPerHour: 0.90, opexRub: 135_000 },
  { id: 'srv_4', name: 'BTCC', cost: 300_000_000, goldReq: 600, btcPerHour: 2.20, opexRub: 330_000 },
  { id: 'srv_5', name: 'BW Pool', cost: 750_000_000, goldReq: 1200, btcPerHour: 5.20, opexRub: 780_000 },
  { id: 'srv_6', name: 'BitFury Pool', cost: 1_800_000_000, goldReq: 2500, btcPerHour: 12.0, opexRub: 1_800_000 },
  { id: 'srv_7', name: 'AntPool', cost: 4_500_000_000, goldReq: 5000, btcPerHour: 28.0, opexRub: 4_200_000 },
  { id: 'srv_8', name: 'JetPool-Billionaire', cost: 12_000_000_000, goldReq: 10000, btcPerHour: 70.0, opexRub: 10_500_000 },
];

export interface CarDef {
  id: string;
  name: string;
  cost: number;
  hp: number;
  winBonus: number;
  prizeMult: number;
  isForeign?: boolean;
  taxiBonus?: number;
  driverBonus?: number;
  repairDisc?: number;
  fuelSave?: boolean;
  stageBoost?: number;
  noShiftWear?: boolean;
  halfRaceWear?: boolean;
  raidReduce?: number;
  dpsImmune?: boolean;
  desc: string;
}

export const CARS: CarDef[] = [
  { id: 'c_1', name: 'ВАЗ-2107 («Семерка»)', cost: 65_000, hp: 74, winBonus: 0.0, prizeMult: 1.0, desc: 'Базовый доступ к работе в такси' },
  { id: 'c_2', name: 'ВАЗ-2114 («Четырка»)', cost: 130_000, hp: 89, winBonus: 0.01, prizeMult: 1.0, repairDisc: 0.50, desc: 'Скидка 50% на ремонт в гараже' },
  { id: 'c_3', name: 'Lada Vesta', cost: 260_000, hp: 106, winBonus: 0.02, prizeMult: 1.0, taxiBonus: 0.10, desc: '+10% к оплате смен в такси' },
  { id: 'c_4', name: 'Volkswagen Polo', cost: 450_000, hp: 110, winBonus: 0.02, prizeMult: 1.0, isForeign: true, fuelSave: true, desc: 'Допуск к Частному водителю; расход топлива снижен в 2 раза' },
  { id: 'c_5', name: 'Hyundai Solaris', cost: 650_000, hp: 123, winBonus: 0.02, prizeMult: 1.0, isForeign: true, desc: 'Надежная городская иномарка' },
  { id: 'c_6', name: 'Skoda Octavia 1.8T', cost: 1_200_000, hp: 180, winBonus: 0.03, prizeMult: 1.0, isForeign: true, stageBoost: 0.20, desc: 'Stage 1-3 дает +20% л.с. вместо +15%' },
  { id: 'c_7', name: 'Toyota Camry 3.5', cost: 2_200_000, hp: 249, winBonus: 0.03, prizeMult: 1.0, isForeign: true, driverBonus: 0.20, desc: '+20% к оплате смен частного водителя' },
  { id: 'c_8', name: 'BMW 330i (G20)', cost: 3_800_000, hp: 258, winBonus: 0.03, prizeMult: 1.0, isForeign: true, driverBonus: 0.20, desc: 'Спортивный седан; +20% к водителю и +3% в гонках' },
  { id: 'c_9', name: 'Mercedes-Benz E300', cost: 6_500_000, hp: 299, winBonus: 0.04, prizeMult: 1.0, isForeign: true, driverBonus: 0.20, noShiftWear: true, desc: '0% износа на сменах водителя' },
  { id: 'c_10', name: 'BMW M5 F90', cost: 11_000_000, hp: 600, winBonus: 0.05, prizeMult: 1.0, isForeign: true, driverBonus: 0.20, desc: 'Мощный седан для побед на автодроме' },
  { id: 'c_11', name: 'Audi RS6 Avant', cost: 18_000_000, hp: 600, winBonus: 0.07, prizeMult: 1.0, isForeign: true, driverBonus: 0.20, desc: 'Полный привод: +7% к шансу победы' },
  { id: 'c_12', name: 'Porsche Cayenne Turbo', cost: 26_000_000, hp: 550, winBonus: 0.06, prizeMult: 1.0, isForeign: true, halfRaceWear: true, desc: 'Износ в гонках снижен в 2 раза (-1.5%)' },
  { id: 'c_13', name: 'Mercedes-AMG G63', cost: 38_000_000, hp: 585, winBonus: 0.06, prizeMult: 1.0, isForeign: true, raidReduce: 0.05, desc: 'Снижает вероятность рейда Прокурора на -5%' },
  { id: 'c_14', name: 'Porsche 911 Turbo S', cost: 55_000_000, hp: 650, winBonus: 0.10, prizeMult: 1.0, isForeign: true, driverBonus: 0.20, desc: 'Легендарный спорткар' },
  { id: 'c_15', name: 'McLaren 720S', cost: 85_000_000, hp: 720, winBonus: 0.12, prizeMult: 1.0, isForeign: true, driverBonus: 0.20, desc: 'Суперкар аэрокосмического класса' },
  { id: 'c_16', name: 'Ferrari SF90 Stradale', cost: 130_000_000, hp: 1000, winBonus: 0.14, prizeMult: 1.25, isForeign: true, desc: 'Приз за победу в гонке x1.25' },
  { id: 'c_17', name: 'Lamborghini Revuelto', cost: 200_000_000, hp: 1015, winBonus: 0.16, prizeMult: 1.50, isForeign: true, desc: 'Приз за победу в гонке x1.50' },
  { id: 'c_18', name: 'Rolls-Royce Phantom VIII', cost: 450_000_000, hp: 571, winBonus: 0.08, prizeMult: 1.25, isForeign: true, dpsImmune: true, desc: 'Полный иммунитет к штрафам ГИБДД при езде без документов' },
  { id: 'c_19', name: 'Bugatti Chiron', cost: 600_000_000, hp: 1500, winBonus: 0.18, prizeMult: 2.00, isForeign: true, desc: 'Удвоение призовых на автодроме (x2.00)' },
  { id: 'c_20', name: 'Koenigsegg Jesko', cost: 800_000_000, hp: 1600, winBonus: 0.20, prizeMult: 3.00, isForeign: true, desc: 'Утроение призовых выплат на автодроме (x3.00)' },
];

export interface EstateDef {
  id: string;
  name: string;
  cost: number;
  safe: number; // strictly 10% of property cost
  sleepBonus: number; // 0 to 20%
  coffee: boolean;
  coffeeRestore: number; // 10 to 20 energy
  desc: string;
}

export const ESTATES: EstateDef[] = [
  { id: 'e_1', name: 'Койко-место в хостеле', cost: 0, safe: 0, sleepBonus: 0, coffee: false, coffeeRestore: 0, desc: 'Бесплатное койко-место (120 с за +1⚡)' },
  { id: 'e_2', name: 'Комната в коммуналке', cost: 150_000, safe: 15_000, sleepBonus: 2, coffee: false, coffeeRestore: 0, desc: 'Сейф на 15 000 ₽, +2% к сну' },
  { id: 'e_3', name: 'Студия на окраине', cost: 650_000, safe: 65_000, sleepBonus: 5, coffee: true, coffeeRestore: 10, desc: 'Сейф 65k ₽, Кофе +10⚡ раз в 24ч' },
  { id: 'e_4', name: '1-комнатная квартира', cost: 2_500_000, safe: 250_000, sleepBonus: 7, coffee: true, coffeeRestore: 12, desc: 'Сейф 250k ₽, Кофе +12⚡' },
  { id: 'e_5', name: '3-комнатная квартира', cost: 8_000_000, safe: 800_000, sleepBonus: 9, coffee: true, coffeeRestore: 14, desc: 'Сейф 800k ₽, Кофе +14⚡' },
  { id: 'e_6', name: 'Лофт в промзоне', cost: 18_000_000, safe: 1_800_000, sleepBonus: 11, coffee: true, coffeeRestore: 15, desc: 'Сейф 1.8M ₽, Кофе +15⚡' },
  { id: 'e_7', name: 'Апартаменты в Сити', cost: 45_000_000, safe: 4_500_000, sleepBonus: 13, coffee: true, coffeeRestore: 16, desc: 'Сейф 4.5M ₽, Кофе +16⚡' },
  { id: 'e_8', name: 'Пентхаус с вертолетом', cost: 120_000_000, safe: 12_000_000, sleepBonus: 15, coffee: true, coffeeRestore: 18, desc: 'Сейф 12M ₽, Кофе +18⚡' },
  { id: 'e_9', name: 'Особняк в поселке', cost: 350_000_000, safe: 35_000_000, sleepBonus: 18, coffee: true, coffeeRestore: 19, desc: 'Сейф 35M ₽, Кофе +19⚡' },
  { id: 'e_10', name: 'Вилла на острове', cost: 1_000_000_000, safe: 100_000_000, sleepBonus: 20, coffee: true, coffeeRestore: 20, desc: 'Сейф 100M ₽, Кофе +20⚡, сон 96 сек' },
];

export interface PrestigeDef {
  num: number;
  rank: string;
  title: string;
  nw: number;
  tradeInRate: number;
}

export const PRESTIGE: PrestigeDef[] = [
  { num: 0, rank: '—', title: 'Без ранга', nw: 0, tradeInRate: 0.70 },
  { num: 1, rank: 'I', title: 'Собственник', nw: 2_000_000, tradeInRate: 0.70 },
  { num: 2, rank: 'II', title: 'Резидент', nw: 4_000_000, tradeInRate: 0.70 },
  { num: 3, rank: 'III', title: 'Рантье', nw: 12_000_000, tradeInRate: 0.70 },
  { num: 4, rank: 'IV', title: 'Бизнес-элита', nw: 24_000_000, tradeInRate: 0.70 },
  { num: 5, rank: 'V', title: 'Синдикат', nw: 72_000_000, tradeInRate: 0.70 },
  { num: 6, rank: 'VI', title: 'Магнат', nw: 144_000_000, tradeInRate: 0.70 }, // Free casino
  { num: 7, rank: 'VII', title: 'Олигарх', nw: 432_000_000, tradeInRate: 0.70 }, // Unlocks Megacity project
  { num: 8, rank: 'VIII', title: 'Сенатор', nw: 864_000_000, tradeInRate: 0.80 }, // Trade-in 80%
  { num: 9, rank: 'IX', title: 'Титан', nw: 2_592_000_000, tradeInRate: 0.80 },
  { num: 10, rank: 'X', title: 'Апекс', nw: 5_184_000_000, tradeInRate: 0.80 },
];

export interface FactionDef {
  id: string;
  name: string;
  alignment: 'legal' | 'finance' | 'criminal' | 'mining';
  reqKarma?: number;
  reqKarmaMax?: number;
  reqPrestige?: number;
  reqMineXp?: number;
  perks: string[];
  desc: string;
}

export const FACTIONS: FactionDef[] = [
  {
    id: 'f_gov',
    name: 'Правительство и Мэрия',
    alignment: 'legal',
    reqKarma: 1000,
    perks: ['Снижение налога легального бизнеса с 13% до 6%', 'Полный иммунитет к штрафам ГИБДД в гонках'],
    desc: 'Власть и официальный закон мегаполиса',
  },
  {
    id: 'f_fin',
    name: 'Финансовый Консорциум',
    alignment: 'finance',
    reqKarma: 1,
    reqPrestige: 5,
    perks: ['Повышение ставки Банковского депозита до 1.00% в сутки', 'Скидка 2% на покупку любого авто и недвижимости'],
    desc: 'Клуб крупнейших инвесторов и банкиров',
  },
  {
    id: 'f_synd',
    name: 'Нелегальный Синдикат',
    alignment: 'criminal',
    reqKarmaMax: -1000,
    perks: ['Снижение потолка рейдов Прокуратуры с 40% до 25%', '+15% к оплате всех нелегальных смен'],
    desc: 'Нелегальное правительство трущоб и черного рынка',
  },
  {
    id: 'f_mine',
    name: 'Шахтерский Профсоюз',
    alignment: 'mining',
    reqMineXp: 5000,
    perks: ['+10% к выходу руды при ручной копке', '-15% к износу коронок буров', '-10% к требуемой руде на сборку принтеров'],
    desc: 'Братство горняков и тяжелой индустрии',
  },
];

export interface DonatePackDef {
  id: string;
  name: string;
  costEur: number;
  badge: string;
  desc: string;
  usdOffshore?: number;
  rubCash?: number;
  eurCashback?: number;
  businessId?: string;
  pressId?: string;
  permanentItem?: string;
}

export const DONATE_PACKS: DonatePackDef[] = [
  {
    id: 'pack_support',
    name: 'Support-Pack',
    costEur: 100,
    badge: 'Помощник',
    desc: '5 000 $ на легальный оффшорный счет + 25 € кэшбэк на счет + статус «Помощник»',
    usdOffshore: 5000,
    eurCashback: 25,
  },
  {
    id: 'pack_azart',
    name: 'Azart-Pack VIP',
    costEur: 400,
    badge: 'VIP Игрок',
    desc: 'Вечный допуск в Казино + активация механики Сейв-Х (+0.15x на проигрышных слотах)',
    permanentItem: 'azart_pack',
  },
  {
    id: 'pack_business',
    name: 'Businessman-Pack',
    costEur: 500,
    badge: 'Бизнесмен',
    desc: 'Легальный бизнес №3 «Барбершоп» + готовый собранный Принтер №2 «Inter» со 100% прочностью',
    businessId: 'b_3',
    pressId: 'pr_2',
  },
  {
    id: 'pack_kingsman',
    name: 'KingsMan Don-Pack',
    costEur: 800,
    badge: 'Донатер',
    desc: '50 000 $ в Оффшор + 5 000 000 ₽ наличными + 250 € кэшбэка + статус «Донатер»',
    usdOffshore: 50000,
    rubCash: 5000000,
    eurCashback: 250,
  },
  {
    id: 'pack_millionaire',
    name: 'Millionaire-Pack',
    costEur: 850,
    badge: 'Магнат',
    desc: 'Легальный бизнес №8 «Отель» (22M ₽) + готовый собранный Принтер №4 «Versa-SP» (5M ₽)',
    businessId: 'b_8',
    pressId: 'pr_4',
  },
];

export const COURSES = [
  { id: 'course_2', name: 'Курс №2: Расклейка объявлений', cost: 5_000, opensJob: 'leg_2' },
  { id: 'course_3', name: 'Курс №3: Доставка пиццы', cost: 25_000, opensJob: 'leg_3' },
  { id: 'course_4', name: 'Курс №4: Курьерская служба', cost: 45_000, opensJob: 'leg_4' },
  { id: 'course_5', name: 'Курс №5: Таксопарк', cost: 75_000, opensJob: 'leg_5' },
  { id: 'course_6', name: 'Курс №6: Личный водитель', cost: 150_000, opensJob: 'leg_6' },
  { id: 'course_7', name: 'Курс №7: Разработка ПО', cost: 350_000, opensJob: 'leg_7' },
  { id: 'course_8', name: 'Курс №8: Общественная работа', cost: 500_000, opensJob: 'leg_8' },
];

export const UNI_LEVELS = [
  { level: 1, name: 'I ступень: Бакалавриат', cost: 50_000, opensJob: 'leg_9' },
  { level: 2, name: 'II ступень: Специалитет', cost: 150_000, opensJob: 'leg_10' },
  { level: 3, name: 'III ступень: Магистратура', cost: 500_000, opensJob: 'leg_11' },
  { level: 4, name: 'IV ступень: Аспирантура', cost: 2_000_000, opensJob: 'leg_12' },
  { level: 5, name: 'V ступень: Профессура', cost: 10_000_000, opensJob: 'leg_13' },
];

export const SPECS = [
  { id: 'spec_1', name: 'Специальная подготовка 1', cost: 5_000_000, opensJob: 'leg_14' },
  { id: 'spec_2', name: 'Специальная подготовка 2', cost: 10_000_000, opensJob: 'leg_15' },
  { id: 'spec_3', name: 'Специальная подготовка 3', cost: 25_000_000, opensJob: 'leg_16' },
];

export const INVEST_PLANS = [
  { id: 'inv_1', name: 'Городские Облигации Мегаполиса', minRub: 100_000, dailyYield: 0.005, desc: 'Надежные бумаги городской мэрии (+0.5% в сутки)' },
  { id: 'inv_2', name: 'Фонд Недвижимости и Земли', minRub: 1_000_000, dailyYield: 0.010, desc: 'Пул коммерческой недвижимости (+1.0% в сутки)' },
  { id: 'inv_3', name: 'Венчурный Индекс Высоких Технологий', minRub: 10_000_000, dailyYield: 0.016, desc: 'Инвестиции в дата-центры и ИИ (+1.6% в сутки)' },
];

export const FAQ_DATA = [
  {
    q: 'С чего лучше всего начать игру новичку?',
    a: 'Начните с раздачи листовок и ручной копки меди в Шахте. Заработав первые 5 000 ₽, изучите Курс №2, чтобы удвоить доход. Не держите миллионы на руках — уличные карманники могут похитить 15% налички! Купите Комнату в коммуналке и прячьте деньги в Сейф.',
  },
  {
    q: 'Как работает защита от инфляции и банковское хранилище?',
    a: 'Банковский Депозит дает до +0.75% в сутки (до 50 млн ₽). Хранилище Банка (₽ и $) позволяет держать любые суммы от 10 млн до 1 трлн ₽ с защитой от краж, но списывает 0.2% в сутки (посекундно) за безопасность, стимулируя пускать капитал в оборот.',
  },
  {
    q: 'Как работают двухсекторные буры и почему важна руда?',
    a: 'Буровые установки могут добывать 2 разные руды одновременно (50/50). Смена руды занимает 5 минут перенастройки и доступна раз в час. Руда критически необходима: из нее собираются и ремонтируются Принтеры, а Золото (тир 7) нужно для монтажа серверов ₿.',
  },
  {
    q: 'Как работает кредит и процедура банкротства?',
    a: 'Вы можете взять кредит в размере от 10% до 30% от капитала. Процент начисляется постоянно (3.5% за каждые 12 часов). Если долг не погасить, можно 1 раз за игру объявить банкротство: после 5-минутного таймера долг спишется, но вы потеряете 50% всех валют, руды, инвестиций и все бизнесы, авто, принтеры и сервера.',
  },
  {
    q: 'Как открыть доступ к Серверам Биткоина ₿?',
    a: 'Необходимо купить легальный бизнес №9 «IT-компания». После этого на вкладке «Сервера» вам откроется монтаж стоек. Обратите внимание: для монтажа требуется Золото из шахты, а при инкассации намайненного ₿ удерживается плата за свет (OpEx), которую можно снизить бизнесами ГЭС (-25%) и АЭС (-50%).',
  },
  {
    q: 'Безопасна ли синхронизация с Google Диском?',
    a: 'Да! Доступ к Google Диску осуществляется строго через ваш личный Google аккаунт. Файлы создаются в вашей собственной папке game/ на Диске. Файл metropolis_save_v016.dat зашифрован и снабжен криптографической подписью, защищающей от читов и повреждений.',
  },
];

export interface CityInfraProject {
  id: string;
  districtId: 'center' | 'industry' | 'mall' | 'garage' | 'gov' | 'campus';
  districtName: string;
  name: string;
  costRub: number;
  bonusMultiplier: number; // e.g. 0.05 (+5% global passive business income)
  bonusDescription: string;
  desc: string;
}

export const CITY_INFRASTRUCTURE_PROJECTS: CityInfraProject[] = [
  {
    id: 'infra_center_grid',
    districtId: 'center',
    districtName: 'Центр',
    name: 'Энергосеть',
    costRub: 5_000_000,
    bonusMultiplier: 0.05,
    bonusDescription: '+5% к пассивному доходу всех бизнесов',
    desc: 'Модернизация высоковольтной кабельной сети финансового центра.',
  },
  {
    id: 'infra_industry_logistics',
    districtId: 'industry',
    districtName: 'Промзона',
    name: 'Магистраль',
    costRub: 15_000_000,
    bonusMultiplier: 0.08,
    bonusDescription: '+8% к доходу бизнесов и защита станков',
    desc: 'Строительство скоростной грузовой ветки между шахтой и заводами.',
  },
  {
    id: 'infra_mall_hub',
    districtId: 'mall',
    districtName: 'Молл',
    name: 'Кластер',
    costRub: 35_000_000,
    bonusMultiplier: 0.10,
    bonusDescription: '+10% к доходу коммерции и торгового центра',
    desc: 'Обустройство пешеходных променадов и расширение потока покупателей.',
  },
  {
    id: 'infra_garage_ring',
    districtId: 'garage',
    districtName: 'Гараж',
    name: 'Кольцо',
    costRub: 75_000_000,
    bonusMultiplier: 0.12,
    bonusDescription: '+12% к доходу холдингов и ускорение заездов',
    desc: 'Строительство скоростного асфальтового кольца и испытательного полигона.',
  },
  {
    id: 'infra_campus_datacenter',
    districtId: 'campus',
    districtName: 'Кампус',
    name: 'Технопарк',
    costRub: 150_000_000,
    bonusMultiplier: 0.15,
    bonusDescription: '+15% к доходу бизнесов и бонус серверам',
    desc: 'Оптоволоконный квантовый вычислительный комплекс для ученых.',
  },
  {
    id: 'infra_gov_embankment',
    districtId: 'gov',
    districtName: 'Мэрия',
    name: 'Набережная',
    costRub: 300_000_000,
    bonusMultiplier: 0.20,
    bonusDescription: '+20% ко всей экономической империи мегаполиса',
    desc: 'Генеральная реконструкция набережной и административного комплекса.',
  },
];

export function calcInfrastructureMultiplier(cityInfrastructure?: { [id: string]: boolean }): number {
  if (!cityInfrastructure) return 1.0;
  let mult = 1.0;
  CITY_INFRASTRUCTURE_PROJECTS.forEach((p) => {
    if (cityInfrastructure[p.id]) {
      mult += p.bonusMultiplier;
    }
  });
  return mult;
}
