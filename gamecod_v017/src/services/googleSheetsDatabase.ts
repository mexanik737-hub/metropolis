/**
 * METROPOLIS v0.17 — ПОЛНАЯ БАЗА ДАННЫХ И ЭКСПОРТ В GOOGLE ТАБЛИЦЫ
 *
 * Содержит полную выгрузку всех игровых сущностей, механик, формул, переменных,
 * таблиц, шансов и алгоритмов игры без пропусков и исключений (без данных игрока).
 */

import {
  CONFIG,
  JOBS_LEGAL,
  JOBS_ILLEGAL,
  BUSINESSES,
  ORES,
  DRILLS,
  PRESSES,
  SERVERS,
  CARS,
  ESTATES,
  PRESTIGE,
  FACTIONS,
  DONATE_PACKS,
  COURSES,
  UNI_LEVELS,
  SPECS,
  INVEST_PLANS,
  FAQ_DATA,
  CITY_INFRASTRUCTURE_PROJECTS,
} from '../data/gameData';

export interface SheetData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  description?: string;
}

/**
 * Генерирует исчерпывающий набор данных по всем механикам и таблицам игры
 */
export function buildFullGameDatabase(): SheetData[] {
  const sheets: SheetData[] = [];

  // 1. Конфигурация и глобальные константы
  sheets.push({
    title: 'Конфигурация и Константы',
    description: 'Системные константы, параметры баланса, лимиты и базовые тайминги игры',
    headers: ['Параметр (Ключ)', 'Значение', 'Единица измерения', 'Описание механики'],
    rows: [
      ['VERSION_STRING', CONFIG.VERSION_STRING, 'Строка', 'Текущая версия кодовой базы и движка игры'],
      ['COOLDOWN_MS', CONFIG.COOLDOWN_MS, 'миллисекунды', 'Минимальный интервал между активными действиями (антиклик)'],
      ['ENERGY_MAX', CONFIG.ENERGY_MAX, 'единиц ⚡', 'Максимальный запас энергии гражданина'],
      ['ENERGY_BASE_REGEN_SEC', CONFIG.ENERGY_BASE_REGEN_SEC, 'секунды', 'Базовое время восстановления 1⚡ (снижается жильем до 96 сек)'],
      ['PROCURATOR_MIN_CHANCE', `${(CONFIG.PROCURATOR_MIN_CHANCE * 100).toFixed(0)}%`, 'проценты', 'Минимальная базовая вероятность рейда Прокуратуры'],
      ['PROCURATOR_MAX_CHANCE', `${(CONFIG.PROCURATOR_MAX_CHANCE * 100).toFixed(0)}%`, 'проценты', 'Максимальная вероятность рейда Прокуратуры (снижается синдикатом до 25%)'],
      ['MVD_MIN_CHANCE', `${(CONFIG.MVD_MIN_CHANCE * 100).toFixed(0)}%`, 'проценты', 'Минимальный шанс визита ОБЭП/МВД при превышении налички'],
      ['MVD_MAX_CHANCE', `${(CONFIG.MVD_MAX_CHANCE * 100).toFixed(0)}%`, 'проценты', 'Максимальный шанс визита ОБЭП/МВД'],
      ['OFFSHORE_FEE_RATE', `${(CONFIG.OFFSHORE_FEE_RATE * 100).toFixed(0)}%`, 'комиссия', 'Комиссия за конвертацию и вывод средств в Оффшорный счет'],
      ['CASINO_BET_MIN', CONFIG.CASINO_BET_MIN, 'рубли (₽)', 'Минимальная ставка в играх Казино (Слоты, Блэкджек, Покер)'],
      ['CASINO_BET_MAX', CONFIG.CASINO_BET_MAX, 'рубли (₽)', 'Максимальная ставка за один раунд в Казино'],
      ['CASINO_BET_STEP', CONFIG.CASINO_BET_STEP, 'рубли (₽)', 'Шаг регулировки ставки'],
      ['MAX_OFFLINE_SEC', CONFIG.MAX_OFFLINE_SEC, 'секунды (24ч)', 'Максимальное время накопления оффлайн-дохода бизнесов и серверов'],
      ['VAULT_DAILY_FEE_RATE', `${(CONFIG.VAULT_DAILY_FEE_RATE * 100).toFixed(1)}%`, 'в сутки', 'Комиссия за безопасность Хранилища Банка (посекундное списание)'],
      ['DEPOSIT_DAILY_RATE', `${(CONFIG.DEPOSIT_DAILY_RATE * 100).toFixed(2)}%`, 'в сутки', 'Базовая доходность Банковского Депозита (до +1% с фракцией Консорциум)'],
      ['DEPOSIT_MIN_RUB', CONFIG.DEPOSIT_MIN_RUB, 'рубли (₽)', 'Минимальная сумма открытия банковского вклада'],
      ['DEPOSIT_MAX_RUB', CONFIG.DEPOSIT_MAX_RUB, 'рубли (₽)', 'Максимальная сумма на депозите с начислением процентов'],
      ['LOAN_HALF_DAY_RATE', `${(CONFIG.LOAN_HALF_DAY_RATE * 100).toFixed(1)}%`, 'за 12 часов', 'Процентная ставка по банковскому кредиту'],
      ['BANKRUPTCY_WAIT_SEC', CONFIG.BANKRUPTCY_WAIT_SEC, 'секунды (5 мин)', 'Таймер ожидания до окончательного списания долгов при банкротстве'],
      ['THEFT_CHANCE', `${(CONFIG.THEFT_CHANCE * 100).toFixed(0)}%`, 'вероятность', 'Шанс уличной кражи при навигации, если на руках много незащищенной налички'],
      ['THEFT_COOLDOWN_SEC', CONFIG.THEFT_COOLDOWN_SEC, 'секунды (6ч)', 'Период кулдауна между возможными уличными кражами'],
      ['THEFT_RATE', `${(CONFIG.THEFT_RATE * 100).toFixed(0)}%`, 'доля налички', 'Процент похищаемых наличных средств при успешной краже'],
      ['THEFT_RUB_MIN', CONFIG.THEFT_RUB_MIN, 'рубли (₽)', 'Минимальный порог похищаемой суммы рублей'],
      ['THEFT_RUB_MAX', CONFIG.THEFT_RUB_MAX, 'рубли (₽)', 'Максимальный потолок похищаемых рублей за одну кражу'],
      ['THEFT_USD_MAX', CONFIG.THEFT_USD_MAX, 'доллары ($)', 'Максимальный потолок похищаемых наличных долларов за кражу'],
      ['KARMA_MIN', -10000, 'очки', 'Нижняя граница криминальной кармы'],
      ['KARMA_MAX', 10000, 'очки', 'Верхняя граница государственной кармы'],
      ['DRIVING_XP_MAX', 100, 'XP', 'Максимальный уровень мастерства вождения (дает до +15% к победам в гонках)'],
      ['MULTI_BUSINESS_SYNERGY_STEP', '2%', 'проценты', 'Синергетический бонус к доходу: (N - 1) * 2% за каждый бизнес в холдинге'],
    ],
  });

  // 2. Легальные профессии и работы
  sheets.push({
    title: 'Легальные Профессии',
    description: 'Полный реестр официальных государственных и коммерческих должностей',
    headers: [
      'ID',
      'Название должности',
      'Зарплата за смену (₽)',
      'Карма за смену',
      'Требуемый курс',
      'Требуемое образование (ступень)',
      'Специализация',
      'Права категории B',
      'Автомобили для допуска',
      'Требуется иномарка',
      'Требуемый предмет',
      'Расход топлива (л)',
      'Износ авто (%)',
      'Мин. карма',
      'Описание работы',
    ],
    rows: JOBS_LEGAL.map((j) => [
      j.id,
      j.name,
      j.salary,
      `+${j.karma}`,
      j.reqCourse || '—',
      j.reqEdu ? `Ступень ${j.reqEdu}` : '—',
      j.reqSpec || '—',
      j.reqLicense ? 'ДА' : 'Нет',
      j.reqCarIds ? j.reqCarIds.join(', ') : '—',
      j.reqForeignCar ? 'ДА' : 'Нет',
      j.reqItem || '—',
      j.fuelDrain || 0,
      j.wearDrain ? `${j.wearDrain}%` : '0%',
      j.reqKarma || 0,
      j.desc,
    ]),
  });

  // 3. Нелегальные профессии (Теневой сектор)
  sheets.push({
    title: 'Теневые Профессии',
    description: 'Нелегальные заказы, черный рынок и криминальные операции',
    headers: [
      'ID',
      'Название ремесла',
      'Доход за смену ($)',
      'Карма за смену',
      'Макс. допустимая карма',
      'Требуется печатный станок',
      'Требуемый девайс',
      'Спец-расходник для смены',
      'Описание операции',
    ],
    rows: JOBS_ILLEGAL.map((j) => [
      j.id,
      j.name,
      j.salary,
      j.karma,
      j.reqKarmaMax !== undefined ? j.reqKarmaMax : 'Любая',
      j.reqPress ? 'ДА' : 'Нет',
      j.reqItem || '—',
      j.consumeItem || '—',
      j.desc,
    ]),
  });

  // 4. Предприятия и Коммерция
  sheets.push({
    title: 'Предприятия и Бизнесы',
    description: 'Все 18 легальных и 6 нелегальных предприятий мегаполиса',
    headers: [
      'ID',
      'Название предприятия',
      'Сектор',
      'Стоимость покупки',
      'Валюта',
      'Доход в час',
      'Доход в секунду',
      'Мин. карма',
      'Макс. карма',
      'Открывает Серверы ₿',
      'Бонус Нефтебазы',
      'Бонус Автосервиса',
      'Скидка на свет (OpEx)',
      'Описание и особенности',
    ],
    rows: BUSINESSES.map((b) => [
      b.id,
      b.name,
      b.isUsd ? 'Теневой' : 'Легальный',
      b.cost,
      b.isUsd ? 'USD ($)' : 'RUB (₽)',
      b.income,
      (b.income / 3600).toFixed(2),
      b.reqKarma || 0,
      b.reqKarmaMax !== undefined ? b.reqKarmaMax : 'Без ограничений',
      b.unlocksServers ? 'ДА' : 'Нет',
      b.oilDepot ? '-20% на топливо' : '—',
      b.autoService ? '-25% на ремонт авто' : '—',
      b.electricDiscount ? `-${Math.round(b.electricDiscount * 100)}%` : '—',
      b.desc,
    ]),
  });

  // 5. Горное дело и Руды
  sheets.push({
    title: 'Горное Дело и Руды',
    description: 'Все 10 типов руд подземного карьера, цены реализации и госзаказ',
    headers: [
      'ID',
      'Наименование руды',
      'Тир (Уровень)',
      'Требуемый опыт шахты (XP)',
      'Цена сбыта на руки (₽/ед)',
      'Цена по Госзаказу (+20%)',
      'HEX цвет руды',
      'Назначение в индустрии',
    ],
    rows: ORES.map((o) => [
      o.id,
      o.name,
      o.tier,
      o.xpReq,
      o.sellPrice,
      o.stateBuyPrice,
      o.color,
      o.tier <= 3
        ? 'Сборка базовых принтеров'
        : o.tier === 7
        ? 'Золото: монтаж Серверов Биткоина ₿'
        : o.tier >= 8
        ? 'Флагманские принтеры и ремонт'
        : 'Средние принтеры и промышленные детали',
    ]),
  });

  // 6. Буровые Установки
  sheets.push({
    title: 'Буровые Установки',
    description: 'Автоматические добывающие комбайны с двухсекторной технологией',
    headers: [
      'ID',
      'Модель бура',
      'Стоимость (₽)',
      'Скорость добычи (ед/час)',
      'Макс. доступный Тир руды',
      'Стоимость полной заправки бака (₽)',
      'Базовая стоимость капремонта (₽)',
      'Требуемая руда для ремонта',
      'Технологические параметры',
    ],
    rows: DRILLS.map((d) => [
      d.id,
      d.name,
      d.cost,
      d.rate,
      `Тир ${d.maxTier}`,
      d.fuelCostTotal,
      d.repairRub,
      d.repairOre ? `${d.repairOre.id}: ${d.repairOre.qty} ед.` : 'Не требуется',
      'Два независимых сектора (50/50), смена руды: кулдаун 60 мин, прогрев 5 мин',
    ]),
  });

  // 7. Печатные Станки
  sheets.push({
    title: 'Печатные Станки',
    description: 'Оборудование подпольной печати денег и защищенных полиграфических бланков',
    headers: [
      'ID',
      'Модель станка',
      'Стоимость сборки (₽)',
      'Пассивный доход в час (₽)',
      'Пассивный доход в сутки (₽)',
      'Ресурсы для первичной сборки',
      'Стоимость ремонта (₽)',
      'Ресурсы для техобслуживания',
    ],
    rows: PRESSES.map((p) => [
      p.id,
      p.name,
      p.cost,
      p.income,
      p.income * 24,
      Object.entries(p.mats)
        .map(([k, v]) => `${k}: ${v} ед.`)
        .join(', '),
      p.repRub,
      Object.entries(p.repMats)
        .map(([k, v]) => `${k}: ${v} ед.`)
        .join(', '),
    ]),
  });

  // 8. Серверы Майнинга Биткоина
  sheets.push({
    title: 'Серверы Майнинга ₿',
    description: 'Дата-центры, хэшрейт, потребление электроэнергии и требования к золоту',
    headers: [
      'ID',
      'Название пула / стойки',
      'Стоимость стойки (₽)',
      'Требуется Золота из шахты (кг)',
      'Добыча BTC в час (₿/ч)',
      'Добыча BTC в сутки (₿/сут)',
      'Расход на электричество OpEx (₽/ч)',
      'Расход на свет в сутки (₽/сут)',
      'Требование доступа',
    ],
    rows: SERVERS.map((s) => [
      s.id,
      s.name,
      s.cost,
      s.goldReq,
      s.btcPerHour,
      (s.btcPerHour * 24).toFixed(2),
      s.opexRub,
      s.opexRub * 24,
      'Владение IT-компанией (b_9). Скидки OpEx: ГЭС (-25%), АЭС (-50%)',
    ]),
  });

  // 9. Автосалон и Автодром
  sheets.push({
    title: 'Автосалон и Спорткары',
    description: 'Все 20 автомобилей, мощность, призовые коэффициенты и спец-бонусы',
    headers: [
      'ID',
      'Марка и модель авто',
      'Стоимость покупки (₽)',
      'Мощность (л.с.)',
      'Бонус к шансу победы в гонке',
      'Множитель призовых выплат',
      'Класс авто',
      'Бонус к такси',
      'Бонус к частному водителю',
      'Скидка на ремонт',
      'Спец-способности и иммунитеты',
      'Описание',
    ],
    rows: CARS.map((c) => [
      c.id,
      c.name,
      c.cost,
      c.hp,
      `+${Math.round(c.winBonus * 100)}%`,
      `x${c.prizeMult.toFixed(2)}`,
      c.isForeign ? 'Иномарка / Премиум' : 'Отечественный',
      c.taxiBonus ? `+${Math.round(c.taxiBonus * 100)}%` : '—',
      c.driverBonus ? `+${Math.round(c.driverBonus * 100)}%` : '—',
      c.repairDisc ? `-${Math.round(c.repairDisc * 100)}%` : '—',
      [
        c.fuelSave ? 'Расход топлива снижен в 2 раза' : null,
        c.stageBoost ? 'Stage тюнинг дает +20% вместо +15%' : null,
        c.noShiftWear ? '0% износа на сменах водителя' : null,
        c.halfRaceWear ? 'Износ в гонках в 2 раза меньше' : null,
        c.raidReduce ? 'Снижает рейд Прокурора на -5%' : null,
        c.dpsImmune ? 'Иммунитет к штрафам ГИБДД' : null,
      ]
        .filter(Boolean)
        .join('; ') || 'Стандарт',
      c.desc,
    ]),
  });

  // 10. Недвижимость и Жилой фонд
  sheets.push({
    title: 'Недвижимость и Жилье',
    description: 'Все 10 классов жилья, вместимость сейфов и ускорение регенерации сна',
    headers: [
      'ID',
      'Тип недвижимости',
      'Стоимость (₽)',
      'Лимит домашнего сейфа (₽)',
      'Ускорение сна (% бонуса)',
      'Время регена 1⚡ энергии (сек)',
      'Кофемашина',
      'Бонус кофе (⚡ раз в сутки)',
      'Описание объекта',
    ],
    rows: ESTATES.map((e) => [
      e.id,
      e.name,
      e.cost,
      e.safe,
      `+${e.sleepBonus}%`,
      Math.round(CONFIG.ENERGY_BASE_REGEN_SEC * (1 - e.sleepBonus / 100)),
      e.coffee ? 'Установлена' : 'Отсутствует',
      e.coffeeRestore ? `+${e.coffeeRestore} ⚡` : '0',
      e.desc,
    ]),
  });

  // 11. Городская Инфраструктура (Мега-проекты)
  sheets.push({
    title: 'Городская Инфраструктура',
    description: '6 мега-проектов районов мегаполиса с глобальными экономическими множителями',
    headers: [
      'ID проекта',
      'Район мегаполиса',
      'Название проекта',
      'Стоимость строительства (₽)',
      'Бонусный множитель',
      'Эффект на экономику',
      'Описание строительного объекта',
    ],
    rows: CITY_INFRASTRUCTURE_PROJECTS.map((p) => [
      p.id,
      p.districtName,
      p.name,
      p.costRub,
      `+${Math.round(p.bonusMultiplier * 100)}%`,
      p.bonusDescription,
      p.desc,
    ]),
  });

  // 12. Престиж и Ранги Граждан
  sheets.push({
    title: 'Престиж и Капитал',
    description: 'Ранги финансовой элиты, пороги чистых активов (Net Worth) и привилегии',
    headers: [
      'Уровень',
      'Римский ранг',
      'Титул гражданина',
      'Минимальный Net Worth (₽)',
      'Коэффициент Trade-In при продаже имущества',
      'Особые привилегии ранга',
    ],
    rows: PRESTIGE.map((p) => [
      p.num,
      p.rank,
      p.title,
      p.nw,
      `${Math.round(p.tradeInRate * 100)}%`,
      p.num === 6
        ? 'Бесплатный вечный пропуск во все залы Казино'
        : p.num === 7
        ? 'Открытие доступа к строительству проекта Мегасити'
        : p.num >= 8
        ? 'Повышенный Trade-In возврат 80% за все имущество'
        : 'Стандартный доступ',
    ]),
  });

  // 13. Фракции и Синдикаты
  sheets.push({
    title: 'Фракции и Синдикаты',
    description: '4 влиятельные фракции города, требования вступления и постоянные перки',
    headers: [
      'ID',
      'Название организации',
      'Направленность',
      'Требования по карме',
      'Требования по капиталу/шахте',
      'Фракционные перки',
      'Описание идеологии',
    ],
    rows: FACTIONS.map((f) => [
      f.id,
      f.name,
      f.alignment,
      f.reqKarma ? `Карма от +${f.reqKarma}` : f.reqKarmaMax ? `Карма до ${f.reqKarmaMax}` : 'Любая',
      f.reqPrestige ? `Престиж ${f.reqPrestige}+` : f.reqMineXp ? `Опыт шахты ${f.reqMineXp}+ XP` : 'Нет',
      f.perks.join(' | '),
      f.desc,
    ]),
  });

  // 14. Финансовый Рынок и Банкинг
  sheets.push({
    title: 'Банкинг и Инвестиции',
    description: 'Инвестиционные фонды, облигации, правила вкладов, кредитования и банкротства',
    headers: ['Инструмент / Механика', 'Мин. сумма', 'Доходность / Ставка', 'Срок / Период', 'Правила и риски'],
    rows: [
      [
        INVEST_PLANS[0].name,
        INVEST_PLANS[0].minRub,
        `+${(INVEST_PLANS[0].dailyYield * 100).toFixed(1)}% в сутки`,
        'Бессрочно',
        INVEST_PLANS[0].desc,
      ],
      [
        INVEST_PLANS[1].name,
        INVEST_PLANS[1].minRub,
        `+${(INVEST_PLANS[1].dailyYield * 100).toFixed(1)}% в сутки`,
        'Бессрочно',
        INVEST_PLANS[1].desc,
      ],
      [
        INVEST_PLANS[2].name,
        INVEST_PLANS[2].minRub,
        `+${(INVEST_PLANS[2].dailyYield * 100).toFixed(1)}% в сутки`,
        'Бессрочно',
        INVEST_PLANS[2].desc,
      ],
      [
        'Банковский Депозит (Вклад)',
        CONFIG.DEPOSIT_MIN_RUB,
        '+0.75% в сутки (+1.00% с фракцией)',
        'Ежесуточное начисление',
        'Лимит до 50 000 000 ₽. Надежная капитализация процентов.',
      ],
      [
        'Хранилище Банка (Сейф ₽ и $)',
        10_000_000,
        '-0.2% в сутки за охрану',
        'Посекундное списание',
        'Защищает любые миллиардные суммы от уличных краж и карманников.',
      ],
      [
        'Банковский Кредит',
        '10% от капитала',
        '3.5% каждые 12 часов',
        'До востребования',
        'Потолок кредита до 30% капитала. Неуплата влечет банкротство.',
      ],
      [
        'Процедура Банкротства',
        'При наличии долга',
        'Списание 100% долга',
        '5 минут заморозки',
        'Штраф: сгорает 50% всех валют, руды и инвестиций, аннулируются все бизнесы, авто и серверы.',
      ],
    ],
  });

  // 15. Образование и Специализации
  sheets.push({
    title: 'Образование и Академия',
    description: 'Все курсы профподготовки, 5 ступеней университета и высшие спецкурсы',
    headers: ['Категория', 'ID / Уровень', 'Наименование программы', 'Стоимость обучения (₽)', 'Открываемая должность'],
    rows: [
      ...COURSES.map((c) => ['Профкурс', c.id, c.name, c.cost, c.opensJob]),
      ...UNI_LEVELS.map((u) => ['Университет', `Ступень ${u.level}`, u.name, u.cost, u.opensJob]),
      ...SPECS.map((s) => ['Спецподготовка', s.id, s.name, s.cost, s.opensJob]),
    ],
  });

  // 16. Казино и Теория Вероятностей
  sheets.push({
    title: 'Казино и Вероятности',
    description: 'Таблица выплат игровых автоматов, шансы выпадения комбинаций и механика Сейв-Х',
    headers: [
      'Сектор / Исход',
      'Диапазон генератора (0-100)',
      'Вероятность выпадения',
      'Базовый множитель ставки',
      'Множитель с VIP «Сейв-Х»',
      'Выпадающий символ',
      'Тип исхода',
    ],
    rows: [
      ['Полный проигрыш', '0.0% — 21.99%', '22.0%', 'x0.00', 'x0.15', 'Разные символы', 'Проигрыш'],
      ['Минимальный возврат', '22.0% — 31.99%', '10.0%', 'x0.25', 'x0.40', 'Разные символы', 'Частичный возврат'],
      ['Половина ставки', '32.0% — 43.99%', '12.0%', 'x0.50', 'x0.65', 'Разные символы', 'Частичный возврат'],
      ['Три четверти ставки', '44.0% — 53.99%', '10.0%', 'x0.75', 'x0.90', 'Разные символы', 'Частичный возврат'],
      ['Безубыток (х1)', '54.0% — 63.99%', '10.0%', 'x1.00', 'x1.00', '🍒 Вишни', 'Возврат ставки'],
      ['Малый плюс (х1.25)', '64.0% — 78.99%', '15.0%', 'x1.25', 'x1.25', '🍋 Лимоны', 'Победа'],
      ['Средний плюс (х1.5)', '79.0% — 89.99%', '11.0%', 'x1.50', 'x1.50', '🍇 Виноград', 'Победа'],
      ['Удвоение (х2.0)', '90.0% — 95.99%', '6.0%', 'x2.00', 'x2.00', '🔔 Колокольчик', 'Крупная победа'],
      ['Тройной куш (х3.0)', '96.0% — 98.49%', '2.5%', 'x3.00', 'x3.00', '💎 Бриллиант', 'Супер-победа'],
      ['Пятикратный куш (х5.0)', '98.5% — 99.69%', '1.2%', 'x5.00', 'x5.00', '👑 Корона', 'Мега-победа'],
      ['ДЖЕКПОТ (х10.0)', '99.7% — 100.0%', '0.3%', 'x10.00', 'x10.00', '7️⃣ Семёрки', 'ДЖЕКПОТ'],
    ],
  });

  // 17. Полные Формулы и Алгоритмы Движка
  sheets.push({
    title: 'Формулы и Алгоритмы',
    description: 'Математические формулы расчета пассивного дохода, шансов победы, инфляции и Net Worth',
    headers: ['Игровая механика', 'Математическая формула', 'Входящие переменные', 'Пояснение к расчету'],
    rows: [
      [
        'Чистый капитал (Net Worth)',
        'NW = RUB + Deposit + VaultRUB + SafeRUB + (USD_Cash + USD_Offshore + VaultUSD)*100 + BTC*BTC_Rate + Sum(Estates*0.7) + Sum(Cars*0.7) + Sum(Businesses*0.7) + Sum(Drills*0.7) + Sum(Presses*0.7) + Sum(Servers*0.7)',
        'RUB, USD, BTC, стоимость имущества',
        'Единый индикатор благосостояния для рангов Престижа I-X',
      ],
      [
        'Синергия бизнесов',
        'SynergyMultiplier = 1 + (Count - 1) * 0.02',
        'Count = количество активных предприятий',
        'Каждый дополнительный бизнес в империи дает +2% к доходу всех бизнесов',
      ],
      [
        'Инфраструктурный множитель города',
        'InfraMult = 1 + Sum(Project.bonusMultiplier)',
        'Проекты: Энергосеть (+5%), Магистраль (+8%), Молл (+10%), Кольцо (+12%), Технопарк (+15%), Набережная (+20%)',
        'Суммарный прирост доходности до +70% при всех сданных объектах',
      ],
      [
        'Итоговый пассивный доход в секунду',
        'IncomePerSec = Sum(Business.income / 3600) * SynergyMultiplier * InfraMult',
        'Базовые доходы, синергия, инфраструктура',
        'Посекундное начисление в кассы бизнесов в реальном времени и оффлайн',
      ],
      [
        'Шанс победы в заезде на Автодроме',
        'WinChance = 0.50 + Car.winBonus + ((PlayerHP - BotHP) / BotHP) * 0.20 + (DrivingXP / 100) * 0.15',
        'Мощность авто (л.с.), тюнинг Stage 1-3, опыт вождения, спец-перки спорткара',
        'Диапазон ограничивается в пределах [5%, 95%]',
      ],
      [
        'Скорость регенерации энергии (сон)',
        'TickSeconds = 120 * (1 - Estate.sleepBonus / 100)',
        'Класс недвижимости, sleepBonus (0% — 20%)',
        'В хостеле 120 сек, в Вилле на острове 96 сек на восстановление 1⚡',
      ],
      [
        'Формула тюнинга авто Stage 1-3',
        'Stage 1: +15% л.с. (150k ₽) | Stage 2: +30% л.с. (350k ₽) | Stage 3: +45% л.с. (800k ₽)',
        'Базовые л.с. автомобиля',
        'Skoda Octavia получает повышенный прирост +20%/+40%/+60% л.с.',
      ],
      [
        'Вероятность рейда Прокуратуры',
        'RaidChance = clamp(0.25, 0.40, Base + IllegalWeight)',
        'Количество нелегальных бизнесов, фракция Синдикат (-15%), Mercedes G63 (-5%)',
        'При рейде списывается штраф или взятка',
      ],
      [
        'Уличная кража (карманники)',
        'If (CashRUB > 500k || CashUSD > 5k) and Rand < 0.05 => Stolen = Cash * 0.15',
        'Наличные рубли и доллары вне сейфа и банка',
        'Кулдаун 6 часов. Защита: Сейф жилья, Вклады и Хранилище Банка',
      ],
    ],
  });

  // 18. Донат-Пакеты и Премиум
  sheets.push({
    title: 'Донат-Пакеты',
    description: 'Все официальные пакеты поддержки разработчиков и их стартовые наборы',
    headers: ['ID', 'Название пакета', 'Стоимость (€)', 'Бейдж / Статус', 'Входящие ресурсы и имущество', 'Описание'],
    rows: DONATE_PACKS.map((d) => [
      d.id,
      d.name,
      d.costEur,
      d.badge,
      [
        d.usdOffshore ? `${d.usdOffshore.toLocaleString('ru-RU')} $ в Оффшор` : null,
        d.rubCash ? `${d.rubCash.toLocaleString('ru-RU')} ₽ на руки` : null,
        d.eurCashback ? `${d.eurCashback} € кэшбэк` : null,
        d.businessId ? `Бизнес: ${d.businessId}` : null,
        d.pressId ? `Принтер: ${d.pressId}` : null,
        d.permanentItem ? `Перманентный перк: ${d.permanentItem}` : null,
      ]
        .filter(Boolean)
        .join('; '),
      d.desc,
    ]),
  });

  // 19. База Знаний и Справочник Гражданина
  sheets.push({
    title: 'Справочник и FAQ',
    description: 'Официальные руководства по выживанию, инвестициям и законам мегаполиса',
    headers: ['Вопрос / Тема', 'Развернутое руководство и правила'],
    rows: FAQ_DATA.map((f) => [f.q, f.a]),
  });

  return sheets;
}

