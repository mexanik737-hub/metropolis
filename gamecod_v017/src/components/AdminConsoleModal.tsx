import React, { useState } from 'react';
import { GameState, CarState } from '../types/game';
import { CONFIG, CARS, ESTATES, ORES, BUSINESSES } from '../data/gameData';
import { verifyAdminAccess } from '../services/security';
import {
  KeyRound,
  ShieldAlert,
  X,
  CheckCircle2,
  User,
  Search,
  RefreshCw,
  Flame,
  AlertTriangle,
  Car,
  Home,
  Briefcase,
  Layers,
  Coins,
  Shield,
  FileText
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  onUpdateState: (fn: (prev: GameState) => GameState) => void;
  isAdminAuthenticated: boolean;
  onAuthenticateAdmin: () => void;
  userEmail?: string | null;
}

interface SimulatedPlayer {
  accountUid: string;
  id: string;
  idHistory: string[];
  username: string;
  rub: number;
  usdCash: number;
  btc: number;
  eur: number;
  warns: number;
  isBanned: boolean;
  banReason: string;
  banExpiresAt: number;
  carPlate?: string;
  estateId?: string;
}

const DEFAULT_CITIZENS: SimulatedPlayer[] = [
  {
    accountUid: 'usr_orig_oligarh_9912',
    id: '77777',
    idHistory: ['10452', '77777'],
    username: 'Александр_Олигарх',
    rub: 850_000_000,
    usdCash: 4_500_000,
    btc: 18.5,
    eur: 500,
    warns: 1,
    isBanned: false,
    banReason: '',
    banExpiresAt: 0,
    carPlate: 'А777АА777',
    estateId: 'e_6',
  },
  {
    accountUid: 'usr_syndicate_boss_4410',
    id: '66666',
    idHistory: ['20914', '66666'],
    username: 'Дмитрий_Синдикат',
    rub: 320_000_000,
    usdCash: 2_100_000,
    btc: 9.2,
    eur: 250,
    warns: 2,
    isBanned: false,
    banReason: 'Подозрение в картельном сговоре на черном рынке',
    banExpiresAt: 0,
    carPlate: 'В666ВВ777',
    estateId: 'e_5',
  },
  {
    accountUid: 'usr_crypto_whale_1120',
    id: '12345',
    idHistory: ['12345'],
    username: 'Влад_Криптофермер',
    rub: 95_000_000,
    usdCash: 800_000,
    btc: 42.0,
    eur: 100,
    warns: 0,
    isBanned: false,
    banReason: '',
    banExpiresAt: 0,
    carPlate: 'К123КК777',
    estateId: 'e_4',
  },
];

