import { Provider } from '@angular/core';
import { appConfig } from './app.config';
import { appRoutes } from './app.routes';
import { API_BASE_URL } from './app.tokens';

describe('app configuration', () => {
  it('exposes app routes', () => {
    expect(appRoutes.length).toBeGreaterThan(0);
  });

  it('provides the API base URL token', () => {
    const isEnvProviders = (entry: unknown): entry is { ɵproviders: Provider[] } =>
      typeof entry === 'object' &&
      entry !== null &&
      'ɵproviders' in entry &&
      Array.isArray((entry as { ɵproviders?: unknown }).ɵproviders);

    const isApiBaseUrlProvider = (
      entry: Provider
    ): entry is Provider & { provide: typeof API_BASE_URL; useValue: string } =>
      typeof entry === 'object' &&
      entry !== null &&
      'provide' in entry &&
      'useValue' in entry &&
      (entry as { provide?: unknown }).provide === API_BASE_URL;

    const providers = appConfig.providers.flatMap((entry) => {
      if (isEnvProviders(entry)) {
        return entry.ɵproviders;
      }
      return entry;
    });

    const provider = providers.find(isApiBaseUrlProvider);

    expect(typeof provider?.useValue).toBe('string');
    expect(provider?.useValue).toMatch(/^https?:\/\//);
  });
});
