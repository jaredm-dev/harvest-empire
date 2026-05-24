/**
 * Isometric 2.5D game world.
 *
 * Coordinate system
 *   iso(col, row) → screen top-vertex of that tile
 *   moving +col:  right-down  (+TW/2, +TH/2)
 *   moving +row:  left-down   (-TW/2, +TH/2)
 *
 * Tile diamond vertices (top vertex = iso(col,row)):
 *   Top:   (ix,    iy)
 *   Right: (ix+TW/2, iy+TH/2)
 *   Bot:   (ix,    iy+TH)
 *   Left:  (ix-TW/2, iy+TH/2)
 *
 * ISO-box building (W×D tiles, wallH pixels tall):
 *   N = iso(col,   row)     ← north vertex (top)
 *   E = iso(col+W, row)     ← east vertex  (right)
 *   S = iso(col+W, row+D)   ← south vertex (bottom — faces viewer)
 *   W = iso(col,   row+D)   ← west vertex  (left)
 *
 *   Roof:      N-H → E-H → S-H → W-H  (raised by wallH)
 *   Left face: W-H → S-H → S   → W
 *   Right face:E-H → S-H → S   → E
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useGameStore } from '../store';
import { CROP_CONFIG, FIELD_CONFIG, WAREHOUSE_CONFIG, HARVESTER_CONFIG } from '../config';
import type { Field, Truck, FieldCart, HarvesterType } from '../types';

// Detected once at module load — never changes during a session
const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth <= 430;

// ── ISO CONSTANTS ──────────────────────────────────────────────────────────────
const TW = 72;   // tile diamond width  (px)
const TH = 36;   // tile diamond height (px) = TW/2
const HW = TW / 2;  // half-width = 36
const HH = TH / 2;  // half-height = 18

// World origin — position of tile (0,0) top-vertex within the SVG canvas
const OX = 700;
const OY = 140;

// SVG canvas size
const SVG_W = 2600;
const SVG_H = 1600;

// World-space focus points for each camera preset (calibrated from the map layout)
const FIELD_ANCHOR = { wx: 705, wy: 477 };
const DEPOT_ANCHOR = { wx: 1339, wy: 843 };

// Returns a pan value that places the given world point at the center of the screen
function panToCenter(anchor: { wx: number; wy: number }) {
  const w = typeof window !== 'undefined' ? window.innerWidth  : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 720;
  return {
    x: Math.round(w / 2 - anchor.wx),
    y: Math.round(h / 2 - anchor.wy),
  };
}

// Field slots (top-left tile of each field plot) — 8-tile spacing for breathing room
const FIELD_SLOTS = [
  { col: 0, row: 0 }, { col: 8, row: 0 }, { col: 16, row: 0 },
  { col: 0, row: 8 }, { col: 8, row: 8 }, { col: 16, row: 8 },
  { col: 0, row: 16 }, { col: 8, row: 16 }, { col: 16, row: 16 },
];

const FIELD_TILE_SIZE: Record<string, number> = {
  starter: 3, small: 4, medium: 5, large: 6, industrial: 8,
};

// Building positions
const WH        = { col: 23, row: 2,  w: 5, d: 3, h: 52, label: 'WAREHOUSE' };
const MKT       = { col: 23, row: 10, w: 4, d: 3, h: 42, label: 'MARKET' };
const HOMESTEAD = { col: 0, row: 3, w: 3, d: 3, h: 40, label: 'HOMESTEAD' };
// Removed BARN_DECO — was purely decorative and stretched the world to the left.

// Road tiles — connects warehouse to market
const ROAD_COL       = 29;
const ROAD_ROW_START = 5;
const ROAD_ROW_END   = 14;
const SERVICE_ROAD_ROWS = [6, 14, 22];
const SERVICE_ROAD_COLS = [6, 14, 22];

// World boundary (perimeter fence). The fence sits at these col/row indices
// and nothing — buildings, fields, roads, animals — should ever be outside.
const PERIM_MIN_COL = -4;
const PERIM_MAX_COL = 32;
const PERIM_MIN_ROW = -2;
const PERIM_MAX_ROW = 24;

// Inverse of iso(): screen-world (x, y) -> (col, row). Used to check whether
// an animal would step past the fence.
const worldToIso = (x: number, y: number) => ({
  col: ((x - 700) / 36 + (y - 140) / 18) / 2,
  row: ((y - 140) / 18 - (x - 700) / 36) / 2,
});

const isInsidePerimeter = (x: number, y: number) => {
  const { col, row } = worldToIso(x, y);
  return col > PERIM_MIN_COL + 0.5
      && col < PERIM_MAX_COL - 0.5
      && row > PERIM_MIN_ROW + 0.5
      && row < PERIM_MAX_ROW - 0.5;
};

// ── ISO MATH ───────────────────────────────────────────────────────────────────
const iso = (col: number, row: number) => ({
  x: OX + (col - row) * HW,
  y: OY + (col + row) * HH,
});
const pts = (arr: { x: number; y: number }[]) =>
  arr.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

// ── FENCE SEGMENT ─────────────────────────────────────────────────────────────
function fenceEdgePts(col: number, row: number, side: 'NE' | 'NW' | 'SE' | 'SW') {
  const { x, y } = iso(col, row);
  if (side === 'NE') return [[x, y + TH], [x + HW, y + HH], [x + HW + 3, y + HH - 2], [x + 3, y + TH - 2]];
  if (side === 'NW') return [[x - HW, y + HH], [x, y + TH], [x + 3, y + TH - 2], [x - HW + 3, y + HH - 2]];
  if (side === 'SE') return [[x, y], [x + HW, y + HH], [x + HW, y + HH + 4], [x, y + 4]];
  /* SW */ return [[x - HW, y + HH], [x, y], [x, y + 4], [x - HW, y + HH + 4]];
}

// ── CROP PLANT POSITIONS WITHIN A TILE ────────────────────────────────────────
function cropPlantPositions(col: number, row: number) {
  const { x: cx, y: ty } = iso(col, row);
  const cy = ty + HH; // centre of tile
  return [
    { x: cx - HW * 0.38, y: cy - HH * 0.45 },
    { x: cx + HW * 0.38, y: cy - HH * 0.45 },
    { x: cx - HW * 0.38, y: cy + HH * 0.15 },
    { x: cx + HW * 0.38, y: cy + HH * 0.15 },
  ];
}

const CROP_STYLE: Record<Field['crop'], {
  stem: string;
  leaf: string;
  fruit: string;
  accent: string;
}> = {
  tomato: { stem: '#2f7d32', leaf: '#3fa34d', fruit: '#ef4444', accent: '#fca5a5' },
  lettuce: { stem: '#65a30d', leaf: '#84cc16', fruit: '#bef264', accent: '#f7fee7' },
  strawberry: { stem: '#2f7d32', leaf: '#16a34a', fruit: '#e11d48', accent: '#fecdd3' },
  corn: { stem: '#4d7c0f', leaf: '#84cc16', fruit: '#facc15', accent: '#fef3c7' },
  blueberry: { stem: '#166534', leaf: '#22c55e', fruit: '#3b82f6', accent: '#bfdbfe' },
  truffle: { stem: '#57534e', leaf: '#78716c', fruit: '#7c2d12', accent: '#d6d3d1' },
};

function CropSprite({ field, col, row, plantIndex }: {
  field: Field;
  col: number;
  row: number;
  plantIndex: number;
}) {
  const ready = field.readyToPick >= 1;
  const g = ready ? 1 : field.growthProgress;
  if (g < 0.16) return null;

  const style = CROP_STYLE[field.crop];
  const p = cropPlantPositions(col, row)[plantIndex];
  const scale = ready ? 1 : g < 0.45 ? 0.46 : g < 0.72 ? 0.72 : 0.9;
  const sway = ((plantIndex % 2) - 0.5) * 4;

  if (field.crop === 'corn') {
    return (
      <g transform={`translate(${p.x},${p.y}) scale(${scale}) rotate(${sway})`}>
        {!IS_MOBILE && <animateTransform attributeName="transform" type="rotate" values="-2;2;-2" dur={`${2.4 + plantIndex * 0.2}s`} repeatCount="indefinite" additive="sum" />}
        <ellipse cx="0" cy="5" rx="9" ry="3" fill="rgba(0,0,0,0.22)" />
        <path d="M0 5 C-2 -4 -1 -15 0 -25 C2 -14 2 -4 0 5Z" fill={style.stem} stroke="#365314" strokeWidth="0.8" />
        <path d="M-1 -8 C-17 -12 -18 -21 -2 -18Z" fill={style.leaf} stroke="#3f6212" strokeWidth="0.7" />
        <path d="M1 -12 C15 -18 18 -25 3 -22Z" fill="#a3e635" stroke="#4d7c0f" strokeWidth="0.7" />
        <ellipse cx="1" cy="-10" rx="4" ry="10" fill={style.fruit} stroke="#ca8a04" strokeWidth="0.8" />
        <path d="M-1 -17 L2 -3 M-3 -12 L4 -12" stroke={style.accent} strokeWidth="0.8" opacity="0.75" />
      </g>
    );
  }

  if (field.crop === 'lettuce') {
    return (
      <g transform={`translate(${p.x},${p.y}) scale(${scale})`}>
        {!IS_MOBILE && <animateTransform attributeName="transform" type="rotate" values="-1.4;1.4;-1.4" dur={`${2.7 + plantIndex * 0.15}s`} repeatCount="indefinite" additive="sum" />}
        <ellipse cx="0" cy="5" rx="9" ry="3" fill="rgba(0,0,0,0.22)" />
        {[[-5, 0, -22], [0, -2, 0], [5, 0, 22], [-2, 2, -8], [3, 2, 10]].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y - 8} rx="5" ry="10" fill={i % 2 ? style.leaf : style.fruit} stroke="#4d7c0f" strokeWidth="0.6" transform={`rotate(${r} ${x} ${y - 8})`} />
        ))}
      </g>
    );
  }

  if (field.crop === 'truffle') {
    return (
      <g transform={`translate(${p.x},${p.y}) scale(${scale})`}>
        {!IS_MOBILE && <animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0" dur={`${3 + plantIndex * 0.2}s`} repeatCount="indefinite" additive="sum" />}
        <ellipse cx="0" cy="5" rx="9" ry="3" fill="rgba(0,0,0,0.22)" />
        <ellipse cx="-3" cy="-4" rx="6" ry="7" fill={style.fruit} stroke="#431407" strokeWidth="0.8" />
        <ellipse cx="4" cy="-2" rx="5" ry="6" fill="#92400e" stroke="#431407" strokeWidth="0.8" />
        <circle cx="-5" cy="-6" r="1" fill={style.accent} opacity="0.65" />
        <circle cx="3" cy="-4" r="0.9" fill={style.accent} opacity="0.55" />
      </g>
    );
  }

  return (
    <g transform={`translate(${p.x},${p.y}) scale(${scale}) rotate(${sway})`}>
      {!IS_MOBILE && <animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur={`${2.2 + plantIndex * 0.18}s`} repeatCount="indefinite" additive="sum" />}
      <ellipse cx="0" cy="5" rx="8" ry="3" fill="rgba(0,0,0,0.2)" />
      <path d="M0 5 C-1 -5 0 -13 1 -20" fill="none" stroke={style.stem} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="-5" cy="-7" rx="4" ry="8" fill={style.leaf} stroke="#166534" strokeWidth="0.6" transform="rotate(-35 -5 -7)" />
      <ellipse cx="6" cy="-12" rx="4" ry="8" fill="#4ade80" stroke="#166534" strokeWidth="0.6" transform="rotate(38 6 -12)" />
      <circle cx="-3" cy="-18" r="4" fill={style.fruit} stroke="#7f1d1d" strokeWidth="0.7" />
      <circle cx="4" cy="-15" r="3.6" fill={style.fruit} stroke="#7f1d1d" strokeWidth="0.7" />
      <circle cx="-4" cy="-19" r="1.1" fill={style.accent} opacity="0.85" />
    </g>
  );
}