/**
 * Создает новую Google Таблицу и заполняет все 19 листов данными
 */
export async function exportGameDatabaseToGoogleSheets(
  accessToken: string,
  onProgress?: (step: string, percent: number) => void
): Promise<{ success: boolean; spreadsheetUrl?: string; spreadsheetId?: string; error?: string }> {
  try {
    const allSheets = buildFullGameDatabase();

    onProgress?.('Инициализация книги Google Таблиц...', 10);

    // 1. Создаем пустую таблицу со всеми необходимыми листами
    const sheetDescriptors = allSheets.map((s, index) => ({
      properties: {
        sheetId: index + 1,
        title: s.title.slice(0, 99), // Google Sheets tab title limit
        gridProperties: {
          rowCount: Math.max(s.rows.length + 5, 20),
          columnCount: Math.max(s.headers.length + 2, 10),
          frozenRowCount: 1, // Закрепляем заголовок
        },
      },
    }));

    const createBody = {
      properties: {
        title: `METROPOLIS — Полная База Данных Игры (v0.17 Референс)`,
      },
      sheets: sheetDescriptors,
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Ошибка создания таблицы: ${createRes.statusText}`);
    }

    const createdSpreadsheet = await createRes.json();
    const spreadsheetId = createdSpreadsheet.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    onProgress?.('Заполнение таблиц данными (19 разделов)...', 30);

    // 2. Формируем пакетные обновления значений (batchUpdate values)
    const valueData = allSheets.map((s) => {
      const values = [s.headers, ...s.rows];
      return {
        range: `'${s.title.slice(0, 99)}'!A1`,
        values: values,
      };
    });

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: valueData,
        }),
      }
    );

    if (!updateRes.ok) {
      const errJson = await updateRes.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Ошибка записи данных: ${updateRes.statusText}`);
    }

    onProgress?.('Стилизация заголовков и автоподбор колонок...', 70);

    // 3. Форматируем заголовки: темный стильный фон, жирный шрифт, белый цвет текста
    const requests = allSheets.map((_, index) => ({
      repeatCell: {
        range: {
          sheetId: index + 1,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.05, green: 0.15, blue: 0.28 },
            textFormat: {
              foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'LEFT',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    }));

    // Auto-resize columns
    allSheets.forEach((s, index) => {
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId: index + 1,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: s.headers.length,
          },
        },
      } as any);
    });

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }).catch((err) => {
      console.warn('Не удалось применить стили (некритично):', err);
    });

    onProgress?.('База данных успешно выгружена!', 100);

    return {
      success: true,
      spreadsheetId,
      spreadsheetUrl,
    };
  } catch (error: any) {
    console.error('Ошибка экспорта базы данных в Google Sheets:', error);
    return {
      success: false,
      error: error.message || 'Произошла непредвиденная ошибка при экспорте',
    };
  }
}

