'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';

interface ChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Chat({ messages, onSend, isCollapsed = false, onToggle }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col bg-wood-900/80 border border-wood-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3 bg-wood-800 border-b border-wood-700 lg:cursor-default"
      >
        <span className="text-cream-100 font-medium">Chat</span>
        <span className="text-wood-400 text-sm lg:hidden">
          {isCollapsed ? 'Show' : 'Hide'}
        </span>
      </button>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[400px] lg:min-h-[300px]">
            {messages.length === 0 && (
              <p className="text-wood-500 text-sm text-center py-4">No messages yet</p>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.isSystem ? (
                  <div className="text-center text-wood-400 text-xs py-1 italic">
                    {msg.text}
                  </div>
                ) : (
                  <div className="flex gap-2 items-start">
                    <span className="text-wood-300 font-medium text-sm shrink-0">
                      {msg.playerName}:
                    </span>
                    <span className="text-cream-200 text-sm break-words min-w-0">
                      {msg.text}
                    </span>
                    <span className="text-wood-600 text-xs shrink-0 ml-auto">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-wood-700">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1 px-3 py-2 rounded-lg bg-wood-950 border border-wood-700 text-cream-100 placeholder:text-wood-600 text-sm focus:outline-none focus:ring-1 focus:ring-wood-400"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg bg-wood-600 hover:bg-wood-500 text-cream-100 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}
