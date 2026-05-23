import { useState } from 'react';
import { useGameStore } from '../store';
import { Sound } from '../utils/sound';
import DrawerCloseButton from './DrawerCloseButton';

// Settings drawer — mute audio, replay tutorial, hard-reset save.
// Pure local UI state for the mute toggle (Sound utility owns the real
// truth, persisted in localStorage), so this component does not subscribe
// to the game store for the mute value and therefore costs nothing on tick.
export default function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [muted, setMutedLocal] = useState(Sound.isMuted());
  const resetGame = useGameStore(s => s.resetGame);
  const addToast = useGameStore(s => s.addToast);
  const setHasSeenTutorial = useGameStore.setState;

  const toggleMute = () => {
    const next = !muted;
    Sound.setMuted(next);
    setMutedLocal(next);
  };

  const replayTutorial = () => {
    setHasSeenTutorial({ hasSeenTutorial: false });
    addToast('Tutorial will replay next reload.', 'info');
    onClose();
  };

  const doReset = () => {
    const ok = window.confirm(
      'Reset your entire save?\n\nYou will lose all money, fields, harvesters, trucks, ' +
      'warehouses, crops, upgrades, achievements, and prestige progress. This cannot be undone.',
    );
    if (!ok) return;
    const ok2 = window.confirm('Are you absolutely sure? This is permanent.');
    if (!ok2) return;
    resetGame();
    onClose();
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#0f172a', borderRadius: 12, padding: '14px 14px',
    marginBottom: 10, border: '1px solid #1e293b',
  };
  const labelStyle: React.CSSProperties = {
    color: 'white', fontWeight: 700, fontSize: 14, marginBottom: 2,
  };
  const descStyle: React.CSSProperties = {
    color: '#94a3b8', fontSize: 11,
  };

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
          <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>⚙️ Settings</span>
          <DrawerCloseButton onClose={onClose} />
        </div>

        <div className="drawer-scroll" style={{ padding: '0 16px 100px' }}>
          {/* Audio */}
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>{muted ? '🔇 Sound effects' : '🔊 Sound effects'}</div>
              <div style={descStyle}>Click sounds, cash chime, achievement jingles.</div>
            </div>
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={!muted}
              style={{
                background: muted ? '#1e293b' : 'linear-gradient(135deg,#16a34a,#15803d)',
                color: muted ? '#94a3b8' : 'white',
                border: muted ? '1.5px solid #334155' : '1.5px solid #16a34a',
                borderRadius: 999, padding: '8px 18px',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                minWidth: 72,
              }}
            >
              {muted ? 'OFF' : 'ON'}
            </button>
          </div>

          {/* Replay tutorial */}
          <div style={rowStyle}>
            <div>
              <div style={labelStyle}>📖 Replay tutorial</div>
              <div style={descStyle}>Show the new-player intro popup again.</div>
            </div>
            <button
              type="button"
              onClick={replayTutorial}
              style={{
                background: 'linear-gradient(135deg,#0ea5e9,#0369a1)',
                color: 'white',
                border: '1.5px solid #0ea5e9',
                borderRadius: 999, padding: '8px 18px',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}
            >
              REPLAY
            </button>
          </div>

          {/* Reset save */}
          <div style={{ ...rowStyle, background: 'rgba(127, 29, 29, 0.18)', border: '1px solid #7f1d1d' }}>
            <div>
              <div style={labelStyle}>🗑️ Reset save</div>
              <div style={descStyle}>Wipe everything and start over. Cannot be undone.</div>
            </div>
            <button
              type="button"
              onClick={doReset}
              style={{
                background: '#7f1d1d',
                color: '#fecaca',
                border: '1.5px solid #b91c1c',
                borderRadius: 999, padding: '8px 18px',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
              }}
            >
              RESET
            </button>
          </div>

          <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 18 }}>
            Harvest Empire · v1.0
          </p>
        </div>
      </div>
    </>
  );
}
