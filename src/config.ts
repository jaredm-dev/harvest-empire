import type { CropType, FieldType, HarvesterType, WarehouseType, TruckType, UpgradeType, EventType } from './types';

export const MAX_FIELDS = 9;

export const CROP_CONFIG: Record<CropType, {
  name: string; emoji: string; growTime: number;
  baseValue: number; unlockCost: number; prestigeRequired: number;
}> = {
  tomato:     { name: 'Tomatoes',     emoji: 'Tomato', growTime: 22,  baseValue: 5,   unlockCost: 0,      prestigeRequired: 0 },
  lettuce:    { name: 'Lettuce',      emoji: 'Leaf',   growTime: 16,  baseValue: 4,   unlockCost: 250,    prestigeRequired: 0 },
  strawberry: { name: 'Strawberries', emoji: 'Berry',  growTime: 45,  baseValue: 14,  unlockCost: 1200,   prestigeRequired: 0 },
  corn:       { name: 'Corn',         emoji: 'Corn',   growTime: 65,  baseValue: 22,  unlockCost: 5000,   prestigeRequired: 0 },
  blueberry:  { name: 'Blueberries',  emoji: 'Blue',   growTime: 90,  baseValue: 38,  unlockCost: 0,      prestigeRequired: 1 },
  truffle:    { name: 'Truffles',     emoji: 'Rare',   growTime: 180, baseValue: 95,  unlockCost: 0,      prestigeRequired: 2 },
};

export const FIELD_CONFIG: Record<FieldType, {
  name: string; emoji: string; capacity: number;
  yieldMultiplier: number; price: number; prestigeRequired: number;
}> = {
  starter:    { name: 'Starter Plot',     emoji: 'Plot',  capacity: 22,   yieldMultiplier: 6,   price: 0,      prestigeRequired: 0 },
  small:      { name: 'Small Field',      emoji: 'Field', capacity: 80,   yieldMultiplier: 16,  price: 600,    prestigeRequired: 0 },
  medium:     { name: 'Medium Field',     emoji: 'Farm',  capacity: 180,  yieldMultiplier: 35,  price: 3800,   prestigeRequired: 0 },
  large:      { name: 'Large Field',      emoji: 'Acres', capacity: 450,  yieldMultiplier: 90,  price: 18000,  prestigeRequired: 0 },
  industrial: { name: 'Industrial Farm',  emoji: 'Plant', capacity: 1500, yieldMultiplier: 280, price: 65000,  prestigeRequired: 1 },
};

export const HARVESTER_CONFIG: Record<HarvesterType, {
  name: string; emoji: string; harvestRate: number; price: number; prestigeRequired: number;
}> = {
  basic:      { name: 'Basic Harvester',      emoji: 'Tractor', harvestRate: 0.4,  price: 700,    prestigeRequired: 0 },
  advanced:   { name: 'Advanced Harvester',   emoji: 'Gear',    harvestRate: 1.8,  price: 6000,   prestigeRequired: 0 },
  industrial: { name: 'Industrial Harvester', emoji: 'Rig',     harvestRate: 7,    price: 28000,  prestigeRequired: 0 },
  mega:       { name: 'Mega Harvester',       emoji: 'Bot',     harvestRate: 28,   price: 110000, prestigeRequired: 1 },
};

export const WAREHOUSE_CONFIG: Record<WarehouseType, {
  name: string; emoji: string; capacity: number; price: number; prestigeRequired: number;
}> = {
  stand:        { name: 'Roadside Stand',       emoji: 'Crate', capacity: 40,    price: 0,      prestigeRequired: 0 },
  small:        { name: 'Small Warehouse',      emoji: 'Store', capacity: 200,   price: 2000,   prestigeRequired: 0 },
  distribution: { name: 'Distribution Center',  emoji: 'Depot', capacity: 900,   price: 14000,  prestigeRequired: 0 },
  mega:         { name: 'Mega Warehouse',       emoji: 'Hub',   capacity: 5000,  price: 75000,  prestigeRequired: 1 },
};

export const TRUCK_CONFIG: Record<TruckType, {
  name: string; emoji: string; capacity: number;
  deliveryTime: number; valueMultiplier: number; price: number; prestigeRequired: number;
}> = {
  pickup: { name: 'Pickup Truck', emoji: 'Pickup', capacity: 25,  deliveryTime: 80, valueMultiplier: 1.4, price: 950,    prestigeRequired: 0 },
  van:    { name: 'Delivery Van', emoji: 'Van',    capacity: 70,  deliveryTime: 60, valueMultiplier: 1.55, price: 5500,  prestigeRequired: 0 },
  box:    { name: 'Box Truck',    emoji: 'Box',    capacity: 180, deliveryTime: 45, valueMultiplier: 1.7, price: 18000,  prestigeRequired: 0 },
  semi:   { name: 'Semi-Truck',   emoji: 'Semi',   capacity: 500, deliveryTime: 30, valueMultiplier: 1.85, price: 70000, prestigeRequired: 1 },
};

