import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store';
import { EVENT_CONFIG, getPrestigeConfig, getPrestigeMultiplier } from '../config';
import { formatMoney, formatNumber } from '../utils/format';

// ← Update this to your Ko-fi page once you create one at ko-fi.com
const KOFI_URL = 'https://ko-fi.com/harvestempire';

interface Props {
  onPrestige: () => void;
  onSettings: () => void;
  onStats: () => void;
}

export default function HUD({ onPrestige, onSettings, onStats }: Props) {
  const money = useGameStore(s => s.money);
  const gems = useGameStore(s => s.gems ?? 0);
  const totalEarned = useGameStore(s => s.totalEarned);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);
  const activeEvents = useGameStore(s => s.activeEvents) ?? [];

  const [display, setDisplay] = useState(money);
  const [pop, setPop] = useState(false);
  const prev = useRef(money);

  useEffect(() => {
    const diff = money - prev.current;
    prev.current = money;
    // Only flash the money counter green on BIG gains (an order, a sale,
    // a delivery completion). Small per-tick income trickle was making the
    // counter twitch constantly which was distracting AND less readable.
    if (diff >= 25) {
      setPop(true);
      const timer = setTimeout(() => setPop(false), 360);
      return () => clearTimeout(timer);
    }
    setDisplay(money);
  }, [money]);

  useEffect(() => {
    setDisplay(money);
  }, [money]);

  const nextP = getPrestigeConfig(prestigeLevel + 1);
  const pct = nextP ? Math.min(totalEarned / nextP.requirement, 1) * 100 : 100;
  const multiplier = getPrestigeMultiplier(prestigeLevel);
  const prestigeReady = Boolean(nextP && totalEarned >= nextP.requirement);

  return (
    <div className="hud">
      <div className="hud-panel">
        <div className="hud-main-row">
          <div className={pop ? 'hud-money pop' : 'hud-money'}>
            <span>{formatMoney(Math.floor(display))}</span>
          </div>

          <div className="hud-right">
            <div className="hud-gems">
              <span className="gem-cut" />
              <span>{formatNumber(Math.floor(gems))}</span>
            </div>
            {prestigeLevel > 0 && (
              <div className="hud-multiplier">{multiplier}x income</div>
            )}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {/* Stats icon — opens the lifetime-stats panel. */}
              <button
                type="button"
                onClick={onStats}
                aria-label="Statistics"
                title="Statistics"
                style={{
                  width: 30, height: 30, borderRadius: 999,
                  background: 'rgba(14, 116, 144, 0.22)',
                  border: '1px solid rgba(14, 116, 144, 0.45)',
                  color: '#67e8f9', fontSize: 14, cursor: 'pointer',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  padding: 0, lineHeight: 1,
                }}
              >
                📊
              </button>
              {/* Settings icon — opens the settings panel (mute/etc). */}
              <button
                type="button"
                onClick={onSettings}
                aria-label="Settings"
                title="Settings"
                style={{
                  width: 30, height: 30, borderRadius: 999,
                  background: 'rgba(148, 163, 184, 0.18)',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  color: '#cbd5e1', fontSize: 14, cursor: 'pointer',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  padding: 0, lineHeight: 1,
                }}
              >
                ⚙️
              </button>
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  minHeight: 26, display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 12,
                  background: 'rgba(255,94,91,0.18)',
                  border: '1px solid rgba(255,94,91,0.35)',
                  color: '#fca5a5', fontSize: 10, fontWeight: 800,
                  textDecoration: 'none', flexShrink: 0,
                }}
              >
                ☕ Support
              </a>
              <button
                onClick={onPrestige}
                className={prestigeReady ? 'prestige-pill ready' : 'prestige-pill'}
              >
                {prestigeReady ? 'Ready' : `Prestige ${prestigeLevel}`}
              </button>
            </div>
          </div>
        </div>

        {activeEvents.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {activeEvents.map(ev => {
              const cfg = EVENT_CONFIG[ev.type];
              const isDanger = ev.type === 'drought';
              return (
                <div key={ev.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 999,
                  background: isDanger ? 'rgba(180,53,15,0.72)' : 'rgba(14,116,44,0.72)',
                  border: `1px solid ${isDanger ? 'rgba(252,165,165,0.4)' : 'rgba(134,239,172,0.4)'}`,
                  fontSize: 11, fontWeight: 800, color: 'white',
                }}>
                  <span>{cfg.emoji}</span>
                  <span>{cfg.name}</span>
                  <span style={{ opacity: 0.7 }}>{Math.ceil(ev.duration)}s</span>
                </div>
              );
            })}
          </div>
        )}

        {nextP && (
          <div className="prestige-progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-labels">
              <span>{formatMoney(Math.floor(totalEarned))} earned</span>
              <span>Goal: {formatMoney(nextP.requirement)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
