import React, { useState } from 'react';
import { Bot, ExternalLink, Send } from 'lucide-react';
import api from '../services/api';

// Generic AI / Copilot entrypoint for the dashboard
// This is a presentational chat UI to host future AI integrations (e.g. Ginimi).

const AI_LINK = '';

const AI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<{ id: number; role: 'ai' | 'user'; text: string }[]>([
    {
      id: 1,
      role: 'ai',
      text: '…',
    },
  ]);

  const callAi = async (text: string) => {
    try {
      const response = await api.post('/ai/chat', { chatInput: text });
      const output = response?.data?.output;
      return typeof output === 'string' && output.trim() ? output : 'ขออภัย ระบบขัดข้อง';
    } catch (error: any) {
      const responseData = error?.response?.data;
      const serverMessage =
        typeof responseData === 'string'
          ? null
          : responseData?.message || responseData?.error?.message;
      const message =
        serverMessage ||
        error?.message ||
        'ขออภัย ระบบขัดข้อง';
      throw new Error(message);
    }
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isSending) return;

    let aiId = 0;

    setMessages((prev) => {
      const nextId = prev.length + 1;
      aiId = nextId + 1;
      return [
        ...prev,
        { id: nextId, role: 'user', text: trimmed },
        { id: nextId + 1, role: 'ai', text: '…' },
      ];
    });
    setInput('');

    setIsSending(true);
    callAi(trimmed)
      .then((answer) => {
        setMessages((prev) => prev.map((msg) => (msg.id === aiId ? { ...msg, text: answer } : msg)));
      })
      .catch((error: any) => {
        const message =
          typeof error?.message === 'string' && error.message
            ? error.message
            : 'ขออภัย ระบบขัดข้อง';
        setMessages((prev) => prev.map((msg) => (msg.id === aiId ? { ...msg, text: message } : msg)));
      })
      .finally(() => {
        setIsSending(false);
      });
  };

  return (
    <div
      className="fixed z-[140] flex flex-col items-end gap-2"
      style={{
        bottom: '3.5rem',
        right: '2rem',
      }}
    >
      {isOpen && (
        <div className="mb-2 w-[320px] max-w-[95vw] h-[450px] rounded-2xl border border-[#3f3f3f] bg-[#d4d4d4] shadow-2xl overflow-hidden flex flex-col">
          <div
            className="flex items-center justify-between px-4 py-3 bg-[#5b5b5b] text-white cursor-move select-none"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                <Bot className="h-5 w-5 text-[#147efb]" />
              </span>
              <span className="text-[12px] font-semibold tracking-[0.22em] uppercase">RGA Chatbot</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-white/90 hover:text-white disabled:opacity-40"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => {
                  if (!AI_LINK) return;
                  window.open(AI_LINK, '_blank', 'noopener,noreferrer');
                }}
                disabled={!AI_LINK}
                aria-label="Open AI link"
              >
                <ExternalLink className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="text-white/90 hover:text-white text-2xl leading-none"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#d4d4d4] px-4 py-4 space-y-5">
            {messages.map((msg) => {
              if (msg.role === 'ai') {
                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      <Bot className="h-5 w-5 text-[#147efb]" />
                    </span>
                    <div className="rounded-xl bg-[#4b4b4b] text-white text-sm px-4 py-2 shadow-md">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="rounded-xl bg-[#f97316] text-white text-sm px-4 py-2 shadow-md">
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#5b5b5b] px-4 py-3">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type message..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316] text-white shadow-md hover:bg-[#ea580c] disabled:opacity-40"
                disabled={!input.trim() || isSending}
                aria-label="Send"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center justify-center h-12 w-12 rounded-full shadow-lg bg-white border border-gray-300 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-2xl hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#147efb]/40"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#147efb] text-white text-xs font-semibold transition-transform duration-200 group-hover:scale-105">AI</span>
      </button>
    </div>
  );
};

export default AI;