export const UPGRADE_CONFIG: Record<UpgradeType, {
  name: string; emoji: string; price: number; prestigeRequired: number; description: string;
}> = {
  irrigation:       { name: 'Irrigation Lines',    emoji: '💧', price: 3500,   prestigeRequired: 0, description: '+20% growth speed on all fields — dry issues much less likely' },
  compost:          { name: 'Compost Program',     emoji: '🌿', price: 6000,   prestigeRequired: 0, description: 'Field condition recovers 2.5× faster — less tending needed' },
  scarecrow:        { name: 'Scarecrow Network',   emoji: '🪹', price: 11000,  prestigeRequired: 0, description: 'Pest and weed events cut to ~25% frequency' },
  coldStorage:      { name: 'Cold Storage Units',  emoji: '🧊', price: 20000,  prestigeRequired: 0, description: 'Ready crops take twice as long to spoil — never rush again' },
  mechanic:         { name: 'Repair Shed',         emoji: '🔧', price: 45000,  prestigeRequired: 1, description: 'Harvester breakdowns are rare — and cost half to fix' },
  fasterTrucks:     { name: 'Speed Tires',         emoji: '🛞', price: 14000,  prestigeRequired: 0, description: 'All trucks travel 30% faster — delivery cycle completes sooner' },
  premiumContracts: { name: 'Premium Contracts',   emoji: '📋', price: 9500,   prestigeRequired: 0, description: '+25% cash when you manually sell inventory' },
  autoTend:         { name: 'Farmhand Crew',       emoji: '👨‍🌾', price: 55000,  prestigeRequired: 1, description: 'Automatically fixes dry/pest/weed issues — no downtime on fields' },
  extraYield:       { name: 'Premium Seeds',       emoji: '🌾', price: 7500,   prestigeRequired: 0, description: '+15% crops per harvest cycle — every field grows more' },
  marketStand:      { name: 'Premium Market Stall',emoji: '🏪', price: 22000,  prestigeRequired: 0, description: 'Trucks deliver at 10% higher value multiplier on every run' },
};

export const PRESTIGE_CONFIG = [
  {
    level: 1,
    name: 'Expand Regionally',
    emoji: 'Star',
    requirement: 500000,
    multiplier: 1.5,
    description: '1.5x all income - Unlock Blueberries, Industrial Harvester, Semi-Truck',
  },
  {
    level: 2,
    name: 'Go National',
    emoji: 'Star',
    requirement: 5000000,
    multiplier: 2.5,
    description: '2.5x all income - Unlock Truffles, Mega Harvester, Mega Warehouse',
  },
  {
    level: 3,
    name: 'Global Empire',
    emoji: 'Globe',
    requirement: 50000000,
    multiplier: 4.0,
    description: '4x all income - Maximum prestige achieved!',
  },
];

export const IAP_ITEMS = [
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    price: '$1.99',
    emoji: 'Gift',
    description: '+$5,000 - 20 gems - Small Field - Basic Harvester',
  },
  {
    id: 'growth_pack',
    name: 'Growth Pack',
    price: '$4.99',
    emoji: 'Growth',
    description: '+$25,000 - 55 gems - Strawberries unlocked - Small Warehouse',
  },
  {
    id: 'business_pack',
    name: 'Business Pack',
    price: '$9.99',
    emoji: 'Briefcase',
    description: '+$100,000 - 140 gems - Distribution Center - Box Truck',
  },
  {
    id: 'tycoon_pack',
    name: 'Tycoon Pack',
    price: '$19.99',
    emoji: 'Crown',
    description: '+$1,000,000 - 400 gems - All crops unlocked - Prestige 1 boost',
  },
];

export const ACHIEVEMENT_CONFIG: Record<string, { name: string; description: string; emoji: string }> = {
  first_harvest:    { name: 'First Harvest',      description: 'Collect your first crop',          emoji: '🌾' },
  first_delivery:   { name: 'On the Road',         description: 'Complete your first delivery',     emoji: '🚛' },
  millionaire:      { name: 'Millionaire',          description: 'Earn $1,000,000 total',            emoji: '💰' },
  ten_million:      { name: 'Tycoon',               description: 'Earn $10,000,000 total',           emoji: '💎' },
  hundred_million:  { name: 'Global Empire',        description: 'Earn $100,000,000 total',          emoji: '🌍' },
  fleet_of_3:       { name: 'Small Fleet',          description: 'Own 3 trucks at once',             emoji: '🚚' },
  full_farm:        { name: 'Full Farm',             description: 'Fill all 9 field slots',           emoji: '🌻' },
  market_master:    { name: 'Market Master',         description: 'Complete 10 market orders',        emoji: '📦' },
  crop_variety:     { name: 'Variety Pack',          description: 'Unlock 4 different crops',         emoji: '🥗' },
  truffle_hunter:   { name: 'Truffle Hunter',        description: 'Unlock Truffles',                  emoji: '🍄' },
  first_prestige:   { name: 'Regional Legend',       description: 'Reach Prestige 1',                 emoji: '⭐' },
  max_prestige:     { name: 'Global Legend',         description: 'Reach max Prestige',               emoji: '👑' },
  upgrade_master:   { name: 'Upgrade Master',        description: 'Purchase 5 upgrades',              emoji: '🔧' },
  storage_king:     { name: 'Storage King',          description: 'Own 3 warehouses',                 emoji: '🏭' },
  week_streak:      { name: 'Dedicated Farmer',      description: 'Log in 7 days in a row',           emoji: '📅' },
};

export const EVENT_CONFIG: Record<EventType, { name: string; description: string; emoji: string; duration: number }> = {
  market_surge:   { name: 'Market Surge',     description: 'Manual sell value doubled!',   emoji: '📈', duration: 90 },
  bumper_crop:    { name: 'Perfect Weather',  description: 'Crops grow 2× faster!',        emoji: '☀️', duration: 60 },
  delivery_bonus: { name: 'Shipping Demand',  description: '+60% delivery earnings!',      emoji: '📦', duration: 75 },
  drought:        { name: 'Drought',          description: 'Crops grow 45% slower.',       emoji: '🌵', duration: 55 },
};

export const getPrestigeMultiplier = (level: number) => {
  if (level === 0) return 1;
  return PRESTIGE_CONFIG[Math.min(level - 1, PRESTIGE_CONFIG.length - 1)].multiplier;
};
