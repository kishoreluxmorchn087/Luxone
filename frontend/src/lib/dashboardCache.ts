import { useSyncExternalStore } from "react";

export type DashboardCachePayload<T> = {
  savedAt: number;
  state: T;
};

export function readDashboardCache<T>(key: string, ttlMs: number): DashboardCachePayload<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardCachePayload<T>;
    if (!parsed?.savedAt || parsed.state === undefined) return null;
    if (Date.now() - parsed.savedAt > ttlMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardCache<T>(key: string, state: T) {
  if (typeof window === "undefined") return;

  try {
    const payload: DashboardCachePayload<T> = {
      savedAt: Date.now(),
      state,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage errors so dashboards can still render from network data.
  }
}

export function removeDashboardCache(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors so cache invalidation never breaks the UI.
  }
}

let currentNow = Date.now();
const liveNowListeners = new Set<() => void>();
let liveNowStarted = false;

function ensureLiveNowLoop() {
  if (liveNowStarted || typeof window === "undefined") return;
  liveNowStarted = true;
  window.setInterval(() => {
    currentNow = Date.now();
    liveNowListeners.forEach((listener) => listener());
  }, 60 * 1000);
}

export function refreshLiveNow() {
  currentNow = Date.now();
  liveNowListeners.forEach((listener) => listener());
}

function subscribeLiveNow(listener: () => void) {
  currentNow = Date.now();
  ensureLiveNowLoop();
  liveNowListeners.add(listener);
  return () => {
    liveNowListeners.delete(listener);
  };
}

function getLiveNowSnapshot() {
  return currentNow;
}

/** Returns a timestamp updated once every minute by a continuous loop. */
export function useLiveNow() {
  return useSyncExternalStore(subscribeLiveNow, getLiveNowSnapshot, getLiveNowSnapshot);
}
