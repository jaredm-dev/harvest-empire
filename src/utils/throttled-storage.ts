// Zustand-compatible storage adapter that batches localStorage writes.
//
// Without this, the persist middleware called setItem() on every state
// change (every game tick, ~6× per second). On iOS Safari that pressure
// can cause the tab to be killed during a write, losing progress.
//
// With this:
//   - localStorage.setItem is throttled to once every 2 seconds
//   - on `pagehide` / `visibilitychange:hidden` / `beforeunload` we flush
//     immediately, so the last 2 seconds of progress survive a tab close

import type { StateStorage } from 'zustand/middleware';

const FLUSH_INTERVAL_MS = 2000;

let pending: Record<string, string> = {};
let timer: number | null = null;
let listenersAttached = false;

function flushNow() {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  for (const [k, v] of Object.entries(pending)) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      // Quota exceeded / private mode / etc. — silent ignore
      // (a future write may succeed)
    }
  }
  pending = {};
}

function ensureListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  // Safari + Chrome fire these when the user backgrounds the tab or kills
  // it. We force-save here so a Safari auto-refresh / app suspend doesn't
  // wipe progress.
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('beforeunload', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
}

export const throttledStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    ensureListeners();
    pending[key] = value;
    if (timer === null) {
      timer = window.setTimeout(flushNow, FLUSH_INTERVAL_MS);
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    delete pending[key];
  },
};

// Allow callers to force a save (e.g. before showing a confirmation dialog).
export const forceSaveNow = flushNow;
