import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../types/game';
import { calcTotalCapital, getPrestigeInfo } from '../services/gameEngine';
import {
  saveChatMessageToFirestore,
  loadChatMessagesFromFirestore,
  clearChatHistoryInFirestore,
  ChatMessageDoc,
} from '../services/firestoreDatabase';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Trash2,
  RefreshCw,
  Cpu,
  Brain,
  Zap,
  TrendingUp,
  Shield,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';

export type AgentRoleType = 'consultant' | 'strategist' | 'guide';

interface AgentRoleConfig {
  id: AgentRoleType;
  title: string;
  desc: string;
  model: 'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';
  badge: string;
  icon: React.ReactNode;
  color: string;
  systemInstruction: (state: GameState) => string;
  defaultGreeting: string;
}

const AGENT_ROLES: Record<AgentRoleType, AgentRoleConfig> = {
  consultant: {
    id: 'consultant',
    title: 'Финансовый Консультант',
    desc: 'Оптимизация бизнеса, вкладов, валютного спреда и криптоферм',
    model: 'gemini-3.8-flash',
    badge: 'gemini-3.8-flash',
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300',
    systemInstruction: (state) => `Вы — персональный финансовый советник в экономической стратегии METROPOLIS v0.16.
Текущие показатели гражданина ${state.username}:
- Капитал: ${calcTotalCapital(state).toLocaleString('ru-RU')} ₽ (Престиж: ${getPrestigeInfo(calcTotalCapital(state)).title})
- Наличные: ${state.rub.toLocaleString('ru-RU')} ₽, ${state.usdCash} $, ${state.btc.toFixed(4)} ₿
- Вклад в Банке: ${state.depositRub.toLocaleString('ru-RU')} ₽ (0.75% в день)
- Предприятия: ${state.businesses.length} шт., Серверные стойки: ${Object.values(state.servers).reduce((a, b) => a + b, 0)} шт.
- Карма: ${state.karma} (Налог на бизнес: ${state.karma >= 1000 ? '6%' : '13%'})
Отвечайте на русском языке, давайте практичные финансовые советы по игре, расчетам окупаемости и росту капитала. Будьте вежливы и экспертны.`,
    defaultGreeting: 'Здравствуйте! Я ваш финансовый консультант в Метрополисе. Помогу рассчитать доходность бизнесов, вкладов и криптоферм. Какой вопрос вас интересует?',
  },
  strategist: {
    id: 'strategist',
    title: 'Стратег Мегапроектов',
    desc: 'Сложные многоходовки, эндгейм, Престиж и Мегаполис',
    model: 'gemini-4-argon',
    badge: 'gemini-4-argon',
    icon: <Brain className="w-4 h-4 text-purple-400" />,
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-300',
    systemInstruction: (state) => `Вы — главный ИИ-стратег мегапроекта Метрополис (модель Gemini 4 Argon).
Проводите сложный системный анализ, оптимизацию цепочек производства и эндгейм-целей:
- Гражданин: ${state.username}, текущий капитал: ${calcTotalCapital(state).toLocaleString('ru-RU')} ₽
- Статус Мегаполиса: ${state.megacity.unlocked ? 'Основан' : 'Заблокирован (требуется 432 млн ₽, Престиж VII Олигарх)'}
- Облигации в портфеле: ${(state.megacity.sovereignBondsRub || 0).toLocaleString('ru-RU')} ₽
- Население города: ${state.megacity.population.toLocaleString('ru-RU')} чел.
Давайте глубокие стратегические советы по выходу в высшие ранги Престижа, выполнению пяти фаз строительства города-спутника и максимизации дивидендов.`,
    defaultGreeting: 'Приветствую. Я стратегический аналитик на базе Gemini 4 Argon. Готов рассчитать оптимальный маршрут к статусу Олигарха и запуску суверенного Мегаполиса.',
  },
  guide: {
    id: 'guide',
    title: 'Экспресс-Гид по Законам',
    desc: 'Быстрые и четкие справки по правилам, штрафам и лицензиям',
    model: 'gemini-3.1-flash-lite',
    badge: 'gemini-3.1-flash-lite',
    icon: <Zap className="w-4 h-4 text-sky-400" />,
    color: 'from-sky-500/20 to-cyan-500/20 border-sky-500/30 text-sky-300',
    systemInstruction: (state) => `Вы — экспресс-справочник правил и законов Метрополиса (модель Gemini 3.1 Flash Lite).
Отвечайте максимально быстро, четко, лаконично (1-3 емких предложения).
Данные гражданина: Права: ${state.hasDriverLicense ? 'есть' : 'нет'}, Военный билет: ${state.hasMilitaryTicket ? 'есть' : 'нет'}, Образование: ступень ${state.eduLevel}/5, Штрафы: ${state.finesLog.length}.`,
    defaultGreeting: 'Мгновенный гид на связи! Спрашивайте о штрафах, правах, военном билете, правилах казино или шахте — отвечу мгновенно.',
  },
};

