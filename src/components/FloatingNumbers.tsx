import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store';
import { formatMoney } from '../utils/format';

interface FloatingNum {
  id: string;
  amount: number;
  x: number;
  y: number;
}

let nextId = 0;

// Listens to money changes and emits floating "+$X" texts at random positions
export default function FloatingNumbers() {
  const money = useGameStore(s => s.money);
  const prev = useRef(money);
  const [floats, setFloats] = useState<FloatingNum[]>([]);

  useEffect(() => {
    const diff = money - prev.current;
    prev.current = money;
    if (diff > 0 && diff < 10_000_000) {
      // Add a floating number near top-center of screen
      const id = `fn-${nextId++}`;
      const x = window.innerWidth / 2 + (Math.random() * 200 - 100);
      const y = 100 + Math.random() * 40;
      setFloats(f => [...f, { id, amount: diff, x, y }]);
      setTimeout(() => {
        setFloats(f => f.filter(n => n.id !== id));
      }, 1500);
    }
  }, [money]);

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
