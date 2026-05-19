import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameStore, Field, Harvester, Warehouse, Truck, CropType, FieldIssue, Toast, FieldCart, MarketOrder, GameEvent, EventType, DailyMission } from './types';
import {
  CROP_CONFIG, FIELD_CONFIG, HARVESTER_CONFIG, WAREHOUSE_CONFIG, TRUCK_CONFIG,
  PRESTIGE_CONFIG, IAP_ITEMS, MAX_FIELDS, UPGRADE_CONFIG, getPrestigeMultiplier,
  ACHIEVEMENT_CONFIG, EVENT_CONFIG, MISSION_POOL,
} from './config';
import { formatMoney } from './utils/format';
import { Sound } from './utils/sound';
import { celebrate } from './utils/confetti';

const uid = () => Math.random().toString(36).slice(2, 10);

const ORDER_NAMES = ['Sunrise Cafe', 'County Fair', 'Bakery Guild', 'Riverside Inn', 'Chef Mira', 'Harvest Club'];
const ORDER_TITLES = ['Fresh crate', 'Kitchen restock', 'Festival bundle', 'Chef request', 'Town delivery', 'Pantry fill'];

const generateMarketOrders = (unlockedCrops: CropType[], prestigeLevel: number): MarketOrder[] => {
  const crops = unlockedCrops.length > 0 ? unlockedCrops : ['tomato' as CropType];
  return Array.from({ length: 4 }, (_, index) => {
    const rarity: MarketOrder['rarity'] = index === 0 ? 'standard' : index === 1 ? 'premium' : index === 2 ? 'rush' : 'standard';
    const cropA = crops[(index + prestigeLevel) % crops.length];
    const cropB = crops[(index + 1 + prestigeLevel) % crops.length];
    const baseQty = rarity === 'rush' ? 10 + prestigeLevel * 4 : rarity === 'premium' ? 16 + prestigeLevel * 6 : 8 + prestigeLevel * 3;
    const requirements: Partial<Record<CropType, number>> = {
      [cropA]: baseQty,
    };
    if (cropB !== cropA && rarity !== 'standard') requirements[cropB] = Math.ceil(baseQty * 0.55);

    const cropValue = Object.entries(requirements).reduce((sum, [crop, amount]) =>
      sum + (amount || 0) * CROP_CONFIG[crop as CropType].baseValue,
    0);
    const premium = rarity === 'premium' ? 2.25 : rarity === 'rush' ? 2.7 : 1.85;

    return {
      id: uid(),
      title: ORDER_TITLES[(index + prestigeLevel) % ORDER_TITLES.length],
      customer: ORDER_NAMES[(index * 2 + prestigeLevel) % ORDER_NAMES.length],
      requirements,
      rewardMoney: Math.floor(cropValue * premium * getPrestigeMultiplier(prestigeLevel)),
      rewardGems: rarity === 'premium' ? 2 : rarity === 'rush' ? 1 : 0,
      expiresIn: rarity === 'rush' ? 900 : rarity === 'premium' ? 1800 : 2700,
      rarity,
    };
  });
};

const normalizeField = (field: Field): Field => ({
  ...field,
  readyAge: field.readyAge ?? 0,
  condition: field.condition ?? 100,
  issue: field.issue ?? null,
  harvestBuffer: field.harvestBuffer ?? 0,
});

const issueLabel = (issue: FieldIssue) => ({
  dry: 'Dry soil',
  pests: 'Pests',
  weeds: 'Weeds',
  brokenHarvester: 'Broken harvester',
}[issue]);

const INITIAL_FIELDS: Field[] = [{
  id: 'field-start',
  type: 'starter',
  crop: 'tomato',
  growthProgress: 0,
  readyToPick: 0,
  harvesterId: null,
}];

const INITIAL_WAREHOUSES: Warehouse[] = [{
  id: 'warehouse-start',
  type: 'stand',
}];

const generateDailyMissions = (): DailyMission[] => {
  // Pick 3 random unique missions
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  const picks: DailyMission[] = [];
  const usedTypes = new Set<string>();
  for (const m of shuffled) {
    if (picks.length >= 3) break;
    // Avoid duplicate types in same set
    if (usedTypes.has(m.type)) continue;
    usedTypes.add(m.type);
    picks.push({
      id: uid(),
      type: m.type,
      target: m.target,
      progress: 0,
      rewardGems: m.rewardGems,
      rewardMoney: m.rewardMoney,
      claimed: false,
      description: m.description,
      emoji: m.emoji,
    });
  }
  return picks;
};

const INITIAL_STATE = {
  money: 500,
  gems: 25,
  totalEarned: 0,
  prestigeLevel: 0,
  fields: INITIAL_FIELDS,
  harvesters: [] as Harvester[],
  warehouses: INITIAL_WAREHOUSES,
  trucks: [] as Truck[],
  inventory: {} as Partial<Record<CropType, number>>,
  unlockedCrops: ['tomato'] as CropType[],
  upgrades: {},
  toasts: [] as Toast[],
  fieldCarts: [] as FieldCart[],
  marketOrders: generateMarketOrders(['tomato'], 0),
  achievements: [] as string[],
  activeEvents: [] as GameEvent[],
  loginStreak: 0,
  lastLoginDate: null as string | null,
  marketOrdersCompleted: 0,
  // New fields
  lastSavedTime: null as number | null,
  dailyMissions: [] as DailyMission[],
  missionsDate: null as string | null,
  hasFirstPurchase: false,
  hasSeenTutorial: false,
  offlineReport: null as null | { seconds: number; moneyEarned: number; cropsGrown: number },
  totalCropsHarvested: 0,
  totalDeliveriesCompleted: 0,
};

