import { useGameStore } from '../store';
import { CROP_CONFIG, WAREHOUSE_CONFIG, HARVESTER_CONFIG, FIELD_CONFIG } from '../config';
import type { CropType } from '../types';
import { formatMoney, formatNumber } from '../utils/format';
import DrawerCloseButton from './DrawerCloseButton';

// ── Warehouse panel ───────────────────────────────────────────────────────────
export function WarehouseDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inventory = useGameStore(s => s.inventory);
  const warehouses = useGameStore(s => s.warehouses);
  const sellInventory = useGameStore(s => s.sellInventory);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);

  const totalCap = warehouses.reduce((s, w) => s + WAREHOUSE_CONFIG[w.type].capacity, 0);
  const totalItems = Object.values(inventory).reduce((s, v) => s + (v || 0), 0);
  const fillPct = totalCap > 0 ? totalItems / totalCap : 0;
  const pm = [1, 1.5, 2.5, 4][Math.min(prestigeLevel, 3)];

  const entries = (Object.entries(inventory) as [CropType, number][])
    .filter(([, v]) => v >= 0.5)
    .sort((a, b) => b[1] - a[1]);

  const sellValue = entries.reduce((s, [crop, amt]) =>
    s + Math.floor(amt) * CROP_CONFIG[crop].baseValue * pm, 0);

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <div className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-hidden={!open} aria-modal={open}>
        <div className="drawer-handle" />
        <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>🏚️ Warehouse</span>
          <DrawerCloseButton onClose={onClose} />
        </div>

        <div className="drawer-scroll" style={{ padding: '0 16px 100px' }}>
          {/* Capacity bar */}
          <div style={{ background: '#0f172a', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>Storage capacity</span>
              <span style={{ color: fillPct > 0.9 ? '#f87171' : 'white', fontSize: 12, fontWeight: 700 }}>
                {Math.floor(totalItems)} / {totalCap}
              </span>
            </div>
            <div style={{ height: 10, background: '#1e293b', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(fillPct, 1) * 100}%`,
                background: fillPct > 0.9 ? '#ef4444' : fillPct > 0.7 ? '#f59e0b' : '#4ade80',
                transition: 'width 0.3s, background 0.3s',
                borderRadius: 5,
              }} />
            </div>
            {fillPct > 0.9 && <p style={{ color: '#f87171', fontSize: 10, marginTop: 4 }}>⚠️ Almost full! Buy more storage in Shop.</p>}
          </div>

          {/* Warehouses list */}
          <p style={{ color: '#475569', fontSize: 11, marginBottom: 6 }}>YOUR BUILDINGS</p>
          {warehouses.map(w => {
            const wc = WAREHOUSE_CONFIG[w.type];
            return (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#1a2744', borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                border: '1px solid #1e293b',
              }}>
                <span style={{ fontSize: 26 }}>{wc.emoji}</span>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{wc.name}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{wc.capacity} units</div>
                </div>
              </div>
            );
          })}

          {/* Inventory */}
          <p style={{ color: '#475569', fontSize: 11, margin: '12px 0 6px' }}>INVENTORY</p>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', fontSize: 13, padding: '24px 0' }}>
              📭 Empty — harvest your fields!
            </div>
          ) : (
            <div style={{ background: '#0f172a', borderRadius: 12, overflow: 'hidden' }}>
              {entries.map(([crop, amt], i) => {
                const cc = CROP_CONFIG[crop];
                return (
                  <div key={crop} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: i < entries.length - 1 ? '1px solid #1e293b' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{cc.emoji}</span>
                      <div>
                        <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{cc.name}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>{Math.floor(amt)} units</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>
                        {formatMoney(Math.floor(Math.floor(amt) * cc.baseValue * pm))}
                      </div>
                      <div style={{ color: '#475569', fontSize: 10 }}>${cc.baseValue}/unit</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sell button */}
          {entries.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => { sellInventory(); onClose(); }}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg,#d97706,#b45309)',
                  color: 'white', border: 'none',
                  borderRadius: 14, fontWeight: 800,
                  fontSize: 15, cursor: 'pointer',
                }}
              >
                Sell All — {formatMoney(Math.floor(sellValue))}
              </button>
              <p style={{ color: '#475569', fontSize: 10, textAlign: 'center', marginTop: 6 }}>
                💡 Trucks deliver for up to 1.8× more income
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Market panel ──────────────────────────────────────────────────────────────
export function MarketDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const totalEarned = useGameStore(s => s.totalEarned);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);
  const gems = useGameStore(s => s.gems ?? 0);

  const pm = [1, 1.5, 2.5, 4][Math.min(prestigeLevel, 3)];

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <div className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-hidden={!open} aria-modal={open}>
        <div className="drawer-handle" />
        <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>🏪 Fresh Market</span>
          <DrawerCloseButton onClose={onClose} />
        </div>

        <div className="drawer-scroll" style={{ padding: '0 16px 100px' }}>
          <div style={{ background: '#0f172a', borderRadius: 12, padding: '14px', marginBottom: 12 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>TOTAL EARNINGS</div>
            <div style={{ color: '#fbbf24', fontSize: 28, fontWeight: 800 }}>
              {formatMoney(Math.floor(totalEarned))}
            </div>
          </div>

          <div style={{ background: '#0f172a', borderRadius: 12, padding: '14px', marginBottom: 12 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}>MARKET MULTIPLIER</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 32 }}>{'⭐'.repeat(Math.max(prestigeLevel, 1)) || '⭐'}</div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>{pm}× income</div>
                <div style={{ color: '#64748b', fontSize: 11 }}>
                  {prestigeLevel === 0 ? 'Prestige to boost income!' : `Prestige ${prestigeLevel} active`}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#082f49', borderRadius: 12, padding: '14px', marginBottom: 12, border: '1px solid #0e7490' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#67e8f9', fontSize: 11, fontWeight: 900, marginBottom: 4 }}>PREMIUM GEMS</div>
                <div style={{ color: '#ecfeff', fontSize: 24, fontWeight: 900 }}>{formatNumber(Math.floor(gems))}</div>
              </div>
              <div style={{ color: '#bae6fd', fontSize: 11, textAlign: 'right', maxWidth: 170 }}>
                Refresh rare orders or rush delivery trucks.
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(129,178,154,0.12)',
            border: '1px solid rgba(129,178,154,0.35)',
            borderRadius: 12, padding: '10px 12px', marginBottom: 12,
            color: 'var(--ink-dim)', fontSize: 12, lineHeight: 1.45,
          }}>
            <b style={{ color: 'var(--sage)' }}>How trucks work:</b> trucks
            pull crops from your warehouse and drive them to market, paying
            up to <b>2.7× more per unit</b> than selling from the warehouse.
            They run automatically — buy more in the Shop to multiply income.
          </div>

          <MarketOrderBoard />

          <FleetPanel />
        </div>
      </div>
    </>
  );
}

function FleetPanel() {
  const trucks = useGameStore(s => s.trucks);
  const rushTruckWithGems = useGameStore(s => s.rushTruckWithGems);
  const sellTruck = useGameStore(s => s.sellTruck);

  return (
    <div style={{ background: 'rgba(42,26,62,0.65)', borderRadius: 14, padding: 14, border: '1px solid var(--surface-line)' }}>
      <div style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 800, letterSpacing: 0.4, marginBottom: 10, textTransform: 'uppercase' }}>
        Your Fleet
      </div>
      {trucks.length === 0 ? (
        <div style={{ color: 'var(--ink-mute)', fontSize: 12 }}>No trucks yet — buy one from the Shop.</div>
      ) : (
        trucks.map(t => {
          const isIdle = t.status === 'idle';
          return (
            <div key={t.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid rgba(107,79,156,0.25)', gap: 8,
            }}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 700, flex: 1 }}>
                {isIdle ? '🅿️ Parked' : t.status === 'delivering' ? '🚀 Delivering' : '↩ Returning'}
                {!isIdle && ` · ${t.cargo}u · ${Math.round(t.deliveryProgress * 100)}%`}
              </div>
              {isIdle ? (
                <button
                  onClick={() => { if (confirm('Sell this truck for 55% of its price?')) sellTruck(t.id); }}
                  style={{
                    border: '1px solid var(--terracotta)',
                    background: 'rgba(224,122,95,0.18)',
                    color: 'var(--cream)',
                    borderRadius: 9, padding: '5px 10px', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sell
                </button>
              ) : (
                <button
                  onClick={() => rushTruckWithGems(t.id)}
                  style={{
                    border: '1px solid var(--info)',
                    background: 'rgba(167,139,250,0.18)',
                    color: 'var(--cream)',
                    borderRadius: 9, padding: '5px 10px', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Rush 3💎
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Harvester assign ──────────────────────────────────────────────────────────
function MarketOrderBoard() {
  const inventory = useGameStore(s => s.inventory);
  const orders = useGameStore(s => s.marketOrders) ?? [];
  const completeMarketOrder = useGameStore(s => s.completeMarketOrder);
  const rerollMarketOrders = useGameStore(s => s.rerollMarketOrders);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 900 }}>ORDER BOARD</div>
        <button
          onClick={rerollMarketOrders}
          style={{
            border: '1px solid #0e7490',
            background: 'linear-gradient(180deg,#155e75,#164e63)',
            color: '#cffafe',
            borderRadius: 10,
            padding: '7px 10px',
            fontSize: 11,
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Refresh 3 gems
        </button>
      </div>

      {orders.filter(o => o && o.requirements).map(order => {
        const canFill = Object.entries(order.requirements).every(([crop, amount]) =>
          (inventory[crop as CropType] || 0) >= (amount || 0),
        );
        const rarityColor = order.rarity === 'premium' ? '#22d3ee' : order.rarity === 'rush' ? '#f97316' : '#4ade80';

        return (
          <div key={order.id} style={{
            background: 'linear-gradient(180deg,#13233b,#0f172a)',
            border: `1.5px solid ${canFill ? rarityColor : '#26364f'}`,
            borderRadius: 15,
            padding: 12,
            marginBottom: 10,
            boxShadow: canFill ? `0 10px 24px ${rarityColor}1f` : 'none',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <div>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 900 }}>{order.title}</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{order.customer} - {Math.ceil(order.expiresIn / 60)}m left</div>
              </div>
              <div style={{ color: rarityColor, fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>{order.rarity}</div>
            </div>

            <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
              {(Object.entries(order.requirements) as [CropType, number][]).map(([crop, amount]) => {
                const have = Math.floor(inventory[crop] || 0);
                return (
                  <div key={crop} style={{ display: 'flex', justifyContent: 'space-between', color: have >= amount ? '#bbf7d0' : '#fecaca', fontSize: 12 }}>
                    <span>{CROP_CONFIG[crop].name}</span>
                    <span>{have}/{amount}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => completeMarketOrder(order.id)}
              disabled={!canFill}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: 'none',
                background: canFill ? 'linear-gradient(180deg,#fbbf24,#d97706)' : '#1e293b',
                color: canFill ? 'white' : '#64748b',
                fontSize: 12,
                fontWeight: 900,
                cursor: canFill ? 'pointer' : 'default',
              }}
            >
              Fill Order - {formatMoney(order.rewardMoney ?? 0)}{order.rewardGems ? ` - +${order.rewardGems} gems` : ''}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function AssignDrawer({
  open, fieldId, onClose,
}: { open: boolean; fieldId: string | null; onClose: () => void }) {
  const fields = useGameStore(s => s.fields);
  const harvesters = useGameStore(s => s.harvesters);
  const assignHarvester = useGameStore(s => s.assignHarvester);
  const setCropOnField = useGameStore(s => s.setCropOnField);
  const tendField = useGameStore(s => s.tendField);
  const fixFieldIssue = useGameStore(s => s.fixFieldIssue);
  const sellField = useGameStore(s => s.sellField);
  const unlockedCrops = useGameStore(s => s.unlockedCrops);
  const addToast = useGameStore(s => s.addToast);

  const field = fields.find(f => f.id === fieldId);
  if (!field) return null;

  const unassigned = harvesters.filter(h => h.fieldId === null);
  const assigned = harvesters.find(h => h.fieldId === fieldId);
  const condition = Math.round(field.condition ?? 100);
  const issueLabel = field.issue
    ? ({ dry: 'Dry soil', pests: 'Pests', weeds: 'Weeds', brokenHarvester: 'Broken harvester' } as const)[field.issue]
    : 'No active issue';

  return (
    <>
      {open && <div className="backdrop" onClick={onClose} />}
      <div className={`drawer ${open ? 'open' : ''}`} role="dialog" aria-hidden={!open} aria-modal={open}>
        <div className="drawer-handle" />
        <div style={{ padding: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>⚙️ Field Settings</span>
          <DrawerCloseButton onClose={onClose} />
        </div>

        <div className="drawer-scroll" style={{ padding: '0 16px 100px' }}>
          {/* Crop picker */}
          <p style={{ color: '#475569', fontSize: 11, marginBottom: 8 }}>FIELD CONDITION</p>
          <div style={{ background: '#0f172a', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: field.issue ? '#fca5a5' : '#94a3b8', fontSize: 12, fontWeight: 700 }}>{issueLabel}</span>
              <span style={{ color: condition < 55 ? '#f87171' : condition < 80 ? '#fbbf24' : '#4ade80', fontSize: 12, fontWeight: 800 }}>{condition}%</span>
            </div>
            <div style={{ height: 8, background: '#1e293b', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                width: `${condition}%`,
                height: '100%',
                background: condition < 55 ? '#ef4444' : condition < 80 ? '#f59e0b' : '#22c55e',
              }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: (condition < 80 || field.issue) && field.issue ? '1fr 1fr' : '1fr', gap: 8 }}>
              {condition < 80 && (
                <button
                  onClick={() => {
                    if (!tendField(field.id)) addToast('Need $25 to tend this field.', 'warning');
                  }}
                  style={{
                    padding: '10px 8px', borderRadius: 10,
                    background: '#14532d', color: '#bbf7d0',
                    border: '1.5px solid #16a34a', fontSize: 12, fontWeight: 800,
                  }}
                >
                  Tend Field $25
                </button>
              )}
              {field.issue && (
                <button
                  onClick={() => {
                    if (!fixFieldIssue(field.id)) addToast('Need more cash to fix this issue.', 'warning');
                  }}
                  style={{
                    padding: '10px 8px', borderRadius: 10,
                    background: '#7f1d1d', color: '#fecaca',
                    border: '1.5px solid #ef4444', fontSize: 12, fontWeight: 800,
                  }}
                >
                  Fix Issue
                </button>
              )}
            </div>
          </div>

          {/* Crop picker */}
          <p style={{ color: '#475569', fontSize: 11, marginBottom: 8 }}>CHANGE CROP</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {unlockedCrops.map(crop => {
              const cc = CROP_CONFIG[crop as keyof typeof CROP_CONFIG];
              return (
                <button
                  key={crop}
                  onClick={() => { setCropOnField(field.id, crop as any); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '10px 6px', borderRadius: 12,
                    background: field.crop === crop ? '#14532d' : '#1e293b',
                    border: field.crop === crop ? '2px solid #16a34a' : '2px solid #334155',
                    cursor: 'pointer', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 26 }}>{cc.emoji}</span>
                  <span style={{ fontSize: 9, color: field.crop === crop ? '#4ade80' : '#94a3b8', fontWeight: 700 }}>{cc.name}</span>
                  <span style={{ fontSize: 9, color: '#fbbf24' }}>${cc.baseValue}/u</span>
                </button>
              );
            })}
          </div>

          {/* Harvester */}
          <p style={{ color: '#475569', fontSize: 11, marginBottom: 8 }}>HARVESTER</p>
          {assigned ? (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#14532d', border: '1.5px solid #16a34a',
              borderRadius: 12, padding: '10px 14px', marginBottom: 8,
            }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>
                {HARVESTER_CONFIG[assigned.type].emoji} {HARVESTER_CONFIG[assigned.type].name} — {HARVESTER_CONFIG[assigned.type].harvestRate}/s
              </span>
              <button
                onClick={() => assignHarvester(assigned.id, null)}
                style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          ) : unassigned.length > 0 ? (
            unassigned.map(h => (
              <button
                key={h.id}
                onClick={() => { assignHarvester(h.id, field.id); onClose(); }}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: '#1e293b', border: '1.5px solid #334155',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
                }}
              >
                <span style={{ color: 'white', fontSize: 13 }}>
                  {HARVESTER_CONFIG[h.type].emoji} {HARVESTER_CONFIG[h.type].name}
                </span>
                <span style={{ color: '#4ade80', fontSize: 11 }}>Assign →</span>
              </button>
            ))
          ) : (
            <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
              No harvesters available. Buy one in the Shop!
            </div>
          )}

          {/* Sell field — only for non-starter fields. Shows the refund up
              front so the player can decide. */}
          {field.type !== 'starter' && (
            <button
              onClick={() => {
                const refund = Math.floor(FIELD_CONFIG[field.type].price * 0.55);
                const ok = window.confirm(
                  `Sell this ${FIELD_CONFIG[field.type].name} field for ${formatMoney(refund)}?\n\nAny crops still in the field will be lost. The assigned harvester (if any) will go back into the pool.`
                );
                if (!ok) return;
                if (sellField(field.id)) onClose();
              }}
              style={{
                width: '100%', padding: '11px', marginTop: 18,
                background: 'rgba(180, 83, 9, 0.15)', color: '#fbbf24',
                border: '1.5px solid #b45309', borderRadius: 12,
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
              }}
            >
              💰 Sell field for {formatMoney(Math.floor(FIELD_CONFIG[field.type].price * 0.55))}
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '12px', marginTop: 8,
              background: '#1e293b', color: '#94a3b8',
              border: '1.5px solid #334155', borderRadius: 12,
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
