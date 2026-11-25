import React, { useEffect, useState } from 'react';
import { Bot, MessageSquare, Send, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { apiFetch } from '../utils/api';

interface FaqItem {
  id: string;
  topic: string;
  question: { en: string; ta: string; hi: string };
  answer: { en: string; ta: string; hi: string };
}

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
}

export function PollBotPanel({ inline = false }: { inline?: boolean }) {
  const { language, pollbotOpen, setPollbotOpen } = useApp();
  const [mode, setMode] = useState<'faq' | 'ai'>('faq');
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: 'Hello! I am PollBot, your neutral civic guide for Smart Election Portal. Select a quick FAQ topic or ask a question about voter services, application tracking, polling stations, or verification demos.',
      meta: 'Neutral Civic Info',
    },
  ]);

  useEffect(() => {
    apiFetch<{ faqs: FaqItem[] }>('/api/pollbot/faqs')
      .then((res) => setFaqs(res.faqs))
      .catch(() => {});
  }, []);

  const sendMessage = async (textToSend?: string) => {
    const q = (textToSend ?? input).trim();
    if (!q || loading) return;
    setError('');
    setInput('');
    const nextHistory = [...messages, { role: 'user' as const, text: q }];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const res = await apiFetch<{ reply: string; source: string; matchedTopic?: string }>('/api/pollbot/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: q,
          language,
          mode,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          meta: res.source === 'faq' ? `FAQ · ${res.matchedTopic || 'Verified'}` : 'AI Assistant · Neutral Mode',
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach PollBot.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!inline && !pollbotOpen) {
    return (
      <button
        type="button"
        onClick={() => setPollbotOpen(true)}
        aria-label="Open PollBot Civic Assistant"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#0F2544] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#16345E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
      >
        <Bot className="h-5 w-5 text-amber-400" />
        <span className="whitespace-nowrap">PollBot</span>
      </button>
    );
  }

  return (
    <div
      className={
        inline
          ? 'flex h-[540px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white'
          : 'fixed bottom-5 right-5 z-50 flex h-[540px] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl'
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-[#0F2544] px-4 py-3 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <Bot className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{t(language, 'pollbotTitle')}</h3>
            <p className="truncate text-[11px] text-slate-300">{t(language, 'pollbotSub')}</p>
          </div>
        </div>
        {!inline && (
          <button
            type="button"
            onClick={() => setPollbotOpen(false)}
            aria-label="Close PollBot"
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mode Switch & Non-Partisan Banner */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-0.5">
          <button
            type="button"
            onClick={() => {
              setMode('faq');
              setError('');
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              mode === 'faq' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Verified FAQ
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('ai');
              setError('');
            }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              mode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Assistant
          </button>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
          Non-partisan
        </span>
      </div>

      {/* Quick FAQ Topic Chips (Interactive controls) */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2">
        {faqs.slice(0, 5).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => sendMessage(f.question[language])}
            className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 whitespace-nowrap transition-colors"
          >
            {f.topic}
          </button>
        ))}
      </div>

      {/* Message Feed */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#1D4ED8] text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              {m.text}
            </div>
            {m.meta && <span className="mt-1 px-1 text-[11px] text-slate-400">{m.meta}</span>}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>PollBot is preparing a neutral response...</span>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage();
        }}
        className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about voter services, stations, FAQs..."
          className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message to PollBot"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F2544] text-white hover:bg-[#16345E] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
