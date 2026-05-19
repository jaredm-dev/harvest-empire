import { useState } from 'react';
import { useGameStore } from '../store';
import { CROP_CONFIG, FIELD_CONFIG, HARVESTER_CONFIG } from '../config';
import type { CropType, Field } from '../types';

function CropPicker({ field, onClose }: { field: Field; onClose: () => void }) {
  const { unlockedCrops, setCropOnField } = useGameStore();
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-slate-800 rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-3">Choose Crop</h3>
        <div className="grid grid-cols-3 gap-2">
          {unlockedCrops.map(crop => {
            const cc = CROP_CONFIG[crop];
            return (
              <button
                key={crop}
                onClick={() => { setCropOnField(field.id, crop); onClose(); }}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-colors ${
                  field.crop === crop
                    ? 'border-emerald-500 bg-emerald-900/30'
                    : 'border-slate-600 bg-slate-700'
                }`}
              >
                <span className="text-3xl">{cc.emoji}</span>
                <span className="text-xs text-white mt-1 font-medium">{cc.name}</span>
                <span className="text-xs text-amber-400">${cc.baseValue}/unit</span>
              </button>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-3 w-full py-2 text-slate-400 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function HarvesterPicker({ field, onClose }: { field: Field; onClose: () => void }) {
  const { harvesters, assignHarvester } = useGameStore();
  const unassigned = harvesters.filter(h => h.fieldId === null);
  const assigned = harvesters.filter(h => h.fieldId === field.id);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-slate-800 rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-1">Assign Harvester</h3>
        <p className="text-slate-400 text-xs mb-3">Only one harvester per field.</p>

        {assigned.length > 0 && (
          <div className="mb-3">
            <p className="text-emerald-400 text-xs font-semibold mb-2">ASSIGNED</p>
            {assigned.map(h => {
              const hc = HARVESTER_CONFIG[h.type];
              return (
                <div key={h.id} className="flex items-center justify-between bg-emerald-900/30 border border-emerald-700 rounded-xl px-3 py-2 mb-2">
                  <span className="text-white text-sm">{hc.emoji} {hc.name}</span>
                  <button
                    onClick={() => { assignHarvester(h.id, null); onClose(); }}
                    className="text-xs text-red-400 border border-red-800 rounded-lg px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {unassigned.length > 0 ? (
          <>
            <p className="text-slate-400 text-xs font-semibold mb-2">AVAILABLE</p>
            {unassigned.map(h => {
              const hc = HARVESTER_CONFIG[h.type];
              return (
                <button
                  key={h.id}
                  onClick={() => { assignHarvester(h.id, field.id); onClose(); }}
                  className="w-full flex items-center justify-between bg-slate-700 rounded-xl px-3 py-2 mb-2"
                >
                  <span className="text-white text-sm">{hc.emoji} {hc.name}</span>
                  <span className="text-emerald-400 text-xs">{hc.harvestRate}/s → Assign</span>
                </button>
              );
            })}
          </>
        ) : (
          <p className="text-slate-500 text-sm text-center py-4">No available harvesters.<br />Buy one in the Shop!</p>
        )}

        <button onClick={onClose} className="mt-2 w-full py-2 text-slate-400 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function FieldCard({ field }: { field: Field }) {
  const { harvestField, harvesters } = useGameStore();
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [showHarvesterPicker, setShowHarvesterPicker] = useState(false);

  const cc = CROP_CONFIG[field.crop];
  const fc = FIELD_CONFIG[field.type];
  const assignedHarvester = field.harvesterId
    ? harvesters.find(h => h.id === field.harvesterId)
    : null;
  const hc = assignedHarvester ? HARVESTER_CONFIG[assignedHarvester.type] : null;
  const isReady = field.readyToPick >= 1;

  return (
    <>
      <div className={`bg-slate-800 rounded-2xl p-4 border ${isReady && !assignedHarvester ? 'border-emerald-500 ready-glow' : 'border-slate-700'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{fc.emoji}</span>
            <div>
              <div className="text-white font-semibold text-sm">{fc.name}</div>
              <div className="text-slate-400 text-xs">Cap: {fc.capacity} units</div>
            </div>
          </div>
          <button
            onClick={() => setShowCropPicker(true)}
            className="flex items-center gap-1 bg-slate-700 rounded-xl px-3 py-1.5"
          >
            <span className="text-lg">{cc.emoji}</span>
            <span className="text-xs text-slate-300">{cc.name}</span>
          </button>
        </div>

        {/* Growth progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Growing</span>
            <span>{Math.round(field.growthProgress * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-emerald-400 progress-bar rounded-full"
              style={{ width: `${field.growthProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Ready to pick */}
        {isReady && (
          <div className="flex items-center justify-between mb-2 bg-emerald-900/30 rounded-xl px-3 py-1.5">
            <span className="text-emerald-400 text-sm font-semibold">
              ✅ {Math.floor(field.readyToPick)} units ready
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {/* Harvest button - only shown without harvester */}
          {!assignedHarvester && (
            <button
              onClick={() => harvestField(field.id)}
              disabled={!isReady}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                isReady
                  ? 'bg-emerald-600 text-white active:scale-95'
                  : 'bg-slate-700 text-slate-500'
              }`}
            >
              {isReady ? '🌾 Harvest' : 'Growing...'}
            </button>
          )}

          {/* Harvester status / assign */}
          <button
            onClick={() => setShowHarvesterPicker(true)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              hc
                ? 'bg-blue-900/50 text-blue-300 border border-blue-700'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {hc ? `${hc.emoji} ${hc.harvestRate}/s` : '+ Harvester'}
          </button>
        </div>
      </div>

      {showCropPicker && <CropPicker field={field} onClose={() => setShowCropPicker(false)} />}
      {showHarvesterPicker && <HarvesterPicker field={field} onClose={() => setShowHarvesterPicker(false)} />}
    </>
  );
}

export default function FarmView() {
  const fields = useGameStore(s => s.fields);
  const money = useGameStore(s => s.money);

  const cheapestField = 200;

  return (
    <div className="tab-content p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Your Fields</h2>
        <span className="text-slate-400 text-sm">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-5xl mb-3">🌱</div>
          <p>No fields yet. Visit the Shop to buy your first field!</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {fields.map(field => (
          <FieldCard key={field.id} field={field} />
        ))}
      </div>

      {money < cheapestField && fields.length === 1 && (
        <div className="mt-4 bg-amber-900/20 border border-amber-700 rounded-2xl p-4 text-sm text-amber-300">
          💡 <strong>Tip:</strong> Harvest your tomatoes and sell them in Storage to save up for upgrades!
        </div>
      )}
    </div>
  );
}
