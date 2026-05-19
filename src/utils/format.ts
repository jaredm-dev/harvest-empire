// Number formatting utilities for big numbers

export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return '$0';
  if (n < 0) return '-' + formatMoney(-n);
  if (n < 1000) return `$${Math.floor(n)}`;
  return '$' + formatShort(n);
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return Math.floor(n).toString();
  return formatShort(n);
}

function formatShort(n: number): string {
  const tiers = [
    { v: 1e15, s: 'Q' },
    { v: 1e12, s: 'T' },
    { v: 1e9,  s: 'B' },
    { v: 1e6,  s: 'M' },
    { v: 1e3,  s: 'K' },
  ];
  for (const t of tiers) {
    if (n >= t.v) {
      const val = n / t.v;
      // Show 2 decimals for <10, 1 for <100, 0 for >=100
      const fixed = val < 10 ? 2 : val < 100 ? 1 : 0;
      return val.toFixed(fixed) + t.s;
    }
  }
  return Math.floor(n).toLocaleString();
}

// Format a duration in seconds as "1h 23m" or "23m 4s"
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}
