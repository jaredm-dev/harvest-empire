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
    emoji: '🎁',
    description: 'Skip the slow start — $5K, 20 gems, a Small Field, and a Basic Harvester.',
  },
  {
    id: 'growth_pack',
    name: 'Growth Pack',
    price: '$4.99',
    emoji: '🌱',
    description: '$25K, 55 gems, Strawberries unlocked, and a Small Warehouse.',
  },
  {
    id: 'business_pack',
    name: 'Business Pack',
    price: '$9.99',
    emoji: '💼',
    description: '$100K, 140 gems, Distribution Center, and a Box Truck.',
  },
  {
    id: 'tycoon_pack',
    name: 'Tycoon Pack',
    price: '$19.99',
    emoji: '👑',
    description: '$1M, 400 gems, every crop unlocked, and a free Prestige 1 boost.',
  },
];

export const ACHIEVEMENT_CONFIG: Record<string, { name: string; description: string; emoji: string }> = {
  first_harvest:    { name: 'First Harvest',         description: 'You picked your very first crop',        emoji: '🌾' },
  first_delivery:   { name: 'On the Road',           description: 'Your first truck made it to market',     emoji: '🚛' },
  millionaire:      { name: 'Millionaire',           description: 'A million dollars. Not bad, farmer.',    emoji: '💰' },
  ten_million:      { name: 'Local Tycoon',          description: 'Ten million — the town talks about you', emoji: '💎' },
  hundred_million:  { name: 'Global Empire',         description: 'A hundred million. You ARE the market.', emoji: '🌍' },
  fleet_of_3:       { name: 'Three-Truck Convoy',    description: 'Three trucks rolling at once',           emoji: '🚚' },
  full_farm:        { name: 'Every Plot Planted',    description: 'All 9 field slots in use',               emoji: '🌻' },
  market_master:    { name: 'Customer Favourite',    description: '10 market orders filled to perfection',  emoji: '📦' },
  crop_variety:     { name: 'The Variety Pack',      description: 'Four crops on your roster',              emoji: '🥗' },
  truffle_hunter:   { name: 'Truffle Whisperer',     description: 'Truffles are temperamental — you got there', emoji: '🍄' },
  first_prestige:   { name: 'Regional Legend',       description: 'First prestige unlocked',                emoji: '⭐' },
  max_prestige:     { name: 'Empire Crowned',        description: 'You hit max prestige. Take a bow.',      emoji: '👑' },
  upgrade_master:   { name: 'Mr. Reinvest',          description: 'Five system upgrades installed',         emoji: '🔧' },
  storage_king:     { name: 'Warehouse Baron',       description: 'Three warehouses under one name',        emoji: '🏭' },
  week_streak:      { name: 'Reliable as Sunrise',   description: 'A 7-day login streak',                   emoji: '📅' },
};

export const EVENT_CONFIG: Record<EventType, { name: string; description: string; emoji: string; duration: number }> = {
  market_surge:   { name: 'Market Surge',     description: 'Buyers are bidding wild — sales pay 2×',      emoji: '📈', duration: 90 },
  bumper_crop:    { name: 'Sunshine Stretch', description: 'A perfect spell — crops grow 2× faster',      emoji: '☀️', duration: 60 },
  delivery_bonus: { name: 'Shipping Boom',    description: 'Deliveries pay +60% — trucks, roll out!',     emoji: '📦', duration: 75 },
  drought:        { name: 'Drought',          description: 'Soil is parched — growth slows by 45%',       emoji: '🌵', duration: 55 },
};

export const getPrestigeMultiplier = (level: number) => {
  if (level === 0) return 1;
  return PRESTIGE_CONFIG[Math.min(level - 1, PRESTIGE_CONFIG.length - 1)].multiplier;
};

// Daily mission templates — system picks 3 per day
import type { MissionType } from './types';
export const MISSION_POOL: Array<{
  type: MissionType;
  target: number;
  rewardGems: number;
  rewardMoney: number;
  description: string;
  emoji: string;
}> = [
  { type: 'harvest_crops',   target: 50,  rewardGems: 5,  rewardMoney: 500,    description: 'Pick 50 crops by hand or harvester', emoji: '🌾' },
  { type: 'harvest_crops',   target: 200, rewardGems: 10, rewardMoney: 2000,   description: 'Pull in a 200-crop bounty',          emoji: '🌾' },
  { type: 'sell_inventory',  target: 3,   rewardGems: 5,  rewardMoney: 500,    description: 'Make 3 quick warehouse sales',       emoji: '💵' },
  { type: 'complete_orders', target: 3,   rewardGems: 8,  rewardMoney: 1500,   description: 'Make 3 customers happy',             emoji: '📦' },
  { type: 'complete_orders', target: 8,   rewardGems: 15, rewardMoney: 5000,   description: 'Fill 8 market orders today',         emoji: '📦' },
  { type: 'earn_money',      target: 10000,  rewardGems: 8,  rewardMoney: 1000,description: 'Bring in $10K in earnings',          emoji: '💰' },
  { type: 'earn_money',      target: 100000, rewardGems: 15, rewardMoney: 5000,description: 'Hit a $100K day',                    emoji: '💰' },
  { type: 'buy_anything',    target: 3,   rewardGems: 5,  rewardMoney: 500,    description: 'Reinvest — buy 3 shop items',        emoji: '🛒' },
  { type: 'use_truck',       target: 5,   rewardGems: 5,  rewardMoney: 1000,   description: 'Send 5 trucks to market',            emoji: '🚛' },
  { type: 'use_truck',       target: 15,  rewardGems: 12, rewardMoney: 4000,   description: '15 deliveries — keep them rolling',  emoji: '🚛' },
];
