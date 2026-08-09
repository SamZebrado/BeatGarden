export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  const status = document.createElement('output');
  status.id = 'pwa-runtime-status';
  status.style.cssText = 'position:fixed;left:-10000px;width:1px;height:1px;overflow:hidden';
  document.body.appendChild(status);
  const report = async (registration: ServiceWorkerRegistration | null, error?: string) => {
    const cacheNames = 'caches' in window ? await caches.keys() : [];
    status.textContent = JSON.stringify({
      registered: registration !== null,
      scope: registration?.scope ?? null,
      controller: Boolean(navigator.serviceWorker.controller),
      cacheNames,
      error: error ?? null,
    });
  };
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(async (registration) => {
        await navigator.serviceWorker.ready;
        await report(registration);
        navigator.serviceWorker.addEventListener('controllerchange', () => void report(registration), { once: true });
      })
      .catch((error: unknown) => void report(null, error instanceof Error ? error.message : String(error)));
  });
}
