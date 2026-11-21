/**
 * METROPOLIS v0.16 — Полная система типов игрового состояния и сущностей
 */

export type Gender = 'M' | 'F';

export interface BusinessSlot {
  id: string;
  cashboxRub: number;
  cashboxUsd: number;
  nextRaidRoll: number;
  openedAt: number;
}

export interface DrillState {
  id: string;
  fuelSeconds: number;
  bitDurability: number;
  sector1Ore: string;
  sector2Ore: string;
  lastSwapTime: number;
  swapCooldownUntil: number;
  reconfigUntil: number; // 5-minute technological warmup when reconfigured
}

export interface PressState {
  id: string;
  durability: number; // 0 to 100%
  trayRub: number;
}

export interface CarState {
  id: string;
  hp: number;
  stage: number; // 0 to 3
  fuel: number; // 0 to 40 liters
  cond: number; // 0 to 100%
  plateNumber: string | null;
  purchasedAt: number;
}

export interface LoanState {
  active: boolean;
  principal: number;
  accruedInterest: number;
  lastAccrualTime: number;
  borrowedAt: number;
  bankruptcyPending: boolean;
  bankruptcyExpiresAt: number;
}

export interface VaultState {
  rub: number;
  usd: number;
  lastMaintenanceTime: number;
}

export interface InvestmentPosition {
  id: string;
  amountRub: number;
  investedAt: number;
  accumulatedYield: number;
}

export interface LogEntry {
  id: string;
  time: number;
  desc: string;
  amountText: string;
  isPos: boolean;
}

export interface FineEntry {
  id: string;
  time: number;
  source: 'ГИБДД' | 'Прокуратура' | 'МВД';
  desc: string;
  amountText: string;
}

export interface MegacityState {
  unlocked: boolean;
  cityName: string;
  foundedAt: number;
  tier: number; // 0 to 5
  population: number;
  sovereignBondsRub: number;
  phaseProgress: { [phaseId: string]: boolean };
}

export interface ActiveBuff {
  id: string;
  name: string;
  source: string;
  desc: string;
  icon: string;
  type: 'economy' | 'speed' | 'safety' | 'power';
}

export interface GameState {
  schemaVersion: number;
  accountUid: string; // Permanent immutable UUID
  id: string; // Current 5-digit or special ID
  idHistory: string[]; // Track all IDs ever owned to prevent ban evasion
  passportSerial: string;
  phone: string;
  username: string;
  gender: Gender;
  isRegistered: boolean;
  isBanned: boolean;
  banReason: string;
  banExpiresAt: number;
  warns: number; // 0 to 3
  karma: number; // signed integer (-10k to +10k)
  drivingXp: number; // 0 to 100

  // Currencies
  rub: number;
  depositRub: number;
  usdCash: number;
  usdOffshore: number;
  btc: number;
  unclaimedBtc: number;
  eur: number; // Donate currency (does not count toward in-game net worth)

  // Energy & Timing
  energy: number; // 0 to 100
  lastEnergyTick: number;
  lastSaveTime: number;
  lastCoffeeAt: number;
  lastDepositPayoutTime: number;
  lastWheelSpinAt: number;
  casinoPassUntil: number;
  lastTheftTime: number;
  theftCooldownUntil: number;

  // Banking & Holdings
  vault: VaultState;
  loan: LoanState;
  investments: InvestmentPosition[];

  // Career & Production
  jobId: string;
  jobShifts: { [jobId: string]: number };
  businesses: BusinessSlot[]; // Multi-business holding with (n-1)*2% synergy
  mineXp: number;
  vein: number;
  ores: { [oreId: string]: number };
  drill: DrillState | null;
  press: PressState | null;
  servers: { [serverId: string]: number };
  maxRacks: number;
  serverAccumSec: number;

  // Assets
  estateId: string;
  homeSafeRub: number;
  car: CarState | null;
  ownedPlates: string[];
  inventory: string[];
  purchaseDates: { [key: string]: number };

  // Factions & Civic
  activeFaction: string | null;
  hasDriverLicense: boolean;
  hasMilitaryTicket: boolean;
  eduLevel: number; // 0 to 5
  unlockedCourses: string[];
  unlockedSpecs: string[];

  // City Expansion & Infrastructure
  cityInfrastructure: { [projectId: string]: boolean };

  // Endgame & Records
  megacity: MegacityState;
  activityLog: LogEntry[];
  finesLog: FineEntry[];
  raidCounters: {
    prosecutorRaids: number;
    mvdRaids: number;
    theftsSuffered: number;
    theftRubLost: number;
    theftUsdLost: number;
  };
}

export type DistrictId = 'center' | 'industry' | 'mall' | 'garage' | 'gov' | 'campus';

export type ActiveTab =
  | 'profile'
  | 'city'
  | 'world'
  | 'career'
  | 'bank'
  | 'mall'
  | 'gov'
  | 'education'
  | 'dealers'
  | 'garage'
  | 'maintenance'
  | 'invest'
  | 'estate'
  | 'megacity'
  | 'faq'
  | 'admin';

export type CareerSubTab = 'work' | 'business' | 'mine' | 'printers' | 'servers';
export type MallSubTab = 'casino' | 'wheel' | 'blackjack' | 'poker' | 'market' | 'store' | 'black' | 'auction';
export type DealersSubTab = 'estate' | 'cars';
