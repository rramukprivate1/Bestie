import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Pin, Volume2, Loader2, PauseCircle } from 'lucide-react';
import { speakText } from '../services/voiceClient';

export default function MessageBubble({ message, onTogglePin, onError }) {
  const isUser = message.role === 'user';
  const [voiceState, setVoiceState] = useState('idle'); // idle | loading | playing
  const audioRef = useRef(null);

  const timeLabel = new Date(message.timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleSpeak = async () => {
    if (!message.text.trim()) return;
    if (voiceState === 'playing') {
      audioRef.current?.pause();
      setVoiceState('idle');
      return;
    }

    setVoiceState('loading');
    try {
      const audio = await speakText(message.text);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setVoiceState('idle'));
      await audio.play();
      setVoiceState('playing');
    } catch (err) {
      onError?.(err.message || 'Could not play that reply out loud.');
      setVoiceState('idle');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-end gap-1.5">
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              isUser ? 'bg-warm text-deep rounded-br-sm' : 'bg-surface text-cream rounded-bl-sm'
            }`}
          >
            {message.text}
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 mb-1">
            <button
              onClick={() => onTogglePin(message.id)}
              className={`p-1 rounded-full transition-opacity ${message.pinned ? 'opacity-100' : 'opacity-40'}`}
              aria-label={message.pinned ? 'Unpin message' : 'Pin message'}
            >
              <Pin size={13} className={message.pinned ? 'fill-calm text-calm' : 'text-muted'} />
            </button>
            {!isUser && (
              <button
                onClick={handleSpeak}
                className="p-1 rounded-full opacity-40 hover:opacity-100 transition-opacity"
                aria-label={voiceState === 'playing' ? 'Pause' : 'Play this reply aloud'}
              >
                {voiceState === 'loading' ? (
                  <Loader2 size={13} className="animate-spin text-muted" />
                ) : voiceState === 'playing' ? (
                  <PauseCircle size={13} className="text-calm" />
                ) : (
                  <Volume2 size={13} className="text-muted" />
                )}
              </button>
            )}
          </div>
        </div>
        <span className="text-[11px] text-muted/60 px-1 mt-0.5">{timeLabel}</span>
      </div>
    </motion.div>
  );
}
