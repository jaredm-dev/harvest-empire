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
        <div style={{ color: 'white', fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Welcome back!</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
          You were away for {formatDuration(report.seconds)}
        </div>

        <div style={{
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            While you were gone
          </div>
          <div style={{ color: 'white', fontSize: 28, fontWeight: 900 }}>
            +{formatMoney(report.moneyEarned)}
          </div>
          {report.cropsGrown > 0 && (
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
              ~{formatNumber(report.cropsGrown)} crops auto-harvested
            </div>
          )}
        </div>

        <button
          onClick={clearOfflineReport}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
            color: '#1a2744', border: 'none', fontSize: 14, fontWeight: 900,
            padding: '12px 20px', borderRadius: 10, cursor: 'pointer',
          }}
        >
          Collect & Continue 🌾
        </button>
      </div>
    </>
  );
}
