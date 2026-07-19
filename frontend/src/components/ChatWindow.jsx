import { useEffect, useRef, useState } from 'react';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import MessageBubble from './MessageBubble';
import SessionDivider from './SessionDivider';
import ChatInput from './ChatInput';
import { speakText } from '../services/voiceClient';

export default function ChatWindow({ chat, onLogout }) {
  const { messages, sending, error, loadingHistory, sendUserMessage, regenerateLastReply, togglePin } = chat;
  const scrollRef = useRef(null);
  const wasSendingRef = useRef(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, sending]);

  // Auto-play a fresh reply when voice mode is on - triggers only on the
  // sending:true -> false transition, so loading old history never speaks.
  useEffect(() => {
    const justFinished = wasSendingRef.current && !sending;
    wasSendingRef.current = sending;

    if (!justFinished || !voiceMode) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;

    speakText(last.text)
      .then((audio) => audio.play())
      .catch((err) => setVoiceError(err.message || 'Could not play that reply aloud.'));
  }, [sending, voiceMode, messages]);

  const lastMessage = messages[messages.length - 1];
  const canRegenerate = lastMessage?.role === 'assistant' && !sending;
  const displayError = error || voiceError;

  return (
    <div className="h-full flex flex-col bg-deep">
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface shrink-0">
        <span className="font-display text-lg text-cream">Companion</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVoiceMode((v) => !v)}
            title={voiceMode ? 'Voice mode on - replies play automatically' : 'Voice mode off'}
            className={`p-2 rounded-full transition-colors ${voiceMode ? 'text-warm' : 'text-muted hover:text-cream'}`}
            aria-label="Toggle voice mode"
          >
            {voiceMode ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={onLogout} className="p-2 text-muted hover:text-cream transition-colors" aria-label="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
        {loadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-warm animate-pulse" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-8">
            <p className="text-muted text-sm leading-relaxed">
              This is the start of your conversation. Say whatever's on your mind — it's just us.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, i) => {
              const prevSessionId = i > 0 ? messages[i - 1].sessionId : null;
              const isNewSession = msg.sessionId !== prevSessionId;
              const isLatestSession = msg.sessionId === messages[messages.length - 1].sessionId;
              return (
                <div key={msg.id}>
                  {isNewSession && <SessionDivider timestamp={msg.timestamp} isLatest={isLatestSession} />}
                  <div className="py-1">
                    <MessageBubble message={msg} onTogglePin={togglePin} onError={setVoiceError} />
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start py-1">
                <div className="bg-surface rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {displayError && (
        <div className="mx-4 mb-2 px-3 py-2 bg-surface border border-warm/30 rounded-lg text-warm text-xs leading-relaxed shrink-0">
          {displayError}
        </div>
      )}

      <ChatInput
        onSend={sendUserMessage}
        sending={sending}
        onRegenerate={regenerateLastReply}
        canRegenerate={canRegenerate}
        onError={setVoiceError}
      />
    </div>
  );
}
