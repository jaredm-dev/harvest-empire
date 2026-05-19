// DOM-based confetti burst. No deps, no canvas. Each particle is a small
// absolutely-positioned div that animates via CSS and is removed after the
// animation finishes.

const COLORS = ['#e07a5f', '#f2cc8f', '#81b29a', '#a78bfa', '#f4a261', '#5ec99b', '#fef3e2'];

interface ConfettiOptions {
  particleCount?: number;
  originX?: number; // 0-1, viewport fraction
  originY?: number; // 0-1, viewport fraction
  spread?: number;  // degrees
  startVelocity?: number; // px-ish
}

let host: HTMLDivElement | null = null;
const ensureHost = (): HTMLDivElement => {
  if (host && host.isConnected) return host;
  host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.pointerEvents = 'none';
  host.style.zIndex = '9999';
  host.style.overflow = 'hidden';
  document.body.appendChild(host);
  return host;
};

export function confetti(opts: ConfettiOptions = {}) {
  const {
    particleCount = 60,
    originX = 0.5,
    originY = 0.5,
    spread = 70,
    startVelocity = 32,
  } = opts;

  const h = ensureHost();
  const w = window.innerWidth;
  const vh = window.innerHeight;
  const x0 = originX * w;
  const y0 = originY * vh;

  for (let i = 0; i < particleCount; i++) {
    const angle = -90 + (Math.random() - 0.5) * spread; // degrees, up-ish
    const rad = (angle * Math.PI) / 180;
    const v = startVelocity * (0.7 + Math.random() * 0.6);
    const vx = Math.cos(rad) * v;
    const vy = Math.sin(rad) * v;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const size = 6 + Math.random() * 6;
    const rotate = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 200; // horizontal drift over time

    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = `${x0}px`;
    el.style.top = `${y0}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size * 0.6}px`;
    el.style.background = color;
    el.style.borderRadius = Math.random() > 0.5 ? '2px' : '50%';
    el.style.transform = `translate(-50%, -50%) rotate(${rotate}deg)`;
    el.style.willChange = 'transform, opacity';
    el.style.opacity = '1';
    h.appendChild(el);

    const duration = 1100 + Math.random() * 700;
    const startTime = performance.now();

    const animate = (now: number) => {
      const dt = (now - startTime) / 1000;
      if (dt >= duration / 1000) {
        el.remove();
        return;
      }
      // Simple gravity
      const tx = vx * dt * 18 + drift * dt;
      const ty = vy * dt * 18 + 0.5 * 980 * dt * dt; // gravity
      const opacity = Math.max(0, 1 - dt / (duration / 1000));
      el.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rotate + dt * 360}deg)`;
      el.style.opacity = String(opacity);
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }
}

// Larger celebratory burst — multiple launch points
export function celebrate(intensity: 'small' | 'medium' | 'large' = 'medium') {
  const counts = { small: 30, medium: 80, large: 150 };
  const count = counts[intensity];
  confetti({ particleCount: count, originX: 0.3, originY: 0.7, spread: 60, startVelocity: 36 });
  setTimeout(() => confetti({ particleCount: count, originX: 0.7, originY: 0.7, spread: 60, startVelocity: 36 }), 120);
  if (intensity === 'large') {
    setTimeout(() => confetti({ particleCount: count, originX: 0.5, originY: 0.5, spread: 90, startVelocity: 28 }), 280);
  }
}
