import { useGameStore } from '../store';
import { CROP_CONFIG, WAREHOUSE_CONFIG } from '../config';
import type { CropType } from '../types';

export default function WarehouseView() {
  const inventory = useGameStore(s => s.inventory);
  const warehouses = useGameStore(s => s.warehouses);
  const sellInventory = useGameStore(s => s.sellInventory);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);

  const totalCap = warehouses.reduce((s, w) => s + WAREHOUSE_CONFIG[w.type].capacity, 0);
  const totalItems = Object.values(inventory).reduce((s, v) => s + (v || 0), 0);
  const fillPct = totalCap > 0 ? (totalItems / totalCap) * 100 : 0;

  const cropEntries = (Object.entries(inventory) as [CropType, number][])
    .filter(([, amt]) => amt >= 0.5)
    .sort((a, b) => b[1] - a[1]);

  const sellValue = cropEntries.reduce((s, [crop, amt]) => {
    return s + Math.floor(amt) * CROP_CONFIG[crop].baseValue;
  }, 0);

  const pm = prestigeLevel === 0 ? 1 : [1.5, 2.5, 4][Math.min(prestigeLevel - 1, 2)];

  return (
    <div className="tab-content p-4 pb-24">
      <h2 className="text-white font-bold text-lg mb-4">Storage</h2>

      {/* Capacity bar */}
      <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-300 text-sm font-semibold">Total Capacity</span>
          <span className={`text-sm font-bold ${fillPct > 90 ? 'text-red-400' : 'text-slate-300'}`}>
            {Math.floor(totalItems)} / {totalCap}
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full progress-bar rounded-full ${
              fillPct > 90 ? 'bg-red-500' : fillPct > 70 ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(fillPct, 100)}%` }}
          />
        </div>
        {fillPct > 90 && (
          <p className="text-red-400 text-xs mt-1">⚠️ Storage nearly full! Buy more warehouses.</p>
        )}
      </div>

      {/* Warehouses list */}
      <div className="mb-4">
        <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Your Warehouses</h3>
        <div className="flex flex-col gap-2">
          {warehouses.map(w => {
            const wc = WAREHOUSE_CONFIG[w.type];
            return (
              <div key={w.id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
                <span className="text-2xl">{wc.emoji}</span>
                <div>
                  <div className="text-white text-sm font-semibold">{wc.name}</div>
                  <div className="text-slate-400 text-xs">{wc.capacity} unit capacity</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory */}
      <div className="mb-4">
        <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Inventory</h3>
        {cropEntries.length === 0 ? (
          <div className="text-slate-500 text-sm text-center py-6 bg-slate-800/50 rounded-2xl">
            📭 Warehouse is empty.<br />Harvest your fields to fill it up!
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            {cropEntries.map(([crop, amt], i) => {
              const cc = CROP_CONFIG[crop];
              const value = Math.floor(amt) * cc.baseValue;
              return (
                <div
                  key={crop}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < cropEntries.length - 1 ? 'border-b border-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cc.emoji}</span>
                    <div>
                      <div className="text-white text-sm font-semibold">{cc.name}</div>
                      <div className="text-slate-400 text-xs">{Math.floor(amt)} units</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-400 text-sm font-bold">${Math.floor(value * pm).toLocaleString()}</div>
                    <div className="text-slate-500 text-xs">${cc.baseValue}/unit</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sell button */}
      {cropEntries.length > 0 && (
        <div>
          <button
            onClick={sellInventory}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 active:scale-95 transition-all rounded-2xl text-white font-bold text-base"
          >
            Sell All — ${Math.floor(sellValue * pm).toLocaleString()}
          </button>
          <p className="text-slate-500 text-xs text-center mt-2">
            💡 Get up to {Math.round(1.8 * 100)}% more by using trucks for delivery
          </p>
        </div>
      )}
    </div>
  );
}
