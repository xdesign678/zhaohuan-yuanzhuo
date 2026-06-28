interface ServiceWorkerProbe {
  readonly isProduction: boolean;
  readonly supportsServiceWorker: boolean;
  readonly protocol: string;
  readonly hostname: string;
}

export function shouldRegisterServiceWorker(probe: ServiceWorkerProbe): boolean {
  if (!probe.isProduction || !probe.supportsServiceWorker) {
    return false;
  }

  return probe.protocol === 'https:' || probe.hostname === 'localhost' || probe.hostname === '127.0.0.1';
}

export function getServiceWorkerUrl(basePath: string): string {
  const normalized = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalized}sw.js`;
}

export function registerServiceWorker(basePath: string, isProduction: boolean): void {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return;
  }

  if (
    !shouldRegisterServiceWorker({
      isProduction,
      supportsServiceWorker: 'serviceWorker' in navigator,
      protocol: window.location.protocol,
      hostname: window.location.hostname
    })
  ) {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(getServiceWorkerUrl(basePath));
  });
}