export const AdminConsoleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  isAdminAuthenticated,
  onAuthenticateAdmin,
  userEmail,
}) => {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Target Player Mode: 'self' or 'other'
  const [targetMode, setTargetMode] = useState<'self' | 'other'>('self');
  const [searchIdInput, setSearchIdInput] = useState('');
  const [foundPlayer, setFoundPlayer] = useState<SimulatedPlayer | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  // City simulated citizens pool
  const [cityCitizens, setCityCitizens] = useState<SimulatedPlayer[]>(() => {
    try {
      const saved = localStorage.getItem('metropolis_admin_citizens');
      return saved ? JSON.parse(saved) : DEFAULT_CITIZENS;
    } catch {
      return DEFAULT_CITIZENS;
    }
  });

  // Currency Setters
  const [editRub, setEditRub] = useState(String(state.rub));
  const [editUsdCash, setEditUsdCash] = useState(String(state.usdCash));
  const [editUsdOffshore, setEditUsdOffshore] = useState(String(state.usdOffshore));
  const [editBtc, setEditBtc] = useState(String(state.btc));
  const [editEur, setEditEur] = useState(String(state.eur));
  const [editEnergy, setEditEnergy] = useState(String(state.energy));
  const [editKarma, setEditKarma] = useState(String(state.karma));

  // Identity & Custom Details
  const [editPlayerId, setEditPlayerId] = useState(state.id);
  const [editPassport, setEditPassport] = useState(state.passportSerial);
  const [editCarPlate, setEditCarPlate] = useState(state.car?.plateNumber || 'А777АА777');
  const [selectedCarId, setSelectedCarId] = useState(state.car?.id || 'car_bmw_m5');
  const [editCarStage, setEditCarStage] = useState(state.car ? state.car.stage : 3);
  const [selectedEstateId, setSelectedEstateId] = useState(state.estateId);

  // Item grant
  const [selectedItem, setSelectedItem] = useState('fake_passport');
  const [itemCount, setItemCount] = useState(10);

  // Ore grant
  const [selectedOre, setSelectedOre] = useState('ore_7');
  const [oreCount, setOreCount] = useState(500);

  // Moderation
  const [warnsCount, setWarnsCount] = useState(state.warns);
  const [banHours, setBanHours] = useState(24);
  const [banReason, setBanReason] = useState('Нарушение правил экономики и устава мегаполиса');
  const [msg, setMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyPin = () => {
    if (verifyAdminAccess(pin, userEmail)) {
      onAuthenticateAdmin();
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Search player by ID, old historical ID, or accountUid
  const handleSearchPlayer = () => {
    const q = searchIdInput.trim().replace(/^#/, '');
    if (!q) {
      setSearchStatus('Введите ID или UID игрока для поиска');
      return;
    }

    // Check if searching for self
    if (state.id === q || state.accountUid === q || state.idHistory.includes(q)) {
      setTargetMode('self');
      setSearchStatus(`Найдено: ваш собственный профиль #${state.id} (UID: ${state.accountUid})`);
      setFoundPlayer(null);
      return;
    }

    // Search in city registry
    const match = cityCitizens.find(
      (c) => c.id === q || c.accountUid === q || c.idHistory.includes(q)
    );

    if (match) {
      setTargetMode('other');
      setFoundPlayer(match);
      setWarnsCount(match.warns);
      setBanReason(match.banReason || 'Нарушение правил мегаполиса');
      if (match.idHistory.length > 1 && match.idHistory[0] !== match.id) {
        setSearchStatus(
          `⚠️ Внимание! Игрок сменил номер: исходный ID #${match.idHistory[0]} → текущий VIP #${match.id}. Бан привязан к постоянному UID: ${match.accountUid}!`
        );
      } else {
        setSearchStatus(`Найден гражданин: ${match.username} (ID: #${match.id})`);
      }
    } else {
      // Create new player entry if not found
      const newSimulated: SimulatedPlayer = {
        accountUid: 'usr_auto_' + Math.random().toString(36).substring(2, 8),
        id: q,
        idHistory: [q],
        username: `Гражданин_${q}`,
        rub: 100_000,
        usdCash: 1_000,
        btc: 0.1,
        eur: 0,
        warns: 0,
        isBanned: false,
        banReason: '',
        banExpiresAt: 0,
        carPlate: 'О' + q.slice(0, 3) + 'ОО77',
        estateId: 'e_1',
      };
      const updated = [...cityCitizens, newSimulated];
      setCityCitizens(updated);
      localStorage.setItem('metropolis_admin_citizens', JSON.stringify(updated));
      setTargetMode('other');
      setFoundPlayer(newSimulated);
      setWarnsCount(0);
      setSearchStatus(`Зарегистрирован в базе новый гражданин ID #${q}`);
    }
  };

  const handleApplyCurrencies = () => {
    if (targetMode === 'self') {
      onUpdateState((prev) => ({
        ...prev,
        rub: Math.max(0, parseInt(editRub, 10) || prev.rub),
        usdCash: Math.max(0, parseInt(editUsdCash, 10) || prev.usdCash),
        usdOffshore: Math.max(0, parseInt(editUsdOffshore, 10) || prev.usdOffshore),
        btc: Math.max(0, parseFloat(editBtc) || prev.btc),
        eur: Math.max(0, parseInt(editEur, 10) || prev.eur),
        energy: Math.min(100, Math.max(0, parseInt(editEnergy, 10) || prev.energy)),
        karma: parseInt(editKarma, 10) || prev.karma,
      }));
      setMsg('Балансы валют вашего персонажа успешно обновлены!');
    } else if (foundPlayer) {
      const updatedList = cityCitizens.map((c) => {
        if (c.accountUid === foundPlayer.accountUid) {
          return {
            ...c,
            rub: Math.max(0, parseInt(editRub, 10) || c.rub),
            usdCash: Math.max(0, parseInt(editUsdCash, 10) || c.usdCash),
            btc: Math.max(0, parseFloat(editBtc) || c.btc),
            eur: Math.max(0, parseInt(editEur, 10) || c.eur),
          };
        }
        return c;
      });
      setCityCitizens(updatedList);
      localStorage.setItem('metropolis_admin_citizens', JSON.stringify(updatedList));
      setMsg(`Балансы игрока ${foundPlayer.username} (#${foundPlayer.id}) обновлены!`);
    }
  };

  const handleApplyIdentityAndAssets = () => {
    if (targetMode === 'self') {
      onUpdateState((prev) => {
        const nextIdHistory = prev.idHistory.includes(editPlayerId)
          ? prev.idHistory
          : [...prev.idHistory, editPlayerId];

        const carDef = CARS.find((c) => c.id === selectedCarId);
        const newCar: CarState | null = carDef
          ? {
              id: selectedCarId,
              hp: Math.round(carDef.hp * (1 + (carDef.stageBoost || 0.15) * editCarStage)),
              stage: editCarStage,
              fuel: 40,
              cond: 100,
              plateNumber: editCarPlate.toUpperCase(),
              purchasedAt: Date.now(),
            }
          : prev.car;

        const ownedPlates = prev.ownedPlates.includes(editCarPlate)
          ? prev.ownedPlates
          : [...prev.ownedPlates, editCarPlate.toUpperCase()];

        return {
          ...prev,
          id: editPlayerId,
          idHistory: nextIdHistory,
          passportSerial: editPassport,
          estateId: selectedEstateId,
          car: newCar,
          ownedPlates,
        };
      });
      setMsg('Идентификатор, паспорт, авто и недвижимость успешно обновлены!');
    } else if (foundPlayer) {
      const updatedList = cityCitizens.map((c) => {
        if (c.accountUid === foundPlayer.accountUid) {
          const nextHistory = c.idHistory.includes(editPlayerId) ? c.idHistory : [...c.idHistory, editPlayerId];
          return {
            ...c,
            id: editPlayerId,
            idHistory: nextHistory,
            carPlate: editCarPlate,
            estateId: selectedEstateId,
          };
        }
        return c;
      });
      setCityCitizens(updatedList);
      localStorage.setItem('metropolis_admin_citizens', JSON.stringify(updatedList));
      setMsg(`Данные и номера игрока ${foundPlayer.username} сохранены!`);
    }
  };

  const handleGrantItems = () => {
    if (targetMode === 'self') {
      onUpdateState((prev) => {
        const inv = [...prev.inventory];
        for (let i = 0; i < itemCount; i++) {
          inv.push(selectedItem);
        }
        return { ...prev, inventory: inv };
      });
      setMsg(`Выдано ${itemCount} шт. [${selectedItem}] в инвентарь`);
    } else {
      setMsg(`Предмет [${selectedItem}] (${itemCount} шт.) отправлен гражданину ID #${foundPlayer?.id}`);
    }
  };

  const handleGrantOre = () => {
    if (targetMode === 'self') {
      onUpdateState((prev) => ({
        ...prev,
        ores: {
          ...prev.ores,
          [selectedOre]: (prev.ores[selectedOre] || 0) + oreCount,
        },
      }));
      setMsg(`На склад начислено +${oreCount} шт. [${selectedOre}]`);
    } else {
      setMsg(`Партия руды [${selectedOre}] (+${oreCount} шт.) передана игроку ID #${foundPlayer?.id}`);
    }
  };

  // Moderation: Warns & Bans
  const handleSetWarns = (count: number) => {
    setWarnsCount(count);
    const isAutoBanned = count >= 3;
    const expires = Date.now() + 86400000 * 7;

    if (targetMode === 'self') {
      onUpdateState((prev) => ({
        ...prev,
        warns: count,
        isBanned: isAutoBanned || prev.isBanned,
        banReason: isAutoBanned ? 'Блокировка за получение 3/3 предупреждений' : prev.banReason,
        banExpiresAt: isAutoBanned ? expires : prev.banExpiresAt,
      }));
    } else if (foundPlayer) {
      const updatedList = cityCitizens.map((c) => {
        if (c.accountUid === foundPlayer.accountUid) {
          return {
            ...c,
            warns: count,
            isBanned: isAutoBanned || c.isBanned,
            banReason: isAutoBanned ? 'Блокировка за получение 3/3 предупреждений' : c.banReason,
            banExpiresAt: isAutoBanned ? expires : c.banExpiresAt,
          };
        }
        return c;
      });
      setCityCitizens(updatedList);
      localStorage.setItem('metropolis_admin_citizens', JSON.stringify(updatedList));
    }
    setMsg(`Установлено предупреждений: ${count}/3${isAutoBanned ? ' (Аккаунт заблокирован!)' : ''}`);
  };

  const handleIssueBan = () => {
    const expires = banHours === -1 ? Number.MAX_SAFE_INTEGER : Date.now() + banHours * 3600000;
    const reason = banReason.trim() || 'Блокировка администратором за нарушение экономики';

    if (targetMode === 'self') {
      onUpdateState((prev) => ({
        ...prev,
        isBanned: true,
        banReason: reason,
        banExpiresAt: expires,
      }));
      setMsg('Ваш аккаунт заблокирован администратором!');
    } else if (foundPlayer) {
      const updatedList = cityCitizens.map((c) => {
        if (c.accountUid === foundPlayer.accountUid) {
          return {
            ...c,
            isBanned: true,
            banReason: reason,
            banExpiresAt: expires,
          };
        }
        return c;
      });
      setCityCitizens(updatedList);
      localStorage.setItem('metropolis_admin_citizens', JSON.stringify(updatedList));
      setFoundPlayer((prev) => (prev ? { ...prev, isBanned: true, banReason: reason, banExpiresAt: expires } : null));
      setMsg(`Гражданин ${foundPlayer.username} (ID: #${foundPlayer.id}, UID: ${foundPlayer.accountUid}) заблокирован!`);
    }
  };

  const handleLiftBan = () => {
    if (targetMode === 'self') {
      onUpdateState((prev) => ({
        ...prev,
        isBanned: false,
        banReason: '',
        banExpiresAt: 0,
        warns: 0,
      }));
      setWarnsCount(0);
      setMsg('Блокировка снята, предупреждения обнулены!');
    } else if (foundPlayer) {
      const updatedList = cityCitizens.map((c) => {
        if (c.accountUid === foundPlayer.accountUid) {
          return {
            ...c,
            isBanned: false,
            banReason: '',
            banExpiresAt: 0,
            warns: 0,
          };
        }
        return c;
      });
      setCityCitizens(updatedList);
      localStorage.setItem('metropolis_admin_citizens', JSON.stringify(updatedList));
      setFoundPlayer((prev) => (prev ? { ...prev, isBanned: false, banReason: '', banExpiresAt: 0, warns: 0 } : null));
      setWarnsCount(0);
      setMsg(`Блокировка гражданина ${foundPlayer.username} (#${foundPlayer.id}) полностью снята.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="glass-panel rounded-2xl p-6 max-w-4xl w-full border border-amber-500/30 my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Административная Панель Управления (Admin Console)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Authorization Screen if not yet unlocked */}
        {!isAdminAuthenticated ? (
          <div className="py-8 text-center space-y-4 max-w-sm mx-auto">
            <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto" />
            <h4 className="font-bold text-white text-base">Требуется Авторизация</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Введите постоянный мастер-код администратора для доступа ко всем ресурсам, валютам и модерации игроков:
            </p>

            <input
              type="password"
              placeholder="Мастер-код..."
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-center text-sm font-mono tracking-widest"
              autoFocus
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-semibold">Неверный мастер-код доступа!</p>
            )}

            <button
              onClick={handleVerifyPin}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-600/20"
            >
              Войти в админ-панель
            </button>
          </div>
        ) : (
          <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {msg && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{msg}</span>
                </div>
                <button onClick={() => setMsg(null)} className="text-[11px] underline ml-2">ОК</button>
              </div>
            )}

            {/* Target Player Selector & Search by ID (with Anti-Ban-Evasion verification) */}
            <div className="p-4 rounded-xl bg-white/[0.04] border border-amber-500/20 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  Выбор целевого гражданина для управления
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTargetMode('self');
                      setFoundPlayer(null);
                      setWarnsCount(state.warns);
                      setSearchStatus(null);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      targetMode === 'self'
                        ? 'bg-amber-600 text-slate-950'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    Мой профиль (#{state.id})
                  </button>
                </div>
              </div>

              {/* Search by ID input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchIdInput}
                    onChange={(e) => setSearchIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchPlayer()}
                    placeholder="Введите любой ID игрока (текущий или прошлый) либо accountUid..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
                <button
                  onClick={handleSearchPlayer}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Найти
                </button>
              </div>

              {searchStatus && (
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-amber-500/20 text-xs text-amber-200">
                  {searchStatus}
                </div>
              )}

              {/* Active target profile summary */}
              <div className="p-3 rounded-lg bg-black/40 border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div>
                  Цель: <span className="text-white font-bold">{targetMode === 'self' ? state.username + ' (Вы)' : foundPlayer?.username}</span>
                </div>
                <div>
                  ID: <span className="text-amber-400 font-bold">#{targetMode === 'self' ? state.id : foundPlayer?.id}</span>
                </div>
                <div>
                  Статус: <span className={(targetMode === 'self' ? state.isBanned : foundPlayer?.isBanned) ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {(targetMode === 'self' ? state.isBanned : foundPlayer?.isBanned) ? '⛔ ЗАБЛОКИРОВАН' : '✅ АКТИВЕН'}
                  </span>
                </div>
                <div className="sm:col-span-2 text-slate-400">
                  Постоянный UID: <span className="text-slate-200">{targetMode === 'self' ? state.accountUid : foundPlayer?.accountUid}</span>
                </div>
                <div className="text-slate-400">
                  История номеров: <span className="text-sky-300">[{targetMode === 'self' ? state.idHistory.join(', ') : foundPlayer?.idHistory.join(', ')}]</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-200/90 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Защита от абуза смены ID:</strong> Если игрок покупает красивый или блатной номер, система фиксирует старый номер в <code>idHistory</code>. Бан и предупреждения накладываются на неизменяемый <code>accountUid</code>, поэтому покупка нового номера не позволяет избежать наказания.
                </span>
              </div>
            </div>

            {/* Sector 1: Currency Mint */}
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 space-y-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                1. Управление Валютами и Балансами
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400">Наличные рубли (₽):</span>
                  <input
                    type="number"
                    value={editRub}
                    onChange={(e) => setEditRub(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Нал. доллары ($):</span>
                  <input
                    type="number"
                    value={editUsdCash}
                    onChange={(e) => setEditUsdCash(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Оффшор доллары ($):</span>
                  <input
                    type="number"
                    value={editUsdOffshore}
                    onChange={(e) => setEditUsdOffshore(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Биткоин (₿):</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editBtc}
                    onChange={(e) => setEditBtc(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Евро (€, Донат):</span>
                  <input
                    type="number"
                    value={editEur}
                    onChange={(e) => setEditEur(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Энергия (0..100):</span>
                  <input
                    type="number"
                    value={editEnergy}
                    onChange={(e) => setEditEnergy(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Карма (-10k..+10k):</span>
                  <input
                    type="number"
                    value={editKarma}
                    onChange={(e) => setEditKarma(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleApplyCurrencies}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    Применить балансы
                  </button>
                </div>
              </div>
            </div>

            {/* Sector 2: Identity, Custom Plate, Vehicles & Real Estate */}
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 space-y-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-sky-400" />
                2. Изменение ID, Номеров, Автомобилей и Недвижимости
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-400">Игровой ID (номер гражданина):</span>
                  <input
                    type="text"
                    value={editPlayerId}
                    onChange={(e) => setEditPlayerId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Серия и номер паспорта:</span>
                  <input
                    type="text"
                    value={editPassport}
                    onChange={(e) => setEditPassport(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Госномер авто (Любая серия):</span>
                  <input
                    type="text"
                    value={editCarPlate}
                    onChange={(e) => setEditCarPlate(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Модель авто:</span>
                  <select
                    value={selectedCarId}
                    onChange={(e) => setSelectedCarId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs"
                  >
                    {CARS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.hp} л.с.)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-slate-400">Уровень тюнинга Stage:</span>
                  <select
                    value={editCarStage}
                    onChange={(e) => setEditCarStage(parseInt(e.target.value))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs"
                  >
                    <option value={0}>Стоковый (Stage 0)</option>
                    <option value={1}>Stage 1 (+15% л.с.)</option>
                    <option value={2}>Stage 2 (+30% л.с.)</option>
                    <option value={3}>Stage 3 (+45% л.с.)</option>
                  </select>
                </div>
                <div>
                  <span className="text-slate-400">Недвижимость:</span>
                  <select
                    value={selectedEstateId}
                    onChange={(e) => setSelectedEstateId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg glass-input text-xs"
                  >
                    {ESTATES.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleApplyIdentityAndAssets}
                className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
              >
                Сохранить ID, Номера и Имущество
              </button>
            </div>

            {/* Sector 3: Items & Consumables */}
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 space-y-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                3. Выдача Предметов и Расходников
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs"
                >
                  <option value="fake_passport">Поддельный военник (fake_passport)</option>
                  <option value="contraband">Партия контрабанды (contraband)</option>
                  <option value="module_fake">Модуль фальшивомонетчика (module_fake)</option>
                  <option value="weapon_crate">Ящик армейского оружия (weapon_crate)</option>
                  <option value="chip_hack">Чип взлома (chip_hack)</option>
                  <option value="soft_hacker">Софт Хакер v4 (soft_hacker)</option>
                  <option value="pharma_batch">Партия спецпрепаратов (pharma_batch)</option>
                  <option value="pc">Персональный компьютер ПК (pc)</option>
                  <option value="bicycle">Велосипед (bicycle)</option>
                  <option value="azart_pack">Azart-Pack VIP (azart_pack)</option>
                  <option value="support_pack">Support-Pack (support_pack)</option>
                  <option value="businessman_pack">Businessman-Pack (businessman_pack)</option>
                  <option value="kingsman_pack">KingsMan Don-Pack (kingsman_pack)</option>
                  <option value="millionaire_pack">Millionaire-Pack (millionaire_pack)</option>
                  <option value="license_zero_spread">Лицензия 0% спреда (license_zero_spread)</option>
                </select>

                <input
                  type="number"
                  min={1}
                  value={itemCount}
                  onChange={(e) => setItemCount(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-1.5 rounded-lg glass-input text-xs font-mono"
                />

                <button
                  onClick={handleGrantItems}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  Выдать предмет
                </button>
              </div>
            </div>

            {/* Sector 4: Ore & Mining Stock */}
            <div className="p-4 rounded-xl glass-panel-subtle border border-white/10 space-y-3">
              <span className="font-bold text-white text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                4. Шахта и Добыча Руды
              </span>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedOre}
                  onChange={(e) => setSelectedOre(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs"
                >
                  {ORES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} (Тир {o.tier})
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  value={oreCount}
                  onChange={(e) => setOreCount(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-1.5 rounded-lg glass-input text-xs font-mono"
                />

                <button
                  onClick={handleGrantOre}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Начислить руду
                </button>

                {targetMode === 'self' && (
                  <button
                    onClick={() => {
                      onUpdateState((prev) => ({ ...prev, vein: 50000 }));
                      setMsg('Жила шахты полностью восстановлена до 50 000 ед.!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs"
                  >
                    Жила: 50 000 ед.
                  </button>
                )}
              </div>
            </div>

            {/* Sector 5: Moderation Desk */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
              <span className="font-bold text-rose-300 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                5. Модерация: Предупреждения (Варны) и Блокировка (Бан)
              </span>

              <div className="flex flex-col sm:flex-row gap-3 items-center">
                {/* Warns Controls */}
                <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/10">
                  <span className="text-slate-300">Предупреждения:</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((w) => (
                      <button
                        key={w}
                        onClick={() => handleSetWarns(w)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                          warnsCount === w
                            ? w === 3
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-slate-950'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ban Controls */}
                <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
                  <select
                    value={banHours}
                    onChange={(e) => setBanHours(parseInt(e.target.value))}
                    className="px-3 py-1.5 rounded-lg glass-input text-xs"
                  >
                    <option value={1}>1 час</option>
                    <option value={24}>24 часа (1 день)</option>
                    <option value={168}>7 дней</option>
                    <option value={720}>30 дней</option>
                    <option value={-1}>Перманентно (навсегда)</option>
                  </select>

                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Причина бана..."
                    className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs"
                  />

                  {(targetMode === 'self' ? state.isBanned : foundPlayer?.isBanned) ? (
                    <button
                      onClick={handleLiftBan}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
                    >
                      Снять БАН
                    </button>
                  ) : (
                    <button
                      onClick={handleIssueBan}
                      className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs shrink-0 shadow-lg shadow-rose-900/40"
                    >
                      Выдать БАН
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