function TreeSprite({ x, y, variant = 0 }: { x: number; y: number; variant?: number }) {
  const tint = ['#22c55e', '#65a30d', '#4d7c0f'][variant % 3];
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      <path d="M-18 15 C-8 8 10 8 22 15 C13 22 -8 23 -18 15Z" fill="rgba(20,83,45,0.22)" />
      <path d="M-5 13 C-4 2 -3 -12 0 -21 C4 -10 7 2 8 13Z" fill="#8b5a2b" stroke="#5c3516" strokeWidth="1" />
      <path d="M-3 -16 C-17 -18 -24 -31 -12 -41 C-5 -51 7 -47 8 -37 C22 -42 36 -31 29 -17 C36 -6 19 4 6 -3 C-5 9 -25 3 -21 -11 C-25 -17 -16 -25 -3 -16Z"
        fill="url(#treeCrownGrad)" stroke="#14532d" strokeWidth="1.2" />
      <path d="M-11 -31 C-3 -42 10 -42 20 -31" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="-15" r="13" fill={tint} opacity="0.32" />
      {variant % 2 === 0 && [-12, 1, 14].map((cx, i) => (
        <circle key={i} cx={cx} cy={i === 1 ? -28 : -18} r="2.4" fill="#ef4444" stroke="#991b1b" strokeWidth="0.5" />
      ))}
    </g>
  );
}

function FlowerClump({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      <ellipse cx="0" cy="7" rx="14" ry="5" fill="rgba(0,0,0,0.16)" />
      {[-10, -4, 3, 9].map((dx, i) => (
        <g key={i} transform={`translate(${dx},${i % 2 ? 1 : -2})`}>
          <path d="M0 5 L0 -8" stroke="#166534" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="0" cy="-10" r="4" fill={i % 2 ? '#f97316' : '#facc15'} stroke="#a16207" strokeWidth="0.7" />
          <circle cx="0" cy="-10" r="1.5" fill="#7c2d12" />
        </g>
      ))}
    </g>
  );
}

function HayBale({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      <path d="M-17 13 C-8 7 10 7 18 13 C9 19 -8 20 -17 13Z" fill="rgba(120,53,15,0.24)" />
      <path d="M-16 -6 H10 L17 0 V11 H-16Z" fill="url(#hayGrad)" stroke="#92400e" strokeWidth="1" />
      <path d="M10 -6 L17 0 L17 11 L10 6Z" fill="#ca8a04" stroke="#92400e" strokeWidth="0.8" />
      <path d="M-13 -2 H12 M-13 4 H15 M-7 -6 V11 M4 -6 V9" stroke="#fef3c7" strokeWidth="1" opacity="0.65" />
      <path d="M-16 0 H17" stroke="#78350f" strokeWidth="1" opacity="0.42" />
    </g>
  );
}

function TruckSprite({ x, y, flip, moving, cargo }: {
  x: number;
  y: number;
  flip: boolean;
  moving: boolean;
  cargo: number;
}) {
  // Cartoon farm pickup — blue body, yellow bed-liner cargo, big black wheels.
  const bodyColor   = moving ? '#2563eb' : '#3b82f6';
  const bodyShadow  = moving ? '#1e3a8a' : '#1e40af';
  return (
    <g transform={`translate(${x},${y}) ${flip ? 'scale(-1,1) translate(-44,0)' : ''}`} style={{ pointerEvents: 'none' }}>
      {/* ground shadow */}
      <ellipse cx="22" cy="31" rx="22" ry="3.5" fill="rgba(15,23,42,0.3)" />
      {/* cargo bed (back) */}
      <path d="M2 17 H22 V28 H2 Z" fill="#facc15" stroke="#1f2937" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M2 17 H22" stroke="#fde047" strokeWidth="1" opacity="0.8" />
      {/* cab */}
      <path d="M22 12 H34 Q38 12 38 16 V28 H22 Z" fill={bodyColor} stroke="#1f2937" strokeWidth="1.5" strokeLinejoin="round" />
      {/* cab shadow / undercoat */}
      <path d="M22 22 H38" stroke={bodyShadow} strokeWidth="3" />
      {/* windshield */}
      <path d="M25 14 H34 L36 19 H25 Z" fill="#bfdbfe" stroke="#1f2937" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M26 15 L29 16" stroke="#fff" strokeWidth="1" opacity="0.9" />
      {/* headlight */}
      <circle cx="37" cy="23" r="1.6" fill="#fde047" stroke="#1f2937" strokeWidth="0.7" />
      {/* cargo content lump (if loaded) */}
      {cargo > 0 && (
        <path d="M4 14 Q12 10 20 14 L20 17 H4 Z" fill="#a16207" stroke="#1f2937" strokeWidth="1" />
      )}
      {/* wheels — big black with light hubcap */}
      <circle cx="9" cy="28" r="5.4" fill="#0f172a" stroke="#000" strokeWidth="1" />
      <circle cx="9" cy="28" r="2.6" fill="#cbd5e1" stroke="#475569" strokeWidth="0.7" />
      <circle cx="9" cy="28" r="0.8" fill="#0f172a" />
      <circle cx="31" cy="28" r="5.4" fill="#0f172a" stroke="#000" strokeWidth="1" />
      <circle cx="31" cy="28" r="2.6" fill="#cbd5e1" stroke="#475569" strokeWidth="0.7" />
      <circle cx="31" cy="28" r="0.8" fill="#0f172a" />
      {cargo > 0 && (
        <text x="20" y="6" fontSize="8" textAnchor="middle" fill="#fbbf24" fontWeight="bold" stroke="#111827" strokeWidth="1.5" paintOrder="stroke">
          {Math.floor(cargo)}u
        </text>
      )}
    </g>
  );
}

// ── ANIMAL AI ─────────────────────────────────────────────────────────────────
interface AnimalAI {
  id: string;
  type: 'cow' | 'chicken';
  x: number; y: number;
  tx: number; ty: number;
  flip: boolean;
  moving: boolean;
  idleTimer: number;
}

interface WorldObstacle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const WANDER = { x1: 80, x2: 1200, y1: 150, y2: 920 };
const ASPEED: Record<'cow' | 'chicken', number> = { cow: 18, chicken: 34 };
const ANIMAL_SCALE: Record<'cow' | 'chicken', number> = { cow: 0.86, chicken: 0.82 };
// Trimmed from 37 tiles to 14 — most of the discarded ones extended outside
// the visible playable area or duplicated nearby trees. Fewer SVG nodes per
// frame, much faster on weaker GPUs.
const DECOR_TILES = [
  [-2, 5], [-2, 13],
  [21, 4], [21, 15],
  [4, 4], [13, 4], [4, 13], [13, 13],
  [5, 22], [17, 22],
  [-1, 17], [18, 7],
  [9, -3], [15, -3],
] as const;

const isInObstacle = (x: number, y: number, obstacles: WorldObstacle[]) =>
  obstacles.some(o => x >= o.x1 && x <= o.x2 && y >= o.y1 && y <= o.y2);

// Animals are clamped to (a) the legacy WANDER rect AND (b) the perimeter
// fence diamond. Both must be satisfied, so they can never wander beyond
// the wooden boundary.
const clampAnimal = (a: AnimalAI) => {
  let nx = Math.max(WANDER.x1, Math.min(WANDER.x2, a.x));
  let ny = Math.max(WANDER.y1, Math.min(WANDER.y2, a.y));
  // Walk back toward the world center until we're inside the fence.
  let safety = 8;
  while (!isInsidePerimeter(nx, ny) && safety-- > 0) {
    nx = nx * 0.8 + 700 * 0.2;
    ny = ny * 0.8 + 590 * 0.2;
  }
  return { ...a, x: nx, y: ny };
};

const randTarget = (obstacles: WorldObstacle[] = []) => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const tx = WANDER.x1 + Math.random() * (WANDER.x2 - WANDER.x1);
    const ty = WANDER.y1 + Math.random() * (WANDER.y2 - WANDER.y1);
    if (!isInObstacle(tx, ty, obstacles) && isInsidePerimeter(tx, ty)) return { tx, ty };
  }
  return { tx: 700, ty: 590 };
};

function makeInitialAnimals(obstacles: WorldObstacle[] = []): AnimalAI[] {
  // Reduced from 7 to 3 — each animal runs constant CSS animations + an AI
  // step every frame. 7 was enough to make the GPU sweat on weaker machines.
  return [
    { id: 'a0', type: 'cow',     x: 260, y: 520, ...randTarget(obstacles), flip: false, moving: false, idleTimer: 2.2 },
    { id: 'a1', type: 'chicken', x: 310, y: 430, ...randTarget(obstacles), flip: false, moving: true,  idleTimer: 0 },
    { id: 'a2', type: 'chicken', x: 480, y: 660, ...randTarget(obstacles), flip: true,  moving: false, idleTimer: 1.4 },
  ];
}

function stepAnimals(animals: AnimalAI[], delta: number, obstacles: WorldObstacle[]): AnimalAI[] {
  return animals.map(a => {
    if (!a.moving) {
      const nt = a.idleTimer - delta;
      if (nt <= 0) return { ...a, ...randTarget(obstacles), moving: true, idleTimer: 0 };
      return { ...a, idleTimer: nt };
    }
    const dx = a.tx - a.x, dy = a.ty - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 3) return { ...a, x: a.tx, y: a.ty, moving: false, idleTimer: 1.5 + Math.random() * 4.5 };
    const spd = ASPEED[a.type];
    const nx = a.x + (dx / dist) * spd * delta;
    const ny = a.y + (dy / dist) * spd * delta;
    // If the next step would put the animal inside a building OR outside the
    // perimeter fence, pick a new target instead of stepping through it.
    if (isInObstacle(nx, ny, obstacles) || !isInsidePerimeter(nx, ny)) {
      return clampAnimal({ ...a, ...randTarget(obstacles), moving: false, idleTimer: 0.4 + Math.random() * 1.4 });
    }
    return clampAnimal({ ...a, x: nx, y: ny, flip: dx < 0 });
  });
}

