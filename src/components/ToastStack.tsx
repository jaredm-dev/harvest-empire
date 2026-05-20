import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';

const EXIT_MS = 320;

export default function ToastStack() {
  const toasts = useGameStore(s => s.toasts);
  const dismiss = useGameStore(s => s.dismissToast);

  // IDs currently fading out — kept in local state so we can let the CSS
  // animation finish before we actually remove the toast from the store.
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());

  // For each new toast, schedule a fade-out → store-removal sequence.
  useEffect(() => {
    for (const t of toasts) {
      if (timers.current.has(t.id)) continue; // already scheduled
      const lifetime = t.type === 'achievement' ? 3000
        : t.type === 'warning' ? 2400
        : 1600;

      const fadeTimer = window.setTimeout(() => {
        setExiting(prev => {
          const next = new Set(prev);
          next.add(t.id);
          return next;
        });
        // After the fade animation completes, drop from the store.
        window.setTimeout(() => dismiss(t.id), EXIT_MS);
      }, lifetime);

      timers.current.set(t.id, fadeTimer);
    }

    // GC timers for toasts that no longer exist (e.g. clicked away).
    for (const id of Array.from(timers.current.keys())) {
      if (!toasts.find(t => t.id === id)) {
        clearTimeout(timers.current.get(id)!);
        timers.current.delete(id);
      }
    }
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  const bgFor = (type: string) => {
    if (type === 'success')     return 'linear-gradient(135deg, var(--sage), var(--sage-2))';
    if (type === 'warning')     return 'linear-gradient(135deg, var(--warn), #e07a5f)';
    if (type === 'achievement') return 'linear-gradient(135deg, var(--gold), var(--terracotta))';
    return 'linear-gradient(135deg, var(--info), #7c3aed)';
  };

  const handleClick = (id: string) => {
    // Manual click — fade then remove
    if (exiting.has(id)) return;
    setExiting(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    window.setTimeout(() => dismiss(id), EXIT_MS);
  };

  return (
    <div style={{
      position: 'fixed', top: 96, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 420, padding: '0 16px', zIndex: 800,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const isExiting = exiting.has(t.id);
        return (
          <div
            key={t.id}
            onClick={() => handleClick(t.id)}
            style={{
              background: bgFor(t.type),
              color: 'white',
              borderRadius: 14,
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 10px 24px rgba(16, 8, 32, 0.32)',
              border: '1px solid rgba(255,255,255,0.18)',
              pointerEvents: isExiting ? 'none' : 'auto',
              cursor: 'pointer',
              animation: isExiting
                ? `toast-out ${EXIT_MS}ms ease-in forwards`
                : 'toast-in 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
