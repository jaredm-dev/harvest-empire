import { useGameStore } from '../store';
import { TRUCK_CONFIG, CROP_CONFIG } from '../config';
import type { CropType } from '../types';

export default function FleetView() {
  const trucks = useGameStore(s => s.trucks);
  const inventory = useGameStore(s => s.inventory);
  const totalInv = Object.values(inventory).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="tab-content p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Fleet</h2>
        <span className="text-slate-400 text-sm">{trucks.length} truck{trucks.length !== 1 ? 's' : ''}</span>
      </div>

      {trucks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🚛</div>
          <p className="text-slate-400 mb-2">No trucks yet!</p>
          <p className="text-slate-500 text-sm">
            Trucks automatically pick up your inventory and deliver it for up to 1.8× the base price.
          </p>
          <p className="text-slate-500 text-sm mt-2">Visit the Shop to buy your first truck.</p>
        </div>
      ) : (
        <>
          {totalInv > 0 && (
            <div className="mb-3 bg-emerald-900/20 border border-emerald-700 rounded-xl px-3 py-2 text-emerald-400 text-sm">
              📦 {Math.floor(totalInv)} units waiting for pickup
            </div>
          )}

          <div className="flex flex-col gap-3">
            {trucks.map(truck => {
              const tc = TRUCK_CONFIG[truck.type];
              const isMoving = truck.status === 'delivering' || truck.status === 'returning';
              const cargoEntries = (Object.entries(truck.cargoTypes) as [CropType, number][])
                .filter(([, v]) => v > 0);

              return (
                <div
                  key={truck.id}
                  className={`bg-slate-800 rounded-2xl p-4 border transition-colors ${
                    isMoving ? 'border-blue-600' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl ${isMoving ? 'truck-moving' : ''}`}>{tc.emoji}</span>
                      <div>
                        <div className="text-white font-semibold">{tc.name}</div>
                        <div className="text-slate-400 text-xs">Cap: {tc.capacity} · {tc.valueMultiplier}× value</div>
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      truck.status === 'idle'       ? 'bg-slate-700 text-slate-300' :
                      truck.status === 'delivering' ? 'bg-blue-800 text-blue-300' :
                                                      'bg-slate-700 text-emerald-300'
                    }`}>
                      {truck.status === 'idle'       ? '⏸ Idle' :
                       truck.status === 'delivering' ? '🚀 Delivering' :
                                                       '↩ Returning'}
                    </div>
                  </div>

                  {/* Delivery progress bar */}
                  {isMoving && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{truck.status === 'delivering' ? 'To customer' : 'Returning'}</span>
                        <span>{Math.round(truck.deliveryProgress * 100)}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full progress-bar rounded-full ${
                            truck.status === 'delivering' ? 'bg-blue-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${truck.deliveryProgress * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Cargo */}
                  {cargoEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cargoEntries.map(([crop, amt]) => (
                        <span key={crop} className="bg-slate-700 rounded-full px-2 py-0.5 text-xs text-slate-300">
                          {CROP_CONFIG[crop].emoji} {Math.floor(amt)}
                        </span>
                      ))}
                      <span className="text-slate-500 text-xs self-center ml-1">
                        ({truck.cargo}/{tc.capacity})
                      </span>
                    </div>
                  )}

                  {truck.status === 'idle' && totalInv === 0 && (
                    <div className="text-slate-500 text-xs mt-1">Waiting for inventory...</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