// ── ANIMAL SPRITE ──────────────────────────────────────────────────────────────
function AnimalSprite({ x, y, type, flip, moving }: {
  x: number; y: number; type: 'cow' | 'chicken'; flip: boolean; moving: boolean;
}) {
  const animalScale = ANIMAL_SCALE[type];
  const outerT = `translate(${x},${y}) scale(${flip ? -animalScale : animalScale},${animalScale})`;
  // Only the walking animation runs — idle/breathing/pecking animations
  // were burning GPU on every idle frame for every animal. Standing still
  // when not moving is fine visually.
  const animCls = moving ? 'animal-walking' : '';

  if (type === 'chicken') {
    return (
      <g transform={outerT} style={{ pointerEvents: 'none' }}>
        <g className={animCls}>
          {/* drop shadow */}
          <ellipse cx="2" cy="15" rx="13" ry="3.5" fill="rgba(15,23,42,0.28)" />
          {/* legs (orange, bold) */}
          <path d="M-3 9 L-5 16" stroke="#ea7c1a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M-7 16 L-3 16" stroke="#ea7c1a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 9 L6 16" stroke="#ea7c1a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M4 16 L8 16" stroke="#ea7c1a" strokeWidth="2.2" strokeLinecap="round" />
          {/* tail (single curl) */}
          <path d="M-10 -3 Q-17 -10 -13 -14 Q-7 -14 -8 -6" fill="#fff" stroke="#1f2937" strokeWidth="1.3" strokeLinejoin="round" />
          {/* body — chunky teardrop */}
          <path d="M-12 2 Q-13 -8 -3 -10 Q11 -10 12 3 Q12 11 -1 12 Q-12 11 -12 2Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.5" strokeLinejoin="round" />
          {/* wing */}
          <path d="M-7 -2 Q1 -7 8 -1 Q3 4 -7 1 Z" fill="#f5f5f5" stroke="#1f2937" strokeWidth="1.1" />
          {/* head circle */}
          <circle cx="8" cy="-11" r="5.5" fill="#ffffff" stroke="#1f2937" strokeWidth="1.4" />
          {/* comb — 3 bold red bumps */}
          <path d="M3 -16 Q4 -19 6 -17 Q7 -20 9 -17 Q10 -20 12 -17 L12 -14 Q4 -14 3 -14 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" strokeLinejoin="round" />
          {/* wattle */}
          <path d="M10 -8 Q14 -5 11 -4 Q9 -5 10 -8 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.9" />
          {/* beak — bright orange triangle */}
          <path d="M11 -11 L17 -10 L11 -8 Z" fill="#f59e0b" stroke="#1f2937" strokeWidth="1" strokeLinejoin="round" />
          {/* eye */}
          <circle cx="8" cy="-12" r="1.6" fill="#1f2937" />
          <circle cx="8.5" cy="-12.5" r="0.55" fill="#fff" />
        </g>
      </g>
    );
  }

  return (
    <g transform={outerT} style={{ pointerEvents: 'none' }}>
        <g className={animCls}>
        {/* drop shadow */}
        <ellipse cx="0" cy="26" rx="24" ry="5" fill="rgba(15,23,42,0.28)" />
        {/* legs — chunky dark with hooves */}
        <rect x="-15" y="14" width="5" height="14" rx="1.5" fill="#0f172a" stroke="#000" strokeWidth="0.8" />
        <rect x="-6" y="14" width="5" height="14" rx="1.5" fill="#0f172a" stroke="#000" strokeWidth="0.8" />
        <rect x="3" y="14" width="5" height="14" rx="1.5" fill="#0f172a" stroke="#000" strokeWidth="0.8" />
        <rect x="11" y="14" width="5" height="14" rx="1.5" fill="#0f172a" stroke="#000" strokeWidth="0.8" />
        {/* belly underside (pink) */}
        <path d="M-15 14 Q-5 19 15 14 L13 19 Q-3 22 -13 19 Z" fill="#fda4af" stroke="#9f1239" strokeWidth="1.1" strokeLinejoin="round" />
        {/* body — fat white blob */}
        <path d="M-20 0 Q-21 -10 -8 -12 Q18 -13 22 0 Q22 14 8 16 Q-14 16 -20 11 Q-22 7 -20 0 Z" fill="#ffffff" stroke="#1f2937" strokeWidth="1.6" strokeLinejoin="round" />
        {/* big black patches (2 bold) */}
        <path d="M-13 -6 Q-7 -10 0 -8 Q5 -3 -2 1 Q-12 3 -14 -3 Z" fill="#0f172a" stroke="#000" strokeWidth="0.6" />
        <path d="M8 5 Q15 1 18 6 Q19 12 12 13 Q5 12 5 9 Q5 6 8 5 Z" fill="#0f172a" stroke="#000" strokeWidth="0.6" />
        {/* tail with tuft */}
        <path d="M-19 -2 Q-28 -4 -27 -13 Q-26 -19 -29 -22" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
        <circle cx="-29" cy="-22" r="3" fill="#1f2937" />
        {/* head */}
        <ellipse cx="20" cy="-7" rx="10" ry="9" fill="#ffffff" stroke="#1f2937" strokeWidth="1.6" />
        {/* ear */}
        <ellipse cx="13" cy="-16" rx="3" ry="5" fill="#0f172a" stroke="#000" strokeWidth="0.6" transform="rotate(-25 13 -16)" />
        {/* horns — single curve each */}
        <path d="M15 -16 Q11 -22 16 -22" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 -16 Q28 -22 24 -22" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" />
        {/* muzzle — big pink oval */}
        <ellipse cx="26" cy="-3" rx="7" ry="5.5" fill="#fda4af" stroke="#9f1239" strokeWidth="1.2" />
        <ellipse cx="24" cy="-3" rx="1" ry="1.4" fill="#831843" />
        <ellipse cx="28" cy="-3" rx="1" ry="1.4" fill="#831843" />
        {/* eye */}
        <circle cx="21" cy="-9" r="1.9" fill="#0f172a" />
        <circle cx="21.6" cy="-9.7" r="0.7" fill="#fff" />
      </g>
    </g>
  );
}

// ── ANIMALS LAYER ──────────────────────────────────────────────────────────────
function AnimalsLayer({ obstacles }: { obstacles: WorldObstacle[] }) {
  const obstaclesRef = useRef(obstacles);
  const [animals, setAnimals] = useState<AnimalAI[]>(() => makeInitialAnimals(obstacles));
  const stateRef = useRef<AnimalAI[]>(animals);
  const lastRef  = useRef(0);

  useEffect(() => {
    obstaclesRef.current = obstacles;
  }, [obstacles]);

  useEffect(() => {
    let rafId: number;
    let frame = 0;
    let lastPaint = 0;
    // Cap the animal animation to ~20fps on mobile, 30fps on desktop. The
    // simulation only needs subtle motion — running at 60fps was burning
    // battery for no visible benefit.
    const minPaintMs = IS_MOBILE ? 50 : 33;
    const loop = (now: number) => {
      if (document.hidden) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      if (now - lastPaint < minPaintMs) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      lastPaint = now;
      if (lastRef.current === 0) lastRef.current = now;
      const delta = Math.min((now - lastRef.current) / 1000, 0.1);
      lastRef.current = now;
      stateRef.current = stepAnimals(stateRef.current, delta, obstaclesRef.current);
      frame++;
      if (frame % (IS_MOBILE ? 4 : 2) === 0) setAnimals([...stateRef.current]);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <>
      {animals.map(a => (
        <AnimalSprite key={a.id} x={a.x} y={a.y} type={a.type} flip={a.flip} moving={a.moving} />
      ))}
    </>
  );
}

// ── HARVESTER SPRITE ──────────────────────────────────────────────────────────
function HarvesterSprite({ x, y, type, flip = false, active = false }: {
  x: number;
  y: number;
  type: HarvesterType;
  flip?: boolean;
  active?: boolean;
}) {
  // Bold cartoon-combine palette. Basic = farm red, then yellow/green/purple tiers.
  const color  = ({ basic: '#dc2626', advanced: '#16a34a', industrial: '#eab308', mega: '#a855f7' } as const)[type];
  const accent = ({ basic: '#fef08a', advanced: '#fef3c7', industrial: '#1f2937', mega: '#fde68a' } as const)[type];
  const dark   = ({ basic: '#7f1d1d', advanced: '#15803d', industrial: '#a16207', mega: '#6d28d9' } as const)[type];
  const sz     = ({ basic: 0.7, advanced: 0.85, industrial: 1.0, mega: 1.2 } as const)[type];
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -sz : sz},${sz})`} style={{ pointerEvents: 'none' }}>
      {/* drop shadow */}
      <ellipse cx="2" cy="16" rx="24" ry="4" fill="rgba(15,23,42,0.28)" />
      {/* Cutting header bar (front left) */}
      <path d="M-26 4 H-14 V11 H-26 Z" fill={accent} stroke="#1f2937" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M-26 8 H-14" stroke="#1f2937" strokeWidth="0.7" />
      {/* small reel teeth on the header */}
      <path d="M-25 4 L-25 1 M-22 4 L-22 1 M-19 4 L-19 1 M-16 4 L-16 1" stroke="#1f2937" strokeWidth="1" strokeLinecap="round" />
      {/* dust kicks behind cutter when active */}
      {active && (
        <g opacity="0.65">
          <circle cx="-29" cy="6"  r="2.4" fill="#e7e5e4" />
          <circle cx="-31" cy="11" r="2.0" fill="#e7e5e4" />
          <circle cx="-28" cy="13" r="1.8" fill="#e7e5e4" />
        </g>
      )}
      {/* Body / chassis */}
      <path d="M-14 -6 H14 Q18 -6 18 -2 V11 H-14 Z" fill={color} stroke="#1f2937" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M-14 4 H18" stroke={dark} strokeWidth="2.2" opacity="0.9" />
      {/* Cabin */}
      <path d="M-4 -19 H10 Q12 -19 12 -16 L13 -7 H-7 Z" fill={color} stroke="#1f2937" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Windshield big */}
      <path d="M-2 -17 H9 L11 -9 H-5 Z" fill="#bfdbfe" stroke="#1f2937" strokeWidth="1" strokeLinejoin="round" />
      <path d="M-1 -16 L4 -14" stroke="#fff" strokeWidth="0.9" opacity="0.9" />
      {/* Exhaust stack */}
      <rect x="13" y="-24" width="3.5" height="10" rx="1.5" fill="#1f2937" stroke="#000" strokeWidth="0.6" />
      <ellipse cx="14.75" cy="-24" rx="3" ry="1.1" fill="#475569" />
      {active && (
        <circle cx="14.75" cy="-28" r="2.2" fill="#475569" opacity="0.5" />
      )}
      {/* Rear wheels (big black with hubcap) */}
      <circle cx="-8" cy="11" r="7.6" fill="#0f172a" stroke="#000" strokeWidth="1" />
      <circle cx="-8" cy="11" r="3.4" fill="#cbd5e1" stroke="#475569" strokeWidth="0.7" />
      <circle cx="-8" cy="11" r="1"   fill="#0f172a" />
      <circle cx="11"  cy="11" r="7.6" fill="#0f172a" stroke="#000" strokeWidth="1" />
      <circle cx="11"  cy="11" r="3.4" fill="#cbd5e1" stroke="#475569" strokeWidth="0.7" />
      <circle cx="11"  cy="11" r="1"   fill="#0f172a" />
      {/* wheat-spray when actively cutting */}
      {active && (
        <g opacity="0.85">
          <path d="M-13 8 L-22 5"  stroke="#f59e0b" strokeWidth="2"   strokeLinecap="round" />
          <path d="M-13 11 L-24 11" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M-13 14 L-22 17" stroke="#f59e0b" strokeWidth="2"   strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

// ── FIELD CART SPRITE ─────────────────────────────────────────────────────────
function FieldCartSprite({ x, y, flip }: { x: number; y: number; flip: boolean }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip ? -1 : 1},1)`} style={{ pointerEvents: 'none' }}>
      <path d="M-23 13 C-10 5 14 5 25 13 C12 21 -9 21 -23 13Z" fill="rgba(15,23,42,0.22)" />
      {/* Tow hitch */}
      <rect x="-22" y="-1" width="10" height="4" rx="2" fill="#374151" />
      {/* Cart bed */}
      <path d="M-15 -8 H13 L18 -2 V9 H-15Z" fill="url(#cartWoodGrad)" stroke="#451a03" strokeWidth="1" />
      <path d="M-12 -5 H11" stroke="rgba(255,237,213,0.34)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Produce pile */}
      <path d="M-12 -7 Q-2 -15 12 -7 V2 H-12Z" fill="#4ade80" opacity="0.9" />
      <ellipse cx="1" cy="-7" rx="12" ry="4" fill="#86efac" opacity="0.86" />
      {/* Wheels */}
      <circle cx="-9" cy="9"  r="5" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
      <circle cx="-9" cy="9"  r="2" fill="#6b7280" />
      <circle cx="11" cy="9"  r="5" fill="#1f2937" stroke="#111827" strokeWidth="0.8" />
      <circle cx="11" cy="9"  r="2" fill="#6b7280" />
    </g>
  );
}

// ── PARTICLE TYPE ──────────────────────────────────────────────────────────────
interface Particle { id: string; x: number; y: number; text: string; color: string; size: number }
let _pid = 0;

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
interface Props {
  onWarehouseClick: () => void;
  onMarketClick: () => void;
  onFieldClick: (fieldId: string) => void;
}

