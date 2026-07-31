// EmojiPicker.jsx
// Tapping an emoji appends it to the chat input — no send yet, so the
// user can combine it with text before hitting send, just like WhatsApp.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  {
    label: 'Feelings',
    icon: '😊',
    emojis: [
      '😊','😂','🥹','😭','😍','🥰','😘','😅','🤩','😎',
      '😢','😔','😤','😡','🥺','😳','🤯','😴','🤔','😬',
      '🫠','😇','🤗','😏','😒','😌','🙃','😋','🤭','😶',
    ],
  },
  {
    label: 'Heart',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💗',
      '💓','💞','💕','💖','💝','💘','❣️','💔','🫀','♥️',
      '💟','❤️‍🔥','❤️‍🩹','🩷','🩵','🩶','💌','💋','🫶','🤝',
    ],
  },
  {
    label: 'Hands',
    icon: '🙌',
    emojis: [
      '👍','👎','👏','🙌','🤲','🙏','🫂','💪','🤞','✌️',
      '🤟','🤙','👋','🫡','🫸','🫷','☝️','✋','🖖','🤘',
      '👌','🤌','🤏','👈','👉','👆','👇','🫵','🖐️','✊',
    ],
  },
  {
    label: 'People',
    icon: '👩',
    emojis: [
      '😺','🙈','🙉','🙊','👶','🧒','👦','👧','🧑','👱',
      '👩','👨','🧓','👴','👵','👮','💂','🥷','👷','🫅',
      '🧙','🧚','🧜','🧝','🦸','🦹','🧛','🧟','🧞','🧌',
    ],
  },
  {
    label: 'Nature',
    icon: '🌸',
    emojis: [
      '🌸','🌹','🌻','🌼','💐','🌷','🪷','🌺','🍀','🌿',
      '🌱','🪴','🌵','🌴','🌲','🌳','🍃','🍂','🍁','🪸',
      '🌊','🌈','⭐','🌙','☀️','🌤️','❄️','🌸','🦋','🐝',
    ],
  },
  {
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍕','🍔','🌮','🍜','🍣','🍱','🧁','🎂','🍰','🍩',
      '🍦','🍫','🍬','🍭','☕','🧃','🥤','🧋','🍵','🍺',
      '🥗','🍛','🍝','🥘','🍲','🫕','🥙','🌯','🥪','🧆',
    ],
  },
  {
    label: 'Fun',
    icon: '🎉',
    emojis: [
      '🎉','🎊','🎈','🎁','🎀','🏆','🥇','🎯','🎮','🕹️',
      '🎲','🎭','🎨','🎵','🎶','🎸','🎹','🎤','🎧','🎬',
      '✨','🌟','💫','⚡','🔥','💥','🌀','🎆','🎇','🪄',
    ],
  },
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close when tapping outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [onClose]);

  const displayed = search.trim()
    ? CATEGORIES.flatMap(c => c.emojis).filter(e =>
        // simple substring search works because we're just filtering by character
        e.includes(search.trim())
      )
    : CATEGORIES[activeCategory].emojis;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: '8px',
        background: 'white',
        border: '1px solid #dde3ed',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        zIndex: 50,
      }}
    >
      {/* Search bar */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #eef1f6' }}>
        <input
          type="text"
          placeholder="Search emojis…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: '#f0f4fa',
            border: 'none',
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '14px',
            color: '#1e2a3a',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          autoFocus
        />
      </div>

      {/* Category tabs — hidden while searching */}
      {!search.trim() && (
        <div style={{ display: 'flex', padding: '6px 8px', gap: '2px', borderBottom: '1px solid #eef1f6', overflowX: 'auto' }}>
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              title={cat.label}
              style={{
                flex: 'none',
                background: activeCategory === i ? '#f0f4fa' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '2px',
        padding: '8px',
        maxHeight: '200px',
        overflowY: 'auto',
      }}>
        {displayed.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px', color: '#7a8faa', fontSize: '13px' }}>
            No emojis found
          </div>
        ) : displayed.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onSelect(emoji)}
            style={{
              background: 'none',
              border: 'none',
              borderRadius: '8px',
              padding: '4px',
              fontSize: '20px',
              cursor: 'pointer',
              transition: 'background 0.12s',
              lineHeight: 1,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f4fa'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Category label */}
      {!search.trim() && (
        <div style={{ padding: '4px 12px 8px', fontSize: '11px', color: '#7a8faa', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {CATEGORIES[activeCategory].label}
        </div>
      )}
    </motion.div>
  );
}