interface MessageItem {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  timestamp: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  userId?: string | null;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GeminiChatModal: React.FC<Props> = ({
  isOpen,
  onClose,
  state,
  userId,
  onShowToast,
}) => {
  const [selectedRole, setSelectedRole] = useState<AgentRoleType>('consultant');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeRoleConfig = AGENT_ROLES[selectedRole];

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat history from Firestore on open/login
  useEffect(() => {
    if (!isOpen) return;

    if (userId) {
      loadChatMessagesFromFirestore(userId).then((history) => {
        if (history.length > 0) {
          setMessages(
            history.map((h, i) => ({
              id: h.id || `msg_${i}`,
              role: h.role,
              content: h.content,
              modelUsed: h.modelUsed,
              timestamp: h.timestamp,
            }))
          );
        } else {
          setMessages([
            {
              id: 'init_welcome',
              role: 'model',
              content: activeRoleConfig.defaultGreeting,
              modelUsed: activeRoleConfig.model,
              timestamp: Date.now(),
            },
          ]);
        }
      });
    } else {
      // Unauthenticated fallback
      if (messages.length === 0) {
        setMessages([
          {
            id: 'init_welcome',
            role: 'model',
            content: activeRoleConfig.defaultGreeting,
            modelUsed: activeRoleConfig.model,
            timestamp: Date.now(),
          },
        ]);
      }
    }
  }, [isOpen, userId, selectedRole]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: MessageItem = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Save user message to Firestore if authenticated
    if (userId) {
      saveChatMessageToFirestore(userId, {
        userId,
        role: 'user',
        content: text,
        agentRole: selectedRole,
        modelUsed: activeRoleConfig.model,
        timestamp: Date.now(),
      });
    }

    try {
      // Send conversation history to backend proxy route
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          systemInstruction: activeRoleConfig.systemInstruction(state),
          model: activeRoleConfig.model,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.reply || 'Ответ не получен';

      const botMessage: MessageItem = {
        id: `msg_m_${Date.now()}`,
        role: 'model',
        content: botReply,
        modelUsed: data.modelUsed || activeRoleConfig.model,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);

      // Save bot reply to Firestore
      if (userId) {
        saveChatMessageToFirestore(userId, {
          userId,
          role: 'model',
          content: botReply,
          agentRole: selectedRole,
          modelUsed: data.modelUsed || activeRoleConfig.model,
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `msg_err_${Date.now()}`,
        role: 'model',
        content: `⚠️ Не удалось связаться с сервером ИИ: ${err.message || 'Ошибка сети'}. Попробуйте снова через несколько секунд.`,
        modelUsed: activeRoleConfig.model,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (userId) {
      await clearChatHistoryInFirestore(userId);
    }
    setMessages([
      {
        id: `msg_init_${Date.now()}`,
        role: 'model',
        content: activeRoleConfig.defaultGreeting,
        modelUsed: activeRoleConfig.model,
        timestamp: Date.now(),
      },
    ]);
    onShowToast?.('История диалога очищена', 'info');
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="glass-panel rounded-3xl w-full max-w-3xl h-[85vh] max-h-[800px] border border-sky-500/30 shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-white/10 bg-black/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">ИИ-Советник Метрополиса</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  Gemini API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Интеллектуальный помощник с контекстом ваших активов и бизнеса
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Очистить историю чата"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Закрыть окно"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Role Selector Tabs (3 Specialized Models) */}
        <div className="p-3 bg-white/[0.02] border-b border-white/5 flex items-center gap-2 overflow-x-auto shrink-0">
          {(Object.keys(AGENT_ROLES) as AgentRoleType[]).map((rKey) => {
            const role = AGENT_ROLES[rKey];
            const isActive = selectedRole === rKey;
            return (
              <button
                key={rKey}
                onClick={() => setSelectedRole(rKey)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-white border border-sky-400/40 shadow-md shadow-sky-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {role.icon}
                <span>{role.title}</span>
                <span className="text-[9px] font-mono opacity-60">[{role.badge}]</span>
              </button>
            );
          })}
        </div>

        {/* Messages Scrollable Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                  <span>{isUser ? state.username : activeRoleConfig.title}</span>
                  {m.modelUsed && !isUser && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-purple-300 border border-white/10">
                      {m.modelUsed}
                    </span>
                  )}
                  <span>·</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-sky-600/20'
                      : 'bg-white/[0.04] border border-white/10 text-slate-200 rounded-tl-none backdrop-blur-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap select-text">{m.content}</p>

                  <button
                    onClick={() => handleCopyText(m.id, m.content)}
                    className="absolute bottom-2 right-2 p-1 rounded-lg bg-black/40 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Скопировать ответ"
                  >
                    {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </motion.div>
            );
          })}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-start">
              <span className="text-[11px] font-mono text-slate-400 mb-1 px-1">
                {activeRoleConfig.title} печатает...
              </span>
              <div className="rounded-2xl rounded-tl-none p-3.5 bg-white/[0.04] border border-white/10 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                <span className="text-xs text-slate-300 font-mono">Генерация ответа ({activeRoleConfig.model})...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="px-4 py-2 border-t border-white/5 bg-black/40 flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[11px] text-slate-500 font-mono shrink-0">Подсказки:</span>
          {[
            'Как быстрее всего стать Олигархом?',
            'Стоит ли покупать криптоферму BTC?',
            'Как снизить налоги на бизнес до 6%?',
            'Где надежнее всего хранить рубли?',
          ].map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(promptText)}
              disabled={isLoading}
              className="px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-[11px] text-slate-300 hover:text-white transition-all whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-black/70 border-t border-white/10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Спросите ${activeRoleConfig.title.toLowerCase()}...`}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl glass-input text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
