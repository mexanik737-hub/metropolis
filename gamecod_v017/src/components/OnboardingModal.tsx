import React, { useState } from 'react';
import { Gender } from '../types/game';
import { generatePassportSerial } from '../services/gameEngine';
import { Building2, Sparkles, User, ShieldCheck } from 'lucide-react';

interface Props {
  onComplete: (username: string, gender: Gender) => void;
}

export const OnboardingModal: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('Гражданин');
  const [gender, setGender] = useState<Gender>('M');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = name.trim();
    if (cleaned.length < 3 || cleaned.length > 14) {
      setError('Имя гражданина должно содержать от 3 до 14 символов');
      return;
    }
    const regex = /^[a-zA-Zа-яА-ЯёЁ0-9_\s-]+$/;
    if (!regex.test(cleaned)) {
      setError('Имя может содержать только буквы и цифры');
      return;
    }

    setError(null);
    setLoading(true);

    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete(cleaned, gender);
        }, 500);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 select-none">
      <div className="glass-panel rounded-3xl p-8 max-w-md w-full border border-sky-500/30 text-center space-y-6 shadow-[0_0_80px_rgba(56,189,248,0.2)]">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center mx-auto text-slate-950 font-black shadow-lg shadow-sky-500/25 mb-3">
            <Building2 className="w-9 h-9" />
          </div>
          <span className="text-[11px] font-mono tracking-widest text-sky-400 font-bold uppercase">
            Паспортный стол Мэрии
          </span>
          <h2 className="text-2xl font-black text-white mt-1">Регистрация в Метрополисе</h2>
        </div>

        {loading ? (
          <div className="py-8 space-y-4">
            <div className="text-sm font-semibold text-sky-300">
              {progress < 100 ? 'Синхронизация с реестром граждан...' : 'Добро пожаловать в Метрополис!'}
            </div>

            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="text-xs font-mono text-slate-400">{progress}%</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">
                Имя гражданина (от 3 до 14 символов):
              </label>
              <input
                type="text"
                maxLength={14}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваш никнейм..."
                className="w-full px-4 py-2.5 rounded-xl glass-input text-sm font-medium"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-2">Выберите пол:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('M')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    gender === 'M'
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/10'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Мужской</div>
                  <div className="text-[10px] text-sky-300 mt-0.5">⚡ +5% к шансу в гонках</div>
                </button>

                <button
                  type="button"
                  onClick={() => setGender('F')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    gender === 'F'
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/10'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Женский</div>
                  <div className="text-[10px] text-emerald-300 mt-0.5">💎 -5% оффшорная комиссия</div>
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 hover:from-sky-400 hover:to-emerald-300 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-sky-500/25"
            >
              Оформить паспорт и войти
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
