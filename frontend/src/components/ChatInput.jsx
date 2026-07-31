import { useState, useRef } from 'react';
import { Send, Mic, Square, RefreshCw, Loader2, Smile } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { startRecording, transcribeAudio } from '../services/voiceClient';
import EmojiPicker from './EmojiPicker';

export default function ChatInput({ onSend, sending, onRegenerate, canRegenerate, onError }) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const recorderRef = useRef(null);
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || sending) return;
    onSend(text);
    setText('');
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') setShowEmoji(false);
  };

  const handleEmojiSelect = (emoji) => {
    // Insert emoji at cursor position rather than always appending to end
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      // Restore cursor right after the inserted emoji
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setText(prev => prev + emoji);
    }
    // Keep picker open so they can add multiple emojis
  };

  const handleMicPress = async () => {
    if (recording) {
      setRecording(false);
      setTranscribing(true);
      try {
        const blob = await recorderRef.current.stop();
        const transcribed = await transcribeAudio(blob);
        setText((prev) => (prev.trim() ? `${prev.trim()} ${transcribed}` : transcribed));
      } catch (err) {
        onError?.(err.message || 'Could not transcribe that recording.');
      } finally {
        setTranscribing(false);
      }
      return;
    }

    try {
      recorderRef.current = await startRecording();
      setRecording(true);
    } catch {
      onError?.('Microphone access was blocked or unavailable — check your browser permissions.');
    }
  };

  return (
    <div style={{ padding: '8px 12px 12px', background: '#f0f4fa', position: 'relative' }}>
      {canRegenerate && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
          <button
            onClick={onRegenerate}
            disabled={sending}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '12px', color: '#7a8faa', background: 'none', border: 'none',
              cursor: 'pointer', opacity: sending ? 0.4 : 1,
            }}
          >
            <RefreshCw size={12} />
            Try a different reply
          </button>
        </div>
      )}

      {/* Emoji picker — renders above the input bar */}
      <AnimatePresence>
        {showEmoji && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </AnimatePresence>

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '8px',
        background: 'white', border: '1px solid #dde3ed',
        borderRadius: '24px', padding: '8px 12px',
      }}>
        {/* Mic */}
        <button
          type="button"
          onClick={handleMicPress}
          disabled={transcribing}
          style={{
            background: recording ? '#e07a72' : 'none',
            border: 'none', borderRadius: '50%', padding: recording ? '6px' : '4px',
            color: recording ? 'white' : '#7a8faa', cursor: 'pointer',
            flexShrink: 0, display: 'flex', alignItems: 'center',
            opacity: transcribing ? 0.5 : 1, transition: 'all 0.2s',
          }}
          aria-label={recording ? 'Stop recording' : 'Record voice message'}
        >
          {transcribing ? (
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          ) : recording ? (
            <Square size={16} style={{ fill: 'white' }} />
          ) : (
            <Mic size={18} />
          )}
        </button>

        {/* Text area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={recording ? 'Listening…' : "Say what's on your mind…"}
          rows={1}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: '14px', color: '#1e2a3a', resize: 'none', lineHeight: '1.5',
            paddingTop: '2px', maxHeight: '120px', fontFamily: 'inherit',
          }}
        />

        {/* Emoji toggle */}
        <button
          type="button"
          onClick={() => setShowEmoji(prev => !prev)}
          style={{
            background: showEmoji ? '#f0f4fa' : 'none', border: 'none',
            borderRadius: '50%', padding: '4px', cursor: 'pointer',
            color: showEmoji ? '#e07a72' : '#7a8faa', flexShrink: 0,
            display: 'flex', alignItems: 'center', transition: 'all 0.15s',
          }}
          aria-label="Open emoji picker"
        >
          <Smile size={18} />
        </button>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: text.trim() && !sending ? '#e07a72' : '#e8edf6',
            border: 'none', cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s',
          }}
          aria-label="Send"
        >
          <Send size={15} color={text.trim() && !sending ? 'white' : '#7a8faa'} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
