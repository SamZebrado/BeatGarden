export interface ResourceEntryLike { name: string }

export function selectRunningCacheUrls(entries: readonly ResourceEntryLike[], location: Pick<Location, 'origin'>): string[] {
  return [...new Set(entries
    .map((entry) => entry.name)
    .filter((value) => {
      try {
        const url = new URL(value);
        return url.origin === location.origin && url.pathname.includes('/assets/');
      } catch {
        return false;
      }
    }))];
}

export async function warmRunningOfflineCache(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const urls = selectRunningCacheUrls(entries, window.location);
    if (!urls.length) return;
    (navigator.serviceWorker.controller || registration.active)?.postMessage({ type: 'WARM_RUNNING_CACHE', urls });
  } catch {
    // Cache warming is best-effort. The host already provides a recoverable offline failure.
  }
}
