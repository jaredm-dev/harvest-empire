import { useEffect } from 'react';
import { useGameStore } from '../store';

export default function ToastStack() {
  const toasts = useGameStore(s => s.toasts);
  const dismiss = useGameStore(s => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => dismiss(toasts[0].id), 3000);
    return () => clearTimeout(timer);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-[400px] px-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`animate-slide-down rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg pointer-events-auto text-white ${
            t.type === 'success'     ? 'bg-emerald-600' :
            t.type === 'warning'    ? 'bg-amber-600' :
            t.type === 'achievement' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 border border-yellow-300/50' :
            'bg-blue-600'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
