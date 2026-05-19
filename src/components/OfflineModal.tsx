import { useGameStore } from '../store';
import { formatMoney, formatNumber, formatDuration } from '../utils/format';

export default function OfflineModal() {
  const report = useGameStore(s => s.offlineReport);
  const clearOfflineReport = useGameStore(s => s.clearOfflineReport);

  if (!report) return null;

  return (
    <>
      <div className="backdrop" style={{ zIndex: 600 }} onClick={clearOfflineReport} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(145deg, #1a2744, #0f172a)',
        border: '2px solid #fbbf24',
        borderRadius: 20, padding: '24px 28px',
        width: 'min(380px, 90vw)', zIndex: 700,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🌙</div>
        <div className="display" style={{ color: 'white', fontSize: 26, fontWeight: 700, marginBottom: 6 }}>The farm kept working</div>
        <div style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 16 }}>
          You were gone for {formatDuration(report.seconds)}. The fields didn't notice.
        </div>

        <div style={{
          background: 'rgba(242,204,143,0.12)',
          border: '1.5px solid rgba(242,204,143,0.4)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Earned while you were out
          </div>
          <div className="display" style={{ color: 'white', fontSize: 32, fontWeight: 700 }}>
            +{formatMoney(report.moneyEarned)}
          </div>
          {report.cropsGrown > 0 && (
            <div style={{ color: 'var(--ink-dim)', fontSize: 12, marginTop: 4 }}>
              ~{formatNumber(report.cropsGrown)} crops auto-harvested
            </div>
          )}
        </div>

        <button
          onClick={clearOfflineReport}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--terracotta), var(--gold))',
            color: 'var(--surface-deep)', border: 'none', fontSize: 14, fontWeight: 800,
            padding: '12px 20px', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'Fredoka, sans-serif',
          }}
        >
          Back to work 🌾
        </button>
      </div>
    </>
  );
}
