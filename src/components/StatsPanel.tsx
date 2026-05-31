import { useGameStore } from '../store';
import { formatMoney, formatNumber } from '../utils/format';
import { ACHIEVEMENT_CONFIG } from '../config';
import DrawerCloseButton from './DrawerCloseButton';

// Lifetime statistics — selects individual primitive values from the store
// (not whole objects) so this component does not re-render every tick.
export default function StatsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Lifetime earnings never reset on prestige; fall back to the per-run
  // totalEarned for legacy saves that predate the lifetimeEarned field.
  const totalEarned = useGameStore(s => s.lifetimeEarned || s.totalEarned);
  const cropsHarvested = useGameStore(s => s.totalCropsHarvested || 0);
  const deliveries = useGameStore(s => s.totalDeliveriesCompleted || 0);
  const ordersFilled = useGameStore(s => s.marketOrdersCompleted || 0);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);
  const loginStreak = useGameStore(s => s.loginStreak || 0);
  const achievementCount = useGameStore(s => (s.achievements || []).length);
  const gameStartedAt = useGameStore(s => s.gameStartedAt);
  const fieldCount = useGameStore(s => s.fields.length);
  const truckCount = useGameStore(s => s.trucks.length);
  const harvesterCount = useGameStore(s => s.harvesters.length);
  const warehouseCount = useGameStore(s => s.warehouses.length);
  const unlockedCrops = useGameStore(s => s.unlockedCrops.length);
  const unlockedAchievements = useGameStore(s => s.achievements || []);
  const unlockedSet = new Set(unlockedAchievements);
  const allAchievements = Object.entries(ACHIEVEMENT_CONFIG);

  const daysPlayed = gameStartedAt
    ? Math.max(1, Math.floor((Date.now() - gameStartedAt) / 86_400_000))
    : 1;

  const stat = (label: string, value: string, emoji: string) => (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 12,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 22, lineHeight: 1, width: 28, textAlign: 'center' }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ color: 'white', fontSize: 18, fontWeight: 800, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <div
        className={`drawer ${open ? 'open' : ''}`}
        role="dialog"
        aria-hidden={!open}
        aria-modal={open}
      >
        <div className="drawer-handle" />
        <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>📊 Statistics</span>
          <DrawerCloseButton onClose={onClose} />
        </div>

        <p style={{ color: '#94a3b8', fontSize: 11, padding: '0 16px 10px', flexShrink: 0 }}>
          Your farming empire by the numbers.
        </p>

        <div className="drawer-scroll" style={{ padding: '0 16px 100px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {stat('Total earned', formatMoney(totalEarned), '💵')}
            {stat('Days played', formatNumber(daysPlayed), '📅')}
            {stat('Crops harvested', formatNumber(cropsHarvested), '🌾')}
            {stat('Deliveries', formatNumber(deliveries), '🚚')}
            {stat('Orders filled', formatNumber(ordersFilled), '📋')}
            {stat('Login streak', formatNumber(loginStreak) + ' days', '🔥')}
            {stat('Achievements', formatNumber(achievementCount) + ' / 15', '🏆')}
            {stat('Prestige level', formatNumber(prestigeLevel), '⭐')}
          </div>

          <p style={{ color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 }}>
            Current farm
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {stat('Fields', formatNumber(fieldCount), '▦')}
            {stat('Harvesters', formatNumber(harvesterCount), '⚙️')}
            {stat('Warehouses', formatNumber(warehouseCount), '▣')}
            {stat('Trucks', formatNumber(truckCount), '🚛')}
            {stat('Crops unlocked', formatNumber(unlockedCrops) + ' / 6', '🌱')}
          </div>

          <p style={{ color: '#475569', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 }}>
            Achievements — {unlockedAchievements.length} / {allAchievements.length}
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {allAchievements.map(([id, cfg]) => {
              const got = unlockedSet.has(id);
              return (
                <div key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  background: got ? 'rgba(22,101,52,0.22)' : '#0f172a',
                  border: got ? '1px solid rgba(34,197,94,0.4)' : '1px solid #1e293b',
                  borderRadius: 12, padding: '10px 12px',
                  opacity: got ? 1 : 0.6,
                }}>
                  <div style={{ fontSize: 22, lineHeight: 1, width: 28, textAlign: 'center', filter: got ? 'none' : 'grayscale(1)' }}>
                    {got ? cfg.emoji : '🔒'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: got ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 800 }}>{cfg.name}</div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{cfg.description}</div>
                  </div>
                  {got && <span style={{ color: '#4ade80', fontSize: 14, fontWeight: 900 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
