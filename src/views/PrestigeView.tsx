import { useGameStore } from '../store';
import { PRESTIGE_CONFIG, getPrestigeConfig } from '../config';
import { formatMoney } from '../utils/format';

export default function PrestigeView() {
  const totalEarned = useGameStore(s => s.totalEarned);
  const prestigeLevel = useGameStore(s => s.prestigeLevel);
  const prestige = useGameStore(s => s.prestige);
  // Stats shown in the confirmation dialog so the player knows exactly
  // what they're about to wipe out.
  const fieldCount = useGameStore(s => s.fields.length);
  const truckCount = useGameStore(s => s.trucks.length);
  const harvesterCount = useGameStore(s => s.harvesters.length);
  const warehouseCount = useGameStore(s => s.warehouses.length);
  const money = useGameStore(s => s.money);

  // Prestige is now infinite — there's always a next tier (named milestones
  // for the first three, then generated "Tycoon Tier" levels forever).
  const current = getPrestigeConfig(prestigeLevel);
  const nextPrestige = getPrestigeConfig(prestigeLevel + 1);
  const canPrestige = !!nextPrestige && totalEarned >= nextPrestige.requirement;

  // Overview shows the three named tiers plus the next couple of generated
  // tiers so the player can see the ladder keeps going.
  const maxTier = Math.max(PRESTIGE_CONFIG.length, prestigeLevel + 2);
  const overviewTiers = Array.from({ length: maxTier }, (_, i) => getPrestigeConfig(i + 1)!).filter(Boolean);

  return (
    <div className="tab-content p-4 pb-24">
      <h2 className="text-white font-bold text-lg mb-1">Prestige</h2>
      <p className="text-slate-400 text-sm mb-6">
        Reset your company for a permanent income multiplier and new content.
      </p>

      {/* Current prestige status */}
      {prestigeLevel > 0 && current && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-2xl p-4 mb-4">
          <div className="text-yellow-400 font-bold text-lg">
            {current.emoji} {current.name}
          </div>
          <div className="text-yellow-300 text-sm mt-1">
            Active: {current.multiplier}× income multiplier
          </div>
        </div>
      )}

      {/* Next prestige info */}
      {nextPrestige ? (
        <div className={`rounded-2xl p-5 border-2 mb-4 ${canPrestige ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700 bg-slate-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{nextPrestige.emoji}</span>
            <div>
              <div className="text-white font-bold">{nextPrestige.name}</div>
              <div className="text-slate-400 text-xs">Prestige Level {nextPrestige.level}</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm mb-3">{nextPrestige.description}</p>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>${Math.floor(totalEarned).toLocaleString()} / ${nextPrestige.requirement.toLocaleString()}</span>
            </div>
            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-500 progress-bar rounded-full"
                style={{ width: `${Math.min((totalEarned / nextPrestige.requirement) * 100, 100)}%` }}
              />
            </div>
            {!canPrestige && (
              <p className="text-slate-500 text-xs mt-1">
                ${(nextPrestige.requirement - totalEarned).toLocaleString()} more to earn
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4 text-red-300 text-xs">
            ⚠️ <strong>Prestige resets:</strong> All fields, harvesters, warehouses, trucks, and inventory.
            You keep your prestige level and unlocked crops.
          </div>

          <button
            onClick={() => {
              if (!canPrestige) return;
              // Show the exact stuff being wiped out so this isn't a surprise.
              const losing = [
                `${fieldCount} field${fieldCount === 1 ? '' : 's'}`,
                `${harvesterCount} harvester${harvesterCount === 1 ? '' : 's'}`,
                `${warehouseCount} warehouse${warehouseCount === 1 ? '' : 's'}`,
                `${truckCount} truck${truckCount === 1 ? '' : 's'}`,
                `${formatMoney(money)} cash`,
                'all upgrades',
              ].join('\n  • ');
              const ok = window.confirm(
                `Prestige to ${nextPrestige.name}?\n\n` +
                `You'll permanently get ${nextPrestige.multiplier}× income forever.\n\n` +
                `You'll lose:\n  • ${losing}\n\n` +
                `Your achievements, login streak, and unlocked crops stay.`,
              );
              if (ok) prestige();
            }}
            disabled={!canPrestige}
            className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all ${
              canPrestige
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white active:scale-95'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {canPrestige
              ? `${nextPrestige.emoji} Prestige Now!`
              : `🔒 Earn $${nextPrestige.requirement.toLocaleString()} to unlock`}
          </button>
        </div>
      ) : (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-2xl p-5 text-center">
          <div className="text-4xl mb-2">🌍</div>
          <div className="text-yellow-400 font-bold text-lg">Global Empire Achieved!</div>
          <div className="text-yellow-300 text-sm mt-1">You've reached maximum prestige. 4× income forever!</div>
        </div>
      )}

      {/* All prestige levels overview */}
      <h3 className="text-slate-400 text-xs uppercase tracking-wider mb-3 mt-2">Prestige Ladder</h3>
      <div className="flex flex-col gap-2">
        {overviewTiers.map(cfg => {
          const done = prestigeLevel >= cfg.level;
          const isNext = prestigeLevel === cfg.level - 1;
          return (
            <div
              key={cfg.level}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                done ? 'bg-yellow-900/10 border-yellow-700/50' :
                isNext ? 'bg-slate-800 border-slate-600' :
                'bg-slate-800/50 border-slate-700/50 opacity-50'
              }`}
            >
              <span className="text-2xl">{cfg.emoji}</span>
              <div className="flex-1">
                <div className={`text-sm font-semibold ${done ? 'text-yellow-400' : 'text-slate-300'}`}>
                  {cfg.name}
                </div>
                <div className="text-slate-500 text-xs">{cfg.multiplier}× · Earn ${cfg.requirement.toLocaleString()}</div>
              </div>
              {done && <span className="text-emerald-400 text-sm">✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
