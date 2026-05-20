import { useState, useCallback } from 'react';
import { useGameStore } from '../store';
import {
  FIELD_CONFIG, HARVESTER_CONFIG, WAREHOUSE_CONFIG, TRUCK_CONFIG,
  CROP_CONFIG, IAP_ITEMS, UPGRADE_CONFIG,
} from '../config';
import type { FieldType, HarvesterType, WarehouseType, TruckType, CropType, UpgradeType } from '../types';
import { formatMoney, formatNumber } from '../utils/format';

type ShopTab = 'fields' | 'crops' | 'machines' | 'storage' | 'trucks' | 'upgrades' | 'iap';

const TABS: { id: ShopTab; icon: string; label: string; highlight?: boolean }[] = [
  { id: 'fields', icon: '▦', label: 'Fields' },
  { id: 'crops', icon: '●', label: 'Crops' },
  { id: 'machines', icon: '⚙', label: 'Machines' },
  { id: 'storage', icon: '▣', label: 'Storage' },
  { id: 'trucks', icon: '▰', label: 'Trucks' },
  { id: 'upgrades', icon: '✦', label: 'Systems' },
  { id: 'iap', icon: '💎', label: 'Boosts', highlight: true },
];

interface ShopCardProps {
  icon: string;
  name: string;
  desc: string;
  price: number;
  locked?: boolean;
  owned?: number;
  ownedLabel?: string;
  onBuy: () => void;
}

function ShopCard({ icon, name, desc, price, locked, owned, ownedLabel, onBuy }: ShopCardProps) {
  const money = useGameStore(s => s.money);
  const canAfford = money >= price && !locked;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: ownedLabel ? '#123326' : '#1a2744',
      border: `1.5px solid ${ownedLabel ? '#16a34a' : canAfford ? '#334155' : '#1e293b'}`,
      borderRadius: 12, padding: '12px 14px', marginBottom: 8,
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 10,
        display: 'grid', placeItems: 'center',
        background: 'linear-gradient(145deg,#334155,#0f172a)',
        color: '#fbbf24', fontSize: 14, fontWeight: 900,
        flexShrink: 0,
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>{name}</span>
          {owned !== undefined && owned > 0 && (
            <span style={{ background: '#1e40af', color: '#93c5fd', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 800 }}>
              x{owned}
            </span>
          )}
          {ownedLabel && <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 800 }}>{ownedLabel}</span>}
        </div>
        <span style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.3 }}>{desc}</span>
      </div>
      {locked ? (
        <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>Locked</span>
      ) : ownedLabel ? null : (
        <button
          onClick={onBuy}
          style={{
            background: canAfford ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#1e293b',
            color: canAfford ? 'white' : '#64748b',
            border: 'none', borderRadius: 10,
            padding: '7px 12px', fontSize: 12, fontWeight: 800,
            cursor: canAfford ? 'pointer' : 'not-allowed',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          {formatMoney(price)}
        </button>
      )}
    </div>
  );
}

