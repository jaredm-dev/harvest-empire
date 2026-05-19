import { useEffect } from 'react';
import { useGameStore } from '../store';

export default function ToastStack() {
  const toasts = useGameStore(s => s.toasts);
  const dismiss = useGameStore(s => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => dismiss(toasts[0].id), 3200);
    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  const bgFor = (type: string) => {
    if (type === 'success')     return 'linear-gradient(135deg, var(--sage), var(--sage-2))';
    if (type === 'warning')     return 'linear-gradient(135deg, var(--warn), #e07a5f)';
    if (type === 'achievement') return 'linear-gradient(135deg, var(--gold), var(--terracotta))';
    return 'linear-gradient(135deg, var(--info), #7c3aed)';
  };

  return (
    <div style={{
      position: 'fixed', top: 96, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 420, padding: '0 16px', zIndex: 800,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            background: bgFor(t.type),
            color: 'white',
            borderRadius: 14,
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 10px 24px rgba(16, 8, 32, 0.32)',
            border: '1px solid rgba(255,255,255,0.18)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            animation: 'toast-in 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
