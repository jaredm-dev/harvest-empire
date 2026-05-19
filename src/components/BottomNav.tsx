type Tab = 'farm' | 'warehouse' | 'fleet' | 'shop' | 'prestige';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'farm',      label: 'Farm',      emoji: '🌾' },
  { id: 'warehouse', label: 'Storage',   emoji: '📦' },
  { id: 'fleet',     label: 'Fleet',     emoji: '🚛' },
  { id: 'shop',      label: 'Shop',      emoji: '🛒' },
  { id: 'prestige',  label: 'Prestige',  emoji: '⭐' },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-slate-900 border-t border-slate-700 flex z-50">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
            active === tab.id
              ? 'text-emerald-400'
              : 'text-slate-500 active:text-slate-300'
          }`}
        >
          <span className="text-xl">{tab.emoji}</span>
          <span className="text-[10px] font-medium">{tab.label}</span>
          {active === tab.id && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-emerald-400 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
