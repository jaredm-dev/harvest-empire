import { useGameStore } from '../store';
import { formatMoney, formatNumber } from '../utils/format';

export default function MissionsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const missions = useGameStore(s => s.dailyMissions || []);
  const claimMissionReward = useGameStore(s => s.claimMissionReward);

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-handle" />
        <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>📅 Daily Missions</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: 11, padding: '0 16px 10px', flexShrink: 0 }}>
          Complete missions to earn gems and cash. Resets every 24 hours.
        </p>

        <div className="drawer-scroll" style={{ padding: '0 16px 24px' }}>
          {missions.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 24 }}>
              No missions yet — come back tomorrow!
            </p>
          ) : missions.map(m => {
            const pct = Math.min(100, (m.progress / m.target) * 100);
            const isComplete = m.progress >= m.target;
            return (
              <div key={m.id} style={{
                background: m.claimed ? '#0f1a2c' : isComplete ? '#123326' : '#1a2744',
                border: `1.5px solid ${m.claimed ? '#1e293b' : isComplete ? '#16a34a' : '#334155'}`,
                borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                opacity: m.claimed ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{m.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>{m.description}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                      Reward: <span style={{ color: '#a78bfa', fontWeight: 800 }}>{m.rewardGems}💎</span>
                      {' + '}
                      <span style={{ color: '#4ade80', fontWeight: 800 }}>{formatMoney(m.rewardMoney)}</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  height: 8, background: '#0f172a', borderRadius: 4,
                  overflow: 'hidden', marginBottom: 6,
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isComplete ? 'linear-gradient(90deg,#16a34a,#4ade80)' : 'linear-gradient(90deg,#3b82f6,#60a5fa)',
                    transition: 'width 0.3s',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                    {formatNumber(Math.floor(m.progress))} / {formatNumber(m.target)}
                  </span>
                  {m.claimed ? (
                    <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 800 }}>✓ Claimed</span>
                  ) : isComplete ? (
                    <button
                      onClick={() => claimMissionReward(m.id)}
                      style={{
                        background: 'linear-gradient(135deg,#16a34a,#15803d)',
                        color: 'white', border: 'none', fontSize: 11, fontWeight: 900,
                        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                      }}
                    >
                      Claim 🎁
                    </button>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: 11 }}>In progress…</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
