import { useState } from 'react';
import { useGameStore } from '../store';
import {
  FIELD_CONFIG, HARVESTER_CONFIG, WAREHOUSE_CONFIG, TRUCK_CONFIG, CROP_CONFIG, IAP_ITEMS,
} from '../config';
import type { FieldType, HarvesterType, WarehouseType, TruckType, CropType } from '../types';

type ShopTab = 'fields' | 'crops' | 'harvesters' | 'storage' | 'trucks' | 'iap';

const SHOP_TABS: { id: ShopTab; label: string; emoji: string }[] = [
  { id: 'fields',    label: 'Fields',    emoji: '🌾' },
  { id: 'crops',     label: 'Crops',     emoji: '🍅' },
  { id: 'harvesters',label: 'Machines',  emoji: '🚜' },
  { id: 'storage',   label: 'Storage',   emoji: '📦' },
  { id: 'trucks',    label: 'Trucks',    emoji: '🚛' },
  { id: 'iap',       label: 'Boosts',    emoji: '💎' },
];

interface BuyBtnProps {
  price: number;
  onBuy: () => boolean;
  disabled?: boolean;
  label?: string;
}

function BuyBtn({ price, onBuy, disabled, label }: BuyBtnProps) {
  const money = useGameStore(s => s.money);
  const canAfford = money >= price && !disabled;

  return (
    <button
      onClick={() => canAfford && onBuy()}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
        canAfford
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
      }`}
    >
      {label ?? `$${price.toLocaleString()}`}
    </button>
  );
}

function ShopCard({
  emoji, name, description, price, locked, onBuy, owned,
}: {
  emoji: string; name: string; description: string; price: number;
  locked?: boolean; onBuy: () => boolean; owned?: number;
}) {
  return (
    <div className={`bg-slate-800 rounded-2xl p-4 border flex items-center gap-3 ${
      locked ? 'border-slate-700 opacity-60' : 'border-slate-700'
    }`}>
      <span className="text-3xl">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{name}</span>
          {owned !== undefined && owned > 0 && (
            <span className="bg-blue-900 text-blue-300 text-xs px-1.5 py-0.5 rounded-full">×{owned}</span>
          )}
        </div>
        <div className="text-slate-400 text-xs mt-0.5 truncate">{description}</div>
      </div>
      {locked ? (
        <span className="text-slate-500 text-xs whitespace-nowrap">🔒 Prestige</span>
      ) : (
        <BuyBtn price={price} onBuy={onBuy} />
      )}
    </div>
  );
}

export default function ShopView() {
  const [tab, setTab] = useState<ShopTab>('fields');
  const { buyField, buyHarvester, buyWarehouse, buyTruck, unlockCrop, simulateIAP,
          fields, harvesters, warehouses, trucks, unlockedCrops, prestigeLevel, addToast } = useGameStore();

  const handle = (fn: () => boolean, name: string) => () => {
    const ok = fn();
    if (!ok) addToast('Not enough money or not unlocked yet!', 'warning');
    return ok;
  };

  return (
    <div className="tab-content pb-24">
      {/* Sub-tabs */}
      <div className="flex overflow-x-auto gap-1 px-4 pt-4 pb-2 no-scrollbar">
        {SHOP_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 flex flex-col gap-3">

        {tab === 'fields' && (
          <>
            <p className="text-slate-500 text-xs">More fields = more crops growing at once. Set crop type in Farm view.</p>
            {(Object.entries(FIELD_CONFIG) as [FieldType, typeof FIELD_CONFIG[FieldType]][]).map(([type, cfg]) => (
              <ShopCard
                key={type}
                emoji={cfg.emoji}
                name={cfg.name}
                description={`${cfg.yieldMultiplier} units/cycle · ${cfg.capacity} capacity`}
                price={cfg.price}
                locked={cfg.prestigeRequired > prestigeLevel}
                owned={fields.filter(f => f.type === type).length}
                onBuy={handle(() => buyField(type), cfg.name)}
              />
            ))}
          </>
        )}

        {tab === 'crops' && (
          <>
            <p className="text-slate-500 text-xs">Unlock new crops. Switch crops on a field in the Farm view.</p>
            {(Object.entries(CROP_CONFIG) as [CropType, typeof CROP_CONFIG[CropType]][]).map(([type, cfg]) => {
              const unlocked = unlockedCrops.includes(type);
              return (
                <div key={type} className={`bg-slate-800 rounded-2xl p-4 border flex items-center gap-3 ${
                  cfg.prestigeRequired > prestigeLevel ? 'opacity-60 border-slate-700' : 'border-slate-700'
                }`}>
                  <span className="text-3xl">{cfg.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm">{cfg.name}</span>
                      {unlocked && <span className="text-emerald-400 text-xs">✓ Unlocked</span>}
                    </div>
                    <div className="text-slate-400 text-xs">${cfg.baseValue}/unit · {cfg.growTime}s cycle</div>
                  </div>
                  {cfg.prestigeRequired > prestigeLevel ? (
                    <span className="text-slate-500 text-xs">🔒 Prestige {cfg.prestigeRequired}</span>
                  ) : unlocked ? (
                    <span className="text-slate-500 text-xs">Owned</span>
                  ) : (
                    <BuyBtn price={cfg.unlockCost} onBuy={handle(() => unlockCrop(type), cfg.name)} />
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === 'harvesters' && (
          <>
            <p className="text-slate-500 text-xs">Harvesters auto-collect crops. Assign them to fields in Farm view.</p>
            <div className="bg-slate-800 rounded-xl px-4 py-2 border border-slate-700 flex justify-between text-sm">
              <span className="text-slate-400">Available (unassigned)</span>
              <span className="text-white font-semibold">{harvesters.filter(h => !h.fieldId).length}</span>
            </div>
            {(Object.entries(HARVESTER_CONFIG) as [HarvesterType, typeof HARVESTER_CONFIG[HarvesterType]][]).map(([type, cfg]) => (
              <ShopCard
                key={type}
                emoji={cfg.emoji}
                name={cfg.name}
                description={`${cfg.harvestRate} units/sec auto-harvest`}
                price={cfg.price}
                locked={cfg.prestigeRequired > prestigeLevel}
                owned={harvesters.filter(h => h.type === type).length}
                onBuy={handle(() => buyHarvester(type), cfg.name)}
              />
            ))}
          </>
        )}

        {tab === 'storage' && (
          <>
            <p className="text-slate-500 text-xs">Warehouse capacity is pooled across all buildings.</p>
            {(Object.entries(WAREHOUSE_CONFIG) as [WarehouseType, typeof WAREHOUSE_CONFIG[WarehouseType]][]).map(([type, cfg]) => (
              <ShopCard
                key={type}
                emoji={cfg.emoji}
                name={cfg.name}
                description={`${cfg.capacity} unit capacity`}
                price={cfg.price}
                locked={cfg.prestigeRequired > prestigeLevel}
                owned={warehouses.filter(w => w.type === type).length}
                onBuy={handle(() => buyWarehouse(type), cfg.name)}
              />
            ))}
          </>
        )}

        {tab === 'trucks' && (
          <>
            <p className="text-slate-500 text-xs">Trucks auto-deliver inventory for bonus income vs. manual selling.</p>
            {(Object.entries(TRUCK_CONFIG) as [TruckType, typeof TRUCK_CONFIG[TruckType]][]).map(([type, cfg]) => (
              <ShopCard
                key={type}
                emoji={cfg.emoji}
                name={cfg.name}
                description={`${cfg.capacity} cap · ${cfg.valueMultiplier}× value · ${cfg.deliveryTime}s trip`}
                price={cfg.price}
                locked={cfg.prestigeRequired > prestigeLevel}
                owned={trucks.filter(t => t.type === type).length}
                onBuy={handle(() => buyTruck(type), cfg.name)}
              />
            ))}
          </>
        )}

        {tab === 'iap' && (
          <>
            <div className="bg-purple-900/20 border border-purple-700 rounded-2xl p-3 text-purple-300 text-xs mb-1">
              💎 In-app purchases — simulated for testing. In production these would use Apple StoreKit.
            </div>
            {IAP_ITEMS.map(item => (
              <div key={item.id} className="bg-slate-800 rounded-2xl p-4 border border-purple-800/50 flex items-center gap-3">
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">{item.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{item.description}</div>
                </div>
                <button
                  onClick={() => simulateIAP(item.id)}
                  className="bg-purple-600 text-white px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all whitespace-nowrap"
                >
                  {item.price}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