// Helper to update mission progress
const bumpMissions = (
  missions: DailyMission[],
  type: DailyMission['type'],
  amount: number,
): DailyMission[] => {
  if (!missions || missions.length === 0) return missions;
  return missions.map(m =>
    m.type === type && !m.claimed
      ? { ...m, progress: Math.min(m.target, m.progress + amount) }
      : m,
  );
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      tick: (delta: number) => {
        const state = get();
        const pm = getPrestigeMultiplier(state.prestigeLevel);
        const upgrades = state.upgrades || {};
        let moneyEarned = 0;

        const activeEvents = state.activeEvents || [];
        const hasEvent = (t: EventType) => activeEvents.some(e => e.type === t);
        const eventGrowthMult = hasEvent('bumper_crop') ? 2.0 : hasEvent('drought') ? 0.55 : 1.0;
        const eventDeliveryMult = hasEvent('delivery_bonus') ? 1.6 : 1.0;

        const CART_TRIP   = 10;  // seconds one-way field → warehouse
        const MIN_CART_LOAD = 4; // units in buffer before spawning a cart

        // --- Fields: grow crops, auto-harvest into harvestBuffer ---
        const updatedFields = state.fields.map(field => {
          field = normalizeField(field);
          const cc = CROP_CONFIG[field.crop];
          const fc = FIELD_CONFIG[field.type];
          let { growthProgress, readyToPick } = field;
          let readyAge    = field.readyAge    ?? 0;
          let condition   = field.condition   ?? 100;
          let issue       = field.issue       ?? null;
          let harvestBuffer = field.harvestBuffer ?? 0;

          if (!issue && Math.random() < delta / (upgrades.scarecrow ? 1800 : 900)) {
            const roll = Math.random();
            issue = roll < 0.34 ? 'dry' : roll < 0.68 ? 'pests' : 'weeds';
            if (field.harvesterId && !upgrades.mechanic && Math.random() < 0.12) issue = 'brokenHarvester';
          }

          if (issue && upgrades.autoTend && Math.random() < delta / 90) {
            issue = null;
            condition = Math.min(100, condition + 15);
          }

          if (issue) {
            condition = Math.max(35, condition - delta * 0.04);
          } else {
            condition = Math.min(100, condition + delta * (upgrades.compost ? 0.03 : 0.012));
          }

          const condMult  = Math.max(0.35, condition / 100);
          const issueMult = issue ? 0.45 : 1;
          const growMult  = upgrades.irrigation ? 1.2 : 1;
          const yieldBonus = upgrades.extraYield ? 1.15 : 1;

          growthProgress += (delta / cc.growTime) * condMult * issueMult * growMult * eventGrowthMult;
          while (growthProgress >= 1) {
            growthProgress -= 1;
            readyToPick = Math.min(readyToPick + fc.yieldMultiplier * yieldBonus, fc.capacity);
            readyAge = 0;
          }

          if (readyToPick >= 1) {
            readyAge += delta;
            const spoilAfter = upgrades.coldStorage ? 900 : 420;
            if (readyAge > spoilAfter) {
              const spoil = Math.min(readyToPick, delta * fc.yieldMultiplier * (upgrades.coldStorage ? 0.012 : 0.025));
              readyToPick = Math.max(0, readyToPick - spoil);
              condition   = Math.max(30, condition - delta * 0.015);
              if (readyToPick < 1) readyAge = 0;
            }
          } else {
            readyAge = 0;
          }

          // Harvester collects into buffer (field cart will deliver to warehouse)
          if (field.harvesterId && issue !== 'brokenHarvester') {
            const harvester = state.harvesters.find(h => h.id === field.harvesterId);
            if (harvester) {
              const hc = HARVESTER_CONFIG[harvester.type];
              const amount = Math.min(hc.harvestRate * delta, readyToPick);
              if (amount > 0) {
                readyToPick   -= amount;
                harvestBuffer += amount;
              }
            }
          }

          return { ...field, growthProgress, readyToPick, readyAge, condition, issue, harvestBuffer };
        });

        // --- Field carts: spawn from filled buffers + tick existing ---
        const newInventory = { ...state.inventory };
        const totalCap = state.warehouses.reduce((s, w) => s + WAREHOUSE_CONFIG[w.type].capacity, 0);

        const haulingFields = new Set(
          state.fieldCarts.filter(c => c.status === 'hauling').map(c => c.fieldId),
        );

        const cartsToSpawn: FieldCart[] = [];
        const finalFields = updatedFields.map(field => {
          const buf = field.harvestBuffer ?? 0;
          if (buf >= MIN_CART_LOAD && field.harvesterId && !haulingFields.has(field.id)) {
            const cargo = Math.floor(buf);
            cartsToSpawn.push({
              id: uid(), fieldId: field.id, cropType: field.crop,
              cargo, status: 'hauling' as const, progress: 0,
            });
            return { ...field, harvestBuffer: buf - cargo };
          }
          return field;
        });

        const newToasts: Toast[] = [];
        const updatedCarts = [...state.fieldCarts, ...cartsToSpawn]
          .map(cart => {
            const np = cart.progress + delta / CART_TRIP;
            if (cart.status === 'hauling') {
              if (np >= 1) {
                const curTotal = Object.values(newInventory).reduce((s, v) => s + (v || 0), 0);
                const space = totalCap - curTotal;
                const dep = Math.min(cart.cargo, Math.max(0, space));
                if (dep > 0) {
                  newInventory[cart.cropType] = (newInventory[cart.cropType] || 0) + dep;
                }
                return { ...cart, status: 'returning' as const, progress: 0, cargo: 0 };
              }
              return { ...cart, progress: np };
            }
            if (cart.status === 'returning') {
              if (np >= 1) return null;
              return { ...cart, progress: np };
            }
            return cart;
          })
          .filter((c): c is FieldCart => c !== null);

        // --- Trucks (load from newInventory which now includes cart deposits) ---
        const updatedTrucks = state.trucks.map(truck => {
          const tc = TRUCK_CONFIG[truck.type];
          const halfTrip = tc.deliveryTime / 2;

          if (truck.status === 'idle') {
            const invTotal = Object.values(newInventory).reduce((s, v) => s + (v || 0), 0);
            if (invTotal <= 0) return truck;

            const cargoTypes: Partial<Record<CropType, number>> = {};
            let cap = tc.capacity;
            for (const [crop, amt] of Object.entries(newInventory)) {
              if (cap <= 0) break;
              const toLoad = Math.min(amt || 0, cap);
              if (toLoad > 0) {
                cargoTypes[crop as CropType] = toLoad;
                newInventory[crop as CropType] = (newInventory[crop as CropType] || 0) - toLoad;
                cap -= toLoad;
              }
            }
            const cargoTotal = Object.values(cargoTypes).reduce((s, v) => s + (v || 0), 0);
            if (cargoTotal === 0) return truck;
            return { ...truck, status: 'delivering' as const, cargo: cargoTotal, cargoTypes, deliveryProgress: 0 };
          }

          if (truck.status === 'delivering') {
            const speedMult = state.upgrades?.fasterTrucks ? 1.3 : 1;
            const newProg = truck.deliveryProgress + (delta / halfTrip) * speedMult;
            if (newProg >= 1) {
              let earned = 0;
              const marketBonus = state.upgrades?.marketStand ? 1.1 : 1;
              for (const [crop, amt] of Object.entries(truck.cargoTypes)) {
                const cc = CROP_CONFIG[crop as CropType];
                earned += (amt || 0) * cc.baseValue * tc.valueMultiplier * pm * marketBonus * eventDeliveryMult;
              }
              moneyEarned += earned;
              newToasts.push({ id: uid(), message: `Delivery complete! +${formatMoney(earned)}`, type: 'success' });
              return { ...truck, status: 'returning' as const, deliveryProgress: 0 };
            }
            return { ...truck, deliveryProgress: newProg };
          }

          if (truck.status === 'returning') {
            const speedMult = state.upgrades?.fasterTrucks ? 1.3 : 1;
            const newProg = truck.deliveryProgress + (delta / halfTrip) * speedMult;
            if (newProg >= 1) return { ...truck, status: 'idle' as const, cargo: 0, cargoTypes: {}, deliveryProgress: 0 };
            return { ...truck, deliveryProgress: newProg };
          }

          return truck;
        });

        // ── Achievements ─────────────────────────────────────────────────────────
        const achieved = new Set(state.achievements || []);
        const newAchievements: string[] = [];
        const checkAch = (id: string, condition: boolean) => {
          if (condition && !achieved.has(id)) {
            newAchievements.push(id);
            achieved.add(id);
            const cfg = ACHIEVEMENT_CONFIG[id];
            if (cfg) {
              newToasts.push({ id: uid(), message: `${cfg.emoji} Achievement: ${cfg.name} — ${cfg.description}`, type: 'achievement' as const });
              // Fire the chime on next tick so it doesn't get swallowed mid-state-update
              setTimeout(() => { Sound.achievement(); celebrate('small'); }, 0);
            }
          }
        };
        const nextTotal = state.totalEarned + moneyEarned;
        if (moneyEarned > 0)                                  checkAch('first_delivery',   true);
        checkAch('millionaire',     nextTotal >= 1_000_000);
        checkAch('ten_million',     nextTotal >= 10_000_000);
        checkAch('hundred_million', nextTotal >= 100_000_000);
        checkAch('fleet_of_3',      state.trucks.length >= 3);
        checkAch('full_farm',       finalFields.length >= MAX_FIELDS);
        checkAch('crop_variety',    state.unlockedCrops.length >= 4);
        checkAch('truffle_hunter',  state.unlockedCrops.includes('truffle'));
        checkAch('first_prestige',  state.prestigeLevel >= 1);
        checkAch('max_prestige',    state.prestigeLevel >= 3);
        checkAch('upgrade_master',  Object.keys(state.upgrades || {}).length >= 5);
        checkAch('storage_king',    state.warehouses.length >= 3);
        checkAch('market_master',   (state.marketOrdersCompleted || 0) >= 10);
        checkAch('week_streak',     (state.loginStreak || 0) >= 7);

        // ── Random events (~1 per 5 min) ─────────────────────────────────────────
        const newEvents: GameEvent[] = [];
        if (activeEvents.length < 2 && Math.random() < delta / 300) {
          const types: EventType[] = ['market_surge', 'bumper_crop', 'delivery_bonus', 'drought'];
          const available = types.filter(t => !activeEvents.some(e => e.type === t));
          if (available.length > 0) {
            const type = available[Math.floor(Math.random() * available.length)];
            const cfg = EVENT_CONFIG[type];
            newEvents.push({ id: uid(), type, duration: cfg.duration });
            newToasts.push({ id: uid(), message: `${cfg.emoji} ${cfg.name}! ${cfg.description}`, type: 'info' as const });
          }
        }
        const updatedEvents = [...activeEvents, ...newEvents]
          .map(e => ({ ...e, duration: e.duration - delta }))
          .filter(e => e.duration > 0);

        // Count truck deliveries that completed this tick (newToasts containing "Delivery complete")
        const deliveriesThisTick = newToasts.filter(t => t.message.startsWith('Delivery complete')).length;

        set(s => {
          let missions = s.dailyMissions || [];
          if (moneyEarned > 0)         missions = bumpMissions(missions, 'earn_money', moneyEarned);
          if (deliveriesThisTick > 0)  missions = bumpMissions(missions, 'use_truck', deliveriesThisTick);

          return {
            fields: finalFields,
            fieldCarts: updatedCarts,
            trucks: updatedTrucks,
            inventory: newInventory,
            money: s.money + moneyEarned,
            totalEarned: s.totalEarned + moneyEarned,
            totalDeliveriesCompleted: (s.totalDeliveriesCompleted || 0) + deliveriesThisTick,
            achievements: newAchievements.length ? [...new Set([...(s.achievements || []), ...newAchievements])] : (s.achievements || []),
            activeEvents: updatedEvents,
            dailyMissions: missions,
            lastSavedTime: Date.now(),
            marketOrders: (s.marketOrders?.length ? s.marketOrders : generateMarketOrders(s.unlockedCrops, s.prestigeLevel))
              .map(order => ({ ...order, expiresIn: Math.max(0, order.expiresIn - delta) }))
              .map(order => order.expiresIn <= 0 ? generateMarketOrders(s.unlockedCrops, s.prestigeLevel)[0] : order),
            toasts: [...s.toasts, ...newToasts].slice(-5),
          };
        });
      },

      harvestField: (fieldId) => {
        const state = get();
        const field = state.fields.find(f => f.id === fieldId);
        if (!field) return { harvested: 0, reason: 'missing' };
        if (field.readyToPick < 1) return { harvested: 0, reason: 'not_ready' };

        const totalCap = state.warehouses.reduce((s, w) => s + WAREHOUSE_CONFIG[w.type].capacity, 0);
        const currentTotal = Object.values(state.inventory).reduce((s, v) => s + (v || 0), 0);
        const space = totalCap - currentTotal;
        if (space <= 0) {
          set(s => ({
            toasts: [...s.toasts, {
              id: uid(),
              message: 'Storage is full. Sell inventory or buy more warehouse space.',
              type: 'warning' as const,
            }].slice(-5),
          }));
          return { harvested: 0, reason: 'storage_full' };
        }

        const toHarvest = Math.min(Math.floor(field.readyToPick), space);
        if (toHarvest === 0) return { harvested: 0, reason: 'not_ready' };

        Sound.harvest();
        const isFirstHarvest = !(state.achievements || []).includes('first_harvest');
        set(s => ({
          fields: s.fields.map(f =>
            f.id === fieldId ? { ...normalizeField(f), readyToPick: Math.max(0, f.readyToPick - toHarvest), readyAge: 0 } : f,
          ),
          inventory: {
            ...s.inventory,
            [field.crop]: (s.inventory[field.crop] || 0) + toHarvest,
          },
          achievements: isFirstHarvest ? [...(s.achievements || []), 'first_harvest'] : (s.achievements || []),
          totalCropsHarvested: (s.totalCropsHarvested || 0) + toHarvest,
          dailyMissions: bumpMissions(s.dailyMissions || [], 'harvest_crops', toHarvest),
          toasts: [
            ...s.toasts,
            { id: uid(), message: `Collected ${toHarvest} ${CROP_CONFIG[field.crop].name.toLowerCase()} into storage.`, type: 'success' as const },
            ...(isFirstHarvest ? [{ id: uid(), message: '🌾 Achievement: First Harvest — Collect your first crop', type: 'achievement' as const }] : []),
          ].slice(-5),
        }));

        return { harvested: toHarvest };
      },

      collectReadyFields: () => {
        const state = get();
        const upgrades = state.upgrades || {};
        const totalCap = state.warehouses.reduce((s, w) => s + WAREHOUSE_CONFIG[w.type].capacity, 0);
        const currentTotal = Object.values(state.inventory).reduce((s, v) => s + (v || 0), 0);
        let remainingSpace = totalCap - currentTotal;

        if (remainingSpace <= 0) {
          set(s => ({
            toasts: [...s.toasts, {
              id: uid(),
              message: 'Storage is full. Sell inventory or buy more warehouse space.',
              type: 'warning' as const,
            }].slice(-5),
          }));
          return { harvested: 0, fieldsCollected: 0, reason: 'storage_full' as const };
        }

        let harvested = 0;
        let fieldsCollected = 0;
        const inventoryDelta: Partial<Record<CropType, number>> = {};

        const fields = state.fields.map(rawField => {
          const field = normalizeField(rawField);
          if (remainingSpace <= 0 || field.readyToPick < 1) return field;

          const toHarvest = Math.min(Math.floor(field.readyToPick), remainingSpace);
          if (toHarvest <= 0) return field;

          harvested += toHarvest;
          fieldsCollected += 1;
          remainingSpace -= toHarvest;
          inventoryDelta[field.crop] = (inventoryDelta[field.crop] || 0) + toHarvest;

          return { ...field, readyToPick: Math.max(0, field.readyToPick - toHarvest), readyAge: 0, condition: Math.min(100, (field.condition || 100) + (upgrades.compost ? 3 : 1)) };
        });

        if (harvested <= 0) return { harvested: 0, fieldsCollected: 0, reason: 'none_ready' as const };

        Sound.harvest();
        const isFirstHarvestBulk = !(get().achievements || []).includes('first_harvest');
        set(s => {
          const inventory = { ...s.inventory };
          for (const [crop, amount] of Object.entries(inventoryDelta)) {
            inventory[crop as CropType] = (inventory[crop as CropType] || 0) + (amount || 0);
          }
          const achGrant = isFirstHarvestBulk && !(s.achievements || []).includes('first_harvest');
          return {
            fields,
            inventory,
            achievements: achGrant ? [...(s.achievements || []), 'first_harvest'] : (s.achievements || []),
            totalCropsHarvested: (s.totalCropsHarvested || 0) + harvested,
            dailyMissions: bumpMissions(s.dailyMissions || [], 'harvest_crops', harvested),
            toasts: [
              ...s.toasts,
              { id: uid(), message: `Collected ${harvested} crops from ${fieldsCollected} field${fieldsCollected === 1 ? '' : 's'}.`, type: 'success' as const },
              ...(achGrant ? [{ id: uid(), message: '🌾 Achievement: First Harvest — Collect your first crop', type: 'achievement' as const }] : []),
            ].slice(-5),
          };
        });

        return { harvested, fieldsCollected };
      },

      tendField: (fieldId) => {
        const state = get();
        const rawField = state.fields.find(f => f.id === fieldId);
        if (!rawField) return false;
        const nf = normalizeField(rawField);
        if ((nf.condition ?? 100) >= 80 && !nf.issue) return false;
        const cost = 25;
        if (state.money < cost) return false;
        set(s => ({
          money: s.money - cost,
          fields: s.fields.map(f => {
            if (f.id !== fieldId) return f;
            const field = normalizeField(f);
            return { ...field, condition: Math.min(100, (field.condition || 100) + (s.upgrades?.compost ? 30 : 18)) };
          }),
          toasts: [...s.toasts, { id: uid(), message: 'Field tended. Condition improved.', type: 'success' as const }].slice(-5),
        }));
        return true;
      },

      fixFieldIssue: (fieldId) => {
        const state = get();
        const field = state.fields.find(f => f.id === fieldId);
        if (!field || !field.issue) return false;
        const cost = field.issue === 'brokenHarvester' && !state.upgrades?.mechanic ? 180 : 90;
        if (state.money < cost) return false;
        set(s => ({
          money: s.money - cost,
          fields: s.fields.map(f => f.id === fieldId ? { ...normalizeField(f), issue: null, condition: Math.min(100, (f.condition ?? 100) + 12) } : f),
          toasts: [...s.toasts, { id: uid(), message: `${issueLabel(field.issue!)} fixed.`, type: 'success' as const }].slice(-5),
        }));
        return true;
      },

      setCropOnField: (fieldId, crop) => {
        set(s => ({
          fields: s.fields.map(f =>
            f.id === fieldId ? { ...normalizeField(f), crop, growthProgress: 0, readyToPick: 0, readyAge: 0 } : f,
          ),
        }));
      },

      assignHarvester: (harvesterId, fieldId) => {
        set(s => {
          const fields = s.fields.map(f => ({
            ...f,
            harvesterId: f.harvesterId === harvesterId ? null : f.harvesterId,
          }));
          const finalFields = fieldId
            ? fields.map(f => f.id === fieldId ? { ...f, harvesterId } : f)
            : fields;
          const harvesters = s.harvesters.map(h =>
            h.id === harvesterId ? { ...h, fieldId } : h,
          );
          return { fields: finalFields, harvesters };
        });
      },

      sellInventory: () => {
        const state = get();
        const pm = getPrestigeMultiplier(state.prestigeLevel);
        const premBonus = state.upgrades?.premiumContracts ? 1.25 : 1;
        const surgeBonus = (state.activeEvents || []).some(e => e.type === 'market_surge') ? 2.0 : 1.0;
        let earned = 0;
        for (const [crop, amt] of Object.entries(state.inventory)) {
          earned += (amt || 0) * CROP_CONFIG[crop as CropType].baseValue * pm * premBonus * surgeBonus;
        }
        if (earned <= 0) return;
        const rounded = Math.floor(earned);
        Sound.cash();
        set(s => ({
          inventory: {},
          money: s.money + rounded,
          totalEarned: s.totalEarned + rounded,
          dailyMissions: bumpMissions(bumpMissions(s.dailyMissions || [], 'sell_inventory', 1), 'earn_money', rounded),
          toasts: [...s.toasts, { id: uid(), message: `Cashed out — ${formatMoney(rounded)} in your pocket.`, type: 'success' as const }].slice(-5),
        }));
      },

      completeMarketOrder: (orderId) => {
        const state = get();
        const orders = state.marketOrders?.length ? state.marketOrders : generateMarketOrders(state.unlockedCrops, state.prestigeLevel);
        const order = orders.find(o => o.id === orderId);
        if (!order) return false;

        const canFulfill = Object.entries(order.requirements).every(([crop, amount]) =>
          (state.inventory[crop as CropType] || 0) >= (amount || 0),
        );
        if (!canFulfill) {
          state.addToast('Not enough inventory to fill that order.', 'warning');
          return false;
        }

        const inventory = { ...state.inventory };
        for (const [crop, amount] of Object.entries(order.requirements)) {
          inventory[crop as CropType] = Math.max(0, (inventory[crop as CropType] || 0) - (amount || 0));
        }

        Sound.cash();
        set(s => ({
          inventory,
          money: s.money + order.rewardMoney,
          gems: (s.gems ?? 0) + order.rewardGems,
          totalEarned: s.totalEarned + order.rewardMoney,
          marketOrdersCompleted: (s.marketOrdersCompleted || 0) + 1,
          dailyMissions: bumpMissions(bumpMissions(s.dailyMissions || [], 'complete_orders', 1), 'earn_money', order.rewardMoney),
          marketOrders: orders.map(o => o.id === orderId ? generateMarketOrders(s.unlockedCrops, s.prestigeLevel)[0] : o),
          toasts: [...s.toasts, {
            id: uid(),
            message: `${order.customer} is happy! +${formatMoney(order.rewardMoney)}${order.rewardGems ? ` +${order.rewardGems} gems` : ''}`,
            type: 'success' as const,
          }].slice(-5),
        }));
        return true;
      },

      rerollMarketOrders: () => {
        const state = get();
        const gemCost = 3;
        const cashCost = 750;
        if ((state.gems ?? 0) >= gemCost) {
          set(s => ({
            gems: (s.gems ?? 0) - gemCost,
            marketOrders: generateMarketOrders(s.unlockedCrops, s.prestigeLevel),
            toasts: [...s.toasts, { id: uid(), message: 'Order board refreshed.', type: 'success' as const }].slice(-5),
          }));
          return true;
        }
        if (state.money >= cashCost) {
          set(s => ({
            money: s.money - cashCost,
            marketOrders: generateMarketOrders(s.unlockedCrops, s.prestigeLevel),
            toasts: [...s.toasts, { id: uid(), message: 'Order board refreshed for cash.', type: 'success' as const }].slice(-5),
          }));
          return true;
        }
        state.addToast('Need 3 gems or $750 to refresh orders.', 'warning');
        return false;
      },

      rushTruckWithGems: (truckId) => {
        const state = get();
        const truck = state.trucks.find(t => t.id === truckId);
        if (!truck || truck.status === 'idle') return false;
        if ((state.gems ?? 0) < 3) {
          state.addToast('Need 3 gems to rush that truck.', 'warning');
          return false;
        }
        set(s => ({
          gems: (s.gems ?? 0) - 3,
          trucks: s.trucks.map(t => t.id === truckId ? { ...t, deliveryProgress: 0.98 } : t),
          toasts: [...s.toasts, { id: uid(), message: 'Truck rushed. Delivery finishing now.', type: 'success' as const }].slice(-5),
        }));
        return true;
      },

      buyField: (type) => {
        const cfg = FIELD_CONFIG[type];
        const state = get();
        if (type === 'starter') return false;
        if (state.fields.length >= MAX_FIELDS) {
          state.addToast('All field slots are full. Prestige will open the next expansion path.', 'warning');
          return false;
        }
        if (state.money < cfg.price || cfg.prestigeRequired > state.prestigeLevel) return false;
        const newField: Field = {
          id: uid(), type, crop: 'tomato',
          growthProgress: 0, readyToPick: 0, harvesterId: null,
        };
        set(s => ({
          money: s.money - cfg.price,
          fields: [...s.fields, newField],
          dailyMissions: bumpMissions(s.dailyMissions || [], 'buy_anything', 1),
        }));
        return true;
      },

      buyHarvester: (type) => {
        const cfg = HARVESTER_CONFIG[type];
        const state = get();
        if (state.money < cfg.price || cfg.prestigeRequired > state.prestigeLevel) return false;
        const openField = state.fields.find(field => !field.harvesterId);
        const newH: Harvester = { id: uid(), type, fieldId: openField?.id ?? null };
        set(s => ({
          money: s.money - cfg.price,
          harvesters: [...s.harvesters, newH],
          fields: openField
            ? s.fields.map(field => field.id === openField.id ? { ...field, harvesterId: newH.id } : field)
            : s.fields,
          dailyMissions: bumpMissions(s.dailyMissions || [], 'buy_anything', 1),
        }));
        return true;
      },

      buyWarehouse: (type) => {
        const cfg = WAREHOUSE_CONFIG[type];
        const state = get();
        if (state.money < cfg.price || cfg.prestigeRequired > state.prestigeLevel) return false;
        const newW: Warehouse = { id: uid(), type };
        set(s => ({
          money: s.money - cfg.price,
          warehouses: [...s.warehouses, newW],
          dailyMissions: bumpMissions(s.dailyMissions || [], 'buy_anything', 1),
        }));
        return true;
      },

      buyTruck: (type) => {
        const cfg = TRUCK_CONFIG[type];
        const state = get();
        if (state.money < cfg.price || cfg.prestigeRequired > state.prestigeLevel) return false;
        const newT: Truck = {
          id: uid(), type, status: 'idle',
          cargo: 0, cargoTypes: {}, deliveryProgress: 0,
        };
        set(s => ({
          money: s.money - cfg.price,
          trucks: [...s.trucks, newT],
          dailyMissions: bumpMissions(s.dailyMissions || [], 'buy_anything', 1),
        }));
        return true;
      },

      buyUpgrade: (type) => {
        const cfg = UPGRADE_CONFIG[type];
        const state = get();
        if (state.upgrades?.[type]) return false;
        if (state.money < cfg.price || cfg.prestigeRequired > state.prestigeLevel) return false;
        set(s => ({
          money: s.money - cfg.price,
          upgrades: { ...(s.upgrades || {}), [type]: true },
          dailyMissions: bumpMissions(s.dailyMissions || [], 'buy_anything', 1),
          toasts: [...s.toasts, { id: uid(), message: `${cfg.name} installed.`, type: 'success' as const }].slice(-5),
        }));
        return true;
      },

      unlockCrop: (crop) => {
        const cfg = CROP_CONFIG[crop];
        const state = get();
        if (state.money < cfg.unlockCost || cfg.prestigeRequired > state.prestigeLevel) return false;
        if (state.unlockedCrops.includes(crop)) return false;
        set(s => ({
          money: s.money - cfg.unlockCost,
          unlockedCrops: [...s.unlockedCrops, crop],
          marketOrders: generateMarketOrders([...s.unlockedCrops, crop], s.prestigeLevel),
        }));
        return true;
      },

      simulateIAP: (itemId) => {
        const item = IAP_ITEMS.find(i => i.id === itemId);
        if (!item) return;
        const isFirst = !get().hasFirstPurchase;
        const mult = isFirst ? 2 : 1;
        if (itemId === 'starter_pack') {
          set(s => ({ money: s.money + 5000 * mult, gems: (s.gems ?? 0) + 20 * mult }));
          get().buyField('small');
          get().buyHarvester('basic');
        } else if (itemId === 'growth_pack') {
          set(s => ({
            money: s.money + 25000 * mult,
            gems: (s.gems ?? 0) + 55 * mult,
            unlockedCrops: s.unlockedCrops.includes('strawberry')
              ? s.unlockedCrops
              : [...s.unlockedCrops, 'strawberry'],
          }));
          get().buyWarehouse('small');
        } else if (itemId === 'business_pack') {
          set(s => ({ money: s.money + 100000 * mult, gems: (s.gems ?? 0) + 140 * mult }));
          get().buyWarehouse('distribution');
          get().buyTruck('box');
        } else if (itemId === 'tycoon_pack') {
          set(s => ({
            money: s.money + 1000000 * mult,
            gems: (s.gems ?? 0) + 400 * mult,
            totalEarned: s.totalEarned + 1000000 * mult,
            prestigeLevel: Math.max(s.prestigeLevel, 1),
            unlockedCrops: ['tomato', 'lettuce', 'strawberry', 'corn'],
          }));
        }
        Sound.cash();
        celebrate(isFirst ? 'large' : 'medium');
        set(s => ({
          hasFirstPurchase: true,
          toasts: [...s.toasts,
            { id: uid(), message: `${item.name} unlocked!${isFirst ? ' 🎁 First-purchase 2× bonus applied!' : ''}`, type: 'success' as const },
          ].slice(-5),
        }));
      },

      prestige: () => {
        const state = get();
        const nextLevel = state.prestigeLevel + 1;
        const cfg = PRESTIGE_CONFIG[nextLevel - 1];
        if (!cfg || state.totalEarned < cfg.requirement) return;
        Sound.fanfare();
        celebrate('large');

        const newUnlocked: CropType[] = ['tomato', 'lettuce', 'strawberry', 'corn'];
        if (nextLevel >= 1) newUnlocked.push('blueberry');
        if (nextLevel >= 2) newUnlocked.push('truffle');

        // Preserve meta-progression: achievements, missions, streak, first purchase
        const preserve = {
          achievements: state.achievements,
          dailyMissions: state.dailyMissions,
          missionsDate: state.missionsDate,
          loginStreak: state.loginStreak,
          lastLoginDate: state.lastLoginDate,
          hasFirstPurchase: state.hasFirstPurchase,
          hasSeenTutorial: state.hasSeenTutorial,
          totalCropsHarvested: state.totalCropsHarvested,
          totalDeliveriesCompleted: state.totalDeliveriesCompleted,
        };

        set({
          ...INITIAL_STATE,
          ...preserve,
          prestigeLevel: nextLevel,
          unlockedCrops: newUnlocked,
          marketOrders: generateMarketOrders(newUnlocked, nextLevel),
          upgrades: {},
          fieldCarts: [],
          toasts: [{
            id: uid(),
            message: `${cfg.emoji} ${cfg.name}! ${cfg.multiplier}x income unlocked!`,
            type: 'success',
          }],
        });
      },

      dismissToast: (id) => {
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
      },

      addToast: (message, type = 'info') => {
        if (type === 'warning') Sound.warn();
        set(s => ({
          toasts: [...s.toasts, { id: uid(), message, type }].slice(-5),
        }));
      },

      checkDailyBonus: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        if (state.lastLoginDate === today) return;
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
        const streak = state.lastLoginDate === yesterday ? (state.loginStreak || 0) + 1 : 1;
        const bonusGems = Math.min(5 + streak * 2, 20);
        const bonusMoney = Math.min(200 + streak * 300, 5000);

        // Celebrate milestone streaks
        const isMilestone = streak === 3 || streak === 7 || streak === 14 || streak % 30 === 0;
        if (isMilestone) {
          setTimeout(() => { Sound.achievement(); celebrate('medium'); }, 200);
        } else {
          setTimeout(() => Sound.cash(), 200);
        }

        const flavor = streak === 1
          ? 'Welcome back, farmer!'
          : streak === 7
            ? 'A full week — the chickens know you by name now.'
            : streak === 30
              ? 'A whole month! The town held a parade in your honor.'
              : `${streak} days strong — the harvest welcomes you.`;

        set(s => ({
          lastLoginDate: today,
          loginStreak: streak,
          gems: (s.gems ?? 0) + bonusGems,
          money: s.money + bonusMoney,
          toasts: [...s.toasts, {
            id: uid(),
            message: `📅 ${flavor} +${bonusGems} gems & ${formatMoney(bonusMoney)}`,
            type: 'success' as const,
          }].slice(-5),
        }));
      },

      applyOfflineProgress: () => {
        const state = get();
        if (!state.lastSavedTime) {
          set({ lastSavedTime: Date.now() });
          return;
        }
        const now = Date.now();
        const elapsedSec = Math.max(0, (now - state.lastSavedTime) / 1000);
        // Cap at 8 hours
        const cappedSec = Math.min(elapsedSec, 8 * 3600);
        if (cappedSec < 60) {
          // Less than a minute, ignore
          set({ lastSavedTime: now });
          return;
        }

        // Compute approximate offline earnings: trucks deliver at a rate based on capacity * delivery time
        const pm = getPrestigeMultiplier(state.prestigeLevel);
        const speedMult = state.upgrades?.fasterTrucks ? 1.3 : 1;
        const marketBonus = state.upgrades?.marketStand ? 1.1 : 1;

        // Average crop value across unlocked crops
        const avgCropValue = state.unlockedCrops.length > 0
          ? state.unlockedCrops.reduce((s, c) => s + CROP_CONFIG[c].baseValue, 0) / state.unlockedCrops.length
          : 5;

        // Estimate income: each truck completes capacity * valueMultiplier per (deliveryTime/speedMult) seconds
        // BUT throttled by how fast harvesters can supply crops to inventory
        const truckIncomePerSec = state.trucks.reduce((sum, t) => {
          const tc = TRUCK_CONFIG[t.type];
          const tripTime = tc.deliveryTime / speedMult;
          // Income per delivery
          return sum + (tc.capacity * avgCropValue * tc.valueMultiplier * pm * marketBonus) / tripTime;
        }, 0);

        const harvesterRatePerSec = state.harvesters.reduce((sum, h) => sum + HARVESTER_CONFIG[h.type].harvestRate, 0);
        const supplyIncomePerSec = harvesterRatePerSec * avgCropValue * pm;

        // Idle income capped at the bottleneck, then halved (offline is less efficient)
        const idleRate = Math.min(truckIncomePerSec, supplyIncomePerSec) * 0.5;
        const moneyEarned = Math.floor(idleRate * cappedSec);
        const cropsGrown = Math.floor(harvesterRatePerSec * cappedSec * 0.5);

        set(s => ({
          money: s.money + moneyEarned,
          totalEarned: s.totalEarned + moneyEarned,
          lastSavedTime: now,
          offlineReport: moneyEarned > 0 || cropsGrown > 0
            ? { seconds: cappedSec, moneyEarned, cropsGrown }
            : null,
        }));
      },

      clearOfflineReport: () => {
        set({ offlineReport: null });
      },

      refreshDailyMissions: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        if (state.missionsDate === today && state.dailyMissions?.length === 3) return;
        set({
          dailyMissions: generateDailyMissions(),
          missionsDate: today,
        });
      },

      claimMissionReward: (missionId) => {
        const state = get();
        const mission = (state.dailyMissions || []).find(m => m.id === missionId);
        if (!mission) return false;
        if (mission.claimed) return false;
        if (mission.progress < mission.target) return false;

        Sound.achievement();
        celebrate('medium');
        set(s => ({
          gems: (s.gems ?? 0) + mission.rewardGems,
          money: s.money + mission.rewardMoney,
          dailyMissions: (s.dailyMissions || []).map(m =>
            m.id === missionId ? { ...m, claimed: true } : m,
          ),
          toasts: [...s.toasts, {
            id: uid(),
            message: `${mission.emoji} Mission claimed! +${mission.rewardGems} gems & ${formatMoney(mission.rewardMoney)}`,
            type: 'success' as const,
          }].slice(-5),
        }));
        return true;
      },

      completeTutorial: () => {
        set({ hasSeenTutorial: true });
      },
    }),
    {
      name: 'harvest-empire-v1',
      partialize: (s) => ({
        money: s.money,
        gems: s.gems,
        totalEarned: s.totalEarned,
        prestigeLevel: s.prestigeLevel,
        fields: s.fields,
        harvesters: s.harvesters,
        warehouses: s.warehouses,
        trucks: s.trucks,
        inventory: s.inventory,
        unlockedCrops: s.unlockedCrops,
        upgrades: s.upgrades,
        fieldCarts: s.fieldCarts,
        marketOrders: s.marketOrders,
        achievements: s.achievements,
        loginStreak: s.loginStreak,
        lastLoginDate: s.lastLoginDate,
        marketOrdersCompleted: s.marketOrdersCompleted,
        lastSavedTime: s.lastSavedTime,
        dailyMissions: s.dailyMissions,
        missionsDate: s.missionsDate,
        hasFirstPurchase: s.hasFirstPurchase,
        hasSeenTutorial: s.hasSeenTutorial,
        totalCropsHarvested: s.totalCropsHarvested,
        totalDeliveriesCompleted: s.totalDeliveriesCompleted,
      }),
    },
  ),
);
