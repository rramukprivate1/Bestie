import { MessageCircle, BookHeart, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'journal', label: 'Journal', icon: BookHeart },
  { id: 'insights', label: 'Insights', icon: Sparkles },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="flex border-t border-surface bg-deep shrink-0">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              isActive ? 'text-warm' : 'text-muted'
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
            <span className="text-[10px] tracking-wide">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
