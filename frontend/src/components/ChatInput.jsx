import { useState, useRef } from 'react';
import { Send, Mic, Square, RefreshCw, Loader2 } from 'lucide-react';
import { startRecording, transcribeAudio } from '../services/voiceClient';

export default function ChatInput({ onSend, sending, onRegenerate, canRegenerate, onError }) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || sending) return;
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      onError?.('Microphone access was blocked or unavailable - check your browser permissions.');
    }
  };

  return (
    <div className="px-3 pb-3 pt-2 bg-deep">
      {canRegenerate && (
        <div className="flex justify-center mb-2">
          <button
            onClick={onRegenerate}
            disabled={sending}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-cream disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={12} />
            Try a different reply
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 bg-surface-2 rounded-2xl px-3 py-2">
        <button
          type="button"
          onClick={handleMicPress}
          disabled={transcribing}
          title={recording ? 'Stop recording' : 'Record a voice message'}
          className={`p-2 rounded-full shrink-0 transition-colors ${
            recording ? 'bg-warm text-deep' : 'text-muted hover:text-cream'
          } disabled:opacity-50`}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {transcribing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : recording ? (
            <Square size={16} className="fill-current" />
          ) : (
            <Mic size={18} />
          )}
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={recording ? 'Listening…' : "Say what's on your mind…"}
          rows={1}
          className="flex-1 bg-transparent text-cream text-sm resize-none outline-none placeholder:text-muted/60 py-2 max-h-32"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="p-2 rounded-full bg-warm text-deep shrink-0 disabled:opacity-30 transition-opacity"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
