/**
 * METROPOLIS v0.16 — Главный расчетный движок игры (Engine Core)
 * Реализует непрерывный посекундный расчет всех величин, офлайн-прогресс,
 * защиту от инфляции, синергии холдингов и крипто-котировки.
 */

import { CONFIG, BUSINESSES, CARS, DRILLS, ESTATES, FACTIONS, ORES, PRESSES, PRESTIGE, SERVERS, PrestigeDef, calcInfrastructureMultiplier } from '../data/gameData';
export { CONFIG };
import { ActiveBuff, FineEntry, GameState, LogEntry } from '../types/game';

const STORAGE_KEY = 'metropolis_save_v16';

export function generatePassportSerial(): string {
  const p1 = Math.floor(10 + Math.random() * 89);
  const p2 = Math.floor(10 + Math.random() * 89);
  const num = Math.floor(100000 + Math.random() * 899999);
  return `${p1} ${p2} ${num}`;
}

export function generateAccountUid(): string {
  return 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export function getInitialState(): GameState {
  const initId = String(Math.floor(10000 + Math.random() * 89999));
  const uid = generateAccountUid();
  const now = Date.now();

  return {
    schemaVersion: 16,
    accountUid: uid,
    id: initId,
    idHistory: [initId],
    passportSerial: generatePassportSerial(),
    phone: '',
    username: 'Гражданин',
    gender: 'M',
    isRegistered: false,
    isBanned: false,
    banReason: '',
    banExpiresAt: 0,
    warns: 0,
    karma: 0,
    drivingXp: 0,

    rub: 5000,
    depositRub: 0,
    usdCash: 0,
    usdOffshore: 0,
    btc: 0.0,
    unclaimedBtc: 0.0,
    eur: 0,

    energy: 100,
    lastEnergyTick: now,
    lastSaveTime: now,
    lastCoffeeAt: 0,
    lastDepositPayoutTime: now,
    lastWheelSpinAt: 0,
    casinoPassUntil: 0,
    lastTheftTime: 0,
    theftCooldownUntil: 0,

    vault: {
      rub: 0,
      usd: 0,
      lastMaintenanceTime: now,
    },
    loan: {
      active: false,
      principal: 0,
      accruedInterest: 0,
      lastAccrualTime: now,
      borrowedAt: 0,
      bankruptcyPending: false,
      bankruptcyExpiresAt: 0,
    },
    investments: [],

    jobId: 'leg_1',
    jobShifts: { leg_1: 0 },
    businesses: [],
    mineXp: 0,
    vein: 50000,
    ores: {
      ore_1: 0,
      ore_2: 0,
      ore_3: 0,
      ore_4: 0,
      ore_5: 0,
      ore_6: 0,
      ore_7: 0,
      ore_8: 0,
      ore_9: 0,
      ore_10: 0,
    },
    drill: null,
    press: null,
    servers: {},
    maxRacks: 5,
    serverAccumSec: 0,

    estateId: 'e_1',
    homeSafeRub: 0,
    car: null,
    ownedPlates: [],
    inventory: [],
    purchaseDates: { e_1: now },

    activeFaction: null,
    hasDriverLicense: false,
    hasMilitaryTicket: false,
    eduLevel: 0,
    unlockedCourses: [],
    unlockedSpecs: [],

    cityInfrastructure: {},

    megacity: {
      unlocked: false,
      cityName: 'Новый Метрополис',
      foundedAt: 0,
      tier: 0,
      population: 0,
      sovereignBondsRub: 0,
      phaseProgress: {},
    },
    activityLog: [],
    finesLog: [],
    raidCounters: {
      prosecutorRaids: 0,
      mvdRaids: 0,
      theftsSuffered: 0,
      theftRubLost: 0,
      theftUsdLost: 0,
    },
  };
}

/**
 * Расчет совокупного капитала гражданина
 * (Включает наличные, депозиты, сейфы, хранилища, активы, авто с тюнингом,
 * НЕВЫВЕДЕННЫЕ КАССЫ БИЗНЕСОВ и ЛОТОК ПРИНТЕРА. EUR исключен per spec).
 */
export function calcTotalCapital(state: GameState): number {
  const rates = getMarketRates(state.inventory.includes('license_zero_spread'));

  let total = state.rub + state.depositRub + state.homeSafeRub + state.vault.rub;
  total += (state.usdCash + state.usdOffshore + state.vault.usd) * rates.usdSell;
  total += (state.btc + state.unclaimedBtc) * rates.btcSell;

  // Недвижимость
  const est = ESTATES.find((e) => e.id === state.estateId);
  if (est) total += est.cost;

  // Автомобиль (+70% вложений в Stage)
  if (state.car) {
    const cDef = CARS.find((c) => c.id === state.car!.id);
    if (cDef) {
      let carVal = cDef.cost;
      if (state.car.stage === 1) carVal += Math.floor(150000 * 0.7);
      if (state.car.stage === 2) carVal += Math.floor((150000 + 300000) * 0.7);
      if (state.car.stage === 3) carVal += Math.floor((150000 + 300000 + 450000) * 0.7);
      total += carVal;
    }
  }

  // Бизнесы и неснятые кассы
  state.businesses.forEach((b) => {
    const bDef = BUSINESSES.find((item) => item.id === b.id);
    if (bDef) {
      total += bDef.cost;
      total += b.cashboxRub;
      total += b.cashboxUsd * rates.usdSell;
    }
  });

  // Принтер и лоток
  if (state.press) {
    const pDef = PRESSES.find((p) => p.id === state.press!.id);
    if (pDef) {
      total += pDef.cost;
      total += state.press.trayRub;
    }
  }

  // Бур
  if (state.drill) {
    const dDef = DRILLS.find((d) => d.id === state.drill!.id);
    if (dDef) total += dDef.cost;
  }

  // Серверы
  Object.entries(state.servers).forEach(([sId, count]) => {
    const sDef = SERVERS.find((s) => s.id === sId);
    if (sDef && count > 0) {
      total += sDef.cost * count;
    }
  });

  // Инвестиционный портфель
  state.investments.forEach((inv) => {
    total += inv.amountRub + inv.accumulatedYield;
  });

  return Math.max(0, Math.floor(total));
}

/**
 * Получение информации о ранге Престижа
 */
export function getPrestigeInfo(capital: number): PrestigeDef {
  for (let i = PRESTIGE.length - 1; i >= 0; i--) {
    if (capital >= PRESTIGE[i].nw) {
      return PRESTIGE[i];
    }
  }
  return PRESTIGE[0];
}

/**
 * Скорость регенерации 1 единицы энергии (в секундах)
 */
export function getEnergyRegenSec(state: GameState): number {
  const est = ESTATES.find((e) => e.id === state.estateId);
  const bonus = est ? est.sleepBonus : 0;
  return Math.max(80, Math.round(CONFIG.ENERGY_BASE_REGEN_SEC / (1 + bonus / 100)));
}

/**
 * 15-минутный детерминированный рынок валют Банка
 */
export function getMarketRates(hasZeroSpreadLicense: boolean) {
  const epoch = Math.floor(Date.now() / 900000); // 15-minute epoch
  const rnd = ((epoch * 9301 + 49297) % 233280) / 233280;

  const baseUsdMid = 78.0 + (rnd - 0.5) * 2.5; // ~76.75 to 79.25
  const baseBtcMid = 980000 + (rnd - 0.5) * 60000;

  if (hasZeroSpreadLicense) {
    // 0.5% межбанковский клиринг
    return {
      rnd,
      usdSell: Math.floor(baseUsdMid * 0.995 * 100) / 100,
      usdBuy: Math.ceil(baseUsdMid * 1.005 * 100) / 100,
      btcSell: Math.floor(baseBtcMid * 0.995),
      btcBuy: Math.ceil(baseBtcMid * 1.005),
      isZeroSpread: true,
    };
  }

  // Стандартные коридоры
  const usdSell = Math.round((75.0 + rnd * 3.0) * 100) / 100;
  const usdBuy = Math.round((80.0 + rnd * 3.0) * 100) / 100;
  const btcSell = Math.round(920000 + rnd * 40000);
  const btcBuy = Math.round(1040000 + rnd * 40000);

  return {
    rnd,
    usdSell,
    usdBuy,
    btcSell,
    btcBuy,
    isZeroSpread: false,
  };
}

/**
 * Главный секундный цикл онлайн-симуляции
 */
export function simulateSecond(state: GameState): GameState {
  if (state.isBanned) return state; // Freeze time while banned

  const now = Date.now();
  const next = { ...state };

  // 1. Непрерывная регенерация энергии
  if (next.energy < CONFIG.ENERGY_MAX) {
    const regenSec = getEnergyRegenSec(next);
    const passedMs = now - next.lastEnergyTick;
    if (passedMs >= regenSec * 1000) {
      const addedEnergy = Math.floor(passedMs / (regenSec * 1000));
      next.energy = Math.min(CONFIG.ENERGY_MAX, next.energy + addedEnergy);
      next.lastEnergyTick = now - (passedMs % (regenSec * 1000));
    }
  } else {
    next.lastEnergyTick = now;
  }

  // 2. Непрерывная комиссия Хранилища (0.2% в сутки / 86400)
  if (next.vault.rub > 0 || next.vault.usd > 0) {
    const vaultSec = Math.max(0, (now - next.vault.lastMaintenanceTime) / 1000);
    if (vaultSec >= 1) {
      const rubFee = next.vault.rub * (CONFIG.VAULT_DAILY_FEE_RATE / 86400) * vaultSec;
      const usdFee = next.vault.usd * (CONFIG.VAULT_DAILY_FEE_RATE / 86400) * vaultSec;
      next.vault = {
        rub: Math.max(0, Math.floor(next.vault.rub - rubFee)),
        usd: Math.max(0, Math.floor(next.vault.usd - usdFee)),
        lastMaintenanceTime: now,
      };
    }
  } else {
    next.vault.lastMaintenanceTime = now;
  }

  // 3. Непрерывный Банковский Депозит (+0.75% / сутки или +1.00% с Консорциумом)
  if (next.depositRub > 0 && next.depositRub < CONFIG.DEPOSIT_MAX_RUB) {
    const depSec = Math.max(0, (now - next.lastDepositPayoutTime) / 1000);
    if (depSec >= 1) {
      const dailyRate = next.activeFaction === 'f_fin' ? 0.010 : CONFIG.DEPOSIT_DAILY_RATE;
      const interest = next.depositRub * (dailyRate / 86400) * depSec;
      next.depositRub = Math.min(CONFIG.DEPOSIT_MAX_RUB, Math.floor(next.depositRub + interest));
      next.lastDepositPayoutTime = now;
    }
  } else {
    next.lastDepositPayoutTime = now;
  }

  // 4. Непрерывные проценты по кредиту (3.5% за 12 часов = 7% в сутки)
  if (next.loan.active && next.loan.principal > 0) {
    const loanSec = Math.max(0, (now - next.loan.lastAccrualTime) / 1000);
    if (loanSec >= 1) {
      const ratePerSec = (CONFIG.LOAN_HALF_DAY_RATE * 2) / 86400;
      const addedInterest = next.loan.principal * ratePerSec * loanSec;
      next.loan.accruedInterest = Math.floor(next.loan.accruedInterest + addedInterest);
      next.loan.lastAccrualTime = now;
    }
  }

  // Проверка таймера банкротства (5 минут)
  if (next.loan.bankruptcyPending && next.loan.bankruptcyExpiresAt > 0) {
    if (now >= next.loan.bankruptcyExpiresAt) {
      // Исполнение банкротства
      finalizeBankruptcy(next);
    }
  }

  // 5. Бизнесы (с холдинговой синергией +(N-1)*2% и мультипликатором инфраструктуры)
  const infraMultiplier = calcInfrastructureMultiplier(next.cityInfrastructure);
  const holdingBonus = Math.max(0, (next.businesses.length - 1) * 0.02);
  const mult = (1 + holdingBonus) * infraMultiplier;
  next.businesses = next.businesses.map((b) => {
    const bDef = BUSINESSES.find((item) => item.id === b.id);
    if (!bDef) return b;

    const maxRub = bDef.income * 24;
    const maxUsd = (bDef.income || 0) * 24;

    let updatedRub = b.cashboxRub;
    let updatedUsd = b.cashboxUsd;

    if (!bDef.isUsd && updatedRub < maxRub) {
      updatedRub = Math.min(maxRub, updatedRub + (bDef.income * mult) / 3600);
    } else if (bDef.isUsd && updatedUsd < maxUsd) {
      updatedUsd = Math.min(maxUsd, updatedUsd + (bDef.income * mult) / 3600);
    }

    return {
      ...b,
      cashboxRub: updatedRub,
      cashboxUsd: updatedUsd,
    };
  });

  // 6. Двухсекторный Бур
  if (next.drill && next.vein > 0 && next.drill.fuelSeconds > 0 && next.drill.bitDurability > 0) {
    if (now >= next.drill.reconfigUntil) {
      // Бур активен и бурит
      const dDef = DRILLS.find((d) => d.id === next.drill!.id);
      if (dDef) {
        next.drill.fuelSeconds = Math.max(0, next.drill.fuelSeconds - 1);
        next.drill.bitDurability = Math.max(0, next.drill.bitDurability - 100 / 32400);

        // Вероятность добычи 1 единицы руды
        const ratePerSec = dDef.rate / 3600;
        if (Math.random() < ratePerSec) {
          next.vein = Math.max(0, next.vein - 1);
          // Добываем в один из двух секторов (50/50)
          const targetOre = Math.random() < 0.5 ? next.drill.sector1Ore : next.drill.sector2Ore;
          next.ores[targetOre] = (next.ores[targetOre] || 0) + 1;
          next.mineXp += 2; // Бур дает опыт шахты
        }
      }
    }
  }

  // 7. Принтер
  if (next.press && next.press.durability > 0) {
    const pDef = PRESSES.find((p) => p.id === next.press!.id);
    if (pDef) {
      next.press.trayRub += pDef.income / 3600;
      next.press.durability = Math.max(0, next.press.durability - 1 / 3600);
    }
  }

  // 8. Серверы ₿
  let totalBtcPerSec = 0;
  Object.entries(next.servers).forEach(([sId, count]) => {
    const sDef = SERVERS.find((s) => s.id === sId);
    if (sDef && count > 0) {
      totalBtcPerSec += (sDef.btcPerHour * count) / 3600;
    }
  });
  if (totalBtcPerSec > 0 && next.serverAccumSec < 86400) {
    next.serverAccumSec = Math.min(86400, next.serverAccumSec + 1);
    next.unclaimedBtc += totalBtcPerSec;
  }

  // 9. Инвестиции (непрерывное начисление)
  next.investments = next.investments.map((inv) => {
    const plan = [
      { id: 'inv_1', rate: 0.005 },
      { id: 'inv_2', rate: 0.010 },
      { id: 'inv_3', rate: 0.016 },
    ].find((p) => p.id === inv.id);
    const r = plan ? plan.rate : 0.005;
    return {
      ...inv,
      accumulatedYield: inv.accumulatedYield + (inv.amountRub * (r / 86400)),
    };
  });

  next.lastSaveTime = now;
  return next;
}

/**
 * Исполнение жесткой процедуры банкротства
 */
export function finalizeBankruptcy(state: GameState) {
  state.loan.active = false;
  state.loan.principal = 0;
  state.loan.accruedInterest = 0;
  state.loan.bankruptcyPending = false;
  state.loan.bankruptcyExpiresAt = 0;

  // 50% списание всех валют (кроме донатных евро)
  state.rub = Math.floor(state.rub * 0.5);
  state.depositRub = Math.floor(state.depositRub * 0.5);
  state.vault.rub = Math.floor(state.vault.rub * 0.5);
  state.usdCash = Math.floor(state.usdCash * 0.5);
  state.usdOffshore = Math.floor(state.usdOffshore * 0.5);
  state.vault.usd = Math.floor(state.vault.usd * 0.5);
  state.btc = state.btc * 0.5;
  state.unclaimedBtc = 0;

  // 50% списание руды и инвестиций
  Object.keys(state.ores).forEach((k) => {
    state.ores[k] = Math.floor(state.ores[k] * 0.5);
  });
  state.investments = state.investments.map((inv) => ({
    ...inv,
    amountRub: Math.floor(inv.amountRub * 0.5),
    accumulatedYield: 0,
  }));

  // Полная конфискация коммерческих активов
  state.businesses = [];
  state.press = null;
  state.drill = null;
  state.servers = {};
  state.serverAccumSec = 0;
  state.car = null;
  state.estateId = 'e_1'; // Сброс до хостела
  state.homeSafeRub = 0;

  state.activityLog.unshift({
    id: 'log_' + Date.now(),
    time: Date.now(),
    desc: 'Судебное банкротство завершено: долги аннулированы, конфисковано 50% валюты и все коммерческие активы',
    amountText: 'Банкротство',
    isPos: false,
  });
}

/**
 * Обработка офлайн-прогресса при входе в игру
 */
export function processOfflineProgress(state: GameState): GameState {
  const now = Date.now();
  let passedSec = Math.floor((now - state.lastSaveTime) / 1000);

  // Защита от перевода часов назад
  if (passedSec < 0) {
    state.lastSaveTime = now;
    state.lastEnergyTick = now;
    return state;
  }

  // Жесткий потолок 24 часа
  passedSec = Math.min(CONFIG.MAX_OFFLINE_SEC, passedSec);
  if (passedSec <= 0 || state.isBanned) return state;

  const next = { ...state };

  // 1. Энергия
  const regenSec = getEnergyRegenSec(next);
  const addEnergy = Math.floor(passedSec / regenSec);
  next.energy = Math.min(CONFIG.ENERGY_MAX, next.energy + addEnergy);

  // 2. Хранилище (комиссия)
  if (next.vault.rub > 0 || next.vault.usd > 0) {
    const rubFee = next.vault.rub * (CONFIG.VAULT_DAILY_FEE_RATE / 86400) * passedSec;
    const usdFee = next.vault.usd * (CONFIG.VAULT_DAILY_FEE_RATE / 86400) * passedSec;
    next.vault.rub = Math.max(0, Math.floor(next.vault.rub - rubFee));
    next.vault.usd = Math.max(0, Math.floor(next.vault.usd - usdFee));
    next.vault.lastMaintenanceTime = now;
  }

  // 3. Депозит
  if (next.depositRub > 0) {
    const rate = next.activeFaction === 'f_fin' ? 0.010 : CONFIG.DEPOSIT_DAILY_RATE;
    const interest = next.depositRub * (rate / 86400) * passedSec;
    next.depositRub = Math.min(CONFIG.DEPOSIT_MAX_RUB, Math.floor(next.depositRub + interest));
    next.lastDepositPayoutTime = now;
  }

  // 4. Кредит
  if (next.loan.active && next.loan.principal > 0) {
    const ratePerSec = (CONFIG.LOAN_HALF_DAY_RATE * 2) / 86400;
    const addedInterest = next.loan.principal * ratePerSec * passedSec;
    next.loan.accruedInterest = Math.floor(next.loan.accruedInterest + addedInterest);
    next.loan.lastAccrualTime = now;
  }

  // 5. Бизнесы (с учетом инфраструктуры города)
  const offlineInfraMult = calcInfrastructureMultiplier(next.cityInfrastructure);
  const holdingBonus = Math.max(0, (next.businesses.length - 1) * 0.02);
  const mult = (1 + holdingBonus) * offlineInfraMult;
  next.businesses = next.businesses.map((b) => {
    const bDef = BUSINESSES.find((item) => item.id === b.id);
    if (!bDef) return b;
    const maxRub = bDef.income * 24;
    const maxUsd = (bDef.income || 0) * 24;

    let updatedRub = b.cashboxRub;
    let updatedUsd = b.cashboxUsd;

    if (!bDef.isUsd) {
      updatedRub = Math.min(maxRub, updatedRub + ((bDef.income * mult) / 3600) * passedSec);
    } else {
      updatedUsd = Math.min(maxUsd, updatedUsd + ((bDef.income * mult) / 3600) * passedSec);
    }

    return { ...b, cashboxRub: updatedRub, cashboxUsd: updatedUsd };
  });

  // 6. Бур (с вычетом времени реконфигурации)
  if (next.drill && next.vein > 0) {
    let activeDrillSec = passedSec;
    if (state.lastSaveTime < next.drill.reconfigUntil) {
      const pausedSec = Math.min(passedSec, Math.max(0, Math.floor((next.drill.reconfigUntil - state.lastSaveTime) / 1000)));
      activeDrillSec = Math.max(0, passedSec - pausedSec);
    }

    const availableFuelSec = Math.min(activeDrillSec, next.drill.fuelSeconds);
    const availableDurSec = Math.min(availableFuelSec, (next.drill.bitDurability / 100) * 32400);
    const workedSec = Math.max(0, Math.floor(Math.min(availableDurSec, next.vein)));

    if (workedSec > 0) {
      const dDef = DRILLS.find((d) => d.id === next.drill!.id);
      if (dDef) {
        next.drill.fuelSeconds = Math.max(0, next.drill.fuelSeconds - workedSec);
        next.drill.bitDurability = Math.max(0, next.drill.bitDurability - (workedSec * 100) / 32400);

        const totalMined = Math.min(next.vein, Math.floor((dDef.rate / 3600) * workedSec));
        next.vein = Math.max(0, next.vein - totalMined);
        const half = Math.floor(totalMined / 2);
        next.ores[next.drill.sector1Ore] = (next.ores[next.drill.sector1Ore] || 0) + half;
        next.ores[next.drill.sector2Ore] = (next.ores[next.drill.sector2Ore] || 0) + (totalMined - half);
        next.mineXp += totalMined * 2;
      }
    }
  }

  // 7. Принтер
  if (next.press && next.press.durability > 0) {
    const pDef = PRESSES.find((p) => p.id === next.press!.id);
    if (pDef) {
      const hoursDur = next.press.durability;
      const workedHours = Math.min(passedSec / 3600, hoursDur);
      next.press.trayRub += pDef.income * workedHours;
      next.press.durability = Math.max(0, next.press.durability - workedHours);
    }
  }

  // 8. Серверы
  let srvBtcPerHour = 0;
  Object.entries(next.servers).forEach(([sId, count]) => {
    const sDef = SERVERS.find((s) => s.id === sId);
    if (sDef) srvBtcPerHour += sDef.btcPerHour * count;
  });
  if (srvBtcPerHour > 0) {
    const availableSec = Math.max(0, 86400 - next.serverAccumSec);
    const workedSec = Math.min(passedSec, availableSec);
    next.serverAccumSec += workedSec;
    next.unclaimedBtc += (srvBtcPerHour / 3600) * workedSec;
  }

  next.lastSaveTime = now;
  return next;
}

/**
 * Проверка и исполнение уличной карманной кражи при навигации
 */
export function checkStreetTheft(state: GameState): { occurred: boolean; stolenRub: number; stolenUsd: number; newState: GameState } {
  const now = Date.now();
  if (now < state.theftCooldownUntil) {
    return { occurred: false, stolenRub: 0, stolenUsd: 0, newState: state };
  }

  // Минимальный порог наличия средств
  const hasEnoughRub = state.rub >= 6667;
  const hasEnoughUsd = state.usdCash >= 500;
  if (!hasEnoughRub && !hasEnoughUsd) {
    return { occurred: false, stolenRub: 0, stolenUsd: 0, newState: state };
  }

  // 5% шанс
  if (Math.random() >= CONFIG.THEFT_CHANCE) {
    return { occurred: false, stolenRub: 0, stolenUsd: 0, newState: state };
  }

  const next = { ...state };
  let stolenRub = 0;
  let stolenUsd = 0;

  if (hasEnoughRub) {
    const rawStolen = Math.floor(next.rub * CONFIG.THEFT_RATE);
    stolenRub = Math.max(CONFIG.THEFT_RUB_MIN, Math.min(CONFIG.THEFT_RUB_MAX, rawStolen));
    stolenRub = Math.min(next.rub, stolenRub);
    next.rub -= stolenRub;
  }

  if (hasEnoughUsd) {
    const rawUsd = Math.floor(next.usdCash * CONFIG.THEFT_RATE);
    stolenUsd = Math.min(CONFIG.THEFT_USD_MAX, rawUsd);
    stolenUsd = Math.min(next.usdCash, stolenUsd);
    next.usdCash -= stolenUsd;
  }

  next.lastTheftTime = now;
  next.theftCooldownUntil = now + CONFIG.THEFT_COOLDOWN_SEC * 1000;
  next.raidCounters.theftsSuffered += 1;
  next.raidCounters.theftRubLost += stolenRub;
  next.raidCounters.theftUsdLost += stolenUsd;

  return { occurred: true, stolenRub, stolenUsd, newState: next };
}

/**
 * Список всех активных системных модификаторов персонажа
 */
export function getActiveBuffs(state: GameState): ActiveBuff[] {
  const buffs: ActiveBuff[] = [];

  // Пол
  if (state.gender === 'M') {
    buffs.push({
      id: 'buff_gender_m',
      name: 'Выносливость',
      source: 'Мужской пол',
      desc: '+5% к шансу победы в уличных гонках',
      icon: '⚡',
      type: 'power',
    });
  } else {
    buffs.push({
      id: 'buff_gender_f',
      name: 'Дипломатия',
      source: 'Женский пол',
      desc: '-5% к комиссии оффшорного шлюза (10% вместо 15%)',
      icon: '💎',
      type: 'economy',
    });
  }

  // Автомобиль
  if (state.car) {
    const cDef = CARS.find((c) => c.id === state.car!.id);
    if (cDef) {
      if (cDef.taxiBonus) {
        buffs.push({
          id: 'buff_car_taxi',
          name: 'Таксопарк Комфорт',
          source: cDef.name,
          desc: `+${Math.round(cDef.taxiBonus * 100)}% к зарплате таксиста`,
          icon: '🚕',
          type: 'economy',
        });
      }
      if (cDef.driverBonus) {
        buffs.push({
          id: 'buff_car_driver',
          name: 'Бизнес-класс',
          source: cDef.name,
          desc: `+${Math.round(cDef.driverBonus * 100)}% к смене частного водителя`,
          icon: '👔',
          type: 'economy',
        });
      }
      if (cDef.raidReduce) {
        buffs.push({
          id: 'buff_car_raid',
          name: 'Тонировка и Охрана',
          source: cDef.name,
          desc: `-${Math.round(cDef.raidReduce * 100)}% к риску рейда Прокурора`,
          icon: '🛡️',
          type: 'safety',
        });
      }
      if (cDef.dpsImmune) {
        buffs.push({
          id: 'buff_car_dps',
          name: 'Правительственный кортеж',
          source: cDef.name,
          desc: '100% иммунитет к штрафам ГИБДД без прав и номеров',
          icon: '👑',
          type: 'safety',
        });
      }
      if (cDef.prizeMult > 1.0) {
        buffs.push({
          id: 'buff_car_prize',
          name: 'Гоночный спонсор',
          source: cDef.name,
          desc: `Множитель приза автодрома: x${cDef.prizeMult.toFixed(2)}`,
          icon: '🏆',
          type: 'speed',
        });
      }
    }
  }

  // Фракция
  if (state.activeFaction) {
    const fDef = FACTIONS.find((f) => f.id === state.activeFaction);
    if (fDef) {
      fDef.perks.forEach((p, idx) => {
        buffs.push({
          id: `buff_faction_${idx}`,
          name: fDef.name,
          source: 'Фракция',
          desc: p,
          icon: '🏛️',
          type: 'power',
        });
      });
    }
  }

  // Спецбизнесы
  state.businesses.forEach((b) => {
    const bDef = BUSINESSES.find((item) => item.id === b.id);
    if (bDef?.autoService) {
      buffs.push({
        id: 'buff_biz_auto',
        name: 'Свой автосервис',
        source: bDef.name,
        desc: '-25% к стоимости ремонта машин в гараже',
        icon: '🔧',
        type: 'economy',
      });
    }
    if (bDef?.oilDepot) {
      buffs.push({
        id: 'buff_biz_oil',
        name: 'Своя Нефтебаза',
        source: bDef.name,
        desc: '-20% к стоимости заправки авто и буров',
        icon: '⛽',
        type: 'economy',
      });
    }
    if (bDef?.electricDiscount) {
      buffs.push({
        id: `buff_biz_elec_${b.id}`,
        name: bDef.name,
        source: 'Энергосеть',
        desc: `-${Math.round(bDef.electricDiscount * 100)}% к счетам за электроэнергию (OpEx)`,
        icon: '⚡',
        type: 'economy',
      });
    }
  });

  // Холдинг
  if (state.businesses.length > 1) {
    buffs.push({
      id: 'buff_holding',
      name: 'Синергия холдинга',
      source: `${state.businesses.length} предприятий`,
      desc: `+${(state.businesses.length - 1) * 2}% к выработке всех коммерческих предприятий`,
      icon: '📈',
      type: 'economy',
    });
  }

  return buffs;
}

/**
 * Локальное сохранение состояния
 */
export function saveStateToStorage(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Ошибка записи сохранения:', err);
  }
}

/**
 * Загрузка локального сохранения
 */
export function loadStateFromStorage(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();
    const parsed = JSON.parse(raw);

    // Санитизация структуры при миграциях
    const initial = getInitialState();
    return {
      ...initial,
      ...parsed,
      vault: { ...initial.vault, ...(parsed.vault || {}) },
      loan: { ...initial.loan, ...(parsed.loan || {}) },
      investments: parsed.investments || [],
      ores: { ...initial.ores, ...(parsed.ores || {}) },
      purchaseDates: parsed.purchaseDates || { e_1: Date.now() },
      raidCounters: { ...initial.raidCounters, ...(parsed.raidCounters || {}) },
      cityInfrastructure: parsed.cityInfrastructure || {},
      megacity: { ...initial.megacity, ...(parsed.megacity || {}) },
      idHistory: parsed.idHistory && parsed.idHistory.length > 0 ? parsed.idHistory : [parsed.id || initial.id],
      accountUid: parsed.accountUid || initial.accountUid,
    };
  } catch (err) {
    console.error('Ошибка загрузки сохранения:', err);
    return getInitialState();
  }
}
