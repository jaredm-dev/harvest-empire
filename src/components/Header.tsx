import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { PRESTIGE_CONFIG } from '../config';

export default function Header() {
  const money = useGameStore(s => s.money);
  const totalEarned = useGameStore(s => s.totalEarned);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);

  const [displayMoney, setDisplayMoney] = useState(money);
  const prevMoney = useRef(money);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    if (money !== prevMoney.current) {
      prevMoney.current = money;
      setPopped(true);
      setTimeout(() => setPopped(false), 400);
    }
    setDisplayMoney(money);
  }, [money]);

  const nextPrestige = PRESTIGE_CONFIG[prestigeLevel];
  const progressPct = nextPrestige
    ? Math.min((totalEarned / nextPrestige.requirement) * 100, 100)
    : 100;

  return (
    <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Harvest Empire</div>
          <div className={`text-2xl font-bold text-amber-400 transition-transform ${popped ? 'animate-coin-pop' : ''}`}>
            💰 ${Math.floor(displayMoney).toLocaleString()}
          </div>
        </div>

        <div className="text-right">
          {prestigeLevel > 0 && (
            <div className="text-xs text-purple-400 font-semibold mb-1">
              ⭐ Prestige {prestigeLevel} · {PRESTIGE_CONFIG[prestigeLevel - 1].multiplier}×
            </div>
          )}
          {nextPrestige ? (
            <div className="text-xs text-slate-400">
              Prestige goal: ${Math.floor(totalEarned).toLocaleString()} / ${nextPrestige.requirement.toLocaleString()}
            </div>
          ) : (
            <div className="text-xs text-yellow-400">🌍 Max Prestige!</div>
          )}
        </div>
      </div>

      {nextPrestige && (
        <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 progress-bar rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
