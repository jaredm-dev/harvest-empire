import { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { formatMoney } from '../utils/format';

interface FloatingNum {
  id: string;
  amount: number;
  x: number;
  y: number;
}

let nextId = 0;
const MIN_DIFF = 5; // ignore sub-$5 changes to keep it clean

// Subscribes to the zustand store directly (NOT a useStore hook) so this
// component does not re-render on every tick. Only updates when a money
// jump actually emits a floating number.
export default function FloatingNumbers() {
  const [floats, setFloats] = useState<FloatingNum[]>([]);

  useEffect(() => {
    let prev = useGameStore.getState().money;
    let lastEmit = 0;

    const unsub = useGameStore.subscribe((state) => {
      const m = state.money;
      const diff = m - prev;
      prev = m;
      if (diff <= MIN_DIFF || diff > 10_000_000) return;
      const now = Date.now();
      // Throttle to avoid spamming the screen
      if (now - lastEmit < 250) return;
      lastEmit = now;
      const id = `fn-${nextId++}`;
      const x = window.innerWidth / 2 + (Math.random() * 200 - 100);
      const y = 100 + Math.random() * 40;
      setFloats(f => [...f, { id, amount: diff, x, y }]);
      setTimeout(() => {
        setFloats(f => f.filter(n => n.id !== id));
      }, 1500);
    });

    return unsub;
  }, []);

  if (floats.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      zIndex: 500, overflow: 'hidden',
    }}>
      {floats.map(f => (
        <div
          key={f.id}
          className="floating-number"
          style={{
            position: 'absolute',
            left: f.x, top: f.y,
            color: '#4ade80',
            fontSize: 22, fontWeight: 900,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        >
          +{formatMoney(f.amount)}
        </div>
      ))}
    </div>
  );
}