export default function GameWorld({ onWarehouseClick, onMarketClick, onFieldClick }: Props) {
  const fields      = useGameStore(s => s.fields);
  const trucks      = useGameStore(s => s.trucks);
  const harvesters  = useGameStore(s => s.harvesters);
  const fieldCarts  = useGameStore(s => s.fieldCarts);
  const harvestField = useGameStore(s => s.harvestField);
  const collectAllReady = useGameStore(s => s.collectReadyFields);
  // Subscribe to total inventory as a derived NUMBER instead of the
  // inventory object — the object reference changes every tick even when
  // nothing meaningful changed.
  const totalInv = useGameStore(s => {
    let total = 0;
    for (const v of Object.values(s.inventory)) total += v || 0;
    return total;
  });

  // ── STATIC FIT-TO-VIEW CAMERA ────────────────────────────────────────────
  // The map is no longer pannable / zoomable. Zoom + pan are derived from
  // the viewport size so the whole farm is visible at once. This kills the
  // constant-input loop that was burning CPU/GPU before.
  const computeView = () => {
    if (typeof window === 'undefined') return { zoom: 0.9, pan: { x: 0, y: 0 } };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Reserve room for HUD (~110px), sky band (~110px), and bottom bar (~80px)
    const skyReserve = 110;
    const hudReserve = 110;
    const usableH = Math.max(300, vh - hudReserve - skyReserve - 80);
    // The buildings + fields + roads actually occupy a smaller footprint
    // than the full fence diamond — focus the zoom on the playable area.
    const contentW = 1600;
    const contentH = 1000;
    const z = Math.max(0.5, Math.min(vw / contentW, usableH / contentH, 1.2));

    // Center on the geometric center of the fence diamond — that's what
    // visually frames "the farm" for the player, so centering it makes
    // the empty-grass margins balanced on left and right. Centering on
    // the building cluster (which sits right-of-center inside the fence)
    // pushed everything left-heavy.
    //   Perim corners: top (628,32), right (1924,680), bottom (988,1148), left (-308,500)
    //   Geometric mean ≈ (808, 590)
    const worldCenterX = 808;
    const worldCenterY = 590;
    const targetCenterX = vw / 2;
    const targetCenterY = hudReserve + skyReserve + usableH / 2;
    return {
      zoom: z,
      pan: {
        x: Math.round(targetCenterX - worldCenterX * z),
        y: Math.round(targetCenterY - worldCenterY * z),
      },
    };
  };
  const [view, setView] = useState(computeView);
  const { pan, zoom } = view;

  const [machineClock, setMachineClock] = useState(0);
  const vpRef = useRef<HTMLDivElement>(null);
  const dragDist = useRef(0); // kept for click-vs-drag detection (always 0 now)

  // Recompute fit on resize so the world stays centered on any screen size.
  useEffect(() => {
    const onResize = () => setView(computeView());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastPaint = 0;
    const minPaintMs = IS_MOBILE ? 400 : 160;
    const loop = (now: number) => {
      if (document.hidden) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      if (now - lastPaint > minPaintMs) {
        setMachineClock(now);
        lastPaint = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Particles
  const [particles, setParticles] = useState<Particle[]>([]);

  // Track earnings for market flash — subscribe via store API so this does
  // not re-render the component on every money change.
  const [lastEarned, setLastEarned] = useState(0);
  useEffect(() => {
    let prev = useGameStore.getState().money;
    return useGameStore.subscribe(state => {
      const m = state.money;
      if (m > prev) {
        const diff = m - prev;
        if (diff > 2) setLastEarned(diff);
      }
      prev = m;
    });
  }, []);

  // Harvest handler
  const doHarvest = useCallback((field: Field, wx: number, wy: number) => {
    if (field.readyToPick < 1) return;
    const result = harvestField(field.id);
    if (result.harvested <= 0) return;

    const newPs: Particle[] = [
      { id: `p${_pid++}`, x: wx - 15 + Math.random()*30, y: wy - 10, text: '+', color: '#fef3c7', size: 22 },
      { id: `p${_pid++}`, x: wx +  5 + Math.random()*20, y: wy - 25, text: '+', color: '#bbf7d0', size: 18 },
      { id: `p${_pid++}`, x: wx -  5 + Math.random()*10, y: wy - 18, text: `+${result.harvested} units`, color: '#facc15', size: 13 },
    ];
    setParticles(ps => [...ps, ...newPs]);
    setTimeout(() => setParticles(ps => ps.filter(p => !newPs.find(n => n.id === p.id))), 1200);
  }, [harvestField]);

  const collectReadyFields = useCallback(() => {
    const result = collectAllReady();
    if (result.harvested <= 0) return;

    const newPs: Particle[] = [
      {
        id: `p${_pid++}`,
        x: window.innerWidth / 2,
        y: window.innerHeight * 0.38,
        text: `+${result.harvested} crops`,
        color: '#facc15',
        size: 18,
      },
    ];
    setParticles(ps => [...ps, ...newPs]);
    setTimeout(() => setParticles(ps => ps.filter(p => !newPs.find(n => n.id === p.id))), 1200);
  }, [collectAllReady]);

  // Pan / pointer handlers removed — map is static now.

  // ── VIEWPORT CULLING ──────────────────────────────────────────────────────────
  const vpW = typeof window !== 'undefined' ? window.innerWidth  : 1280;
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 720;
  const _cullPad = TW * 2;
  const _vx0 = -pan.x / zoom - _cullPad;
  const _vx1 = (vpW - pan.x) / zoom + _cullPad;
  const _vy0 = -pan.y / zoom - _cullPad;
  const _vy1 = (vpH - pan.y) / zoom + _cullPad;
  const isTileVisible = (col: number, row: number) => {
    const tx = OX + (col - row) * HW;
    const ty = OY + (col + row) * HH;
    return tx + HW > _vx0 && tx - HW < _vx1 && ty + TH > _vy0 && ty < _vy1;
  };

  // ── BUILD RENDER LIST (depth sorted) ────────────────────────────────────────
  type RenderItem =
    | { kind: 'grass';     col: number; row: number }
    | { kind: 'soil';      col: number; row: number; field: Field; fIdx: number }
    | { kind: 'road';      col: number; row: number }
    | { kind: 'fence';     col: number; row: number; side: 'NE'|'NW'|'SE'|'SW' }
    | { kind: 'building';  id: 'wh' | 'mkt' | 'home' }
    | { kind: 'crop';      col: number; row: number; field: Field; fIdx: number }
    | { kind: 'harvester'; field: Field; fIdx: number; htype: HarvesterType; depth: number }
    | { kind: 'parkedHarvester'; htype: HarvesterType; idx: number }
    | { kind: 'truck';     truck: Truck; idx: number };

  const items: RenderItem[] = [];
  const fieldOccupiesTile = (col: number, row: number) => fields.some((field, fIdx) => {
    const slot = FIELD_SLOTS[fIdx];
    if (!slot) return false;
    const sz = FIELD_TILE_SIZE[field.type] ?? 3;
    return col >= slot.col && col < slot.col + sz && row >= slot.row && row < slot.row + sz;
  });
  const buildingOccupiesTile = (col: number, row: number) =>
    [WH, MKT, HOMESTEAD].some(b =>
      col >= b.col - 1 && col <= b.col + b.w && row >= b.row - 1 && row <= b.row + b.d,
    );
  const roadOccupiesTile = (col: number, row: number) => {
    const depotSpine = (col === ROAD_COL || col === ROAD_COL + 1) && row >= ROAD_ROW_START && row <= ROAD_ROW_END;
    const warehouseConnector = row === WH.row + WH.d - 1 && col >= WH.col + WH.w && col <= ROAD_COL + 1;
    const marketConnector = row === MKT.row + MKT.d - 1 && col >= MKT.col + MKT.w && col <= ROAD_COL + 1;
    const serviceRow = SERVICE_ROAD_ROWS.includes(row) && col >= -1 && col <= ROAD_COL + 1;
    const serviceCol = SERVICE_ROAD_COLS.includes(col) && row >= -1 && row <= 23;
    return depotSpine || warehouseConnector || marketConnector || serviceRow || serviceCol;
  };
  const decorCanOccupyTile = (col: number, row: number) =>
    !fieldOccupiesTile(col, row) && !roadOccupiesTile(col, row) && !buildingOccupiesTile(col, row);
  const decorTiles = DECOR_TILES.filter(([col, row]) => decorCanOccupyTile(col, row));
  const treeTiles = decorTiles.slice(0, 18);
  const accentTiles = decorTiles.slice(18);

  // Grass tiles removed — the world-map div now has a flat green background.
  // This was the single biggest perf cost: ~700 SVG polygons per frame.

  // Road tiles — culled to viewport
  for (let r = ROAD_ROW_START; r <= ROAD_ROW_END; r++) {
    if (isTileVisible(ROAD_COL, r))     items.push({ kind: 'road', col: ROAD_COL,     row: r });
    if (isTileVisible(ROAD_COL + 1, r)) items.push({ kind: 'road', col: ROAD_COL + 1, row: r });
  }
  // Extended service roads — reach all the way to the fence on each side.
  SERVICE_ROAD_ROWS.forEach(row => {
    for (let c = PERIM_MIN_COL + 1; c <= PERIM_MAX_COL - 1; c++) {
      if (!fieldOccupiesTile(c, row) && isTileVisible(c, row)) items.push({ kind: 'road', col: c, row });
    }
  });
  SERVICE_ROAD_COLS.forEach(col => {
    for (let r = PERIM_MIN_ROW + 1; r <= PERIM_MAX_ROW - 1; r++) {
      if (!fieldOccupiesTile(col, r) && isTileVisible(col, r)) items.push({ kind: 'road', col, row: r });
    }
  });
  // Short horizontal connectors from buildings to road
  for (let c = WH.col + WH.w; c <= ROAD_COL + 1; c++) {
    if (isTileVisible(c, WH.row + WH.d - 1)) items.push({ kind: 'road', col: c, row: WH.row + WH.d - 1 });
  }
  for (let c = MKT.col + MKT.w; c <= ROAD_COL + 1; c++) {
    if (isTileVisible(c, MKT.row + MKT.d - 1)) items.push({ kind: 'road', col: c, row: MKT.row + MKT.d - 1 });
  }

  // Fields (soil tiles + fences + crop overlays)
  fields.forEach((field, fIdx) => {
    const slot = FIELD_SLOTS[fIdx];
    if (!slot) return;
    const sz = FIELD_TILE_SIZE[field.type] ?? 3;

    for (let dc = 0; dc < sz; dc++) {
      for (let dr = 0; dr < sz; dr++) {
        const c = slot.col + dc, r = slot.row + dr;
        items.push({ kind: 'soil', col: c, row: r, field, fIdx });
        items.push({ kind: 'crop', col: c, row: r, field, fIdx });
        // Fence on edges
        if (dr === 0)      items.push({ kind: 'fence', col: c, row: r, side: 'NE' });
        if (dr === 0)      items.push({ kind: 'fence', col: c, row: r, side: 'NW' });
        if (dc === sz - 1) items.push({ kind: 'fence', col: c, row: r, side: 'SE' });
        if (dc === 0)      items.push({ kind: 'fence', col: c, row: r, side: 'SW' });
      }
    }
  });

  // Harvesters on fields
  fields.forEach((field, fIdx) => {
    if (!field.harvesterId) return;
    const harvester = harvesters.find(h => h.id === field.harvesterId);
    if (!harvester) return;
    const slot = FIELD_SLOTS[fIdx];
    if (!slot) return;
    const sz = FIELD_TILE_SIZE[field.type] ?? 3;
    const depth = slot.col + sz / 2 + slot.row + sz / 2;
    items.push({ kind: 'harvester', field, fIdx, htype: harvester.type, depth });
  });

  harvesters
    .filter(h => h.fieldId === null)
    .forEach((harvester, idx) => {
      items.push({ kind: 'parkedHarvester', htype: harvester.type, idx });
    });

  // Perimeter fence — draws ONE outward-facing tile-edge per perimeter
  // tile, picking the side that points away from the playable interior.
  // The previous version drew two sides per tile (and duplicated them at
  // corners), which left inward-pointing fence stubs at the diamond corners
  // — that's the visual "cut off / broken" the user was reporting.
  //
  // Naming reminder: in this codebase the fence "side" name describes the
  // direction the edge points *toward*, not where it is on the tile. So:
  //   SE = top→right edge (faces north-east outward)
  //   NE = bottom→right edge (faces south-east outward)
  //   NW = left→bottom edge (faces south-west outward)
  //   SW = left→top edge (faces north-west outward)
  const fenceKey = new Set<string>();
  const addFence = (col: number, row: number, side: 'NE'|'NW'|'SE'|'SW') => {
    const key = `${col},${row},${side}`;
    if (fenceKey.has(key)) return;
    fenceKey.add(key);
    if (isTileVisible(col, row)) {
      items.push({ kind: 'fence', col, row, side });
    }
  };
  // Top-right edge of the diamond (iso row = PERIM_MIN_ROW): each tile's
  // outward-facing edge is its top→right edge.
  for (let c = PERIM_MIN_COL; c <= PERIM_MAX_COL; c++) {
    addFence(c, PERIM_MIN_ROW, 'SE');
  }
  // Bottom-right edge of the diamond (iso col = PERIM_MAX_COL): outward
  // edge is bottom→right.
  for (let r = PERIM_MIN_ROW; r <= PERIM_MAX_ROW; r++) {
    addFence(PERIM_MAX_COL, r, 'NE');
  }
  // Bottom-left edge of the diamond (iso row = PERIM_MAX_ROW): outward
  // edge is left→bottom.
  for (let c = PERIM_MIN_COL; c <= PERIM_MAX_COL; c++) {
    addFence(c, PERIM_MAX_ROW, 'NW');
  }
  // Top-left edge of the diamond (iso col = PERIM_MIN_COL): outward edge
  // is left→top.
  for (let r = PERIM_MIN_ROW; r <= PERIM_MAX_ROW; r++) {
    addFence(PERIM_MIN_COL, r, 'SW');
  }

  // Buildings (decorative first so they depth-sort correctly)
  items.push({ kind: 'building', id: 'home' });
  // barn building was removed — it was purely decorative.
  items.push({ kind: 'building', id: 'wh' });
  items.push({ kind: 'building', id: 'mkt' });

  // Trucks
  trucks.forEach((truck, idx) => items.push({ kind: 'truck', truck, idx }));

  // Sort by depth. Ties: grass < soil < road < fence < crop < harvester < building < truck
  const kindOrder: Record<RenderItem['kind'], number> = {
    grass: 0, soil: 1, road: 2, fence: 3, crop: 4, harvester: 5, parkedHarvester: 5, building: 6, truck: 7,
  };
  // Use SE corner (col+w, row+d) depth so building renders after all tiles in its footprint
  const buildingDepth = (id: string) => {
    if (id === 'wh')   return (WH.col + WH.w)        + (WH.row + WH.d);
    if (id === 'mkt')  return (MKT.col + MKT.w)       + (MKT.row + MKT.d);
    /* home */         return (HOMESTEAD.col + HOMESTEAD.w) + (HOMESTEAD.row + HOMESTEAD.d);
  };
  items.sort((a, b) => {
    const da = a.kind === 'building'  ? buildingDepth(a.id)
             : a.kind === 'truck'     ? 60
             : a.kind === 'parkedHarvester' ? 34 + a.idx * 0.2
             : a.kind === 'harvester' ? a.depth
             : a.col + a.row;
    const db = b.kind === 'building'  ? buildingDepth(b.id)
             : b.kind === 'truck'     ? 60
             : b.kind === 'parkedHarvester' ? 34 + b.idx * 0.2
             : b.kind === 'harvester' ? b.depth
             : b.col + b.row;
    return da !== db ? da - db : kindOrder[a.kind] - kindOrder[b.kind];
  });

  // ── TRUCK POSITIONS ──────────────────────────────────────────────────────────
  const lrp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
  const roadCenter = (col: number, row: number) => {
    const p = iso(col, row);
    return { x: p.x, y: p.y + HH };
  };
  const routePoint = (route: { x: number; y: number }[], progress: number) => {
    const lengths = route.slice(1).map((point, index) => {
      const prev = route[index];
      return Math.hypot(point.x - prev.x, point.y - prev.y);
    });
    const total = lengths.reduce((sum, len) => sum + len, 0) || 1;
    let travel = Math.max(0, Math.min(1, progress)) * total;
    for (let i = 0; i < lengths.length; i++) {
      if (travel <= lengths[i]) {
        const from = route[i];
        const to = route[i + 1];
        const local = lengths[i] === 0 ? 0 : travel / lengths[i];
        return {
          x: lrp(from.x, to.x, local),
          y: lrp(from.y, to.y, local),
          flip: to.x < from.x,
        };
      }
      travel -= lengths[i];
    }
    const last = route[route.length - 1];
    const prev = route[route.length - 2] ?? last;
    return { x: last.x, y: last.y, flip: last.x < prev.x };
  };
  const depotTruckRoute = [
    roadCenter(WH.col + WH.w, WH.row + WH.d - 1),
    roadCenter(ROAD_COL, WH.row + WH.d - 1),
    roadCenter(ROAD_COL, MKT.row + MKT.d - 1),
    roadCenter(MKT.col + MKT.w, MKT.row + MKT.d - 1),
    roadCenter(ROAD_COL + 1, ROAD_ROW_END),
  ];

  const getTruckPos = (truck: Truck, idx: number) => {
    const laneOffset = (idx % 3 - 1) * 10;

    if (truck.status === 'delivering') {
      const pos = routePoint(depotTruckRoute, truck.deliveryProgress);
      return { x: pos.x - 16, y: pos.y - 28 + laneOffset, flip: pos.flip };
    }
    if (truck.status === 'returning') {
      const pos = routePoint([...depotTruckRoute].reverse(), truck.deliveryProgress);
      return { x: pos.x - 16, y: pos.y - 28 + laneOffset, flip: pos.flip };
    }
    const parked = roadCenter(WH.col + WH.w + (idx % 2), WH.row + WH.d - 1 + Math.floor(idx / 2));
    return { x: parked.x - 16, y: parked.y - 28 + laneOffset, flip: false };
  };

  const getHarvesterPos = (field: Field, fIdx: number) => {
    const slot = FIELD_SLOTS[fIdx];
    const sz = FIELD_TILE_SIZE[field.type] ?? 3;
    const tracks = Math.max(2, Math.min(5, sz));
    const phase = ((machineClock / 7600) + fIdx * 0.19) % 1;
    const track = Math.min(tracks - 1, Math.floor(phase * tracks));
    const local = phase * tracks - track;
    const along = track % 2 === 0 ? local : 1 - local;
    const c = slot.col + 0.65 + along * Math.max(0.8, sz - 1.3);
    const r = slot.row + 0.65 + (track / Math.max(1, tracks - 1)) * Math.max(0.8, sz - 1.3);
    const p = iso(c, r);
    return { x: p.x, y: p.y + HH * 0.35, flip: track % 2 === 1 };
  };

  const getFieldCartPos = (cart: FieldCart, field: Field, fIdx: number) => {
    const slot = FIELD_SLOTS[fIdx];
    const sz = FIELD_TILE_SIZE[field.type] ?? 3;
    const gateRow = SERVICE_ROAD_ROWS.reduce((best, row) =>
      Math.abs(row - (slot.row + sz)) < Math.abs(best - (slot.row + sz)) ? row : best,
    SERVICE_ROAD_ROWS[0]);
    const fieldGate = roadCenter(slot.col + sz / 2, gateRow);
    const fieldCenter = iso(slot.col + sz / 2, slot.row + sz / 2);
    const serviceCol = SERVICE_ROAD_COLS.reduce((best, col) =>
      Math.abs(col - (slot.col + sz / 2)) < Math.abs(best - (slot.col + sz / 2)) ? col : best,
    SERVICE_ROAD_COLS[0]);
    const route = [
      { x: fieldCenter.x, y: fieldCenter.y + HH * 0.4 },
      fieldGate,
      roadCenter(serviceCol, gateRow),
      roadCenter(ROAD_COL, gateRow),
      roadCenter(ROAD_COL, WH.row + WH.d - 1),
      roadCenter(WH.col + WH.w, WH.row + WH.d - 1),
    ];
    const t = cart.status === 'hauling' ? cart.progress : 1 - cart.progress;
    const pos = routePoint(route, t);
    return { x: pos.x, y: pos.y - 8, flip: cart.status === 'returning' ? !pos.flip : pos.flip };
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────
  const warehouses = useGameStore(s => s.warehouses);
  const totalCap = warehouses.reduce((sum, warehouse) => sum + WAREHOUSE_CONFIG[warehouse.type].capacity, 0);
  const storageSpace = Math.max(totalCap - totalInv, 0);
  const readyFieldCount = fields.filter(field => field.readyToPick >= 1).length;
  const animalObstacles = useMemo<WorldObstacle[]>(() => {
    const rectFromPoints = (points: { x: number; y: number }[], padX: number, padY: number): WorldObstacle => ({
      x1: Math.min(...points.map(p => p.x)) - padX,
      y1: Math.min(...points.map(p => p.y)) - padY,
      x2: Math.max(...points.map(p => p.x)) + padX,
      y2: Math.max(...points.map(p => p.y)) + padY,
    });
    const buildingRect = (b: { col: number; row: number; w: number; d: number }) =>
      rectFromPoints([
        iso(b.col, b.row),
        iso(b.col + b.w, b.row),
        iso(b.col + b.w, b.row + b.d),
        iso(b.col, b.row + b.d),
      ], 46, 32);
    const fieldRect = (slot: { col: number; row: number }, size: number) =>
      rectFromPoints([
        iso(slot.col, slot.row),
        iso(slot.col + size, slot.row),
        iso(slot.col + size, slot.row + size),
        iso(slot.col, slot.row + size),
      ], 44, 30);

    const fieldBlocks = fields
      .map((field, idx) => {
        const slot = FIELD_SLOTS[idx];
        if (!slot) return null;
        return fieldRect(slot, FIELD_TILE_SIZE[field.type] ?? 3);
      })
      .filter((rect): rect is WorldObstacle => Boolean(rect));

    const decorBlocks = decorTiles.map(([c, r]) => {
      const p = iso(c, r);
      return { x1: p.x - 34, y1: p.y - 8, x2: p.x + 34, y2: p.y + 48 };
    });

    return [
      buildingRect(WH),
      buildingRect(MKT),
      buildingRect(HOMESTEAD),
      ...fieldBlocks,
      ...decorBlocks,
    ];
  }, [fields]);

  return (
    <div
      ref={vpRef}
      className="world-viewport"
      style={{ cursor: 'default' }}
    >
      {/* Sky band — sits on top of the grass background. Sun + clouds. */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 110,
        pointerEvents: 'none', zIndex: 1,
      }}>
        <div style={{
          position: 'absolute', top: 18, right: 62,
          width: 48, height: 48, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #fef9c3, #facc15 56%, #f59e0b)',
          boxShadow: '0 0 30px rgba(250,204,21,0.5)',
        }} />
        {[[30,8,38],[160,20,30],[310,5,34],[460,16,28],[640,12,32],[820,22,28],[1000,8,36],[1180,18,30]].map(([x,y,s],i) => (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width: s * 1.7, height: s * 0.62, opacity: 0.85 }}>
            <span style={{ position: 'absolute', left: 0, bottom: 0, width: '72%', height: '56%', borderRadius: 999, background: 'rgba(255,255,255,0.86)' }} />
            <span style={{ position: 'absolute', left: '24%', bottom: '18%', width: '48%', height: '78%', borderRadius: '50%', background: 'rgba(255,255,255,0.92)' }} />
            <span style={{ position: 'absolute', right: 0, bottom: 0, width: '52%', height: '48%', borderRadius: 999, background: 'rgba(255,255,255,0.82)' }} />
          </div>
        ))}
      </div>

      {/* fog/birds removed — were animating blur/transform filters constantly. */}

      {/* ── World SVG + HTML overlay ── */}
      <div
        className="world-map"
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`, transformOrigin: '0 0', width: SVG_W, height: SVG_H, background: 'transparent' }}
      >
        <svg
          width={SVG_W}
          height={SVG_H}
          // overflow:visible lets content at negative x render outside the
          // SVG bounds. The leftmost perimeter tile sits at world x ≈ -308
          // (because OX=700 and the perim extends to col -4 / row 24), and
          // without this override the SVG would clip it — that's why the
          // left side of the fence appeared cut off.
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          onClick={e => {
            if (dragDist.current > 6) return; // was a drag, not a tap
            // Check warehouse / market tap (handled by foreignObject below)
          }}
        >
          <defs>
            <pattern id="grassPat" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="#66bf62" />
              <path d="M2 23 Q8 17 15 23 T29 23" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
              <path d="M5 9 q3,-4 6,0 M20 15 q3,-4 6,0" stroke="#3f9c43" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.42" />
              <circle cx="8"  cy="8"  r="1.2" fill="rgba(255,255,255,0.13)" />
              <circle cx="22" cy="17" r="1" fill="rgba(0,0,0,0.045)" />
            </pattern>
            <pattern id="grassDark" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <rect width="30" height="30" fill="#59ad57" />
              <path d="M0 7 Q8 12 16 7 T30 7" fill="none" stroke="rgba(255,255,255,0.075)" strokeWidth="1" />
              <circle cx="5"  cy="14" r="1.1" fill="rgba(255,255,255,0.1)" />
            </pattern>
            <pattern id="soilPat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="#9b6238" />
              <path d="M-2 4 H22 M-2 11 H22 M-2 18 H22" stroke="rgba(78,39,19,0.28)" strokeWidth="1.2" />
              <path d="M3 0 V20 M14 0 V20" stroke="rgba(255,238,205,0.08)" strokeWidth="1" />
              <circle cx="5" cy="7" r="0.8" fill="rgba(60,31,15,0.2)" />
              <circle cx="15" cy="15" r="0.9" fill="rgba(255,255,255,0.08)" />
            </pattern>
            <pattern id="roadPat" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#d7b36f" />
              <path d="M0 0 L16 16 M-6 6 L6 18 M10 -2 L20 8" stroke="rgba(108,76,42,0.18)" strokeWidth="1" />
              <path d="M0 15 H16" stroke="rgba(255,246,220,0.12)" strokeWidth="1" />
              <circle cx="8" cy="8" r="1.2" fill="rgba(255,255,255,0.13)" />
            </pattern>
            <linearGradient id="grassTileLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="52%" stopColor="rgba(255,255,255,0.03)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.09)" />
            </linearGradient>
            <linearGradient id="soilTileLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,232,190,0.12)" />
              <stop offset="100%" stopColor="rgba(53,28,12,0.16)" />
            </linearGradient>
            <linearGradient id="roadTileLight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,250,225,0.18)" />
              <stop offset="100%" stopColor="rgba(120,79,36,0.12)" />
            </linearGradient>
            <linearGradient id="whRoofGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#374151" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <linearGradient id="whLeftGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="whRightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="mktRoofGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="33%" stopColor="#ef4444" />
              <stop offset="33%" stopColor="#ffffff" />
              <stop offset="66%" stopColor="#ffffff" />
              <stop offset="66%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="homeLeftGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdf4e7" />
              <stop offset="100%" stopColor="#e0c888" />
            </linearGradient>
            <linearGradient id="homeRightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8d5a3" />
              <stop offset="100%" stopColor="#c09850" />
            </linearGradient>
            <linearGradient id="homeRoofGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c0522a" />
              <stop offset="100%" stopColor="#8b2d10" />
            </linearGradient>
            <linearGradient id="barnLeftGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b83030" />
              <stop offset="100%" stopColor="#7a1c1c" />
            </linearGradient>
            <linearGradient id="barnRightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#951818" />
              <stop offset="100%" stopColor="#5c0e0e" />
            </linearGradient>
            <linearGradient id="barnRoofGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2d2010" />
              <stop offset="100%" stopColor="#150e06" />
            </linearGradient>
            <linearGradient id="cowBodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="58%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id="chickenBodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff7d6" />
              <stop offset="52%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <linearGradient id="truckBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="truckIdleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="cartWoodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <radialGradient id="treeCrownGrad" cx="35%" cy="25%" r="70%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="52%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#166534" />
            </radialGradient>
            <linearGradient id="hayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="56%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <filter id="spriteLift" x="-40%" y="-45%" width="180%" height="190%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.24" />
            </filter>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
              <feOffset dx="0" dy="4" result="offsetBlur" />
              <feMerge><feMergeNode in="offsetBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grass is now drawn as a CSS background on .world-viewport so it
              spans the ENTIRE screen, not just the SVG canvas. No background
              rect needed here. */}

          {/* Render all items */}
          {items.map((item, i) => {
            if (item.kind === 'grass') {
              const { x, y } = iso(item.col, item.row);
              const alt = (item.col + item.row) % 3 === 0;
              const tilePts = `${x},${y} ${x+HW},${y+HH} ${x},${y+TH} ${x-HW},${y+HH}`;
              // Cheap path: single polygon per tile, no overlay, no decorative
              // tufts. Each tile was previously 2–4 SVG nodes; this is 1.
              // The flat color difference between alt/normal still gives a
              // checkered texture variation that reads as "grass".
              return (
                <polygon
                  key={`g${i}`}
                  points={tilePts}
                  fill={alt ? '#59ad57' : '#66bf62'}
                  stroke="rgba(30,86,38,0.14)"
                  strokeWidth={0.5}
                />
              );
            }

            if (item.kind === 'soil') {
              const { x, y } = iso(item.col, item.row);
              const ready = item.field.readyToPick >= 1;
              const soilPts = `${x},${y} ${x+HW},${y+HH} ${x},${y+TH} ${x-HW},${y+HH}`;
              const soilClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (dragDist.current > 6) return;
                if (item.field.readyToPick >= 1) {
                  doHarvest(item.field, x + pan.x, y + pan.y + HH);
                } else {
                  onFieldClick(item.field.id);
                }
              };
              if (IS_MOBILE) {
                return (
                  <polygon
                    key={`s${i}`}
                    points={soilPts}
                    fill="#9b6238"
                    stroke={ready ? '#facc15' : 'rgba(83,45,21,0.52)'}
                    strokeWidth={ready ? 1.6 : 1}
                    style={{ cursor: 'pointer' }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={soilClick}
                  />
                );
              }
              return (
                <g key={`s${i}`}>
                  <polygon
                    points={soilPts}
                    fill="url(#soilPat)"
                    stroke={ready ? '#facc15' : 'rgba(83,45,21,0.52)'}
                    strokeWidth={ready ? 1.6 : 1}
                    filter={ready ? 'url(#glow)' : undefined}
                    style={{ cursor: 'pointer' }}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={soilClick}
                  />
                  <polygon
                    points={soilPts}
                    fill="url(#soilTileLight)"
                    opacity="0.7"
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            }

            if (item.kind === 'road') {
              const { x, y } = iso(item.col, item.row);
              const roadPts = `${x},${y} ${x+HW},${y+HH} ${x},${y+TH} ${x-HW},${y+HH}`;
              if (IS_MOBILE) {
                return (
                  <polygon
                    key={`r${i}`}
                    points={roadPts}
                    fill="#d7b36f"
                    stroke="rgba(126,86,45,0.38)" strokeWidth={0.8}
                  />
                );
              }
              return (
                <g key={`r${i}`}>
                  <polygon
                    points={roadPts}
                    fill="url(#roadPat)"
                    stroke="rgba(126,86,45,0.42)" strokeWidth={1}
                  />
                  <polygon
                    points={roadPts}
                    fill="url(#roadTileLight)"
                    opacity="0.82"
                  />
                  <line
                    x1={x - HW * 0.46}
                    y1={y + HH * 1.08}
                    x2={x + HW * 0.46}
                    y2={y + HH * 0.92}
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth={1}
                  />
                </g>
              );
            }

            if (item.kind === 'fence') {
              // Build a proper post-and-rail fence segment instead of a
              // single thin polygon. We use the first two points of the
              // edge polygon as the segment endpoints, then draw:
              //   - a top rail (light wood)
              //   - a bottom rail (darker, slightly offset down)
              //   - two short vertical posts at the segment endpoints
              // This makes the fence read as wooden posts + cross-beams
              // rather than just an outlined box.
              const segs = fenceEdgePts(item.col, item.row, item.side);
              const [ax, ay] = segs[0];
              const [bx, by] = segs[1];
              const POST_H = 10;
              const POST_W = 3;
              const RAIL_W = 2.2;
              return (
                <g key={`f${i}`}>
                  {/* Bottom rail (slightly offset down + darker) */}
                  <line
                    x1={ax} y1={ay + 2.5}
                    x2={bx} y2={by + 2.5}
                    stroke="#5a2d0c"
                    strokeWidth={RAIL_W}
                    strokeLinecap="round"
                  />
                  {/* Top rail */}
                  <line
                    x1={ax} y1={ay - 1}
                    x2={bx} y2={by - 1}
                    stroke="#8B4513"
                    strokeWidth={RAIL_W}
                    strokeLinecap="round"
                  />
                  {/* Post at endpoint A */}
                  <rect
                    x={ax - POST_W / 2}
                    y={ay - POST_H + 2}
                    width={POST_W}
                    height={POST_H + 1}
                    fill="#6b3a17"
                    stroke="#3f1f0a"
                    strokeWidth={0.6}
                    rx={0.6}
                  />
                  {/* Post at endpoint B */}
                  <rect
                    x={bx - POST_W / 2}
                    y={by - POST_H + 2}
                    width={POST_W}
                    height={POST_H + 1}
                    fill="#6b3a17"
                    stroke="#3f1f0a"
                    strokeWidth={0.6}
                    rx={0.6}
                  />
                </g>
              );
            }

            if (item.kind === 'crop') {
              const { field, col, row } = item;
              const ready = field.readyToPick >= 1;
              const g = field.growthProgress;
              if (!ready && g < 0.16) return null;
              const harvesterPos = field.harvesterId && field.issue !== 'brokenHarvester'
                ? getHarvesterPos(field, item.fIdx)
                : null;

              return (
                <g key={`c${i}`} style={{ pointerEvents: 'none' }}>
                  {[0, 1, 2, 3].map(plantIndex => {
                    if (harvesterPos) {
                      const plant = cropPlantPositions(col, row)[plantIndex];
                      const dx = (plant.x - harvesterPos.x) / 1.35;
                      const dy = plant.y - harvesterPos.y;
                      if (Math.hypot(dx, dy) < 24) return null;
                    }
                    return (
                      <CropSprite
                        key={plantIndex}
                        field={field}
                        col={col}
                        row={row}
                        plantIndex={plantIndex}
                      />
                    );
                  })}
                </g>
              );
            }

            if (item.kind === 'harvester') {
              const pos = getHarvesterPos(item.field, item.fIdx);
              const issueActive = item.field.issue === 'brokenHarvester';
              return (
                <g key={`hv${i}`}>
                  {!issueActive && (
                    <ellipse
                      cx={pos.x}
                      cy={pos.y + 3}
                      rx={30}
                      ry={10}
                      fill="rgba(125,82,36,0.34)"
                      stroke="rgba(254,243,199,0.32)"
                      strokeWidth={1.2}
                    />
                  )}
                  <HarvesterSprite x={pos.x} y={pos.y - 16} type={item.htype} flip={pos.flip} active={!issueActive} />
                  {!issueActive && (
                    <path
                      d={`M${pos.x - 20},${pos.y + 8} q20,10 42,0`}
                      fill="none"
                      stroke="rgba(254,243,199,0.45)"
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            }

            if (item.kind === 'parkedHarvester') {
              // Park spare harvesters just south of the homestead instead of by a non-existent barn.
              const base = iso(HOMESTEAD.col + HOMESTEAD.w + 1 + (item.idx % 3), HOMESTEAD.row + HOMESTEAD.d + 1 + Math.floor(item.idx / 3));
              return (
                <g key={`phv${i}`}>
                  <HarvesterSprite x={base.x} y={base.y - 10} type={item.htype} />
                  <text
                    x={base.x}
                    y={base.y + 30}
                    fontSize={8}
                    fill="#fef3c7"
                    textAnchor="middle"
                    stroke="rgba(0,0,0,0.55)"
                    strokeWidth={1.5}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    READY
                  </text>
                </g>
              );
            }

            if (item.kind === 'building' && item.id === 'home') {
              const B    = HOMESTEAD;
              const N    = iso(B.col,       B.row);
              const E    = iso(B.col + B.w, B.row);
              const S    = iso(B.col + B.w, B.row + B.d);
              const W    = iso(B.col,       B.row + B.d);
              const H    = B.h;
              const isH  = true; // homestead-only path now

              const cx   = (N.x + E.x + S.x + W.x) / 4;
              const cy   = (N.y + E.y + S.y + W.y) / 4;

              // mid-points for window/door placement
              const midLeft  = { x: (W.x + S.x) / 2, y: (W.y + S.y) / 2 - H / 2 };
              const midRight = { x: (E.x + S.x) / 2, y: (E.y + S.y) / 2 - H / 2 };

              return (
                <g key={`b${i}`} filter={IS_MOBILE ? undefined : 'url(#softShadow)'} style={{ pointerEvents: 'none' }}>
                  {/* AO ground shadow */}
                  <ellipse cx={cx} cy={cy + H * 0.08} rx={HW * B.w * 0.9} ry={HH * B.d * 0.7} fill="rgba(0,0,0,0.18)" />

                  {/* LEFT FACE */}
                  <polygon
                    points={pts([
                      { x: W.x, y: W.y - H }, { x: S.x, y: S.y - H },
                      { x: S.x, y: S.y },     { x: W.x, y: W.y },
                    ])}
                    fill={isH ? 'url(#homeLeftGrad)' : 'url(#barnLeftGrad)'}
                    stroke={isH ? '#b8934a' : '#4a0e0e'} strokeWidth={1}
                  />

                  {/* Plank lines on barn left face */}
                  {!isH && [0.2, 0.4, 0.6, 0.8].map(t => (
                    <line key={t}
                      x1={W.x + (S.x - W.x) * t} y1={W.y - H + (S.y - W.y) * t}
                      x2={W.x + (S.x - W.x) * t} y2={W.y + (S.y - W.y) * t}
                      stroke="rgba(80,10,10,0.35)" strokeWidth={1} />
                  ))}

                  {/* RIGHT FACE */}
                  <polygon
                    points={pts([
                      { x: E.x, y: E.y - H }, { x: S.x, y: S.y - H },
                      { x: S.x, y: S.y },     { x: E.x, y: E.y },
                    ])}
                    fill={isH ? 'url(#homeRightGrad)' : 'url(#barnRightGrad)'}
                    stroke={isH ? '#9a7830' : '#380808'} strokeWidth={1}
                  />

                  {/* Plank lines on barn right face */}
                  {!isH && [0.2, 0.4, 0.6, 0.8].map(t => (
                    <line key={t}
                      x1={E.x + (S.x - E.x) * t} y1={E.y - H + (S.y - E.y) * t}
                      x2={E.x + (S.x - E.x) * t} y2={E.y + (S.y - E.y) * t}
                      stroke="rgba(50,5,5,0.3)" strokeWidth={1} />
                  ))}

                  {/* ROOF */}
                  <polygon
                    points={pts([
                      { x: N.x, y: N.y - H }, { x: E.x, y: E.y - H },
                      { x: S.x, y: S.y - H }, { x: W.x, y: W.y - H },
                    ])}
                    fill={isH ? 'url(#homeRoofGrad)' : 'url(#barnRoofGrad)'}
                    stroke={isH ? '#7a2a0e' : '#0d0804'} strokeWidth={1}
                  />

                  {/* Roof ridge highlight */}
                  <line
                    x1={(N.x + W.x) / 2} y1={(N.y + W.y) / 2 - H}
                    x2={(E.x + S.x) / 2} y2={(E.y + S.y) / 2 - H}
                    stroke={isH ? 'rgba(255,220,180,0.5)' : 'rgba(255,255,255,0.12)'} strokeWidth={1.5}
                  />

                  {/* Chimney (homestead only) — left-side of roof */}
                  {isH && (() => {
                    const chx = N.x + (W.x - N.x) * 0.28 + (E.x - N.x) * 0.15;
                    const chy = N.y - H + (W.y - N.y) * 0.28 + (E.y - N.y) * 0.15;
                    return (
                      <g>
                        <rect x={chx - 4} y={chy - 18} width={8} height={18} rx={1} fill="#7a6248" stroke="#5a4530" strokeWidth={0.8} />
                        <rect x={chx - 5} y={chy - 20} width={10} height={3} rx={1} fill="#6b5440" stroke="#4a3520" strokeWidth={0.7} />
                        {/* smoke puff */}
                        <circle cx={chx} cy={chy - 26} r={3.5} fill="rgba(200,200,200,0.45)" />
                        <circle cx={chx + 3} cy={chy - 32} r={2.5} fill="rgba(200,200,200,0.3)" />
                      </g>
                    );
                  })()}

                  {/* Barn X-brace doors on left face */}
                  {!isH && (() => {
                    const dx = (W.x + S.x) / 2;
                    const dy = (W.y + S.y) / 2;
                    const dw = HW * 0.32;
                    const dh = H * 0.58;
                    return (
                      <>
                        <polygon
                          points={`${dx - dw},${dy - dh * 0.5} ${dx},${dy - dh} ${dx},${dy} ${dx - dw},${dy}`}
                          fill="#3a1208" stroke="#250a04" strokeWidth={0.8}
                        />
                        <polygon
                          points={`${dx},${dy - dh} ${dx + dw},${dy - dh * 0.5} ${dx + dw},${dy} ${dx},${dy}`}
                          fill="#2e0e06" stroke="#1a0802" strokeWidth={0.8}
                        />
                        {/* X braces */}
                        <line x1={dx - dw} y1={dy - dh * 0.5} x2={dx} y2={dy} stroke="#6b2010" strokeWidth={1.2} opacity={0.7} />
                        <line x1={dx - dw} y1={dy} x2={dx} y2={dy - dh} stroke="#6b2010" strokeWidth={1.2} opacity={0.7} />
                        <line x1={dx} y1={dy - dh} x2={dx + dw} y2={dy} stroke="#6b2010" strokeWidth={1.2} opacity={0.7} />
                        <line x1={dx} y1={dy} x2={dx + dw} y2={dy - dh * 0.5} stroke="#6b2010" strokeWidth={1.2} opacity={0.7} />
                      </>
                    );
                  })()}

                  {/* Homestead windows */}
                  {isH && (
                    <>
                      {/* Left face window */}
                      <rect x={midLeft.x - 8} y={midLeft.y - 8} width={15} height={12} rx={2}
                        fill="#a8d4f8" stroke="#8bb0d4" strokeWidth={0.8} />
                      <line x1={midLeft.x - 0.5} y1={midLeft.y - 8} x2={midLeft.x - 0.5} y2={midLeft.y + 4}
                        stroke="#6ea0c4" strokeWidth={0.7} />
                      <line x1={midLeft.x - 8} y1={midLeft.y - 2} x2={midLeft.x + 7} y2={midLeft.y - 2}
                        stroke="#6ea0c4" strokeWidth={0.7} />
                      {/* Right face window */}
                      <rect x={midRight.x - 8} y={midRight.y - 8} width={15} height={12} rx={2}
                        fill="#8cc4e8" stroke="#7aaac8" strokeWidth={0.8} />
                      <line x1={midRight.x - 0.5} y1={midRight.y - 8} x2={midRight.x - 0.5} y2={midRight.y + 4}
                        stroke="#5a90b8" strokeWidth={0.7} />
                      <line x1={midRight.x - 8} y1={midRight.y - 2} x2={midRight.x + 7} y2={midRight.y - 2}
                        stroke="#5a90b8" strokeWidth={0.7} />
                      {/* Front door on left face */}
                      {(() => {
                        const ddx = (W.x + S.x) / 2 + HW * 0.1;
                        const ddy = (W.y + S.y) / 2;
                        return (
                          <g>
                            <rect x={ddx - 5} y={ddy - H * 0.45} width={10} height={H * 0.45} rx={1.5}
                              fill="#7a4020" stroke="#4a2010" strokeWidth={0.8} />
                            <circle cx={ddx + 3} cy={ddy - H * 0.22} r={1.5} fill="#d4a040" />
                          </g>
                        );
                      })()}
                    </>
                  )}

                  {/* Barn loft window on right face */}
                  {!isH && (
                    <g>
                      <rect x={midRight.x - 7} y={midRight.y - 12} width={14} height={10} rx={2}
                        fill="#1a0f06" stroke="#3a1a08" strokeWidth={0.8} />
                      <line x1={midRight.x} y1={midRight.y - 12} x2={midRight.x} y2={midRight.y - 2}
                        stroke="#3a1a08" strokeWidth={0.6} />
                    </g>
                  )}

                  {/* Label — bumped from 8 to 12 so it's actually readable */}
                  <text
                    x={cx} y={N.y - H - 6}
                    fontSize={12} fontWeight="bold" fill="white" textAnchor="middle"
                    stroke="rgba(0,0,0,0.7)" strokeWidth={2.5} paintOrder="stroke"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    {B.label}
                  </text>
                </g>
              );
            }

            if (item.kind === 'building') {
              const B = item.id === 'wh' ? WH : MKT;
              const N = iso(B.col,       B.row);
              const E = iso(B.col + B.w, B.row);
              const S = iso(B.col + B.w, B.row + B.d);
              const W = iso(B.col,       B.row + B.d);
              const H = B.h;
              const isWH = item.id === 'wh';

              // Window helpers
              const midLeft  = { x: (W.x + S.x) / 2, y: (W.y + S.y) / 2 - H / 2 };
              const midRight = { x: (E.x + S.x) / 2, y: (E.y + S.y) / 2 - H / 2 };

              const bCx = (N.x + E.x + S.x + W.x) / 4;
              const bCy = (N.y + E.y + S.y + W.y) / 4;

              return (
                <g
                  key={`b${i}`}
                  data-world-control="true"
                  filter={IS_MOBILE ? undefined : 'url(#softShadow)'}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    if (item.id === 'wh') onWarehouseClick();
                    else onMarketClick();
                  }}
                >
                  {/* AO ground shadow */}
                  <ellipse cx={bCx} cy={bCy + H * 0.1} rx={HW * B.w * 0.9} ry={HH * B.d * 0.7} fill="rgba(0,0,0,0.2)" />
                  {/* LEFT FACE */}
                  <polygon
                    points={pts([
                      { x: W.x, y: W.y - H }, { x: S.x, y: S.y - H },
                      { x: S.x, y: S.y     }, { x: W.x, y: W.y     },
                    ])}
                    fill={isWH ? 'url(#whLeftGrad)' : '#fef9c3'}
                    stroke={isWH ? '#6b3410' : '#d97706'} strokeWidth={1}
                  />

                  {/* RIGHT FACE */}
                  <polygon
                    points={pts([
                      { x: E.x, y: E.y - H }, { x: S.x, y: S.y - H },
                      { x: S.x, y: S.y     }, { x: E.x, y: E.y     },
                    ])}
                    fill={isWH ? 'url(#whRightGrad)' : '#fde68a'}
                    stroke={isWH ? '#4a2008' : '#b45309'} strokeWidth={1}
                  />

                  {/* ROOF */}
                  <polygon
                    points={pts([
                      { x: N.x, y: N.y - H }, { x: E.x, y: E.y - H },
                      { x: S.x, y: S.y - H }, { x: W.x, y: W.y - H },
                    ])}
                    fill={isWH ? 'url(#whRoofGrad)' : '#ef4444'}
                    stroke={isWH ? '#7c2d12' : '#dc2626'} strokeWidth={1}
                  />

                  {/* Roof ridge line */}
                  {isWH && (
                    <line
                      x1={(N.x + W.x) / 2} y1={(N.y + W.y) / 2 - H}
                      x2={(E.x + S.x) / 2} y2={(E.y + S.y) / 2 - H}
                      stroke="#0f172a" strokeWidth={2}
                    />
                  )}

                  {/* Barn siding */}
                  {isWH && [0.22, 0.42, 0.62, 0.82].map(t => (
                    <g key={t} opacity="0.42">
                      <line
                        x1={W.x + (S.x - W.x) * t}
                        y1={W.y - H + (S.y - W.y) * t}
                        x2={W.x + (S.x - W.x) * t}
                        y2={W.y + (S.y - W.y) * t}
                        stroke="#fee2e2"
                        strokeWidth={1}
                      />
                      <line
                        x1={E.x + (S.x - E.x) * t}
                        y1={E.y - H + (S.y - E.y) * t}
                        x2={E.x + (S.x - E.x) * t}
                        y2={E.y + (S.y - E.y) * t}
                        stroke="#fecaca"
                        strokeWidth={1}
                      />
                    </g>
                  ))}

                  {/* Market awning stripes on roof */}
                  {!isWH && (() => {
                    const stripeCount = 5;
                    const stripes = [];
                    for (let si = 1; si < stripeCount; si++) {
                      const t = si / stripeCount;
                      const lx = N.x + (W.x - N.x) * t;
                      const ly = N.y - H + (W.y - N.y) * t;
                      const rx = E.x + (S.x - E.x) * t;
                      const ry = E.y - H + (S.y - E.y) * t;
                      stripes.push(<line key={si} x1={lx} y1={ly} x2={rx} y2={ry} stroke="white" strokeWidth={2} opacity={0.6} />);
                    }
                    return stripes;
                  })()}

                  {/* Door on left face */}
                  {isWH && (() => {
                    const dx = (W.x + S.x) / 2;
                    const dy = (W.y + S.y) / 2;
                    const doorW = HW * 0.3;
                    const doorH = H * 0.55;
                    return (
                      <>
                        <polygon
                          points={`${dx},${dy - doorH} ${dx + doorW},${dy - doorH * 0.4} ${dx + doorW},${dy} ${dx},${dy}`}
                          fill="#3d1700" stroke="#2a0f00" strokeWidth={0.8}
                        />
                        <polygon
                          points={`${dx - doorW},${dy - doorH * 0.4} ${dx},${dy - doorH} ${dx},${dy} ${dx - doorW},${dy}`}
                          fill="#2a0f00" stroke="#1a0800" strokeWidth={0.8}
                        />
                      </>
                    );
                  })()}

                  {/* Windows and produce details */}
                  {[midLeft, midRight].map((mp, wi) => (
                    isWH ? (
                      <g key={wi}>
                        <rect
                          x={mp.x - 9} y={mp.y - 10}
                          width={18} height={14}
                          rx={2}
                          fill="#dbeafe" stroke={wi === 0 ? '#7f1d1d' : '#991b1b'} strokeWidth={0.9}
                        />
                        <line x1={mp.x} y1={mp.y - 10} x2={mp.x} y2={mp.y + 4} stroke="#93c5fd" strokeWidth={0.7} />
                        <line x1={mp.x - 9} y1={mp.y - 3} x2={mp.x + 9} y2={mp.y - 3} stroke="#93c5fd" strokeWidth={0.7} />
                      </g>
                    ) : (
                      <g key={wi}>
                        <rect x={mp.x - 12} y={mp.y - 10} width={24} height={15} rx="2" fill="#92400e" stroke="#451a03" strokeWidth="0.8" />
                        {[0, 1, 2].map(pi => (
                          <circle key={pi} cx={mp.x - 7 + pi * 7} cy={mp.y - 3} r="3" fill={wi === 0 ? '#ef4444' : '#84cc16'} stroke={wi === 0 ? '#991b1b' : '#3f6212'} strokeWidth="0.5" />
                        ))}
                      </g>
                    )
                  ))}

                  {/* Label — bumped from 9 to 12 for readability */}
                  <text
                    x={(W.x + E.x) / 2}
                    y={S.y - H * 0.55}
                    fontSize={12}
                    fontWeight="bold"
                    fill="white"
                    textAnchor="middle"
                    stroke="rgba(0,0,0,0.65)" strokeWidth={2.5} paintOrder="stroke"
                    style={{ letterSpacing: '0.08em' }}
                  >
                    {B.label}
                  </text>

                  {/* Inventory / earnings readout — bumped from 8 to 11 */}
                  <text
                    x={(W.x + E.x) / 2}
                    y={S.y - H * 0.35}
                    fontSize={11}
                    fill="#fef3c7"
                    textAnchor="middle"
                    stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} paintOrder="stroke"
                  >
                    {isWH ? `${Math.floor(totalInv)} units` : lastEarned > 0 ? `+$${Math.floor(lastEarned)}` : 'TAP TO SELL'}
                  </text>
                </g>
              );
            }

            if (item.kind === 'truck') {
              const { truck, idx } = item;
              const pos = getTruckPos(truck, idx);
              const moving = truck.status !== 'idle';

              return (
                <g key={`t${i}`} style={{ pointerEvents: 'none' }}>
                  <TruckSprite
                    x={pos.x}
                    y={pos.y}
                    flip={pos.flip}
                    moving={moving}
                    cargo={truck.cargo}
                  />
                </g>
              );
            }

            return null;
          })}

          {/* Large mobile-friendly warehouse and market tap targets */}
          {[
            { id: 'wh' as const, b: WH, onOpen: onWarehouseClick },
            { id: 'mkt' as const, b: MKT, onOpen: onMarketClick },
          ].map(({ id, b, onOpen }) => {
            const n = iso(b.col, b.row);
            const e = iso(b.col + b.w, b.row);
            const s = iso(b.col + b.w, b.row + b.d);
            const w = iso(b.col, b.row + b.d);
            const hitPoints = pts([
              { x: n.x, y: n.y - b.h - 18 },
              { x: e.x + 18, y: e.y - b.h - 8 },
              { x: s.x + 24, y: s.y + 20 },
              { x: w.x - 24, y: w.y + 20 },
            ]);

            return (
              <polygon
                key={`building-hit-${id}`}
                data-world-control="true"
                points={hitPoints}
                fill="rgba(255,255,255,0.001)"
                stroke="transparent"
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onPointerDown={event => event.stopPropagation()}
                onClick={event => {
                  event.stopPropagation();
                  onOpen();
                }}
              />
            );
          })}

          {/* Large mobile-friendly field tap targets */}
          {fields.map((field, fIdx) => {
            const slot = FIELD_SLOTS[fIdx];
            if (!slot) return null;

            const sz = FIELD_TILE_SIZE[field.type] ?? 3;
            const n = iso(slot.col, slot.row);
            const e = iso(slot.col + sz, slot.row);
            const s = iso(slot.col + sz, slot.row + sz);
            const w = iso(slot.col, slot.row + sz);
            const ready = field.readyToPick >= 1;
            const cx = (n.x + e.x + s.x + w.x) / 4;
            const cy = (n.y + e.y + s.y + w.y) / 4;

            return (
              <polygon
                key={`hit-${field.id}`}
                points={pts([n, e, s, w])}
                fill={ready ? 'rgba(250,204,21,0.05)' : 'rgba(255,255,255,0)'}
                stroke={ready ? 'rgba(250,204,21,0.6)' : 'rgba(255,255,255,0)'}
                strokeWidth={ready ? 2 : 0}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onPointerDown={event => event.stopPropagation()}
                onClick={event => {
                  event.stopPropagation();
                  if (dragDist.current > 6) return;
                  if (field.readyToPick >= 1) {
                    doHarvest(field, cx + pan.x, cy + pan.y);
                  } else {
                    onFieldClick(field.id);
                  }
                }}
              />
            );
          })}

          {/* ── Decorative trees ── */}
          {treeTiles.map(([c, r], i) => {
            const { x, y } = iso(c, r);
            return <TreeSprite key={`tr${i}`} x={x} y={y + 4} variant={i} />;
          })}

          {/* ── Hay bales and flower clumps ── */}
          {accentTiles.map(([c, r], i) => {
            const { x, y } = iso(c, r);
            return i % 3 === 0
              ? <HayBale    key={`dec${i}`} x={x} y={y + 5} />
              : <FlowerClump key={`dec${i}`} x={x} y={y + 8} />;
          })}

          <AnimalsLayer obstacles={animalObstacles} />

          {/* ── Field collection carts ── */}
          {fieldCarts.map(cart => {
            const fIdx = fields.findIndex(f => f.id === cart.fieldId);
            if (fIdx === -1) return null;
            const pos = getFieldCartPos(cart, fields[fIdx], fIdx);
            return <FieldCartSprite key={cart.id} x={pos.x} y={pos.y} flip={pos.flip} />;
          })}

          {/* ── Harvest particles (SVG text) ── */}
          {particles.map(p => (
            <text
              key={p.id}
              x={p.x - pan.x}
              y={p.y - pan.y}
              fontSize={p.size}
              fill={p.color}
              textAnchor="middle"
              fontWeight="bold"
              stroke="rgba(0,0,0,0.5)" strokeWidth={1.5} paintOrder="stroke"
              style={{
                fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif',
                pointerEvents: 'none',
                animation: 'float-up 1.1s ease-out forwards',
              }}
            >
              {p.text}
            </text>
          ))}
        </svg>

        {/* ── Field name labels (HTML) ── */}
        {fields.map((field, fIdx) => {
          const slot = FIELD_SLOTS[fIdx];
          if (!slot) return null;
          const sz = FIELD_TILE_SIZE[field.type] ?? 3;
          const fc = FIELD_CONFIG[field.type];
          const cc = CROP_CONFIG[field.crop];
          const ready = field.readyToPick >= 1;
          const issue = field.issue;
          const condition = Math.round(field.condition ?? 100);
          const cropShort = ({
            tomato: 'Tomato',
            lettuce: 'Lettuce',
            strawberry: 'Strawberry',
            corn: 'Corn',
            blueberry: 'Blueberry',
            truffle: 'Truffle',
          } as const)[field.crop];
          const fieldShort = fc.name.replace('Starter Plot', 'Plot').replace('Small Field', 'Field').replace('Medium Field', 'Field');

          // Position label at the "south" vertex of the field footprint
          const S = iso(slot.col + sz, slot.row + sz);
          const assignedHarv = useGameStore.getState().harvesters.find(h => h.fieldId === field.id);

          return (
            <button
              key={field.id}
              data-world-control="true"
              onPointerDown={event => event.stopPropagation()}
              onClick={event => {
                event.stopPropagation();
                if (ready) {
                  doHarvest(field, S.x + pan.x, S.y + pan.y);
                } else {
                  onFieldClick(field.id);
                }
              }}
              style={{
                position: 'absolute',
                left: S.x - 68,
                top: S.y - 2,
                minWidth: 136,
                maxWidth: 168,
                background: issue
                  ? 'linear-gradient(180deg, rgba(127,29,29,0.94), rgba(88,19,19,0.94))'
                  : ready
                    ? 'linear-gradient(180deg, rgba(245,158,11,0.96), rgba(180,83,9,0.96))'
                    : 'linear-gradient(180deg, rgba(31,75,45,0.94), rgba(22,55,36,0.94))',
                color: issue ? '#fee2e2' : ready ? '#fff7d6' : '#d9f99d',
                fontSize: 9, fontWeight: 850,
                padding: '4px 9px', borderRadius: 10,
                border: issue ? '1px solid rgba(254,202,202,0.72)' : ready ? '1px solid rgba(254,240,138,0.68)' : '1px solid rgba(187,247,208,0.32)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pointerEvents: 'auto',
                userSelect: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 7px 14px rgba(21, 38, 20, 0.23), inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '0 1px 1px rgba(0,0,0,0.24)',
              }}
            >
              {cropShort} {fieldShort}
              {issue ? ' - Fix' : ready ? ' - Ready' : condition < 80 ? ' - Tend' : ''}
              {assignedHarv && ' +Auto'}
            </button>
          );
        })}
      </div>

      {readyFieldCount > 0 && (
        <button
          data-world-control="true"
          onPointerDown={event => event.stopPropagation()}
          onClick={storageSpace > 0 ? collectReadyFields : onWarehouseClick}
          style={{
            // Compact pill centered above the bottom toolbar instead of a
            // full-width banner that ate half the playable area.
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 92,
            zIndex: 31,
            minHeight: 40,
            padding: '0 22px',
            border: '1px solid rgba(255,255,255,0.26)',
            borderRadius: 999,
            background: storageSpace > 0
              ? 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 48%, #d97706 100%)'
              : 'linear-gradient(180deg, #f87171 0%, #ef4444 48%, #b91c1c 100%)',
            color: 'white',
            fontSize: 13,
            fontWeight: 900,
            boxShadow: '0 14px 26px rgba(120,53,15,0.28), inset 0 1px 0 rgba(255,255,255,0.3)',
            textShadow: '0 2px 1px rgba(120,53,15,0.38)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {storageSpace > 0
            ? `Collect Ready (${readyFieldCount})`
            : 'Storage Full - Sell Crops'}
        </button>
      )}

      {/* Navigation toggle removed — entire farm is visible at once now. */}
    </div>
  );
}