export default function ShopDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<ShopTab>('fields');
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const store = useGameStore();

  const warn = (ok: boolean) => {
    if (!ok) store.addToast('Not enough money, no open slot, already owned, or locked by prestige.', 'warning');
  };

  const handleBuyPack = useCallback(async (itemId: string) => {
    setLoadingItem(itemId);
    try {
      const returnUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, returnUrl }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        store.addToast('Could not start checkout. Try again.', 'warning');
        setLoadingItem(null);
      }
    } catch {
      store.addToast('Network error. Check your connection.', 'warning');
      setLoadingItem(null);
    }
  }, [store]);

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <div className={`drawer ${open ? 'open' : ''}`}>
        <div className="drawer-handle" />
        <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>Shop</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 10px', flexShrink: 0 }}>
          {TABS.map(t => {
            const active = tab === t.id;
            const highlight = t.highlight;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 10px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 12, fontWeight: 800,
                  background: active
                    ? highlight ? 'linear-gradient(135deg,#b45309,#92400e)' : '#16a34a'
                    : highlight ? 'linear-gradient(135deg,#78350f,#451a03)' : '#1e293b',
                  color: active ? 'white' : highlight ? '#fcd34d' : '#94a3b8',
                  border: highlight ? '1.5px solid #f59e0b' : 'none',
                  boxShadow: highlight && active ? '0 0 12px rgba(251,191,36,0.4)' : 'none',
                }}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        <div className="drawer-scroll" style={{ padding: '0 16px 100px' }}>
          {tab === 'fields' && (
            <>
              <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>More fields grow more crops, but every field can develop problems and needs upkeep.</p>
              {(Object.entries(FIELD_CONFIG) as [FieldType, typeof FIELD_CONFIG[FieldType]][])
                .filter(([type]) => type !== 'starter')
                .map(([type, cfg]) => (
                  <ShopCard
                    key={type}
                    icon={cfg.emoji}
                    name={cfg.name}
                    desc={`${cfg.yieldMultiplier} units/cycle - ${cfg.capacity} ready capacity`}
                    price={cfg.price}
                    locked={cfg.prestigeRequired > store.prestigeLevel}
                    owned={store.fields.filter(f => f.type === type).length}
                    onBuy={() => warn(store.buyField(type))}
                  />
                ))}
            </>
          )}

          {tab === 'crops' && (
            <>
              <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>Higher value crops grow slower and can spoil if left ready too long.</p>
              {(Object.entries(CROP_CONFIG) as [CropType, typeof CROP_CONFIG[CropType]][]).map(([type, cfg]) => {
                const unlocked = store.unlockedCrops.includes(type);
                return (
                  <ShopCard
                    key={type}
                    icon={cfg.emoji}
                    name={cfg.name}
                    desc={`$${cfg.baseValue}/unit - ${cfg.growTime}s cycle`}
                    price={cfg.unlockCost}
                    locked={cfg.prestigeRequired > store.prestigeLevel}
                    ownedLabel={unlocked ? 'Owned' : undefined}
                    onBuy={() => warn(store.unlockCrop(type))}
                  />
                );
              })}
            </>
          )}

          {tab === 'machines' && (
            <>
              <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>Harvesters auto-collect, but field issues can slow or stop them until repaired.</p>
              {(Object.entries(HARVESTER_CONFIG) as [HarvesterType, typeof HARVESTER_CONFIG[HarvesterType]][]).map(([type, cfg]) => (
                <ShopCard
                  key={type}
                  icon={cfg.emoji}
                  name={cfg.name}
                  desc={`${cfg.harvestRate} units/sec auto-harvest`}
                  price={cfg.price}
                  locked={cfg.prestigeRequired > store.prestigeLevel}
                  owned={store.harvesters.filter(h => h.type === type).length}
                  onBuy={() => warn(store.buyHarvester(type))}
                />
              ))}
            </>
          )}

          {tab === 'storage' && (
            <>
              <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>Bigger storage gives you more room before collecting stalls.</p>
              {(Object.entries(WAREHOUSE_CONFIG) as [WarehouseType, typeof WAREHOUSE_CONFIG[WarehouseType]][])
                .filter(([type]) => type !== 'stand')
                .map(([type, cfg]) => (
                <ShopCard
                  key={type}
                  icon={cfg.emoji}
                  name={cfg.name}
                  desc={`${formatNumber(cfg.capacity)} unit capacity`}
                  price={cfg.price}
                  locked={cfg.prestigeRequired > store.prestigeLevel}
                  owned={store.warehouses.filter(w => w.type === type).length}
                  onBuy={() => warn(store.buyWarehouse(type))}
                />
              ))}
            </>
          )}

          {tab === 'trucks' && (
            <>
              <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>Trucks slowly turn stored crops into higher market income.</p>
              {(Object.entries(TRUCK_CONFIG) as [TruckType, typeof TRUCK_CONFIG[TruckType]][]).map(([type, cfg]) => (
                <ShopCard
                  key={type}
                  icon={cfg.emoji}
                  name={cfg.name}
                  desc={`${cfg.capacity} cap - ${cfg.valueMultiplier}x value - ${cfg.deliveryTime}s trip`}
                  price={cfg.price}
                  locked={cfg.prestigeRequired > store.prestigeLevel}
                  owned={store.trucks.filter(t => t.type === type).length}
                  onBuy={() => warn(store.buyTruck(type))}
                />
              ))}
            </>
          )}

          {tab === 'upgrades' && (
            <>
              <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>Systems make the farm more reliable, but they are expensive long-term investments.</p>
              {(Object.entries(UPGRADE_CONFIG) as [UpgradeType, typeof UPGRADE_CONFIG[UpgradeType]][]).map(([type, cfg]) => (
                <ShopCard
                  key={type}
                  icon={cfg.emoji}
                  name={cfg.name}
                  desc={cfg.description}
                  price={cfg.price}
                  locked={cfg.prestigeRequired > store.prestigeLevel}
                  ownedLabel={store.upgrades?.[type] ? 'Owned' : undefined}
                  onBuy={() => warn(store.buyUpgrade(type))}
                />
              ))}
            </>
          )}

          {tab === 'iap' && (
            <>
              <p style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>
                One-time purchases — unlocks are saved to this browser. Payments secured by Stripe.
              </p>
              {!store.hasFirstPurchase && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.18))',
                  border: '1.5px solid #fbbf24',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 10,
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(251,191,36,0.2)',
                }}>
                  <div style={{ color: '#fbbf24', fontSize: 13, fontWeight: 900, marginBottom: 2 }}>
                    🎁 First-Purchase Bonus
                  </div>
                  <div style={{ color: '#fde68a', fontSize: 11 }}>
                    Your first pack gives <b>2× the rewards!</b> One-time offer.
                  </div>
                </div>
              )}
              {IAP_ITEMS.map((item, i) => {
                const isLoading = loadingItem === item.id;
                const glows = ['rgba(251,191,36,0.12)', 'rgba(167,139,250,0.12)', 'rgba(249,115,22,0.12)', 'rgba(236,72,153,0.12)'];
                const borders = ['#b45309', '#7c3aed', '#c2410c', '#be185d'];
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: glows[i], border: `1.5px solid ${borders[i]}`,
                    borderRadius: 14, padding: '12px 14px', marginBottom: 8,
                    boxShadow: `0 4px 20px ${glows[i]}`,
                  }}>
                    <span style={{ color: '#c4b5fd', fontSize: 13, fontWeight: 900, width: 48 }}>{item.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'white', fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
                        {item.name}
                        {!store.hasFirstPurchase && (
                          <span style={{ marginLeft: 6, background: '#fbbf24', color: '#1a2744', fontSize: 9, padding: '1px 5px', borderRadius: 6, fontWeight: 900 }}>
                            2×
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#a78bfa', fontSize: 11 }}>{item.description}</div>
                    </div>
                    <button
                      onClick={() => !loadingItem && handleBuyPack(item.id)}
                      disabled={!!loadingItem}
                      style={{
                        background: isLoading ? '#4c1d95' : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
                        color: 'white', border: 'none',
                        borderRadius: 10, padding: '7px 12px',
                        fontSize: 12, fontWeight: 800,
                        cursor: loadingItem ? 'not-allowed' : 'pointer',
                        flexShrink: 0, opacity: loadingItem && !isLoading ? 0.5 : 1,
                        minWidth: 64,
                      }}
                    >
                      {isLoading ? '...' : item.price}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
