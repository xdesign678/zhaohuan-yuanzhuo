import { describe, expect, it } from 'vitest';
import { getServiceWorkerUrl, shouldRegisterServiceWorker } from '../src/utils/ServiceWorkerRegistration';

describe('ServiceWorkerRegistration', () => {
  it('registers only in production on secure origins or localhost', () => {
    expect(
      shouldRegisterServiceWorker({
        isProduction: true,
        supportsServiceWorker: true,
        protocol: 'https:',
        hostname: 'example.com'
      })
    ).toBe(true);
    expect(
      shouldRegisterServiceWorker({
        isProduction: true,
        supportsServiceWorker: true,
        protocol: 'http:',
        hostname: 'localhost'
      })
    ).toBe(true);
    expect(
      shouldRegisterServiceWorker({
        isProduction: false,
        supportsServiceWorker: true,
        protocol: 'https:',
        hostname: 'example.com'
      })
    ).toBe(false);
  });

  it('resolves the service worker URL from the Vite base path', () => {
    expect(getServiceWorkerUrl('/')).toBe('/sw.js');
    expect(getServiceWorkerUrl('/demo/')).toBe('/demo/sw.js');
  });
});
