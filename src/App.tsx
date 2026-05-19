import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
import GameWorld from './components/GameWorld';
import HUD from './components/HUD';
import ShopDrawer from './components/ShopDrawer';
import { WarehouseDrawer, MarketDrawer, AssignDrawer } from './components/InfoDrawer';
import ToastStack from './components/ToastStack';
import PrestigeView from './views/PrestigeView';
import Tutorial from './components/Tutorial';
import OfflineModal from './components/OfflineModal';
import MissionsDrawer from './components/MissionsDrawer';
import FloatingNumbers from './components/FloatingNumbers';

type Modal = 'none' | 'shop' | 'warehouse' | 'market' | 'prestige' | 'assign' | 'missions';

export default function App() {
  const [modal, setModal] = useState<Modal>('none');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const tick = useGameStore(s => s.tick);
  const checkDailyBonus = useGameStore(s => s.checkDailyBonus);
  const simulateIAP = useGameStore(s => s.simulateIAP);
  const addToast = useGameStore(s => s.addToast);
  const applyOfflineProgress = useGameStore(s => s.applyOfflineProgress);
  const refreshDailyMissions = useGameStore(s => s.refreshDailyMissions);
  const hasSeenTutorial = useGameStore(s => s.hasSeenTutorial);
  const dailyMissions = useGameStore(s => s.dailyMissions || []);

  const lastTime = useRef(performance.now());
  const rafRef = useRef(0);
  const accum = useRef(0);
  const TICK = 0.15;

  useEffect(() => {
    applyOfflineProgress();
    checkDailyBonus();
    refreshDailyMissions();
  }, [applyOfflineProgress, checkDailyBonus, refreshDailyMissions]);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('purchase_success');
    const itemId = params.get('item');
    const cancelled = params.get('purchase_cancelled');

    if (sessionId && itemId) {
      window.history.replaceState({}, '', window.location.pathname);
      fetch(`/api/verify?session_id=${sessionId}&item=${itemId}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid && data.itemId) {
            simulateIAP(data.itemId);
            addToast('Purchase activated! Your pack is ready.', 'success');
          } else {
            addToast('Could not verify purchase. Email support with your Stripe receipt.', 'warning');
          }
        })
        .catch(() => addToast('Verification failed. Contact support with your receipt.', 'warning'));
    }

    if (cancelled === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      addToast('Purchase cancelled — nothing was charged.', 'info');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loop = (now: number) => {
      const delta = Math.min((now - lastTime.current) / 1000, 0.2);
      lastTime.current = now;
      accum.current += delta;
      if (accum.current >= TICK) {
        tick(accum.current);
        accum.current = 0;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const close = () => setModal('none');

  const readyMissionCount = dailyMissions.filter(m => !m.claimed && m.progress >= m.target).length;

  return (
    <div className="phone-shell">
      <GameWorld
        onWarehouseClick={() => setModal('warehouse')}
        onMarketClick={() => setModal('market')}
        onFieldClick={id => { setSelectedField(id); setModal('assign'); }}
      />

      <HUD onPrestige={() => setModal('prestige')} />
      <ToastStack />
      <FloatingNumbers />

      <div className="bottom-bar">
        <ToolBtn icon="shop" label="Shop" onClick={() => setModal('shop')} active={modal === 'shop'} />
        <ToolBtn icon="storage" label="Storage" onClick={() => setModal('warehouse')} active={modal === 'warehouse'} />
        <ToolBtn icon="market" label="Market" onClick={() => setModal('market')} active={modal === 'market'} />
        <MissionsBtn onClick={() => setModal('missions')} active={modal === 'missions'} readyCount={readyMissionCount} />
        <ToolBtn icon="prestige" label="Prestige" onClick={() => setModal('prestige')} active={modal === 'prestige'} />
      </div>

      <ShopDrawer open={modal === 'shop'} onClose={close} />
      <WarehouseDrawer open={modal === 'warehouse'} onClose={close} />
      <MarketDrawer open={modal === 'market'} onClose={close} />
      <AssignDrawer open={modal === 'assign'} fieldId={selectedField} onClose={close} />
      <MissionsDrawer open={modal === 'missions'} onClose={close} />

      {modal === 'prestige' && (
        <>
          <div className="backdrop" onClick={close} />
          <div className="prestige-modal-wrap">
            <div className="prestige-modal">
              <div className="modal-title-row">
                <span>Prestige</span>
                <button onClick={close} aria-label="Close prestige panel">x</button>
              </div>
              <PrestigeView />
            </div>
          </div>
        </>
      )}

      <OfflineModal />
      {!hasSeenTutorial && <Tutorial />}
    </div>
  );
}

function ToolBtn({ icon, label, onClick, active }: {
  icon: 'shop' | 'storage' | 'market' | 'prestige';
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      className={`tool-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className={`tool-icon tool-icon-${icon}`} aria-hidden="true" />
      <span className="tool-label">{label}</span>
    </button>
  );
}

function MissionsBtn({ onClick, active, readyCount }: {
  onClick: () => void;
  active: boolean;
  readyCount: number;
}) {
  return (
    <button
      className={`tool-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      style={{ position: 'relative' }}
    >
      <span style={{
        width: 26, height: 26,
        display: 'grid', placeItems: 'center',
        fontSize: 18, lineHeight: 1,
      }} aria-hidden="true">📅</span>
      <span className="tool-label">Missions</span>
      {readyCount > 0 && (
        <span
          className="mission-badge-ready"
          style={{
            position: 'absolute', top: 2, right: 4,
            background: '#16a34a', color: 'white',
            fontSize: 10, fontWeight: 900,
            padding: '2px 6px', borderRadius: 10,
            minWidth: 16, textAlign: 'center',
          }}
        >
          {readyCount}
        </span>
      )}
    </button>
  );
}
