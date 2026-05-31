export type CropType = 'tomato' | 'lettuce' | 'strawberry' | 'corn' | 'blueberry' | 'truffle';
export type FieldType = 'starter' | 'small' | 'medium' | 'large' | 'industrial';
export type HarvesterType = 'basic' | 'advanced' | 'industrial' | 'mega';
export type WarehouseType = 'stand' | 'small' | 'distribution' | 'mega';
export type TruckType = 'pickup' | 'van' | 'box' | 'semi';
export type UpgradeType =
  | 'irrigation' | 'compost' | 'scarecrow' | 'coldStorage' | 'mechanic'
  | 'fasterTrucks' | 'premiumContracts' | 'autoTend' | 'extraYield' | 'marketStand'
  | 'harvestManager';
export type FieldIssue = 'dry' | 'pests' | 'weeds' | 'brokenHarvester';
export type EventType = 'market_surge' | 'bumper_crop' | 'delivery_bonus' | 'drought';
export type GemPerkType = 'goldenTouch' | 'fertileSoil' | 'megaStorage';
export type GemConsumableType = 'instantGrow' | 'timeWarp';

export interface Field {
  id: string;
  type: FieldType;
  crop: CropType;
  growthProgress: number;
  readyToPick: number;
  readyAge?: number;
  condition?: number;
  issue?: FieldIssue | null;
  harvesterId: string | null;
  harvestBuffer?: number;
}

export interface Harvester {
  id: string;
  type: HarvesterType;
  fieldId: string | null;
}

export interface Warehouse {
  id: string;
  type: WarehouseType;
}

export interface Truck {
  id: string;
  type: TruckType;
  status: 'idle' | 'delivering' | 'returning';
  cargo: number;
  cargoTypes: Partial<Record<CropType, number>>;
  deliveryProgress: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'achievement';
}

export interface HarvestResult {
  harvested: number;
  reason?: 'missing' | 'not_ready' | 'storage_full';
}

export interface CollectResult {
  harvested: number;
  fieldsCollected: number;
  reason?: 'none_ready' | 'storage_full';
}

export interface FieldCart {
  id: string;
  fieldId: string;
  cropType: CropType;
  cargo: number;
  status: 'hauling' | 'returning';
  progress: number;
}

export interface MarketOrder {
  id: string;
  title: string;
  customer: string;
  requirements: Partial<Record<CropType, number>>;
  rewardMoney: number;
  rewardGems: number;
  expiresIn: number;
  rarity: 'standard' | 'premium' | 'rush';
}

export interface GameEvent {
  id: string;
  type: EventType;
  duration: number;
}

export type MissionType =
  | 'harvest_crops'
  | 'sell_inventory'
  | 'complete_orders'
  | 'earn_money'
  | 'buy_anything'
  | 'use_truck';

export interface DailyMission {
  id: string;
  type: MissionType;
  target: number;
  progress: number;
  rewardGems: number;
  rewardMoney: number;
  claimed: boolean;
  description: string;
  emoji: string;
}

export interface OfflineReport {
  seconds: number;
  moneyEarned: number;
  cropsGrown: number;
}

export interface GameStore {
  money: number;
  gems: number;
  totalEarned: number;
  // Lifetime money earned across ALL prestiges. `totalEarned` resets each
  // prestige (it drives the prestige-progress bar); this one never resets so
  // the Statistics panel can show a true empire-wide total.
  lifetimeEarned: number;
  prestigeLevel: number;
  fields: Field[];
  harvesters: Harvester[];
  warehouses: Warehouse[];
  trucks: Truck[];
  inventory: Partial<Record<CropType, number>>;
  unlockedCrops: CropType[];
  upgrades: Partial<Record<UpgradeType, boolean>>;
  // Permanent gem-shop perks, keyed by perk id → level owned. Persists across
  // prestige (gems are premium currency and should never reset).
  gemPerks: Partial<Record<GemPerkType, number>>;
  toasts: Toast[];
  fieldCarts: FieldCart[];
  marketOrders: MarketOrder[];
  achievements: string[];
  activeEvents: GameEvent[];
  loginStreak: number;
  lastLoginDate: string | null;
  marketOrdersCompleted: number;

  // New: offline progress + daily missions + first purchase + tutorial
  lastSavedTime: number | null;
  dailyMissions: DailyMission[];
  missionsDate: string | null;
  hasFirstPurchase: boolean;
  hasSeenTutorial: boolean;
  offlineReport: OfflineReport | null;

  // Lifetime stats for missions
  totalCropsHarvested: number;
  totalDeliveriesCompleted: number;
  gameStartedAt: number | null;

  tick: (delta: number) => void;
  harvestField: (fieldId: string) => HarvestResult;
  collectReadyFields: () => CollectResult;
  tendField: (fieldId: string) => boolean;
  fixFieldIssue: (fieldId: string) => boolean;
  setCropOnField: (fieldId: string, crop: CropType) => void;
  assignHarvester: (harvesterId: string, fieldId: string | null) => void;
  sellInventory: () => void;
  completeMarketOrder: (orderId: string) => boolean;
  rerollMarketOrders: () => boolean;
  rushTruckWithGems: (truckId: string) => boolean;

  buyField: (type: FieldType) => boolean;
  buyHarvester: (type: HarvesterType) => boolean;
  buyWarehouse: (type: WarehouseType) => boolean;
  buyTruck: (type: TruckType) => boolean;
  buyUpgrade: (type: UpgradeType) => boolean;
  unlockCrop: (crop: CropType) => boolean;

  sellTruck: (truckId: string) => boolean;
  sellHarvester: (harvesterId: string) => boolean;
  sellField: (fieldId: string) => boolean;
  upgradeField: (fieldId: string) => boolean;

  simulateIAP: (itemId: string) => void;
  grantCheat: () => void;
  buyGemPerk: (id: GemPerkType) => boolean;
  useGemConsumable: (id: GemConsumableType) => boolean;
  prestige: () => void;
  dismissToast: (id: string) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  checkDailyBonus: () => void;
  resetGame: () => void;
  applyOfflineProgress: () => void;
  clearOfflineReport: () => void;
  refreshDailyMissions: () => void;
  claimMissionReward: (missionId: string) => boolean;
  completeTutorial: () => void;
}