/**
 * Скачивание базы данных в виде форматированного JSON файла без входа в Google
 */
export function downloadDatabaseAsJson() {
  const db = buildFullGameDatabase();
  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `METROPOLIS_Game_Database_v017.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Скачивание базы данных в виде ZIP/текстового архива или CSV файлов
 */
export function downloadDatabaseAsCsv(sheetTitle?: string) {
  const db = buildFullGameDatabase();
  const sheetsToExport = sheetTitle ? db.filter((s) => s.title === sheetTitle) : db;

  let fullCsv = '';
  sheetsToExport.forEach((sheet) => {
    fullCsv += `\n# =====================================================\n`;
    fullCsv += `# ТАБЛИЦА: ${sheet.title.toUpperCase()}\n`;
    if (sheet.description) fullCsv += `# Описание: ${sheet.description}\n`;
    fullCsv += `# =====================================================\n`;

    const escapeVal = (v: string | number) => {
      const str = String(v ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    fullCsv += sheet.headers.map(escapeVal).join(',') + '\n';
    sheet.rows.forEach((row) => {
      fullCsv += row.map(escapeVal).join(',') + '\n';
    });
    fullCsv += '\n';
  });

  const blob = new Blob(['\uFEFF' + fullCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `METROPOLIS_Complete_Economy_Database_v017.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
